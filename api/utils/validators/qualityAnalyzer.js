const { logger } = require("./../logger");
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
    logger.info('🔍 Starting comprehensive portfolio validation...');
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
        logger.info(`✅ Content validation: ${contentResult.value.score}/100`);
      } else {
        logger.warn('⚠️ Content validation failed:', contentResult.reason);
        validationResults.content.issues.push({
          type: 'validation_error',
          severity: 'low',
          message: 'Content validation failed'
        });
      }

      // Process design validation results
      if (designResult.status === 'fulfilled') {
        validationResults.design = designResult.value;
        logger.info(`🎨 Design validation: ${designResult.value.score}/100`);
      } else {
        logger.warn('⚠️ Design validation failed:', designResult.reason);
        validationResults.design.issues.push({
          type: 'validation_error',
          severity: 'low',
          message: 'Design validation failed'
        });
      }

      // Process technical validation results
      if (technicalResult.status === 'fulfilled') {
        validationResults.technical = technicalResult.value;
        logger.info(`🔧 Technical validation: ${technicalResult.value.score}/100`);
      } else {
        logger.warn('⚠️ Technical validation failed:', technicalResult.reason);
        validationResults.technical.issues.push({
          type: 'validation_error',
          severity: 'low',
          message: 'Technical validation failed'
        });
      }

      // Process accessibility validation results
      if (accessibilityResult.status === 'fulfilled') {
        validationResults.accessibility = accessibilityResult.value;
        logger.info(`♿ Accessibility validation: ${accessibilityResult.value.score}/100`);
      } else {
        logger.warn('⚠️ Accessibility validation failed:', accessibilityResult.reason);
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

      logger.info(`🎯 Overall quality score: ${overallScore}/100 (${validationResults.overall.status})`);

      return validationResults;

    } catch (error) {
      logger.error('❌ Validation failed:', error);
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
    logger.info('⚡ Applying automatic fixes...');
    
    try {
      const dom = new JSDOM(htmlString);
      const document = dom.window.document;
      let fixesApplied = [];
      let htmlModified = false;

      // Apply accessibility fixes first (highest impact)
      if (validationResults.accessibility.score < 80) {
        const accessibilityFixes = await this.applyAccessibilityFixes(document, validationResults.accessibility);
        fixesApplied.push(...accessibilityFixes);
        if (accessibilityFixes.length > 0) htmlModified = true;
      }

      // Apply technical fixes
      if (validationResults.technical.score < 80) {
        const technicalFixes = await this.applyTechnicalFixes(document, validationResults.technical, portfolioData);
        fixesApplied.push(...technicalFixes);
        if (technicalFixes.length > 0) htmlModified = true;
      }

      // Apply content fixes
      if (validationResults.content.score < 80) {
        const contentFixes = await this.applyContentFixes(document, validationResults.content, portfolioData);
        fixesApplied.push(...contentFixes);
        if (contentFixes.length > 0) htmlModified = true;
      }

      // Apply design fixes (more complex, limited auto-fixes)
      if (validationResults.design.score < 70) {
        const designFixes = await this.applyDesignFixes(document, validationResults.design, processedImages);
        fixesApplied.push(...designFixes);
        if (designFixes.length > 0) htmlModified = true;
      }

      const improvedHtml = htmlModified ? dom.serialize() : htmlString;

      logger.info(`✅ Applied ${fixesApplied.length} automatic fixes`);

      return {
        success: true,
        improvedHtml,
        appliedFixes: fixesApplied,
        originalHtml: htmlString
      };

    } catch (error) {
      logger.error('❌ Auto-fix failed:', error);
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
              // Move body content to main (preserve structure)
              const bodyChildren = Array.from(body.children);
              bodyChildren.forEach(child => {
                if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') {
                  main.appendChild(child);
                }
              });
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
                fixes.push('Added keyboard accessibility to interactive element');
              }
            });
            break;

          case 'missing_h1':
            // Add H1 if missing
            if (!document.querySelector('h1')) {
              const firstHeading = document.querySelector('h2, h3, h4, h5, h6');
              if (firstHeading) {
                firstHeading.tagName = 'h1';
                fixes.push('Fixed heading hierarchy - added H1');
              }
            }
            break;
        }
      } catch (fixError) {
        logger.warn('Failed to apply accessibility fix:', fixError);
      }
    });

    return fixes;
  }

  /**
   * Apply technical fixes
   */
  async applyTechnicalFixes(document, technicalResults, portfolioData) {
    const fixes = [];

    technicalResults.issues.forEach(issue => {
      try {
        switch (issue.type) {
          case 'missing_viewport':
            // Add viewport meta tag
            if (!document.querySelector('meta[name="viewport"]')) {
              const head = document.querySelector('head') || document.createElement('head');
              const viewport = document.createElement('meta');
              viewport.setAttribute('name', 'viewport');
              viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
              head.appendChild(viewport);
              if (!document.querySelector('head')) {
                document.documentElement.insertBefore(head, document.body);
              }
              fixes.push('Added viewport meta tag');
            }
            break;

          case 'missing_charset':
            // Add charset meta tag
            if (!document.querySelector('meta[charset]')) {
              const head = document.querySelector('head') || document.createElement('head');
              const charset = document.createElement('meta');
              charset.setAttribute('charset', 'UTF-8');
              head.insertBefore(charset, head.firstChild);
              fixes.push('Added charset meta tag');
            }
            break;

          case 'missing_title':
            // Add title if missing
            if (!document.querySelector('title')) {
              const head = document.querySelector('head') || document.createElement('head');
              const title = document.createElement('title');
              title.textContent = `${portfolioData.personalInfo.name} - Portfolio`;
              head.appendChild(title);
              fixes.push('Added page title');
            }
            break;

          case 'missing_lang_attribute':
            // Add lang attribute to html
            const html = document.querySelector('html');
            if (html && !html.getAttribute('lang')) {
              html.setAttribute('lang', 'en');
              fixes.push('Added language attribute');
            }
            break;

          case 'broken_image_src':
            // Fix empty image src attributes
            const brokenImages = document.querySelectorAll('img[src=""], img:not([src])');
            brokenImages.forEach((img, index) => {
              img.setAttribute('src', `https://via.placeholder.com/400x300?text=Portfolio+Image+${index + 1}`);
              fixes.push(`Fixed broken image ${index + 1}`);
            });
            break;
        }
      } catch (fixError) {
        logger.warn('Failed to apply technical fix:', fixError);
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
          case 'missing_name':
            // Add name to first heading or create one
            const firstHeading = document.querySelector('h1, h2, h3');
            if (firstHeading && !firstHeading.textContent.includes(portfolioData.personalInfo.name)) {
              firstHeading.textContent = portfolioData.personalInfo.name;
              fixes.push('Added name to heading');
            } else if (!firstHeading) {
              const body = document.querySelector('body');
              if (body) {
                const nameHeading = document.createElement('h1');
                nameHeading.textContent = portfolioData.personalInfo.name;
                body.insertBefore(nameHeading, body.firstChild);
                fixes.push('Created name heading');
              }
            }
            break;

          case 'missing_title':
            // Add professional title near name
            const nameElement = document.querySelector('h1');
            if (nameElement && portfolioData.personalInfo.title) {
              const titleElement = document.createElement('h2');
              titleElement.textContent = portfolioData.personalInfo.title;
              nameElement.parentNode.insertBefore(titleElement, nameElement.nextSibling);
              fixes.push('Added professional title');
            }
            break;

          case 'placeholder_content':
            // Replace common placeholder text
            const textElements = document.querySelectorAll('p, div, span');
            textElements.forEach(element => {
              let text = element.textContent;
              if (text.toLowerCase().includes('lorem ipsum')) {
                element.textContent = portfolioData.personalInfo.bio || 'Professional portfolio content.';
                fixes.push('Replaced placeholder text');
              }
            });
            break;
        }
      } catch (fixError) {
        logger.warn('Failed to apply content fix:', fixError);
      }
    });

    return fixes;
  }

  /**
   * Apply design fixes (limited auto-fixes possible)
   */
  async applyDesignFixes(document, designResults, processedImages) {
    const fixes = [];

    designResults.issues.forEach(issue => {
      try {
        switch (issue.type) {
          case 'not_responsive':
            // Add basic responsive styles if missing
            if (!document.querySelector('style') || !document.querySelector('style').textContent.includes('@media')) {
              const head = document.querySelector('head') || document.createElement('head');
              const style = document.createElement('style');
              style.textContent = `
                /* Basic responsive styles */
                * { box-sizing: border-box; }
                img { max-width: 100%; height: auto; }
                @media (max-width: 768px) {
                  body { padding: 10px; }
                  .container { width: 100%; }
                }
              `;
              head.appendChild(style);
              fixes.push('Added basic responsive styles');
            }
            break;

          case 'no_client_images_used':
            // Replace first few placeholder images with client images
            if (processedImages && processedImages.final && processedImages.final.length > 0) {
              const placeholderImages = document.querySelectorAll('img[src*="placeholder"], img[src*="picsum"], img[src*="via.placeholder"]');
              const clientImages = processedImages.final.slice(0, Math.min(placeholderImages.length, 3));
              
              placeholderImages.forEach((img, index) => {
                if (clientImages[index]) {
                  img.setAttribute('src', clientImages[index].url);
                  fixes.push(`Replaced placeholder with client image ${index + 1}`);
                }
              });
            }
            break;

          case 'poor_contrast':
            // Add basic contrast improvements
            const style = document.querySelector('style') || document.createElement('style');
            style.textContent += `
              /* Improved contrast */
              body { color: #333; background-color: #fff; }
              .dark-text { color: #222; }
              .light-bg { background-color: #f9f9f9; }
            `;
            fixes.push('Added contrast improvements');
            break;
        }
      } catch (fixError) {
        logger.warn('Failed to apply design fix:', fixError);
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