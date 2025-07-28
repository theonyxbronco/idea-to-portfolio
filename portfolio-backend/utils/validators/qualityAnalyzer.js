// portfolio-backend/utils/validators/qualityAnalyzer.js
const contentValidator = require('./contentValidator');
const designValidator = require('./designValidator');
const technicalValidator = require('./technicalValidator');
const accessibilityValidator = require('./accessibilityValidator');
const { JSDOM } = require('jsdom');

class QualityAnalyzer {
  constructor() {
    this.validators = {
      content: contentValidator,
      design: designValidator,
      technical: technicalValidator,
      accessibility: accessibilityValidator
    };
  }

  /**
   * Main validation function that runs all validators
   * @param {string} htmlString - Generated HTML content
   * @param {Object} portfolioData - Original portfolio data from user
   * @param {Object} processedImages - Processed images with URLs
   * @returns {Object} Comprehensive validation report
   */
  async validatePortfolio(htmlString, portfolioData, processedImages = {}) {
    console.log('🔍 Starting comprehensive portfolio validation...');
    const startTime = Date.now();
    
    const validationResults = {
      overall: { score: 0, status: 'unknown', timestamp: new Date().toISOString() },
      content: { score: 0, issues: [], passed: [], suggestions: [] },
      design: { score: 0, issues: [], passed: [], suggestions: [] },
      technical: { score: 0, issues: [], passed: [], suggestions: [] },
      accessibility: { score: 0, issues: [], passed: [], suggestions: [] },
      autoFixApplied: false,
      suggestions: [],
      metadata: {
        htmlLength: htmlString.length,
        validationTime: 0,
        portfolioType: portfolioData.stylePreferences?.mood || 'unknown',
        hasImages: processedImages && (processedImages.moodboard?.length > 0 || processedImages.process?.length > 0 || processedImages.final?.length > 0)
      }
    };

    try {
      // Run all validators in parallel for speed
      const [contentResult, designResult, technicalResult, accessibilityResult] = await Promise.allSettled([
        this.validators.content.validate(htmlString, portfolioData, processedImages),
        this.validators.design.validate(htmlString, portfolioData, processedImages),
        this.validators.technical.validate(htmlString, portfolioData, processedImages),
        this.validators.accessibility.validate(htmlString, portfolioData, processedImages)
      ]);

      // Process content validation results
      if (contentResult.status === 'fulfilled') {
        validationResults.content = contentResult.value;
        console.log(`✅ Content validation: ${contentResult.value.score}/100`);
      } else {
        console.warn('⚠️ Content validation failed:', contentResult.reason);
        validationResults.content.issues.push({
          type: 'validation_error',
          severity: 'low',
          message: 'Content validation failed'
        });
      }

      // Process design validation results
      if (designResult.status === 'fulfilled') {
        validationResults.design = designResult.value;
        console.log(`🎨 Design validation: ${designResult.value.score}/100`);
      } else {
        console.warn('⚠️ Design validation failed:', designResult.reason);
        validationResults.design.issues.push({
          type: 'validation_error',
          severity: 'low',
          message: 'Design validation failed'
        });
      }

      // Process technical validation results
      if (technicalResult.status === 'fulfilled') {
        validationResults.technical = technicalResult.value;
        console.log(`🔧 Technical validation: ${technicalResult.value.score}/100`);
      } else {
        console.warn('⚠️ Technical validation failed:', technicalResult.reason);
        validationResults.technical.issues.push({
          type: 'validation_error',
          severity: 'low',
          message: 'Technical validation failed'
        });
      }

      // Process accessibility validation results
      if (accessibilityResult.status === 'fulfilled') {
        validationResults.accessibility = accessibilityResult.value;
        console.log(`♿ Accessibility validation: ${accessibilityResult.value.score}/100`);
      } else {
        console.warn('⚠️ Accessibility validation failed:', accessibilityResult.reason);
        validationResults.accessibility.issues.push({
          type: 'validation_error',
          severity: 'low',
          message: 'Accessibility validation failed'
        });
      }

      // Calculate overall score (weighted)
      const weights = {
        content: 0.3,
        design: 0.25,
        technical: 0.25,
        accessibility: 0.2
      };

      const overallScore = Math.round(
        (validationResults.content.score * weights.content) +
        (validationResults.design.score * weights.design) +
        (validationResults.technical.score * weights.technical) +
        (validationResults.accessibility.score * weights.accessibility)
      );

      validationResults.overall.score = overallScore;
      validationResults.overall.status = this.getOverallStatus(overallScore);

      // Compile all suggestions
      validationResults.suggestions = this.compileSuggestions(validationResults);

      // Set validation time
      validationResults.metadata.validationTime = Date.now() - startTime;

      console.log(`🎯 Overall quality score: ${overallScore}/100 (${validationResults.overall.status})`);

      return validationResults;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      validationResults.overall.status = 'error';
      validationResults.metadata.validationTime = Date.now() - startTime;
      return validationResults;
    }
  }

