const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled API error', {
    path: req.originalUrl,
    method: req.method,
    message: err.message
  });

  const status = err.status || 500;
  return res.status(status).json({
    error: err.message || 'Internal server error.',
    message: err.message || 'Internal server error.'
  });
}

module.exports = errorHandler;
