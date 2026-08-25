const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getDomainTrendAnalytics,
  getUserDepartmentHistory
} = require('../controllers/departmentLineageController');

router.use(auth);

router.get('/domain-trends', getDomainTrendAnalytics);
router.get('/users/:userId/history', getUserDepartmentHistory);

module.exports = router;
