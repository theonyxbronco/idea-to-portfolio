const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

class imageParser {
  constructor() {
    // Future Google Vision integration (commented out)
    /*
    try {
      const vision = require('@google-cloud/vision');
      this.visionClient = new vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_VISION_KEY_PATH,
        // credentials: JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS)
      });
      this.useGoogleVision = true;
    } catch (error) {
      console.warn('Google Vision not configured, using basic analysis');
      this.useGoogleVision = false;
    }
    */
    this.useGoogleVision = false; // Disabled for now
  }

  /**
   * Analyze image for design insights using Sharp + filename analysis
   * @param {string} imagePath - Path to image file
   * @returns {Object} Analysis results
   */
  async analyzeImage(imagePath) {
    try {
      console.log(`🔍 Analyzing image: ${path.basename(imagePath)}`);
      
      const analysisResults = {
        colors: await this.extractColors(imagePath),
        metadata: await this.getImageMetadata(imagePath),
        filename: path.basename(imagePath),
        designStyle: {},
        technicalSpecs: {},
        aiPromptInsights: '',
        structureAnalysis: null // NEW: Add structure analysis
      };

      // Generate design insights from color and filename analysis
      analysisResults.designStyle = this.interpretDesignStyle(analysisResults);
      analysisResults.technicalSpecs = this.generateTechnicalSpecs(analysisResults);
      
      // NEW: Add structure analysis for layout patterns
      analysisResults.structureAnalysis = await this.analyzeImageStructure(imagePath);
      
      analysisResults.aiPromptInsights = this.generateAIPromptInsights(analysisResults);

      return analysisResults;

    } catch (error) {
      console.error('Image analysis failed:', error);
      return this.getFallbackAnalysis(imagePath);
    }
  }

  /**
   * Analyze multiple images (moodboard + project images)
   * @param {Array} imagePaths - Array of image paths
   * @param {string} type - 'moodboard', 'process', 'final'
   * @returns {Object} Combined analysis
   */
  async analyzeImageSet(imagePaths, type = 'moodboard') {
    console.log(`🎨 Analyzing ${imagePaths.length} ${type} images...`);
    
    const individualAnalyses = await Promise.all(
      imagePaths.map(imagePath => this.analyzeImage(imagePath))
    );

    const combinedResult = this.combineAnalyses(individualAnalyses, type);

    // NEW: Enhanced analysis for moodboard type
    if (type === 'moodboard') {
      combinedResult.structureAnalysis = await this.combineMoodboardStructures(individualAnalyses);
    }

    return combinedResult;
  }

  /**
   * NEW: Analyze image for website structure and layout patterns
   * @param {string} imagePath - Path to image file
   * @returns {Object} Structure analysis results
   */
  async analyzeImageStructure(imagePath) {
    try {
      const image = sharp(imagePath);
      const { width, height } = await image.metadata();
      const stats = await image.stats();
      
      let confidence = 0;
      const structures = {
        filename: path.basename(imagePath),
        dimensions: { width, height, aspectRatio: (width / height).toFixed(2) }
      };
      
      // Detect header region (top 15% of image)
      const hasHeader = await this.detectHeaderRegion(image, width, height);
      if (hasHeader.detected) {
        structures.hasHeader = true;
        structures.headerStyle = hasHeader.style;
        confidence += 0.2;
      }
      
      // Detect navigation patterns
      const navigationStyle = await this.detectNavigationStyle(image, width, height);
      if (navigationStyle.detected) {
        structures.navigationStyle = navigationStyle.type;
        confidence += 0.25;
      }
      
      // Detect sidebar patterns
      const hasSidebar = await this.detectSidebarPattern(image, width, height);
      if (hasSidebar.detected) {
        structures.hasSidebar = true;
        structures.sidebarPosition = hasSidebar.position;
        confidence += 0.15;
      }
      
      // Estimate section count and layout type
      const sectionAnalysis = await this.analyzeSectionLayout(image, width, height);
      structures.sectionCount = sectionAnalysis.count;
      structures.layoutType = sectionAnalysis.type;
      if (sectionAnalysis.confidence > 0.3) {
        confidence += 0.2;
      }
      
      // Detect grid patterns
      const gridAnalysis = await this.detectGridPatterns(image, width, height);
      if (gridAnalysis.detected) {
        structures.gridStyle = gridAnalysis.type;
        structures.columns = gridAnalysis.columns;
        confidence += 0.2;
      }
      
      structures.confidence = confidence;
      structures.hasStructuralElements = confidence > 0.3;
      
      return structures;
    } catch (error) {
      console.warn('Image structure analysis failed:', error);
      return { confidence: 0, hasStructuralElements: false };
    }
  }

