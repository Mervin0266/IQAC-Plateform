const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getConsultancyProjects,
  getConsultancyProject,
  createConsultancyProject,
  updateConsultancyProject,
  deleteConsultancyProject,
  getConsultancyStats,
  bulkCreateConsultancyProjects,
  clearAllConsultancyProjects,
  uploadConsultancyDocument,
  addConsultancyDocumentLink,
  deleteConsultancyDocument
} = require('../controllers/consultancyProjectController');
const { auth, authorize } = require('../middleware/auth');

// Multer memory storage configuration for Direct Google Drive upload (Max 10MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB per file limit
  }
});

// All routes require authentication
router.use(auth);

router.get('/stats', getConsultancyStats);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), bulkCreateConsultancyProjects);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllConsultancyProjects);

// Document attachments (Agreement / Work Order, Invoice, Payment Receipt)
router.post(
  '/:id/documents/upload',
  authorize('admin', 'coordinator', 'hod', 'faculty'),
  (req, res, next) => {
    upload.array('files', 10)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Attachment exceeds maximum 10MB limit per document file.'
          });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadConsultancyDocument
);

router.post(
  '/:id/documents/link',
  authorize('admin', 'coordinator', 'hod', 'faculty'),
  addConsultancyDocumentLink
);

router.delete(
  '/:id/documents/:docId',
  authorize('admin', 'coordinator', 'hod', 'faculty'),
  deleteConsultancyDocument
);

router.route('/')
  .get(getConsultancyProjects)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), createConsultancyProject);

router.route('/:id')
  .get(getConsultancyProject)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), updateConsultancyProject)
  .delete(authorize('admin', 'coordinator', 'hod'), deleteConsultancyProject);

module.exports = router;
