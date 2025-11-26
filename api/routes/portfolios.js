/**
 * Portfolio Routes
 * Handles portfolio data retrieval, generation, downloads, AI editing, and saving
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const Anthropic = require('@anthropic-ai/sdk');
const JSZip = require('jszip');
const PromptGenerator = require('../utils/promptGenerator');
const ImageParser = require('../utils/imageParser');
const htmlValidator = require('../utils/htmlValidator');
const qualityAnalyzer = require('../utils/validators/qualityAnalyzer');
const { validatePortfolioData } = require('../middleware/portfolioMiddleware');
const { GoogleSheetsTracker } = require('../utils/googleSheets');
const {
  processContinuationRequest,
  processAutoContinuation,
  getProjectImagesFromSheets,
  updateHtmlWithProjectImages
} = require('../helpers/portfolioHelpers');
const { Logger } = require('../utils/logger');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const promptGenerator = new PromptGenerator();
const imageParser = new ImageParser(anthropic);
const logger = new Logger('PortfolioRoutes');

const tempDir = process.env.NODE_ENV === 'production' || process.env.VERCEL
  ? '/tmp'
  : path.join(__dirname, '..', 'temp');

fs.ensureDirSync(tempDir);

const sheetsTracker = new GoogleSheetsTracker({
  clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  sheetId: process.env.GOOGLE_SHEETS_ID1,
  sheetName: process.env.GOOGLE_SHEETS_NAME1
});

module.exports = ({ upload }) => {
  if (!upload) {
    throw new Error('Upload middleware is required for portfolio routes');
  }

  const router = express.Router();

  router.get('/get-portfolio-data', async (req, res) => {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      // Create trackers for both sheets
      const userInfoTracker = new GoogleSheetsTracker({
        clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
        sheetId: process.env.GOOGLE_SHEETS_ID3,
        sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info'
      });

      const projectsTracker = new GoogleSheetsTracker({
        clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
        sheetId: process.env.GOOGLE_SHEETS_ID3,
        sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
      });

      if (!userInfoTracker.initialized || !projectsTracker.initialized) {
        return res.status(500).json({
          success: false,
          error: 'Google Sheets integration not configured'
        });
      }

      // Fetch user info and projects in parallel
      const [userInfoResponse, projectsResponse] = await Promise.all([
        userInfoTracker.sheets.spreadsheets.values.get({
          spreadsheetId: userInfoTracker.sheetId,
          range: `${userInfoTracker.sheetName}!A:N`,
        }),
        projectsTracker.sheets.spreadsheets.values.get({
          spreadsheetId: projectsTracker.sheetId,
          range: `${projectsTracker.sheetName}!A:P`,
        })
      ]);

      // Process user info
      let personalInfo = null;
      const userRows = userInfoResponse.data.values || [];
      if (userRows.length > 1) {
        const userRow = userRows.find((row, index) => 
          index > 0 && row[1] === email
        );

        if (userRow) {
          personalInfo = {
            name: userRow[2] || '',
            title: userRow[3] || '',
            bio: userRow[4] || '',
            email: userRow[1] || '',
            phone: userRow[5] || '',
            website: userRow[6] || '',
            linkedin: userRow[7] || '',
            instagram: userRow[8] || '',
            behance: userRow[9] || '',
            dribbble: userRow[10] || '',
            skills: userRow[11] ? userRow[11].split(',').map(s => s.trim()).filter(Boolean) : [],
            experience: userRow[12] || '',
            education: userRow[13] || ''
          };
        }
      }

      // Process projects
      let projects = [];
      const projectRows = projectsResponse.data.values || [];
      if (projectRows.length > 1) {
        projects = projectRows
        .slice(1) // Skip header row
        .filter(row => row[1] === email && row[12] === 'active') // Status is now column 12 (M)
        .map(row => ({
          id: row[2] || '',
          title: row[3] || '',
          subtitle: row[4] || '',
          overview: row[5] || '',
          category: row[6] || '',
          customCategory: row[7] || '',
          tags: row[8] ? row[8].split(',').map(t => t.trim()).filter(Boolean) : [],
          // Removed: problem, solution, reflection
          processImages: [], // Empty for portfolio generation
          finalProductImage: null, // Will be handled by image loading
          createdAt: row[0] || new Date().toISOString(),
          imageMetadata: row[11] ? (() => { // Image metadata is now column 11 (L)
            try {
              return JSON.parse(row[11]);
            } catch {
              return {};
            }
          })() : {}
        }));
      }

      res.json({
        success: true,
        data: {
          personalInfo,
          projects,
          hasUserInfo: !!personalInfo,
          projectCount: projects.length
        }
      });

    } catch (error) {
      logger.error('Error fetching portfolio data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch portfolio data',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
      });
    }
  });


  router.post('/generate-portfolio', upload.any(), validatePortfolioData, async (req, res) => {
    const processingStartTime = Date.now();

    try {
      logger.info('🚀 Starting Portfolio Generation with Enhanced Analysis...');

      // Extract all input data
      const portfolioData = req.portfolioData;
      const files = req.files || [];
      const isContinuation = req.body.continueGeneration === 'true';
      const partialHtml = req.body.partialHtml;
      const selectedSkeleton = req.body.selectedSkeleton || portfolioData.selectedSkeleton || 'none';
      const customDesignRequest = req.body.customDesignRequest || portfolioData.customDesignRequest || '';

      logger.info(`📋 Generation Parameters:
      - User: ${portfolioData.personalInfo?.name || 'Unknown'}
      - Selected Skeleton: ${selectedSkeleton}
      - Custom Design Request: ${customDesignRequest ? 'Yes' : 'No'}
      - Total Files: ${files.length}
      - Is Continuation: ${isContinuation}`);

      // Separate different types of files
      const moodboardFiles = files.filter(file => {
        const fieldName = (file.fieldname || '').toLowerCase();
        return fieldName.includes('moodboard') || fieldName.startsWith('mood');
      });

      const projectImageFiles = files.filter(file => {
        const fieldName = (file.fieldname || '').toLowerCase();
        return fieldName.includes('process_') || fieldName.includes('final_') || fieldName.includes('project_');
      });

      logger.info(`📁 File Analysis:
      - Moodboard files: ${moodboardFiles.length}
      - Project image files: ${projectImageFiles.length}`);

      // Log moodboard file details for debugging
      if (moodboardFiles.length > 0) {
        logger.info('🖼️ Moodboard Files Details:');
        moodboardFiles.forEach((file, index) => {
          logger.info(`  ${index + 1}. ${file.originalname || 'unnamed'} - ${file.mimetype} - ${Math.round(file.buffer.length / 1024)}KB`);
        });
      }

      // Track generation in Google Sheets
      if (sheetsTracker.initialized) {
        sheetsTracker.appendData(
          portfolioData, 
          req.headers['user-agent'] || 'unknown',
          req.headers['sec-ch-ua-width'] || 'unknown'
        ).catch(() => {});
      }

      // STEP 1: Load complete project data from Google Sheets
      logger.info('📊 Loading complete project data from Google Sheets...');
      const completeProjectData = await getProjectImagesFromSheets(portfolioData.personalInfo.email);

      if (!completeProjectData || !completeProjectData.projectImages) {
        logger.info('⚠️ No project data found, using portfolio data projects');
        completeProjectData.projectImages = portfolioData.projects || [];
        completeProjectData.totalProjects = completeProjectData.projectImages.length;
        completeProjectData.totalImages = 0;
      }

      logger.info(`✅ Project Data Loaded:
      - Total Projects: ${completeProjectData.totalProjects || 0}
      - Total Images: ${completeProjectData.totalImages || 0}`);

      // STEP 2: Run Comprehensive Analysis (only if not continuation)
      let comprehensiveAnalysis = null;

      if (!isContinuation) {
        logger.info('🔍 Running Comprehensive Analysis...');

        try {
          // Enhanced analysis with all inputs
          comprehensiveAnalysis = await imageParser.runComprehensiveAnalysis(
            moodboardFiles,
            portfolioData,
            completeProjectData,
            {
              selectedSkeleton,
              customDesignRequest,
              hasProjectImages: projectImageFiles.length > 0,
              userAgent: req.headers['user-agent'] || 'unknown'
            }
          );

          logger.info(`✅ Comprehensive Analysis Complete:
          - System Status: ${comprehensiveAnalysis.systemStatus}
          - Overall Confidence: ${Math.round(comprehensiveAnalysis.overallConfidence * 100)}%
          - Visual Style: ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category || 'unknown'}
          - Content Strategy: ${comprehensiveAnalysis.analysisLevels?.contentQuality?.strategy || 'unknown'}
          - Industry Focus: ${comprehensiveAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry || 'unknown'}`);

          // Log detailed analysis results
          if (comprehensiveAnalysis.analysisLevels?.visualIntelligence) {
            const visual = comprehensiveAnalysis.analysisLevels.visualIntelligence;
            logger.info(`🎨 Visual Analysis Details:
            - Category: ${visual.visualDNA?.category || 'unknown'}
            - Mood: ${visual.visualDNA?.mood || 'unknown'}
            - Colors: ${visual.colors?.palette?.slice(0, 3).join(', ') || 'none'}
            - Analysis Method: ${visual.analysisMethod || 'unknown'}`);
          }

        } catch (analysisError) {
          logger.error('❌ Comprehensive analysis failed:', analysisError);
          comprehensiveAnalysis = await imageParser.createFallbackAnalysis(
            portfolioData, 
            completeProjectData,
            { selectedSkeleton, customDesignRequest }
          );
          logger.info('⚠️ Using fallback analysis');
        }
      }

      // STEP 3: Handle continuation requests
      if (isContinuation && partialHtml) {
        logger.info('🔄 Processing continuation request...');

        try {
          const continuationResult = await processContinuationRequest(
            anthropic,
            partialHtml, 
            portfolioData, 
            completeProjectData, 
            comprehensiveAnalysis,
            selectedSkeleton,
            customDesignRequest
          );

          if (continuationResult.success) {
            logger.info('✅ Continuation successful');
            return res.json(continuationResult);
          } else {
            logger.info('⚠️ Continuation failed, proceeding with fresh generation');
          }
        } catch (continuationError) {
          logger.error('❌ Continuation failed:', continuationError);
          // Continue with fresh generation
        }
      }

  // STEP 4: Generate Enhanced Anthropic Messages (FIXED VERSION)
  logger.info('🤖 Generating enhanced Anthropic messages...');

  let anthropicMessages;
  try {
    // Use the safe image processing method
    anthropicMessages = await promptGenerator.generateEnhancedAnthropicMessagesWithSafeImages(
      portfolioData, 
      completeProjectData,
      comprehensiveAnalysis,
      moodboardFiles, // Pass raw files, let the generator handle processing safely
      {
        selectedSkeleton,
        customDesignRequest,
        hasProjectImages: projectImageFiles.length > 0,
        systemStatus: comprehensiveAnalysis?.systemStatus || 'BASIC'
      }
    );

    logger.info(`✅ Enhanced prompt generated successfully:
    - Message count: ${anthropicMessages.length}
    - Has moodboard images: ${moodboardFiles.length > 0}
    - Skeleton: ${selectedSkeleton}
    - Custom request: ${customDesignRequest ? 'Yes' : 'No'}`);

  } catch (promptError) {
    logger.error('❌ Enhanced prompt generation failed:', promptError);

    // Fallback to basic text-only prompt
    logger.info('⚠️ Using fallback text-only prompt generation');
    const basicPrompt = `Create a professional portfolio website for ${portfolioData.personalInfo?.name || 'Creative Professional'}.

  User Details:
  - Name: ${portfolioData.personalInfo?.name || 'Creative Professional'}
  - Title: ${portfolioData.personalInfo?.title || 'Designer'}
  - Email: ${portfolioData.personalInfo?.email || 'contact@portfolio.com'}
  - Bio: ${portfolioData.personalInfo?.bio || 'Passionate creative professional'}

  Projects: ${completeProjectData.totalProjects || 0} projects with ${completeProjectData.totalImages || 0} images

  ${selectedSkeleton !== 'none' ? `Design Style: ${selectedSkeleton} skeleton` : ''}
  ${customDesignRequest ? `Custom Request: ${customDesignRequest}` : ''}

  Create a complete, responsive HTML portfolio with embedded CSS and JavaScript. Include project galleries, contact section, and professional navigation.`;

    anthropicMessages = [{
      role: 'user',
      content: basicPrompt
    }];
  }

      // STEP 5: Call Anthropic API
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }

      logger.info('🤖 Sending request to Claude...');
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        temperature: 0.7,
        messages: anthropicMessages
      });

      // STEP 6: Process HTML response
      let generatedHTML = response.content[0].text.trim();

      // Clean up the response
      if (generatedHTML.startsWith('```html')) {
        generatedHTML = generatedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
      } else if (generatedHTML.startsWith('```')) {
        generatedHTML = generatedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      logger.info(`📄 Generated HTML length: ${generatedHTML.length} characters`);

      // STEP 7: Update HTML with project images
      logger.info('🖼️ Updating HTML with project images...');
      const htmlWithImages = updateHtmlWithProjectImages(generatedHTML, completeProjectData);

      if (htmlWithImages !== generatedHTML) {
        logger.info('✅ HTML successfully updated with project images');
      }

      // STEP 8: Validate HTML completeness
      const validation = htmlValidator.validateCompleteness(htmlWithImages);

      logger.info(`🔍 HTML Validation:
      - Is Complete: ${validation.isComplete}
      - Can Continue: ${validation.canContinue}
      - Estimated Completion: ${Math.round((validation.estimatedCompletion || 0) * 100)}%`);

      // STEP 9: Handle incomplete generation with auto-continuation
      if (!validation.isComplete && !isContinuation && validation.canContinue) {
        logger.info('🔄 Generation incomplete, attempting auto-continuation...');

        try {
        const autoContinuationResult = await processAutoContinuation(
          anthropic,
          htmlWithImages, 
          portfolioData, 
          completeProjectData, 
          comprehensiveAnalysis,
          selectedSkeleton,
            customDesignRequest,
            1 // First attempt
          );

          if (autoContinuationResult && autoContinuationResult.success) {
            logger.info('✅ Auto-continuation successful');
            return res.json(autoContinuationResult);
          }
        } catch (autoError) {
          logger.error('❌ Auto-continuation failed:', autoError);
        }

        // Return incomplete response if auto-continuation fails
        return res.json({
          success: false,
          incomplete: true,
          partialHtml: htmlWithImages,
          completionStatus: validation,
          error: 'Generation incomplete',
          details: 'The AI response was cut off before completion. You can continue generation to complete it.',
          metadata: {
            estimatedCompletion: validation.estimatedCompletion,
            issues: validation.issues,
            canContinue: validation.canContinue,
            projectData: completeProjectData,
            comprehensiveAnalysis: comprehensiveAnalysis ? {
              systemStatus: comprehensiveAnalysis.systemStatus,
              confidence: comprehensiveAnalysis.overallConfidence
            } : null,
            autoContinuationAttempted: true,
            processingTime: Date.now() - processingStartTime
          }
        });
      }

      // STEP 10: Apply quality validation and auto-fixes
      let finalHTML = htmlWithImages;
      let validationResults = null;
      let autoFixApplied = false;

      try {
        logger.info('🔍 Running quality validation...');
        validationResults = await qualityAnalyzer.validatePortfolio(
          htmlWithImages,
          portfolioData,
          completeProjectData
        );

        logger.info(`📊 Quality Score: ${validationResults.overall.score}/100`);

        if (validationResults.overall.score < 85) {
          logger.info('🔧 Applying auto-fixes...');
          const autoFixResult = await qualityAnalyzer.applyAutoFixes(
            htmlWithImages,
            validationResults,
            portfolioData,
            completeProjectData
          );

          if (autoFixResult.success && autoFixResult.improvedHtml) {
            finalHTML = autoFixResult.improvedHtml;
            autoFixApplied = true;
            logger.info('✅ Auto-fixes applied successfully');

            // Re-update with project images after fixes
            finalHTML = updateHtmlWithProjectImages(finalHTML, completeProjectData);

            // Re-validate after fixes
            validationResults = await qualityAnalyzer.validatePortfolio(
              finalHTML,
              portfolioData,
              completeProjectData
            );
            logger.info(`📊 Quality Score after fixes: ${validationResults.overall.score}/100`);
          }
        }
      } catch (validationError) {
        logger.error('❌ Quality validation error:', validationError);
        validationResults = {
          overall: { score: 75, status: 'unknown' },
          content: { score: 75, issues: [], suggestions: [] },
          design: { score: 75, issues: [], suggestions: [] },
          technical: { score: 75, issues: [], suggestions: [] },
          accessibility: { score: 75, issues: [], suggestions: [] },
          error: 'Validation failed but generation completed'
        };
      }

      // STEP 11: Final validation
      if (!finalHTML.includes('<html') && !finalHTML.includes('<!DOCTYPE')) {
        throw new Error('Generated content does not appear to be valid HTML');
      }

      // STEP 12: Save portfolio files
      const portfolioId = `${portfolioData.personalInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      const portfolioFolder = path.join(tempDir, `portfolio_${portfolioId}`);
      await fs.ensureDir(portfolioFolder);

      const htmlFilePath = path.join(portfolioFolder, 'index.html');
      await fs.writeFile(htmlFilePath, finalHTML);

      const processingTimeMs = Date.now() - processingStartTime;

      logger.info(`✅ Portfolio generation successful!
      - Processing time: ${processingTimeMs}ms
      - Final HTML length: ${finalHTML.length} characters
      - Quality score: ${validationResults?.overall?.score || 'unknown'}
      - Auto-fixes applied: ${autoFixApplied}`);

      // STEP 13: Return success response
      res.json({
        success: true,
        portfolio: {
          html: finalHTML,
          metadata: {
            title: `${portfolioData.personalInfo.name} - Portfolio`,
            overview: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
            generatedAt: new Date().toISOString(),
            processingTime: processingTimeMs,
            generationSystem: 'ENHANCED_V2',

            // Design inputs
            selectedSkeleton,
            customDesignRequest: customDesignRequest || null,
            hasCustomRequest: !!customDesignRequest,
            skeletonUsed: selectedSkeleton !== 'none',
            moodboardImagesUsed: moodboardFiles.length,

            // Project data
            projectData: completeProjectData,
            projectCount: completeProjectData.totalProjects || 0,
            imageCount: completeProjectData.totalImages || 0,

            // Analysis results
            comprehensiveAnalysis: comprehensiveAnalysis ? {
              systemStatus: comprehensiveAnalysis.systemStatus,
              overallConfidence: comprehensiveAnalysis.overallConfidence,
              visualStyle: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category,
              visualMood: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.mood,
              contentStrategy: comprehensiveAnalysis.analysisLevels?.contentQuality?.strategy,
              industryFocus: comprehensiveAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry,
              analysisMethod: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.analysisMethod,
              colorPalette: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.colors?.palette?.slice(0, 4),
              processingTime: comprehensiveAnalysis.processingTime
            } : null,

            // Quality metrics
            isContinuation,
            validationResult: validation,
            qualityValidation: validationResults,
            autoFixApplied,
            qualityScore: validationResults?.overall?.score || 'unknown',

            // File management
            portfolioId: portfolioId,
            portfolioFolder: portfolioFolder
          }
        }
      });

      // Clean up temporary files after 24 hours
      setTimeout(() => {
        fs.remove(portfolioFolder).catch(() => {});
      }, 24 * 60 * 60 * 1000);

    } catch (error) {
      logger.error('❌ Portfolio generation error:', error);

      const processingTimeMs = Date.now() - processingStartTime;

      // Enhanced error handling with specific error types
      if (error.message && error.message.includes('API key')) {
        return res.status(500).json({
          success: false,
          error: 'API Configuration Error',
          details: 'Anthropic API key is not configured properly',
          processingTime: processingTimeMs
        });
      }

      if (error.message && error.message.includes('rate limit')) {
        return res.status(429).json({
          success: false,
          error: 'Rate Limit Exceeded',
          details: 'API rate limit exceeded. Please try again later.',
          processingTime: processingTimeMs
        });
      }

      if (error.message && error.message.includes('max_tokens')) {
        return res.status(400).json({
          success: false,
          error: 'Content Too Large',
          details: 'The portfolio content is too large to process. Try reducing the number of projects or images.',
          processingTime: processingTimeMs
        });
      }

      res.status(500).json({
        success: false,
        error: 'Portfolio Generation Failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred during portfolio generation',
        timestamp: new Date().toISOString(),
        processingTime: processingTimeMs,
        errorType: error.name || 'UnknownError'
      });
    }
  });


  router.post('/download-portfolio', async (req, res) => {
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
      logger.error('Error creating portfolio zip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create portfolio zip',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });


  router.post('/ai-edit-portfolio', async (req, res) => {
    logger.info('AI Edit Route Hit:', req.method, req.url);

    try {
      const { htmlContent, editRequest, isContinuation, partialHtml } = req.body;

      // Validation
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

      // Determine if this is a continuation request
      const shouldContinue = isContinuation && partialHtml;

      let prompt;
      if (shouldContinue) {
        // Continuation mode
        prompt = `Continue editing the HTML below based on the previous edit request: "${editRequest}".

  Current incomplete HTML:
  \`\`\`html
  ${partialHtml}
  \`\`\`

  Please continue editing the HTML to fulfill the original request. Respond with ONLY the complete modified HTML.`;
      } else {
        // Initial edit request
        prompt = `You are a web design assistant that helps modify HTML/CSS based on user requests.
  The user has provided their current HTML and wants to make the following changes:
  "${editRequest}"

  Here is the current HTML:
  \`\`\`html
  ${htmlContent}
  \`\`\`

  Please respond with ONLY the modified HTML that implements the requested changes.
  The HTML should be complete and valid. Do not include any explanations or markdown formatting.`;
      }

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

      // Merge with partial HTML if this was a continuation
      let finalHtml = shouldContinue ? htmlValidator.mergeHtmlParts(partialHtml, modifiedHtml) : modifiedHtml;

      // Check if the generation is complete
      const validation = htmlValidator.validateCompleteness(finalHtml);
      if (!validation.isComplete && validation.canContinue && !shouldContinue) {
        // If initial request is incomplete, automatically continue
        logger.info('Initial edit incomplete, automatically continuing...');
        const continuationResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          temperature: 0.7,
          messages: [{
            role: 'user',
            content: `Continue editing the HTML below based on the previous edit request: "${editRequest}".

  Current incomplete HTML:
  \`\`\`html
  ${finalHtml}
  \`\`\`

  Please continue editing the HTML to fulfill the original request. Respond with ONLY the complete modified HTML.`
          }]
        });

        let continuedHtml = continuationResponse.content[0].text.trim();
        if (continuedHtml.startsWith('```html')) {
          continuedHtml = continuedHtml.replace(/^```html\n/, '').replace(/\n```$/, '');
        } else if (continuedHtml.startsWith('```')) {
          continuedHtml = continuedHtml.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        finalHtml = htmlValidator.mergeHtmlParts(finalHtml, continuedHtml);

        // Verify completion after continuation
        const postContinuationValidation = htmlValidator.validateCompleteness(finalHtml);
        if (!postContinuationValidation.isComplete) {
          return res.json({
            success: false,
            incomplete: true,
            partialHtml: finalHtml,
            completionStatus: postContinuationValidation,
            error: 'Edit still incomplete after continuation',
            details: 'The AI response was cut off before completion. You may need to continue generation again.',
            metadata: {
              estimatedCompletion: postContinuationValidation.estimatedCompletion,
              issues: postContinuationValidation.issues,
              canContinue: postContinuationValidation.canContinue,
              autoContinued: true
            }
          });
        }
      } else if (!validation.isComplete && !validation.canContinue) {
        return res.json({
          success: false,
          incomplete: true,
          partialHtml: finalHtml,
          error: 'Edit incomplete and cannot continue',
          details: 'The AI response was cut off before completion and cannot be automatically continued.',
          metadata: {
            issues: validation.issues,
            canContinue: false,
            autoContinued: false
          }
        });
      }

      res.json({
        success: true,
        modifiedHtml: finalHtml,
        metadata: {
          processedAt: new Date().toISOString(),
          request: editRequest,
          originalLength: htmlContent.length,
          modifiedLength: finalHtml.length,
          isContinuation: shouldContinue,
          autoContinued: !shouldContinue && validation.isComplete === false,
          isComplete: true
        }
      });

    } catch (error) {
      logger.error('AI Edit Error:', error);

      if (error.message && error.message.includes('rate limit')) {
        return res.status(429).json({
          success: false,
          error: 'Rate Limit Exceeded',
          details: 'API rate limit exceeded. Please try again later.'
        });
      }

      if (error.message && error.message.includes('API key')) {
        return res.status(500).json({
          success: false,
          error: 'API Configuration Error',
          details: 'Anthropic API key is not configured properly'
        });
      }

      res.status(500).json({
        success: false,
        error: 'AI Edit Failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    }
  });


  router.post('/save-portfolio', async (req, res) => {
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
            logger.warn(`Could not copy image ${imageSrc}:`, error.message);
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
      logger.error('Error saving portfolio:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save portfolio',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  return router;
};
