/**
 * CSV import routes — JWT protected.
 *
 * POST /api/import  (multipart/form-data, field: file)
 */
const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const importController = require('../controllers/importController');

const router = express.Router();

// Store uploaded files in memory — we parse immediately, no disk write
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter(req, file, cb) {
    const isCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');

    if (isCsv) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.use(authMiddleware);

router.post('/', upload.single('file'), importController.uploadCsv);

module.exports = router;
