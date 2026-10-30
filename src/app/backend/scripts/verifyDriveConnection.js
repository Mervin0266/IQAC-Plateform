'use strict';

/**
 * Google Drive Integration Verification Script
 * Tests Service Account authentication and permissions against your Google Drive root folder.
 *
 * Usage:
 *   node scripts/verifyDriveConnection.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const googleDriveService = require('../services/googleDriveService');

async function verifyGoogleDriveSetup() {
  console.log('================================================================');
  console.log('   CHRIST University IQAC - Google Drive Verification');
  console.log('================================================================\n');

  // Check 1: Environment Variables
  console.log('1. Checking Environment Variables...');
  const hasUserOAuth = Boolean(
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN &&
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET
  );
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const hasKey = Boolean(process.env.GOOGLE_DRIVE_PRIVATE_KEY);
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (hasUserOAuth) {
    console.log('   - Mode:               Personal User OAuth 2.0 (Refresh Token)');
    console.log(`   - Client ID:          ${process.env.GOOGLE_DRIVE_CLIENT_ID.slice(0, 25)}...`);
    console.log(`   - Refresh Token:      Configured (Found)`);
  } else {
    console.log('   - Mode:               Service Account (Workspace)');
    console.log(`   - Client Email:       ${email ? email : 'MISSING'}`);
    console.log(`   - Private Key:        ${hasKey ? 'Configured (Found)' : 'MISSING'}`);
  }
  console.log(`   - Root Folder ID:     ${rootFolderId ? rootFolderId : 'Not set (will use Drive root)'}`);

  if (!hasUserOAuth && (!email || !hasKey)) {
    console.error('\n✗ FAILED: Google Drive credentials are missing.');
    process.exit(1);
  }
  console.log('   ✓ Environment variables verified.\n');

  // Check 2: Service Account JWT Authentication
  console.log('2. Authenticating with Google OAuth2 Token Endpoint...');
  try {
    const dummyUpload = Buffer.from('CHRIST University IQAC Platform - Connection Test', 'utf8');

    // Test hierarchical folder creation and upload
    console.log('3. Testing hierarchy navigation and write permission...');
    const result = await googleDriveService.uploadPatentProofFile({
      patentId: 'test-verification',
      department: 'Computer Science and Engineering',
      year: 2024,
      fileBuffer: dummyUpload,
      fileName: 'connection_test.txt',
      mimeType: 'text/plain'
    });

    console.log('   ✓ Successfully uploaded verification test file!');
    console.log(`   - Created File ID:    ${result.driveFileId}`);
    console.log(`   - Target Folder ID:   ${result.driveFolderId}`);
    console.log(`   - Direct Drive URL:   ${result.driveUrl}`);

    // Clean up the verification file
    console.log('\n4. Cleaning up test file...');
    await googleDriveService.deletePatentProofFile(result.driveFileId);
    console.log('   ✓ Test file deleted cleanly from Google Drive.');

    console.log('\n================================================================');
    console.log('   RESULT: SUCCESS! Google Drive integration is 100% operational.');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n✗ Connection or Permission Error:');
    console.error(`  ${err.message}`);

    if (err.message.includes('404') || err.message.includes('File not found')) {
      console.log('\nTip: Make sure you shared your Google Drive folder with:');
      console.log(`  ${email}`);
      console.log('  with the role "Editor" or "Content manager".');
    } else if (err.message.includes('invalid_grant')) {
      console.log('\nTip: Check that the private key is not corrupted and your computer clock is synchronized.');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  verifyGoogleDriveSetup();
}

module.exports = { verifyGoogleDriveSetup };

