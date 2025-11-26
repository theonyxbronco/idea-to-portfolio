/**
 * Portfolio Helper Functions
 * Shared logic for portfolio generation and processing
 */

const { GoogleSheetsTracker } = require('../utils/googleSheets');
const htmlValidator = require('../utils/htmlValidator');
const { Logger } = require('../utils/logger');

const helperLogger = new Logger('PortfolioHelpers');

const processContinuationRequest = async (anthropic, partialHtml, portfolioData, completeProjectData, comprehensiveAnalysis, selectedSkeleton, customDesignRequest) => {
  helperLogger.info('🔄 Processing continuation request...');
  
  try {
    const continuationPrompt = `Continue completing this HTML portfolio. The generation was cut off mid-way.

CONTEXT:
- User: ${portfolioData.personalInfo.name} - ${portfolioData.personalInfo.title}
- Projects: ${completeProjectData.totalProjects || 0}
- Images Available: ${completeProjectData.totalImages || 0}
- Skeleton: ${selectedSkeleton}
- Custom Request: ${customDesignRequest || 'None'}
${comprehensiveAnalysis ? `- Detected Style: ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category || 'modern'}` : ''}
${comprehensiveAnalysis ? `- Color Palette: ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.colors?.palette?.slice(0, 3).join(', ') || 'modern colors'}` : ''}

CURRENT INCOMPLETE HTML:
\`\`\`html
${partialHtml}
\`\`\`

INSTRUCTIONS:
1. Complete the HTML exactly where it was cut off
2. Maintain the same design aesthetic and structure established
3. Ensure all HTML tags are properly closed
4. Include responsive design for all screen sizes
5. Integrate project data and images properly
6. Apply the detected visual style consistently
7. Ensure professional quality throughout

Return ONLY the COMPLETE HTML starting with <!DOCTYPE html> and ending with </html>.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: continuationPrompt }]
    });

    let continuedHTML = response.content[0].text.trim();
    
    // Clean the response
    if (continuedHTML.startsWith('```html')) {
      continuedHTML = continuedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (continuedHTML.startsWith('```')) {
      continuedHTML = continuedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Update with project images
    continuedHTML = updateHtmlWithProjectImages(continuedHTML, completeProjectData);

    // Validate the continued result
    const finalValidation = htmlValidator.validateCompleteness(continuedHTML);
    
    helperLogger.info(`✅ Continuation completed: ${finalValidation.isComplete ? 'Complete' : 'Still incomplete'}`);

    const portfolioId = `${portfolioData.personalInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    return {
      success: true,
      portfolio: {
        html: continuedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          overview: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          generationSystem: 'ENHANCED_V2_CONTINUED',
          selectedSkeleton,
          customDesignRequest: customDesignRequest || null,
          projectData: completeProjectData,
          projectCount: completeProjectData.totalProjects || 0,
          imageCount: completeProjectData.totalImages || 0,
          comprehensiveAnalysis: comprehensiveAnalysis ? {
            systemStatus: comprehensiveAnalysis.systemStatus,
            overallConfidence: comprehensiveAnalysis.overallConfidence,
            visualStyle: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category,
            contentStrategy: comprehensiveAnalysis.analysisLevels?.contentQuality?.strategy,
            industryFocus: comprehensiveAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry
          } : null,
          isContinuation: true,
          wasContinued: true,
          validationResult: finalValidation,
          portfolioId: portfolioId
        }
      }
    };

  } catch (error) {
    helperLogger.error('❌ Continuation request failed:', error);
    return {
      success: false,
      error: 'Continuation failed',
      details: error.message
    };
  }
};

const processAutoContinuation = async (anthropic, partialHtml, portfolioData, completeProjectData, comprehensiveAnalysis, selectedSkeleton, customDesignRequest, attempt = 1) => {
  const maxAttempts = 2; // Reduced for faster response
  
  if (attempt > maxAttempts) {
    helperLogger.info(`❌ Auto-continuation failed after ${maxAttempts} attempts`);
    return {
      success: false,
      error: 'Max attempts reached',
      partialHtml: partialHtml
    };
  }

  helperLogger.info(`🔄 Auto-continuing generation (attempt ${attempt}/${maxAttempts})`);

  try {
    const continuationPrompt = `Continue and complete this HTML portfolio. It was cut off during generation.

USER: ${portfolioData.personalInfo.name} - ${portfolioData.personalInfo.title}
PROJECTS: ${completeProjectData.totalProjects || 0} projects
${comprehensiveAnalysis ? `STYLE: ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category || 'modern'} ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.mood || 'professional'}` : ''}
${selectedSkeleton !== 'none' ? `SKELETON: ${selectedSkeleton}` : ''}
${customDesignRequest ? `CUSTOM: ${customDesignRequest}` : ''}

INCOMPLETE HTML:
\`\`\`html
${partialHtml}
\`\`\`

Complete the HTML with proper closing tags and responsive design. Return ONLY the complete HTML.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: continuationPrompt }]
    });

    let continuedHTML = response.content[0].text.trim();
    
    // Clean the response
    if (continuedHTML.startsWith('```html')) {
      continuedHTML = continuedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (continuedHTML.startsWith('```')) {
      continuedHTML = continuedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Update with project images
    continuedHTML = updateHtmlWithProjectImages(continuedHTML, completeProjectData);

    // Validate the continued result
    const finalValidation = htmlValidator.validateCompleteness(continuedHTML);
    
    if (!finalValidation.isComplete && attempt < maxAttempts) {
      helperLogger.info(`⚠️ Auto-continuation ${attempt} still incomplete, trying again...`);
      return await processAutoContinuation(
        continuedHTML, 
        portfolioData, 
        completeProjectData, 
        comprehensiveAnalysis,
        selectedSkeleton,
        customDesignRequest,
        attempt + 1
      );
    }

    // Success - return completed portfolio
    const portfolioId = `${portfolioData.personalInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    return {
      success: true,
      portfolio: {
        html: continuedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          overview: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          generationSystem: 'ENHANCED_V2_AUTO_CONTINUED',
          continuationAttempts: attempt,
          finalCompletion: finalValidation.isComplete,
          selectedSkeleton,
          customDesignRequest: customDesignRequest || null,
          projectData: completeProjectData,
          projectCount: completeProjectData.totalProjects || 0,
          imageCount: completeProjectData.totalImages || 0,
          comprehensiveAnalysis: comprehensiveAnalysis ? {
            systemStatus: comprehensiveAnalysis.systemStatus,
            overallConfidence: comprehensiveAnalysis.overallConfidence,
            visualStyle: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category,
            contentStrategy: comprehensiveAnalysis.analysisLevels?.contentQuality?.strategy,
            industryFocus: comprehensiveAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry
          } : null,
          isContinuation: true,
          wasAutoContinued: true,
          validationResult: finalValidation,
          portfolioId: portfolioId
        }
      }
    };

  } catch (error) {
    helperLogger.error(`❌ Auto-continuation attempt ${attempt} failed:`, error);
    
    if (attempt < maxAttempts) {
      helperLogger.info(`🔄 Retrying auto-continuation in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await processAutoContinuation(
        partialHtml, 
        portfolioData, 
        completeProjectData, 
        comprehensiveAnalysis,
        selectedSkeleton,
        customDesignRequest,
        attempt + 1
      );
    }
    
    // Final failure
    return {
      success: false,
      error: 'Auto-continuation failed after multiple attempts',
      partialHtml: partialHtml,
      continuationAttempts: attempt
    };
  }
};

