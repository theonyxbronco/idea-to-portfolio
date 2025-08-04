// portfolio-backend/utils/validators/technicalValidator.js
const { JSDOM } = require('jsdom');

class TechnicalValidator {
  constructor() {
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * Main technical validation function
   * @param {string} htmlString - Generated HTML content
   * @param {Object} portfolioData - Original portfolio data
   * @param {Object} processedImages - Processed images with URLs
   * @returns {Object} Technical validation results
   */
  async validate(htmlString, portfolioData, processedImages = {}) {
    console.log('🔧 Running technical validation...');
    
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];

    try {
      const dom = new JSDOM(htmlString);
      const document = dom.window.document;

      // Run all technical checks
      this.validateHtmlStructure(document);
      this.validateMetaTags(document, portfolioData);
      this.validateResponsiveDesign(document);
      this.validateImages(document, processedImages);
      this.validateLinks(document);
      this.validatePerformance(document);
      this.validateSEO(document, portfolioData);

      // Calculate overall score
      const totalChecks = this.passedChecks.length + this.issues.length;
      const score = totalChecks > 0 ? Math.round((this.passedChecks.length / totalChecks) * 100) : 0;

      return {
        score,
        issues: this.issues,
        passed: this.passedChecks,
        suggestions: this.suggestions,
        summary: this.generateSummary(score)
      };

    } catch (error) {
      console.error('Technical validation error:', error);
      return {
        score: 0,
        issues: [{ 
          type: 'validation_error', 
          severity: 'high',
          message: 'Failed to parse HTML for technical validation',
          details: error.message 
        }],
        passed: [],
        suggestions: []
      };
    }
  }

  /**
   * Validate HTML structure and syntax
   */
  validateHtmlStructure(document) {
    // Check for DOCTYPE
    const doctype = document.doctype;
    if (!doctype || doctype.name.toLowerCase() !== 'html') {
      this.issues.push({
        type: 'missing_doctype',
        severity: 'medium',
        message: 'Missing or incorrect DOCTYPE declaration',
        fix: 'Add <!DOCTYPE html> at the beginning of the document'
      });
    } else {
      this.passedChecks.push('Valid HTML5 DOCTYPE found');
    }

    // Check for html element with lang attribute
    const htmlElement = document.querySelector('html');
    if (!htmlElement) {
      this.issues.push({
        type: 'missing_html_element',
        severity: 'high',
        message: 'Missing <html> element',
        fix: 'Wrap content in proper <html> element'
      });
    } else if (!htmlElement.getAttribute('lang')) {
      this.issues.push({
        type: 'missing_lang_attribute',
        severity: 'medium',
        message: 'Missing lang attribute on <html> element',
        fix: 'Add lang="en" or appropriate language code to <html> element'
      });
    } else {
      this.passedChecks.push('HTML element has lang attribute');
    }

    // Check for head and body
    const head = document.querySelector('head');
    const body = document.querySelector('body');
    
    if (!head) {
      this.issues.push({
        type: 'missing_head',
        severity: 'high',
        message: 'Missing <head> element',
        fix: 'Add <head> element with meta tags and title'
      });
    } else {
      this.passedChecks.push('Head element found');
    }

    if (!body) {
      this.issues.push({
        type: 'missing_body',
        severity: 'high',
        message: 'Missing <body> element',
        fix: 'Wrap main content in <body> element'
      });
    } else {
      this.passedChecks.push('Body element found');
    }

    // Check for semantic HTML usage
    const semanticElements = ['main', 'nav', 'header', 'footer', 'section', 'article', 'aside'];
    let semanticCount = 0;

    semanticElements.forEach(tag => {
      const elements = document.querySelectorAll(tag);
      if (elements.length > 0) {
        semanticCount++;
      }
    });

    if (semanticCount >= 3) {
      this.passedChecks.push(`Good use of semantic HTML (${semanticCount} semantic elements)`);
    } else {
      this.suggestions.push({
        type: 'improve_semantics',
        message: 'Could improve semantic HTML structure',
        suggestion: 'Use more semantic elements like <main>, <nav>, <section>, <header>, <footer>'
      });
    }
  }

