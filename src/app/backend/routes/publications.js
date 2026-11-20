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
  applyAuditedCitationCorrection,
  refreshQuartile,
  refreshAllCitations,
  refreshSingleCitation,
  getCitationDiagnostics,
  getPublicationJournalMetrics,
  refreshPublicationJournalMetrics,
  refreshAllJournalMetrics,
  searchJournals,
  linkPublicationJournal,
  exportPublicationReport
} = require('../controllers/publicationController');
const { auth, authorize } = require('../middleware/auth');
const { requireModuleEnabled, validateFormSubmission } = require('../middleware/configEnforcement');

// All routes require authentication
router.use(auth);

router.get('/stats', getPublicationStats);
router.get('/faculty-directory', authorize('admin', 'coordinator', 'hod', 'faculty'), getPublicationFacultyDirectory);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), bulkUploadPublications);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('publications'), clearAllPublications);

// Scopus Citation Live Refresh & Diagnostics Routes
router.get('/journal-sources/search', searchJournals);
router.post('/journal-sources/refresh-all', authorize('admin', 'coordinator'), requireModuleEnabled('publications'), refreshAllJournalMetrics);
router.post('/citations/refresh-all', authorize('admin', 'coordinator'), requireModuleEnabled('publications'), refreshAllCitations);
router.get('/citations/diagnostics', authorize('admin', 'coordinator'), requireModuleEnabled('publications'), getCitationDiagnostics);
router.post('/:id/refresh-citation', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), refreshSingleCitation);

// Journal Metrics & Export Routes
router.get('/:id/journal-metrics', getPublicationJournalMetrics);
router.post('/:id/refresh-journal-metrics', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), refreshPublicationJournalMetrics);
router.post('/:id/link-journal-source', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('publications'), linkPublicationJournal);
router.get('/:id/export', exportPublicationReport);

// Citation Management Legacy / Read-only Routes
router.post('/citations/validate-and-preview', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), validateAndPreviewCitations);
router.post('/citations/confirm', authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), confirmCitationsUpdate);
router.get('/:id/citations', getPublicationCitations);
router.post('/:id/citations/preview-correction', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('publications'), previewCitationCorrection);
router.post('/:id/citations/apply-correction', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('publications'), applyAuditedCitationCorrection);

router.post('/:id/refresh-quartile', authorize('admin', 'coordinator', 'hod', 'faculty', 'authority'), requireModuleEnabled('publications'), refreshQuartile);

router.route('/')
  .get(getPublications)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), validateFormSubmission('publication-form', true), createPublication);

router.route('/:id')
  .get(getPublication)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), validateFormSubmission('publication-form', false), updatePublication)
  .delete(authorize('admin', 'coordinator', 'hod', 'faculty'), requireModuleEnabled('publications'), deletePublication);

module.exports = router;
