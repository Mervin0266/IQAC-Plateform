'use strict';

/**
 * Official CHRIST University Logo Asset Helper
 * CHRIST University IQAC Platform
 *
 * Provides standardized access to the existing official CHRIST University logo asset
 * for Excel (.xlsx), PDF (.pdf), and Word (.docx) document generation.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Primary candidate locations for the official logo asset
const CANDIDATE_PATHS = [
  path.resolve(__dirname, '../../../assets/logo.png'),
  path.resolve(__dirname, '../../../../assets/logo.png'),
  path.resolve(process.cwd(), 'src/assets/logo.png'),
  path.resolve(process.cwd(), 'assets/logo.png')
];

let cachedLogoBuffer = null;
let cachedLogoInfo = null;

function resolveLogoPath() {
  for (const p of CANDIDATE_PATHS) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function getLogoBuffer() {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  const logoPath = resolveLogoPath();
  if (logoPath) {
    cachedLogoBuffer = fs.readFileSync(logoPath);
    return cachedLogoBuffer;
  }
  return null;
}

function getLogoInfo() {
  if (cachedLogoInfo) return cachedLogoInfo;
  const buf = getLogoBuffer();
  if (!buf || buf.length < 24) return null;

  try {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf[24];
    const colorType = buf[25];
    cachedLogoInfo = {
      width,
      height,
      bitDepth,
      colorType,
      aspectRatio: width / height
    };
    return cachedLogoInfo;
  } catch (err) {
    console.warn('[LogoHelper] Failed to parse PNG header:', err.message);
    return null;
  }
}

/**
 * Decodes PNG RGBA scanlines and returns deflated RGB and Alpha buffers
 * for direct inclusion in PDF 1.4 Image XObjects.
 */
let cachedPdfImageStreams = null;

function getLogoPdfImageStreams() {
  if (cachedPdfImageStreams) return cachedPdfImageStreams;
  const buf = getLogoBuffer();
  if (!buf) return null;

  try {
    let pos = 8;
    const idatChunks = [];
    let width = 0;
    let height = 0;

    while (pos < buf.length) {
      const len = buf.readUInt32BE(pos);
      const type = buf.toString('ascii', pos + 4, pos + 8);
      if (type === 'IHDR') {
        width = buf.readUInt32BE(pos + 8);
        height = buf.readUInt32BE(pos + 12);
      } else if (type === 'IDAT') {
        idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
      }
      pos += 12 + len;
    }

    if (idatChunks.length === 0 || width === 0 || height === 0) return null;

    const raw = zlib.inflateSync(Buffer.concat(idatChunks));
    const bpp = 4; // RGBA
    const stride = 1 + width * bpp;
    const rgb = Buffer.alloc(width * height * 3);
    const alpha = Buffer.alloc(width * height);
    const prevRow = Buffer.alloc(width * bpp);
    const currRow = Buffer.alloc(width * bpp);

    function paeth(a, b, c) {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      if (pa <= pb && pa <= pc) return a;
      if (pb <= pc) return b;
      return c;
    }

    let rgbOffset = 0;
    let aOffset = 0;

    for (let y = 0; y < height; y++) {
      const filter = raw[y * stride];
      const rowStart = y * stride + 1;

      for (let x = 0; x < width * bpp; x++) {
        const rawByte = raw[rowStart + x];
        const left = x >= bpp ? currRow[x - bpp] : 0;
        const up = prevRow[x];
        const upLeft = x >= bpp ? prevRow[x - bpp] : 0;
        let val = 0;
        if (filter === 0) val = rawByte;
        else if (filter === 1) val = (rawByte + left) & 0xff;
        else if (filter === 2) val = (rawByte + up) & 0xff;
        else if (filter === 3) val = (rawByte + Math.floor((left + up) / 2)) & 0xff;
        else if (filter === 4) val = (rawByte + paeth(left, up, upLeft)) & 0xff;
        currRow[x] = val;
      }

      for (let x = 0; x < width; x++) {
        rgb[rgbOffset++] = currRow[x * 4];
        rgb[rgbOffset++] = currRow[x * 4 + 1];
        rgb[rgbOffset++] = currRow[x * 4 + 2];
        alpha[aOffset++] = currRow[x * 4 + 3];
      }

      currRow.copy(prevRow);
    }

    cachedPdfImageStreams = {
      width,
      height,
      deflatedRgb: zlib.deflateSync(rgb),
      deflatedAlpha: zlib.deflateSync(alpha)
    };
    return cachedPdfImageStreams;
  } catch (err) {
    console.warn('[LogoHelper] Failed to prepare PDF image streams:', err.message);
    return null;
  }
}

module.exports = {
  getLogoBuffer,
  getLogoInfo,
  getLogoPdfImageStreams,
  resolveLogoPath
};
