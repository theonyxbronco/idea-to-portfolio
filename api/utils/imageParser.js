const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

class ImageParser {
  constructor(anthropicClient) {
    this.anthropicClient = anthropicClient;
    this.useClaudeVision = !!anthropicClient;
    
    // Visual DNA patterns library
    this.visualDNAPatterns = {
      minimalist: {
        keywords: ['minimal', 'clean', 'simple', 'whitespace', 'geometric'],
        colorProfile: { saturation: 'low', brightness: 'high', contrast: 'medium' },
        typography: ['sans-serif', 'light-weight', 'generous-spacing'],
        layout: ['centered', 'grid-based', 'whitespace-heavy']
      },
      vintage: {
        keywords: ['vintage', 'retro', 'classic', 'aged', 'worn'],
        colorProfile: { saturation: 'warm', brightness: 'medium', contrast: 'high' },
        typography: ['serif', 'script', 'handwritten'],
        layout: ['asymmetrical', 'layered', 'texture-heavy']
      },
      techStartup: {
        keywords: ['tech', 'startup', 'modern', 'digital', 'geometric'],
        colorProfile: { saturation: 'high', brightness: 'medium', contrast: 'high' },
        typography: ['sans-serif', 'bold', 'modern'],
        layout: ['grid-based', 'geometric', 'bold-sections']
      },
      creative: {
        keywords: ['creative', 'artistic', 'experimental', 'unique'],
        colorProfile: { saturation: 'varied', brightness: 'varied', contrast: 'high' },
        typography: ['display', 'experimental', 'varied-weights'],
        layout: ['asymmetrical', 'experimental', 'dynamic']
      },
      professional: {
        keywords: ['professional', 'business', 'corporate', 'formal'],
        colorProfile: { saturation: 'low', brightness: 'medium', contrast: 'medium' },
        typography: ['serif', 'sans-serif', 'readable'],
        layout: ['structured', 'balanced', 'hierarchical']
      }
    };

    // Industry detection patterns
    this.industryPatterns = {
      'graphic-designer': {
        keywords: ['graphic', 'design', 'visual', 'branding', 'logo', 'poster'],
        portfolioFocus: 'visual-showcase',
        sectionsNeeded: ['creative-process', 'case-studies', 'client-work'],
        layoutStyle: 'image-heavy'
      },
      'photographer': {
        keywords: ['photo', 'photography', 'camera', 'portrait', 'landscape'],
        portfolioFocus: 'gallery-driven',
        sectionsNeeded: ['portfolio-gallery', 'about-story', 'services'],
        layoutStyle: 'minimal-text'
      },
      'ux-designer': {
        keywords: ['ux', 'ui', 'user', 'wireframe', 'prototype', 'research'],
        portfolioFocus: 'process-driven',
        sectionsNeeded: ['case-studies', 'process', 'research', 'wireframes'],
        layoutStyle: 'story-telling'
      },
      'architect': {
        keywords: ['architecture', 'building', 'space', 'design', 'blueprint'],
        portfolioFocus: 'project-evolution',
        sectionsNeeded: ['project-evolution', 'technical-drawings', 'spatial-concepts'],
        layoutStyle: 'technical-visual'
      },
      'developer': {
        keywords: ['code', 'development', 'programming', 'software', 'app'],
        portfolioFocus: 'technical-showcase',
        sectionsNeeded: ['projects', 'tech-stack', 'code-samples'],
        layoutStyle: 'clean-functional'
      },
      'web-designer': {
        keywords: ['web', 'website', 'frontend', 'html', 'css', 'responsive'],
        portfolioFocus: 'digital-showcase',
        sectionsNeeded: ['web-projects', 'responsive-design', 'user-experience'],
        layoutStyle: 'modern-digital'
      }
    };
  }

  /**
   * PHASE 1: Visual Intelligence System
   * Analyze moodboard using Claude's vision capabilities for surgical precision
   */
  async analyzeVisualDNA(imagePaths, type = 'moodboard') {
    console.log(`🧠 Running Visual Intelligence Analysis on ${imagePaths.length} images...`);
    
    if (!this.useClaudeVision || !imagePaths.length) {
      console.log('⚠️ No Claude Vision available or no images, falling back to Sharp analysis');
      return await this.fallbackToSharpAnalysis(imagePaths, type);
    }
    
    try {
      // For file paths, read and convert to base64
      const imageContents = await Promise.all(
        imagePaths.slice(0, 4).map(async (imagePath) => { // Limit to 4 images for API efficiency
          const imageBuffer = await fs.readFile(imagePath);
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: this.getMediaType(imagePath),
              data: imageBuffer.toString('base64')
            }
          };
        })
      );

      const visionPrompt = this.generateVisualDNAPrompt(type, imagePaths.length);
      
