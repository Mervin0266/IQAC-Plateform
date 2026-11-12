const express = require('express');
const router = express.Router();
const {
  getPublications,
  getPublicationStats,
  getPublicationFacultyDirectory,
  getPublication,
  createPublication,
  updatePublication,
  deletePublication,
  bulkUploadPublications,
  clearAllPublications,
  validateAndPreviewCitations,
  confirmCitationsUpdate,
  getPublicationCitations,
  previewCitationCorrection,
  applyAuditedCitationCorrection
} = require('../controllers/publicationController');
const { auth, authorize } = require('../middleware/auth');
const { requireModuleEnabled, validateFormSubmission } = require('../middleware/configEnforcement');

// All routes require authentication
router.use(auth);

router.get('/stats', getPublicationStats);
router.get('/faculty-directory', authorize('admin', 'coordinator', 'hod', 'faculty'), getPublicationFacultyDirectory);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), bulkUploadPublications);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('publications'), clearAllPublications);

// Citation Management V7.2 Routes
router.post('/citations/validate-and-preview', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), validateAndPreviewCitations);
router.post('/citations/confirm', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), confirmCitationsUpdate);
router.get('/:id/citations', getPublicationCitations);
router.post('/:id/citations/preview-correction', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('publications'), previewCitationCorrection);
router.post('/:id/citations/apply-correction', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('publications'), applyAuditedCitationCorrection);

router.route('/')
  .get(getPublications)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), validateFormSubmission('publication-form', true), createPublication);

router.route('/:id')
  .get(getPublication)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), validateFormSubmission('publication-form', false), updatePublication)
  .delete(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), deletePublication);

module.exports = router;
