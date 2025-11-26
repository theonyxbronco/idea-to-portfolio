const { logger } = require("./../logger");
// portfolio-backend/utils/validators/designValidator.js
const { JSDOM } = require('jsdom');

class DesignValidator {
  constructor() {
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * Main design validation function - moodboard-first approach
   * @param {string} htmlString - Generated HTML content
   * @param {Object} portfolioData - Original portfolio data
   * @param {Object} processedImages - Processed images with URLs
   * @returns {Object} Design validation results
   */
  async validate(htmlString, portfolioData, processedImages = {}) {
    logger.info('🎨 Running moodboard-first design validation...');
    
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];

    try {
      const dom = new JSDOM(htmlString);
      const document = dom.window.document;

      // Extract colors and styles from generated HTML
      const generatedColors = this.extractColorsFromHTML(document);
      const layoutAnalysis = this.analyzeLayoutPatterns(document);
      
      // Check if moodboard was provided
      const hasMoodboard = processedImages.moodboard?.length > 0;
      
      if (hasMoodboard) {
        // MOODBOARD-DRIVEN VALIDATION
        await this.validateMoodboardFidelity(document, processedImages.moodboard, generatedColors, layoutAnalysis);
        await this.validateMoodboardLayoutAdherence(document, processedImages.moodboard, layoutAnalysis);
        await this.validateMoodboardTypographyAdherence(document, processedImages.moodboard);
      } else {
        // FALLBACK VALIDATION (no moodboard)
        await this.validateStylePreferences(document, portfolioData.stylePreferences || {});
        await this.validateGenericDesignQuality(document, generatedColors);
      }

      // Universal checks (always run)
      await this.validateImageUsage(document, processedImages);
      await this.validateResponsiveDesign(document);
      await this.validateDesignTechnicalQuality(document);

      // Calculate overall score
      const totalChecks = this.passedChecks.length + this.issues.length;
      const score = totalChecks > 0 ? Math.round((this.passedChecks.length / totalChecks) * 100) : 0;

      return {
        score,
        issues: this.issues,
        passed: this.passedChecks,
        suggestions: this.suggestions,
        summary: this.generateSummary(score, hasMoodboard),
        generatedColors,
        layoutAnalysis,
        moodboardAnalysis: hasMoodboard ? this.analyzeMoodboardCompliance(document, processedImages.moodboard) : null,
        recommendations: this.generateDesignRecommendations(hasMoodboard)
      };

    } catch (error) {
      logger.error('Design validation error:', error);
      return {
        score: 50,
        issues: [{ 
          type: 'validation_error', 
          severity: 'medium', 
          message: 'Design validation failed',
          details: error.message 
        }],
        passed: [],
        suggestions: []
      };
    }
  }

  /**
   * Extract colors from HTML and CSS
   */
  extractColorsFromHTML(document) {
    const colors = new Set();
    
    // Extract colors from style elements
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach(styleEl => {
      const css = styleEl.textContent || '';
      
      // Match hex colors
      const hexColors = css.match(/#[0-9a-fA-F]{3,6}/g);
      if (hexColors) {
        hexColors.forEach(color => colors.add(color.toLowerCase()));
      }
      
      // Match rgb/rgba colors
      const rgbColors = css.match(/rgba?\([^)]+\)/g);
      if (rgbColors) {
        rgbColors.forEach(color => colors.add(color));
      }
      
      // Match named colors
      const namedColors = css.match(/\b(red|blue|green|yellow|purple|orange|pink|gray|grey|black|white|brown|cyan|magenta)\b/gi);
      if (namedColors) {
        namedColors.forEach(color => colors.add(color.toLowerCase()));
      }
    });

    // Extract colors from inline styles
    const elementsWithStyles = document.querySelectorAll('[style]');
    elementsWithStyles.forEach(element => {
      const style = element.getAttribute('style') || '';
      
      const hexColors = style.match(/#[0-9a-fA-F]{3,6}/g);
      if (hexColors) {
        hexColors.forEach(color => colors.add(color.toLowerCase()));
      }
      
      const rgbColors = style.match(/rgba?\([^)]+\)/g);
      if (rgbColors) {
        rgbColors.forEach(color => colors.add(color));
      }
    });

    return Array.from(colors);
  }

