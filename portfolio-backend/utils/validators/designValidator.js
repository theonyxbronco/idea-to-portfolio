class DesignValidator {
    async validate(dom, portfolioData, processedImages) {
      const issues = [];
      const fixes = [];
      let score = 100;
  
      console.log('🎨 Validating design and moodboard adherence...');
  
      try {
        // Extract colors from generated HTML
        const generatedColors = await this.extractColorsFromHTML(dom);
        
        // Analyze moodboard if provided
        if (processedImages.moodboard && processedImages.moodboard.length > 0) {
          await this.validateMoodboardAdherence(dom, processedImages.moodboard, generatedColors, issues);
        }
        
        // Validate style preferences
        await this.validateStylePreferences(dom, portfolioData.stylePreferences, issues);
        
        // Check color harmony
        await this.validateColorHarmony(generatedColors, issues);
        
        // Check typography consistency
        await this.validateTypography(dom, portfolioData.stylePreferences, issues);
  
        // Calculate score
        score = Math.max(0, 100 - (issues.length * 8));
  
        console.log(`🎨 Design validation complete. Found ${issues.length} issues. Score: ${score}`);
  
        return {
          score,
          issues,
          fixes,
          summary: `${issues.length} design issues found`,
          generatedColors,
          recommendations: this.generateDesignRecommendations(issues)
        };
  
      } catch (error) {
        console.error('Design validation error:', error);
        return {
          score: 50,
          issues: [{ 
            type: 'validation_error', 
            severity: 'medium', 
            description: 'Design validation failed',
            autoFixable: false 
          }],
          fixes: [],
          summary: 'Design validation failed'
        };
      }
    }
  
    async extractColorsFromHTML(dom) {
      const colors = new Set();
      
      // Extract colors from CSS styles
      const allElements = dom.querySelectorAll('*');
      
      allElements.forEach(element => {
        const styles = element.getAttribute('style');
        if (styles) {
          // Extract color values from inline styles
          const colorMatches = styles.match(/(color|background-color|border-color):\s*([^;]+)/g);
          if (colorMatches) {
            colorMatches.forEach(match => {
              const colorValue = match.split(':')[1].trim();
              if (this.isValidColor(colorValue)) {
                colors.add(this.normalizeColor(colorValue));
              }
            });
          }
        }
      });
  
      // Extract colors from style tags
      const styleTags = dom.querySelectorAll('style');
      styleTags.forEach(styleTag => {
        const cssText = styleTag.textContent;
        const colorMatches = cssText.match(/(color|background-color|border-color):\s*([^;]+)/g);
        if (colorMatches) {
          colorMatches.forEach(match => {
            const colorValue = match.split(':')[1].trim();
            if (this.isValidColor(colorValue)) {
              colors.add(this.normalizeColor(colorValue));
            }
          });
        }
      });
  
      return Array.from(colors);
    }
  
    async validateMoodboardAdherence(dom, moodboardImages, generatedColors, issues) {
      console.log(`Analyzing ${moodboardImages.length} moodboard images for adherence...`);
  
      // Basic color analysis - in a real implementation, you'd use image processing
      // For now, we'll do basic analysis based on common design patterns
      
      // Check if enough colors are used (moodboards usually inspire rich palettes)
      if (generatedColors.length < 3) {
        issues.push({
          type: 'moodboard_not_followed',
          severity: 'critical',
          description: 'Limited color palette detected - moodboard likely not followed',
          autoFixable: true,
          fix: {
            type: 'enhance_color_palette',
            content: 'Add more colors inspired by moodboard images'
          }
        });
      }
  
      // Check for very basic/default colors that suggest moodboard was ignored
      const basicColors = ['#000000', '#ffffff', '#333333', '#666666', '#999999'];
      const onlyBasicColors = generatedColors.every(color => 
        basicColors.some(basic => this.colorDistance(color, basic) < 50)
      );
  
      if (onlyBasicColors && moodboardImages.length > 0) {
        issues.push({
          type: 'moodboard_not_followed',
          severity: 'critical',
          description: 'Only basic colors used despite moodboard provided',
          autoFixable: true,
          fix: {
            type: 'apply_moodboard_colors',
            content: 'Extract and apply colors from moodboard images'
          }
        });
      }
  
      // Check for generic/template styling that ignores moodboard
      const hasGenericClasses = dom.querySelector('.btn-primary, .text-primary, .bg-primary');
      if (hasGenericClasses && moodboardImages.length > 0) {
        issues.push({
          type: 'moodboard_not_followed',
          severity: 'high',
          description: 'Generic template classes used instead of moodboard-inspired styling',
          autoFixable: true,
          fix: {
            type: 'customize_styling',
            content: 'Replace generic classes with moodboard-inspired custom styles'
          }
        });
      }
    }
  
    async validateStylePreferences(dom, stylePreferences, issues) {
      if (!stylePreferences) return;
  
      // Check mood adherence
      if (stylePreferences.mood) {
        await this.validateMoodAdherence(dom, stylePreferences.mood, issues);
      }
  
      // Check color scheme preference
      if (stylePreferences.colorScheme) {
        await this.validateColorScheme(dom, stylePreferences.colorScheme, issues);
      }
  
      // Check typography preference
      if (stylePreferences.typography) {
        await this.validateTypographyStyle(dom, stylePreferences.typography, issues);
      }
  
      // Check layout style
      if (stylePreferences.layoutStyle) {
        await this.validateLayoutStyle(dom, stylePreferences.layoutStyle, issues);
      }
    }
  
    async validateMoodAdherence(dom, mood, issues) {
      const moodKeywords = {
        'professional': ['clean', 'minimal', 'corporate', 'business'],
        'creative': ['artistic', 'bold', 'vibrant', 'experimental'],
        'playful': ['fun', 'colorful', 'animated', 'quirky'],
        'elegant': ['sophisticated', 'refined', 'luxury', 'premium'],
        'minimal': ['simple', 'clean', 'whitespace', 'minimal']
      };
  
      // Check if class names or content reflect the mood
      const htmlContent = dom.documentElement.outerHTML.toLowerCase();
      const relevantKeywords = moodKeywords[mood.toLowerCase()] || [];
      
      const moodReflected = relevantKeywords.some(keyword => 
        htmlContent.includes(keyword) || 
        htmlContent.includes(mood.toLowerCase())
      );
  
      if (!moodReflected && mood !== 'modern') {
        issues.push({
          type: 'style_preference_not_followed',
          severity: 'medium',
          description: `Portfolio doesn't reflect "${mood}" mood preference`,
          autoFixable: true,
          fix: {
            type: 'adjust_mood_styling',
            content: `Apply ${mood} styling and aesthetic`
          }
        });
      }
    }
  
    async validateColorHarmony(colors, issues) {
      if (colors.length < 2) return;
  
      // Basic color harmony check
      const hasHighContrast = this.hasGoodContrast(colors);
      if (!hasHighContrast) {
        issues.push({
          type: 'color_accessibility',
          severity: 'medium',
          description: 'Poor color contrast detected',
          autoFixable: true,
          fix: {
            type: 'improve_contrast',
            content: 'Adjust colors for better contrast ratio'
          }
        });
      }
  
      // Check for too many competing colors
      if (colors.length > 8) {
        issues.push({
          type: 'color_overuse',
          severity: 'low',
          description: 'Too many colors used - may look chaotic',
          autoFixable: true,
          fix: {
            type: 'simplify_palette',
            content: 'Reduce to 4-6 main colors for better harmony'
          }
        });
      }
    }
  
    async validateTypography(dom, stylePreferences, issues) {
      const headings = dom.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const paragraphs = dom.querySelectorAll('p');
  
      // Check for typography hierarchy
      if (headings.length === 0) {
        issues.push({
          type: 'typography_hierarchy',
          severity: 'medium',
          description: 'No clear heading hierarchy found',
          autoFixable: true,
          fix: {
            type: 'add_typography_hierarchy',
            content: 'Add proper heading structure (h1, h2, h3)'
          }
        });
      }
  
      // Check for readable font sizes
      let smallTextElements = 0;
      paragraphs.forEach(p => {
        const fontSize = this.getComputedFontSize(p);
        if (fontSize < 14) {
          smallTextElements++;
        }
      });
  
      if (smallTextElements > paragraphs.length * 0.5) {
        issues.push({
          type: 'typography_readability',
          severity: 'medium',
          description: 'Text too small for good readability',
          autoFixable: true,
          fix: {
            type: 'increase_font_size',
            content: 'Increase base font size to at least 16px'
          }
        });
      }
    }
  
    // Helper methods
    isValidColor(colorValue) {
      // Basic color validation
      return /^#[0-9A-F]{6}$/i.test(colorValue) || 
             /^rgb\(\d+,\s*\d+,\s*\d+\)$/i.test(colorValue) ||
             /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/i.test(colorValue) ||
             ['red', 'blue', 'green', 'black', 'white', 'gray', 'purple', 'orange', 'yellow'].includes(colorValue.toLowerCase());
    }
  
    normalizeColor(colorValue) {
      // Basic color normalization - convert to hex if possible
      const colorMap = {
        'red': '#ff0000', 'blue': '#0000ff', 'green': '#008000',
        'black': '#000000', 'white': '#ffffff', 'gray': '#808080'
      };
      
      return colorMap[colorValue.toLowerCase()] || colorValue;
    }
  
    colorDistance(color1, color2) {
      // Simple color distance calculation
      // In a real implementation, you'd use proper color space calculations
      return Math.abs(parseInt(color1.replace('#', ''), 16) - parseInt(color2.replace('#', ''), 16));
    }
  
    hasGoodContrast(colors) {
      // Basic contrast check - look for light and dark colors
      const lightColors = colors.filter(color => parseInt(color.replace('#', ''), 16) > 0x888888);
      const darkColors = colors.filter(color => parseInt(color.replace('#', ''), 16) < 0x888888);
      
      return lightColors.length > 0 && darkColors.length > 0;
    }
  
    getComputedFontSize(element) {
      // Extract font size from element (simplified)
      const style = element.getAttribute('style') || '';
      const fontSizeMatch = style.match(/font-size:\s*(\d+)px/);
      return fontSizeMatch ? parseInt(fontSizeMatch[1]) : 16; // default 16px
    }
  
    generateDesignRecommendations(issues) {
      const recommendations = [];
      
      const moodboardIssues = issues.filter(issue => issue.type === 'moodboard_not_followed');
      if (moodboardIssues.length > 0) {
        recommendations.push('Consider regenerating with enhanced moodboard emphasis');
      }
  
      const colorIssues = issues.filter(issue => issue.type.includes('color'));
      if (colorIssues.length > 0) {
        recommendations.push('Review color palette to better match inspiration');
      }
  
      return recommendations;
    }
  }
  
  module.exports