const getProjectImagesFromSheets = async (userEmail) => {
  try {
    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (!projectsTracker.initialized) {
      return { projectImages: [] };
    }

    const response = await projectsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A:P`,
    });

    const rows = response.data.values || [];
    const userProjects = rows
      .slice(1)
      .filter(row => row[1] === userEmail && row[12] === 'active');

    helperLogger.info(`📊 Found ${userProjects.length} active projects for ${userEmail}`);

    const projectImages = userProjects.map((row, projectIndex) => {
      // COMPLETE PROJECT DATA - including overview and all details
      const projectData = {
        projectId: row[2] || `project_${projectIndex}`,
        title: row[3] || 'Untitled Project',
        subtitle: row[4] || '', // Column E (index 4)
        overview: row[5] || '', // Column F (index 5) - THIS WAS MISSING!
        category: row[6] || '', // Column G (index 6)
        customCategory: row[7] || '', // Column H (index 7)
        tags: row[8] ? row[8].split(',').map(t => t.trim()).filter(Boolean) : [], // Column I (index 8)
        processImages: [],
        finalImages: [],
        createdAt: row[0] || new Date().toISOString(),
        
        // Add image counts for better organization
        processImageCount: 0,
        finalImageCount: 0
      };

      // Parse image metadata from Google Sheets
      const imageMetadataJson = row[11]; // Column L (index 11)
      if (imageMetadataJson) {
        try {
          const imageMetadata = JSON.parse(imageMetadataJson);
          
          // Process final images with enhanced metadata
          if (imageMetadata.finalImages && Array.isArray(imageMetadata.finalImages)) {
            projectData.finalImages = imageMetadata.finalImages.map((img, index) => ({
              ...img,
              url: img.url,
              displayOrder: index + 1,
              imageType: 'final',
              projectTitle: projectData.title
            }));
            projectData.finalImageCount = projectData.finalImages.length;
          }

          // Process process images with enhanced metadata
          if (imageMetadata.processImages && Array.isArray(imageMetadata.processImages)) {
            projectData.processImages = imageMetadata.processImages.map((img, index) => ({
              ...img,
              url: img.url,
              displayOrder: index + 1,
              imageType: 'process',
              projectTitle: projectData.title
            }));
            projectData.processImageCount = projectData.processImages.length;
          }
        } catch (error) {
          helperLogger.warn(`⚠️ Error parsing image metadata for project ${projectData.title}:`, error.message);
        }
      }

      helperLogger.info(`✅ Project "${projectData.title}": ${projectData.processImageCount} process + ${projectData.finalImageCount} final images`);
      helperLogger.info(`📝 Overview: ${projectData.overview ? 'Present' : 'Missing'}`);

      return projectData;
    });

    // Enhanced return object with better organization
    return { 
      projectImages,
      totalProjects: projectImages.length,
      totalImages: projectImages.reduce((sum, project) => 
        sum + project.processImageCount + project.finalImageCount, 0),
      projectSummary: projectImages.map(p => ({
        title: p.title,
        hasOverview: !!p.overview,
        imageCount: p.processImageCount + p.finalImageCount
      }))
    };
  } catch (error) {
    helperLogger.error('❌ Error fetching complete project data:', error);
    return { projectImages: [] };
  }
};

const updateHtmlWithProjectImages = (html, completeProjectData) => {
  let updatedHtml = html;
  
  if (!completeProjectData || !completeProjectData.projectImages) {
    helperLogger.info('⚠️ No complete project data available for HTML update');
    return updatedHtml;
  }

  const projects = completeProjectData.projectImages;
  helperLogger.info(`🔄 Updating HTML with ${projects.length} projects containing ${completeProjectData.totalImages || 0} images`);

  // 🚨 CRITICAL FIX: Clean up navigation and emoji issues FIRST (existing code)
  try {
    // Navigation fixes (keep existing code)
    const problematicPatterns = [
      /href=["']\/dashboard["']/gi,
      /href=["']\/works["']/gi,
      /href=["']\/projects["']/gi,
      /href=["']\/portfolio["']/gi,
      /href=["']\/about["']/gi,
      /href=["']\/contact["']/gi,
      /href=["']\#dashboard["']/gi,
      /href=["']\#works["']/gi
    ];
    
    problematicPatterns.forEach(pattern => {
      updatedHtml = updatedHtml.replace(pattern, 'href="#projects"');
    });
    
    // Remove floating emoji animations (keep existing code)
    const emojiPatterns = [
      /@keyframes\s+[^{]*emoji[^}]*\{[^}]+\}/gi,
      /animation[^;]*emoji[^;]*;/gi,
      /\.floating-emoji[^}]*\{[^}]+\}/gi,
      /\.emoji-rain[^}]*\{[^}]+\}/gi,
      /<div[^>]*class="[^"]*floating[^"]*emoji[^"]*"[^>]*>.*?<\/div>/gi
    ];
    
    emojiPatterns.forEach(pattern => {
      updatedHtml = updatedHtml.replace(pattern, '');
    });
    
    // JavaScript fixes (keep existing code)
    updatedHtml = updatedHtml.replace(
      /window\.location\s*=\s*["'][^"']*["']/gi, 
      '// navigation disabled'
    );
    
    updatedHtml = updatedHtml.replace(
      /location\.href\s*=\s*["'][^"']*["']/gi, 
      '// navigation disabled'
    );
    
    // Add base target (keep existing code)
    if (!updatedHtml.includes('<base') && updatedHtml.includes('<head>')) {
      updatedHtml = updatedHtml.replace(
        '<head>', 
        '<head>\n<base target="_parent">'
      );
    }
    
    helperLogger.info('✅ Applied navigation and emoji fixes');
  } catch (error) {
    helperLogger.warn('⚠️ Failed to apply navigation/emoji fixes:', error);
  }

  // 🚨 COMPLETELY REWRITTEN IMAGE REPLACEMENT SYSTEM
  const imageReplacements = new Map();
  let replacementCount = 0;
  
  // Step 1: Build comprehensive replacement map
  projects.forEach((project, projectIndex) => {
    helperLogger.info(`📝 Processing project ${projectIndex + 1}: "${project.title}"`);
    helperLogger.info(`   Overview: ${project.overview ? 'Present ✅' : 'Missing ❌'}`);
    helperLogger.info(`   Images: ${project.finalImageCount || 0} final + ${project.processImageCount || 0} process`);
    
    // === FINAL IMAGES ===
    if (project.finalImages && project.finalImages.length > 0) {
      project.finalImages.forEach((image, imageIndex) => {
        if (!image.url) return;
        
        // Clean the URL to ensure it's properly formatted
        const cleanUrl = image.url.trim();
        helperLogger.info(`🖼️ Final image ${imageIndex + 1}: ${cleanUrl}`);
        
        // Create SPECIFIC, NON-OVERLAPPING patterns for this exact image
        const specificPatterns = [
          // Project-specific patterns with exact indices
          `project_${projectIndex + 1}_final_${imageIndex + 1}`,
          `${project.projectId}_final_${imageIndex + 1}`,
          `final_${projectIndex + 1}_${imageIndex + 1}`,
          `project${projectIndex + 1}_final${imageIndex + 1}`,
          
          // Generic patterns that should ONLY match placeholders, not existing URLs
          `final_${imageIndex + 1}.jpg`,
          `final_${imageIndex + 1}.png`,
          `final_${imageIndex + 1}.jpeg`,
          `final_${imageIndex + 1}.webp`,
          `final_${imageIndex + 1}.gif`,
          
          // Placeholder patterns
          `placeholder_final_${imageIndex + 1}`,
          `FINAL_IMAGE_${imageIndex + 1}`,
          `[FINAL_${imageIndex + 1}]`
        ];
        
        specificPatterns.forEach(pattern => {
          imageReplacements.set(pattern, {
            url: cleanUrl,
            type: 'final',
            project: project.title,
            imageIndex: imageIndex + 1,
            projectIndex: projectIndex + 1
          });
        });
      });
    }
    
    // === PROCESS IMAGES ===
    if (project.processImages && project.processImages.length > 0) {
      project.processImages.forEach((image, imageIndex) => {
        if (!image.url) return;
        
        const cleanUrl = image.url.trim();
        helperLogger.info(`📷 Process image ${imageIndex + 1}: ${cleanUrl}`);
        
        const specificPatterns = [
          `project_${projectIndex + 1}_process_${imageIndex + 1}`,
          `${project.projectId}_process_${imageIndex + 1}`,
          `process_${projectIndex + 1}_${imageIndex + 1}`,
          `project${projectIndex + 1}_process${imageIndex + 1}`,
          
          `process_${imageIndex + 1}.jpg`,
          `process_${imageIndex + 1}.png`,
          `process_${imageIndex + 1}.jpeg`,
          `process_${imageIndex + 1}.webp`,
          `process_${imageIndex + 1}.gif`,
          
          `placeholder_process_${imageIndex + 1}`,
          `PROCESS_IMAGE_${imageIndex + 1}`,
          `[PROCESS_${imageIndex + 1}]`
        ];
        
        specificPatterns.forEach(pattern => {
          imageReplacements.set(pattern, {
            url: cleanUrl,
            type: 'process',
            project: project.title,
            imageIndex: imageIndex + 1,
            projectIndex: projectIndex + 1
          });
        });
      });
    }
    
    // === PROJECT METADATA REPLACEMENTS ===
    const metadataReplacements = [
      {
        pattern: `[PROJECT_${projectIndex + 1}_TITLE]`,
        replacement: project.title,
        type: 'title'
      },
      {
        pattern: `[PROJECT_${projectIndex + 1}_SUBTITLE]`,
        replacement: project.subtitle || '',
        type: 'subtitle'
      },
      {
        pattern: `[PROJECT_${projectIndex + 1}_OVERVIEW]`,
        replacement: project.overview || 'This project showcases creative work and innovative solutions.',
        type: 'overview'
      },
      {
        pattern: `[PROJECT_${projectIndex + 1}_CATEGORY]`,
        replacement: project.category || project.customCategory || '',
        type: 'category'
      },
      {
        pattern: `[PROJECT_${projectIndex + 1}_TAGS]`,
        replacement: project.tags ? project.tags.join(', ') : '',
        type: 'tags'
      }
    ];
    
    metadataReplacements.forEach(meta => {
      imageReplacements.set(meta.pattern, {
        url: meta.replacement,
        type: meta.type,
        project: project.title,
        projectIndex: projectIndex + 1
      });
    });
  });
  
  // Step 2: Apply replacements using EXACT string matching (not regex)
  helperLogger.info(`🔄 Applying ${imageReplacements.size} specific replacements...`);
  
  imageReplacements.forEach((replacement, pattern) => {
    const beforeLength = updatedHtml.length;
    
    // Use simple string replacement for exact matches only
    if (updatedHtml.includes(pattern)) {
      updatedHtml = updatedHtml.split(pattern).join(replacement.url);
      const afterLength = updatedHtml.length;
      
      if (beforeLength !== afterLength) {
        replacementCount++;
        helperLogger.info(`✅ Replaced ${replacement.type} for "${replacement.project}" (${pattern} → URL)`);
      }
    }
  });
  
  // Step 3: Safety replacements for any remaining placeholders
  const safetyReplacements = [
    {
      // Remove any remaining file path references that might cause issues
      pattern: /src=["'](?:\.\/)?(?:uploads\/|temp\/)[^"']*\.(?:jpg|jpeg|png|gif|webp)["']/gi,
      replacement: 'src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\' viewBox=\'0 0 400 300\'%3E%3Crect fill=\'%23f0f0f0\' width=\'400\' height=\'300\'/%3E%3Ctext fill=\'%23999\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3EProject Image%3C/text%3E%3C/svg%3E"'
    },
    {
      // Clean up any remaining project overview placeholders
      pattern: /\[PROJECT_\d+_OVERVIEW\]/gi,
      replacement: 'This project showcases creative work and innovative solutions.'
    },
    {
      // Fix generic alt text
      pattern: /alt=["']Project Image["']/gi,
      replacement: 'alt="Creative project showcase"'
    }
  ];

  safetyReplacements.forEach(({pattern, replacement}) => {
    const beforeLength = updatedHtml.length;
    updatedHtml = updatedHtml.replace(pattern, replacement);
    const afterLength = updatedHtml.length;
    
    if (beforeLength !== afterLength) {
      helperLogger.info('🛡️ Applied safety replacement');
    }
  });

  // Step 4: Validation and logging
  const finalImageCount = (updatedHtml.match(/https:\/\/res\.cloudinary\.com/gi) || []).length;
  helperLogger.info(`📊 Final HTML contains ${finalImageCount} Cloudinary image references`);
  helperLogger.info(`🔄 Applied ${replacementCount} total replacements`);
  
  // Check for any corrupted URLs (nested cloudinary URLs)
  const corruptedUrls = updatedHtml.match(/https:\/\/res\.cloudinary\.com[^"']*https:\/\/res\.cloudinary\.com/gi);
  if (corruptedUrls && corruptedUrls.length > 0) {
    helperLogger.error(`❌ DETECTED ${corruptedUrls.length} CORRUPTED NESTED URLS!`);
    corruptedUrls.forEach((url, index) => {
      helperLogger.error(`   ${index + 1}. ${url.substring(0, 100)}...`);
    });
  } else {
    helperLogger.info('✅ No corrupted nested URLs detected');
  }
  
  // Verify project overviews are integrated
  projects.forEach((project, index) => {
    if (project.overview) {
      const overviewExists = updatedHtml.includes(project.overview.substring(0, 50));
      helperLogger.info(`📝 Project "${project.title}" overview integrated: ${overviewExists ? '✅' : '❌'}`);
    }
  });

  return updatedHtml;
};

module.exports = {
  processContinuationRequest,
  processAutoContinuation,
  getProjectImagesFromSheets,
  updateHtmlWithProjectImages
};