  /**
   * Analyze layout patterns in the generated HTML
   */
  analyzeLayoutPatterns(document) {
    const styleElements = document.querySelectorAll('style');
    let cssContent = '';
    styleElements.forEach(styleEl => {
      cssContent += styleEl.textContent || '';
    });

    return {
      usesGrid: cssContent.includes('display: grid') || cssContent.includes('display:grid'),
      usesFlex: cssContent.includes('display: flex') || cssContent.includes('display:flex'),
      hasAsymmetry: this.detectAsymmetricalLayout(document, cssContent),
      hasOverlapping: this.detectOverlappingElements(cssContent),
      hasExperimentalLayout: this.detectExperimentalLayout(document, cssContent),
      navigationStyle: this.analyzeNavigationStyle(document),
      contentDensity: this.analyzeContentDensity(document),
      spatialUsage: this.analyzeSpatialUsage(cssContent)
    };
  }

  /**
   * MOODBOARD FIDELITY VALIDATION - Check if design truly reflects moodboard
   */
  async validateMoodboardFidelity(document, moodboardImages, generatedColors, layoutAnalysis) {
    logger.info(`🎨 Validating fidelity to ${moodboardImages.length} moodboard images...`);

    // This is a conceptual validation - in practice, you'd need image analysis APIs
    // For now, we'll check if the design shows creative interpretation vs template usage

    // Check for creative layout patterns
    if (layoutAnalysis.hasAsymmetry || layoutAnalysis.hasExperimentalLayout || layoutAnalysis.hasOverlapping) {
      this.passedChecks.push('Creative layout patterns detected - shows moodboard influence');
    } else {
      this.issues.push({
        type: 'generic_layout_despite_moodboard',
        severity: 'high',
        message: 'Layout appears generic despite moodboard provided - may not reflect moodboard creativity',
        fix: 'Analyze moodboard for unique layout patterns and implement creative interpretations'
      });
    }

    // Check color palette richness/appropriateness
    if (generatedColors.length >= 2) {
      this.passedChecks.push(`Color palette developed (${generatedColors.length} colors) - appropriate for moodboard-driven design`);
    } else {
      this.suggestions.push({
        type: 'limited_color_palette',
        message: 'Very limited color palette - ensure it matches moodboard aesthetic',
        suggestion: 'If moodboard is minimal, limited colors are fine. If vibrant, expand palette.'
      });
    }

    // Check for template-like patterns that ignore moodboard
    const htmlContent = document.documentElement.outerHTML.toLowerCase();
    const templateIndicators = [
      'hero-section',
      'about-section', 
      'work-section',
      'contact-section',
      'btn-primary',
      'navbar-nav',
      'container-fluid'
    ];

    const templateScore = templateIndicators.filter(indicator => 
      htmlContent.includes(indicator)
    ).length;

    if (templateScore > 3) {
      this.issues.push({
        type: 'template_override_moodboard',
        severity: 'critical',
        message: 'Design shows template patterns despite moodboard - moodboard may have been ignored',
        fix: 'Let moodboard drive structure, not templates. Break free from conventional layouts.'
      });
    } else if (templateScore === 0) {
      this.passedChecks.push('No template patterns detected - design appears moodboard-driven');
    }

    // Validate creative risk-taking
    const creativeIndicators = [
      'transform:',
      'clip-path:',
      'mix-blend-mode:',
      'position: absolute',
      'position: fixed',
      'z-index:',
      '@keyframes',
      'filter:',
      'backdrop-filter:'
    ];

    const creativityScore = creativeIndicators.filter(indicator => 
      htmlContent.includes(indicator)
    ).length;

    if (creativityScore >= 3) {
      this.passedChecks.push('Creative CSS techniques used - suggests moodboard-inspired experimentation');
    } else {
      this.suggestions.push({
        type: 'lacks_creative_techniques',
        message: 'Limited creative CSS techniques - may not fully capture moodboard inspiration',
        suggestion: 'Use advanced CSS (transforms, filters, positioning) to recreate moodboard aesthetics'
      });
    }
  }

