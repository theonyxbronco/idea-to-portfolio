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
      
      // Log all received files for debugging
      if (req.files && req.files.length > 0) {
        console.log('Received files:');
        req.files.forEach(file => {
          console.log(`- ${file.fieldname}: ${file.originalname} (${file.size} bytes)`);
        });
      }
      
      const portfolioData = req.portfolioData;
      const files = req.files || [];
      
      // Check if this is a continuation request
      const isContinuation = req.body.continueGeneration === 'true';
      const partialHtml = req.body.partialHtml;

      if (isContinuation) {
        console.log('This is a continuation request');
        console.log('Partial HTML length:', partialHtml?.length || 0);
      }

      // Process uploaded images with IMPROVED categorization
      console.log('Processing uploaded images...');
      const processedImages = {
        process: [],
        final: [],
        moodboard: []
      };
      
      if (files.length > 0) {
        // IMPROVED: Categorize files based on field names
        const categorizeFile = (file) => {
          const fieldName = file.fieldname || '';
          const originalName = file.originalname || '';
          
          console.log(`Categorizing file: ${fieldName} -> ${originalName}`);
          
          // Check for moodboard images
          if (fieldName.includes('moodboard') || originalName.includes('moodboard')) {
            console.log('  -> Categorized as MOODBOARD');
            return 'moodboard';
          } 
          // Check for final product images
          else if (fieldName.includes('final') || originalName.includes('final')) {
            console.log('  -> Categorized as FINAL');
            return 'final';
          } 
          // Check for process images
          else if (fieldName.includes('process') || originalName.includes('process')) {
            console.log('  -> Categorized as PROCESS');
            return 'process';
          } 
          // Default fallback
          else {
            console.log('  -> Categorized as PROCESS (default)');
            return 'process'; // Default to process images
          }
        };
        
        // Group files by category
        const filesByCategory = { process: [], final: [], moodboard: [] };
        files.forEach(file => {
          const category = categorizeFile(file);
          filesByCategory[category].push(file);
        });
        
        console.log('Files by category:');
        console.log(`- Moodboard: ${filesByCategory.moodboard.length} files`);
        console.log(`- Process: ${filesByCategory.process.length} files`);
        console.log(`- Final: ${filesByCategory.final.length} files`);
        
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
              
              console.log(`Successfully processed ${result.results.length} ${category} images`);
              
              if (result.errors.length > 0) {
                console.warn(`${category} image errors:`, result.errors);
              }
            } catch (error) {
              console.warn(`Could not process some ${category} images:`, error.message);
            }
          }
        }
      }

      console.log('Image processing completed. Generating AI prompt...');
      console.log('Processed images summary:', {
        moodboard: processedImages.moodboard.length,
        process: processedImages.process.length,
        final: processedImages.final.length
      });

      let prompt;
      if (isContinuation && partialHtml) {
        console.log('Generating continuation prompt...');
        prompt = htmlValidator.generateContinuationPrompt(partialHtml, portfolioData);
      } else {
        // Determine design style based on user preferences
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
        console.log(`Using design style: ${mappedStyle} (from mood: ${designStyle})`);
        
        // Generate the prompt with processed images
        prompt = promptGenerator.generateStyledPrompt(portfolioData, processedImages, mappedStyle);
      }
      
      console.log('Calling Anthropic API...');
      console.log('Prompt length:', prompt.length, 'characters');
      
      // Check if API key is configured
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      
      // Call Anthropic API
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
      
      console.log('Anthropic API response received');
      
      const generatedContent = response.content[0].text;
      
      // Handle continuation vs new generation
      let cleanedHTML;
      if (isContinuation && partialHtml) {
        cleanedHTML = htmlValidator.mergeHtmlParts(partialHtml, generatedContent.trim());
        console.log('Merged continuation with partial HTML');
      } else {
        cleanedHTML = generatedContent.trim();
        
        if (cleanedHTML.startsWith('```html')) {
          cleanedHTML = cleanedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
        } else if (cleanedHTML.startsWith('```')) {
          cleanedHTML = cleanedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
        }
      }

      // Validate HTML completeness (existing code)
      const validation = htmlValidator.validateCompleteness(cleanedHTML);
      console.log('HTML Validation Result:', {
        isComplete: validation.isComplete,
        estimatedCompletion: validation.estimatedCompletion,
        issuesCount: validation.issues.length
      });

      // If HTML is incomplete, handle it (existing code)
      if (!validation.isComplete && !isContinuation && validation.canContinue) {
        console.log('HTML appears incomplete, sending to incomplete handler');
        
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

      // ===== NEW VALIDATION INTEGRATION STARTS HERE =====
      
      console.log('🔍 Starting quality validation and auto-fix...');
      
      // Run comprehensive validation
      let validatedHTML = cleanedHTML;
      let validationResults = null;
      let autoFixApplied = false;
      
      try {
        // Run quality validation
        validationResults = await qualityAnalyzer.validatePortfolio(
          cleanedHTML,
          portfolioData,
          processedImages
        );
        
        console.log('📊 Validation Results:', {
          overall: validationResults.overall.score,
          content: validationResults.content.score,
          design: validationResults.design.score,
          technical: validationResults.technical.score,
          accessibility: validationResults.accessibility.score
        });

        // Apply auto-fixes if validation score is below threshold
        const overallScore = validationResults.overall.score;
        if (overallScore < 85) {
          console.log(`⚡ Auto-fixing issues (score: ${overallScore})`);
          
          const autoFixResult = await qualityAnalyzer.applyAutoFixes(
            cleanedHTML,
            validationResults,
            portfolioData,
            processedImages
          );
          
          if (autoFixResult.success && autoFixResult.improvedHtml) {
            validatedHTML = autoFixResult.improvedHtml;
            autoFixApplied = true;
            
            console.log('✅ Auto-fixes applied:', autoFixResult.appliedFixes.length);
            
            // Re-validate after auto-fixes
            validationResults = await qualityAnalyzer.validatePortfolio(
              validatedHTML,
              portfolioData,
              processedImages
            );
            
            console.log('📈 Post-fix validation score:', validationResults.overall.score);
          }
        } else {
          console.log('✅ Portfolio passed validation without auto-fixes needed');
        }
        
      } catch (validationError) {
        console.warn('⚠️ Validation failed, proceeding without validation:', validationError.message);
        // Don't fail the entire generation if validation fails
        validationResults = {
          overall: { score: 75, status: 'unknown' },
          content: { score: 75, issues: [], suggestions: [] },
          design: { score: 75, issues: [], suggestions: [] },
          technical: { score: 75, issues: [], suggestions: [] },
          accessibility: { score: 75, issues: [], suggestions: [] },
          error: 'Validation failed but generation completed'
        };
      }
      
      // ===== VALIDATION INTEGRATION ENDS HERE =====
      
      // Validate that we have valid HTML (keep existing check)
      if (!validatedHTML.includes('<html') && !validatedHTML.includes('<!DOCTYPE')) {
        throw new Error('Generated content does not appear to be valid HTML');
      }
      
      // Create portfolio response with validation results
      const portfolioResponse = {
        html: validatedHTML, // Use the validated/fixed HTML
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
          
          // NEW: Add quality validation results
          qualityValidation: validationResults,
          autoFixApplied: autoFixApplied,
          qualityScore: validationResults?.overall?.score || 'unknown'
        }
      };
      
      console.log(`Portfolio generation completed in ${Date.now() - processingStartTime}ms`);
      if (validationResults) {
        console.log(`Quality score: ${validationResults.overall.score}/100`);
        if (autoFixApplied) {
          console.log('Auto-fixes were applied to improve quality');
        }
      }
      
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
          designStyle: isContinuation ? 'continued' : (portfolioData.stylePreferences?.mood || 'modern'),
          isContinuation: isContinuation,
          imagesProcessed: processedImages,
          
          // NEW: Include validation summary in response
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