  /**
   * Apply automatic fixes based on validation results
   * @param {string} htmlString - Original HTML
   * @param {Object} validationResults - Results from validation
   * @param {Object} portfolioData - Original portfolio data
   * @param {Object} processedImages - Processed images
   * @returns {Object} Auto-fix results
   */
  async applyAutoFixes(htmlString, validationResults, portfolioData, processedImages) {
    console.log('⚡ Applying automatic fixes...');
    
    try {
      const dom = new JSDOM(htmlString);
      const document = dom.window.document;
      let fixesApplied = [];
      let htmlModified = false;

      // Apply accessibility fixes
      if (validationResults.accessibility.score < 80) {
        const accessibilityFixes = await this.applyAccessibilityFixes(document, validationResults.accessibility);
        fixesApplied.push(...accessibilityFixes);
        if (accessibilityFixes.length > 0) htmlModified = true;
      }

      // Apply technical fixes
      if (validationResults.technical.score < 80) {
        const technicalFixes = await this.applyTechnicalFixes(document, validationResults.technical);
        fixesApplied.push(...technicalFixes);
        if (technicalFixes.length > 0) htmlModified = true;
      }

      // Apply content fixes
      if (validationResults.content.score < 80) {
        const contentFixes = await this.applyContentFixes(document, validationResults.content, portfolioData);
        fixesApplied.push(...contentFixes);
        if (contentFixes.length > 0) htmlModified = true;
      }

      // Apply design fixes
      if (validationResults.design.score < 80) {
        const designFixes = await this.applyDesignFixes(document, validationResults.design, processedImages);
        fixesApplied.push(...designFixes);
        if (designFixes.length > 0) htmlModified = true;
      }

      const improvedHtml = htmlModified ? dom.serialize() : htmlString;

      console.log(`✅ Applied ${fixesApplied.length} automatic fixes`);

      return {
        success: true,
        improvedHtml,
        appliedFixes: fixesApplied,
        originalHtml: htmlString
      };

    } catch (error) {
      console.error('❌ Auto-fix failed:', error);
      return {
        success: false,
        error: error.message,
        improvedHtml: htmlString,
        appliedFixes: []
      };
    }
  }

  /**
   * Apply accessibility fixes
   */
  async applyAccessibilityFixes(document, accessibilityResults) {
    const fixes = [];

    accessibilityResults.issues.forEach(issue => {
      try {
        switch (issue.type) {
          case 'missing_alt_text':
            // Find images without alt text and add generic ones
            const images = document.querySelectorAll('img:not([alt])');
            images.forEach((img, index) => {
              img.setAttribute('alt', 'Portfolio image');
              fixes.push(`Added alt text to image ${index + 1}`);
            });
            break;

          case 'missing_main_landmark':
            // Wrap content in main tag if missing
            const body = document.querySelector('body');
            if (body && !document.querySelector('main')) {
              const main = document.createElement('main');
              // Move body content to main
              while (body.firstChild) {
                main.appendChild(body.firstChild);
              }
              body.appendChild(main);
              fixes.push('Added main landmark');
            }
            break;

          case 'missing_tabindex':
            // Add tabindex to interactive divs
            const interactiveDivs = document.querySelectorAll('div[onclick], div[role="button"]');
            interactiveDivs.forEach(div => {
              if (!div.getAttribute('tabindex')) {
                div.setAttribute('tabindex', '0');
                fixes.push('Added keyboard accessibility');
              }
            });
            break;
        }
      } catch (fixError) {
        console.warn('Failed to apply accessibility fix:', fixError);
      }
    });

    return fixes;
  }