  /**
   * NEW: Combine structure analyses from multiple moodboard images
   */
  async combineMoodboardStructures(individualAnalyses) {
    const structuralElements = individualAnalyses
      .map(analysis => analysis.structureAnalysis)
      .filter(structure => structure && structure.hasStructuralElements);

    if (structuralElements.length === 0) {
      return {
        hasStructuralElements: false,
        recommendedFallback: true,
        detectedStructures: [],
        summary: 'No clear website structure patterns detected in moodboard images. Using fallback sections.'
      };
    }

    // Analyze common patterns
    const commonPatterns = {
      navigationStyles: this.getMostFrequent(structuralElements.map(s => s.navigationStyle).filter(Boolean)),
      layoutTypes: this.getMostFrequent(structuralElements.map(s => s.layoutType).filter(Boolean)),
      gridStyles: this.getMostFrequent(structuralElements.map(s => s.gridStyle).filter(Boolean)),
      hasHeaders: structuralElements.filter(s => s.hasHeader).length > structuralElements.length / 2,
      hasSidebars: structuralElements.filter(s => s.hasSidebar).length > structuralElements.length / 2
    };

    const avgConfidence = structuralElements.reduce((sum, s) => sum + s.confidence, 0) / structuralElements.length;

    return {
      hasStructuralElements: true,
      recommendedFallback: false,
      detectedStructures: structuralElements,
      commonPatterns,
      averageConfidence: avgConfidence,
      summary: this.generateStructureSummary(commonPatterns, avgConfidence)
    };
  }

  /**
   * NEW: Generate structure summary for AI prompt
   */
  generateStructureSummary(patterns, confidence) {
    let summary = `DETECTED LAYOUT PATTERNS (${Math.round(confidence * 100)}% confidence):\n`;
    
    if (patterns.navigationStyles) {
      summary += `🧭 Navigation Style: ${patterns.navigationStyles}\n`;
    }
    
    if (patterns.layoutTypes) {
      summary += `📐 Layout Type: ${patterns.layoutTypes}\n`;
    }
    
    if (patterns.gridStyles) {
      summary += `🔲 Grid Style: ${patterns.gridStyles}\n`;
    }
    
    if (patterns.hasHeaders) {
      summary += `📋 Has Header Sections: Yes\n`;
    }
    
    if (patterns.hasSidebars) {
      summary += `📌 Has Sidebar Elements: Yes\n`;
    }
    
    summary += `\n💡 RECOMMENDATION: Use these detected patterns as the primary structure instead of standard portfolio sections.`;
    
    return summary;
  }

  /**
   * NEW: Detect header region in image
   */
  async detectHeaderRegion(image, width, height) {
    try {
      const headerHeight = Math.floor(height * 0.15);
      const headerStats = await image.extract({ left: 0, top: 0, width, height: headerHeight }).stats();
      
      const colorVariance = headerStats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / headerStats.channels.length;
      
      return {
        detected: colorVariance < 30,
        style: colorVariance < 15 ? 'minimal' : 'complex'
      };
    } catch (error) {
      return { detected: false };
    }
  }

