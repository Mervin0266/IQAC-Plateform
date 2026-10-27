'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const { User } = require('../models');
const { logAction } = require('../middleware/auditLogger');

/**
 * Remediation script for existing accounts created with known factory passwords.
 * Actions:
 * - Scrambles password hash to an unmatchable high-entropy random string.
 * - Increments tokenVersion (revoking all active JWT bearer tokens).
 * - Sets mustChangePassword = true.
 * - Logs audit trail entry for each rotation.
 * - NEVER prints or logs passwords.
 */
const remediateCompromisedAccounts = async () => {
  try {
    await sequelize.authenticate();
    console.log('Starting credential rotation for seeded accounts...');

    const targetEmails = [
      'admin@christuniversity.in',
      'dean@christuniversity.in',
      'hod.cse@christuniversity.in',
      'coord.cse@christuniversity.in',
      'faculty.cse@christuniversity.in'
    ];

    let rotatedCount = 0;

    for (const email of targetEmails) {
      const user = await User.findOne({ where: { email } });
      if (!user) continue;

      // Scramble password to unguessable random entropy
      const randomSecret = crypto.randomBytes(32).toString('hex');
      user.password = randomSecret;
      user.mustChangePassword = true;
      user.passwordChangedAt = new Date();
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      // Log the security rotation
      try {
        await logAction({
          user: { name: 'Security Administrator', role: 'system', department: 'Cybersecurity' },
          action: 'COMPROMISED_CREDENTIAL_ROTATION',
          title: `Credential Rotation for ${email}`,
          remarks: 'Factory credential invalidated. Token version incremented. Mandatory reset enforced.'
        });
      } catch (logErr) {
        console.warn('Audit log write warning:', logErr.message);
      }

      console.log(`✓ Rotated credentials and revoked active tokens for: ${email}`);
      rotatedCount++;
    }

    console.log('\n======================================================');
    console.log(`Remediation complete. ${rotatedCount} account(s) secured.`);
    console.log('To assign a new administrator password, run:');
    console.log('  node scripts/provisionAdmin.js --email=admin@christuniversity.in');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('✗ Remediation script failed:', err.message);
    process.exit(1);
  }
};

remediateCompromisedAccounts();
