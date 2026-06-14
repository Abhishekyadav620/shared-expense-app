/**
 * Group route definitions — all endpoints require JWT authentication.
 * Mounted in app.js at /api/groups → full paths:
 *   POST   /api/groups
 *   GET    /api/groups
 *   GET    /api/groups/:id
 *   PUT    /api/groups/:id
 *   DELETE /api/groups/:id
 */
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const groupController = require('../controllers/groupController');

const router = express.Router();

// Every group route requires a valid JWT — runs before any handler below
router.use(authMiddleware);

router.post('/', groupController.createGroup);
router.get('/', groupController.getAllGroups);
router.get('/:id', groupController.getGroupById);
router.put('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);

module.exports = router;
