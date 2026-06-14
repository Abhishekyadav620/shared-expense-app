/**
 * Anomaly detection routes — JWT protected.
 *
 * POST /api/import/anomalies
 */
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const anomalyController = require('../controllers/anomalyController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', anomalyController.detectAnomalies);

module.exports = router;