  /**
   * MOODBOARD LAYOUT ADHERENCE - Check if layout patterns match moodboard style
   */
  async validateMoodboardLayoutAdherence(document, moodboardImages, layoutAnalysis) {
    // Since we can't actually analyze moodboard images, we check for layout diversity
    // that suggests the designer broke away from templates

    const sections = document.querySelectorAll('section, div[class*="section"], main > div');
    const sectionCount = sections.length;

    if (sectionCount > 0) {
      // Check for varied section layouts (suggests moodboard influence)
      let layoutVariety = 0;
      sections.forEach(section => {
        const style = section.getAttribute('style') || '';
        const className = section.getAttribute('class') || '';
        
        if (style.includes('grid') || className.includes('grid')) layoutVariety++;
        if (style.includes('flex') || className.includes('flex')) layoutVariety++;
        if (style.includes('absolute') || style.includes('fixed')) layoutVariety++;
        if (style.includes('transform') || style.includes('rotate')) layoutVariety++;
      });

      if (layoutVariety >= sectionCount * 0.5) {
        this.passedChecks.push('Varied layout techniques across sections - suggests moodboard-driven creativity');
      } else {
        this.suggestions.push({
          type: 'uniform_section_layouts',
          message: 'Sections use similar layout patterns - may not reflect moodboard diversity',
          suggestion: 'Vary layout approaches between sections based on moodboard patterns'
        });
      }
    }

    // Check navigation creativity
    if (layoutAnalysis.navigationStyle === 'experimental') {
      this.passedChecks.push('Creative navigation detected - shows moodboard influence on UX patterns');
    } else if (layoutAnalysis.navigationStyle === 'standard') {
      this.suggestions.push({
        type: 'standard_navigation',
        message: 'Standard navigation pattern used - consider moodboard-inspired alternatives',
        suggestion: 'If moodboard shows creative layouts, consider non-standard navigation approaches'
      });
    }
  }

  /**
   * MOODBOARD TYPOGRAPHY ADHERENCE
   */
  async validateMoodboardTypographyAdherence(document, moodboardImages) {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const styleElements = document.querySelectorAll('style');
    
    let cssContent = '';
    styleElements.forEach(styleEl => {
      cssContent += styleEl.textContent || '';
    });

    // Check for typography creativity
    const typographicTechniques = [
      'font-weight: 900',
      'font-weight: 100',
      'letter-spacing:',
      'text-transform:',
      'font-size: clamp',
      'font-variant:',
      'text-shadow:',
      'writing-mode:',
      '@import',
      'font-family:'
    ];

    const typographyScore = typographicTechniques.filter(technique => 
      cssContent.includes(technique)
    ).length;

    if (typographyScore >= 4) {
      this.passedChecks.push('Advanced typography techniques used - suggests moodboard-inspired text treatment');
    } else if (typographyScore >= 2) {
      this.passedChecks.push('Some typography creativity detected');
    } else {
      this.suggestions.push({
        type: 'basic_typography',
        message: 'Basic typography treatment - may not reflect moodboard text styles',
        suggestion: 'Analyze moodboard typography and implement creative text treatments'
      });
    }

    // Check heading hierarchy creativity
    if (headings.length > 0) {
      const headingSizes = new Set();
      headings.forEach(heading => {
        const computedStyle = heading.getAttribute('style') || '';
        if (computedStyle.includes('font-size:')) {
          headingSizes.add(computedStyle.match(/font-size:\s*([^;]+)/)?.[1]);
        }
      });

      if (headingSizes.size >= Math.min(headings.length, 4)) {
        this.passedChecks.push('Varied heading sizes - shows typographic hierarchy consideration');
      }
    }
  }