  /**
   * NEW: Detect navigation style patterns
   */
  async detectNavigationStyle(image, width, height) {
    try {
      const aspectRatio = width / height;
      const navHeight = Math.floor(height * 0.1);
      const navStats = await image.extract({ left: 0, top: 0, width, height: navHeight }).stats();
      
      if (aspectRatio > 2) {
        return { detected: true, type: 'horizontal-wide' };
      } else if (aspectRatio < 0.5) {
        return { detected: true, type: 'vertical-sidebar' };
      } else if (navStats.entropy > 6) {
        return { detected: true, type: 'complex-navigation' };
      } else {
        return { detected: true, type: 'minimal-nav' };
      }
    } catch (error) {
      return { detected: false };
    }
  }

  /**
   * NEW: Detect sidebar patterns
   */
  async detectSidebarPattern(image, width, height) {
    try {
      const aspectRatio = width / height;
      
      if (aspectRatio > 1.5) {
        const leftStats = await image.extract({ left: 0, top: 0, width: Math.floor(width * 0.2), height }).stats();
        const rightStats = await image.extract({ left: Math.floor(width * 0.8), top: 0, width: Math.floor(width * 0.2), height }).stats();
        
        const leftVariance = leftStats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / leftStats.channels.length;
        const rightVariance = rightStats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / rightStats.channels.length;
        
        if (leftVariance < 25) {
          return { detected: true, position: 'left' };
        } else if (rightVariance < 25) {
          return { detected: true, position: 'right' };
        }
      }
      
      return { detected: false };
    } catch (error) {
      return { detected: false };
    }
  }

  /**
   * NEW: Analyze section layout patterns
   */
  async analyzeSectionLayout(image, width, height) {
    try {
      const aspectRatio = width / height;
      
      let sectionCount = 3;
      let layoutType = 'standard';
      let confidence = 0.3;
      
      if (aspectRatio > 2) {
        layoutType = 'horizontal-scroll';
        sectionCount = Math.floor(aspectRatio * 2);
        confidence = 0.6;
      } else if (aspectRatio < 0.5) {
        layoutType = 'vertical-long';
        sectionCount = Math.floor(height / (width * 0.8));
        confidence = 0.7;
      } else if (aspectRatio > 1.2 && aspectRatio < 1.8) {
        layoutType = 'balanced-grid';
        confidence = 0.5;
      }
      
      return {
        count: Math.min(Math.max(sectionCount, 2), 8),
        type: layoutType,
        confidence
      };
    } catch (error) {
      return { count: 3, type: 'standard', confidence: 0.1 };
    }
  }

  /**
   * NEW: Detect grid patterns in images
   */
  async detectGridPatterns(image, width, height) {
    try {
      const aspectRatio = width / height;
      
      if (aspectRatio > 1.2 && aspectRatio < 2.5) {
        const estimatedColumns = Math.floor(aspectRatio * 2);
        
        return {
          detected: true,
          type: estimatedColumns <= 2 ? 'two-column' : estimatedColumns <= 3 ? 'three-column' : 'multi-column',
          columns: Math.min(estimatedColumns, 4)
        };
      }
      
      return { detected: false };
    } catch (error) {
      return { detected: false };
    }
  }

