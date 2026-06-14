/**
 * CSV parser — reads uploaded file buffers and converts rows to plain objects.
 * Does NOT write to the database; parsing only.
 */
const csv = require('csv-parser');
const { Readable } = require('stream');

function validationError(message) {
  const error = new Error(message);
  error.name = 'ValidationError';
  error.statusCode = 400;
  return error;
}

/**
 * Parse a CSV buffer into an array of row objects.
 * Column headers become object keys (e.g. { description, amount, date }).
 *
 * @param {Buffer} buffer — raw file bytes from multer memory storage
 * @returns {Promise<object[]>}
 */
function parseCsvBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    return Promise.reject(validationError('CSV file is empty'));
  }

  return new Promise((resolve, reject) => {
    const rows = [];

    // csv-parser expects a readable stream — wrap the in-memory buffer
    const stream = Readable.from(buffer);

    stream
      .pipe(csv())
      .on('data', (row) => {
        // Each `row` is one CSV line as a key-value object
        rows.push(row);
      })
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
}

module.exports = {
  parseCsvBuffer,
};
