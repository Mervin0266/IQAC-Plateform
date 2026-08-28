const express = require('express');
const router = express.Router();
const {
  getHierarchyStats,
  getHierarchyTree
} = require('../controllers/hierarchyController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.route('/stats').get(getHierarchyStats);
router.route('/tree').get(getHierarchyTree);

module.exports = router;
