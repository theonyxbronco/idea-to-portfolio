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
app.use('/uploads', (req, res, next) => {
  console.log(`📸 Image request: ${req.path}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, 'uploads')));

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

const sheetsTracker = new GoogleSheetsTracker({
  clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  sheetId: process.env.GOOGLE_SHEETS_ID,
  sheetName: process.env.GOOGLE_SHEETS_NAME
});

// Optional: Verify connection on startup
if (sheetsTracker.initialized) {
  sheetsTracker.verifyConnection()
    .then(success => {
      if (success) {
        console.log('✅ Verified Google Sheets connection');
      } else {
        console.warn('⚠️ Google Sheets connection verification failed');
      }
    });
}

// In-memory storage for visual editor sessions
const editorSessions = new Map();

// ============= VISUAL EDITOR ENDPOINTS =============

// Create or get editor session
app.post('/api/visual-editor/session', async (req, res) => {
  try {
    const { portfolioData, htmlContent, sessionId } = req.body;
    
    const session = {
      id: sessionId || Date.now().toString(),
      portfolioData,
      currentHtml: htmlContent,
      history: [htmlContent],
      historyIndex: 0,
      lastModified: new Date(),
      autoSaveEnabled: true
    };

    editorSessions.set(session.id, session);

    console.log(`📝 Created editor session: ${session.id}`);

    res.json({
      success: true,
      sessionId: session.id,
      session: {
        id: session.id,
        lastModified: session.lastModified,
        historyLength: session.history.length,
        currentIndex: session.historyIndex
      }
    });

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create editor session',
      details: error.message
    });
  }
});

// Get session data
app.get('/api/visual-editor/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = editorSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        currentHtml: session.currentHtml,
        portfolioData: session.portfolioData,
        lastModified: session.lastModified,
        historyLength: session.history.length,
        currentIndex: session.historyIndex,
        canUndo: session.historyIndex > 0,
        canRedo: session.historyIndex < session.history.length - 1
      }
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session',
      details: error.message
    });
  }
});

// Auto-save endpoint
app.post('/api/visual-editor/auto-save', async (req, res) => {
  try {
    const { sessionId, htmlContent, changeDescription } = req.body;
    
    if (!sessionId || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and HTML content are required'
      });
    }

    const session = editorSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Update session with auto-save
    session.currentHtml = htmlContent;
    session.lastModified = new Date();
    
    // Optional: Add to history if significant change
    if (changeDescription && changeDescription !== 'auto-save') {
      const newHistory = session.history.slice(0, session.historyIndex + 1);
      newHistory.push(htmlContent);
      session.history = newHistory;
      session.historyIndex = newHistory.length - 1;
    }

    console.log(`💾 Auto-saved session: ${sessionId}`);

    res.json({
      success: true,
      message: 'Auto-save successful',
      timestamp: session.lastModified,
      historyLength: session.history.length
    });

  } catch (error) {
    console.error('Auto-save error:', error);
    res.status(500).json({
      success: false,
      error: 'Auto-save failed',
      details: error.message
    });
  }
});

// Manual save with history
app.post('/api/visual-editor/save', async (req, res) => {
  try {
    const { sessionId, htmlContent, changeDescription } = req.body;
    
    const session = editorSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Add to history
    const newHistory = session.history.slice(0, session.historyIndex + 1);
    newHistory.push(htmlContent);
    
    session.currentHtml = htmlContent;
    session.history = newHistory;
    session.historyIndex = newHistory.length - 1;
    session.lastModified = new Date();

    console.log(`💾 Manual save session: ${sessionId} - ${changeDescription || 'No description'}`);

    res.json({
      success: true,
      message: 'Save successful',
      timestamp: session.lastModified,
      historyLength: session.history.length,
      canUndo: session.historyIndex > 0,
      canRedo: false
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      success: false,
      error: 'Save failed',
      details: error.message
    });
  }
});

// Undo/Redo endpoints
app.post('/api/visual-editor/undo/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = editorSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.historyIndex <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Nothing to undo'
      });
    }

    session.historyIndex--;
    session.currentHtml = session.history[session.historyIndex];
    session.lastModified = new Date();

    res.json({
      success: true,
      currentHtml: session.currentHtml,
      historyIndex: session.historyIndex,
      canUndo: session.historyIndex > 0,
      canRedo: session.historyIndex < session.history.length - 1
    });

  } catch (error) {
    console.error('Undo error:', error);
    res.status(500).json({
      success: false,
      error: 'Undo failed',
      details: error.message
    });
  }
});

app.post('/api/visual-editor/redo/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = editorSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.historyIndex >= session.history.length - 1) {
      return res.status(400).json({
        success: false,
        error: 'Nothing to redo'
      });
    }

    session.historyIndex++;
    session.currentHtml = session.history[session.historyIndex];
    session.lastModified = new Date();

    res.json({
      success: true,
      currentHtml: session.currentHtml,
      historyIndex: session.historyIndex,
      canUndo: session.historyIndex > 0,
      canRedo: session.historyIndex < session.history.length - 1
    });

  } catch (error) {
    console.error('Redo error:', error);
    res.status(500).json({
      success: false,
      error: 'Redo failed',
      details: error.message
    });
  }
});

// Real-time validation endpoint
app.post('/api/visual-editor/validate', async (req, res) => {
  try {
    const { sessionId, htmlContent, validationType = 'full' } = req.body;
    
    const session = editorSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    console.log(`🔍 Running ${validationType} validation for session: ${sessionId}`);

    // Run quality validation
    const validationResults = await qualityAnalyzer.validatePortfolio(
      htmlContent,
      session.portfolioData,
      {} // processedImages - you might want to store this in session too
    );

    // Check if auto-fixes should be applied
    let fixedHtml = htmlContent;
    let autoFixesApplied = [];

    if (validationResults.overall.score < 85) {
      console.log(`⚡ Applying auto-fixes (score: ${validationResults.overall.score})`);
      
      const autoFixResult = await qualityAnalyzer.applyAutoFixes(
        htmlContent,
        validationResults,
        session.portfolioData,
        {}
      );

      if (autoFixResult.success && autoFixResult.improvedHtml) {
        fixedHtml = autoFixResult.improvedHtml;
        autoFixesApplied = autoFixResult.appliedFixes;
        
        // Re-validate after fixes
        validationResults.postFixValidation = await qualityAnalyzer.validatePortfolio(
          fixedHtml,
          session.portfolioData,
          {}
        );
      }
    }

    res.json({
      success: true,
      validation: validationResults,
      autoFixesApplied,
      fixedHtml: fixedHtml !== htmlContent ? fixedHtml : null,
      recommendations: validationResults.suggestions?.slice(0, 5) || []
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      details: error.message
    });
  }
});

// HTML parsing endpoint for elements extraction
app.post('/api/visual-editor/parse-html', async (req, res) => {
  try {
    const { htmlContent } = req.body;
    
    if (!htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'HTML content is required'
      });
    }

    // Simple HTML parsing - you can enhance this
    const elements = [];
    let elementId = 1;

    // Extract text elements
    const textMatches = htmlContent.match(/<(p|span|div)[^>]*>(.*?)<\/\1>/gi);
    if (textMatches) {
      textMatches.forEach((match, index) => {
        const tagMatch = match.match(/<(\w+)/);
        const contentMatch = match.match(/>(.*?)<\//);
        
        if (tagMatch && contentMatch) {
          elements.push({
            id: `text_${elementId++}`,
            type: 'text',
            tagName: tagMatch[1],
            content: contentMatch[1].replace(/<[^>]*>/g, ''), // Strip inner HTML
            styles: {},
            attributes: {}
          });
        }
      });
    }

    // Extract headers
    const headerMatches = htmlContent.match(/<(h[1-6])[^>]*>(.*?)<\/\1>/gi);
    if (headerMatches) {
      headerMatches.forEach((match, index) => {
        const tagMatch = match.match(/<(\w+)/);
        const contentMatch = match.match(/>(.*?)<\//);
        
        if (tagMatch && contentMatch) {
          elements.push({
            id: `header_${elementId++}`,
            type: 'header',
            tagName: tagMatch[1],
            content: contentMatch[1].replace(/<[^>]*>/g, ''),
            styles: {},
            attributes: {}
          });
        }
      });
    }

    // Extract buttons
    const buttonMatches = htmlContent.match(/<button[^>]*>(.*?)<\/button>/gi);
    if (buttonMatches) {
      buttonMatches.forEach((match, index) => {
        const contentMatch = match.match(/>(.*?)<\//);
        
        if (contentMatch) {
          elements.push({
            id: `button_${elementId++}`,
            type: 'button',
            tagName: 'button',
            content: contentMatch[1].replace(/<[^>]*>/g, ''),
            styles: {},
            attributes: {}
          });
        }
      });
    }

    res.json({
      success: true,
      elements,
      totalElements: elements.length
    });

  } catch (error) {
    console.error('HTML parsing error:', error);
    res.status(500).json({
      success: false,
      error: 'HTML parsing failed',
      details: error.message
    });
  }
});

// Element modification endpoint
app.patch('/api/visual-editor/element/:sessionId/:elementId', async (req, res) => {
  try {
    const { sessionId, elementId } = req.params;
    const { content, styles, attributes } = req.body;
    
    const session = editorSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // This is a simplified implementation
    // In practice, you'd want more sophisticated HTML manipulation
    let modifiedHtml = session.currentHtml;
    
    // Simple find and replace for content changes
    if (content !== undefined) {
      // This is a basic implementation - you'd want proper HTML parsing
      const regex = new RegExp(`(id="${elementId}"[^>]*>)([^<]*)(</\\w+>)`, 'gi');
      modifiedHtml = modifiedHtml.replace(regex, `$1${content}$3`);
    }

    // Update session
    session.currentHtml = modifiedHtml;
    session.lastModified = new Date();

    res.json({
      success: true,
      message: 'Element modified successfully',
      modifiedHtml
    });

  } catch (error) {
    console.error('Element modification error:', error);
    res.status(500).json({
      success: false,
      error: 'Element modification failed',
      details: error.message
    });
  }
});

// Clean up old sessions (run periodically)
setInterval(() => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  for (const [sessionId, session] of editorSessions.entries()) {
    if (session.lastModified < oneHourAgo) {
      editorSessions.delete(sessionId);
      console.log(`🧹 Cleaned up old session: ${sessionId}`);
    }
  }
}, 30 * 60 * 1000); // Run every 30 minutes

// ============= EXISTING ENDPOINTS =============

// Original portfolio generation endpoint
app.post('/api/generate-portfolio', 
  upload.any(),
  validatePortfolioData,
  async (req, res) => {
    const processingStartTime = Date.now();
    let processedImageIds = [];
    
    try {
      console.log('Starting portfolio generation for:', req.portfolioData.personalInfo.name);
      console.log('Files received:', req.files?.length || 0);
      
      const portfolioData = req.portfolioData;
      const files = req.files || [];
      
      const isContinuation = req.body.continueGeneration === 'true';
      const partialHtml = req.body.partialHtml;

      // Start Google Sheets tracking in parallel if configured
      let trackingPromise = Promise.resolve();
      if (sheetsTracker) {
        const userAgent = req.headers['user-agent'] || 'unknown';
        const screenSize = req.headers['sec-ch-ua-width'] || 'unknown';
        
        trackingPromise = sheetsTracker.appendData(portfolioData, userAgent, screenSize)
          .then(success => {
            if (success) {
              console.log('📊 Successfully tracked portfolio generation in Google Sheets');
            } else {
              console.warn('⚠️ Failed to track portfolio generation in Google Sheets');
            }
          })
          .catch(error => {
            console.error('Google Sheets tracking error:', error);
          });
      }

      // Process uploaded images
      console.log('Processing uploaded images...');
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
          } else if (fieldName.includes('process') || originalName.includes('process')) {
            return 'process';
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
            try {
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
                    console.log(`Successfully processed ${result.results.length} ${category} images`);
                  })
                  .catch(error => {
                    console.warn(`Could not process some ${category} images:`, error.message);
                  })
              );
            } catch (error) {
              console.warn(`Error setting up ${category} image processing:`, error.message);
            }
          }
        }

        // Wait for all image processing and tracking to complete
        await Promise.all([...imageProcessingPromises, trackingPromise]);
      } else {
        // If no files, just wait for tracking
        await trackingPromise;
      }

      console.log('Image processing completed. Generating AI prompt...');

      let prompt;
      if (isContinuation && partialHtml) {
        console.log('Generating continuation prompt...');
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
        console.log(`Using design style: ${mappedStyle} (from mood: ${designStyle})`);
        
        prompt = promptGenerator.generateStyledPrompt(portfolioData, processedImages, mappedStyle);
      }
      
      console.log('Calling Anthropic API...');
      
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
      
      console.log('Anthropic API response received');
      
      const generatedContent = response.content[0].text;
      
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

      const validation = htmlValidator.validateCompleteness(cleanedHTML);
      console.log('HTML Validation Result:', {
        isComplete: validation.isComplete,
        estimatedCompletion: validation.estimatedCompletion,
        issuesCount: validation.issues.length
      });

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

      // Run quality validation and auto-fixes
      console.log('🔍 Starting quality validation and auto-fix...');
      
      let validatedHTML = cleanedHTML;
      let validationResults = null;
      let autoFixApplied = false;
      
      try {
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
      
      console.log(`Portfolio generation completed in ${Date.now() - processingStartTime}ms`);
      if (validationResults) {
        console.log(`Quality score: ${validationResults.overall.score}/100`);
        if (autoFixApplied) {
          console.log('Auto-fixes were applied to improve quality');
        }
      }
      
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
        fileProcessor.cleanupTempFiles(processedImageIds).catch(console.error);
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

// **NEW HELPER FUNCTIONS to add to your server.js**

/**
 * Call Anthropic API with timeout protection and chunked approach
 */
async function callAnthropicWithTimeout(prompt, timeoutMs = 60000) {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`API request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      // Try with reduced token count first to avoid timeouts
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

      clearTimeout(timeoutId);
      resolve(response);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Check if it's a token-related error and retry with even smaller tokens
      if (error.message?.includes('tokens') || error.message?.includes('too large')) {
        console.log('Retrying with smaller token count...');
        try {
          const retryResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000, // Much smaller for retry
            temperature: 0.7,
            messages: [
              {
                role: 'user',
                content: prompt.substring(0, Math.min(prompt.length, 10000)) // Truncate prompt too
              }
            ]
          });
          resolve(retryResponse);
        } catch (retryError) {
          reject(retryError);
        }
      } else {
        reject(error);
      }
    }
  });
}