  /**
   * Validate essential meta tags
   */
  validateMetaTags(document, portfolioData) {
    const head = document.querySelector('head');
    if (!head) return;

    // Check for title
    const title = document.querySelector('title');
    if (!title || !title.textContent.trim()) {
      this.issues.push({
        type: 'missing_title',
        severity: 'high',
        message: 'Missing or empty <title> element',
        fix: `Add <title>${portfolioData.personalInfo.name} - Portfolio</title>`
      });
    } else {
      this.passedChecks.push('Page title found');
    }

    // Check for meta charset
    const charset = document.querySelector('meta[charset]');
    if (!charset) {
      this.issues.push({
        type: 'missing_charset',
        severity: 'medium',
        message: 'Missing charset meta tag',
        fix: 'Add <meta charset="UTF-8"> in head'
      });
    } else {
      this.passedChecks.push('Charset meta tag found');
    }

    // Check for viewport meta tag
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      this.issues.push({
        type: 'missing_viewport',
        severity: 'high',
        message: 'Missing viewport meta tag',
        fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">'
      });
    } else {
      this.passedChecks.push('Viewport meta tag found');
    }

    // Check for meta description
    const description = document.querySelector('meta[name="description"]');
    if (!description || !description.getAttribute('content')?.trim()) {
      this.suggestions.push({
        type: 'add_meta_description',
        message: 'Missing meta description',
        suggestion: 'Add meta description for better SEO'
      });
    } else {
      this.passedChecks.push('Meta description found');
    }
  }

  /**
   * Validate responsive design elements
   */
  validateResponsiveDesign(document) {
    // Check for CSS with media queries
    const styleElements = document.querySelectorAll('style');
    let hasMediaQueries = false;
    let hasFlexboxGrid = false;

    styleElements.forEach(styleEl => {
      const css = styleEl.textContent || '';
      if (css.includes('@media')) {
        hasMediaQueries = true;
      }
      if (css.includes('display: flex') || css.includes('display: grid') || 
          css.includes('display:flex') || css.includes('display:grid')) {
        hasFlexboxGrid = true;
      }
    });

    if (hasMediaQueries) {
      this.passedChecks.push('Responsive media queries found');
    } else {
      this.issues.push({
        type: 'missing_media_queries',
        severity: 'medium',
        message: 'No responsive media queries detected',
        fix: 'Add CSS media queries for different screen sizes'
      });
    }

    if (hasFlexboxGrid) {
      this.passedChecks.push('Modern layout methods (Flexbox/Grid) detected');
    } else {
      this.suggestions.push({
        type: 'use_modern_layout',
        message: 'Consider using Flexbox or CSS Grid for layout',
        suggestion: 'Replace float-based layouts with modern CSS layout methods'
      });
    }

    // Check for responsive images
    const images = document.querySelectorAll('img');
    let responsiveImages = 0;

    images.forEach(img => {
      const style = img.getAttribute('style') || '';
      if (style.includes('max-width') || style.includes('width: 100%')) {
        responsiveImages++;
      }
    });

    if (images.length > 0) {
      if (responsiveImages > images.length * 0.8) {
        this.passedChecks.push('Most images are responsive');
      } else {
        this.suggestions.push({
          type: 'make_images_responsive',
          message: 'Some images may not be responsive',
          suggestion: 'Add max-width: 100% and height: auto to images'
        });
      }
    }
  }

  /**
   * Validate images
   */
  validateImages(document, processedImages) {
    const images = document.querySelectorAll('img');
    let imagesWithAlt = 0;
    let brokenImages = 0;
    let clientImagesUsed = 0;

    const clientImageUrls = Object.values(processedImages).flat().map(img => img.url || '');

    images.forEach((img, index) => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt');

      // Check alt text
      if (alt && alt.trim()) {
        imagesWithAlt++;
      }

      // Check if using client's actual images
      if (src && clientImageUrls.some(clientUrl => src.includes(clientUrl))) {
        clientImagesUsed++;
      }

      // Check for broken src
      if (!src || src.trim() === '') {
        brokenImages++;
        this.issues.push({
          type: 'broken_image_src',
          severity: 'high',
          message: `Image ${index + 1} missing src attribute`,
          fix: 'Add valid src attribute to image'
        });
      }
    });

    if (images.length > 0) {
      if (imagesWithAlt === images.length) {
        this.passedChecks.push('All images have alt text');
      } else {
        this.issues.push({
          type: 'missing_alt_text',
          severity: 'medium',
          message: `${images.length - imagesWithAlt} images missing alt text`,
          fix: 'Add descriptive alt text to all images'
        });
      }

      if (clientImagesUsed > 0) {
        this.passedChecks.push(`${clientImagesUsed} client images properly used`);
      }

      if (brokenImages === 0) {
        this.passedChecks.push('All images have valid src attributes');
      }
    }
  }

  /**
   * Validate links
   */
  validateLinks(document) {
    const links = document.querySelectorAll('a[href]');
    let workingLinks = 0;
    let emptyLinks = 0;

    links.forEach((link, index) => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();

      if (!href || href.trim() === '') {
        emptyLinks++;
        this.issues.push({
          type: 'empty_link',
          severity: 'medium',
          message: `Link ${index + 1} has empty href`,
          fix: 'Add valid href or remove link'
        });
      } else {
        workingLinks++;
      }

      // Check for accessible link text
      if (!text && !link.getAttribute('aria-label')) {
        this.issues.push({
          type: 'inaccessible_link',
          severity: 'medium',
          message: `Link ${index + 1} has no accessible text`,
          fix: 'Add descriptive text content or aria-label'
        });
      }
    });

    if (links.length > 0) {
      if (emptyLinks === 0) {
        this.passedChecks.push('All links have valid href attributes');
      }
      
      this.passedChecks.push(`${workingLinks} links found`);
    }
  }

  /**
   * Validate performance aspects
   */
  validatePerformance(document) {
    // Check for excessive inline styles
    const elementsWithInlineStyles = document.querySelectorAll('[style]');
    if (elementsWithInlineStyles.length > 20) {
      this.issues.push({
        type: 'excessive_inline_styles',
        severity: 'low',
        message: `${elementsWithInlineStyles.length} elements with inline styles`,
        fix: 'Move inline styles to CSS classes for better performance'
      });
    } else {
      this.passedChecks.push('Reasonable use of inline styles');
    }

    // Check DOM size
    const totalElements = document.querySelectorAll('*').length;
    if (totalElements > 1500) {
      this.suggestions.push({
        type: 'large_dom',
        message: `Large DOM size (${totalElements} elements)`,
        suggestion: 'Consider simplifying HTML structure'
      });
    } else {
      this.passedChecks.push('Reasonable DOM size');
    }

    // Check for script tags
    const scripts = document.querySelectorAll('script');
    if (scripts.length > 0) {
      this.passedChecks.push(`${scripts.length} script elements found`);
    }

    // Check for CSS
    const stylesheets = document.querySelectorAll('style, link[rel="stylesheet"]');
    if (stylesheets.length > 0) {
      this.passedChecks.push(`${stylesheets.length} stylesheet elements found`);
    }
  }

  /**
   * Validate SEO basics
   */
  validateSEO(document, portfolioData) {
    // Check for proper heading structure
    const h1s = document.querySelectorAll('h1');
    if (h1s.length === 0) {
      this.issues.push({
        type: 'missing_h1',
        severity: 'medium',
        message: 'No H1 heading found',
        fix: 'Add H1 heading for main page title'
      });
    } else if (h1s.length > 1) {
      this.suggestions.push({
        type: 'multiple_h1',
        message: `${h1s.length} H1 headings found`,
        suggestion: 'Consider using only one H1 per page'
      });
    } else {
      this.passedChecks.push('Single H1 heading found');
    }

    // Check for structured data potential
    const name = portfolioData?.personalInfo?.name;
    if (name && !document.querySelector('[itemtype], script[type="application/ld+json"]')) {
      this.suggestions.push({
        type: 'add_structured_data',
        message: 'Could benefit from structured data markup',
        suggestion: 'Add schema.org Person markup for better SEO'
      });
    }
  }

  /**
   * Generate summary based on score
   */
  generateSummary(score) {
    if (score >= 90) {
      return 'Excellent technical implementation - well structured and optimized';
    } else if (score >= 75) {
      return 'Good technical quality - minor improvements recommended';
    } else if (score >= 60) {
      return 'Fair technical implementation - several issues should be addressed';
    } else {
      return 'Poor technical quality - significant improvements needed';
    }
  }

  /**
   * Generate auto-fix suggestions
   */
  generateAutoFixes() {
    const autoFixes = [];

    this.issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_viewport':
          autoFixes.push({
            type: 'add_viewport_meta',
            action: 'addToHead',
            element: '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
          });
          break;

        case 'missing_charset':
          autoFixes.push({
            type: 'add_charset_meta',
            action: 'addToHead',
            element: '<meta charset="UTF-8">'
          });
          break;

        case 'missing_title':
          autoFixes.push({
            type: 'add_title',
            action: 'addToHead',
            element: '<title>Portfolio</title>'
          });
          break;

        case 'missing_lang_attribute':
          autoFixes.push({
            type: 'add_lang_attribute',
            selector: 'html',
            action: 'setAttribute',
            attribute: 'lang',
            value: 'en'
          });
          break;
      }
    });

    return autoFixes;
  }
}

module.exports = new TechnicalValidator();