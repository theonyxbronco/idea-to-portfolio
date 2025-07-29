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
const htmlValidator = require('./utils/htmlValidator');
const qualityAnalyzer = require('./utils/validators/qualityAnalyzer');
const { GoogleSheetsTracker } = require('./utils/googleSheets');

// Import middleware
const {
  validatePortfolioData,
  rateLimit,
  requestLogger,
  securityHeaders,
  detailedHealthCheck,
  errorHandler
} = require('./middleware/portfolioMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware setup
app.use(securityHeaders);
app.use(requestLogger);
app.use(rateLimit);

// CORS
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 50
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

// Initialize Google Sheets tracker
const sheetsTracker = new GoogleSheetsTracker({
  clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  sheetId: process.env.GOOGLE_SHEETS_ID,
  sheetName: process.env.GOOGLE_SHEETS_NAME
});

// Portfolio generation endpoint
app.post('/api/generate-portfolio', 
  upload.any(),
  validatePortfolioData,
  async (req, res) => {
    const processingStartTime = Date.now();
    let processedImageIds = [];
    
    try {
      const portfolioData = req.portfolioData;
      const files = req.files || [];
      
      const isContinuation = req.body.continueGeneration === 'true';
      const partialHtml = req.body.partialHtml;

      // Track in Google Sheets if configured
      if (sheetsTracker.initialized) {
        const userAgent = req.headers['user-agent'] || 'unknown';
        const screenSize = req.headers['sec-ch-ua-width'] || 'unknown';
        
        sheetsTracker.appendData(portfolioData, userAgent, screenSize)
          .catch(error => console.error('Google Sheets tracking failed:', error));
      }

      // Process uploaded images
      const processedImages = {
        process: [],
        final: [],
        moodboard: []
      };
      
      if (files.length > 0) {
        const categorizeFile = (file) => {
          const fieldName = file.fieldname || '';
          const originalName = file.originalname || '';
          
          if (fieldName.includes('moodboard') || originalName.includes('moodboard')) {
            return 'moodboard';
          } else if (fieldName.includes('final') || originalName.includes('final')) {
            return 'final';
          } else {
            return 'process';
          }
        };
        
        const filesByCategory = { process: [], final: [], moodboard: [] };
        files.forEach(file => {
          const category = categorizeFile(file);
          filesByCategory[category].push(file);
        });
        
        const imageProcessingPromises = [];
        
        for (const [category, categoryFiles] of Object.entries(filesByCategory)) {
          if (categoryFiles.length > 0) {
            const options = {
              moodboard: { width: 800, height: 600, quality: 85 },
              process: { width: 1200, height: 800, quality: 90 },
              final: { width: 1200, height: 800, quality: 95 }
            };
            
            imageProcessingPromises.push(
              fileProcessor.processMultipleImages(categoryFiles, options[category])
                .then(result => {
                  processedImages[category] = result.results;
                  processedImageIds.push(...result.results.map(img => img.id));
                })
                .catch(error => {
                  console.warn(`Failed to process ${category} images:`, error.message);
                })
            );
          }
        }

        await Promise.all(imageProcessingPromises);
      }

      // Generate AI prompt
      let prompt;
      if (isContinuation && partialHtml) {
        prompt = htmlValidator.generateContinuationPrompt(partialHtml, portfolioData);
      } else {
        const designStyle = portfolioData.stylePreferences?.mood?.toLowerCase() || 'modern';
        const styleMapping = {
          'creative': 'creative',
          'artistic': 'creative', 
          'playful': 'funky',
          'funky': 'funky',
          'experimental': 'funky',
          'wild': 'funky',
          'bold': 'funky',
          'professional': 'professional',
          'corporate': 'professional',
          'minimal': 'minimal',
          'clean': 'minimal',
          'elegant': 'professional',
          'sophisticated': 'professional'
        };
        
        const mappedStyle = styleMapping[designStyle] || 'modern';
        prompt = promptGenerator.generateStyledPrompt(portfolioData, processedImages, mappedStyle);
      }
      
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      const generatedContent = response.content[0].text;
      
      let cleanedHTML;
      if (isContinuation && partialHtml) {
        cleanedHTML = htmlValidator.mergeHtmlParts(partialHtml, generatedContent.trim());
      } else {
        cleanedHTML = generatedContent.trim();
        
        if (cleanedHTML.startsWith('```html')) {
          cleanedHTML = cleanedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
        } else if (cleanedHTML.startsWith('```')) {
          cleanedHTML = cleanedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
        }
      }

      const validation = htmlValidator.validateCompleteness(cleanedHTML);

      if (!validation.isComplete && !isContinuation && validation.canContinue) {
        return res.json({
          success: false,
          incomplete: true,
          partialHtml: cleanedHTML,
          completionStatus: validation,
          error: 'Generation incomplete',
          details: 'The AI response was cut off before completion. You can continue generation or start over.',
          metadata: {
            estimatedCompletion: validation.estimatedCompletion,
            issues: validation.issues,
            canContinue: validation.canContinue,
            imagesProcessed: processedImages
          }
        });
      }

      // Run quality validation and auto-fixes
      let validatedHTML = cleanedHTML;
      let validationResults = null;
      let autoFixApplied = false;
      
      try {
        validationResults = await qualityAnalyzer.validatePortfolio(
          cleanedHTML,
          portfolioData,
          processedImages
        );

        const overallScore = validationResults.overall.score;
        if (overallScore < 85) {
          const autoFixResult = await qualityAnalyzer.applyAutoFixes(
            cleanedHTML,
            validationResults,
            portfolioData,
            processedImages
          );
          
          if (autoFixResult.success && autoFixResult.improvedHtml) {
            validatedHTML = autoFixResult.improvedHtml;
            autoFixApplied = true;
            
            validationResults = await qualityAnalyzer.validatePortfolio(
              validatedHTML,
              portfolioData,
              processedImages
            );
          }
        }
        
      } catch (validationError) {
        console.warn('Validation failed, proceeding without validation:', validationError.message);
        validationResults = {
          overall: { score: 75, status: 'unknown' },
          content: { score: 75, issues: [], suggestions: [] },
          design: { score: 75, issues: [], suggestions: [] },
          technical: { score: 75, issues: [], suggestions: [] },
          accessibility: { score: 75, issues: [], suggestions: [] },
          error: 'Validation failed but generation completed'
        };
      }
      
      if (!validatedHTML.includes('<html') && !validatedHTML.includes('<!DOCTYPE')) {
        throw new Error('Generated content does not appear to be valid HTML');
      }
      
      const portfolioResponse = {
        html: validatedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          description: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - processingStartTime,
          designStyle: isContinuation ? 'continued' : (portfolioData.stylePreferences?.mood || 'modern'),
          imagesProcessed: {
            process: processedImages.process.length,
            final: processedImages.final.length,
            moodboard: processedImages.moodboard.length
          },
          isContinuation: isContinuation,
          validationResult: validation,
          processedImageDetails: processedImages,
          qualityValidation: validationResults,
          autoFixApplied: autoFixApplied,
          qualityScore: validationResults?.overall?.score || 'unknown'
        }
      };
      
      // Cleanup temp files after 1 hour
      setTimeout(() => {
        fileProcessor.cleanupTempFiles(processedImageIds).catch(() => {});
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
          designStyle: isContinuation ? 'continued' : (portfolioData.stylePreferences?.mood || 'modern'),
          isContinuation: isContinuation,
          imagesProcessed: processedImages,
          validation: {
            overallScore: validationResults?.overall?.score || 'unknown',
            autoFixApplied: autoFixApplied,
            issueCount: validationResults ? 
              validationResults.content.issues.length + 
              validationResults.design.issues.length + 
              validationResults.technical.issues.length + 
              validationResults.accessibility.issues.length : 0,
            status: validationResults?.overall?.status || 'unknown'
          }
        }
      });
      
    } catch (error) {
      console.error('Portfolio generation error:', error);
      
      if (processedImageIds.length > 0) {
        fileProcessor.cleanupTempFiles(processedImageIds).catch(() => {});
      }
      
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
      'GET /api/info': 'API information'
    },
    limits: {
      maxFileSize: '10MB',
      maxFiles: 50,
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'WebP']
    },
    designStyles: ['professional', 'creative', 'minimal', 'funky']
  });
});

// Error handling middleware
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
  
  // Verify upload directories exist
  const uploadDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads', 'processed'),
    path.join(__dirname, 'uploads', 'temp')
  ];

  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Verify required environment variables
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY not set! Portfolio generation will fail.');
  }
});

module.exports = app;