/**
 * Create a much simpler continuation prompt for timeout recovery
 */
function createSimpleContinuationPrompt(partialHtml, portfolioData) {
  return `COMPLETE THIS INCOMPLETE HTML PORTFOLIO:

${partialHtml.substring(partialHtml.length - 2000)} // Last 2000 chars only

INSTRUCTIONS:
1. Continue from where it left off
2. Add closing tags: </body></html>
3. Keep it simple and complete
4. Include: ${portfolioData.personalInfo.name} - ${portfolioData.personalInfo.title}

RETURN: Only the completion part needed to finish the HTML.`;
}

// **ADDITIONAL IMPROVEMENTS**

// Add this middleware to handle timeouts at the request level
app.use('/api/generate-portfolio', (req, res, next) => {
  // Set a generous timeout for portfolio generation
  req.setTimeout(120000); // 2 minutes
  res.setTimeout(120000);
  next();
});

// Add a simple status endpoint to check API health
app.get('/api/claude-status', async (req, res) => {
  try {
    const testResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "API working"' }]
    });
    
    res.json({
      status: 'healthy',
      response: testResponse.content[0].text,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', detailedHealthCheck);

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Portfolio Generator API',
    version: '1.0.0',
    description: 'AI-powered portfolio generation using Anthropic Claude with Visual Editor',
    endpoints: {
      'POST /api/generate-portfolio': 'Generate portfolio from user data and images',
      'POST /api/visual-editor/session': 'Create or get editor session',
      'GET /api/visual-editor/session/:sessionId': 'Get session data',
      'POST /api/visual-editor/auto-save': 'Auto-save changes',
      'POST /api/visual-editor/save': 'Manual save with history',
      'POST /api/visual-editor/undo/:sessionId': 'Undo changes',
      'POST /api/visual-editor/redo/:sessionId': 'Redo changes',
      'POST /api/visual-editor/validate': 'Real-time validation',
      'POST /api/visual-editor/parse-html': 'Parse HTML to extract elements',
      'PATCH /api/visual-editor/element/:sessionId/:elementId': 'Modify element',
      'GET /api/health': 'Health check endpoint',
      'GET /api/info': 'API information',
      'POST /api/reset-rate-limit': 'Reset rate limit (development only)'
    },
    limits: {
      maxFileSize: '10MB',
      maxFiles: 50,
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'WebP']
    },
    designStyles: ['professional', 'creative', 'minimal', 'funky'],
    visualEditor: {
      sessionTimeout: '1 hour',
      autoSaveInterval: '5 seconds',
      historyLimit: 50,
      realTimeValidation: true
    }
  });
});