  /**
   * Apply technical fixes
   */
  async applyTechnicalFixes(document, technicalResults) {
    const fixes = [];

    technicalResults.issues.forEach(issue => {
      try {
        switch (issue.type) {
          case 'missing_viewport':
            // Add viewport meta tag
            if (!document.querySelector('meta[name="viewport"]')) {
              const head = document.querySelector('head');
              if (head) {
                const viewport = document.createElement('meta');
                viewport.setAttribute('name', 'viewport');
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
                head.appendChild(viewport);
                fixes.push('Added viewport meta tag');
              }
            }
            break;

          case 'missing_lang':
            // Add lang attribute to html
            const html = document.querySelector('html');
            if (html && !html.getAttribute('lang')) {
              html.setAttribute('lang', 'en');
              fixes.push('Added language attribute');
            }
            break;

          case 'broken_link':
            // Fix broken internal links (basic fix)
            const brokenLinks = document.querySelectorAll('a[href=""]');
            brokenLinks.forEach(link => {
              link.setAttribute('href', '#');
              fixes.push('Fixed empty link');
            });
            break;
        }
      } catch (fixError) {
        console.warn('Failed to apply technical fix:', fixError);
      }
    });

    return fixes;
  }

  /**
   * Apply content fixes
   */
  async applyContentFixes(document, contentResults, portfolioData) {
    const fixes = [];

    contentResults.issues.forEach(issue => {
      try {
        switch (issue.type) {
          case 'missing_title':
            // Add title if missing
            if (!document.querySelector('title')) {
              const head = document.querySelector('head');
              if (head) {
                const title = document.createElement('title');
                title.textContent = `${portfolioData.personalInfo.name} - Portfolio`;
                head.appendChild(title);
                fixes.push('Added page title');
              }
            }
            break;

          case 'missing_meta_description':
            // Add meta description
            if (!document.querySelector('meta[name="description"]')) {
              const head = document.querySelector('head');
              if (head) {
                const metaDesc = document.createElement('meta');
                metaDesc.setAttribute('name', 'description');
                metaDesc.setAttribute('content', portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}`);
                head.appendChild(metaDesc);
                fixes.push('Added meta description');
              }
            }
            break;
        }
      } catch (fixError) {
        console.warn('Failed to apply content fix:', fixError);
      }
    });

    return fixes;
  }

  /**
   * Apply design fixes
   */
  async applyDesignFixes(document, designResults, processedImages) {
    const fixes = [];

    designResults.issues.forEach(issue => {
      try {
        switch (issue.type) {
          case 'missing_responsive_styles':
            // Add basic responsive styles if missing
            if (!document.querySelector('style, link[rel="stylesheet"]')) {
              const head = document.querySelector('head');
              if (head) {
                const style = document.createElement('style');
                style.textContent = `
                  * { box-sizing: border-box; }
                  body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                  img { max-width: 100%; height: auto; }
                  @media (max-width: 768px) { body { padding: 10px; } }
                `;
                head.appendChild(style);
                fixes.push('Added responsive styles');
              }
            }
            break;

          case 'placeholder_images':
            // This would be more complex - replace placeholders with actual images
            // For now, just note that it needs manual intervention
            fixes.push('Noted placeholder images for manual replacement');
            break;
        }
      } catch (fixError) {
        console.warn('Failed to apply design fix:', fixError);
      }
    });

    return fixes;
  }

  /**
   * Get overall status based on score
   */
  getOverallStatus(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Compile suggestions from all validators
   */
  compileSuggestions(validationResults) {
    const allSuggestions = [];
    
    // Combine suggestions from all validators
    ['content', 'design', 'technical', 'accessibility'].forEach(category => {
      if (validationResults[category].suggestions) {
        validationResults[category].suggestions.forEach(suggestion => {
          allSuggestions.push({
            ...suggestion,
            category,
            priority: this.getSuggestionPriority(suggestion, validationResults[category].score)
          });
        });
      }
    });

    // Sort by priority (high priority first)
    return allSuggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  /**
   * Determine suggestion priority based on category score
   */
  getSuggestionPriority(suggestion, categoryScore) {
    if (categoryScore < 60) return 'high';
    if (categoryScore < 80) return 'medium';
    return 'low';
  }
}

module.exports = new QualityAnalyzer();