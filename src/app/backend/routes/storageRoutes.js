'use strict';

const express = require('express');
const router = express.Router();
const { downloadPrivateFile } = require('../controllers/storageController');

// Token-based secure download (token contains its own cryptographic validation & expiry)
router.get('/download/:token', downloadPrivateFile);

module.exports = router;
