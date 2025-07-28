// portfolio-backend/utils/validators/designValidator.js
const { JSDOM } = require('jsdom');

class DesignValidator {
  constructor() {
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * Main design validation function
   * @param {string} htmlString - Generated HTML content
   * @param {Object} portfolioData - Original portfolio data
   * @param {Object} processedImages - Processed images with URLs
   * @returns {Object} Design validation results
   */
  async validate(htmlString, portfolioData, processedImages = {}) {
    console.log('🎨 Running design validation...');
    
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];

    try {
      const dom = new JSDOM(htmlString);
      const document = dom.window.document;

      // Extract colors and styles from generated HTML
      const generatedColors = this.extractColorsFromHTML(document);
      
      // Run all design checks
      await this.validateMoodboardAdherence(document, processedImages.moodboard || [], generatedColors);
      await this.validateStylePreferences(document, portfolioData.stylePreferences || {});
      await this.validateColorHarmony(generatedColors);
      await this.validateTypography(document);
      await this.validateLayoutDesign(document);
      await this.validateImageUsage(document, processedImages);

      // Calculate overall score
      const totalChecks = this.passedChecks.length + this.issues.length;
      const score = totalChecks > 0 ? Math.round((this.passedChecks.length / totalChecks) * 100) : 0;

      return {
        score,
        issues: this.issues,
        passed: this.passedChecks,
        suggestions: this.suggestions,
        summary: this.generateSummary(score),
        generatedColors,
        recommendations: this.generateDesignRecommendations()
      };

    } catch (error) {
      console.error('Design validation error:', error);
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
   * Validate moodboard adherence
   */
  async validateMoodboardAdherence(document, moodboardImages, generatedColors) {
    if (!moodboardImages || moodboardImages.length === 0) {
      this.passedChecks.push('No moodboard provided - skipping moodboard validation');
      return;
    }

    console.log(`Analyzing ${moodboardImages.length} moodboard images for adherence...`);

    // Check if enough colors are used (moodboards usually inspire rich palettes)
    if (generatedColors.length < 3) {
      this.issues.push({
        type: 'moodboard_not_followed',
        severity: 'high',
        message: 'Limited color palette detected - moodboard inspiration may not have been followed',
        fix: 'Extract and apply more colors inspired by the moodboard images'
      });
    } else {
      this.passedChecks.push(`Rich color palette used (${generatedColors.length} colors)`);
    }

    // Check for very basic/default colors that suggest moodboard was ignored
    const basicColors = ['#000000', '#ffffff', '#333333', '#666666', '#999999', 'black', 'white', 'gray'];
    const onlyBasicColors = generatedColors.every(color => 
      basicColors.some(basic => this.colorsAreSimilar(color, basic))
    );

    if (onlyBasicColors && moodboardImages.length > 0) {
      this.issues.push({
        type: 'moodboard_ignored',
        severity: 'critical',
        message: 'Only basic colors used despite moodboard provided',
        fix: 'Extract and apply unique colors from the moodboard images'
      });
    }

    // Check for generic/template styling
    const htmlContent = document.documentElement.outerHTML;
    const hasGenericClasses = htmlContent.includes('btn-primary') || 
                             htmlContent.includes('text-primary') || 
                             htmlContent.includes('bg-primary');
    
    if (hasGenericClasses && moodboardImages.length > 0) {
      this.issues.push({
        type: 'generic_styling',
        severity: 'medium',
        message: 'Generic template classes used instead of moodboard-inspired custom styling',
        fix: 'Replace generic classes with custom styles inspired by moodboard'
      });
    } else if (moodboardImages.length > 0) {
      this.passedChecks.push('Custom styling appears to be used');
    }
  }

  /**
   * Validate style preferences adherence
   */
  async validateStylePreferences(document, stylePreferences) {
    if (!stylePreferences || Object.keys(stylePreferences).length === 0) {
      this.suggestions.push({
        type: 'no_style_preferences',
        message: 'No style preferences provided',
        suggestion: 'Consider providing style preferences for better customization'
      });
      return;
    }

    // Check mood adherence
    if (stylePreferences.mood) {
      this.validateMoodAdherence(document, stylePreferences.mood);
    }

    // Check color scheme preference
    if (stylePreferences.colorScheme) {
      this.validateColorSchemePreference(document, stylePreferences.colorScheme);
    }

    // Check typography preference
    if (stylePreferences.typography) {
      this.validateTypographyPreference(document, stylePreferences.typography);
    }

    // Check layout style preference
    if (stylePreferences.layoutStyle) {
      this.validateLayoutStylePreference(document, stylePreferences.layoutStyle);
    }
  }

  /**
   * Validate mood adherence
   */
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

  /**
   * Validate color harmony
   */
  async validateColorHarmony(colors) {
    if (colors.length < 2) {
      this.suggestions.push({
        type: 'limited_color_palette',
        message: 'Very limited color palette',
        suggestion: 'Consider using 3-5 colors for better visual interest'
      });
      return;
    }

    // Check for good contrast
    const hasLightAndDark = this.hasGoodContrast(colors);
    if (hasLightAndDark) {
      this.passedChecks.push('Good color contrast detected');
    } else {
      this.issues.push({
        type: 'poor_contrast',
        severity: 'medium',
        message: 'Poor color contrast detected',
        fix: 'Ensure sufficient contrast between light and dark colors'
      });
    }

    // Check for too many colors
    if (colors.length > 10) {
      this.issues.push({
        type: 'too_many_colors',
        severity: 'low',
        message: `Many colors used (${colors.length}) - may look chaotic`,
        fix: 'Consider limiting to 5-7 main colors for better harmony'
      });
    } else if (colors.length >= 3) {
      this.passedChecks.push(`Balanced color palette (${colors.length} colors)`);
    }
  }

  /**
   * Validate typography
   */
  async validateTypography(document) {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const paragraphs = document.querySelectorAll('p');

    // Check for typography hierarchy
    if (headings.length === 0) {
      this.issues.push({
        type: 'no_typography_hierarchy',
        severity: 'medium',
        message: 'No heading hierarchy found',
        fix: 'Add proper heading structure (h1, h2, h3, etc.)'
      });
    } else {
      this.passedChecks.push(`Typography hierarchy with ${headings.length} headings`);
    }

    // Check for text content
    if (paragraphs.length === 0) {
      this.suggestions.push({
        type: 'no_paragraphs',
        message: 'No paragraph elements found',
        suggestion: 'Use <p> elements for body text'
      });
    } else {
      this.passedChecks.push(`${paragraphs.length} paragraph elements found`);
    }

    // Check for font variety in CSS
    const styleElements = document.querySelectorAll('style');
    let hasFontFamily = false;
    let hasFontSizes = false;

    styleElements.forEach(styleEl => {
      const css = styleEl.textContent || '';
      if (css.includes('font-family')) {
        hasFontFamily = true;
      }
      if (css.includes('font-size')) {
        hasFontSizes = true;
      }
    });

    if (hasFontFamily) {
      this.passedChecks.push('Custom font families defined');
    } else {
      this.suggestions.push({
        type: 'no_custom_fonts',
        message: 'No custom fonts detected',
        suggestion: 'Consider using web fonts for better typography'
      });
    }

    if (hasFontSizes) {
      this.passedChecks.push('Font sizing defined');
    }
  }

  /**
   * Validate layout design
   */
  async validateLayoutDesign(document) {
    const styleElements = document.querySelectorAll('style');
    let hasModernLayout = false;
    let hasResponsiveDesign = false;

    styleElements.forEach(styleEl => {
      const css = styleEl.textContent || '';
      
      // Check for modern layout methods
      if (css.includes('display: flex') || css.includes('display: grid') ||
          css.includes('display:flex') || css.includes('display:grid')) {
        hasModernLayout = true;
      }
      
      // Check for responsive design
      if (css.includes('@media')) {
        hasResponsiveDesign = true;
      }
    });

    if (hasModernLayout) {
      this.passedChecks.push('Modern layout methods (Flexbox/Grid) used');
    } else {
      this.suggestions.push({
        type: 'use_modern_layout',
        message: 'Consider using modern layout methods',
        suggestion: 'Use Flexbox or CSS Grid instead of float or table layouts'
      });
    }

    if (hasResponsiveDesign) {
      this.passedChecks.push('Responsive design implemented');
    } else {
      this.issues.push({
        type: 'not_responsive',
        severity: 'medium',
        message: 'No responsive design detected',
        fix: 'Add media queries for different screen sizes'
      });
    }

    // Check for proper spacing/margins
    const elementsWithMargin = document.querySelectorAll('[style*="margin"]');
    const elementsWithPadding = document.querySelectorAll('[style*="padding"]');
    
    if (elementsWithMargin.length > 0 || elementsWithPadding.length > 0) {
      this.passedChecks.push('Spacing (margin/padding) applied to elements');
    }
  }

  /**
   * Validate image usage in design
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

  /**
   * Validate color scheme preference
   */
  validateColorSchemePreference(document, colorScheme) {
    const styleElements = document.querySelectorAll('style');
    let cssContent = '';
    
    styleElements.forEach(styleEl => {
      cssContent += styleEl.textContent || '';
    });

    // Basic checks for different color schemes
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
            cssContent.includes('yellow') || cssContent.includes('#f') || cssContent.includes('#e')) {
          this.passedChecks.push('Warm colors detected');
        }
        break;
      
      case 'cool':
        if (cssContent.includes('blue') || cssContent.includes('green') || 
            cssContent.includes('purple') || cssContent.includes('#0') || cssContent.includes('#1')) {
          this.passedChecks.push('Cool colors detected');
        }
        break;
      
      default:
        this.suggestions.push({
          type: 'color_scheme_unclear',
          message: `Color scheme "${colorScheme}" not clearly reflected`,
          suggestion: 'Ensure color choices align with specified color scheme'
        });
    }
  }