  /**
   * FALLBACK VALIDATION for when no moodboard is provided
   */
  async validateStylePreferences(document, stylePreferences) {
    if (!stylePreferences || Object.keys(stylePreferences).length === 0) {
      this.suggestions.push({
        type: 'no_style_guidance',
        message: 'No moodboard or style preferences provided',
        suggestion: 'Design defaults to creative interpretation'
      });
      return;
    }

    // Validate mood preference
    if (stylePreferences.mood) {
      this.validateMoodAdherence(document, stylePreferences.mood);
    }

    // Validate other preferences
    if (stylePreferences.colorScheme) {
      this.validateColorSchemePreference(document, stylePreferences.colorScheme);
    }
    if (stylePreferences.typography) {
      this.validateTypographyPreference(document, stylePreferences.typography);
    }
    if (stylePreferences.layoutStyle) {
      this.validateLayoutStylePreference(document, stylePreferences.layoutStyle);
    }
  }

  /**
   * GENERIC DESIGN QUALITY (fallback when no moodboard)
   */
  async validateGenericDesignQuality(document, generatedColors) {
    // Basic color harmony check
    if (generatedColors.length >= 2 && generatedColors.length <= 8) {
      this.passedChecks.push(`Balanced color palette (${generatedColors.length} colors)`);
    } else if (generatedColors.length > 8) {
      this.suggestions.push({
        type: 'many_colors',
        message: `Many colors used (${generatedColors.length}) - ensure intentional color strategy`,
        suggestion: 'Consider limiting to 5-7 main colors for better harmony'
      });
    }

    // Check for visual interest
    const htmlContent = document.documentElement.outerHTML;
    const visualInterestIndicators = ['gradient', 'shadow', 'border-radius', 'transform', 'transition'];
    const interestScore = visualInterestIndicators.filter(indicator => 
      htmlContent.includes(indicator)
    ).length;

    if (interestScore >= 3) {
      this.passedChecks.push('Visual interest techniques detected');
    } else {
      this.suggestions.push({
        type: 'increase_visual_interest',
        message: 'Design could benefit from more visual interest',
        suggestion: 'Add gradients, shadows, or subtle animations'
      });
    }
  }

  /**
   * Helper methods for layout analysis
   */
  detectAsymmetricalLayout(document, cssContent) {
    // Look for signs of asymmetrical design
    return cssContent.includes('margin-left:') && cssContent.includes('margin-right:') ||
           cssContent.includes('text-align: left') && cssContent.includes('text-align: right') ||
           cssContent.includes('float:') ||
           cssContent.includes('position: absolute');
  }

  detectOverlappingElements(cssContent) {
    return cssContent.includes('z-index:') || 
           cssContent.includes('position: absolute') || 
           cssContent.includes('position: fixed') ||
           cssContent.includes('negative margin');
  }

  detectExperimentalLayout(document, cssContent) {
    const experimentalFeatures = [
      'clip-path:',
      'shape-outside:',
      'mask:',
      'mix-blend-mode:',
      'backdrop-filter:',
      'transform: skew',
      'transform: rotate',
      'filter:',
      'writing-mode:'
    ];

    return experimentalFeatures.some(feature => cssContent.includes(feature));
  }

  analyzeNavigationStyle(document) {
    const nav = document.querySelector('nav, .nav, .navbar, .navigation');
    if (!nav) return 'none';

    const navContent = nav.outerHTML.toLowerCase();
    
    if (navContent.includes('hamburger') || navContent.includes('mobile-menu')) {
      return 'mobile-first';
    } else if (navContent.includes('position: fixed') || navContent.includes('position: sticky')) {
      return 'sticky';
    } else if (navContent.includes('sidebar') || navContent.includes('vertical')) {
      return 'sidebar';
    } else if (navContent.includes('hidden') || navContent.includes('overlay')) {
      return 'experimental';
    } else {
      return 'standard';
    }
  }

  analyzeContentDensity(document) {
    const textElements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6');
    const totalTextLength = Array.from(textElements).reduce((total, el) => 
      total + (el.textContent?.length || 0), 0
    );
    
    if (totalTextLength < 500) return 'minimal';
    if (totalTextLength < 1500) return 'moderate';
    return 'dense';
  }

