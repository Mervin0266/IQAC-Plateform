'use strict';

/**
 * Indian Currency & Number-to-Words Formatting Helper
 * CHRIST University IQAC Platform
 * 
 * Supports standard Indian numbering system (Thousand, Lakh, Crore)
 * and formatted INR currency display.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}

function convertThreeDigits(n) {
  const h = Math.floor(n / 100);
  const rem = n % 100;
  let res = '';
  if (h > 0) {
    res += ONES[h] + ' Hundred';
    if (rem > 0) res += ' ';
  }
  if (rem > 0) {
    res += convertTwoDigits(rem);
  }
  return res;
}

/**
 * Converts a numerical amount in INR to Indian currency words.
 * Example: 1250000 -> "Twelve Lakh Fifty Thousand Rupees Only"
 * 
 * @param {number|string|null} amount - Amount in INR
 * @returns {string} Currency in words
 */
function numberToIndianWords(amount) {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return '—';
  }

  const num = Math.round(Number(amount) * 100) / 100;
  if (num === 0) {
    return 'Zero Rupees Only';
  }

  if (num < 0) {
    return 'Minus ' + numberToIndianWords(Math.abs(num));
  }

  const intPart = Math.floor(num);
  const fracPart = Math.round((num - intPart) * 100);

  let remaining = intPart;
  const parts = [];

  // Indian group system:
  // Last 3 digits (hundreds), then 2 digits (thousands), 2 digits (lakhs), then crores
  const hundreds = remaining % 1000;
  remaining = Math.floor(remaining / 1000);

  const thousands = remaining % 100;
  remaining = Math.floor(remaining / 100);

  const lakhs = remaining % 100;
  remaining = Math.floor(remaining / 100);

  const crores = remaining;

  if (crores > 0) {
    const croreWords = crores >= 100 ? convertThreeDigits(crores) : (crores >= 20 ? convertTwoDigits(crores) : ONES[crores]);
    parts.push(croreWords + ' Crore');
  }

  if (lakhs > 0) {
    parts.push(convertTwoDigits(lakhs) + ' Lakh');
  }

  if (thousands > 0) {
    parts.push(convertTwoDigits(thousands) + ' Thousand');
  }

  if (hundreds > 0) {
    parts.push(convertThreeDigits(hundreds));
  }

  let words = parts.join(' ').trim();
  if (!words) words = 'Zero';

  let result = words + ' Rupees';
  if (fracPart > 0) {
    result += ' and ' + convertTwoDigits(fracPart) + ' Paise';
  }
  result += ' Only';

  return result;
}

/**
 * Formats a number to Indian currency representation.
 * Example: 1250000 -> "₹12,50,000"
 * 
 * @param {number|string|null} amount - Amount in INR
 * @returns {string} Formatted currency string
 */
function formatIndianCurrency(amount) {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return '—';
  }
  const val = Number(amount);
  return '₹' + val.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: val % 1 === 0 ? 0 : 2
  });
}

/**
 * Normalizes a period string into a standard key format like "2024-25".
 * Handles "2024-2025", "2024-25", "2024–25" (en-dash).
 * 
 * @param {string} val - Year range string
 * @returns {string|null} Normalized key e.g. "2024-25" or null if unmappable
 */
function normalizeReportingPeriod(val) {
  if (!val) return null;
  const s = String(val).trim();
  const m4 = s.match(/^(\d{4})[-–/](\d{4})$/);
  if (m4) {
    const y1 = parseInt(m4[1], 10);
    const y2 = parseInt(m4[2], 10);
    return `${y1}-${String(y2).slice(-2)}`;
  }
  const m2 = s.match(/^(\d{4})[-–/](\d{2})$/);
  if (m2) {
    return `${m2[1]}-${m2[2]}`;
  }
  return null;
}

/**
 * Derives Calendar Year display label (e.g. "CY 2024") from period key "2024-25".
 * @param {string} periodKey - e.g. "2024-25"
 * @returns {string} "CY 2024"
 */
function periodToCYDisplay(periodKey) {
  if (!periodKey) return '—';
  const startYear = periodKey.split('-')[0];
  return `CY ${startYear}`;
}

/**
 * Derives Financial Year display label (e.g. "FY 2024–25") from period key "2024-25".
 * Uses en-dash.
 * @param {string} periodKey - e.g. "2024-25"
 * @returns {string} "FY 2024–25"
 */
function periodToFYDisplay(periodKey) {
  if (!periodKey) return '—';
  const parts = periodKey.split('-');
  return `FY ${parts[0]}–${parts[1]}`;
}

/**
 * Extracts 4-digit calendar year integer from period key "2024-25".
 * @param {string} periodKey - e.g. "2024-25"
 * @returns {number|null} 2024
 */
function periodToStartYear(periodKey) {
  if (!periodKey) return null;
  const y = parseInt(periodKey.split('-')[0], 10);
  return isNaN(y) ? null : y;
}

module.exports = {
  numberToIndianWords,
  formatIndianCurrency,
  normalizeReportingPeriod,
  periodToCYDisplay,
  periodToFYDisplay,
  periodToStartYear
};