  /**
   * Validate typography preference
   */
  validateTypographyPreference(document, typography) {
    const styleElements = document.querySelectorAll('style');
    let cssContent = '';
    
    styleElements.forEach(styleEl => {
      cssContent += styleEl.textContent || '';
    });

    const hasCustomFonts = cssContent.includes('font-family');
    const hasFontWeights = cssContent.includes('font-weight');
    const hasFontSizes = cssContent.includes('font-size');

    if (hasCustomFonts) {
      this.passedChecks.push(`Typography preference "${typography}" - custom fonts used`);
    }

    if (typography.toLowerCase() === 'bold' && hasFontWeights) {
      this.passedChecks.push('Bold typography preference reflected in font weights');
    }

    if ((typography.toLowerCase() === 'minimal' || typography.toLowerCase() === 'clean') && hasCustomFonts) {
      this.passedChecks.push('Clean typography styling detected');
    }
  }

  /**
   * Validate layout style preference
   */
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
        } else {
          this.suggestions.push({
            type: 'grid_layout_not_used',
            message: 'Grid layout preference not clearly implemented',
            suggestion: 'Use CSS Grid for layout structure'
          });
        }
        break;
      
      case 'minimal':
        if (cssContent.includes('white') || cssContent.includes('#fff') || 
            !cssContent.includes('border') || !cssContent.includes('shadow')) {
          this.passedChecks.push('Minimal layout style reflected');
        }
        break;
      
      case 'asymmetric':
        // This would require more complex analysis
        this.suggestions.push({
          type: 'asymmetric_layout_check',
          message: 'Asymmetric layout preference noted',
          suggestion: 'Ensure layout uses creative, non-symmetric arrangements'
        });
        break;
      
      default:
        this.passedChecks.push(`Layout style "${layoutStyle}" preference noted`);
    }
  }

  /**
   * Helper methods
   */
  colorsAreSimilar(color1, color2) {
    // Normalize colors for comparison
    const normalize = (color) => {
      if (color.startsWith('#')) {
        return color.toLowerCase();
      }
      return color.toLowerCase();
    };

    return normalize(color1) === normalize(color2);
  }

  hasGoodContrast(colors) {
    // Simple check for light and dark colors
    const lightColors = ['#fff', '#ffffff', 'white', '#f', '#e'];
    const darkColors = ['#000', '#000000', 'black', '#1', '#2', '#3'];
    
    const hasLight = colors.some(color => 
      lightColors.some(light => color.toLowerCase().includes(light))
    );
    const hasDark = colors.some(color => 
      darkColors.some(dark => color.toLowerCase().includes(dark))
    );
    
    return hasLight && hasDark;
  }

  /**
   * Generate summary based on score
   */
  generateSummary(score) {
    if (score >= 90) {
      return 'Excellent design - creative and well-executed with great attention to detail';
    } else if (score >= 75) {
      return 'Good design quality - attractive with minor areas for improvement';
    } else if (score >= 60) {
      return 'Fair design - functional but could benefit from more creative touches';
    } else {
      return 'Design needs improvement - lacks visual appeal or creativity';
    }
  }

  /**
   * Generate design recommendations
   */
  generateDesignRecommendations() {
    const recommendations = [];
    
    const moodboardIssues = this.issues.filter(issue => 
      issue.type.includes('moodboard') || issue.type === 'generic_styling'
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
}

module.exports = new DesignValidator();