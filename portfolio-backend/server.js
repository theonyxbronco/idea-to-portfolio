const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const fileProcessor = require('./utils/fileProcessor');
const promptGenerator = require('./utils/promptGenerator');
const imageParser = require('./utils/imageParser');
const htmlValidator = require('./utils/htmlValidator');
const qualityAnalyzer = require('./utils/validators/qualityAnalyzer');
const { GoogleSheetsTracker } = require('./utils/googleSheets');

const JSZip = require('jszip');
const zip = new JSZip();

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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

app.use(securityHeaders);
app.use(requestLogger);
app.use(rateLimit);

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 50
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

const sheetsTracker = new GoogleSheetsTracker({
  clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  sheetId: process.env.GOOGLE_SHEETS_ID,
  sheetName: process.env.GOOGLE_SHEETS_NAME
});

app.post('/api/generate-portfolio', upload.any(), validatePortfolioData, async (req, res) => {
  const processingStartTime = Date.now();
  let processedImageIds = [];
  let imageAnalysisResults = {};
  
  try {
    const portfolioData = req.portfolioData;
    const files = req.files || [];
    const isContinuation = req.body.continueGeneration === 'true';
    const partialHtml = req.body.partialHtml;

    if (sheetsTracker.initialized) {
      sheetsTracker.appendData(
        portfolioData, 
        req.headers['user-agent'] || 'unknown',
        req.headers['sec-ch-ua-width'] || 'unknown'
      ).catch(() => {});
    }

    const processedImages = { process: [], final: [], moodboard: [] };
    
    if (files.length > 0) {
      const categorizeFile = (file) => {
        const fieldName = file.fieldname || '';
        const originalName = file.originalname || '';
        if (fieldName.includes('moodboard') || originalName.includes('moodboard')) return 'moodboard';
        if (fieldName.includes('final') || originalName.includes('final')) return 'final';
        return 'process';
      };
      
      const filesByCategory = { process: [], final: [], moodboard: [] };
      files.forEach(file => filesByCategory[categorizeFile(file)].push(file));
      
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
              .then(async (result) => {
                processedImages[category] = result.results;
                processedImageIds.push(...result.results.map(img => img.id));
                
                if (result.results.length > 0 && !isContinuation) {
                  try {
                    const imagePaths = result.results.map(img => img.path);
                    imageAnalysisResults[category] = await imageParser.analyzeImageSet(imagePaths, category);
                  } catch (analysisError) {}
                }
              })
              .catch(() => {})
          );
        }
      }

      await Promise.all(imageProcessingPromises);
    }

    let anthropicMessages;
    if (isContinuation && partialHtml) {
      anthropicMessages = [{
        role: 'user',
        content: htmlValidator.generateContinuationPrompt(partialHtml, portfolioData)
      }];
    } else {
      const designStyle = portfolioData.stylePreferences?.mood?.toLowerCase() || 'modern';
      try {
        anthropicMessages = await promptGenerator.generateAnthropicMessages(portfolioData, processedImages, designStyle);
      } catch {
        anthropicMessages = [{
          role: 'user',
          content: await promptGenerator.generateStyledPrompt(portfolioData, processedImages, designStyle)
        }];
      }
    }
    
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: anthropicMessages
    });
    
    let cleanedHTML = response.content[0].text.trim();
    if (isContinuation && partialHtml) {
      cleanedHTML = htmlValidator.mergeHtmlParts(partialHtml, cleanedHTML);
    } else {
      if (cleanedHTML.startsWith('```html')) cleanedHTML = cleanedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
      else if (cleanedHTML.startsWith('```')) cleanedHTML = cleanedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
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

    let validatedHTML = cleanedHTML;
    let validationResults = null;
    let autoFixApplied = false;
    
    try {
      validationResults = await qualityAnalyzer.validatePortfolio(
        cleanedHTML,
        portfolioData,
        processedImages
      );

      if (validationResults.overall.score < 85) {
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
    
    const processingTimeMs = Date.now() - processingStartTime;
    const hasImages = anthropicMessages[0].content.some && 
                     anthropicMessages[0].content.some(c => c.type === 'image');
    
    res.json({
      success: true,
      portfolio: {
        html: validatedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          description: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          processingTime: processingTimeMs,
          designStyle: isContinuation ? 'continued' : (portfolioData.stylePreferences?.mood || 'modern'),
          imagesProcessed: {
            process: processedImages.process.length,
            final: processedImages.final.length,
            moodboard: processedImages.moodboard.length
          },
          isContinuation,
          validationResult: validation,
          processedImageDetails: processedImages,
          qualityValidation: validationResults,
          autoFixApplied,
          qualityScore: validationResults?.overall?.score || 'unknown',
          computerVisionAnalysis: imageAnalysisResults,
          aiPromptEnhanced: Object.keys(imageAnalysisResults).length > 0,
          analysisMethod: 'sharp-based',
          visionCapabilitiesUsed: hasImages
        }
      }
    });
    
    setTimeout(() => {
      fileProcessor.cleanupTempFiles(processedImageIds).catch(() => {});
    }, 60 * 60 * 1000);
    
  } catch (error) {
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
});

