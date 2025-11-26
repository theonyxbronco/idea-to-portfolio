/**
 * Response Helper
 * Standardized response formatting for API endpoints
 */

/**
 * Send a standardized error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {*} details - Additional error details (only shown in development)
 * @returns {object} JSON response
 */
const errorResponse = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  // Only include details in development mode
  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a standardized success response
 * @param {object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {object} JSON response
 */
const successResponse = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    timestamp: new Date().toISOString()
  };

  if (message) {
    response.message = message;
  }

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Common error types with pre-defined status codes
 */
const ErrorTypes = {
  BAD_REQUEST: { code: 400, message: 'Bad Request' },
  UNAUTHORIZED: { code: 401, message: 'Unauthorized' },
  FORBIDDEN: { code: 403, message: 'Forbidden' },
  NOT_FOUND: { code: 404, message: 'Not Found' },
  CONFLICT: { code: 409, message: 'Conflict' },
  VALIDATION_ERROR: { code: 422, message: 'Validation Error' },
  RATE_LIMIT: { code: 429, message: 'Too Many Requests' },
  INTERNAL_ERROR: { code: 500, message: 'Internal Server Error' },
  SERVICE_UNAVAILABLE: { code: 503, message: 'Service Unavailable' }
};

/**
 * Send a predefined error response
 * @param {object} res - Express response object
 * @param {object} errorType - Error type from ErrorTypes
 * @param {string} customMessage - Optional custom message
 * @param {*} details - Additional error details
 * @returns {object} JSON response
 */
const sendError = (res, errorType, customMessage = null, details = null) => {
  return errorResponse(
    res,
    errorType.code,
    customMessage || errorType.message,
    details
  );
};

module.exports = {
  errorResponse,
  successResponse,
  sendError,
  ErrorTypes
};
