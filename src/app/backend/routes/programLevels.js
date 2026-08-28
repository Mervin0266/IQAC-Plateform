const express = require('express');
const router = express.Router();
const {
  getProgramLevels,
  getProgramLevel,
  createProgramLevel,
  updateProgramLevel,
  deleteProgramLevel
} = require('../controllers/programLevelController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getProgramLevels)
  .post(authorize('admin', 'coordinator', 'hod'), createProgramLevel);

router.route('/:id')
  .get(getProgramLevel)
  .put(authorize('admin', 'coordinator', 'hod'), updateProgramLevel)
  .delete(authorize('admin', 'coordinator', 'hod'), deleteProgramLevel);

module.exports = router;
