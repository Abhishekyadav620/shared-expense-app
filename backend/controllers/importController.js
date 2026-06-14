/**
 * CSV import HTTP handler.
 */
const importService = require('../services/importService');

/**
 * POST /api/import
 * Expects multipart/form-data with field name "file".
 */
async function uploadCsv(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded. Use field name "file".',
      });
    }

    const { rowCount, rows } = await importService.processCsvImport(req.file.buffer);

    res.status(200).json({
      success: true,
      rowCount,
      rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadCsv,
};
