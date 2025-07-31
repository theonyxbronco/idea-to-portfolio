const imageParser = require('./imageParser');
const fs = require('fs-extra');

class PromptGenerator {
  constructor() {
    this.basePrompt = `You are an expert web designer creating visually-driven portfolio websites. Generate a SINGLE HTML file with embedded CSS/JS that is COMPLETELY DRIVEN by the provided images and user data.

CRITICAL PHILOSOPHY: THE MOODBOARD IMAGES ARE YOUR DESIGN DNA
- You can SEE the actual moodboard images provided - analyze them directly
- Extract colors, layouts, typography styles, and aesthetic patterns from what you see
- The portfolio should look like it was born from these visual references
- Combine the visual inspiration with the user's personal/project data

STRUCTURE ANALYSIS PRIORITY:
1. **PRIMARY**: If moodboard images show clear website layouts, navigation patterns, or section structures, EXTRACT and IMPLEMENT those structural elements
2. **SECONDARY**: If no clear website structure is visible in moodboard, use the fallback sections listed below

TECHNICAL REQUIREMENTS:
- Single HTML file with embedded styles/scripts - NO separate files
- Fully responsive (mobile, tablet, desktop)
- Modern CSS features (Grid, Flexbox, CSS Variables)
- Smooth animations/interactions
- High performance and accessibility
- Use client's actual project images from Google Sheets when provided

WORKFLOW:
1. ANALYZE the moodboard images I'm showing you for BOTH visual style AND structural patterns
2. EXTRACT design patterns, colors, typography, layouts, navigation styles, content organization
3. COMBINE with user data and project images from sheets to create personalized portfolio
4. GENERATE complete HTML with embedded CSS/JS`;
  }

  /**
   * Generate message array for Anthropic with moodboard images and project images from sheets
   * @param {Object} portfolioData - User portfolio data
   * @param {Object} projectImages - Project images from Google Sheets (format: {projectImages: []})
   * @param {string} designStyle - Fallback design style
   * @param {Object} moodboardAnalysis - Optional analysis results from moodboard
   * @returns {Array} - Message array for Anthropic API
   */
  async generateAnthropicMessages(portfolioData, projectImages, designStyle = 'modern', moodboardAnalysis = null) {
    console.log('🎨 Generating Anthropic messages with project-specific image handling...');
    
    const messages = [];
    let textContent = this.basePrompt;

    // Enhanced structure analysis instructions
    textContent += '\n\n' + this.generateStructureAnalysisInstructions();

    // Add user data to text content
    textContent += '\n\n' + this.generateUserDataSection(portfolioData, designStyle);

    // Prepare content array (text + images)
    const contentArray = [
      {
        type: "text",
        text: textContent
      }
    ];

    // Add moodboard analysis if available
    if (moodboardAnalysis) {
      if (moodboardAnalysis.structureAnalysis) {
        contentArray.push({
          type: "text",
          text: `\n🏗️ COMPUTER VISION STRUCTURE ANALYSIS:\n${JSON.stringify(moodboardAnalysis.structureAnalysis, null, 2)}\n\nUse this analysis to inform the layout structure.`
        });
      }
    }

    // Add project-specific images from Google Sheets
    this.addProjectSpecificImages(contentArray, projectImages, portfolioData);

    // Add final instructions
    const structureAnalysis = moodboardAnalysis?.structureAnalysis;
    contentArray.push({
      type: "text",
      text: this.generateFinalInstructions(portfolioData, projectImages, structureAnalysis)
    });

    messages.push({
      role: "user",
      content: contentArray
    });

    return messages;
  }

  /**
   * SEPARATE METHOD: Add moodboard images to content array for AI analysis only
   * This is called separately in the main handler when moodboard files are uploaded
   * @param {Array} contentArray - Content array to add to
   * @param {Array} moodboardFiles - Array of uploaded moodboard files
   * @returns {Promise<void>}
   */
  async addMoodboardImagesToContent(contentArray, moodboardFiles) {
    if (!moodboardFiles || moodboardFiles.length === 0) return;

    console.log(`🖼️ Adding ${moodboardFiles.length} moodboard images for Claude to analyze...`);
    
    for (const [index, file] of moodboardFiles.entries()) {
      try {
        // Convert file buffer to base64 for Claude
        const base64Image = file.buffer.toString('base64');
        const mediaType = this.getMediaTypeFromMimetype(file.mimetype);
        
        contentArray.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64Image
          }
        });

