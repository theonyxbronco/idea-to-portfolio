const fs = require('fs-extra');

class PromptGenerator {
  constructor() {
    this.systemPrompts = {
      base: `You are an elite AI design system with surgical precision for creating portfolios. You have been provided with multiple intelligence layers that create a complete picture of what the user needs.

CRITICAL PHILOSOPHY: You are not just generating a portfolio - you are creating a design that feels like it was custom-made by an expert who:
1. ✨ Created the moodboard images themselves (perfect aesthetic match)
2. 🎯 Understands exactly what type of content the user has (content strategy)  
3. 🏭 Has deep expertise in the user's specific industry (industry intelligence)
4. 📸 Knows precisely how to showcase each project's story (project intelligence)

This is not a template - this is bespoke design intelligence.`,

      responseFormat: `🚨 CRITICAL RESPONSE FORMAT:
- Your response must contain ONLY the HTML code
- NO explanations, comments, or descriptions
- NO markdown code blocks (\`\`\`html)
- NO "Here's your portfolio:" or similar text
- START immediately with <!DOCTYPE html>
- END immediately with </html>
- PURE HTML ONLY - any additional text will break the system`
    };

    this.strategyTemplates = {
      'showcase-heavy': {
        focus: 'Detailed project storytelling with rich case studies',
        structure: 'Expandable case study cards with process documentation',
        contentRatio: '60% project details, 40% visual design',
        interactionStyle: 'Detailed exploration with smooth transitions'
      },
      'visual-first': {
        focus: 'Images as primary storytelling device',
        structure: 'Gallery-driven layout with minimal text overlays',
        contentRatio: '80% visual content, 20% essential text',
        interactionStyle: 'Image-focused interactions and hover effects'
      },
      'story-driven': {
        focus: 'Narrative-based project presentation',
        structure: 'Text-heavy sections with supporting imagery',
        contentRatio: '70% written content, 30% supporting visuals',
        interactionStyle: 'Reading-focused with clear typography hierarchy'
      },
      'design-focused': {
        focus: 'Aesthetic execution matching moodboard precisely',
        structure: 'Design-driven layout with generated content',
        contentRatio: '50% design elements, 50% curated content',
        interactionStyle: 'Style-showcase with smooth animations'
      }
    };
  }

  /**
   * Generate messages for Anthropic API using the INSANE analysis results
   */
  async generateInsaneAnthropicMessages(portfolioData, projectImages, insaneAnalysis, moodboardFiles = []) {
    console.log('🚀 Generating INSANE Anthropic messages...');
    
    const messages = [];
    const contentArray = [
      {
        type: "text", 
        text: this.systemPrompts.base
      }
    ];

    // Add the assembled intelligent prompt from INSANE analysis
    if (insaneAnalysis.intelligentPrompt) {
      contentArray.push({
        type: "text",
        text: insaneAnalysis.intelligentPrompt.assembledPrompt
      });
    }

    // Add moodboard images for Claude to see
    if (moodboardFiles && moodboardFiles.length > 0) {
      await this.addMoodboardImagesToContent(contentArray, moodboardFiles);
    }

    // Add comprehensive user data
    contentArray.push({
      type: "text",
      text: this.generateComprehensiveUserData(portfolioData, projectImages, insaneAnalysis)
    });

    // Add intelligence summary for Claude's reference
    contentArray.push({
      type: "text",
      text: this.generateIntelligenceSummary(insaneAnalysis)
    });

    // Add project-specific implementation guide
    contentArray.push({
      type: "text",
      text: this.generateProjectImplementationGuide(projectImages, insaneAnalysis.analysisLevels.contentQuality)
    });

    // Add final execution instructions
    contentArray.push({
      type: "text",
      text: this.generateFinalExecutionInstructions(insaneAnalysis)
    });

    // Add response format requirements
    contentArray.push({
      type: "text",
      text: this.systemPrompts.responseFormat
    });

    messages.push({
      role: "user",
      content: contentArray
    });

    return messages;
  }

