'use strict';

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
  deleteConsultancyDocument,
  downloadConsultancyTemplate,
  previewBulkUploadConsultancy,
  importBulkUploadConsultancy,
  searchFacultyDirectory
} = require('../controllers/consultancyProjectController');
const { auth, authorize } = require('../middleware/auth');
const { requireModuleEnabled, validateFormSubmission } = require('../middleware/configEnforcement');

// Multer memory storage configuration for Direct Google Drive upload (Max 10MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB per file limit
  }
});

// Multer memory storage configuration for Excel spreadsheet preview and import (Max 15MB)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Direct template download endpoint (accessible without blocking auth tokens on browser click)
router.get('/template', downloadConsultancyTemplate);

// All subsequent routes require authentication
router.use(auth);

router.get('/faculty-search', searchFacultyDirectory);
router.get('/stats', getConsultancyStats);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('consultancy-projects'), bulkCreateConsultancyProjects);
router.post('/bulk/preview', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('consultancy-projects'), excelUpload.single('file'), previewBulkUploadConsultancy);
router.post('/bulk/import', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('consultancy-projects'), excelUpload.single('file'), importBulkUploadConsultancy);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('consultancy-projects'), clearAllConsultancyProjects);

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
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('consultancy-projects'), validateFormSubmission('consultancy-project-form', true), createConsultancyProject);

router.route('/:id')
  .get(getConsultancyProject)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('consultancy-projects'), validateFormSubmission('consultancy-project-form', false), updateConsultancyProject)
  .delete(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('consultancy-projects'), deleteConsultancyProject);

module.exports = router;