  analyzeSpatialUsage(cssContent) {
    const spacingIndicators = [
      'margin:',
      'padding:',
      'gap:',
      'space-between',
      'space-around'
    ];

    const spacingScore = spacingIndicators.filter(indicator => 
      cssContent.includes(indicator)
    ).length;

    if (spacingScore >= 4) return 'generous';
    if (spacingScore >= 2) return 'moderate';
    return 'tight';
  }

  /**
   * Analyze overall moodboard compliance
   */
  analyzeMoodboardCompliance(document, moodboardImages) {
    // This would ideally use computer vision APIs to analyze moodboard images
    // For now, return a conceptual analysis
    return {
      creativityScore: this.calculateCreativityScore(document),
      layoutInnovation: this.assessLayoutInnovation(document),
      colorHarmony: this.assessColorHarmony(document),
      overallCompliance: 'estimated' // Would be 'analyzed' with actual image analysis
    };
  }

  calculateCreativityScore(document) {
    const htmlContent = document.documentElement.outerHTML;
    const creativeFeatures = [
      'transform:',
      'clip-path:',
      'mix-blend-mode:',
      'position: absolute',
      '@keyframes',
      'filter:',
      'backdrop-filter:',
      'mask:',
      'shape-outside:'
    ];

    return creativeFeatures.filter(feature => htmlContent.includes(feature)).length;
  }

  assessLayoutInnovation(document) {
    const layoutAnalysis = this.analyzeLayoutPatterns(document);
    let innovationScore = 0;

    if (layoutAnalysis.hasAsymmetry) innovationScore += 2;
    if (layoutAnalysis.hasOverlapping) innovationScore += 2;
    if (layoutAnalysis.hasExperimentalLayout) innovationScore += 3;
    if (layoutAnalysis.navigationStyle === 'experimental') innovationScore += 2;

    return innovationScore;
  }

  assessColorHarmony(document) {
    const colors = this.extractColorsFromHTML(document);
    // Basic harmony assessment
    if (colors.length >= 3 && colors.length <= 7) return 'balanced';
    if (colors.length < 3) return 'minimal';
    return 'complex';
  }

  /**
   * All the existing validation methods from the original file
   * (validateImageUsage, validateResponsiveDesign, etc.) - keeping them unchanged
   */
  async validateImageUsage(document, processedImages) {
    const images = document.querySelectorAll('img');
    const totalClientImages = Object.values(processedImages).flat().length;
    let clientImagesUsed = 0;

    if (totalClientImages > 0) {
      const clientImageUrls = Object.values(processedImages).flat().map(img => img.url || '');
      
      images.forEach(img => {
        const src = img.getAttribute('src') || '';
        if (clientImageUrls.some(clientUrl => src.includes(clientUrl))) {
          clientImagesUsed++;
        }
      });

      if (clientImagesUsed > 0) {
        this.passedChecks.push(`${clientImagesUsed}/${totalClientImages} client images used`);
        
        if (clientImagesUsed < totalClientImages * 0.7) {
          this.issues.push({
            type: 'underused_client_images',
            severity: 'medium',
            message: `Only ${clientImagesUsed}/${totalClientImages} client images used`,
            fix: 'Include more of the client\'s provided images in the design'
          });
        }
      } else {
        this.issues.push({
          type: 'no_client_images_used',
          severity: 'high',
          message: 'Client provided images but none were used',
          fix: 'Replace placeholder images with client\'s actual images'
        });
      }
    } else {
      this.passedChecks.push('No client images provided - using appropriate placeholders');
    }

    // Check for image styling
    let styledImages = 0;
    images.forEach(img => {
      const style = img.getAttribute('style') || '';
      if (style.includes('border-radius') || style.includes('box-shadow') || 
          style.includes('filter') || style.includes('transform')) {
        styledImages++;
      }
    });

    if (images.length > 0 && styledImages > 0) {
      this.passedChecks.push(`${styledImages} images have custom styling`);
    }
  }

