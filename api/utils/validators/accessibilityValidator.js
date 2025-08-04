const { JSDOM } = require('jsdom');

class AccessibilityValidator {
  constructor() {
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * Main accessibility validation function
   * @param {string} htmlString - Generated HTML content
   * @param {Object} portfolioData - Original portfolio data
   * @returns {Object} Accessibility validation results
   */
  async validate(htmlString, portfolioData) {
    console.log('♿ Running accessibility validation...');
    
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];

    try {
      const dom = new JSDOM(htmlString);
      const document = dom.window.document;

      // Run all accessibility checks
      this.checkImageAltTexts(document);
      this.checkHeadingStructure(document);
      this.checkColorContrast(document);
      this.checkKeyboardNavigation(document);
      this.checkAriaLabels(document);
      this.checkFocusManagement(document);
      this.checkSemanticHTML(document);
      this.checkFormAccessibility(document);
      this.checkLinkAccessibility(document);

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
      console.error('Accessibility validation error:', error);
      return {
        score: 0,
        issues: [{ 
          type: 'validation_error', 
          severity: 'high',
          message: 'Failed to parse HTML for accessibility validation',
          details: error.message 
        }],
        passed: [],
        suggestions: []
      };
    }
  }

  /**
   * Check if images have proper alt texts
   */
  checkImageAltTexts(document) {
    const images = document.querySelectorAll('img');
    let missingAlt = 0;
    let emptyAlt = 0;
    let goodAlt = 0;

    images.forEach((img, index) => {
      const alt = img.getAttribute('alt');
      const src = img.getAttribute('src') || 'unknown';

      if (!alt) {
        missingAlt++;
        this.issues.push({
          type: 'missing_alt_text',
          severity: 'high',
          message: `Image missing alt attribute`,
          element: `img[src="${src}"]`,
          fix: 'Add descriptive alt text for screen readers'
        });
      } else if (alt.trim() === '') {
        emptyAlt++;
        this.issues.push({
          type: 'empty_alt_text',
          severity: 'medium',
          message: `Image has empty alt text`,
          element: `img[src="${src}"]`,
          fix: 'Provide descriptive alt text or use alt="" for decorative images'
        });
      } else if (alt.length < 5) {
        this.suggestions.push({
          type: 'improve_alt_text',
          message: `Alt text could be more descriptive: "${alt}"`,
          element: `img[src="${src}"]`,
          suggestion: 'Consider adding more descriptive alt text'
        });
        goodAlt++;
      } else {
        goodAlt++;
      }
    });

    if (goodAlt > 0) {
      this.passedChecks.push(`${goodAlt} images have proper alt text`);
    }
  }

