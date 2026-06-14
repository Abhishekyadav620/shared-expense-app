/**
 * Final import routes — JWT protected.
 *
 * POST /api/import/finalize
 */
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const finalImportController = require('../controllers/finalImportController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', finalImportController.finalizeImport);

module.exports = router;
