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
const imageParser = require('./utils/imageParser'); // NEW: Simplified image analysis
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

// 🚀 ENHANCED PORTFOLIO GENERATION ENDPOINT WITH IMAGE ANALYSIS
app.post('/api/generate-portfolio', 
  upload.any(),
  validatePortfolioData,
  async (req, res) => {
    const processingStartTime = Date.now();
    let processedImageIds = [];
    let imageAnalysisResults = {};
    
    try {
      const portfolioData = req.portfolioData;
      const files = req.files || [];
      
      const isContinuation = req.body.continueGeneration === 'true';
      const partialHtml = req.body.partialHtml;

      console.log(`🎨 Starting portfolio generation for ${portfolioData.personalInfo.name}...`);
      if (files.length > 0) {
        console.log(`📸 Processing ${files.length} uploaded images with AI analysis...`);
      }

      // Track in Google Sheets if configured
      if (sheetsTracker.initialized) {
        const userAgent = req.headers['user-agent'] || 'unknown';
        const screenSize = req.headers['sec-ch-ua-width'] || 'unknown';
        
        sheetsTracker.appendData(portfolioData, userAgent, screenSize)
          .catch(error => console.error('Google Sheets tracking failed:', error));
      }

      // 🎨 ENHANCED IMAGE PROCESSING WITH COMPUTER VISION ANALYSIS
      const processedImages = {
        process: [],
        final: [],
        moodboard: []
      };
      
      if (files.length > 0) {
        console.log(`🖼️ Processing and analyzing ${files.length} images with computer vision...`);
        
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
        
        // Process each category of images
        for (const [category, categoryFiles] of Object.entries(filesByCategory)) {
          if (categoryFiles.length > 0) {
            console.log(`📸 Processing ${categoryFiles.length} ${category} images...`);
            
            const options = {
              moodboard: { width: 800, height: 600, quality: 85 },
              process: { width: 1200, height: 800, quality: 90 },
              final: { width: 1200, height: 800, quality: 95 }
            };
            
            imageProcessingPromises.push(
              fileProcessor.processMultipleImages(categoryFiles, options[category])
                .then(async (result) => {
                  processedImages[category] = result.results;
                  processedImageIds.push(...result.results.map(img => img.id));
                  
                  // 🔍 COMPUTER VISION ANALYSIS using simplified parser
                  if (result.results.length > 0 && !isContinuation) {
                    console.log(`🧠 Running AI analysis on ${result.results.length} ${category} images...`);
                    
                    try {
                      const imagePaths = result.results.map(img => img.path);
                      const analysisResult = await imageParser.analyzeImageSet(imagePaths, category);
                      imageAnalysisResults[category] = analysisResult;
                      
                      console.log(`✅ ${category} analysis complete: ${analysisResult.combinedStyle?.mood || 'unknown'} style detected with ${analysisResult.combinedColors?.palette?.length || 0} colors`);
                    } catch (analysisError) {
                      console.warn(`⚠️ ${category} analysis failed:`, analysisError.message);
                      // Continue without analysis for this category
                    }
                  }
                })
                .catch(error => {
                  console.warn(`Failed to process ${category} images:`, error.message);
                })
            );
          }
        }

        await Promise.all(imageProcessingPromises);
      }

      // 🤖 GENERATE AI PROMPT WITH COMPUTER VISION INSIGHTS
      let anthropicMessages;
      if (isContinuation && partialHtml) {
        console.log('🔄 Continuing previous generation...');
        // For continuation, use text-only prompt
        const continuationPrompt = htmlValidator.generateContinuationPrompt(partialHtml, portfolioData);
        anthropicMessages = [
          {
            role: 'user',
            content: continuationPrompt
          }
        ];
      } else {
        console.log('🎨 Generating Anthropic messages with direct image analysis...');
        
        // Use the enhanced prompt generator with direct image support
        const designStyle = portfolioData.stylePreferences?.mood?.toLowerCase() || 'modern';
        
        try {
          // NEW: Generate messages with images for Claude to analyze directly
          anthropicMessages = await promptGenerator.generateAnthropicMessages(portfolioData, processedImages, designStyle);
          console.log(`📤 Generated message with ${anthropicMessages[0].content.length} content pieces`);
          
          // Count images being sent to Claude
          const imageCount = anthropicMessages[0].content.filter(c => c.type === 'image').length;
          if (imageCount > 0) {
            console.log(`👁️ Sending ${imageCount} images directly to Claude for visual analysis`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to generate image messages, falling back to text-only:', error.message);
          // Fallback to text-only prompt
          const textPrompt = await promptGenerator.generateStyledPrompt(portfolioData, processedImages, designStyle);
          anthropicMessages = [
            {
              role: 'user',
              content: textPrompt
            }
          ];
        }
        
        // Log analysis summary if available
        if (Object.keys(imageAnalysisResults).length > 0) {
          console.log('🎯 Computer vision analysis summary:');
          Object.entries(imageAnalysisResults).forEach(([category, analysis]) => {
            const mood = analysis.combinedStyle?.mood || 'unknown';
            const colorCount = analysis.combinedColors?.palette?.length || 0;
            const confidence = Math.round((analysis.combinedStyle?.confidence || 0) * 100);
            console.log(`  📂 ${category}: ${mood} style (${confidence}% confidence), ${colorCount} colors detected`);
          });
        }
      }
      
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      
      // 🚀 SEND TO ANTHROPIC WITH IMAGES + ENHANCED PROMPT
      console.log('🚀 Sending request to Anthropic Claude with vision capabilities...');
      
      // Check if we're sending images
      const hasImages = anthropicMessages[0].content.some && 
                       anthropicMessages[0].content.some(c => c.type === 'image');
      
      if (hasImages) {
        console.log('👁️ Using Claude\'s vision capabilities for direct image analysis');
      } else {
        console.log('📝 Using text-only generation');
      }
      
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        temperature: 0.7,
        messages: anthropicMessages
      });
      
      const generatedContent = response.content[0].text;
      console.log(`✅ Received ${generatedContent.length} characters from Claude`);
      
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
            imagesProcessed: processedImages,
            imageAnalysisResults: imageAnalysisResults
          }
        });
      }

      // Run quality validation and auto-fixes
      let validatedHTML = cleanedHTML;
      let validationResults = null;
      let autoFixApplied = false;
      
      try {
        console.log('🔍 Running quality validation...');
        validationResults = await qualityAnalyzer.validatePortfolio(
          cleanedHTML,
          portfolioData,
          processedImages
        );

        const overallScore = validationResults.overall.score;
        console.log(`📊 Quality score: ${overallScore}/100`);
        
        if (overallScore < 85) {
          console.log('🔧 Applying automatic fixes...');
          const autoFixResult = await qualityAnalyzer.applyAutoFixes(
            cleanedHTML,
            validationResults,
            portfolioData,
            processedImages
          );
          
          if (autoFixResult.success && autoFixResult.improvedHtml) {
            validatedHTML = autoFixResult.improvedHtml;
            autoFixApplied = true;
            console.log(`✅ Applied ${autoFixResult.appliedFixes.length} automatic fixes`);
            
            // Re-validate after fixes
            validationResults = await qualityAnalyzer.validatePortfolio(
              validatedHTML,
              portfolioData,
              processedImages
            );
            console.log(`📈 Improved quality score: ${validationResults.overall.score}/100`);
          }
        }
        
      } catch (validationError) {
        console.warn('⚠️ Validation failed, proceeding without validation:', validationError.message);
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
      
      // 📊 BUILD COMPREHENSIVE RESPONSE WITH COMPUTER VISION DATA
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
          qualityScore: validationResults?.overall?.score || 'unknown',
          // 🎨 NEW: Computer Vision Analysis Results
          computerVisionAnalysis: imageAnalysisResults,
          aiPromptEnhanced: Object.keys(imageAnalysisResults).length > 0,
          analysisMethod: 'sharp-based', // Indicates we're using simplified analysis
          visionCapabilitiesUsed: hasImages // Indicates if we used Claude's vision capabilities
        }
      };
      
      // Cleanup temp files after 1 hour
      setTimeout(() => {
        fileProcessor.cleanupTempFiles(processedImageIds).catch(() => {});
      }, 60 * 60 * 1000);
      
      // 🎉 SUCCESS RESPONSE WITH COMPUTER VISION INSIGHTS
      const processingTimeMs = Date.now() - processingStartTime;
      console.log(`✅ Portfolio generated successfully in ${processingTimeMs}ms`);
      
      res.json({
        success: true,
        portfolio: portfolioResponse,
        metadata: {
          generatedAt: new Date().toISOString(),
          userInfo: {
            name: portfolioData.personalInfo.name,
            title: portfolioData.personalInfo.title
          },
          processingTime: processingTimeMs,
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
          },
          // 🧠 NEW: Computer Vision Analysis Summary
          aiAnalysis: {
            enabled: Object.keys(imageAnalysisResults).length > 0,
            method: 'sharp-based',
            visionCapabilitiesUsed: hasImages,
            categoriesAnalyzed: Object.keys(imageAnalysisResults),
            detectedStyles: Object.values(imageAnalysisResults).map(analysis => analysis.combinedStyle?.mood).filter(Boolean),
            totalColorsExtracted: Object.values(imageAnalysisResults).reduce((total, analysis) => 
              total + (analysis.combinedColors?.palette?.length || 0), 0),
            analysisConfidence: Math.round(
              Object.values(imageAnalysisResults).reduce((avg, analysis) => 
                avg + (analysis.combinedStyle?.confidence || 0), 0) / 
              Math.max(Object.keys(imageAnalysisResults).length, 1) * 100
            ),
            detectedColors: Object.values(imageAnalysisResults).length > 0 ? 
              Object.values(imageAnalysisResults)[0].combinedColors?.palette?.slice(0, 5) || [] : []
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Portfolio generation error:', error);
      
      // Cleanup any processed images on error
      if (processedImageIds.length > 0) {
        fileProcessor.cleanupTempFiles(processedImageIds).catch(() => {});
      }
      
      // Handle specific error types
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
      
      // Generic error response
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

// Enhanced API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Portfolio Generator API',
    version: '1.0.0',
    description: 'AI-powered portfolio generation using Anthropic Claude with computer vision image analysis',
    endpoints: {
      'POST /api/generate-portfolio': 'Generate portfolio from user data and images with AI analysis',
      'GET /api/health': 'Health check endpoint',
      'GET /api/info': 'API information'
    },
    features: {
      computerVision: 'Sharp-based image analysis for color extraction and style detection',
      aiGeneration: 'Anthropic Claude with enhanced prompts from image analysis',
      qualityValidation: 'Comprehensive HTML, design, and accessibility validation',
      autoFixes: 'Automatic fixes for common issues',
      responsiveDesign: 'Mobile-first responsive portfolio generation'
    },
    limits: {
      maxFileSize: '10MB',
      maxFiles: 50,
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'WebP']
    },
    designStyles: ['professional', 'creative', 'minimal', 'playful', 'dramatic'],
    imageAnalysis: {
      method: 'sharp-based',
      capabilities: ['color extraction', 'style detection', 'metadata analysis', 'filename intelligence'],
      futureFeatures: ['Google Vision API', 'AWS Rekognition', 'object detection']
    }
  });
});

