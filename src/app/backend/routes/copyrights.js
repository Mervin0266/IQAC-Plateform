'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  searchFacultyDirectory,
  getCopyrights,
  getCopyrightStats,
  getCopyright,
  createCopyright,
  updateCopyright,
  deleteCopyright,
  uploadCopyrightProof,
  getCopyrightProofFile,
  downloadTemplate,
  previewBulkUpload,
  importBulkUpload
} = require('../controllers/copyrightController');
const { auth, authorize } = require('../middleware/auth');
const { requireModuleEnabled } = require('../middleware/configEnforcement');

const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, and JPG files are allowed for copyright proof documents.'));
    }
  }
});

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.use(auth);

router.get('/faculty-search', searchFacultyDirectory);
router.get('/template', downloadTemplate);
router.get('/stats', getCopyrightStats);
router.get('/proofs/file/:id', getCopyrightProofFile);

router.post(
  '/bulk/preview',
  authorize('admin', 'iqac_admin', 'coordinator', 'hod', 'faculty'),
  requireModuleEnabled('copyrights'),
  excelUpload.single('file'),
  previewBulkUpload
);

router.post(
  '/bulk/import',
  authorize('admin', 'iqac_admin', 'coordinator', 'hod', 'faculty'),
  requireModuleEnabled('copyrights'),
  excelUpload.single('file'),
  importBulkUpload
);

router.post(
  '/:id/proof',
  authorize('admin', 'iqac_admin', 'coordinator', 'hod', 'faculty'),
  requireModuleEnabled('copyrights'),
  (req, res, next) => {
    proofUpload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File size exceeds maximum permitted limit of 10 MB.' });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  uploadCopyrightProof
);

router.route('/')
  .get(getCopyrights)
  .post(
    authorize('admin', 'iqac_admin', 'coordinator', 'hod', 'faculty'),
    requireModuleEnabled('copyrights'),
    createCopyright
  );

router.route('/:id')
  .get(getCopyright)
  .put(
    authorize('admin', 'iqac_admin', 'coordinator', 'hod', 'faculty'),
    requireModuleEnabled('copyrights'),
    updateCopyright
  )
  .delete(
    authorize('admin', 'iqac_admin', 'coordinator', 'hod', 'faculty'),
    requireModuleEnabled('copyrights'),
    deleteCopyright
  );

module.exports = router;

