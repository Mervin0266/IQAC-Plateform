const express = require('express');
const router = express.Router();
const {
  getAchievements,
  getAchievement,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getAchievementStats,
  bulkCreateAchievements
} = require('../controllers/achievementController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/stats', getAchievementStats);
router.post('/bulk', authorize('admin', 'coordinator', 'hod'), bulkCreateAchievements);

router.route('/')
  .get(getAchievements)
  .post(authorize('admin', 'coordinator', 'faculty'), createAchievement);

router.route('/:id')
  .get(getAchievement)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), updateAchievement)
  .delete(authorize('admin', 'coordinator'), deleteAchievement);

module.exports = router;