  /**
   * Add moodboard images to content array
   */
  async addMoodboardImagesToContent(contentArray, moodboardFiles) {
    if (!moodboardFiles || moodboardFiles.length === 0) return;

    console.log(`🖼️ Adding ${moodboardFiles.length} moodboard images for Claude to analyze...`);
    
    contentArray.push({
      type: "text",
      text: `\n🎨 MOODBOARD ANALYSIS INSTRUCTIONS:
I'm providing you with ${moodboardFiles.length} moodboard images. These represent the EXACT aesthetic the portfolio must match.

CRITICAL ANALYSIS TASKS:
1. **VISUAL DNA EXTRACTION**: Identify the precise design patterns, color schemes, typography styles, and layout principles
2. **STRUCTURAL PATTERNS**: Look for website layouts, navigation styles, content organization, and unique design elements
3. **AESTHETIC SIGNATURES**: Find the distinctive visual elements that make this style unique
4. **IMPLEMENTATION STRATEGY**: Determine how to authentically recreate this aesthetic in the portfolio

The portfolio must look like it was designed by the same person who created these moodboard references.`
    });

    for (const [index, file] of moodboardFiles.entries()) {
      try {
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
  }

  /**
   * Generate comprehensive user data section
   */
  generateComprehensiveUserData(portfolioData, projectImages, insaneAnalysis) {
    const projects = projectImages?.projectImages || [];
    const totalImages = projects.reduce((sum, p) => 
      sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0);

    return `
📊 COMPREHENSIVE USER DATA:

🧑‍💼 PERSONAL INFORMATION:
- Name: ${portfolioData.personalInfo.name}
- Professional Title: ${portfolioData.personalInfo.title}
- Bio: "${portfolioData.personalInfo.bio || 'Creative professional passionate about design'}"
- Email: ${portfolioData.personalInfo.email || 'contact@portfolio.com'}
- Skills: ${portfolioData.personalInfo.skills?.join(', ') || 'Creative skills matching detected industry'}

🔗 SOCIAL PRESENCE:
${[
  portfolioData.personalInfo.website && `Website: ${portfolioData.personalInfo.website}`,
  portfolioData.personalInfo.linkedin && `LinkedIn: ${portfolioData.personalInfo.linkedin}`,
  portfolioData.personalInfo.instagram && `Instagram: ${portfolioData.personalInfo.instagram}`,
  portfolioData.personalInfo.behance && `Behance: ${portfolioData.personalInfo.behance}`,
  portfolioData.personalInfo.dribbble && `Dribbble: ${portfolioData.personalInfo.dribbble}`
].filter(Boolean).join('\n') || 'Social links to be styled according to moodboard aesthetic'}

📁 PROJECT PORTFOLIO (${portfolioData.projects?.length || 0} projects, ${totalImages} images):
${portfolioData.projects?.map((project, index) => `
PROJECT ${index + 1}: "${project.title}"
├── Category: ${project.category || project.customCategory || 'Creative Work'}
├── Overview: ${project.overview || project.description || 'Innovative project showcasing creative expertise'}
├── Tags: ${project.tags?.join(', ') || 'design, creative'}
${project.problem ? `├── Problem: ${project.problem}` : ''}
${project.solution ? `├── Solution: ${project.solution}` : ''}
${project.reflection ? `└── Reflection: ${project.reflection}` : ''}
`).join('') || 'No projects provided - create sample projects matching the detected industry and visual style'}

🎨 STYLE PREFERENCES:
- Color Scheme: ${portfolioData.stylePreferences?.colorScheme || 'Extract from moodboard and intelligence analysis'}
- Layout Style: ${portfolioData.stylePreferences?.layoutStyle || 'Use detected industry and content strategy patterns'}
- Typography: ${portfolioData.stylePreferences?.typography || 'Apply moodboard typography analysis'}
- Overall Mood: ${portfolioData.stylePreferences?.mood || 'Match visual DNA analysis results'}`;
  }

  /**
   * Generate intelligence summary for Claude's reference
   */
  generateIntelligenceSummary(insaneAnalysis) {
    const visual = insaneAnalysis.analysisLevels.visualIntelligence || {};
    const content = insaneAnalysis.analysisLevels.contentQuality || {};
    const industry = insaneAnalysis.analysisLevels.industryIntelligence || {};

    return `
🧠 INTELLIGENCE ANALYSIS SUMMARY:

🎨 VISUAL INTELLIGENCE (${Math.round((visual.confidence || 0) * 100)}% confidence):
- Detected Style: ${visual.visualDNA?.category || 'modern'} ${visual.visualDNA?.mood || 'aesthetic'}
- Color Profile: ${visual.colors?.palette?.join(', ') || 'Balanced palette'}
- Typography: ${visual.typography?.category || 'sans-serif'} fonts, ${visual.typography?.weight || 'regular'} weight
- Layout Approach: ${visual.layout?.grid || 'standard'} grid, ${visual.layout?.whitespace || 'balanced'} whitespace
- Navigation Style: ${visual.structure?.navigation || 'horizontal'}
- Unique Signatures: ${visual.signatures?.join(', ') || 'Clean modern elements'}

📝 CONTENT STRATEGY (${Math.round((content.confidence || 0) * 100)}% confidence):
- Content Type: ${content.contentType || 'balanced'}
- Generation Strategy: ${content.strategy || 'standard'}
- Strengths: ${content.strengths?.join(', ') || 'Creative potential'}
- Focus Areas: ${content.recommendations?.join(' | ') || 'Balanced presentation'}

🏭 INDUSTRY INTELLIGENCE (${Math.round((industry.confidence || 0) * 100)}% confidence):
- Detected Industry: ${industry.detectedIndustry || 'general creative'}
- Portfolio Focus: ${industry.portfolioFocus || 'balanced showcase'}
- Layout Style: ${industry.layoutStyle || 'professional'}
- Recommended Sections: ${industry.recommendedSections?.join(' → ') || 'standard sections'}

🎯 SYSTEM STATUS: ${insaneAnalysis.systemStatus || 'SMART'} (${Math.round((insaneAnalysis.overallConfidence || 0.5) * 100)}% overall confidence)

IMPLEMENTATION DIRECTIVE: Use this intelligence to create a portfolio that feels expertly crafted for this specific user's needs, industry, and aesthetic preferences.`;
  }

  /**
   * Generate project implementation guide
   */
  generateProjectImplementationGuide(projectImages, contentStrategy) {
    const projects = projectImages?.projectImages || [];
    
    if (projects.length === 0) {
      return `
📁 PROJECT IMPLEMENTATION GUIDE:

⚠️ NO PROJECT IMAGES AVAILABLE
STRATEGY: Create 3-4 compelling sample projects that match:
- The detected visual DNA aesthetic
- The user's industry and skill set  
- The intelligent content strategy recommendations

APPROACH: Use design elements, CSS styling, and generated content to create portfolio sections that demonstrate the aesthetic potential while maintaining professional credibility.`;
    }

    const strategy = contentStrategy?.strategy || 'balanced';
    const strategyDetails = this.strategyTemplates[strategy] || this.strategyTemplates['design-focused'];

    let guide = `
📁 PROJECT IMPLEMENTATION GUIDE:

🎯 CONTENT STRATEGY: ${strategy}
- Focus: ${strategyDetails.focus}
- Structure: ${strategyDetails.structure}  
- Content Ratio: ${strategyDetails.contentRatio}
- Interaction Style: ${strategyDetails.interactionStyle}

📸 PROJECT-SPECIFIC IMPLEMENTATION:
Total Projects: ${projects.length}
Total Images: ${projects.reduce((sum, p) => sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0)}

PROJECT BREAKDOWN:`;

    projects.forEach((project, index) => {
      const finalCount = project.finalImages?.length || 0;
      const processCount = project.processImages?.length || 0;
      
      guide += `\n\n━━━ PROJECT ${index + 1}: "${project.title}" ━━━
📊 Image Assets: ${finalCount} final + ${processCount} process images
🎯 Implementation Strategy:`;

      switch (strategy) {
        case 'showcase-heavy':
          guide += `
  ├── PRIMARY DISPLAY: Detailed case study card with expandable sections
  ├── FINAL IMAGES: Feature prominently as hero images with full details
  ├── PROCESS IMAGES: Create comprehensive process gallery showing methodology
  └── CONTENT: Use detailed project information with problem-solution narrative`;
          break;
        
        case 'visual-first':
          guide += `
  ├── PRIMARY DISPLAY: Image-hero layout with minimal text overlay
  ├── FINAL IMAGES: Use as dominant visual element (80% of card space)
  ├── PROCESS IMAGES: Organize in hoverable gallery or carousel
  └── CONTENT: Generate concise, impactful descriptions that support imagery`;
          break;
        
        case 'story-driven':
          guide += `
  ├── PRIMARY DISPLAY: Text-focused cards with supporting imagery
  ├── FINAL IMAGES: Use as accent elements supporting the narrative
  ├── PROCESS IMAGES: Integrate within written case study content
  └── CONTENT: Emphasize detailed project stories and problem-solving process`;
          break;
        
        default:
          guide += `
  ├── PRIMARY DISPLAY: Balanced card with equal visual-text weight
  ├── FINAL IMAGES: Feature as main project visuals with good prominence
  ├── PROCESS IMAGES: Show in expandable gallery section
  └── CONTENT: Balanced approach with both visuals and descriptive content`;
      }

      // Add specific image URLs for this project
      if (finalCount > 0) {
        guide += `\n\n🖼️ FINAL IMAGES FOR "${project.title}":`;
        project.finalImages.forEach((img, imgIndex) => {
          guide += `\n  ${imgIndex + 1}. ${img.url} (${img.filename})`;
        });
      }

      if (processCount > 0) {
        guide += `\n\n📷 PROCESS IMAGES FOR "${project.title}":`;
        project.processImages.slice(0, 3).forEach((img, imgIndex) => { // Show first 3 for brevity
          guide += `\n  ${imgIndex + 1}. ${img.url} (${img.filename})`;
        });
        if (processCount > 3) {
          guide += `\n  ... and ${processCount - 3} more process images`;
        }
      }
    });

    guide += `\n\n🚨 CRITICAL IMPLEMENTATION RULES:
1. Each project's images must ONLY appear in that project's section
2. Use exact URLs as provided - no modifications or concatenations
3. Implement the content strategy consistently across all projects
4. Maintain visual coherence with the detected aesthetic DNA
5. Create smooth interactions that match the strategy's interaction style`;

    return guide;
  }

  /**
   * Generate final execution instructions
   */
  generateFinalExecutionInstructions(insaneAnalysis) {
    const systemStatus = insaneAnalysis.systemStatus || 'SMART';
    const confidence = Math.round((insaneAnalysis.overallConfidence || 0.5) * 100);
    const visual = insaneAnalysis.analysisLevels.visualIntelligence || {};
    const content = insaneAnalysis.analysisLevels.contentQuality || {};
    const industry = insaneAnalysis.analysisLevels.industryIntelligence || {};

    return `
🎯 FINAL EXECUTION INSTRUCTIONS:

🚀 SYSTEM STATUS: ${systemStatus} (${confidence}% confidence)
This is ${systemStatus === 'INSANE' ? 'maximum intelligence' : systemStatus === 'SMART' ? 'high intelligence' : 'standard'} mode.

🔥 EXECUTION PRIORITIES:
1. **VISUAL DNA MATCH** (${Math.round((visual.confidence || 0) * 100)}% confidence)
   - Implement the exact aesthetic from moodboard analysis
   - Use detected color palette: ${visual.colors?.palette?.join(', ') || 'balanced colors'}
   - Apply ${visual.typography?.category || 'modern'} typography with ${visual.typography?.weight || 'regular'} weights
   - Create ${visual.layout?.whitespace || 'balanced'} layouts with ${visual.structure?.navigation || 'horizontal'} navigation

2. **CONTENT STRATEGY EXECUTION** (${Math.round((content.confidence || 0) * 100)}% confidence)
   - Primary approach: ${content.strategy || 'balanced'}
   - Content strengths: ${content.strengths?.join(', ') || 'creative potential'}
   - Implementation: ${content.recommendations?.join(' | ') || 'professional presentation'}

3. **INDUSTRY ADAPTATION** (${Math.round((industry.confidence || 0) * 100)}% confidence)
   - Optimize for: ${industry.detectedIndustry || 'creative professional'}
   - Portfolio focus: ${industry.portfolioFocus || 'balanced showcase'}
   - Section structure: ${industry.recommendedSections?.join(' → ') || 'standard flow'}

✨ SUCCESS METRICS:
${systemStatus === 'INSANE' ? '🔥 INSANE LEVEL - Portfolio must look like it cost $10,000 to design' : 
  systemStatus === 'SMART' ? '⚡ SMART LEVEL - Portfolio should feel expertly crafted' : 
  '💡 STANDARD LEVEL - Portfolio should be professional and well-designed'}

TECHNICAL REQUIREMENTS:
- Single HTML file with embedded CSS and JavaScript
- Fully responsive design (mobile-first approach)
- Modern CSS features (Grid, Flexbox, CSS Variables)
- Smooth animations matching the detected aesthetic mood
- Accessibility standards (ARIA, semantic HTML, keyboard navigation)
- Fast loading with optimized performance
- Cross-browser compatibility

MANDATORY FOOTER:
"© ${new Date().getFullYear()} [User Name] — product of Interract Agency. All rights reserved. ✨"

🎨 THE FINAL RESULT MUST FEEL LIKE:
- A custom design created by someone who made the moodboard images
- An expert portfolio for the ${industry.detectedIndustry || 'detected'} industry
- A perfectly balanced presentation of the user's ${content.contentType || 'available'} content
- A premium, professional portfolio that commands attention and respect

Generate the complete portfolio HTML now.`;
  }

  /**
   * Legacy method for backwards compatibility - Updated to use INSANE analysis
   */
  async generateStyledPrompt(portfolioData, projectImages, designStyle = 'modern', insaneAnalysis = null) {
    console.log('⚠️ Using legacy text-only prompt with INSANE analysis integration');
    
    if (!insaneAnalysis) {
      console.warn('No INSANE analysis provided, falling back to basic prompt generation');
      return this.generateBasicPrompt(portfolioData, projectImages, designStyle);
    }

    let prompt = this.systemPrompts.base;
    
    // Add intelligence summary
    prompt += '\n\n' + this.generateIntelligenceSummary(insaneAnalysis);
    
    // Add the assembled intelligent prompt
    if (insaneAnalysis.intelligentPrompt) {
      prompt += '\n\n' + insaneAnalysis.intelligentPrompt.assembledPrompt;
    }
    
    // Add comprehensive user data
    prompt += '\n\n' + this.generateComprehensiveUserData(portfolioData, projectImages, insaneAnalysis);
    
    // Add project implementation guide
    prompt += '\n\n' + this.generateProjectImplementationGuide(projectImages, insaneAnalysis.analysisLevels.contentQuality);
    
    // Add final execution instructions
    prompt += '\n\n' + this.generateFinalExecutionInstructions(insaneAnalysis);
    
    // Add response format
    prompt += '\n\n' + this.systemPrompts.responseFormat;
    
    return prompt;
  }

  /**
   * Basic prompt generation fallback
   */
  generateBasicPrompt(portfolioData, projectImages, designStyle) {
    const projects = projectImages?.projectImages || [];
    const totalImages = projects.reduce((sum, p) => 
      sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0);

    return `${this.systemPrompts.base}

🎨 DESIGN STYLE: ${designStyle} aesthetic
📊 USER DATA: ${portfolioData.personalInfo.name} - ${portfolioData.personalInfo.title}
📁 PROJECTS: ${portfolioData.projects?.length || 0} projects with ${totalImages} images available

APPROACH: Create a professional portfolio that showcases the user's work with a ${designStyle} design approach.

${totalImages > 0 ? this.generateBasicProjectGuide(projects) : 'Create compelling sample projects that match the design style.'}

TECHNICAL: Single HTML file, responsive design, modern CSS, embedded styles and scripts.

${this.systemPrompts.responseFormat}`;
  }

  /**
   * Basic project guide for fallback
   */
  generateBasicProjectGuide(projects) {
    let guide = '\n🔗 PROJECT IMAGES AVAILABLE:\n';
    
    projects.forEach((project, index) => {
      guide += `\nPROJECT ${index + 1}: "${project.title}"`;
      if (project.finalImages?.length > 0) {
        guide += `\n  Final: ${project.finalImages[0].url}`;
      }
      if (project.processImages?.length > 0) {
        guide += `\n  Process: ${project.processImages.length} images`;
      }
    });
    
    guide += '\n\nIMPLEMENTATION: Use these images in their respective project sections only.';
    return guide;
  }

  /**
   * Generate Anthropic messages with fallback support
   */
  async generateAnthropicMessages(portfolioData, projectImages, designStyle = 'modern', analysisResults = null) {
    // If we have INSANE analysis results, use the enhanced method
    if (analysisResults && analysisResults.systemStatus) {
      return await this.generateInsaneAnthropicMessages(portfolioData, projectImages, analysisResults);
    }
    
    // Otherwise, fall back to basic message generation
    console.log('⚠️ No INSANE analysis available, using basic message generation');
    
    const messages = [];
    const textContent = await this.generateStyledPrompt(portfolioData, projectImages, designStyle, analysisResults);
    
    const contentArray = [
      {
        type: "text",
        text: textContent
      }
    ];

    // Add basic project image information if available
    const projects = projectImages?.projectImages || [];
    if (projects.length > 0) {
      contentArray.push({
        type: "text",
        text: this.generateBasicProjectGuide(projects)
      });
    }

    messages.push({
      role: "user",
      content: contentArray
    });

    return messages;
  }

  /**
   * Add moodboard images to existing content array (separate method for flexibility)
   */
  async addMoodboardToMessages(messages, moodboardFiles) {
    if (!moodboardFiles || moodboardFiles.length === 0 || !messages.length) return messages;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.content && Array.isArray(lastMessage.content)) {
      await this.addMoodboardImagesToContent(lastMessage.content, moodboardFiles);
    }

    return messages;
  }

  /**
   * Utility methods
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
   * Generate execution summary for logging/debugging
   */
  generateExecutionSummary(insaneAnalysis) {
    if (!insaneAnalysis) return 'Basic prompt generation';

    const visual = insaneAnalysis.analysisLevels?.visualIntelligence || {};
    const content = insaneAnalysis.analysisLevels?.contentQuality || {};
    const industry = insaneAnalysis.analysisLevels?.industryIntelligence || {};

    return `INSANE System Execution Summary:
🚀 System Status: ${insaneAnalysis.systemStatus} (${Math.round((insaneAnalysis.overallConfidence || 0) * 100)}%)
🎨 Visual DNA: ${visual.visualDNA?.category || 'unknown'} ${visual.visualDNA?.mood || ''} (${Math.round((visual.confidence || 0) * 100)}%)
📝 Content Strategy: ${content.strategy || 'unknown'} (${Math.round((content.confidence || 0) * 100)}%)
🏭 Industry: ${industry.detectedIndustry || 'unknown'} (${Math.round((industry.confidence || 0) * 100)}%)
🧩 Prompt Assembly: ${insaneAnalysis.intelligentPrompt ? 'LEGO blocks assembled' : 'Basic assembly'}`;
  }

  /**
   * Validate analysis results
   */
  validateAnalysisResults(analysisResults) {
    if (!analysisResults) return { valid: false, reason: 'No analysis results provided' };
    
    if (!analysisResults.analysisLevels) {
      return { valid: false, reason: 'Missing analysis levels' };
    }

    const requiredLevels = ['visualIntelligence', 'contentQuality', 'industryIntelligence'];
    const missingLevels = requiredLevels.filter(level => !analysisResults.analysisLevels[level]);
    
    if (missingLevels.length > 0) {
      return { valid: false, reason: `Missing analysis levels: ${missingLevels.join(', ')}` };
    }

    if (!analysisResults.intelligentPrompt) {
      return { valid: false, reason: 'Missing intelligent prompt assembly' };
    }

    return { valid: true, reason: 'Analysis results are complete' };
  }

  /**
   * Get strategy details for a given strategy type
   */
  getStrategyDetails(strategyType) {
    return this.strategyTemplates[strategyType] || this.strategyTemplates['design-focused'];
  }

  /**
   * Calculate prompt complexity score
   */
  calculateComplexityScore(insaneAnalysis) {
    if (!insaneAnalysis) return 0.3;

    const weights = {
      visualConfidence: 0.3,
      contentConfidence: 0.25,
      industryConfidence: 0.25,
      systemStatus: 0.2
    };

    const visual = insaneAnalysis.analysisLevels?.visualIntelligence?.confidence || 0;
    const content = insaneAnalysis.analysisLevels?.contentQuality?.confidence || 0;
    const industry = insaneAnalysis.analysisLevels?.industryIntelligence?.confidence || 0;
    
    const statusScore = {
      'INSANE': 1.0,
      'SMART': 0.8,
      'BASIC': 0.5,
      'FALLBACK': 0.3
    }[insaneAnalysis.systemStatus] || 0.3;

    return (
      visual * weights.visualConfidence +
      content * weights.contentConfidence +
      industry * weights.industryConfidence +
      statusScore * weights.systemStatus
    );
  }
}

module.exports = PromptGenerator;