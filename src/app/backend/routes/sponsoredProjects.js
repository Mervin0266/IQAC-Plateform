const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getSponsoredProjects,
  getSponsoredProjectStats,
  getSponsoredProject,
  createSponsoredProject,
  updateSponsoredProject,
  deleteSponsoredProject,
  bulkUploadSponsoredProjects,
  clearAllSponsoredProjects,
  uploadSponsoredDocuments,
  addSponsoredDocumentLinks,
  deleteSponsoredDocument,
  addSponsoredInstallment,
  updateSponsoredInstallment,
  deleteSponsoredInstallment
} = require('../controllers/sponsoredProjectController');
const { auth, authorize } = require('../middleware/auth');
const { requireModuleEnabled, validateFormSubmission } = require('../middleware/configEnforcement');

// Multer memory storage configuration for Direct Google Drive upload (Max 10MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB per file limit
  }
});

// All routes require authentication
router.use(auth);

router.get('/stats', getSponsoredProjectStats);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('sponsored-research'), bulkUploadSponsoredProjects);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('sponsored-research'), clearAllSponsoredProjects);

// Document attachments (Agreement Letters & Payment Receipts)
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
  uploadSponsoredDocuments
);
router.post('/:id/documents/links', authorize('admin', 'coordinator', 'hod', 'faculty'), addSponsoredDocumentLinks);
router.delete('/:id/documents/:documentId', authorize('admin', 'coordinator', 'hod', 'faculty'), deleteSponsoredDocument);

// Installment tracking
router.post('/:id/installments', authorize('admin', 'coordinator', 'hod', 'faculty'), addSponsoredInstallment);
router.put('/:id/installments/:installmentId', authorize('admin', 'coordinator', 'hod', 'faculty'), updateSponsoredInstallment);
router.delete('/:id/installments/:installmentId', authorize('admin', 'coordinator', 'hod', 'faculty'), deleteSponsoredInstallment);

router.route('/')
  .get(getSponsoredProjects)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('sponsored-research'), validateFormSubmission('sponsored-research-form', true), createSponsoredProject);

router.route('/:id')
  .get(getSponsoredProject)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('sponsored-research'), validateFormSubmission('sponsored-research-form', false), updateSponsoredProject)
  .delete(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('sponsored-research'), deleteSponsoredProject);

module.exports = router;