  async validateResponsiveDesign(document) {
    const styleElements = document.querySelectorAll('style');
    let hasMediaQueries = false;
    let hasModernLayout = false;

    styleElements.forEach(styleEl => {
      const css = styleEl.textContent || '';
      
      if (css.includes('@media')) {
        hasMediaQueries = true;
      }
      
      if (css.includes('display: flex') || css.includes('display: grid') ||
          css.includes('display:flex') || css.includes('display:grid')) {
        hasModernLayout = true;
      }
    });

    if (hasModernLayout) {
      this.passedChecks.push('Modern layout methods (Flexbox/Grid) used');
    }

    if (hasMediaQueries) {
      this.passedChecks.push('Responsive design implemented');
    } else {
      this.issues.push({
        type: 'not_responsive',
        severity: 'medium',
        message: 'No responsive design detected',
        fix: 'Add media queries for different screen sizes'
      });
    }
  }

  async validateDesignTechnicalQuality(document) {
    const styleElements = document.querySelectorAll('style');
    let cssContent = '';
    styleElements.forEach(styleEl => {
      cssContent += styleEl.textContent || '';
    });

    // Check for CSS custom properties (variables)
    if (cssContent.includes('--') && cssContent.includes('var(')) {
      this.passedChecks.push('CSS custom properties used for maintainability');
    }

    // Check for transitions/animations
    if (cssContent.includes('transition:') || cssContent.includes('@keyframes')) {
      this.passedChecks.push('Animations and transitions implemented');
    }

    // Check for proper sizing units
    if (cssContent.includes('rem') || cssContent.includes('em') || cssContent.includes('vw') || cssContent.includes('vh')) {
      this.passedChecks.push('Responsive sizing units used');
    }
  }

  // Keep all the existing helper methods
  validateMoodAdherence(document, mood) {
    const htmlContent = document.documentElement.outerHTML.toLowerCase();
    
    const moodKeywords = {
      'professional': ['clean', 'minimal', 'corporate', 'business', 'formal'],
      'creative': ['artistic', 'bold', 'vibrant', 'experimental', 'creative'],
      'playful': ['fun', 'colorful', 'animated', 'quirky', 'playful'],
      'elegant': ['sophisticated', 'refined', 'luxury', 'premium', 'elegant'],
      'minimal': ['simple', 'clean', 'whitespace', 'minimal', 'sparse'],
      'modern': ['contemporary', 'sleek', 'modern', 'current'],
      'funky': ['wild', 'crazy', 'neon', 'experimental', 'unique']
    };

    const relevantKeywords = moodKeywords[mood.toLowerCase()] || [];
    const moodReflected = relevantKeywords.some(keyword => 
      htmlContent.includes(keyword) || 
      htmlContent.includes(mood.toLowerCase())
    );

    if (moodReflected) {
      this.passedChecks.push(`Portfolio reflects "${mood}" mood preference`);
    } else {
      this.suggestions.push({
        type: 'mood_not_reflected',
        message: `Portfolio could better reflect "${mood}" mood preference`,
        suggestion: `Consider adding ${mood}-style elements and design patterns`
      });
    }
  }

  validateColorSchemePreference(document, colorScheme) {
    const styleElements = document.querySelectorAll('style');
    let cssContent = '';
    
    styleElements.forEach(styleEl => {
      cssContent += styleEl.textContent || '';
    });

    switch (colorScheme.toLowerCase()) {
      case 'minimal':
      case 'monochrome':
        if (cssContent.includes('#000') || cssContent.includes('#fff') || 
            cssContent.includes('black') || cssContent.includes('white')) {
          this.passedChecks.push(`${colorScheme} color scheme appears to be followed`);
        }
        break;
      
      case 'vibrant':
        if (cssContent.includes('rgb') || cssContent.includes('#')) {
          this.passedChecks.push('Vibrant colors detected');
        }
        break;
      
      case 'warm':
        if (cssContent.includes('red') || cssContent.includes('orange') || 
            cssContent.includes('yellow')) {
          this.passedChecks.push('Warm colors detected');
        }
        break;
      
      case 'cool':
        if (cssContent.includes('blue') || cssContent.includes('green') || 
            cssContent.includes('purple')) {
          this.passedChecks.push('Cool colors detected');
        }
        break;
    }
  }

