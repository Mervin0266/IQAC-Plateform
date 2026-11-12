const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const {
  getPlacements,
  getPlacementStats,
  createPlacement,
  updatePlacement,
  deletePlacement,
  verifyBulkPlacements,
  bulkCreatePlacements,
  uploadOfferLetter,
  deleteOfferLetter,
  getOfferLetterFile,
  clearAllPlacements
} = require('../controllers/placementController');
const { auth, authorize } = require('../middleware/auth');
const { requireModuleEnabled, validateFormSubmission } = require('../middleware/configEnforcement');

// Public / direct authorized link for serving offer letter document
router.get('/:id/offer-letter/file', getOfferLetterFile);

// All subsequent routes require authentication
router.use(auth);

router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('placements-internships'), clearAllPlacements);

router.get('/stats', getPlacementStats);
router.post('/verify-bulk', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('placements-internships'), verifyBulkPlacements);
router.post('/bulk', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('placements-internships'), bulkCreatePlacements);

// Offer letter document endpoints
router.post('/:id/offer-letter', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('placements-internships'), upload.single('offerLetter'), uploadOfferLetter);
router.delete('/:id/offer-letter', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('placements-internships'), deleteOfferLetter);

router.route('/')
  .get(getPlacements)
  .post(authorize('admin', 'coordinator'), requireModuleEnabled('placements-internships'), validateFormSubmission('placements-internships-form', true), createPlacement);

router.route('/:id')
  .put(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('placements-internships'), validateFormSubmission('placements-internships-form', false), updatePlacement)
  .delete(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('placements-internships'), deletePlacement);

module.exports = router;
