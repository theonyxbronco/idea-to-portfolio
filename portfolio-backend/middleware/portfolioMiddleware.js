const { PortfolioValidator, ErrorFormatter } = require('../utils/validation');

const validator = new PortfolioValidator();

// Enhanced validation middleware
const validatePortfolioData = async (req, res, next) => {
  try {
    // Parse portfolio data
    if (!req.body.portfolioData) {
      return res.status(400).json(ErrorFormatter.formatAPIError(
        new Error('Portfolio data is required'), 
        process.env.NODE_ENV === 'development'
      ));
    }

    let portfolioData;
    try {
      portfolioData = JSON.parse(req.body.portfolioData);
    } catch (parseError) {
      return res.status(400).json(ErrorFormatter.formatAPIError(
        new Error('Invalid JSON in portfolio data'), 
        process.env.NODE_ENV === 'development'
      ));
    }

    // Validate portfolio data
    const validation = validator.validateComplete(portfolioData);
    
    if (!validation.isValid) {
      return res.status(400).json(ErrorFormatter.formatValidationErrors(validation.errors));
    }

    // Validate files if present
    if (req.files) {
      const fileValidation = validator.validateFiles(req.files);
      if (!fileValidation.isValid) {
        return res.status(400).json(ErrorFormatter.formatValidationErrors(fileValidation.errors));
      }
    }

    // Attach validated and corrected data to request
    req.portfolioData = validation.correctedData;
    next();

  } catch (error) {
    console.error('Validation middleware error:', error);
    return res.status(500).json(ErrorFormatter.formatAPIError(
      error, 
      process.env.NODE_ENV === 'development'
    ));
  }
};

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20; // Max 20 requests per window (more reasonable)

const rateLimit = (req, res, next) => {
  // Skip rate limiting in development/test mode or if disabled
  if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const clientData = rateLimitMap.get(clientIP);
  
  if (now > clientData.resetTime) {
    // Reset the window
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'Rate Limit Exceeded',
      details: `Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per ${Math.round(RATE_LIMIT_WINDOW / 60000)} minutes`,
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }

  clientData.count++;
  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  
  // Log response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Only set HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Health check with detailed system info
const detailedHealthCheck = (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
    },
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    },
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not configured',
      fileSystem: 'available'
    }
  };
  
  // Check if we can write to uploads directory
  const fs = require('fs-extra');
  const path = require('path');
  try {
    const uploadsDir = process.env.UPLOAD_DIR || './uploads';
    if (fs.existsSync(uploadsDir)) {
      health.services.uploads = 'available';
    } else {
      health.services.uploads = 'directory missing';
      health.status = 'WARNING';
    }
  } catch (error) {
    health.services.uploads = 'error';
    health.status = 'ERROR';
  }
  
  const statusCode = health.status === 'OK' ? 200 : health.status === 'WARNING' ? 200 : 503;
  res.status(statusCode).json(health);
};

// Enhanced error handler
const errorHandler = (error, req, res, next) => {
  // Log error with context
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  const formattedError = ErrorFormatter.formatAPIError(error, isDevelopment);
  
  // Determine status code
  let statusCode = 500;
  if (error.name === 'ValidationError') statusCode = 400;
  if (error.message?.includes('rate limit')) statusCode = 429;
  if (error.message?.includes('not found')) statusCode = 404;
  if (error.message?.includes('unauthorized')) statusCode = 401;
  if (error.message?.includes('forbidden')) statusCode = 403;
  
  res.status(statusCode).json(formattedError);
};

// Function to clear rate limit (for testing)
const clearRateLimit = () => {
  rateLimitMap.clear();
  console.log('Rate limit cleared');
};

module.exports = {
  validatePortfolioData,
  rateLimit,
  requestLogger,
  securityHeaders,
  detailedHealthCheck,
  errorHandler,
  clearRateLimit
};