// Test endpoint to list available images
app.get('/api/test-images', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads', 'processed');
  
  try {
    if (!fs.existsSync(uploadsPath)) {
      return res.json({
        success: false,
        message: 'Uploads directory does not exist',
        path: uploadsPath
      });
    }

    const files = fs.readdirSync(uploadsPath);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    const imageUrls = imageFiles.map(file => ({
      filename: file,
      url: `/uploads/processed/${file}`,
      fullUrl: `${req.protocol}://${req.get('host')}/uploads/processed/${file}`,
      exists: fs.existsSync(path.join(uploadsPath, file))
    }));

    res.json({
      success: true,
      uploadsPath,
      totalImages: imageFiles.length,
      images: imageUrls,
      testUrl: imageUrls.length > 0 ? imageUrls[0].fullUrl : null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      uploadsPath
    });
  }
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
  
  // Verify upload directories exist
  const uploadDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads', 'processed'),
    path.join(__dirname, 'uploads', 'temp')
  ];

  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`📁 Directory exists: ${dir}`);
    }
  });

  console.log(`📸 Static files served at: http://localhost:${PORT}/uploads/`);
  console.log(`🖼️  Test images endpoint: http://localhost:${PORT}/api/test-images`);
  
  // Verify required environment variables
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  WARNING: ANTHROPIC_API_KEY not set! Portfolio generation will fail.');
    console.warn('   Add your Anthropic API key to the .env file');
  } else {
    console.log('✅ Anthropic API key configured');
  }

  // Visual Editor specific logs
  console.log('\n🎨 Visual Editor Features Enabled:');
  console.log('   ✅ Session management');
  console.log('   ✅ Auto-save functionality');
  console.log('   ✅ Undo/Redo history');
  console.log('   ✅ Real-time validation');
  console.log('   ✅ Quality analysis integration');
  console.log('   ✅ Auto-fix suggestions');
});

module.exports = app;