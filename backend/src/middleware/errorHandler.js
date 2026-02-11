/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // SQLite constraint violation
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({
      error: 'Constraint violation',
      message: err.message
    });
  }

  // SQLite busy
  if (err.code === 'SQLITE_BUSY') {
    return res.status(503).json({
      error: 'Database busy',
      message: 'Please try again'
    });
  }

  // Validation error
  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: err.details
    });
  }

  // Not found error
  if (err.type === 'not_found') {
    return res.status(404).json({
      error: 'Not found',
      message: err.message
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
}

module.exports = errorHandler;
