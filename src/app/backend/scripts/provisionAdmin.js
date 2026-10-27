'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const readline = require('readline');
const { sequelize } = require('../config/database');
const { User } = require('../models');

/**
 * Secure Administrator Provisioning Script
 * Usage: node scripts/provisionAdmin.js [--email=admin@christuniversity.in] [--password=secret]
 * If password is not provided via CLI, it prompts securely via standard input.
 * NEVER prints passwords to console logs or files.
 */
const provisionAdmin = async () => {
  let rl;
  try {
    await sequelize.authenticate();

    const args = process.argv.slice(2);
    let email = null;
    let password = null;

    for (const arg of args) {
      if (arg.startsWith('--email=')) email = arg.split('=')[1].trim();
      if (arg.startsWith('--password')) {
        console.error('✗ SECURITY ERROR: Supplying passwords via command-line arguments is prohibited to prevent exposure in process lists, deployment logs, and shell histories.');
        console.error('Please execute interactively or set ADMIN_PROVISION_PASSWORD securely.');
        process.exit(1);
      }
    }

    if (!email) {
      email = process.env.INITIAL_ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || 'admin@christuniversity.in';
    }

    if (!password) {
      if (process.env.ADMIN_PROVISION_PASSWORD) {
        password = process.env.ADMIN_PROVISION_PASSWORD;
      } else {
        // Prompt interactively if not provided
        rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));
        password = await askQuestion(`Enter administrator password for ${email}: `);
        rl.close();
      }
    }

    if (!password || password.length < 10) {
      console.error('✗ Error: Password must be at least 10 characters.');
      process.exit(1);
    }

    const [adminUser, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        name: 'System Administrator',
        email,
        password,
        role: 'admin',
        department: 'Administration',
        employeeId: 'ADMIN001',
        isActive: true,
        mustChangePassword: true,
        tokenVersion: 0
      }
    });

    if (!created) {
      adminUser.password = password;
      adminUser.role = 'admin';
      adminUser.isActive = true;
      adminUser.mustChangePassword = true;
      adminUser.tokenVersion = (adminUser.tokenVersion || 0) + 1;
      adminUser.passwordChangedAt = new Date();
      await adminUser.save();
      console.log(`✓ Existing administrator account (${email}) updated successfully.`);
    } else {
      console.log(`✓ New administrator account (${email}) provisioned successfully.`);
    }

    console.log('✓ Password change flag set to true (mandatory on first login).');
    process.exit(0);
  } catch (err) {
    if (rl) rl.close();
    console.error('✗ Provisioning failed:', err.message);
    process.exit(1);
  }
};

provisionAdmin();
