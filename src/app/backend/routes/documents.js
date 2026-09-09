const express = require('express');
const router = express.Router();
const {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  clearAllDocuments
} = require('../controllers/documentController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllDocuments);

router.route('/')
  .get(getDocuments)
  .post(authorize('admin', 'coordinator', 'faculty'), createDocument);

router.route('/:id')
  .get(getDocument)
  .put(authorize('admin', 'coordinator', 'faculty'), updateDocument)
  .delete(authorize('admin', 'coordinator'), deleteDocument);

module.exports = router;
