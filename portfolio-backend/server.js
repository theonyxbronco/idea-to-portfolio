const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// Import utilities
const fileProcessor = require('./utils/fileProcessor');
const promptGenerator = require('./utils/promptGenerator');

// Import middleware
const {
  validatePortfolioData,
  rateLimit,
  requestLogger,
  securityHeaders,
  detailedHealthCheck,
  errorHandler,
  clearRateLimit
} = require('./middleware/portfolioMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Apply security headers first
app.use(securityHeaders);

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(rateLimit);

// CORS - Updated for frontend connection
app.use(cors({
  origin: [
    'http://localhost:8080',  // Your actual frontend port
    'http://localhost:5173',  // Vite default port
    'http://localhost:3000',  // Alternative React port
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Add pre-flight OPTIONS handling
app.options('*', cors());
// Add pre-flight OPTIONS handling
app.options('*', cors());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 50 // Maximum number of files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        details: 'Maximum file size is 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        details: 'Maximum 50 files allowed'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      details: 'Only JPEG, PNG, GIF, and WebP images are allowed'
    });
  }
  
  next(error);
};

// Main portfolio generation endpoint
app.post('/api/generate-portfolio', 
  upload.any(),
  handleMulterError,
  validatePortfolioData,
  async (req, res) => {
    const processingStartTime = Date.now();
    let processedImageIds = [];
    
    try {
      console.log('Starting portfolio generation for:', req.portfolioData.personalInfo.name);
      console.log('Files received:', req.files?.length || 0);
      
      const portfolioData = req.portfolioData;
      const files = req.files || [];
      
      // Process uploaded images
      console.log('Processing uploaded images...');
      const processedImages = {
        process: [],
        final: [],
        moodboard: []
      };
      
      // Categorize files based on field names or original names
      const categorizeFile = (file) => {
        const fieldName = file.fieldname || '';
        const originalName = file.originalname || '';
        
        if (fieldName.includes('moodboard') || originalName.includes('moodboard')) {
          return 'moodboard';
        } else if (fieldName.includes('final') || originalName.includes('final')) {
          return 'final';
        } else if (fieldName.includes('process') || originalName.includes('process')) {
          return 'process';
        } else {
          // Default categorization based on field name patterns
          if (fieldName.includes('mood')) return 'moodboard';
          if (fieldName.includes('final')) return 'final';
          return 'process'; // Default to process images
        }
      };
      
      // Group files by category
      const filesByCategory = { process: [], final: [], moodboard: [] };
      files.forEach(file => {
        const category = categorizeFile(file);
        filesByCategory[category].push(file);
      });
      
      // Process each category
      for (const [category, categoryFiles] of Object.entries(filesByCategory)) {
        if (categoryFiles.length > 0) {
          console.log(`Processing ${categoryFiles.length} ${category} images...`);
          try {
            const options = {
              moodboard: { width: 800, height: 600, quality: 85 },
              process: { width: 1200, height: 800, quality: 90 },
              final: { width: 1200, height: 800, quality: 95 }
            };
            
            const result = await fileProcessor.processMultipleImages(categoryFiles, options[category]);
            processedImages[category] = result.results;
            processedImageIds.push(...result.results.map(img => img.id));
            
            if (result.errors.length > 0) {
              console.warn(`${category} image errors:`, result.errors);
            }
          } catch (error) {
            console.warn(`Could not process some ${category} images:`, error.message);
          }
        }
      }
      
      console.log('Image processing completed. Generating AI prompt...');
      
      // Determine design style based on user preferences - UPDATED WITH FUNKY MAPPING
      const designStyle = portfolioData.stylePreferences?.mood?.toLowerCase() || 'modern';
      const styleMapping = {
        'creative': 'creative',
        'artistic': 'creative', 
        'playful': 'funky',        // Map playful to funky
        'funky': 'funky',          // Direct funky mapping
        'experimental': 'funky',   // Experimental to funky
        'wild': 'funky',           // Wild to funky
        'bold': 'funky',           // Bold to funky
        'professional': 'professional',
        'corporate': 'professional',
        'minimal': 'minimal',
        'clean': 'minimal',
        'elegant': 'professional',
        'sophisticated': 'professional'
      };
      
      const mappedStyle = styleMapping[designStyle] || 'modern';
      console.log(`Using design style: ${mappedStyle} (from mood: ${designStyle})`);
      
      // Generate the prompt
      const prompt = promptGenerator.generateStyledPrompt(portfolioData, processedImages, mappedStyle);
      
      console.log('Calling Anthropic API...');
      console.log('Prompt length:', prompt.length, 'characters');
      
      // Check if API key is configured
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      
      // Call Anthropic API
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 8000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      console.log('Anthropic API response received');
      
      const generatedContent = response.content[0].text;
      
      // Clean and validate the generated HTML
      let cleanedHTML = generatedContent.trim();
      
      // Remove any markdown code blocks if present
      if (cleanedHTML.startsWith('```html')) {
        cleanedHTML = cleanedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
      } else if (cleanedHTML.startsWith('```')) {
        cleanedHTML = cleanedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      // Validate that we have valid HTML
      if (!cleanedHTML.includes('<html') && !cleanedHTML.includes('<!DOCTYPE')) {
        throw new Error('Generated content does not appear to be valid HTML');
      }
      
      // Create portfolio response
      const portfolioResponse = {
        html: cleanedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          description: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - processingStartTime,
          designStyle: mappedStyle,
          imagesProcessed: {
            process: processedImages.process.length,
            final: processedImages.final.length,
            moodboard: processedImages.moodboard.length
          }
        }
      };
      
      console.log(`Portfolio generation completed in ${Date.now() - processingStartTime}ms`);
      console.log(`Design style used: ${mappedStyle}`);
      
      // Schedule cleanup of processed images (after 1 hour)
      setTimeout(() => {
        fileProcessor.cleanupTempFiles(processedImageIds).catch(console.error);
      }, 60 * 60 * 1000);
      
      res.json({
        success: true,
        portfolio: portfolioResponse,
        metadata: {
          generatedAt: new Date().toISOString(),
          userInfo: {
            name: portfolioData.personalInfo.name,
            title: portfolioData.personalInfo.title
          },
          processingTime: Date.now() - processingStartTime,
          designStyle: mappedStyle
        }
      });
      
    } catch (error) {
      console.error('Portfolio generation error:', error);
      
      // Cleanup processed images on error
      if (processedImageIds.length > 0) {
        fileProcessor.cleanupTempFiles(processedImageIds).catch(console.error);
      }
      
      // Determine error type and send appropriate response
      if (error.message && error.message.includes('API key')) {
        return res.status(500).json({
          success: false,
          error: 'API Configuration Error',
          details: 'Anthropic API key is not configured properly'
        });
      }
      
      if (error.message && error.message.includes('rate limit')) {
        return res.status(429).json({
          success: false,
          error: 'Rate Limit Exceeded',
          details: 'API rate limit exceeded. Please try again later.'
        });
      }
      
      if (error.message && error.message.includes('Invalid file')) {
        return res.status(400).json({
          success: false,
          error: 'File Processing Error',
          details: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Portfolio Generation Failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    }
  }
);

// Health check endpoint
app.get('/api/health', detailedHealthCheck);

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Portfolio Generator API',
    version: '1.0.0',
    description: 'AI-powered portfolio generation using Anthropic Claude',
    endpoints: {
      'POST /api/generate-portfolio': 'Generate portfolio from user data and images',
      'GET /api/health': 'Health check endpoint',
      'GET /api/info': 'API information',
      'POST /api/reset-rate-limit': 'Reset rate limit (development only)'
    },
    limits: {
      maxFileSize: '10MB',
      maxFiles: 50,
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'WebP']
    },
    designStyles: ['professional', 'creative', 'minimal', 'funky']
  });
});

// Reset rate limit endpoint (for testing)
app.post('/api/reset-rate-limit', (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    clearRateLimit();
    res.json({
      success: true,
      message: 'Rate limit reset successfully'
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Not Found'
    });
  }
});

// Use the error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    details: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Portfolio Generator API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API info: http://localhost:${PORT}/api/info`);
  
  // Verify required environment variables
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  WARNING: ANTHROPIC_API_KEY not set! Portfolio generation will fail.');
    console.warn('   Add your Anthropic API key to the .env file');
  } else {
    console.log('✅ Anthropic API key configured');
  }
});

module.exports = app;