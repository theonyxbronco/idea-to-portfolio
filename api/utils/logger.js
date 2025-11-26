/**
 * Centralized logging utility with consistent formatting
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const LOG_COLORS = {
  ERROR: '🔴',
  WARN: '⚠️',
  INFO: '📘',
  DEBUG: '🔍',
  SUCCESS: '✅',
};

class Logger {
  constructor(context = 'API') {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Format log message with timestamp and context
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const emoji = LOG_COLORS[level] || '';
    const contextStr = this.context ? `[${this.context}]` : '';

    let logMessage = `${emoji} ${timestamp} ${level} ${contextStr} ${message}`;

    if (data && this.isDevelopment) {
      logMessage += '\n' + JSON.stringify(data, null, 2);
    }

    return logMessage;
  }

  /**
   * Log error messages
   */
  error(message, error = null) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.ERROR, message);
    console.error(formattedMessage);

    if (error) {
      console.error('Error details:', error);
      if (error.stack && this.isDevelopment) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  /**
   * Log warning messages
   */
  warn(message, data = null) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.WARN, message, data);
    console.warn(formattedMessage);
  }

  /**
   * Log info messages
   */
  info(message, data = null) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.INFO, message, data);
    console.log(formattedMessage);
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message, data = null) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(LOG_LEVELS.DEBUG, message, data);
      console.log(formattedMessage);
    }
  }

  /**
   * Log success messages
   */
  success(message, data = null) {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';

    let logMessage = `${LOG_COLORS.SUCCESS} ${timestamp} SUCCESS ${contextStr} ${message}`;

    if (data && this.isDevelopment) {
      logMessage += '\n' + JSON.stringify(data, null, 2);
    }

    console.log(logMessage);
  }

  /**
   * Log HTTP requests
   */
  request(method, path, origin = null) {
    const message = `${method} ${path}${origin ? ` from: ${origin}` : ''}`;
    this.info(message);
  }

  /**
   * Log HTTP responses
   */
  response(method, path, statusCode, duration = null) {
    const durationStr = duration ? ` (${duration}ms)` : '';
    const message = `${method} ${path} → ${statusCode}${durationStr}`;

    if (statusCode >= 500) {
      this.error(message);
    } else if (statusCode >= 400) {
      this.warn(message);
    } else {
      this.info(message);
    }
  }
}

// Create default logger instance
const defaultLogger = new Logger();

// Export both the class and default instance
module.exports = {
  Logger,
  logger: defaultLogger,
};