app.get('/api/health', detailedHealthCheck);

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
    }
  });
});

app.get('/api/test-image-analysis', async (req, res) => {
  try {
    res.json({
      status: 'Image analysis system ready',
      method: 'sharp-based',
      capabilities: [
        'Color palette extraction',
        'Brightness analysis',
        'Style detection from filenames',
        'Metadata extraction',
        'Combined multi-image analysis'
      ]
    });
  } catch (error) {
    res.status(500).json({
      status: 'Image analysis test failed',
      error: error.message
    });
  }
});

app.get('/api/user-data', async (req, res) => {
  try {
    const userEmail = req.query.email;
    if (!userEmail) return res.status(400).json({ success: false, error: 'Email is required' });
    if (!sheetsTracker.initialized) return res.status(500).json({ success: false, error: 'Google Sheets integration not configured' });

    const response = await sheetsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsTracker.sheetId,
      range: `${sheetsTracker.sheetName}!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return res.json({ success: true, data: { portfolios: [], tier: 'Free', tags: [] } });

    const headers = rows[0];
    const emailIndex = headers.indexOf('Email');
    const tierIndex = headers.indexOf('Tier');
    const tagsIndex = headers.indexOf('Project Tags');
    
    if (emailIndex === -1) return res.status(500).json({ success: false, error: 'Email column not found in sheet' });

    const userRows = rows.slice(1).filter(row => row[emailIndex] === userEmail);
    const result = {
      portfolios: userRows.map(row => ({
        id: `sheet-${row[0]}`,
        name: row[1] || 'Untitled Portfolio',
        createdAt: row[0],
        status: 'deployed',
        deployUrl: '',
        lastModified: row[0]
      })),
      tier: userRows.length > 0 ? (userRows[0][tierIndex] || 'Free') : 'Free',
      tags: userRows.length > 0 ? 
        [...new Set(userRows[0][tagsIndex]?.split(',').map(tag => tag.trim()).filter(Boolean) || [])] : []
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user data' });
  }
});

// Add this to server.js after the other endpoints
app.post('/api/ai-edit-portfolio', async (req, res) => {
  try {
    const { htmlContent, editRequest } = req.body;
    
    if (!htmlContent || !editRequest) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Both htmlContent and editRequest are required'
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'API Configuration Error',
        details: 'Anthropic API key is not configured properly'
      });
    }

    // Prepare the prompt for Claude
    const prompt = `
You are a web design assistant that helps modify HTML/CSS based on user requests.
The user has provided their current HTML and wants to make the following changes:
"${editRequest}"

Here is the current HTML:
\`\`\`html
${htmlContent}
\`\`\`

Please respond with ONLY the modified HTML that implements the requested changes.
The HTML should be complete and valid. Do not include any explanations or markdown formatting.
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    let modifiedHtml = response.content[0].text.trim();
    
    // Clean up the response if it includes markdown formatting
    if (modifiedHtml.startsWith('```html')) {
      modifiedHtml = modifiedHtml.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (modifiedHtml.startsWith('```')) {
      modifiedHtml = modifiedHtml.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Ensure we're sending valid JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      modifiedHtml,
      metadata: {
        processedAt: new Date().toISOString(),
        request: editRequest
      }
    });

  } catch (error) {
    console.error('AI Edit Error:', error);
    // Ensure we're sending valid JSON even in error cases
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      success: false,
      error: 'AI Edit Failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
});

app.use(errorHandler);
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    details: `Route ${req.method} ${req.originalUrl} not found`
  });
});

app.post('/api/save-portfolio', async (req, res) => {
  try {
    const { htmlContent } = req.body;
    
    if (!htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing HTML content'
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `portfolio_${timestamp}.html`;
    const filePath = path.join(tempDir, filename);

    // Save the file
    await fs.writeFile(filePath, htmlContent);

    res.json({
      success: true,
      filename,
      savedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save portfolio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/create-zip', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing filename'
      });
    }

    const filePath = path.join(tempDir, filename);
    const fileContent = await fs.readFile(filePath, 'utf8');

    const zip = new JSZip();
    zip.file("index.html", fileContent);
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=portfolio.zip');
    res.send(zipContent);

  } catch (error) {
    console.error('Error creating zip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create zip file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

process.on('SIGTERM', () => server.close(() => {}));
process.on('SIGINT', () => server.close(() => {}));

const server = app.listen(PORT, () => {
  const uploadDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads', 'processed'),
    path.join(__dirname, 'uploads', 'temp')
  ];

  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
});

module.exports = app;