  validateTypographyPreference(document, typography) {
    const styleElements = document.querySelectorAll('style');
    let cssContent = '';
    
    styleElements.forEach(styleEl => {
      cssContent += styleEl.textContent || '';
    });

    const hasCustomFonts = cssContent.includes('font-family');
    const hasFontWeights = cssContent.includes('font-weight');

    if (hasCustomFonts) {
      this.passedChecks.push(`Typography preference "${typography}" - custom fonts used`);
    }

    if (typography.toLowerCase() === 'bold' && hasFontWeights) {
      this.passedChecks.push('Bold typography preference reflected in font weights');
    }
  }

  validateLayoutStylePreference(document, layoutStyle) {
    const styleElements = document.querySelectorAll('style');
    let cssContent = '';
    
    styleElements.forEach(styleEl => {
      cssContent += styleEl.textContent || '';
    });

    switch (layoutStyle.toLowerCase()) {
      case 'grid':
        if (cssContent.includes('display: grid') || cssContent.includes('display:grid')) {
          this.passedChecks.push('Grid layout preference followed');
        }
        break;
      
      case 'minimal':
        if (cssContent.includes('white') || cssContent.includes('#fff')) {
          this.passedChecks.push('Minimal layout style reflected');
        }
        break;
      
      case 'asymmetric':
        this.suggestions.push({
          type: 'asymmetric_layout_check',
          message: 'Asymmetric layout preference noted',
          suggestion: 'Ensure layout uses creative, non-symmetric arrangements'
        });
        break;
    }
  }

  /**
   * Generate summary based on score and whether moodboard was used
   */
  generateSummary(score, hasMoodboard) {
    const prefix = hasMoodboard ? 'Moodboard-driven design' : 'Creative design';
    
    if (score >= 90) {
      return `Excellent ${prefix.toLowerCase()} - ${hasMoodboard ? 'faithfully captures moodboard vision' : 'shows great creative interpretation'}`;
    } else if (score >= 75) {
      return `Good ${prefix.toLowerCase()} - ${hasMoodboard ? 'mostly reflects moodboard' : 'solid creative choices'} with room for refinement`;
    } else if (score >= 60) {
      return `Fair ${prefix.toLowerCase()} - ${hasMoodboard ? 'partially captures moodboard' : 'basic creative approach'} but needs improvement`;
    } else {
      return `Poor ${prefix.toLowerCase()} - ${hasMoodboard ? 'fails to capture moodboard vision' : 'lacks creative vision'} and needs major revision`;
    }
  }

  /**
   * Generate design recommendations based on validation results
   */
  generateDesignRecommendations(hasMoodboard) {
    const recommendations = [];
    
    if (hasMoodboard) {
      const moodboardIssues = this.issues.filter(issue => 
        issue.type.includes('moodboard') || issue.type === 'template_override_moodboard'
      );
      if (moodboardIssues.length > 0) {
      recommendations.push('Consider regenerating with stronger emphasis on moodboard inspiration');
    }

    const colorIssues = this.issues.filter(issue => 
      issue.type.includes('color') || issue.type === 'poor_contrast'
    );
    if (colorIssues.length > 0) {
      recommendations.push('Review and improve color palette and contrast');
    }

    const imageIssues = this.issues.filter(issue => 
      issue.type.includes('client_images')
    );
    if (imageIssues.length > 0) {
      recommendations.push('Better utilize client\'s provided images in the design');
    }

    const responsiveIssues = this.issues.filter(issue => 
      issue.type === 'not_responsive'
    );
    if (responsiveIssues.length > 0) {
      recommendations.push('Implement responsive design for all device sizes');
    }

    return recommendations;
  }
}}

module.exports = new DesignValidator();