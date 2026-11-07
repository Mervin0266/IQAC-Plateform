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

// Public / direct authorized link for serving offer letter document
router.get('/:id/offer-letter/file', getOfferLetterFile);

// All subsequent routes require authentication
router.use(auth);

router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllPlacements);

router.get('/stats', getPlacementStats);
router.post('/verify-bulk', authorize('admin', 'coordinator', 'hod'), verifyBulkPlacements);
router.post('/bulk', authorize('admin', 'coordinator', 'hod'), bulkCreatePlacements);

// Offer letter document endpoints
router.post('/:id/offer-letter', authorize('admin', 'coordinator', 'hod'), upload.single('offerLetter'), uploadOfferLetter);
router.delete('/:id/offer-letter', authorize('admin', 'coordinator', 'hod'), deleteOfferLetter);

router.route('/')
  .get(getPlacements)
  .post(authorize('admin', 'coordinator'), createPlacement);

router.route('/:id')
  .put(authorize('admin', 'coordinator', 'hod'), updatePlacement)
  .delete(authorize('admin', 'coordinator', 'hod'), deletePlacement);

module.exports = router;