// Test endpoint for image analysis
app.get('/api/test-image-analysis', async (req, res) => {
  try {
    // Test the simplified image parser
    const testResult = {
      status: 'Image analysis system ready',
      method: 'sharp-based',
      capabilities: [
        'Color palette extraction',
        'Brightness analysis',
        'Style detection from filenames',
        'Metadata extraction',
        'Combined multi-image analysis'
      ],
      sampleAnalysis: await imageParser.getFallbackAnalysis('sample-creative-design.jpg')
    };
    
    res.json(testResult);
  } catch (error) {
    res.status(500).json({
      status: 'Image analysis test failed',
      error: error.message
    });
  }
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
  console.log(`🚀 Portfolio Generator API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 API info: http://localhost:${PORT}/api/info`);
  console.log(`🧪 Test image analysis: http://localhost:${PORT}/api/test-image-analysis`);
  
  // Verify upload directories exist
  const uploadDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads', 'processed'),
    path.join(__dirname, 'uploads', 'temp')
  ];

  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Verify required environment variables
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  WARNING: ANTHROPIC_API_KEY not set! Portfolio generation will fail.');
  } else {
    console.log('✅ Anthropic API key configured');
  }

  // Check image analysis capabilities
  if (process.env.ENABLE_IMAGE_ANALYSIS === 'true') {
    console.log('🎨 Image analysis enabled (Sharp-based)');
  } else {
    console.log('📸 Image analysis disabled - using basic prompt generation');
  }

  console.log('🎯 Ready to generate AI-powered portfolios with image analysis!');
});

module.exports = app;