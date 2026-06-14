/**
 * Group HTTP handlers — thin layer between routes and groupService.
 * Reads req params/body, passes req.user.id for auth, sends JSON responses.
 */
const groupService = require('../services/groupService');

/**
 * POST /api/groups
 * Body: { name }
 */
async function createGroup(req, res, next) {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    const group = await groupService.createGroup({ name, createdBy: userId });

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/groups
 * Returns all groups the logged-in user can access.
 */
async function getAllGroups(req, res, next) {
  try {
    const userId = req.user.id;

    const groups = await groupService.getAllGroups(userId);

    res.status(200).json({
      success: true,
      message: 'Groups fetched successfully',
      data: groups,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/groups/:id
 */
async function getGroupById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await groupService.getGroupById(id, userId);

    res.status(200).json({
      success: true,
      message: 'Group fetched successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/groups/:id
 * Body: { name }
 */
async function updateGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    const group = await groupService.updateGroup(id, userId, { name });

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/groups/:id
 */
async function deleteGroup(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await groupService.deleteGroup(id, userId);

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
};