  /**
   * Extract colors from image using Sharp
   */
  async extractColors(imagePath) {
    try {
      const image = sharp(imagePath);
      
      // Get image stats and dominant colors
      const stats = await image.stats();
      const metadata = await image.metadata();
      
      // Sample colors from different areas of the image
      const { data, info } = await image
        .resize(50, 50, { fit: 'cover' }) // Small grid for color sampling
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colors = this.analyzeColorData(data, info);
      
      // Calculate overall brightness from stats
      const avgBrightness = stats.channels.reduce((sum, channel) => sum + channel.mean, 0) / stats.channels.length;
      
      return {
        ...colors,
        brightness: Math.round(avgBrightness),
        isLight: avgBrightness > 180,
        isDark: avgBrightness < 80,
        dimensions: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: (metadata.width / metadata.height).toFixed(2)
        }
      };

    } catch (error) {
      console.error('Color extraction failed:', error);
      return { 
        dominant: '#333333', 
        palette: ['#333333', '#666666', '#999999'], 
        brightness: 128,
        isLight: false,
        isDark: false
      };
    }
  }

  /**
   * Get image metadata using Sharp
   */
  async getImageMetadata(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await sharp(imagePath).stats();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        isAnimated: metadata.pages > 1,
        aspectRatio: (metadata.width / metadata.height).toFixed(2),
        isLandscape: metadata.width > metadata.height,
        isPortrait: metadata.height > metadata.width,
        isSquare: Math.abs(metadata.width - metadata.height) < 50,
        size: stats.size || 0
      };
    } catch (error) {
      console.error('Failed to get image metadata:', error);
      return { width: 800, height: 600, format: 'jpeg', aspectRatio: '1.33' };
    }
  }

  /**
   * Analyze raw color data from Sharp buffer
   */
  analyzeColorData(data, info) {
    const colorMap = new Map();
    const channels = info.channels;
    const step = channels;

    // Sample colors from image data
    for (let i = 0; i < data.length; i += step * 4) { // Sample every 4th pixel
      if (i + channels - 1 >= data.length) break;
      
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      
      // Skip very dark or very light pixels to avoid noise
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      if (brightness < 20 || brightness > 235) continue;
      
      // Quantize colors to reduce noise (group similar colors)
      const quantizedR = Math.floor(r / 15) * 15;
      const quantizedG = Math.floor(g / 15) * 15;
      const quantizedB = Math.floor(b / 15) * 15;
      
      const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    // Get most frequent colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return this.rgbToHex(r, g, b);
      });

    // If no colors found, use defaults
    if (sortedColors.length === 0) {
      sortedColors.push('#333333', '#666666', '#999999');
    }

    return {
      dominant: sortedColors[0],
      palette: sortedColors,
      colorCount: colorMap.size
    };
  }

  /**
   * Interpret design style from filename, colors, and metadata
   */
  interpretDesignStyle(analysis) {
    const style = {
      mood: 'modern',
      vibe: 'clean',
      layoutSuggestions: [],
      typographySuggestions: [],
      colorScheme: 'balanced',
      confidence: 0.7 // Base confidence for filename-based analysis
    };

    const filename = analysis.filename.toLowerCase();
    const colors = analysis.colors || {};
    const metadata = analysis.metadata || {};

    // Analyze filename for style cues
    if (filename.includes('minimal') || filename.includes('clean') || filename.includes('simple')) {
      style.mood = 'minimal';
      style.vibe = 'clean';
      style.confidence = 0.8;
    } else if (filename.includes('creative') || filename.includes('art') || filename.includes('design')) {
      style.mood = 'creative';
      style.vibe = 'artistic';
      style.confidence = 0.8;
    } else if (filename.includes('professional') || filename.includes('business') || filename.includes('corporate')) {
      style.mood = 'professional';
      style.vibe = 'corporate';
      style.confidence = 0.8;
    } else if (filename.includes('fun') || filename.includes('playful') || filename.includes('colorful')) {
      style.mood = 'playful';
      style.vibe = 'energetic';
      style.confidence = 0.8;
    } else if (filename.includes('dark') || filename.includes('moody') || filename.includes('noir')) {
      style.mood = 'dramatic';
      style.vibe = 'moody';
      style.confidence = 0.8;
    }

    // Adjust based on color analysis
    if (colors.isLight) {
      style.colorScheme = 'light';
      if (style.mood === 'modern') style.vibe = 'bright';
    } else if (colors.isDark) {
      style.colorScheme = 'dark';
      if (style.mood === 'modern') style.vibe = 'sophisticated';
    }

    // Generate layout suggestions based on aspect ratio and style
    if (metadata.isLandscape) {
      style.layoutSuggestions.push('horizontal emphasis', 'wide grid layouts');
    } else if (metadata.isPortrait) {
      style.layoutSuggestions.push('vertical flow', 'stacked sections');
    } else if (metadata.isSquare) {
      style.layoutSuggestions.push('centered composition', 'grid-based layout');
    }

    // Style-specific layout suggestions
    switch (style.mood) {
      case 'minimal':
        style.layoutSuggestions.push('generous whitespace', 'clean typography');
        style.typographySuggestions.push('sans-serif', 'light weights');
        break;
      case 'creative':
        style.layoutSuggestions.push('asymmetrical layouts', 'experimental grid');
        style.typographySuggestions.push('display fonts', 'varied weights');
        break;
      case 'professional':
        style.layoutSuggestions.push('structured grid', 'balanced composition');
        style.typographySuggestions.push('readable fonts', 'consistent hierarchy');
        break;
      case 'playful':
        style.layoutSuggestions.push('dynamic layouts', 'colorful sections');
        style.typographySuggestions.push('friendly fonts', 'varied sizes');
        break;
    }

    return style;
  }

  /**
   * Generate technical specifications for CSS
   */
  generateTechnicalSpecs(analysis) {
    const colors = analysis.colors || {};
    const style = analysis.designStyle || {};
    const metadata = analysis.metadata || {};

    return {
      colorPalette: {
        primary: colors.dominant || '#333333',
        secondary: colors.palette?.[1] || '#666666',
        accent: colors.palette?.[2] || '#999999',
        palette: colors.palette || ['#333333', '#666666', '#999999'],
        brightness: colors.brightness || 128,
        scheme: style.colorScheme || 'balanced'
      },
      typography: {
        mood: style.mood || 'modern',
        suggestions: style.typographySuggestions || ['clean sans-serif'],
        hierarchy: this.generateTypographyHierarchy(style.mood)
      },
      layout: {
        style: style.vibe || 'clean',
        suggestions: style.layoutSuggestions || ['centered layout'],
        aspectRatio: metadata.aspectRatio || '1.33',
        orientation: metadata.isLandscape ? 'landscape' : metadata.isPortrait ? 'portrait' : 'square'
      },
      interactions: {
        hover: colors.isLight ? 'darken 10%' : 'lighten 10%',
        transitions: style.mood === 'playful' ? 'bouncy 300ms' : 'smooth 200ms ease',
        focus: `2px solid ${colors.dominant || '#333'}`
      }
    };
  }

  /**
   * Generate typography hierarchy based on detected mood
   */
  generateTypographyHierarchy(mood) {
    const hierarchies = {
      minimal: {
        h1: '2.5rem, 300 weight',
        h2: '2rem, 400 weight',
        body: '1rem, 400 weight',
        scale: '1.2 modular'
      },
      creative: {
        h1: '3rem, 700 weight',
        h2: '2.2rem, 600 weight',
        body: '1.1rem, 400 weight',
        scale: '1.3 modular'
      },
      professional: {
        h1: '2.2rem, 600 weight',
        h2: '1.8rem, 500 weight',
        body: '1rem, 400 weight',
        scale: '1.15 modular'
      },
      playful: {
        h1: '2.8rem, 800 weight',
        h2: '2.1rem, 700 weight',
        body: '1.1rem, 400 weight',
        scale: '1.25 modular'
      }
    };

    return hierarchies[mood] || hierarchies.minimal;
  }

  /**
   * Generate insights for AI prompt - ENHANCED with structure analysis
   */
  generateAIPromptInsights(analysis) {
    const colors = analysis.colors || {};
    const style = analysis.designStyle || {};
    const metadata = analysis.metadata || {};
    const structure = analysis.structureAnalysis || {};
    const filename = analysis.filename || '';

    let insights = `IMAGE ANALYSIS INSIGHTS (Sharp-based):\n`;
    insights += `📁 FILENAME: ${filename}\n`;
    insights += `🎨 DETECTED STYLE: ${style.mood} ${style.vibe} (${Math.round(style.confidence * 100)}% confidence)\n`;
    insights += `🌈 COLOR PALETTE: ${colors.palette?.join(', ') || 'neutral tones'}\n`;
    insights += `💡 DOMINANT COLOR: ${colors.dominant}\n`;
    insights += `✨ BRIGHTNESS: ${colors.brightness} (${colors.isLight ? 'light/bright' : colors.isDark ? 'dark/moody' : 'balanced'})\n`;
    insights += `📐 DIMENSIONS: ${metadata.width}x${metadata.height} (${metadata.aspectRatio} ratio, ${metadata.isLandscape ? 'landscape' : metadata.isPortrait ? 'portrait' : 'square'})\n`;
    insights += `🎯 FORMAT: ${metadata.format?.toUpperCase()}\n`;

    // NEW: Add structure analysis insights
    if (structure.hasStructuralElements) {
      insights += `\n🏗️ STRUCTURE ANALYSIS (${Math.round(structure.confidence * 100)}% confidence):\n`;
      if (structure.navigationStyle) insights += `🧭 Navigation: ${structure.navigationStyle}\n`;
      if (structure.layoutType) insights += `📐 Layout: ${structure.layoutType}\n`;
      if (structure.gridStyle) insights += `🔲 Grid: ${structure.gridStyle} (${structure.columns} columns)\n`;
      if (structure.hasHeader) insights += `📋 Header: ${structure.headerStyle} style\n`;
      if (structure.hasSidebar) insights += `📌 Sidebar: ${structure.sidebarPosition} position\n`;
      insights += `📊 Sections: ${structure.sectionCount} estimated\n`;
    }

    if (style.layoutSuggestions.length > 0) {
      insights += `📋 LAYOUT SUGGESTIONS: ${style.layoutSuggestions.join(', ')}\n`;
    }

    if (style.typographySuggestions.length > 0) {
      insights += `✍️ TYPOGRAPHY SUGGESTIONS: ${style.typographySuggestions.join(', ')}\n`;
    }

    insights += `\nDESIGN DIRECTION: Create a portfolio that captures the ${style.mood} ${style.vibe} aesthetic with ${colors.dominant} as the primary color. `;
    
    // NEW: Include structure recommendations
    if (structure.hasStructuralElements) {
      insights += `IMPORTANT: Use the detected ${structure.layoutType} layout pattern with ${structure.navigationStyle} navigation instead of standard portfolio sections. `;
    }
    
    if (style.layoutSuggestions.length > 0) {
      insights += `Consider implementing ${style.layoutSuggestions[0]} to match the detected style. `;
    }

    insights += `The overall tone should be ${colors.isLight ? 'bright and clean' : colors.isDark ? 'sophisticated and dramatic' : 'balanced and professional'}. `;
    
    insights += `Image format suggests ${metadata.format === 'png' ? 'clean graphics or logos' : metadata.format === 'jpg' ? 'photographs or complex imagery' : 'standard web imagery'}.`;

    return insights;
  }

  /**
   * Combine multiple image analyses - ENHANCED for structure
   */
  combineAnalyses(analyses, type) {
    if (!analyses.length) return this.getFallbackAnalysis();

    // Combine color palettes
    const allColors = analyses.flatMap(a => a.colors?.palette || []);
    const uniqueColors = [...new Set(allColors)];

    // Combine design styles by confidence
    const styleConfidences = {};
    analyses.forEach(analysis => {
      const mood = analysis.designStyle?.mood;
      const confidence = analysis.designStyle?.confidence || 0;
      if (mood) {
        styleConfidences[mood] = (styleConfidences[mood] || 0) + confidence;
      }
    });

    // Get most confident style
    const dominantMood = Object.keys(styleConfidences).reduce((a, b) => 
      styleConfidences[a] > styleConfidences[b] ? a : b, 'modern'
    );

    // Calculate average brightness
    const avgBrightness = Math.round(
      analyses.reduce((sum, a) => sum + (a.colors?.brightness || 128), 0) / analyses.length
    );

    // Combine all insights
    const combinedInsights = analyses
      .map((a, i) => `IMAGE ${i + 1}: ${a.aiPromptInsights}`)
      .join('\n\n');

    return {
      type,
      combinedColors: {
        palette: uniqueColors.slice(0, 8),
        dominant: analyses[0]?.colors?.dominant || '#333333',
        brightness: avgBrightness,
        isLight: avgBrightness > 180,
        isDark: avgBrightness < 80
      },
      combinedStyle: {
        mood: dominantMood,
        confidence: styleConfidences[dominantMood] / analyses.length,
        vibe: analyses.find(a => a.designStyle?.mood === dominantMood)?.designStyle?.vibe || 'clean'
      },
      aiPromptInsights: `COMBINED ${type.toUpperCase()} ANALYSIS:\n${combinedInsights}`,
      individualAnalyses: analyses,
      analysisMethod: 'sharp-based',
      totalImages: analyses.length
    };
  }

  /**
   * Fallback analysis when image processing fails
   */
  getFallbackAnalysis(imagePath) {
    const filename = imagePath ? path.basename(imagePath).toLowerCase() : 'unknown';
    
    // Try to infer style from filename
    let mood = 'modern';
    if (filename.includes('minimal')) mood = 'minimal';
    else if (filename.includes('creative')) mood = 'creative';
    else if (filename.includes('professional')) mood = 'professional';
    
    return {
      colors: { 
        dominant: '#333333', 
        palette: ['#333333', '#666666', '#999999'], 
        brightness: 128,
        isLight: false,
        isDark: false
      },
      metadata: { width: 800, height: 600, aspectRatio: '1.33' },
      filename,
      designStyle: { mood, vibe: 'clean', confidence: 0.3 },
      structureAnalysis: { confidence: 0, hasStructuralElements: false }, // NEW
      technicalSpecs: {
        colorPalette: { primary: '#333333', secondary: '#666666', accent: '#999999' }
      },
      aiPromptInsights: `FALLBACK ANALYSIS: Using ${mood} aesthetic based on filename "${filename}" with neutral color palette.`,
      analysisMethod: 'fallback'
    };
  }

  /**
   * Helper methods
   */
  rgbToHex(r, g, b) {
    return `#${[r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
  }

  getMostFrequent(array) {
    if (!array.length) return null;
    const frequency = {};
    array.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

  // Future Google Vision integration methods (commented out for now)
  /*
  async analyzeWithGoogleVision(imagePath) {
    try {
      const [result] = await this.visionClient.annotateImage({
        image: { source: { filename: imagePath } },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
          { type: 'TEXT_DETECTION' },
          { type: 'IMAGE_PROPERTIES' }
        ]
      });

      return {
        objects: result.localizedObjectAnnotations || [],
        labels: result.labelAnnotations || [],
        text: result.textAnnotations || [],
        imageProperties: result.imagePropertiesAnnotation || {},
        colors: this.extractColorsFromVision(result.imagePropertiesAnnotation)
      };

    } catch (error) {
      console.error('Google Vision analysis failed:', error);
      return {};
    }
  }

  extractColorsFromVision(imageProperties) {
    if (!imageProperties?.dominantColors?.colors) {
      return { dominant: '#333333', palette: ['#333333'] };
    }

    const colors = imageProperties.dominantColors.colors
      .slice(0, 6)
      .map(colorInfo => {
        const { red = 0, green = 0, blue = 0 } = colorInfo.color;
        return this.rgbToHex(red, green, blue);
      });

    return {
      dominant: colors[0] || '#333333',
      palette: colors,
      brightness: this.calculateBrightness(colors[0] || '#333333')
    };
  }
  */
}

module.exports = new imageParser();