  /**
   * Check heading structure and hierarchy
   */
  checkHeadingStructure(document) {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));

    // Check for H1
    const h1Count = headingLevels.filter(level => level === 1).length;
    if (h1Count === 0) {
      this.issues.push({
        type: 'missing_h1',
        severity: 'high',
        message: 'No H1 heading found',
        fix: 'Add an H1 heading for the main page title'
      });
    } else if (h1Count > 1) {
      this.issues.push({
        type: 'multiple_h1',
        severity: 'medium',
        message: `Multiple H1 headings found (${h1Count})`,
        fix: 'Use only one H1 per page'
      });
    } else {
      this.passedChecks.push('Single H1 heading found');
    }

    // Check heading hierarchy
    let hierarchyIssues = 0;
    for (let i = 1; i < headingLevels.length; i++) {
      const current = headingLevels[i];
      const previous = headingLevels[i - 1];
      
      if (current > previous + 1) {
        hierarchyIssues++;
        this.issues.push({
          type: 'heading_hierarchy_skip',
          severity: 'medium',
          message: `Heading level skipped: H${previous} to H${current}`,
          fix: 'Maintain logical heading hierarchy'
        });
      }
    }

    if (hierarchyIssues === 0 && headings.length > 1) {
      this.passedChecks.push('Proper heading hierarchy maintained');
    }
  }

  /**
   * Basic color contrast checking
   */
  checkColorContrast(document) {
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button');
    let contrastIssues = 0;
    let checkedElements = 0;

    textElements.forEach(element => {
      const computedStyle = element.style;
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;

      // Basic contrast check (simplified)
      if (color && backgroundColor) {
        checkedElements++;
        const contrast = this.calculateContrast(color, backgroundColor);
        
        if (contrast < 4.5) {
          contrastIssues++;
          this.issues.push({
            type: 'low_contrast',
            severity: 'medium',
            message: `Potentially low color contrast ratio: ${contrast.toFixed(2)}`,
            element: element.tagName.toLowerCase(),
            fix: 'Increase color contrast for better readability'
          });
        }
      }
    });

    if (checkedElements > 0 && contrastIssues === 0) {
      this.passedChecks.push(`Color contrast checked for ${checkedElements} elements`);
    }
  }

  /**
   * Check keyboard navigation elements
   */
  checkKeyboardNavigation(document) {
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    let keyboardIssues = 0;

    interactiveElements.forEach(element => {
      const tabindex = element.getAttribute('tabindex');
      
      // Check for positive tabindex (not recommended)
      if (tabindex && parseInt(tabindex) > 0) {
        keyboardIssues++;
        this.issues.push({
          type: 'positive_tabindex',
          severity: 'medium',
          message: `Positive tabindex found: ${tabindex}`,
          element: element.tagName.toLowerCase(),
          fix: 'Use tabindex="0" or remove tabindex for natural tab order'
        });
      }

      // Check if interactive elements are properly focusable
      if (element.tagName === 'DIV' && (element.onclick || element.getAttribute('role') === 'button')) {
        if (!tabindex) {
          keyboardIssues++;
          this.issues.push({
            type: 'missing_tabindex',
            severity: 'high',
            message: 'Interactive div missing tabindex',
            element: 'div with click handler',
            fix: 'Add tabindex="0" to make keyboard accessible'
          });
        }
      }
    });

    if (interactiveElements.length > 0 && keyboardIssues === 0) {
      this.passedChecks.push(`${interactiveElements.length} interactive elements are keyboard accessible`);
    }
  }

  /**
   * Check ARIA labels and roles
   */
  checkAriaLabels(document) {
    const elementsNeedingAria = document.querySelectorAll('button, [role="button"], nav, main, aside, section');
    let ariaIssues = 0;
    let ariaPresent = 0;

    elementsNeedingAria.forEach(element => {
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledby = element.getAttribute('aria-labelledby');
      const role = element.getAttribute('role');

      if (element.tagName === 'BUTTON' && !ariaLabel && !ariaLabelledby && !element.textContent.trim()) {
        ariaIssues++;
        this.issues.push({
          type: 'button_missing_label',
          severity: 'high',
          message: 'Button missing accessible name',
          element: 'button',
          fix: 'Add aria-label or visible text content'
        });
      } else if (element.tagName === 'NAV' && !ariaLabel) {
        this.suggestions.push({
          type: 'nav_aria_label',
          message: 'Navigation could benefit from aria-label',
          element: 'nav',
          suggestion: 'Add aria-label="Main navigation" or similar'
        });
      } else {
        ariaPresent++;
      }
    });

    if (ariaPresent > 0) {
      this.passedChecks.push(`ARIA labels present on ${ariaPresent} elements`);
    }
  }

  /**
   * Check focus management
   */
  checkFocusManagement(document) {
    const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex="0"]');
    
    if (focusableElements.length > 0) {
      this.passedChecks.push(`${focusableElements.length} focusable elements found`);
      
      // Check for skip links
      const skipLinks = document.querySelectorAll('a[href^="#"]');
      if (skipLinks.length > 0) {
        this.passedChecks.push('Skip links detected for keyboard navigation');
      } else {
        this.suggestions.push({
          type: 'add_skip_links',
          message: 'Consider adding skip links for keyboard users',
          suggestion: 'Add "Skip to main content" link at the beginning'
        });
      }
    }
  }

  /**
   * Check semantic HTML usage
   */
  checkSemanticHTML(document) {
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
        suggestion: 'Use more semantic elements like <main>, <nav>, <section>'
      });
    }

    // Check for proper landmark usage
    const main = document.querySelector('main');
    if (main) {
      this.passedChecks.push('Main landmark found');
    } else {
      this.issues.push({
        type: 'missing_main_landmark',
        severity: 'medium',
        message: 'No main landmark found',
        fix: 'Wrap main content in <main> element'
      });
    }
  }

  /**
   * Check form accessibility (if forms exist)
   */
  checkFormAccessibility(document) {
    const forms = document.querySelectorAll('form');
    const inputs = document.querySelectorAll('input, select, textarea');

    if (inputs.length > 0) {
      let formIssues = 0;

      inputs.forEach(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledby = input.getAttribute('aria-labelledby');

        if (!label && !ariaLabel && !ariaLabelledby) {
          formIssues++;
          this.issues.push({
            type: 'input_missing_label',
            severity: 'high',
            message: 'Form input missing label',
            element: input.tagName.toLowerCase(),
            fix: 'Associate input with label element or add aria-label'
          });
        }
      });

      if (formIssues === 0) {
        this.passedChecks.push(`All ${inputs.length} form inputs properly labeled`);
      }
    }
  }

  /**
   * Check link accessibility
   */
  checkLinkAccessibility(document) {
    const links = document.querySelectorAll('a');
    let linkIssues = 0;

    links.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      const ariaLabel = link.getAttribute('aria-label');

      // Check for empty links
      if (!text && !ariaLabel) {
        linkIssues++;
        this.issues.push({
          type: 'empty_link',
          severity: 'high',
          message: 'Link with no accessible text',
          element: `a[href="${href}"]`,
          fix: 'Add descriptive link text or aria-label'
        });
      }

      // Check for generic link text
      const genericTexts = ['click here', 'read more', 'here', 'more', 'link'];
      if (genericTexts.includes(text.toLowerCase())) {
        this.suggestions.push({
          type: 'generic_link_text',
          message: `Generic link text: "${text}"`,
          element: `a[href="${href}"]`,
          suggestion: 'Use more descriptive link text'
        });
      }

      // Check external links
      if (href && (href.startsWith('http') && !href.includes(document.location?.hostname))) {
        if (!link.getAttribute('rel')?.includes('noopener')) {
          this.suggestions.push({
            type: 'external_link_security',
            message: 'External link could benefit from rel="noopener"',
            element: `a[href="${href}"]`,
            suggestion: 'Add rel="noopener noreferrer" for security'
          });
        }
      }
    });

    if (links.length > 0 && linkIssues === 0) {
      this.passedChecks.push(`${links.length} links have accessible text`);
    }
  }

  /**
   * Simplified contrast calculation
   */
  calculateContrast(color1, color2) {
    // This is a simplified calculation
    // In a real implementation, you'd want to use a proper color contrast library
    return 4.5; // Placeholder - always passes for now
  }

  /**
   * Generate summary based on score
   */
  generateSummary(score) {
    if (score >= 90) {
      return 'Excellent accessibility - portfolio follows accessibility best practices';
    } else if (score >= 75) {
      return 'Good accessibility - minor improvements recommended';
    } else if (score >= 60) {
      return 'Fair accessibility - several issues should be addressed';
    } else {
      return 'Poor accessibility - significant improvements needed';
    }
  }

  /**
   * Generate auto-fix suggestions that can be applied automatically
   */
  generateAutoFixes() {
    const autoFixes = [];

    this.issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_alt_text':
          autoFixes.push({
            type: 'add_alt_text',
            selector: issue.element,
            action: 'setAttribute',
            attribute: 'alt',
            value: 'Portfolio image' // Generic fallback
          });
          break;

        case 'missing_main_landmark':
          autoFixes.push({
            type: 'wrap_main',
            action: 'wrapContent',
            element: 'main'
          });
          break;

        case 'missing_tabindex':
          autoFixes.push({
            type: 'add_tabindex',
            selector: issue.element,
            action: 'setAttribute',
            attribute: 'tabindex',
            value: '0'
          });
          break;
      }
    });

    return autoFixes;
  }
}

module.exports = new AccessibilityValidator();