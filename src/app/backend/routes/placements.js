const express = require('express');
const router = express.Router();
const {
  getPlacements,
  getPlacementStats,
  createPlacement,
  updatePlacement,
  deletePlacement,
  bulkCreatePlacements
} = require('../controllers/placementController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/stats', getPlacementStats);
router.post('/bulk', authorize('admin', 'coordinator'), bulkCreatePlacements);

router.route('/')
  .get(getPlacements)
  .post(authorize('admin', 'coordinator'), createPlacement);

router.route('/:id')
  .put(authorize('admin', 'coordinator'), updatePlacement)
  .delete(authorize('admin', 'coordinator'), deletePlacement);

module.exports = router;
