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

    // ENHANCED: Log file information for debugging
    if (req.files && req.files.length > 0) {
      console.log('\n=== FILE UPLOAD ANALYSIS ===');
      console.log(`Total files received: ${req.files.length}`);
      
      const filesByType = {
        moodboard: [],
        process: [],
        final: [],
        other: []
      };
      
      req.files.forEach((file, index) => {
        const fieldName = file.fieldname || '';
        const originalName = file.originalname || '';
        
        let type = 'other';
        if (fieldName.includes('moodboard')) type = 'moodboard';
        else if (fieldName.includes('process')) type = 'process';  
        else if (fieldName.includes('final')) type = 'final';
        
        filesByType[type].push({
          fieldName,
          originalName,
          size: file.size,
          mimetype: file.mimetype
        });
        
        console.log(`File ${index + 1}:`);
        console.log(`  Field: ${fieldName}`);
        console.log(`  Name: ${originalName}`);
        console.log(`  Type: ${type}`);
        console.log(`  Size: ${(file.size / 1024).toFixed(1)}KB`);
        console.log(`  MIME: ${file.mimetype}`);
      });
      
      console.log('\nFile Summary:');
      console.log(`  Moodboard: ${filesByType.moodboard.length} files`);
      console.log(`  Process: ${filesByType.process.length} files`);
      console.log(`  Final: ${filesByType.final.length} files`);
      console.log(`  Other: ${filesByType.other.length} files`);
      console.log('=== END FILE ANALYSIS ===\n');
      
      // Validate files if present
      const fileValidation = validator.validateFiles(req.files);
      if (!fileValidation.isValid) {
        console.log('File validation failed:', fileValidation.errors);
        return res.status(400).json(ErrorFormatter.formatValidationErrors(fileValidation.errors));
      }
    } else {
      console.log('No files received in request');
    }

    // Validate portfolio data
    const validation = validator.validateComplete(portfolioData);
    
    if (!validation.isValid) {
      console.log('Portfolio data validation failed:', validation.errors);
      return res.status(400).json(ErrorFormatter.formatValidationErrors(validation.errors));
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

// Vercel-compatible health check with detailed system info
const detailedHealthCheck = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    const status = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        human: formatUptime(uptime)
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      platform: process.env.VERCEL ? 'vercel' : (process.env.NODE_ENV === 'production' ? 'production' : 'local'),
      services: {}
    };

    let hasWarnings = false;
    let hasErrors = false;

    // Check Anthropic API
    try {
      if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 20) {
        status.services.anthropic = 'configured';
      } else if (process.env.ANTHROPIC_API_KEY) {
        status.services.anthropic = 'invalid key format';
        hasWarnings = true;
      } else {
        status.services.anthropic = 'missing api key';
        hasErrors = true;
      }
    } catch (error) {
      status.services.anthropic = 'error checking';
      hasErrors = true;
    }

    // Check filesystem - different for Vercel vs local
    const fs = require('fs-extra');
    const path = require('path');
    
    try {
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        // In Vercel, check /tmp directory
        const tmpExists = await fs.pathExists('/tmp');
        if (tmpExists) {
          status.services.fileSystem = 'available (/tmp)';
          status.services.tempDirectory = '/tmp accessible';
        } else {
          status.services.fileSystem = 'tmp missing';
          status.services.tempDirectory = '/tmp not found';
          hasWarnings = true;
        }
        
        // Check if we can write to /tmp
        try {
          const testFile = '/tmp/health_check_test.txt';
          await fs.writeFile(testFile, 'test');
          await fs.remove(testFile);
          status.services.writeAccess = 'success';
        } catch (writeError) {
          status.services.writeAccess = 'failed - ' + writeError.message;
          hasWarnings = true;
        }
        
        // Uploads directory is not applicable in Vercel
        status.services.uploads = 'not applicable (serverless)';
        
        // Check if required temp directories can be created
        try {
          const tempDirs = ['/tmp/projects', '/tmp/temp_analysis'];
          for (const dir of tempDirs) {
            await fs.ensureDir(dir);
          }
          status.services.tempDirs = 'created successfully';
        } catch (tempError) {
          status.services.tempDirs = 'creation failed';
          hasWarnings = true;
        }
        
      } else {
        // Local environment checks
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const tempDir = path.join(__dirname, '..', 'temp');
        
        status.services.uploads = await fs.pathExists(uploadsDir) ? 'available' : 'directory missing';
        status.services.tempDirectory = await fs.pathExists(tempDir) ? 'available' : 'directory missing';
        status.services.fileSystem = 'local filesystem';
        
        if (!await fs.pathExists(uploadsDir) || !await fs.pathExists(tempDir)) {
          hasWarnings = true;
        }
      }
    } catch (error) {
      status.services.fileSystem = 'error checking - ' + error.message;
      hasErrors = true;
    }

    // Check Google Sheets configuration
    try {
      const googleSheetsConfigs = [
        { name: 'main', id: process.env.GOOGLE_SHEETS_ID },
        { name: 'deployments', id: process.env.GOOGLE_SHEETS_ID1 },
        { name: 'waitlist', id: process.env.GOOGLE_SHEETS_ID2 },
        { name: 'userData', id: process.env.GOOGLE_SHEETS_ID3 }
      ];

      const hasGoogleCreds = process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY;
      
      if (hasGoogleCreds) {
        status.services.googleSheets = {
          credentials: 'configured',
          sheets: {}
        };
        
        let missingSheets = 0;
        googleSheetsConfigs.forEach(config => {
          if (config.id && config.id.length > 20) {
            status.services.googleSheets.sheets[config.name] = 'configured';
          } else {
            status.services.googleSheets.sheets[config.name] = 'missing id';
            missingSheets++;
          }
        });
        
        if (missingSheets > 0) {
          hasWarnings = true;
        }
      } else {
        status.services.googleSheets = 'credentials missing';
        hasWarnings = true;
      }
    } catch (error) {
      status.services.googleSheets = 'error checking';
      hasWarnings = true;
    }

    // Check Cloudinary (optional)
    try {
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        status.services.cloudinary = 'fully configured';
      } else if (process.env.CLOUDINARY_CLOUD_NAME) {
        status.services.cloudinary = 'partially configured';
      } else {
        status.services.cloudinary = 'not configured (optional)';
      }
    } catch (error) {
      status.services.cloudinary = 'error checking';
    }

    // Check Node.js version
    status.services.nodeVersion = process.version;
    
    // Check environment variables count
    const envCount = Object.keys(process.env).length;
    status.services.environmentVars = `${envCount} variables loaded`;

    // Overall status determination
    if (hasErrors) {
      status.status = 'ERROR';
      status.message = 'Critical services are not configured properly';
    } else if (hasWarnings) {
      status.status = 'WARNING';
      status.message = process.env.VERCEL ? 
        'Running on Vercel - some warnings are expected for serverless environment' : 
        'Some optional services are not configured';
    } else {
      status.status = 'OK';
      status.message = 'All systems operational';
    }

    // Add response time
    status.responseTime = `${Date.now() - startTime}ms`;

    // Add helpful diagnostics for debugging
    if (process.env.NODE_ENV === 'development') {
      status.diagnostics = {
        vercelDetected: !!process.env.VERCEL,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasGoogleCreds: !!(process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY),
        tempDirPath: process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'temp'),
        uploadsPath: process.env.VERCEL ? 'N/A (serverless)' : path.join(__dirname, '..', 'uploads')
      };
    }

    const statusCode = status.status === 'ERROR' ? 503 : 200;
    res.status(statusCode).json(status);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      message: 'Health check system encountered an error'
    });
  }
};

// Helper function to format uptime
const formatUptime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : 'Stack trace hidden in production'
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
  if (error.code === 'ENOENT') statusCode = 404;
  if (error.code === 'EACCES') statusCode = 403;
  
  res.status(statusCode).json(formattedError);
};

// Function to clear rate limit (for testing)
const clearRateLimit = () => {
  rateLimitMap.clear();
  console.log('Rate limit cleared');
};

// Health check specifically for Vercel functions
const vercelHealthCheck = (req, res) => {
  res.status(200).json({
    status: 'OK',
    platform: 'vercel',
    timestamp: new Date().toISOString(),
    message: 'Vercel function is running'
  });
};

module.exports = {
  validatePortfolioData,
  rateLimit,
  requestLogger,
  securityHeaders,
  detailedHealthCheck,
  vercelHealthCheck,
  errorHandler,
  clearRateLimit,
  formatUptime
};