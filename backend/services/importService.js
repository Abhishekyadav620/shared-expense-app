/**
 * Import coordinator — orchestrates CSV parsing and prepares rows for validation.
 * Does NOT save to the database or run anomaly detection yet.
 */
const csvParserService = require('./csvParserService');

function validationError(message) {
  const error = new Error(message);
  error.name = 'ValidationError';
  error.statusCode = 400;
  return error;
}

/**
 * Process an uploaded CSV file buffer.
 *
 * @param {Buffer} fileBuffer
 * @returns {Promise<{ rowCount: number, rows: object[] }>}
 */
async function processCsvImport(fileBuffer) {
  const parsedRows = await csvParserService.parseCsvBuffer(fileBuffer);

  if (parsedRows.length === 0) {
    throw validationError('CSV file contains no data rows');
  }

  // Attach row numbers (header = row 1, first data row = row 2) for future validation/errors
  const rows = parsedRows.map((row, index) => ({
    rowNumber: index + 2,
    ...row,
  }));

  return {
    rowCount: rows.length,
    rows,
  };
}

module.exports = {
  processCsvImport,
};
