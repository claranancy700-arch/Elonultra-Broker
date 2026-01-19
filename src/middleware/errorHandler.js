/**
 * Centralized Error Handler Middleware
 * Catches and standardizes error responses across all routes
 */

const response = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', {
    message: err.message,
    code: err.code,
    status: err.statusCode || 500,
    path: req.path,
  });

  // Database errors
  if (err.code === '23505') {
    // Unique constraint violation
    return response.error(res, 409, 'This record already exists');
  }

  if (err.code === '23503') {
    // Foreign key constraint violation
    return response.error(res, 400, 'Referenced record not found');
  }

  if (err.code === '42P01') {
    // Table does not exist
    return response.error(res, 500, 'Database schema error');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return response.unauthorized(res, 'Invalid or expired token');
  }

  if (err.name === 'TokenExpiredError') {
    return response.unauthorized(res, 'Token has expired');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return response.badRequest(res, err.message);
  }

  // Custom app errors
  if (err.statusCode) {
    return response.error(res, err.statusCode, err.message);
  }

  // Generic server error
  return response.serverError(res, 'Internal Server Error', err.message);
};

module.exports = errorHandler;
