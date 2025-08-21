const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

class ImageParser {
  constructor(anthropicClient) {
    this.anthropicClient = anthropicClient;
    this.useClaudeVision = !!anthropicClient;
    
    // Enhanced visual DNA patterns
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
   * 🎯 MAIN COMPREHENSIVE ANALYSIS METHOD
   * This orchestrates the entire analysis process
   */
  async runComprehensiveAnalysis(moodboardFiles, portfolioData, projectImages, designOptions = {}) {
    console.log('🚀 Starting Comprehensive Image Analysis...');
    
    const startTime = Date.now();
    const analysis = {
      timestamp: new Date().toISOString(),
      analysisLevels: {},
      designInputs: {
        moodboardFiles: moodboardFiles?.length || 0,
        selectedSkeleton: designOptions.selectedSkeleton || 'none',
        customDesignRequest: !!designOptions.customDesignRequest,
        hasUserProjects: projectImages?.projectImages?.length > 0
      }
    };

    try {
      // PHASE 1: Visual Intelligence (Moodboard Analysis)
      console.log('🧠 Phase 1: Visual Intelligence Analysis...');
      if (moodboardFiles && moodboardFiles.length > 0) {
        analysis.analysisLevels.visualIntelligence = await this.analyzeUploadedImages(moodboardFiles, 'moodboard');
        console.log(`✅ Visual analysis completed: ${analysis.analysisLevels.visualIntelligence.visualDNA?.category || 'unknown'} style`);
      } else {
        analysis.analysisLevels.visualIntelligence = this.getBasicFallback();
        console.log('⚠️ No moodboard files, using fallback visual analysis');
      }

      // PHASE 2: Content Quality Analysis
      console.log('🕵️ Phase 2: Content Quality Analysis...');
      analysis.analysisLevels.contentQuality = this.analyzeContentQuality(portfolioData, projectImages);
      console.log(`✅ Content analysis: ${analysis.analysisLevels.contentQuality.strategy} strategy`);

      // PHASE 3: Industry Intelligence
      console.log('🎯 Phase 3: Industry Detection...');
      analysis.analysisLevels.industryIntelligence = this.detectIndustry(portfolioData);
      console.log(`✅ Industry detected: ${analysis.analysisLevels.industryIntelligence.detectedIndustry}`);

      // PHASE 4: Design Options Integration
      if (designOptions.selectedSkeleton && designOptions.selectedSkeleton !== 'none') {
        analysis.skeletonIntegration = this.integrateSkeletonPreferences(analysis, designOptions.selectedSkeleton);
        console.log(`✅ Skeleton integrated: ${designOptions.selectedSkeleton}`);
      }

      if (designOptions.customDesignRequest) {
        analysis.customDesignIntegration = this.analyzeCustomDesignRequest(designOptions.customDesignRequest, analysis);
        console.log(`✅ Custom design analyzed: ${analysis.customDesignIntegration.primaryStyle}`);
      }

      // Calculate overall confidence
      const confidenceScores = [
        analysis.analysisLevels.visualIntelligence?.confidence || 0.3,
        analysis.analysisLevels.contentQuality?.confidence || 0.5,
        analysis.analysisLevels.industryIntelligence?.confidence || 0.5
      ];
      
      analysis.overallConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
      
      // Boost confidence if we have good design inputs
      const hasGoodInputs = moodboardFiles?.length > 0 || designOptions.selectedSkeleton !== 'none' || designOptions.customDesignRequest;
      if (hasGoodInputs && analysis.overallConfidence > 0.6) {
        analysis.overallConfidence = Math.min(0.95, analysis.overallConfidence + 0.15);
        analysis.systemStatus = 'ENHANCED';
      } else if (analysis.overallConfidence > 0.7) {
        analysis.systemStatus = 'SMART';
      } else if (analysis.overallConfidence > 0.4) {
        analysis.systemStatus = 'BASIC';
      } else {
        analysis.systemStatus = 'FALLBACK';
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Comprehensive Analysis Complete!`);
      console.log(`🎯 System Status: ${analysis.systemStatus} (${Math.round(analysis.overallConfidence * 100)}% confidence)`);
      console.log(`⏱️ Processing time: ${processingTime}ms`);
      
      analysis.processingTime = processingTime;
      return analysis;

    } catch (error) {
      console.error('❌ Comprehensive analysis failed:', error);
      
      // Fallback analysis
      analysis.analysisLevels.visualIntelligence = this.getBasicFallback();
      analysis.analysisLevels.contentQuality = this.analyzeContentQuality(portfolioData, projectImages);
      analysis.analysisLevels.industryIntelligence = this.detectIndustry(portfolioData);
      analysis.overallConfidence = 0.4;
      analysis.systemStatus = 'FALLBACK';
      analysis.error = error.message;
      
      return analysis;
    }
  }

  /**
   * 🖼️ ENHANCED UPLOADED IMAGES ANALYSIS
   * Handles both Sharp and Claude Vision analysis
   */
  async analyzeUploadedImages(uploadedFiles, type = 'moodboard') {
    console.log(`🖼️ Analyzing ${uploadedFiles.length} uploaded ${type} images...`);
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      console.log('⚠️ No images provided');
      return this.getBasicFallback();
    }

    let claudeAnalysis = null;
    let sharpAnalysis = null;

    // Try Claude Vision first if available
    if (this.useClaudeVision) {
      try {
        console.log('🤖 Running Claude Vision analysis...');
        claudeAnalysis = await this.runClaudeVisionAnalysis(uploadedFiles, type);
        console.log(`✅ Claude Vision analysis successful: ${claudeAnalysis?.visualDNA?.category || 'unknown'}`);
      } catch (error) {
        console.warn('⚠️ Claude Vision failed:', error.message);
      }
    }

    // Always run Sharp analysis as backup/enhancement
    try {
      console.log('🔍 Running Sharp analysis...');
      sharpAnalysis = await this.runSharpAnalysis(uploadedFiles);
      console.log(`✅ Sharp analysis successful: ${sharpAnalysis?.colors?.palette?.length || 0} colors extracted`);
    } catch (error) {
      console.warn('⚠️ Sharp analysis failed:', error.message);
    }

    // Combine results intelligently
    return this.combineAnalysisResults(claudeAnalysis, sharpAnalysis, uploadedFiles.length);
  }

  /**
   * 🤖 CLAUDE VISION ANALYSIS
   */
  async runClaudeVisionAnalysis(uploadedFiles, type) {
    const imageContents = uploadedFiles.slice(0, 4).map(file => ({
      type: "image",
      source: {
        type: "base64",
        media_type: this.getMediaTypeFromMimetype(file.mimetype || file.type),
        data: file.buffer.toString('base64')
      }
    }));

    const visionPrompt = this.generateEnhancedVisionPrompt(type, uploadedFiles.length);
    
    const response = await this.anthropicClient.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent analysis
      messages: [{
        role: "user",
        content: [
          { type: "text", text: visionPrompt },
          ...imageContents
        ]
      }]
    });

    return this.parseEnhancedVisionResponse(response.content[0].text);
  }

  /**
   * 🎨 ENHANCED VISION PROMPT
   */
  generateEnhancedVisionPrompt(type, imageCount) {
    return `You are an expert design analyst. Analyze these ${imageCount} ${type} images and extract precise design DNA that can be used to generate a matching portfolio.

ANALYZE AND EXTRACT:

1. **COLOR PALETTE**:
   - Primary colors (provide hex codes when possible)
   - Secondary colors
   - Accent colors
   - Overall color temperature (warm/cool/neutral)
   - Saturation levels (high/medium/low)

2. **TYPOGRAPHY STYLE**:
   - Font categories (serif/sans-serif/display/script)
   - Weight preferences (light/regular/bold)
   - Character spacing (tight/normal/generous)
   - Hierarchy patterns

3. **DESIGN AESTHETIC**:
   - Primary style (minimalist/vintage/modern/creative/professional)
   - Mood/vibe (clean/energetic/sophisticated/playful/elegant)
   - Design principles observed

4. **LAYOUT PATTERNS**:
   - Grid systems and structure
   - Whitespace usage
   - Content organization
   - Visual flow

5. **VISUAL ELEMENTS**:
   - Distinctive design elements
   - Repeated motifs or patterns
   - Unique styling approaches

RESPOND IN THIS EXACT FORMAT:

STYLE_CATEGORY: [minimalist/vintage/modern/creative/professional]
MOOD: [clean/energetic/sophisticated/playful/elegant]
COLORS: [color1, color2, color3, color4] | temperature: [warm/cool/neutral] | saturation: [high/medium/low]
TYPOGRAPHY: [serif/sans-serif/display] | weight: [light/regular/bold] | spacing: [tight/normal/generous]
LAYOUT: grid: [description] | whitespace: [minimal/generous/balanced] | flow: [description]
ELEMENTS: [element1, element2, element3]
CONFIDENCE: [0.1-1.0]
IMPLEMENTATION: [2-3 specific implementation suggestions]

Be precise and actionable in your analysis.`;
  }

  /**
   * 🔍 ENHANCED SHARP ANALYSIS
   */
  async runSharpAnalysis(uploadedFiles) {
    const analyses = [];
    
    for (const file of uploadedFiles.slice(0, 4)) { // Limit to 4 files for performance
      try {
        const image = sharp(file.buffer);
        const metadata = await image.metadata();
        
        // Enhanced color extraction
        const colors = await this.extractColorsWithSharp(image);
        
        // Style analysis from filename
        const styleGuess = this.analyzeStyleFromContext(file.originalname || 'image', colors);
        
        analyses.push({
          filename: file.originalname,
          metadata: {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            channels: metadata.channels
          },
          colors,
          styleGuess,
          confidence: 0.7
        });
        
      } catch (error) {
        console.warn(`Sharp analysis failed for ${file.originalname}:`, error.message);
      }
    }
    
    return this.combineSharpResults(analyses);
  }

  /**
   * 🎨 ENHANCED COLOR EXTRACTION WITH SHARP
   */
  async extractColorsWithSharp(image) {
    try {
      // Resize for faster processing
      const { data, info } = await image
        .resize(150, 150, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colorMap = new Map();
      const channels = Math.min(info.channels, 3); // RGB only
      
      // Sample every 3rd pixel for better performance
      for (let i = 0; i < data.length; i += channels * 3) {
        if (i + 2 >= data.length) break;
        
        const r = data[i] || 0;
        const g = data[i + 1] || 0;
        const b = data[i + 2] || 0;
        
        // Skip very dark or very light pixels
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        if (brightness < 20 || brightness > 235) continue;
        
        // Group similar colors
        const colorKey = `${Math.floor(r/15)*15},${Math.floor(g/15)*15},${Math.floor(b/15)*15}`;
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }

      // Get top colors
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([color]) => {
          const [r, g, b] = color.split(',').map(Number);
          return this.rgbToHex(r, g, b);
        });

      const palette = sortedColors.length > 0 ? sortedColors : ['#333333', '#666666', '#999999'];
      
      return {
        palette,
        dominant: palette[0],
        temperature: this.analyzeColorTemperature(palette),
        saturation: this.analyzeColorSaturation(palette),
        brightness: this.analyzeColorBrightness(palette)
      };
      
    } catch (error) {
      console.warn('Color extraction failed:', error);
      return {
        palette: ['#333333', '#666666', '#999999'],
        dominant: '#333333',
        temperature: 'neutral',
        saturation: 'medium',
        brightness: 'medium'
      };
    }
  }

  /**
   * 🎯 ENHANCED VISION RESPONSE PARSING
   */
  parseEnhancedVisionResponse(responseText) {
    const defaultAnalysis = {
      visualDNA: { category: 'modern', mood: 'professional' },
      colors: { palette: ['#333333', '#666666', '#999999'], temperature: 'neutral', saturation: 'medium' },
      typography: { category: 'sans-serif', weight: 'regular', spacing: 'normal' },
      layout: { grid: 'standard', whitespace: 'balanced', flow: 'top-to-bottom' },
      elements: ['clean', 'modern'],
      confidence: 0.7,
      implementationNotes: 'Modern professional design approach'
    };

    try {
      // Enhanced parsing with better regex patterns
      const styleMatch = responseText.match(/STYLE_CATEGORY:\s*([^\n]+)/i);
      if (styleMatch) {
        defaultAnalysis.visualDNA.category = styleMatch[1].trim().toLowerCase();
      }

      const moodMatch = responseText.match(/MOOD:\s*([^\n]+)/i);
      if (moodMatch) {
        defaultAnalysis.visualDNA.mood = moodMatch[1].trim().toLowerCase();
      }

      const colorsMatch = responseText.match(/COLORS:\s*\[([^\]]+)\][^|]*\|\s*temperature:\s*([^|]+)\|\s*saturation:\s*([^\n]+)/i);
      if (colorsMatch) {
        const colorList = colorsMatch[1].split(',').map(c => c.trim().replace(/['"]/g, ''));
        defaultAnalysis.colors.palette = colorList.length > 0 ? colorList : defaultAnalysis.colors.palette;
        defaultAnalysis.colors.temperature = colorsMatch[2].trim();
        defaultAnalysis.colors.saturation = colorsMatch[3].trim();
      }

      const typographyMatch = responseText.match(/TYPOGRAPHY:\s*([^|]+)\|\s*weight:\s*([^|]+)\|\s*spacing:\s*([^\n]+)/i);
      if (typographyMatch) {
        defaultAnalysis.typography.category = typographyMatch[1].trim();
        defaultAnalysis.typography.weight = typographyMatch[2].trim();
        defaultAnalysis.typography.spacing = typographyMatch[3].trim();
      }

      const elementsMatch = responseText.match(/ELEMENTS:\s*\[([^\]]+)\]/i);
      if (elementsMatch) {
        defaultAnalysis.elements = elementsMatch[1].split(',').map(e => e.trim().replace(/['"]/g, ''));
      }

      const confidenceMatch = responseText.match(/CONFIDENCE:\s*([0-9.]+)/i);
      if (confidenceMatch) {
        defaultAnalysis.confidence = Math.min(1.0, Math.max(0.1, parseFloat(confidenceMatch[1])));
      }

      const implementationMatch = responseText.match(/IMPLEMENTATION:\s*([^\n]+(?:\n[^\n]+)*)/i);
      if (implementationMatch) {
        defaultAnalysis.implementationNotes = implementationMatch[1].trim();
      }

      return {
        ...defaultAnalysis,
        analysisMethod: 'claude-vision-enhanced',
        rawResponse: responseText
      };

    } catch (error) {
      console.warn('Failed to parse vision response:', error);
      return {
        ...defaultAnalysis,
        analysisMethod: 'claude-vision-fallback',
        parseError: error.message
      };
    }
  }

  /**
   * 🔄 COMBINE ANALYSIS RESULTS
   */
  combineAnalysisResults(claudeAnalysis, sharpAnalysis, imageCount) {
    // If we have Claude analysis, use it as primary with Sharp enhancement
    if (claudeAnalysis && claudeAnalysis.confidence > 0.6) {
      console.log('🤖 Using Claude Vision as primary analysis');
      
      // Enhance with Sharp color data if available
      if (sharpAnalysis && sharpAnalysis.colors && sharpAnalysis.colors.palette.length > 0) {
        // Merge color palettes intelligently
        const combinedPalette = [
          ...claudeAnalysis.colors.palette.slice(0, 4),
          ...sharpAnalysis.colors.palette.slice(0, 4)
        ];
        
        claudeAnalysis.colors.palette = [...new Set(combinedPalette)].slice(0, 6);
        claudeAnalysis.colors.sharpEnhanced = true;
      }
      
      claudeAnalysis.imageCount = imageCount;
      claudeAnalysis.analysisMethod = 'claude-vision-primary';
      return claudeAnalysis;
    }
    
    // Fallback to Sharp analysis if Claude failed
    if (sharpAnalysis) {
      console.log('🔍 Using Sharp analysis as primary');
      sharpAnalysis.imageCount = imageCount;
      sharpAnalysis.analysisMethod = 'sharp-primary';
      return sharpAnalysis;
    }
    
    // Final fallback
    console.log('⚠️ Using basic fallback analysis');
    const fallback = this.getBasicFallback();
    fallback.imageCount = imageCount;
    return fallback;
  }

  /**
   * 🔄 COMBINE SHARP RESULTS
   */
  combineSharpResults(analyses) {
    if (analyses.length === 0) return this.getBasicFallback();
    
    // Combine all color palettes
    const allColors = analyses.flatMap(a => a.colors?.palette || []);
    const uniqueColors = [...new Set(allColors)];
    
    // Get most common style
    const styles = analyses.map(a => a.styleGuess?.category || 'modern');
    const dominantStyle = this.getMostFrequent(styles);
    
    // Get most common mood
    const moods = analyses.map(a => a.styleGuess?.mood || 'professional');
    const dominantMood = this.getMostFrequent(moods);
    
    // Get most common temperature
    const temperatures = analyses.map(a => a.colors?.temperature || 'neutral');
    const dominantTemperature = this.getMostFrequent(temperatures);
    
    return {
      visualDNA: {
        category: dominantStyle,
        mood: dominantMood
      },
      colors: {
        palette: uniqueColors.slice(0, 6),
        temperature: dominantTemperature,
        saturation: this.getMostFrequent(analyses.map(a => a.colors?.saturation || 'medium')),
        brightness: this.getMostFrequent(analyses.map(a => a.colors?.brightness || 'medium'))
      },
      typography: {
        category: this.mapStyleToTypography(dominantStyle),
        weight: 'regular',
        spacing: 'normal'
      },
      layout: {
        grid: 'standard',
        whitespace: 'balanced',
        flow: 'top-to-bottom'
      },
      elements: [dominantStyle, dominantMood],
      confidence: Math.min(0.8, analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length),
      analysisMethod: 'sharp-combined',
      imageCount: analyses.length
    };
  }

  /**
   * 🎨 ENHANCED COLOR ANALYSIS METHODS
   */
  analyzeColorTemperature(colors) {
    if (!colors || colors.length === 0) return 'neutral';
    
    let warmScore = 0;
    let coolScore = 0;
    
    colors.forEach(hex => {
      const rgb = this.hexToRgb(hex);
      // Enhanced temperature calculation
      const warmness = (rgb.r * 0.6 + rgb.g * 0.3) - (rgb.b * 0.8);
      const coolness = (rgb.b * 0.6 + rgb.g * 0.2) - (rgb.r * 0.5);
      
      if (warmness > 10) warmScore++;
      else if (coolness > 10) coolScore++;
    });
    
    if (warmScore > coolScore + 1) return 'warm';
    if (coolScore > warmScore + 1) return 'cool';
    return 'neutral';
  }

  analyzeColorSaturation(colors) {
    if (!colors || colors.length === 0) return 'medium';
    
    const avgSaturation = colors.reduce((sum, hex) => {
      const rgb = this.hexToRgb(hex);
      const max = Math.max(rgb.r, rgb.g, rgb.b);
      const min = Math.min(rgb.r, rgb.g, rgb.b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      return sum + saturation;
    }, 0) / colors.length;
    
    if (avgSaturation > 0.7) return 'high';
    if (avgSaturation < 0.3) return 'low';
    return 'medium';
  }

  analyzeColorBrightness(colors) {
    if (!colors || colors.length === 0) return 'medium';
    
    const avgBrightness = colors.reduce((sum, hex) => {
      const rgb = this.hexToRgb(hex);
      const brightness = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114);
      return sum + brightness;
    }, 0) / colors.length;
    
    if (avgBrightness > 180) return 'high';
    if (avgBrightness < 80) return 'low';
    return 'medium';
  }

  /**
   * 🎯 ENHANCED CONTENT QUALITY ANALYSIS
   */
  analyzeContentQuality(portfolioData, projectImages) {
    console.log('🕵️ Running Enhanced Content Quality Analysis...');
    
    const analysis = {
      contentType: 'minimal',
      strategy: 'placeholder-heavy',
      confidence: 0.0,
      recommendations: [],
      strengths: [],
      weaknesses: []
    };

    // Analyze project quality with enhanced metrics
    const projects = portfolioData.projects || [];
    const hasDetailedProjects = projects.some(p => 
      (p.overview && p.overview.length > 100) || 
      (p.description && p.description.length > 100) ||
      (p.problem && p.solution)
    );

    const hasModerateProjects = projects.some(p => 
      (p.overview && p.overview.length > 30) || 
      (p.description && p.description.length > 30)
    );

    // Enhanced image analysis
    const totalProjectImages = projectImages?.projectImages?.reduce((sum, p) => 
      sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0) || 0;

    const projectsWithImages = projectImages?.projectImages?.filter(p => 
      (p.processImages?.length || 0) + (p.finalImages?.length || 0) > 0
    ).length || 0;

    // Enhanced personal info analysis
    const personalInfo = portfolioData.personalInfo || {};
    const hasRichPersonalInfo = personalInfo.bio && personalInfo.bio.length > 50;
    const hasCompleteName = personalInfo.name && personalInfo.name.length > 2;
    const hasGoodTitle = personalInfo.title && personalInfo.title.length > 5;
    const hasSkills = personalInfo.skills && personalInfo.skills.length > 3;
    const hasSocialLinks = [personalInfo.website, personalInfo.linkedin, personalInfo.instagram, personalInfo.behance, personalInfo.dribbble].filter(Boolean).length > 1;

    // Calculate enhanced scores
    const projectContentScore = hasDetailedProjects ? 0.5 : (hasModerateProjects ? 0.3 : 0.1);
    const imageScore = Math.min(totalProjectImages / 12, 0.3); // Up to 0.3 for good image coverage
    const imageDistributionScore = projectsWithImages > 0 ? Math.min(projectsWithImages / projects.length, 0.2) : 0;
    const personalInfoScore = (hasCompleteName ? 0.05 : 0) + (hasGoodTitle ? 0.05 : 0) + (hasRichPersonalInfo ? 0.15 : 0) + (hasSkills ? 0.1 : 0) + (hasSocialLinks ? 0.05 : 0);
    
    const totalScore = projectContentScore + imageScore + imageDistributionScore + personalInfoScore;

    // Enhanced content classification
    if (totalScore > 0.8 && hasDetailedProjects && totalProjectImages > 8) {
      analysis.contentType = 'rich-content';
      analysis.strategy = 'showcase-heavy';
      analysis.confidence = 0.9;
      analysis.strengths = ['Detailed project descriptions', 'Excellent image collection', 'Complete personal info'];
      analysis.recommendations = ['Use detailed project storytelling', 'Showcase process images prominently', 'Create comprehensive case studies'];
    } else if (totalProjectImages > 5 && projectsWithImages >= projects.length * 0.7) {
      analysis.contentType = 'visual-heavy';
      analysis.strategy = 'visual-first';
      analysis.confidence = 0.8;
      analysis.strengths = ['Strong visual content', 'Good image distribution across projects'];
      analysis.weaknesses = hasDetailedProjects ? [] : ['Limited project descriptions'];
      analysis.recommendations = ['Focus 80% on visual design', 'Use images as primary storytelling device', 'Generate compelling project descriptions'];
    } else if (hasDetailedProjects && totalProjectImages < 4) {
      analysis.contentType = 'content-rich';
      analysis.strategy = 'story-driven';
      analysis.confidence = 0.7;
      analysis.strengths = ['Detailed project information', 'Good written content'];
      analysis.weaknesses = ['Limited visual content'];
      analysis.recommendations = ['Focus on project process and results', 'Use clean typography-focused layout', 'Create text-based case studies'];
    } else if (hasModerateProjects || totalProjectImages > 2) {
      analysis.contentType = 'moderate';
      analysis.strategy = 'balanced';
      analysis.confidence = 0.6;
      analysis.strengths = projects.length > 0 ? ['Has project content'] : [];
      analysis.weaknesses = ['Could use more detailed descriptions', 'More images would help'];
      analysis.recommendations = ['Balance visual and text content', 'Enhance existing project descriptions', 'Add process documentation'];
    } else {
      analysis.contentType = 'minimal';
      analysis.strategy = 'design-focused';
      analysis.confidence = 0.5;
      analysis.weaknesses = ['Limited project details', 'Few images available'];
      analysis.recommendations = ['Generate compelling placeholder content', 'Focus heavily on visual design', 'Create aspirational portfolio structure'];
    }

    // Add specific metrics
    analysis.metrics = {
      totalProjects: projects.length,
      detailedProjects: projects.filter(p => (p.overview || p.description || '').length > 100).length,
      moderateProjects: projects.filter(p => (p.overview || p.description || '').length > 30).length,
      totalImages: totalProjectImages,
      projectsWithImages: projectsWithImages,
      personalInfoScore: personalInfoScore,
      overallScore: totalScore,
      imageDistribution: projectsWithImages > 0 ? (projectsWithImages / projects.length) : 0
    };

    console.log(`✅ Content analysis complete: ${analysis.strategy} (${Math.round(analysis.confidence * 100)}%)`);
    return analysis;
  }

  /**
   * 🎯 ENHANCED INDUSTRY DETECTION
   */
  detectIndustry(portfolioData) {
    console.log('🎯 Running Enhanced Industry Detection...');
    
    const detectionSources = [
      portfolioData.personalInfo?.title || '',
      portfolioData.personalInfo?.bio || '',
      ...(portfolioData.personalInfo?.skills || []),
      ...(portfolioData.projects?.map(p => `${p.title} ${p.overview || p.description || ''} ${p.category || ''}`) || [])
    ].join(' ').toLowerCase();

    let bestMatch = { industry: 'general', confidence: 0.0, patterns: null };

    // Enhanced industry detection with weighted keywords
    Object.entries(this.industryPatterns).forEach(([industry, patterns]) => {
      let matchScore = 0;
      let totalWeight = 0;
      
      patterns.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (detectionSources.match(regex) || []).length;
        
        // Weight keywords differently based on context
        let weight = 1;
        if (portfolioData.personalInfo?.title?.toLowerCase().includes(keyword)) weight = 3;
        else if (portfolioData.personalInfo?.bio?.toLowerCase().includes(keyword)) weight = 2;
        else if (portfolioData.personalInfo?.skills?.some(skill => skill.toLowerCase().includes(keyword))) weight = 2;
        
        matchScore += matches * weight;
        totalWeight += weight;
      });
      
      const confidence = totalWeight > 0 ? Math.min(1.0, matchScore / totalWeight) : 0;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { industry, confidence, patterns };
      }
    });

    // Boost confidence for strong indicators
    if (bestMatch.confidence > 0.3) {
      bestMatch.confidence = Math.min(0.95, bestMatch.confidence + 0.2);
    }

    const result = {
      detectedIndustry: bestMatch.industry,
      confidence: bestMatch.confidence,
      industryPatterns: bestMatch.patterns,
      portfolioFocus: bestMatch.patterns?.portfolioFocus || 'general',
      recommendedSections: bestMatch.patterns?.sectionsNeeded || ['about', 'projects', 'contact'],
      layoutStyle: bestMatch.patterns?.layoutStyle || 'balanced',
      keywordMatches: this.findKeywordMatches(detectionSources, bestMatch.patterns?.keywords || [])
    };

    console.log(`✅ Industry detected: ${result.detectedIndustry} (${Math.round(result.confidence * 100)}%)`);
    return result;
  }

  /**
   * 🎨 DESIGN OPTIONS INTEGRATION
   */
  integrateSkeletonPreferences(analysis, selectedSkeleton) {
    const skeletonStyles = {
      'creative-professional': { category: 'creative', mood: 'professional', typography: 'sans-serif' },
      'gallery-first': { category: 'minimal', mood: 'sophisticated', typography: 'sans-serif' },
      'newspaper': { category: 'vintage', mood: 'editorial', typography: 'serif' },
      'storyteller': { category: 'cinematic', mood: 'narrative', typography: 'serif' }
    };
    
    const skeletonStyle = skeletonStyles[selectedSkeleton];
    if (skeletonStyle && analysis.analysisLevels?.visualIntelligence) {
      // Blend skeleton style with existing analysis
      const existing = analysis.analysisLevels.visualIntelligence;
      
      analysis.analysisLevels.visualIntelligence.skeletonInfluence = {
        selectedSkeleton,
        styleBlend: skeletonStyle,
        blendedCategory: skeletonStyle.category,
        blendedMood: skeletonStyle.mood,
        blendedTypography: skeletonStyle.typography
      };
    }
    
    return { selectedSkeleton, hasInfluence: !!skeletonStyle, confidence: 0.8 };
  }
  
  analyzeCustomDesignRequest(customRequest, analysis) {
    const request = customRequest.toLowerCase();
    
    const styleKeywords = {
      'minimal': ['minimal', 'clean', 'simple', 'minimalist'],
      'bold': ['bold', 'bright', 'vibrant', 'strong'],
      'dark': ['dark', 'black', 'moody', 'noir'],
      'luxury': ['luxury', 'premium', 'elegant', 'sophisticated'],
      'creative': ['creative', 'artistic', 'unique', 'experimental'],
      'professional': ['professional', 'corporate', 'business', 'formal'],
      'modern': ['modern', 'contemporary', 'current', 'trendy'],
      'vintage': ['vintage', 'retro', 'classic', 'traditional']
    };
    
    const detectedStyles = [];
    Object.entries(styleKeywords).forEach(([style, keywords]) => {
      const matches = keywords.filter(keyword => request.includes(keyword));
      if (matches.length > 0) {
        detectedStyles.push({ 
          style, 
          matches, 
          confidence: matches.length / keywords.length,
          weight: matches.length
        });
      }
    });
    
    // Sort by weight and confidence
    detectedStyles.sort((a, b) => (b.weight + b.confidence) - (a.weight + a.confidence));
    
    return {
      originalRequest: customRequest,
      detectedStyles: detectedStyles,
      primaryStyle: detectedStyles[0]?.style || 'modern',
      confidence: Math.min(0.9, detectedStyles.reduce((sum, style) => sum + style.confidence, 0) * 0.3 + 0.3)
    };
  }

  /**
   * 🔧 UTILITY METHODS
   */
  findKeywordMatches(text, keywords) {
    return keywords.filter(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(text);
    });
  }

  mapStyleToTypography(style) {
    const mapping = {
      'minimalist': 'sans-serif',
      'vintage': 'serif',
      'techStartup': 'sans-serif',
      'creative': 'display',
      'professional': 'serif',
      'modern': 'sans-serif'
    };
    return mapping[style] || 'sans-serif';
  }

  analyzeStyleFromContext(filename, colors) {
    const styleGuess = {
      category: 'modern',
      mood: 'professional',
      confidence: 0.5
    };

    // Enhanced filename analysis
    const name = filename.toLowerCase();
    Object.entries(this.visualDNAPatterns).forEach(([style, pattern]) => {
      const matchCount = pattern.keywords.reduce((count, keyword) => {
        return count + (name.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (matchCount > 0) {
        styleGuess.category = style;
        styleGuess.confidence = Math.min(0.8, 0.5 + (matchCount * 0.15));
      }
    });

    // Enhanced color-based mood analysis
    if (colors && colors.temperature && colors.saturation) {
      if (colors.temperature === 'warm' && colors.saturation === 'high') {
        styleGuess.mood = 'energetic';
      } else if (colors.temperature === 'cool' && colors.saturation === 'low') {
        styleGuess.mood = 'sophisticated';
      } else if (colors.saturation === 'low') {
        styleGuess.mood = 'minimal';
      } else if (colors.saturation === 'high') {
        styleGuess.mood = 'creative';
      }
    }

    return styleGuess;
  }

  rgbToHex(r, g, b) {
    return `#${[r, g, b].map(x => {
      const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
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
    if (!array || array.length === 0) return null;
    const frequency = {};
    array.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
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

  getBasicFallback() {
    return {
      visualDNA: { category: 'modern', mood: 'professional' },
      colors: { 
        palette: ['#2563eb', '#64748b', '#f1f5f9', '#0f172a'], 
        temperature: 'cool',
        saturation: 'medium',
        brightness: 'medium'
      },
      typography: { category: 'sans-serif', weight: 'regular', spacing: 'normal' },
      layout: { grid: 'standard', whitespace: 'balanced', flow: 'top-to-bottom' },
      elements: ['clean', 'modern', 'professional'],
      implementationNotes: 'Using modern professional aesthetic with balanced design principles and contemporary color palette.',
      confidence: 0.5,
      analysisMethod: 'basic-fallback',
      imageCount: 0
    };
  }

  // Legacy method support for backward compatibility
  async runEnhancedAnalysisWithUploads(moodboardFiles, portfolioData, projectImages, designOptions = {}) {
    return this.runComprehensiveAnalysis(moodboardFiles, portfolioData, projectImages, designOptions);
  }

  async createFallbackAnalysis(portfolioData, projectImages, options = {}) {
    return {
      timestamp: new Date().toISOString(),
      analysisLevels: {
        visualIntelligence: this.getBasicFallback(),
        contentQuality: this.analyzeContentQuality(portfolioData, projectImages),
        industryIntelligence: this.detectIndustry(portfolioData)
      },
      overallConfidence: 0.5,
      systemStatus: 'FALLBACK',
      designOptions: options || {}
    };
  }

  createBasicAnalysis(portfolioData, projectImages, options = {}) {
    return {
      timestamp: new Date().toISOString(),
      analysisLevels: {
        visualIntelligence: this.getBasicFallback(),
        contentQuality: this.analyzeContentQuality(portfolioData, projectImages),
        industryIntelligence: this.detectIndustry(portfolioData)
      },
      overallConfidence: 0.6,
      systemStatus: 'BASIC',
      designOptions: options || {}
    };
  }
}

module.exports = ImageParser;