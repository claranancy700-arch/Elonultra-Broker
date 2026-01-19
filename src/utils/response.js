/**
 * Standardized API Response Utility
 * Ensures consistent response format across all endpoints
 */

const response = {
  /**
   * Success response with data
   */
  success(res, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data: data || null,
    });
  },

  /**
   * Error response
   */
  error(res, statusCode = 500, message = 'Internal Server Error', details = null) {
    return res.status(statusCode).json({
      success: false,
      error: message,
      ...(details && { details }),
    });
  },

  /**
   * Paginated response
   */
  paginated(res, items = [], total = 0, limit = 50, offset = 0, statusCode = 200) {
    const pages = Math.ceil(total / limit);
    return res.status(statusCode).json({
      success: true,
      data: items,
      pagination: {
        total,
        limit,
        offset,
        pages,
        hasNext: offset + limit < total,
      },
    });
  },

  /**
   * Created resource (201)
   */
  created(res, data = null) {
    return this.success(res, data, 201);
  },

  /**
   * Bad request (400)
   */
  badRequest(res, message = 'Bad Request') {
    return this.error(res, 400, message);
  },

  /**
   * Unauthorized (401)
   */
  unauthorized(res, message = 'Unauthorized') {
    return this.error(res, 401, message);
  },

  /**
   * Forbidden (403)
   */
  forbidden(res, message = 'Forbidden') {
    return this.error(res, 403, message);
  },

  /**
   * Not found (404)
   */
  notFound(res, message = 'Not Found') {
    return this.error(res, 404, message);
  },

  /**
   * Server error (500)
   */
  serverError(res, message = 'Internal Server Error', details = null) {
    return this.error(res, 500, message, details);
  },
};

module.exports = response;
