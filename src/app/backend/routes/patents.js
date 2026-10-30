const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getPatents,
  getPatentStats,
  getPatent,
  createPatent,
  updatePatent,
  deletePatent,
  bulkUploadPatents,
  clearAllPatents,
  uploadPatentProof,
  addPatentProofLinks,
  getPatentProofs,
  deletePatentProof,
  getPatentProofFile
} = require('../controllers/patentController');
const { auth, authorize } = require('../middleware/auth');

// Multer memory storage configuration for Direct Google Drive upload (Max 10MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB per file limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, and JPG files are allowed for patent proof documents.'));
    }
  }
});

// Direct proof file streaming endpoint (accessible by secure proof UUID so browser <a> links can view/download)
router.get('/proofs/file/:proofId', getPatentProofFile);

// All subsequent routes require authentication
router.use(auth);

router.get('/stats', getPatentStats);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), bulkUploadPatents);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllPatents);

// Proof endpoints
router.get('/:id/proofs', getPatentProofs);
router.post(
  '/:id/proofs',
  authorize('admin', 'coordinator', 'hod', 'faculty'),
  (req, res, next) => {
    upload.array('files', 10)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum permitted limit of 10 MB.'
          });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadPatentProof
);
router.post('/:id/proof-links', authorize('admin', 'coordinator', 'hod', 'faculty'), addPatentProofLinks);
router.delete('/:id/proofs/:proofId', authorize('admin', 'coordinator', 'hod', 'faculty'), deletePatentProof);

router.route('/')
  .get(getPatents)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), createPatent);

router.route('/:id')
  .get(getPatent)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), updatePatent)
  .delete(authorize('admin', 'coordinator', 'hod', 'faculty'), deletePatent);

module.exports = router;
