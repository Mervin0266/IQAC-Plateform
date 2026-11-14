const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getInternalProjects,
  getInternalProjectStats,
  getInternalProject,
  createInternalProject,
  updateInternalProject,
  deleteInternalProject,
  clearAllInternalProjects,
  downloadInternalTemplate,
  previewBulkUploadInternal,
  importBulkUploadInternal,
  getSeedMoneySchemes,
  searchFacultyDirectory
} = require('../controllers/internalResearchController');
const { auth, authorize } = require('../middleware/auth');
const { requireModuleEnabled } = require('../middleware/configEnforcement');

// Multer memory storage configuration for Excel spreadsheet preview and import (Max 15MB)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Direct template download endpoint (accessible without blocking auth tokens on browser click)
router.get('/template', downloadInternalTemplate);

// Configured Seed Money Schemes
router.get('/seed-money-schemes', getSeedMoneySchemes);

// All subsequent routes require authentication
router.use(auth);

router.get('/faculty-search', searchFacultyDirectory);
router.get('/stats', getInternalProjectStats);
router.post('/bulk/preview', authorize('admin', 'coordinator', 'hod', 'faculty'), excelUpload.single('file'), previewBulkUploadInternal);
router.post('/bulk/import', authorize('admin', 'coordinator', 'hod', 'faculty'), excelUpload.single('file'), importBulkUploadInternal);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllInternalProjects);

router.route('/')
  .get(getInternalProjects)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), createInternalProject);

router.route('/:id')
  .get(getInternalProject)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), updateInternalProject)
  .delete(authorize('admin', 'coordinator', 'hod', 'faculty'), deleteInternalProject);

module.exports = router;
