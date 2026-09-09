const express = require('express');
const router = express.Router();
const {
  getStrategicPlans,
  getStrategicPlan,
  createStrategicPlan,
  updateStrategicPlan,
  deleteStrategicPlan,
  getStrategicPlanStats,
  clearAllStrategicPlans
} = require('../controllers/strategicPlanController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllStrategicPlans);

router.get('/stats', getStrategicPlanStats);

router.route('/')
  .get(getStrategicPlans)
  .post(authorize('admin', 'coordinator', 'faculty'), createStrategicPlan);

router.route('/:id')
  .get(getStrategicPlan)
  .put(authorize('admin', 'coordinator', 'faculty'), updateStrategicPlan)
  .delete(authorize('admin', 'coordinator'), deleteStrategicPlan);

module.exports = router;