      const response = await this.anthropicClient.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: visionPrompt },
            ...imageContents
          ]
        }]
      });

      const analysisResult = this.parseVisualDNAResponse(response.content[0].text);
      
      // Enhance with Sharp-based technical analysis
      const technicalAnalysis = await this.analyzeTechnicalSpecs(imagePaths);
      
      return {
        ...analysisResult,
        technicalSpecs: technicalAnalysis,
        confidence: analysisResult.confidence || 0.8,
        analysisMethod: 'claude-vision-enhanced',
        imageCount: imagePaths.length
      };

    } catch (error) {
      console.warn('Claude Vision analysis failed, falling back to Sharp analysis:', error);
      return await this.fallbackToSharpAnalysis(imagePaths, type);
    }
  }

  /**
   * Generate specialized Visual DNA analysis prompt
   */
  generateVisualDNAPrompt(type, imageCount) {
    return `You are a world-class design analyst with expertise in extracting precise visual DNA from images. Analyze the ${imageCount} ${type} images I'm providing and extract the EXACT design patterns that would make a portfolio feel like it was designed by the same person who created these references.

EXTRACT THE FOLLOWING WITH SURGICAL PRECISION:

1. **VISUAL DNA CLASSIFICATION**:
   - Primary style category (minimalist, vintage, tech-startup, creative-experimental, professional, etc.)
   - Aesthetic mood (clean, moody, energetic, sophisticated, playful, elegant)
   - Confidence level in classification (0.0 to 1.0)

2. **COLOR INTELLIGENCE**:
   - Exact color palette (provide hex codes if visible)
   - Color temperature (warm/cool/neutral)
   - Saturation levels (high/medium/low)
   - Color relationships and harmony patterns

3. **TYPOGRAPHY PATTERNS**:
   - Font categories (serif, sans-serif, display, script)
   - Weight preferences (light, regular, bold, black)
   - Spacing characteristics (tight, normal, generous)
   - Hierarchy patterns observed

4. **LAYOUT DNA**:
   - Grid systems (if detectable)
   - Whitespace usage patterns
   - Content organization principles
   - Asymmetry vs symmetry preferences
   - Section flow patterns

5. **STRUCTURAL ELEMENTS** (Critical for portfolio generation):
   - Navigation styles observed
   - Content organization patterns
   - Section layouts and hierarchies
   - Interactive element styles
   - Page flow concepts

6. **UNIQUE DESIGN SIGNATURES**:
   - Distinctive visual elements
   - Repeated design motifs
   - Signature styling approaches
   - What makes this aesthetic unique

RESPONSE FORMAT - Please structure your response exactly like this:

VISUAL_DNA: {category}, {mood}, confidence: {0.0-1.0}
COLORS: [{hex1}, {hex2}, {hex3}], temperature: {warm/cool/neutral}, saturation: {high/medium/low}
TYPOGRAPHY: category: {serif/sans/display}, weight: {light/regular/bold}, spacing: {tight/normal/generous}
LAYOUT: grid: {description}, whitespace: {minimal/generous/balanced}, flow: {description}
STRUCTURE: navigation: {style}, sections: {organization}, hierarchy: {pattern}
SIGNATURES: [{unique element 1}, {unique element 2}, {unique element 3}]
IMPLEMENTATION_NOTES: {2-3 sentences on how to authentically recreate this aesthetic}

Be extremely specific and actionable in your analysis.`;
  }

  /**
   * Parse Claude's Visual DNA response into structured data
   */
  parseVisualDNAResponse(responseText) {
    const analysis = {
      visualDNA: { category: 'modern', mood: 'clean' },
      colors: { palette: ['#333333'], temperature: 'neutral', saturation: 'medium' },
      typography: { category: 'sans-serif', weight: 'regular', spacing: 'normal' },
      layout: { grid: 'standard', whitespace: 'balanced', flow: 'top-to-bottom' },
      structure: { navigation: 'horizontal', sections: 'standard', hierarchy: 'balanced' },
      signatures: ['modern'],
      implementationNotes: '',
      confidence: 0.7
    };

    try {
      // Extract Visual DNA
      const visualDNAMatch = responseText.match(/VISUAL_DNA:\s*([^,]+),\s*([^,]+),\s*confidence:\s*([0-9.]+)/);
      if (visualDNAMatch) {
        analysis.visualDNA.category = visualDNAMatch[1].trim();
        analysis.visualDNA.mood = visualDNAMatch[2].trim();
        analysis.confidence = parseFloat(visualDNAMatch[3]);
      }

      // Extract Colors
      const colorsMatch = responseText.match(/COLORS:\s*\[([^\]]+)\][^,]*,\s*temperature:\s*([^,]+),\s*saturation:\s*([^\n]+)/);
      if (colorsMatch) {
        analysis.colors.palette = colorsMatch[1].split(',').map(c => c.trim().replace(/['"]/g, ''));
        analysis.colors.temperature = colorsMatch[2].trim();
        analysis.colors.saturation = colorsMatch[3].trim();
      }

      // Extract Typography
      const typographyMatch = responseText.match(/TYPOGRAPHY:\s*category:\s*([^,]+),\s*weight:\s*([^,]+),\s*spacing:\s*([^\n]+)/);
      if (typographyMatch) {
        analysis.typography.category = typographyMatch[1].trim();
        analysis.typography.weight = typographyMatch[2].trim();
        analysis.typography.spacing = typographyMatch[3].trim();
      }

      // Extract Layout
      const layoutMatch = responseText.match(/LAYOUT:\s*grid:\s*([^,]+),\s*whitespace:\s*([^,]+),\s*flow:\s*([^\n]+)/);
      if (layoutMatch) {
        analysis.layout.grid = layoutMatch[1].trim();
        analysis.layout.whitespace = layoutMatch[2].trim();
        analysis.layout.flow = layoutMatch[3].trim();
      }

      // Extract Structure
      const structureMatch = responseText.match(/STRUCTURE:\s*navigation:\s*([^,]+),\s*sections:\s*([^,]+),\s*hierarchy:\s*([^\n]+)/);
      if (structureMatch) {
        analysis.structure.navigation = structureMatch[1].trim();
        analysis.structure.sections = structureMatch[2].trim();
        analysis.structure.hierarchy = structureMatch[3].trim();
      }

      // Extract Signatures
      const signaturesMatch = responseText.match(/SIGNATURES:\s*\[([^\]]+)\]/);
      if (signaturesMatch) {
        analysis.signatures = signaturesMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
      }

      // Extract Implementation Notes
      const notesMatch = responseText.match(/IMPLEMENTATION_NOTES:\s*([^\n]+(?:\n[^\n]+)*)/);
      if (notesMatch) {
        analysis.implementationNotes = notesMatch[1].trim();
      }

      return analysis;

    } catch (error) {
      console.warn('Failed to parse Visual DNA response, using defaults:', error);
      return {
        ...analysis,
        rawResponse: responseText,
        confidence: 0.5,
        parseError: error.message
      };
    }
  }

  /**
   * PHASE 2: Content Quality Detective
   * Analyze user content and determine optimal generation strategy
   */
  analyzeContentQuality(portfolioData, projectImages) {
    console.log('🕵️ Running Content Quality Analysis...');
    
    const analysis = {
      contentType: 'minimal',
      strategy: 'placeholder-heavy',
      confidence: 0.0,
      recommendations: [],
      strengths: [],
      weaknesses: []
    };

    // Analyze project quality
    const projects = portfolioData.projects || [];
    const hasDetailedProjects = projects.some(p => 
      (p.overview && p.overview.length > 50) || 
      (p.description && p.description.length > 50) ||
      (p.problem && p.solution)
    );

    // Analyze image availability
    const totalProjectImages = projectImages?.projectImages?.reduce((sum, p) => 
      sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0) || 0;

    // Analyze personal info completeness
    const personalInfo = portfolioData.personalInfo || {};
    const hasRichPersonalInfo = personalInfo.bio && personalInfo.bio.length > 30;
    const hasSkills = personalInfo.skills && personalInfo.skills.length > 2;
    const hasSocialLinks = [personalInfo.website, personalInfo.linkedin, personalInfo.instagram, personalInfo.behance, personalInfo.dribbble].filter(Boolean).length > 1;

    // Calculate content richness scores
    const projectScore = hasDetailedProjects ? 0.4 : 0.1;
    const imageScore = Math.min(totalProjectImages / 10, 0.3); // Max 0.3 for images
    const personalScore = (hasRichPersonalInfo ? 0.15 : 0) + (hasSkills ? 0.1 : 0) + (hasSocialLinks ? 0.05 : 0);
    
    const totalScore = projectScore + imageScore + personalScore;

    // Determine content classification based on score
    if (totalScore > 0.7 && hasDetailedProjects && totalProjectImages > 5) {
      analysis.contentType = 'rich-content';
      analysis.strategy = 'showcase-heavy';
      analysis.confidence = 0.9;
      analysis.strengths = ['Detailed project descriptions', 'Good image collection', 'Complete personal info'];
      analysis.recommendations = ['Use detailed project storytelling', 'Showcase process images prominently', 'Create case study format'];
    } else if (totalProjectImages > 3 && !hasDetailedProjects) {
      analysis.contentType = 'style-heavy';
      analysis.strategy = 'visual-first';
      analysis.confidence = 0.8;
      analysis.strengths = ['Good visual content', 'Images available for showcase'];
      analysis.weaknesses = ['Limited project descriptions'];
      analysis.recommendations = ['Focus 80% on visual design', 'Generate compelling project descriptions', 'Use images as primary storytelling device'];
    } else if (hasDetailedProjects && totalProjectImages < 3) {
      analysis.contentType = 'content-rich';
      analysis.strategy = 'story-driven';
      analysis.confidence = 0.7;
      analysis.strengths = ['Detailed project information', 'Good written content'];
      analysis.weaknesses = ['Limited visual content'];
      analysis.recommendations = ['Focus on project process and results', 'Use clean typography-focused layout', 'Create text-based case studies'];
    } else {
      analysis.contentType = 'minimal';
      analysis.strategy = 'design-focused';
      analysis.confidence = 0.6;
      analysis.weaknesses = ['Limited project details', 'Few images available'];
      analysis.recommendations = ['Generate compelling placeholder content', 'Focus heavily on visual design from moodboard', 'Create aspirational portfolio structure'];
    }

    // Add specific metrics
    analysis.metrics = {
      totalProjects: projects.length,
      detailedProjects: projects.filter(p => (p.overview || p.description || '').length > 50).length,
      totalImages: totalProjectImages,
      personalInfoScore: personalScore,
      overallScore: totalScore
    };

    return analysis;
  }

  /**
   * PHASE 3: Industry Intelligence
   * Detect user's industry and provide specialized recommendations
   */
  detectIndustry(portfolioData) {
    console.log('🎯 Running Industry Detection...');
    
    const detectionSources = [
      portfolioData.personalInfo?.title || '',
      portfolioData.personalInfo?.bio || '',
      ...(portfolioData.personalInfo?.skills || []),
      ...(portfolioData.projects?.map(p => `${p.title} ${p.overview || p.description || ''} ${p.category || ''}`) || [])
    ].join(' ').toLowerCase();

    let bestMatch = { industry: 'general', confidence: 0.0, patterns: null };

    // Check each industry pattern
    Object.entries(this.industryPatterns).forEach(([industry, patterns]) => {
      const matchCount = patterns.keywords.reduce((count, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return count + (regex.test(detectionSources) ? 1 : 0);
      }, 0);
      
      const confidence = matchCount / patterns.keywords.length;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { industry, confidence, patterns };
      }
    });

    // Boost confidence if we find strong indicators
    if (bestMatch.confidence > 0.5) {
      bestMatch.confidence = Math.min(0.9, bestMatch.confidence + 0.2);
    }

    return {
      detectedIndustry: bestMatch.industry,
      confidence: bestMatch.confidence,
      industryPatterns: bestMatch.patterns,
      portfolioFocus: bestMatch.patterns?.portfolioFocus || 'general',
      recommendedSections: bestMatch.patterns?.sectionsNeeded || ['about', 'projects', 'contact'],
      layoutStyle: bestMatch.patterns?.layoutStyle || 'balanced',
      keywordMatches: this.findKeywordMatches(detectionSources, bestMatch.patterns?.keywords || [])
    };
  }

  /**
   * Find which keywords matched for debugging
   */
  findKeywordMatches(text, keywords) {
    return keywords.filter(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(text);
    });
  }

  /**
   * PHASE 4: Smart Prompt Assembly
   * Combine all intelligence into LEGO-like prompt blocks
   */
  assembleIntelligentPrompt(portfolioData, projectImages, moodboardAnalysis, contentAnalysis, industryAnalysis) {
    console.log('🧩 Assembling Intelligent Prompt with LEGO blocks...');
    
    const promptBlocks = {
      visualDNA: this.generateVisualDNABlock(moodboardAnalysis),
      contentStrategy: this.generateContentStrategyBlock(contentAnalysis),
      industryContext: this.generateIndustryContextBlock(industryAnalysis),
      technicalRequirements: this.generateTechnicalRequirementsBlock(moodboardAnalysis, industryAnalysis),
      projectSpecific: this.generateProjectSpecificBlock(projectImages, contentAnalysis.strategy)
    };

    const assembledPrompt = `${this.getBasePrompt()}

${promptBlocks.visualDNA}

${promptBlocks.contentStrategy}

${promptBlocks.industryContext}

${promptBlocks.projectSpecific}

${promptBlocks.technicalRequirements}

${this.generateFinalAssemblyInstructions(contentAnalysis, industryAnalysis)}`;

    return {
      assembledPrompt,
      promptBlocks,
      assemblyStrategy: {
        primaryFocus: contentAnalysis.strategy,
        industryAdaptation: industryAnalysis.detectedIndustry,
        visualConfidence: moodboardAnalysis?.confidence || 0.5,
        contentConfidence: contentAnalysis.confidence,
        industryConfidence: industryAnalysis.confidence
      }
    };
  }

  /**
   * Generate Visual DNA block (LEGO block 1)
   */
  generateVisualDNABlock(moodboardAnalysis) {
    if (!moodboardAnalysis || !moodboardAnalysis.visualDNA) {
      return `🎨 VISUAL DNA BLOCK:
STYLE: Modern clean aesthetic (fallback)
CONFIDENCE: 0.3 (no moodboard analysis available)
APPROACH: Use contemporary design patterns with balanced colors and clean typography`;
    }

    const { visualDNA, colors, typography, layout, structure } = moodboardAnalysis;
    
    return `🎨 VISUAL DNA BLOCK (${Math.round(moodboardAnalysis.confidence * 100)}% confidence):
EXTRACTED AESTHETIC: ${visualDNA.category} ${visualDNA.mood}
COLOR PALETTE: ${colors.palette?.join(', ') || 'Modern neutrals'}
COLOR TEMPERATURE: ${colors.temperature}
TYPOGRAPHY STYLE: ${typography.category} fonts, ${typography.weight} weight, ${typography.spacing} spacing
LAYOUT PRINCIPLES: ${layout.grid}, ${layout.whitespace} whitespace, ${layout.flow}
NAVIGATION STYLE: ${structure.navigation}
UNIQUE SIGNATURES: ${moodboardAnalysis.signatures?.join(', ') || 'Clean modern elements'}

IMPLEMENTATION DIRECTIVE: ${moodboardAnalysis.implementationNotes || 'Create a design that matches the detected aesthetic patterns with precision.'}

The design must feel like it was created by the same designer who made the moodboard references.`;
  }

  /**
   * Generate Content Strategy block (LEGO block 2)
   */
  generateContentStrategyBlock(contentAnalysis) {
    const strategyInstructions = {
      'showcase-heavy': `CONTENT STRATEGY: Rich Content Showcase
- Focus 60% on detailed project storytelling
- Use expandable case study format
- Highlight project process and outcomes
- Create comprehensive project narratives`,
      
      'visual-first': `CONTENT STRATEGY: Visual-First Approach  
- Focus 80% on visual design and imagery
- Generate authentic-sounding project descriptions
- Use images as primary storytelling device
- Minimize text, maximize visual impact`,
      
      'story-driven': `CONTENT STRATEGY: Story-Driven Portfolio
- Focus 70% on project process and results
- Use typography-focused clean layout
- Create detailed case studies without heavy imagery
- Emphasize problem-solving narratives`,
      
      'design-focused': `CONTENT STRATEGY: Design-Focused Creation
- Generate compelling placeholder content that matches visual style
- Focus heavily on aesthetic execution from moodboard
- Create aspirational portfolio structure
- Use design elements to create visual interest`
    };

    return `📝 CONTENT STRATEGY BLOCK:
DETECTED CONTENT TYPE: ${contentAnalysis.contentType}
GENERATION STRATEGY: ${contentAnalysis.strategy}
CONFIDENCE: ${Math.round(contentAnalysis.confidence * 100)}%

${strategyInstructions[contentAnalysis.strategy]}

CONTENT METRICS:
- Total Projects: ${contentAnalysis.metrics?.totalProjects || 0}
- Detailed Projects: ${contentAnalysis.metrics?.detailedProjects || 0}
- Total Images: ${contentAnalysis.metrics?.totalImages || 0}
- Overall Score: ${Math.round((contentAnalysis.metrics?.overallScore || 0) * 100)}%

STRENGTHS TO LEVERAGE: ${contentAnalysis.strengths?.join(', ') || 'Design potential'}
${contentAnalysis.weaknesses?.length ? `WEAKNESSES TO COMPENSATE: ${contentAnalysis.weaknesses.join(', ')}` : ''}
RECOMMENDATIONS: ${contentAnalysis.recommendations?.join(' | ') || 'Focus on visual execution'}`;
  }

  /**
   * Generate Industry Context block (LEGO block 3)
   */
  generateIndustryContextBlock(industryAnalysis) {
    const industryInstructions = {
      'graphic-designer': 'Emphasize visual portfolios, case studies, creative process. Use image-heavy layouts with strong visual hierarchy.',
      'photographer': 'Focus on image galleries, minimal text, clean presentation. Create gallery-driven experiences with storytelling.',
      'ux-designer': 'Highlight problem-solving, user research, wireframes. Use story-telling layout with process documentation.',
      'architect': 'Emphasize project evolution, technical drawings, spatial concepts. Use technical-visual presentation style.',
      'developer': 'Showcase projects, tech stack, code samples. Use clean-functional layout with technical focus.',
      'web-designer': 'Focus on responsive design, user experience, modern web standards. Use digital-first presentation.',
      'general': 'Use balanced approach suitable for creative professionals with adaptable section structure.'
    };

    return `🏭 INDUSTRY CONTEXT BLOCK:
DETECTED INDUSTRY: ${industryAnalysis.detectedIndustry}
CONFIDENCE: ${Math.round(industryAnalysis.confidence * 100)}%
PORTFOLIO FOCUS: ${industryAnalysis.portfolioFocus}
LAYOUT STYLE: ${industryAnalysis.layoutStyle}

MATCHED KEYWORDS: ${industryAnalysis.keywordMatches?.join(', ') || 'general terms'}

INDUSTRY-SPECIFIC APPROACH: ${industryInstructions[industryAnalysis.detectedIndustry]}

RECOMMENDED SECTIONS: ${industryAnalysis.recommendedSections?.join(' → ') || 'Standard portfolio sections'}

The portfolio should feel like it was designed by someone who understands the ${industryAnalysis.detectedIndustry.replace('-', ' ')} industry.`;
  }

  /**
   * Generate Technical Requirements block (LEGO block 4)
   */
  generateTechnicalRequirementsBlock(moodboardAnalysis, industryAnalysis) {
    const mood = moodboardAnalysis?.visualDNA?.mood || 'professional';
    const interactionStyle = mood === 'playful' ? 'Playful animations and micro-interactions' : 
                            mood === 'sophisticated' ? 'Elegant, subtle transitions' :
                            'Clean, professional interactions';

    return `⚙️ TECHNICAL REQUIREMENTS BLOCK:
VISUAL EXECUTION: Implement the exact aesthetic from Visual DNA analysis
RESPONSIVE DESIGN: Mobile-first approach with tablet/desktop optimization
PERFORMANCE: Fast loading, optimized images, smooth animations
ACCESSIBILITY: Proper ARIA labels, semantic HTML, keyboard navigation
INTERACTIONS: ${interactionStyle}
LAYOUT SYSTEM: CSS Grid + Flexbox for modern layout control
TYPOGRAPHY: Implement the detected typography patterns precisely
COLOR IMPLEMENTATION: Use the extracted color palette systematically

INDUSTRY-SPECIFIC REQUIREMENTS:
${industryAnalysis.layoutStyle}: Optimize layout for ${industryAnalysis.portfolioFocus} presentation

BROWSER SUPPORT: Modern browsers with graceful degradation
CODE QUALITY: Clean, semantic HTML with embedded CSS and JavaScript`;
  }

  /**
   * Generate Project Specific block (LEGO block 5)
   */
  generateProjectSpecificBlock(projectImages, contentStrategy) {
    const projects = projectImages?.projectImages || [];
    const totalImages = projects.reduce((sum, p) => 
      sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0);

    if (totalImages === 0) {
      return `📁 PROJECT SPECIFIC BLOCK:
NO PROJECT IMAGES AVAILABLE
APPROACH: Create visually stunning placeholder projects that match the Visual DNA
FOCUS: Use design elements from moodboard to create compelling project showcases
GENERATE: 3-4 sample projects that demonstrate the aesthetic potential`;
    }

    let projectBlock = `📁 PROJECT SPECIFIC BLOCK:
TOTAL PROJECTS: ${projects.length}
TOTAL IMAGES: ${totalImages}
CONTENT STRATEGY: ${contentStrategy}

PROJECT-SPECIFIC IMPLEMENTATION:`;

    projects.forEach((project, index) => {
      const finalCount = project.finalImages?.length || 0;
      const processCount = project.processImages?.length || 0;
      
      projectBlock += `\n\nPROJECT ${index + 1}: "${project.title}"
- FINAL IMAGES: ${finalCount} (use as primary showcase)
- PROCESS IMAGES: ${processCount} (use in expandable gallery)
- STRATEGY: ${contentStrategy === 'visual-first' ? 'Lead with images, minimal text' : 
              contentStrategy === 'showcase-heavy' ? 'Detailed case study with process' :
              contentStrategy === 'story-driven' ? 'Text-heavy with supporting images' :
              'Balanced image and description approach'}`;
      
      if (finalCount > 0) {
        projectBlock += `\n- PRIMARY IMAGE: ${project.finalImages[0].url}`;
      }
    });

    projectBlock += `\n\nCRITICAL: Each project's images must ONLY be used in that project's section. No cross-contamination.`;

    return projectBlock;
  }

  /**
   * Generate final assembly instructions
   */
  generateFinalAssemblyInstructions(contentAnalysis, industryAnalysis) {
    return `🎯 FINAL ASSEMBLY INSTRUCTIONS:

PRIMARY GENERATION STRATEGY: ${contentAnalysis.strategy}
INDUSTRY ADAPTATION: ${industryAnalysis.detectedIndustry} (${Math.round(industryAnalysis.confidence * 100)}% confidence)

EXECUTION ORDER:
1. Implement Visual DNA aesthetic as the foundation
2. Apply Content Strategy for information architecture  
3. Adapt layout for Industry Context requirements
4. Integrate Project Specific content with precise image usage
5. Apply Technical Requirements for professional execution

SUCCESS CRITERIA:
✅ Portfolio aesthetic matches moodboard DNA precisely
✅ Content strategy optimizes for detected content type
✅ Industry-specific conventions are followed
✅ All project images are used in their correct contexts
✅ Technical execution is flawless and responsive

RESPONSE FORMAT: Return ONLY HTML code starting with <!DOCTYPE html> and ending with </html>`;
  }

  /**
   * Get base prompt
   */
  getBasePrompt() {
    return `You are an AI design system with surgical precision for creating portfolios that feel custom-designed by experts. You have been provided with multiple intelligence layers that must be combined to create the perfect portfolio.

CORE PHILOSOPHY: Every portfolio should feel like it was designed by someone who:
1. Created the moodboard images themselves (Visual DNA match)
2. Understands the user's content strengths and weaknesses (Content Strategy)
3. Has deep expertise in the user's industry (Industry Context)
4. Knows exactly how to use the specific project images (Project Intelligence)`;
  }

  /**
   * Technical analysis using Sharp
   */
  async analyzeTechnicalSpecs(imagePaths) {
    if (!imagePaths.length) return { available: false };

    try {
      const analyses = await Promise.all(
        imagePaths.slice(0, 3).map(async (imagePath) => {
          const image = sharp(imagePath);
          const metadata = await image.metadata();
          const stats = await image.stats();
          
          return {
            filename: path.basename(imagePath),
            width: metadata.width,
            height: metadata.height,
            aspectRatio: (metadata.width / metadata.height).toFixed(2),
            format: metadata.format,
            colorProfile: {
              channels: metadata.channels,
              hasAlpha: metadata.hasAlpha,
              space: metadata.space
            },
            stats: {
              entropy: stats.entropy,
              brightness: Math.round(stats.channels.reduce((sum, channel) => sum + channel.mean, 0) / stats.channels.length)
            }
          };
        })
      );

      // Combine technical specs
      const avgBrightness = Math.round(
        analyses.reduce((sum, a) => sum + a.stats.brightness, 0) / analyses.length
      );

      const dominantAspectRatio = this.getMostFrequent(
        analyses.map(a => a.aspectRatio > 1.5 ? 'landscape' : a.aspectRatio < 0.75 ? 'portrait' : 'square')
      );

      return {
        available: true,
        imageCount: analyses.length,
        averageBrightness: avgBrightness,
        dominantOrientation: dominantAspectRatio,
        formats: [...new Set(analyses.map(a => a.format))],
        aspectRatios: analyses.map(a => a.aspectRatio),
        colorProfiles: analyses.map(a => a.colorProfile),
        recommendations: this.generateTechnicalRecommendations(avgBrightness, dominantAspectRatio)
      };

    } catch (error) {
      console.warn('Technical analysis failed:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Generate technical recommendations based on image analysis
   */
  generateTechnicalRecommendations(brightness, orientation) {
    const recommendations = [];

    if (brightness > 200) {
      recommendations.push('Use dark text on light backgrounds for optimal contrast');
    } else if (brightness < 100) {
      recommendations.push('Consider light text on dark backgrounds to match the mood');
    }

    if (orientation === 'landscape') {
      recommendations.push('Optimize for horizontal layouts and wide screens');
    } else if (orientation === 'portrait') {
      recommendations.push('Consider vertical scroll layouts and mobile-first design');
    }

    return recommendations;
  }

  /**
   * Enhanced fallback analysis using Sharp
   */
  async fallbackToSharpAnalysis(imagePaths, type) {
    console.log('⚠️ Falling back to Sharp-based analysis...');
    
    if (!imagePaths.length) {
      return this.getBasicFallback();
    }

    const sharpAnalyses = await Promise.all(
      imagePaths.map(imagePath => this.analyzeImageWithSharp(imagePath))
    );

    return this.combineSharpAnalyses(sharpAnalyses, type);
  }

  /**
   * Single image analysis with Sharp (enhanced version)
   */
  async analyzeImageWithSharp(imagePath) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const stats = await image.stats();
      
      // Extract colors
      const colors = await this.extractColorsAdvanced(image);
      
      // Determine style from filename and colors
      const filename = path.basename(imagePath).toLowerCase();
      const styleGuess = this.guessStyleFromFilenameAndColors(filename, colors);
      
      return {
        filename: path.basename(imagePath),
        colors,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: (metadata.width / metadata.height).toFixed(2),
          format: metadata.format
        },
        styleGuess,
        confidence: 0.6 // Lower confidence for Sharp-only analysis
      };
    } catch (error) {
      console.error('Sharp analysis failed for', imagePath, ':', error);
      return this.getBasicFallback(imagePath);
    }
  }

  /**
   * Advanced color extraction with Sharp
   */
  async extractColorsAdvanced(image) {
    try {
      const { data, info } = await image
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colorMap = new Map();
      const channels = info.channels >= 3 ? 3 : info.channels;

      // Sample every 4th pixel for efficiency
      for (let i = 0; i < data.length; i += channels * 4) {
        if (i + 2 >= data.length) break;
        
        const r = data[i] || 0;
        const g = data[i + 1] || 0;
        const b = data[i + 2] || 0;
        
        // Skip extreme values
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        if (brightness < 15 || brightness > 240) continue;
        
        const colorKey = `${Math.floor(r/20)*20},${Math.floor(g/20)*20},${Math.floor(b/20)*20}`;
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }

      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([color]) => {
          const [r, g, b] = color.split(',').map(Number);
          return this.rgbToHex(r, g, b);
        });

      return {
        palette: sortedColors.length > 0 ? sortedColors : ['#333333', '#666666', '#999999'],
        dominant: sortedColors[0] || '#333333',
        temperature: this.analyzeColorTemperature(sortedColors),
        saturation: this.analyzeColorSaturation(sortedColors)
      };
    } catch (error) {
      console.warn('Color extraction failed:', error);
      return {
        palette: ['#333333', '#666666', '#999999'],
        dominant: '#333333',
        temperature: 'neutral',
        saturation: 'medium'
      };
    }
  }

  /**
   * Analyze color temperature
   */
  analyzeColorTemperature(colors) {
    if (colors.length === 0) return 'neutral';
    
    let warmScore = 0;
    let coolScore = 0;
    
    colors.forEach(hex => {
      const rgb = this.hexToRgb(hex);
      const warmness = (rgb.r * 0.5 + rgb.g * 0.3) - rgb.b * 0.8;
      if (warmness > 0) warmScore++;
      else coolScore++;
    });
    
    if (warmScore > coolScore) return 'warm';
    if (coolScore > warmScore) return 'cool';
    return 'neutral';
  }

  /**
   * Analyze color saturation
   */
  analyzeColorSaturation(colors) {
    if (colors.length === 0) return 'medium';
    
    const avgSaturation = colors.reduce((sum, hex) => {
      const rgb = this.hexToRgb(hex);
      const max = Math.max(rgb.r, rgb.g, rgb.b);
      const min = Math.min(rgb.r, rgb.g, rgb.b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      return sum + saturation;
    }, 0) / colors.length;
    
    if (avgSaturation > 0.6) return 'high';
    if (avgSaturation < 0.3) return 'low';
    return 'medium';
  }

  /**
   * Guess style from filename and colors
   */
  guessStyleFromFilenameAndColors(filename, colors) {
    const styleGuess = {
      category: 'modern',
      mood: 'clean',
      confidence: 0.5
    };

    // Filename analysis
    Object.entries(this.visualDNAPatterns).forEach(([style, pattern]) => {
      const matchCount = pattern.keywords.reduce((count, keyword) => {
        return count + (filename.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (matchCount > 0) {
        styleGuess.category = style;
        styleGuess.confidence = Math.min(0.8, 0.5 + (matchCount * 0.15));
      }
    });

    // Color-based mood adjustment
    if (colors.temperature === 'warm' && colors.saturation === 'high') {
      styleGuess.mood = 'energetic';
    } else if (colors.temperature === 'cool' && colors.saturation === 'low') {
      styleGuess.mood = 'sophisticated';
    } else if (colors.saturation === 'low') {
      styleGuess.mood = 'minimal';
    }

    return styleGuess;
  }

  /**
   * Combine Sharp analyses
   */
  combineSharpAnalyses(analyses, type) {
    const validAnalyses = analyses.filter(a => a && a.colors);
    if (validAnalyses.length === 0) return this.getBasicFallback();

    // Combine colors
    const allColors = validAnalyses.flatMap(a => a.colors.palette);
    const uniqueColors = [...new Set(allColors)];

    // Get dominant style
    const styleVotes = {};
    validAnalyses.forEach(analysis => {
      const category = analysis.styleGuess?.category || 'modern';
      styleVotes[category] = (styleVotes[category] || 0) + (analysis.confidence || 0.5);
    });

    const dominantStyle = Object.keys(styleVotes).reduce((a, b) => 
      styleVotes[a] > styleVotes[b] ? a : b, 'modern'
    );

    // Combine temperature analysis
    const temperatures = validAnalyses.map(a => a.colors.temperature);
    const dominantTemp = this.getMostFrequent(temperatures) || 'neutral';

    // Get most common mood
    const moods = validAnalyses.map(a => a.styleGuess?.mood || 'clean');
    const dominantMood = this.getMostFrequent(moods) || 'clean';

    return {
      visualDNA: {
        category: dominantStyle,
        mood: dominantMood
      },
      colors: {
        palette: uniqueColors.slice(0, 6),
        temperature: dominantTemp,
        saturation: this.getMostFrequent(validAnalyses.map(a => a.colors.saturation)) || 'medium'
      },
      typography: {
        category: this.visualDNAPatterns[dominantStyle]?.typography[0] || 'sans-serif',
        weight: 'regular',
        spacing: 'normal'
      },
      layout: {
        grid: 'standard',
        whitespace: 'balanced',
        flow: 'top-to-bottom'
      },
      structure: {
        navigation: 'horizontal',
        sections: 'standard',
        hierarchy: 'balanced'
      },
      signatures: this.visualDNAPatterns[dominantStyle]?.keywords || ['modern'],
      implementationNotes: `Detected ${dominantStyle} aesthetic with ${dominantTemp} color temperature. Focus on ${this.visualDNAPatterns[dominantStyle]?.typography[0] || 'clean'} typography and ${this.visualDNAPatterns[dominantStyle]?.layout[0] || 'balanced'} layouts.`,
      confidence: Math.min(0.7, validAnalyses.reduce((sum, a) => sum + a.confidence, 0) / validAnalyses.length),
      analysisMethod: 'sharp-fallback',
      imageCount: validAnalyses.length
    };
  }

  /**
   * Utility methods
   */
  rgbToHex(r, g, b) {
    return `#${[r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  getMostFrequent(array) {
    if (!array.length) return null;
    const frequency = {};
    array.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

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

  getBasicFallback(imagePath = '') {
    return {
      visualDNA: { category: 'modern', mood: 'clean' },
      colors: { 
        palette: ['#333333', '#666666', '#999999'], 
        temperature: 'neutral',
        saturation: 'medium'
      },
      typography: { category: 'sans-serif', weight: 'regular', spacing: 'normal' },
      layout: { grid: 'standard', whitespace: 'balanced', flow: 'top-to-bottom' },
      structure: { navigation: 'horizontal', sections: 'standard', hierarchy: 'balanced' },
      signatures: ['clean', 'modern'],
      implementationNotes: 'Using fallback modern aesthetic with balanced design principles.',
      confidence: 0.3,
      analysisMethod: 'basic-fallback',
      imageCount: 0
    };
  }

  /**
   * Main orchestration method - The "INSANE" system entry point
   */
  async runInsaneAnalysis(moodboardPaths, portfolioData, projectImages) {
    console.log('🚀 Running INSANE Analysis System...');
    
    const results = {
      timestamp: new Date().toISOString(),
      analysisLevels: {}
    };

    try {
      // PHASE 1: Visual Intelligence System
      console.log('🧠 Phase 1: Visual Intelligence...');
      results.analysisLevels.visualIntelligence = await this.analyzeVisualDNA(moodboardPaths, 'moodboard');

      // PHASE 2: Content Quality Detective  
      console.log('🕵️ Phase 2: Content Quality Analysis...');
      results.analysisLevels.contentQuality = this.analyzeContentQuality(portfolioData, projectImages);

      // PHASE 3: Industry Intelligence
      console.log('🎯 Phase 3: Industry Detection...');
      results.analysisLevels.industryIntelligence = this.detectIndustry(portfolioData);

      // PHASE 4: Smart Prompt Assembly
      console.log('🧩 Phase 4: Intelligent Prompt Assembly...');
      results.intelligentPrompt = this.assembleIntelligentPrompt(
        portfolioData,
        projectImages, 
        results.analysisLevels.visualIntelligence,
        results.analysisLevels.contentQuality,
        results.analysisLevels.industryIntelligence
      );

      // Calculate overall system confidence
      const confidenceScores = [
        results.analysisLevels.visualIntelligence?.confidence || 0,
        results.analysisLevels.contentQuality?.confidence || 0,
        results.analysisLevels.industryIntelligence?.confidence || 0
      ];
      
      results.overallConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
      results.systemStatus = results.overallConfidence > 0.75 ? 'INSANE' : 
                           results.overallConfidence > 0.6 ? 'SMART' : 
                           results.overallConfidence > 0.4 ? 'BASIC' : 'FALLBACK';

      console.log(`✅ INSANE Analysis Complete!`);
      console.log(`🎯 System Status: ${results.systemStatus} (${Math.round(results.overallConfidence * 100)}% confidence)`);
      console.log(`🧠 Visual Intelligence: ${Math.round((results.analysisLevels.visualIntelligence?.confidence || 0) * 100)}%`);
      console.log(`📝 Content Strategy: ${Math.round((results.analysisLevels.contentQuality?.confidence || 0) * 100)}%`);
      console.log(`🏭 Industry Detection: ${Math.round((results.analysisLevels.industryIntelligence?.confidence || 0) * 100)}%`);
      
      return results;

    } catch (error) {
      console.error('❌ INSANE Analysis failed:', error);
      
      // Fallback to basic analysis
      results.analysisLevels.visualIntelligence = await this.fallbackToSharpAnalysis(moodboardPaths, 'moodboard');
      results.analysisLevels.contentQuality = this.analyzeContentQuality(portfolioData, projectImages);
      results.analysisLevels.industryIntelligence = this.detectIndustry(portfolioData);
      
      results.intelligentPrompt = this.assembleIntelligentPrompt(
        portfolioData,
        projectImages,
        results.analysisLevels.visualIntelligence,
        results.analysisLevels.contentQuality,
        results.analysisLevels.industryIntelligence
      );
      
      results.overallConfidence = 0.4;
      results.systemStatus = 'FALLBACK';
      results.error = error.message;
      
      console.log(`⚠️ Using fallback system: ${results.systemStatus} (${Math.round(results.overallConfidence * 100)}% confidence)`);
      
      return results;
    }
  }

  /**
   * Analyze multiple images from uploaded files (for moodboard buffers)
   */
  async analyzeUploadedImages(uploadedFiles, type = 'moodboard') {
    console.log(`🖼️ Analyzing ${uploadedFiles.length} uploaded ${type} images...`);
    
    if (!this.useClaudeVision || !uploadedFiles.length) {
      console.log('⚠️ No Claude Vision available or no images');
      return this.getBasicFallback();
    }

    try {
      // Convert uploaded files to Claude Vision format
      const imageContents = uploadedFiles.slice(0, 4).map(file => ({
        type: "image",
        source: {
          type: "base64",
          media_type: this.getMediaTypeFromMimetype(file.mimetype),
          data: file.buffer.toString('base64')
        }
      }));

      const visionPrompt = this.generateVisualDNAPrompt(type, uploadedFiles.length);
      
      const response = await this.anthropicClient.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: visionPrompt },
            ...imageContents
          ]
        }]
      });

      const analysisResult = this.parseVisualDNAResponse(response.content[0].text);
      
      return {
        ...analysisResult,
        confidence: analysisResult.confidence || 0.8,
        analysisMethod: 'claude-vision-uploaded',
        imageCount: uploadedFiles.length
      };

    } catch (error) {
      console.warn('Claude Vision analysis of uploaded files failed:', error);
      return this.getBasicFallback();
    }
  }

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
}

module.exports = ImageParser;