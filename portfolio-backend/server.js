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

// Serve images from temp folders
app.use('/temp', express.static(path.join(__dirname, 'temp')));

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

// Helper function to create portfolio folder and save images
const savePortfolioImages = async (files, portfolioData) => {
  const personName = portfolioData.personalInfo.name.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = Date.now();
  const portfolioId = `${personName}_${timestamp}`;
  const portfolioFolder = path.join(tempDir, `portfolio_${portfolioId}`);
  
  // Create portfolio folder
  await fs.ensureDir(portfolioFolder);
  
  const savedImages = {
    process: [], // For AI analysis only, not saved to disk
    final: [],   // Saved to disk and used in HTML
    moodboard: [], // For AI analysis only, not saved to disk
    portfolioId: portfolioId,
    portfolioFolder: portfolioFolder
  };
  
  const categorizeFile = (file) => {
    const fieldName = file.fieldname || '';
    const originalName = file.originalname || '';
    if (fieldName.includes('moodboard') || originalName.includes('moodboard')) return 'moodboard';
    if (fieldName.includes('final') || originalName.includes('final')) return 'final';
    return 'process';
  };
  
  // Process images
  for (const file of files) {
    const category = categorizeFile(file);
    
    if (category === 'final') {
      // Save final images to disk for use in HTML
      const fileExt = path.extname(file.originalname);
      const fileName = `final_${savedImages.final.length + 1}${fileExt}`;
      const filePath = path.join(portfolioFolder, fileName);
      
      // Save file to disk
      await fs.writeFile(filePath, file.buffer);
      
      // Store relative path for HTML generation
      const relativePath = `./${fileName}`;
      const serverPath = `/temp/portfolio_${portfolioId}/${fileName}`;
      
      savedImages.final.push({
        id: `final_${savedImages.final.length}`,
        path: filePath,
        relativePath: relativePath,
        serverPath: serverPath,
        filename: fileName,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
    } else {
      // For process and moodboard images, store in memory for AI analysis only
      // Create a temporary path for analysis but don't save to portfolio folder
      const tempPath = path.join(tempDir, 'analysis_temp', `${category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`);
      await fs.ensureDir(path.dirname(tempPath));
      await fs.writeFile(tempPath, file.buffer);
      
      savedImages[category].push({
        id: `${category}_${savedImages[category].length}`,
        path: tempPath, // Temporary path for analysis
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
    }
  }
  
  return savedImages;
};

// Helper function to update HTML with correct image paths (only final images)
const updateHtmlWithImagePaths = (html, savedImages, portfolioId) => {
  let updatedHtml = html;
  
  // Only replace final image paths in HTML
  if (savedImages.final && Array.isArray(savedImages.final)) {
    savedImages.final.forEach((image, index) => {
      // Replace various possible placeholder patterns for final images
      const patterns = [
        new RegExp(`\\./uploads/final_${index + 1}\\.(jpg|jpeg|png|gif|webp)`, 'gi'),
        new RegExp(`uploads/final_${index + 1}\\.(jpg|jpeg|png|gif|webp)`, 'gi'),
        new RegExp(`final_${index + 1}\\.(jpg|jpeg|png|gif|webp)`, 'gi'),
        new RegExp(`placeholder_final_${index + 1}`, 'gi'),
        // Also handle zero-indexed patterns
        new RegExp(`\\./uploads/final_${index}\\.(jpg|jpeg|png|gif|webp)`, 'gi'),
        new RegExp(`uploads/final_${index}\\.(jpg|jpeg|png|gif|webp)`, 'gi'),
        new RegExp(`final_${index}\\.(jpg|jpeg|png|gif|webp)`, 'gi'),
        new RegExp(`placeholder_final_${index}`, 'gi')
      ];
      
      patterns.forEach(pattern => {
        updatedHtml = updatedHtml.replace(pattern, image.relativePath);
      });
    });
  }
  
  return updatedHtml;
};

app.post('/api/generate-portfolio', upload.any(), validatePortfolioData, async (req, res) => {
  const processingStartTime = Date.now();
  let savedImages = null;
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

    // Save images to organized folder structure
    if (files.length > 0) {
      savedImages = await savePortfolioImages(files, portfolioData);
      
      // Analyze images if not continuation
      if (!isContinuation && savedImages) {
        try {
          for (const [category, images] of Object.entries(savedImages)) {
            if (Array.isArray(images) && images.length > 0) {
              const imagePaths = images.map(img => img.path);
              imageAnalysisResults[category] = await imageParser.analyzeImageSet(imagePaths, category);
            }
          }
        } catch (analysisError) {
          console.error('Image analysis failed:', analysisError);
        }
      }
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
        // Convert savedImages to the expected format for prompt generation
        const processedImages = savedImages ? {
          process: savedImages.process || [],
          final: savedImages.final || [],
          moodboard: savedImages.moodboard || []
        } : { process: [], final: [], moodboard: [] };
        
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

    // Update HTML with correct image paths
    if (savedImages) {
      cleanedHTML = updateHtmlWithImagePaths(cleanedHTML, savedImages, savedImages.portfolioId);
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
          imagesProcessed: savedImages || {},
          imageAnalysisResults: imageAnalysisResults,
          portfolioId: savedImages?.portfolioId
        }
      });
    }

    let validatedHTML = cleanedHTML;
    let validationResults = null;
    let autoFixApplied = false;
    
    try {
      const processedImages = savedImages ? {
        process: savedImages.process || [],
        final: savedImages.final || [],
        moodboard: savedImages.moodboard || []
      } : { process: [], final: [], moodboard: [] };

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
          
          // Update HTML with image paths again after auto-fixes
          if (savedImages) {
            validatedHTML = updateHtmlWithImagePaths(validatedHTML, savedImages, savedImages.portfolioId);
          }
          
          validationResults = await qualityAnalyzer.validatePortfolio(
            validatedHTML,
            portfolioData,
            processedImages
          );
        }
      }
    } catch (validationError) {
      console.error('Validation error:', validationError);
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

    // Save the final HTML file to the portfolio folder
    if (savedImages) {
      const htmlFilePath = path.join(savedImages.portfolioFolder, 'index.html');
      await fs.writeFile(htmlFilePath, validatedHTML);
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
          imagesProcessed: savedImages ? {
            process: savedImages.process.length,
            final: savedImages.final.length,
            moodboard: savedImages.moodboard.length
          } : { process: 0, final: 0, moodboard: 0 },
          isContinuation,
          validationResult: validation,
          processedImageDetails: savedImages || {},
          qualityValidation: validationResults,
          autoFixApplied,
          qualityScore: validationResults?.overall?.score || 'unknown',
          computerVisionAnalysis: imageAnalysisResults,
          aiPromptEnhanced: Object.keys(imageAnalysisResults).length > 0,
          analysisMethod: 'sharp-based',
          visionCapabilitiesUsed: hasImages,
          portfolioId: savedImages?.portfolioId,
          portfolioFolder: savedImages?.portfolioFolder
        }
      }
    });
    
    // Cleanup temporary analysis files after processing
    setTimeout(() => {
      if (savedImages?.portfolioFolder) {
        // Clean up temporary analysis files
        const analysisFiles = [...(savedImages.process || []), ...(savedImages.moodboard || [])];
        analysisFiles.forEach(file => {
          if (file.path && file.path.includes('analysis_temp')) {
            fs.remove(file.path).catch(() => {});
          }
        });
        
        // Clean up the entire portfolio folder after 24 hours  
        setTimeout(() => {
          fs.remove(savedImages.portfolioFolder).catch(() => {});
        }, 24 * 60 * 60 * 1000); // 24 hours
      }
    }, 5 * 60 * 1000); // Clean analysis files after 5 minutes
    
  } catch (error) {
    // Cleanup on error
    if (savedImages?.portfolioFolder) {
      // Clean up temporary analysis files
      const analysisFiles = [...(savedImages.process || []), ...(savedImages.moodboard || [])];
      analysisFiles.forEach(file => {
        if (file.path && file.path.includes('analysis_temp')) {
          fs.remove(file.path).catch(() => {});
        }
      });
      
      // Clean up portfolio folder
      fs.remove(savedImages.portfolioFolder).catch(() => {});
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

// Download portfolio as ZIP
app.post('/api/download-portfolio', async (req, res) => {
  try {
    const { portfolioId } = req.body;
    
    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio ID is required'
      });
    }

    const portfolioFolder = path.join(tempDir, `portfolio_${portfolioId}`);
    
    if (!await fs.pathExists(portfolioFolder)) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio folder not found'
      });
    }

    const zip = new JSZip();
    
    // Read all files in the portfolio folder
    const files = await fs.readdir(portfolioFolder);
    
    for (const fileName of files) {
      const filePath = path.join(portfolioFolder, fileName);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const fileContent = await fs.readFile(filePath);
        zip.file(fileName, fileContent);
      }
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=portfolio_${portfolioId}.zip`);
    res.send(zipContent);

  } catch (error) {
    console.error('Error creating portfolio zip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portfolio zip',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      'POST /api/download-portfolio': 'Download portfolio as ZIP file',
      'GET /api/health': 'Health check endpoint',
      'GET /api/info': 'API information'
    },
    features: {
      computerVision: 'Sharp-based image analysis for color extraction and style detection',
      aiGeneration: 'Anthropic Claude with enhanced prompts from image analysis',
      qualityValidation: 'Comprehensive HTML, design, and accessibility validation',
      autoFixes: 'Automatic fixes for common issues',
      responsiveDesign: 'Mobile-first responsive portfolio generation',
      imageManagement: 'Organized image storage and ZIP download'
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
// Move these endpoints BEFORE the error handlers and 404 catch-all
app.post('/api/save-portfolio', async (req, res) => {
  try {
    const { htmlContent, filename, includeImages = true } = req.body;
    
    if (!htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing HTML content'
      });
    }

    // Use provided filename or generate default one
    const finalFilename = filename || `portfolio_${Date.now()}.html`;
    const filePath = path.join(tempDir, finalFilename);

    // Save the HTML file
    await fs.writeFile(filePath, htmlContent);

    let imageFiles = [];
    
    if (includeImages) {
      // Extract image sources from HTML
      const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      const backgroundImageRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
      const imageSources = new Set();
      
      let match;
      
      // Find img src attributes
      while ((match = imageRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
          imageSources.add(src);
        }
      }
      
      // Find background-image URLs
      while ((match = backgroundImageRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
          imageSources.add(src);
        }
      }
      
      // Copy image files to temp directory
      for (const imageSrc of imageSources) {
        try {
          // Remove leading slash if present
          const cleanSrc = imageSrc.startsWith('/') ? imageSrc.substring(1) : imageSrc;
          const sourcePath = path.join(__dirname, cleanSrc);
          
          if (await fs.pathExists(sourcePath)) {
            const imageName = path.basename(cleanSrc);
            const tempImagePath = path.join(tempDir, `${finalFilename}_${imageName}`);
            await fs.copy(sourcePath, tempImagePath);
            imageFiles.push({
              originalSrc: imageSrc,
              filename: `${finalFilename}_${imageName}`,
              tempPath: tempImagePath
            });
          }
        } catch (error) {
          console.warn(`Could not copy image ${imageSrc}:`, error.message);
        }
      }
    }

    res.json({
      success: true,
      filename: finalFilename,
      imageFiles: imageFiles,
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
    const { filename, imageFiles = [] } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing filename'
      });
    }

    const filePath = path.join(tempDir, filename);
    
    // Check if HTML file exists
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'HTML file not found'
      });
    }

    let htmlContent = await fs.readFile(filePath, 'utf8');
    const zip = new JSZip();
    
    // Create images folder in ZIP if we have images
    const imagesFolder = imageFiles.length > 0 ? zip.folder("images") : null;
    
    // Add images to ZIP and update HTML paths
    for (const imageFile of imageFiles) {
      try {
        if (await fs.pathExists(imageFile.tempPath)) {
          const imageBuffer = await fs.readFile(imageFile.tempPath);
          const imageName = path.basename(imageFile.originalSrc);
          
          // Add image to ZIP in images folder
          if (imagesFolder) {
            imagesFolder.file(imageName, imageBuffer);
          }
          
          // Update HTML to reference images in the images folder
          const oldSrc = imageFile.originalSrc;
          const newSrc = `images/${imageName}`;
          htmlContent = htmlContent.replace(new RegExp(oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newSrc);
        }
      } catch (error) {
        console.warn(`Could not add image ${imageFile.originalSrc} to ZIP:`, error.message);
      }
    }
    
    // Add the updated HTML file to ZIP
    zip.file("index.html", htmlContent);
    
    // Generate ZIP buffer
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=portfolio.zip');
    res.send(zipContent);

    // Clean up temp files after sending
    setTimeout(async () => {
      try {
        await fs.remove(filePath);
        for (const imageFile of imageFiles) {
          await fs.remove(imageFile.tempPath).catch(() => {});
        }
      } catch (error) {
        console.warn('Error cleaning up temp files:', error.message);
      }
    }, 5000);

  } catch (error) {
    console.error('Error creating zip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create zip file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// THEN keep the existing error handlers and 404 catch-all at the bottom:
app.use(errorHandler);
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    details: `Route ${req.method} ${req.originalUrl} not found`
  });
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
    
    if (modifiedHtml.startsWith('```html')) {
      modifiedHtml = modifiedHtml.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (modifiedHtml.startsWith('```')) {
      modifiedHtml = modifiedHtml.replace(/^```\n/, '').replace(/\n```$/, '');
    }

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

process.on('SIGTERM', () => server.close(() => {}));
process.on('SIGINT', () => server.close(() => {}));

const server = app.listen(PORT, () => {
  const uploadDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads', 'processed'),
    path.join(__dirname, 'uploads', 'temp'),
    tempDir
  ];

  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  console.log(`Portfolio Generator API running on port ${PORT}`);
  console.log(`Temp directory: ${tempDir}`);
});

module.exports = app;