        console.log(`✅ Added moodboard image ${index + 1}: ${file.originalname}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load moodboard image ${index + 1}:`, error.message);
      }
    }

    // Enhanced moodboard analysis instructions
    contentArray.push({
      type: "text",
      text: this.generateEnhancedMoodboardInstructions(moodboardFiles.length)
    });
  }

  /**
   * Generate structure analysis instructions
   */
  generateStructureAnalysisInstructions() {
    return `
🏗️ MOODBOARD STRUCTURE ANALYSIS INSTRUCTIONS:

Look for these structural elements in the uploaded images:
- **Navigation styles** (top nav, side nav, hamburger, sticky headers, floating menus)
- **Page layout patterns** (single page scroll, multi-page, card layouts, masonry grids, split layouts)
- **Content organization** (how information is grouped, hierarchy, flow patterns)
- **Section types** (hero styles, about layouts, portfolio grids, contact forms, testimonials, etc.)
- **Interactive elements** (buttons, forms, galleries, sliders, animations, hover effects)
- **Unique layout concepts** (split screens, overlapping sections, unconventional flows, parallax, etc.)

### STRUCTURAL APPROACH:
**IF** you identify clear website structure patterns from the moodboard images:
- ✅ Implement those specific structural elements
- ✅ Adapt the layout to match the discovered patterns
- ✅ Use innovative section organization inspired by the moodboard
- ✅ Extract navigation styles, content hierarchies, and unique layout concepts

**ELSE** (FALLBACK - only if no clear structure is found in moodboard):
Use these standard sections:
- Hero/Introduction
- About section with bio and skills
- Project portfolio with the provided projects
- Contact information with social links`;
  }

  /**
   * Generate enhanced moodboard instructions
   */
  generateEnhancedMoodboardInstructions(imageCount, structureAnalysis = null) {
    let instructions = `\n🎨 ENHANCED MOODBOARD ANALYSIS INSTRUCTIONS:
I've provided ${imageCount} moodboard images above. Please:

1. **STRUCTURE ANALYSIS** (Primary Priority):
   - Examine each image for website layouts, UI patterns, and structural elements
   - Look for navigation styles, content organization, and section layouts
   - Identify unique layout concepts beyond standard portfolio structures
   - Extract specific patterns for content hierarchy and flow

2. **VISUAL ANALYSIS** (Secondary):
   - Color palettes and schemes
   - Typography styles and treatments
   - Visual hierarchy and spacing
   - Overall aesthetic mood and vibe

3. **IMPLEMENTATION STRATEGY**:`;

    if (structureAnalysis && structureAnalysis.hasStructuralElements) {
      instructions += `
   - **DETECTED STRUCTURAL PATTERNS**: Use the computer vision analysis provided above
   - **PRIMARY APPROACH**: Implement the detected layout patterns instead of standard sections
   - **CONFIDENCE LEVEL**: ${Math.round(structureAnalysis.averageConfidence * 100)}% - ${structureAnalysis.averageConfidence > 0.5 ? 'HIGH' : 'MEDIUM'} confidence in structural detection
   - **SUMMARY**: ${structureAnalysis.summary}`;
    } else {
      instructions += `
   - **NO CLEAR STRUCTURE DETECTED**: Use fallback standard sections
   - **FALLBACK APPROACH**: Implement Hero → About → Projects → Contact structure
   - **FOCUS**: Apply moodboard visual aesthetics to standard layout`;
    }

    instructions += `

4. **CREATIVE INTEGRATION**:
   - The portfolio should look like it was designed by someone who created these moodboard images
   - Match the exact aesthetic, color schemes, and design patterns
   - Create a cohesive visual experience that feels authentic to the moodboard

### Example Structure Extraction:
*If moodboard shows a split-screen layout with vertical navigation:*
- Implement split-screen design with left sidebar navigation
- Place hero content on the right panel
- Create project showcase as full-width overlays
- Position contact as floating elements

*If moodboard shows card-based layouts:*
- Design each section as distinct cards
- Implement card hover effects and transitions
- Create portfolio as interactive card grid
- Use card metaphor for contact information

*If moodboard shows masonry/Pinterest-style layouts:*
- Create dynamic grid layouts with varying heights
- Implement masonry-style project gallery
- Use asymmetrical content placement
- Add smooth scroll animations and hover effects

**IMPORTANT**: The moodboard images are for inspiration only - DO NOT include them in the final HTML portfolio.`;

    return instructions;
  }

  /**
   * Add project-specific images from Google Sheets to content array
   * @param {Array} contentArray - Content array to add to
   * @param {Object} projectImages - Project images from sheets (format: {projectImages: []})
   * @param {Object} portfolioData - Portfolio data for context
   */
  addProjectSpecificImages(contentArray, projectImages, portfolioData) {
    if (!projectImages || !projectImages.projectImages) {
      contentArray.push({
        type: "text",
        text: `\n📷 NO PROJECT IMAGES FOUND IN GOOGLE SHEETS
- Create placeholder project showcases that match the moodboard aesthetic
- Use CSS gradients, patterns, or design elements instead of missing images
- Focus on typography and layout design from the moodboard inspiration`
      });
      return;
    }

    const projects = projectImages.projectImages;
    
    if (projects.length === 0) {
      contentArray.push({
        type: "text",
        text: `\n📷 NO PROJECT IMAGES AVAILABLE
- Create design-focused portfolio sections without images
- Use moodboard aesthetic for visual interest through CSS styling`
      });
      return;
    }

    console.log(`📸 Adding images for ${projects.length} projects from Google Sheets...`);
    
    contentArray.push({
      type: "text",
      text: `\n📸 PROJECT-SPECIFIC IMAGES (${projects.length} projects from Google Sheets):

🚨 CRITICAL INSTRUCTION FOR URL USAGE:
- Each URL below belongs to a SPECIFIC project
- NEVER concatenate or combine URLs from different projects
- Use each URL exactly as provided - no modifications
- Each project section should only use its own project's URLs

PROJECTS AND THEIR IMAGES:`
    });

    projects.forEach((project, projectIndex) => {
      const totalProjectImages = project.processImages.length + project.finalImages.length;
      
      contentArray.push({
        type: "text",
        text: `

═══════════════════════════════════════════════════════════
PROJECT ${projectIndex + 1}: "${project.title}" 
PROJECT ID: ${project.projectId}
TOTAL IMAGES: ${totalProjectImages}
═══════════════════════════════════════════════════════════

🎯 FINAL IMAGES FOR "${project.title}" PROJECT:`
      });

      // Add final images for this project with clear separation
      if (project.finalImages.length > 0) {
        project.finalImages.forEach((image, imgIndex) => {
          contentArray.push({
            type: "text",
            text: `
FINAL IMAGE ${imgIndex + 1} for "${project.title}":
├── Filename: ${image.filename}
├── URL: ${image.url}
├── Dimensions: ${image.width}x${image.height} (${image.format})
├── Usage: USE ONLY in "${project.title}" project section
└── HTML Example: <img src="${image.url}" alt="${project.title} final result">

🚨 IMPORTANT: This URL (${image.url}) belongs ONLY to the "${project.title}" project.`
          });
        });
      } else {
        contentArray.push({
          type: "text",
          text: `
No final images available for "${project.title}"`
        });
      }

      contentArray.push({
        type: "text",
        text: `
📷 PROCESS IMAGES FOR "${project.title}" PROJECT:`
      });

      // Add process images for this project with clear separation
      if (project.processImages.length > 0) {
        project.processImages.forEach((image, imgIndex) => {
          contentArray.push({
            type: "text",
            text: `
PROCESS IMAGE ${imgIndex + 1} for "${project.title}":
├── Filename: ${image.filename}
├── URL: ${image.url}
├── Dimensions: ${image.width}x${image.height} (${image.format})
├── Usage: USE ONLY in "${project.title}" project section
└── HTML Example: <img src="${image.url}" alt="${project.title} process step ${imgIndex + 1}">

🚨 IMPORTANT: This URL (${image.url}) belongs ONLY to the "${project.title}" project.`
          });
        });
      } else {
        contentArray.push({
          type: "text",
          text: `
No process images available for "${project.title}"`
        });
      }

      if (projectIndex < projects.length - 1) {
        contentArray.push({
          type: "text",
          text: `\n═══════════════════════════════════════════════════════════\n`
        });
      }
    });

    // Add final comprehensive usage instructions
    contentArray.push({
      type: "text",
      text: `

🚨🚨🚨 CRITICAL IMAGE USAGE RULES - READ CAREFULLY 🚨🚨🚨

1. **ISOLATED USAGE**: Each project's images must ONLY appear in that project's section
2. **NO URL CONCATENATION**: Never combine or concatenate URLs from different projects
3. **EXACT URL USAGE**: Use each URL exactly as provided - copy and paste precisely
4. **PROJECT BOUNDARIES**: Respect project boundaries - don't mix images between projects
5. **ONE URL PER SRC**: Each img src attribute should contain exactly ONE URL

✅ CORRECT HTML EXAMPLES:
For "${projects[0]?.title || 'Project 1'}" section:
<img src="${projects[0]?.finalImages[0]?.url || 'PROJECT_1_URL_HERE'}" alt="${projects[0]?.title || 'Project 1'}">

For "${projects[1]?.title || 'Project 2'}" section:
<img src="${projects[1]?.finalImages[0]?.url || 'PROJECT_2_URL_HERE'}" alt="${projects[1]?.title || 'Project 2'}">

❌ WRONG EXAMPLES (DO NOT DO THIS):
<img src="${projects[0]?.finalImages[0]?.url || 'URL1'}${projects[1]?.finalImages[0]?.url || 'URL2'}" alt="Wrong">
<img src="CONCATENATED_URL_STRING" alt="Wrong">

📋 PROJECT SUMMARY:
${projects.map((project, index) => 
  `${index + 1}. "${project.title}" → ${project.finalImages.length} final + ${project.processImages.length} process images`
).join('\n')}

🎯 IMPLEMENTATION STRATEGY:
- Create separate portfolio sections for each project
- Each section displays only that project's images
- Use the provided URLs exactly as given
- Implement project-specific galleries or showcases
- Maintain clear visual separation between projects`
    });
  }

  /**
   * Generate user data section
   */
  generateUserDataSection(portfolioData, designStyle) {
    return `
👤 USER PORTFOLIO DATA:

PERSONAL INFO:
- Name: ${portfolioData.personalInfo.name}
- Title: ${portfolioData.personalInfo.title}
- Bio: "${portfolioData.personalInfo.bio || 'Creative professional'}"
- Email: ${portfolioData.personalInfo.email || ''}
- Social Links: ${[
      portfolioData.personalInfo.website,
      portfolioData.personalInfo.linkedin,
      portfolioData.personalInfo.instagram,
      portfolioData.personalInfo.behance,
      portfolioData.personalInfo.dribbble
    ].filter(Boolean).join(' | ')}

PROJECTS (${portfolioData.projects?.length || 0}):
${portfolioData.projects?.map((project, index) => `
${index + 1}. ${project.title}
   - Overview: ${project.overview || project.description || 'Creative project'}
   - Category: ${project.category || project.customCategory || 'Design'}
   - Tags: ${project.tags?.join(', ') || 'creative, design'}
   ${project.problem ? `- Problem: ${project.problem}` : ''}
   ${project.solution ? `- Solution: ${project.solution}` : ''}
   ${project.reflection ? `- Reflection: ${project.reflection}` : ''}
`).join('') || 'No projects provided - create sample projects that match the moodboard aesthetic'}

SKILLS: ${portfolioData.personalInfo.skills?.join(', ') || 'Creative skills matching the visual style'}

STYLE PREFERENCES:
- Color Scheme: ${portfolioData.stylePreferences?.colorScheme || 'Extract from moodboard'}
- Layout: ${portfolioData.stylePreferences?.layoutStyle || 'Extract from moodboard'}
- Typography: ${portfolioData.stylePreferences?.typography || 'Extract from moodboard'}
- Mood: ${portfolioData.stylePreferences?.mood || designStyle}`;
  }

  /**
   * Generate final instructions - Updated for project-specific images
   */
  generateFinalInstructions(portfolioData, projectImages, structureAnalysis) {
    const projects = projectImages?.projectImages || [];
    const totalImages = projects.reduce((sum, project) => 
      sum + project.processImages.length + project.finalImages.length, 0);
    
    const creativeEmojis = ['🎨', '✨', '🚀', '💫', '🎯', '💡', '🌟', '🎪', '🎭', '🖌️'];
    const randomEmoji = creativeEmojis[Math.floor(Math.random() * creativeEmojis.length)];

    let instructions = `
🎯 FINAL INSTRUCTIONS:

DESIGN PROCESS:`;

    if (structureAnalysis && structureAnalysis.hasStructuralElements) {
      instructions += `
1. **STRUCTURE FIRST**: Implement the detected layout patterns from the moodboard analysis
2. **PROJECT SECTIONS**: Create dedicated sections for each project with its specific images
3. **VISUAL INTEGRATION**: Apply the moodboard's visual aesthetics to the detected structure
4. **CONTENT ADAPTATION**: Fit the user's personal info and project-specific content into the discovered layout pattern`;
    } else {
      instructions += `
1. **FALLBACK STRUCTURE**: Use standard Hero → About → Projects → Contact sections
2. **PROJECT ORGANIZATION**: Create individual project showcases with their specific images
3. **VISUAL ENHANCEMENT**: Apply the moodboard's visual aesthetics to the standard structure
4. **AESTHETIC MATCHING**: Extract colors, typography, and design patterns from moodboard`;
    }

    instructions += `

🖼️ PROJECT-SPECIFIC IMAGE USAGE:
- **TOTAL PROJECTS WITH IMAGES**: ${projects.length}
- **TOTAL IMAGES AVAILABLE**: ${totalImages} (distributed across projects)
- **PROJECT BREAKDOWN**:
${projects.map((project, index) => 
  `  ${index + 1}. "${project.title}": ${project.processImages.length} process + ${project.finalImages.length} final`
).join('\n') || '  No projects with images found'}

🔗 **CRITICAL IMAGE URL USAGE**:
- Use ONLY the specific URLs provided for each project
- Each image belongs to a specific project - maintain this association
- URLs are from Google Sheets and optimized for web delivery
- DO NOT use project images outside their designated project sections

📸 **PROJECT-SPECIFIC INTEGRATION STRATEGY**:
${projects.map((project, index) => {
  const hasProcess = project.processImages.length > 0;
  const hasFinal = project.finalImages.length > 0;
  
  let strategy = `\n   PROJECT: "${project.title}"`;
  if (hasFinal) {
    strategy += `\n   - Final images: Feature as main project showcase/hero`;
  }
  if (hasProcess) {
    strategy += `\n   - Process images: Show in development/behind-the-scenes section`;
  }
  return strategy;
}).join('\n') || '\n   No project-specific images to integrate'}

STRUCTURE PRIORITY:
${structureAnalysis && structureAnalysis.hasStructuralElements ? 
  '✅ PRIMARY: Use detected structural patterns from moodboard' : 
  '⚠️ FALLBACK: Use standard sections (no clear structure detected)'}

TECHNICAL REQUIREMENTS:
- Responsive design (mobile-first)
- Fast loading and accessible
- **IMPORTANT**: Use project-specific image URLs exactly as provided
- Embed all CSS and JavaScript inline
- Modern web standards (CSS Grid, Flexbox, semantic HTML)
- Smooth scrolling and hover effects
- Image lazy loading where appropriate

MANDATORY FOOTER:
"© ${new Date().getFullYear()} ${portfolioData.personalInfo.name} — product of Interract Agency. All rights reserved. ${randomEmoji}"

CRITICAL SUCCESS METRICS:
✅ Portfolio structure matches ${structureAnalysis && structureAnalysis.hasStructuralElements ? 'detected moodboard patterns' : 'fallback sections with moodboard aesthetics'}
✅ Colors and typography match the moodboard aesthetic exactly
✅ Layout patterns reflect the moodboard compositions
✅ All user data is integrated seamlessly
✅ **PROJECT IMAGES ARE USED IN THEIR CORRECT PROJECT SECTIONS ONLY**
✅ Each project has its own dedicated section with its specific images
✅ No cross-contamination of images between projects
✅ Images display correctly from their Google Sheets URLs
✅ Design is responsive and accessible
✅ Single HTML file with embedded styles`;

    if (totalImages > 0) {
      instructions += `

🚨 **PROJECT IMAGE VERIFICATION**:
Total project images available: ${totalImages}
${projects.map((project, index) => 
  `Project ${index + 1} "${project.title}": ${project.processImages.length + project.finalImages.length} images`
).join('\n')}`;
    } else {
      instructions += `

⚠️ **NO PROJECT IMAGES AVAILABLE**:
- Create visually stunning portfolio using moodboard-inspired design elements
- Use CSS gradients, shapes, and typography to create visual interest
- Focus on layout and aesthetic matching the moodboard inspiration`;
    }

    instructions += `

RESPONSE FORMAT REQUIREMENTS:
🚨 CRITICAL: Your response must contain ONLY the HTML code - nothing else.
- NO explanations before the HTML
- NO comments or descriptions after the HTML
- NO markdown code blocks (do not wrap in triple backticks)
- NO "Here's your portfolio:" or similar text
- START immediately with <!DOCTYPE html>
- END immediately with </html>
- PURE HTML ONLY - any additional text will break the system

Generate the complete portfolio HTML now.`;

    return instructions;
  }

  /**
   * Get media type from mimetype
   */
  getMediaTypeFromMimetype(mimetype) {
    const mediaTypes = {
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/png': 'image/png',
      'image/gif': 'image/gif',
      'image/webp': 'image/webp'
    };
    return mediaTypes[mimetype] || 'image/jpeg';
  }

  /**
   * Get media type from file path
   */
  getMediaType(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    const mediaTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mediaTypes[ext] || 'image/jpeg';
  }

  /**
   * Legacy method updated for project-specific images
   */
  async generateStyledPrompt(portfolioData, projectImages, designStyle = 'modern', moodboardAnalysis = null) {
    console.log('⚠️ Using legacy text-only prompt with project-specific image support');
    
    let prompt = this.basePrompt;
    
    // Add structure analysis instructions
    prompt += '\n\n' + this.generateStructureAnalysisInstructions();
    
    // Add moodboard analysis if available
    if (moodboardAnalysis) {
      prompt += `\n\n🖼️ MOODBOARD ANALYSIS RESULTS:`;
      
      if (moodboardAnalysis.structureAnalysis) {
        const analysis = moodboardAnalysis.structureAnalysis;
        prompt += `\n\nSTRUCTURE ANALYSIS:\n${analysis.summary || 'Structure analysis completed'}`;
        
        if (analysis.hasStructuralElements) {
          prompt += `\n\n🏗️ DETECTED STRUCTURE PATTERNS - USE THESE INSTEAD OF STANDARD SECTIONS:`;
          prompt += `\nConfidence: ${Math.round(analysis.averageConfidence * 100)}%`;
          if (analysis.commonPatterns) {
            const patterns = analysis.commonPatterns;
            if (patterns.navigationStyles) prompt += `\nNavigation: ${patterns.navigationStyles}`;
            if (patterns.layoutTypes) prompt += `\nLayout: ${patterns.layoutTypes}`;
            if (patterns.gridStyles) prompt += `\nGrid: ${patterns.gridStyles}`;
          }
        } else {
          prompt += `\n\n⚠️ NO CLEAR STRUCTURE DETECTED - USE FALLBACK SECTIONS`;
        }
      }

      if (moodboardAnalysis.aiPromptInsights) {
        prompt += `\n\nVISUAL INSIGHTS:\n${moodboardAnalysis.aiPromptInsights}`;
      }
    }

    // Add project-specific image information
    const projects = projectImages?.projectImages || [];
    const totalImages = projects.reduce((sum, project) => 
      sum + project.processImages.length + project.finalImages.length, 0);

    if (totalImages > 0) {
      prompt += `\n\n🔗 PROJECT-SPECIFIC IMAGE URLS:`;
      projects.forEach((project, index) => {
        prompt += `\n\nPROJECT ${index + 1}: "${project.title}"`;
        
        project.finalImages.forEach((img, imgIndex) => {
          prompt += `\n  FINAL ${imgIndex + 1}: ${img.url} (${img.filename}) - USE IN "${project.title}" SECTION ONLY`;
        });
        
        project.processImages.forEach((img, imgIndex) => {
          prompt += `\n  PROCESS ${imgIndex + 1}: ${img.url} (${img.filename}) - USE IN "${project.title}" SECTION ONLY`;
        });
      });
      
      prompt += `\n\n**CRITICAL**: Each project's images must ONLY be used in that project's section. Don't mix images between projects or use in general sections.`;
    } else {
      prompt += `\n\n⚠️ NO PROJECT IMAGES AVAILABLE - Create visually stunning design using moodboard inspiration only`;
    }
    
    prompt += '\n\n' + this.generateUserDataSection(portfolioData, designStyle);
    
    // Add response format requirements
    prompt += `\n\nRESPONSE FORMAT REQUIREMENTS:
🚨 CRITICAL: Your response must contain ONLY the HTML code - nothing else.
- NO explanations before the HTML
- NO comments or descriptions after the HTML
- NO markdown code blocks (\`\`\`html or \`\`\`)
- NO "Here's your portfolio:" or similar text
- START immediately with <!DOCTYPE html>
- END immediately with </html>
- PURE HTML ONLY - any additional text will break the system`;
    
    const structureAnalysis = moodboardAnalysis?.structureAnalysis;
    prompt += '\n\n' + this.generateFinalInstructions(portfolioData, projectImages, structureAnalysis);
    
    return prompt;
  }
}

module.exports = new PromptGenerator();