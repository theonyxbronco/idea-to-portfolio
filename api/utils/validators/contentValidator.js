// portfolio-backend/utils/validators/contentValidator.js
const { JSDOM } = require('jsdom');

class ContentValidator {
  constructor() {
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * Main content validation function - flexible approach for moodboard-driven designs
   * @param {string} htmlString - Generated HTML content
   * @param {Object} portfolioData - Original portfolio data
   * @param {Object} processedImages - Processed images with URLs
   * @returns {Object} Content validation results
   */
  async validate(htmlString, portfolioData, processedImages = {}) {
    console.log('📝 Running flexible content validation...');
    
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];

    try {
      const dom = new JSDOM(htmlString);
      const document = dom.window.document;

      // Check if moodboard was provided to determine validation approach
      const hasMoodboard = processedImages.moodboard?.length > 0;

      // Run flexible content checks
      await this.validatePersonalInfo(document, portfolioData.personalInfo, hasMoodboard);
      await this.validateProjects(document, portfolioData.projects || [], hasMoodboard);
      await this.validateSkills(document, portfolioData.personalInfo.skills || [], hasMoodboard);
      await this.validateContactInfo(document, portfolioData.personalInfo, hasMoodboard);
      
      // Flexible content structure validation
      if (hasMoodboard) {
        await this.validateMoodboardDrivenContent(document, portfolioData);
      } else {
        await this.validateTraditionalContent(document, portfolioData);
      }
      
      await this.validateContentQuality(document, portfolioData);

      // Calculate overall score
      const totalChecks = this.passedChecks.length + this.issues.length;
      const score = totalChecks > 0 ? Math.round((this.passedChecks.length / totalChecks) * 100) : 0;

      return {
        score,
        issues: this.issues,
        passed: this.passedChecks,
        suggestions: this.suggestions,
        summary: this.generateSummary(score, hasMoodboard),
        contentAnalysis: {
          hasMoodboard,
          contentStructure: this.analyzeContentStructure(document),
          informationDensity: this.analyzeInformationDensity(document)
        }
      };

    } catch (error) {
      console.error('Content validation error:', error);
      return {
        score: 0,
        issues: [{ 
          type: 'validation_error', 
          severity: 'critical', 
          message: 'Content validation failed',
          details: error.message 
        }],
        passed: [],
        suggestions: []
      };
    }
  }

  /**
   * Validate personal information content with flexible expectations
   */
  async validatePersonalInfo(document, personalInfo, hasMoodboard) {
    if (!personalInfo) {
      this.issues.push({
        type: 'missing_personal_info',
        severity: 'critical',
        message: 'No personal information provided',
        fix: 'Add personal information to portfolio data'
      });
      return;
    }

    // Check if name is displayed (critical regardless of layout)
    const nameFound = this.findTextContent(document, personalInfo.name);
    if (nameFound) {
      this.passedChecks.push('Name displayed in portfolio');
    } else {
      this.issues.push({
        type: 'missing_name',
        severity: 'critical',
        message: `Name "${personalInfo.name}" not found in portfolio`,
        fix: 'Ensure name is prominently displayed (location flexible for creative layouts)'
      });
    }

    // Check if title/role is displayed (flexible placement)
    if (personalInfo.title) {
      const titleFound = this.findTextContent(document, personalInfo.title);
      if (titleFound) {
        this.passedChecks.push('Professional title displayed');
      } else {
        const severity = hasMoodboard ? 'medium' : 'high'; // More flexible with moodboard
        this.issues.push({
          type: 'missing_title',
          severity,
          message: `Professional title "${personalInfo.title}" not found`,
          fix: hasMoodboard ? 
            'Display professional title in way that matches moodboard aesthetic' :
            'Display professional title near name'
        });
      }
    }

    // Check if bio is included (flexible format)
    if (personalInfo.bio && personalInfo.bio.length > 50) {
      const bioFound = this.findTextContent(document, personalInfo.bio.substring(0, 30));
      if (bioFound) {
        this.passedChecks.push('Bio/About content included');
      } else {
        const severity = hasMoodboard ? 'low' : 'medium'; // More flexible with moodboard
        this.issues.push({
          type: 'missing_bio',
          severity,
          message: 'Bio/About content not found or incomplete',
          fix: hasMoodboard ? 
            'Include bio content in format that matches moodboard style (scattered text, quotes, etc.)' :
            'Include about/bio section with personal and professional information'
        });
      }
    } else {
      this.suggestions.push({
        type: 'short_bio',
        message: 'Bio is very short or missing',
        suggestion: hasMoodboard ? 
          'Consider adding bio content that integrates with moodboard aesthetic' :
          'Consider adding a more detailed professional bio'
      });
    }

    // Check for personal branding consistency
    if (personalInfo.name && personalInfo.title) {
      const pageTitle = document.querySelector('title');
      if (pageTitle && (pageTitle.textContent.includes(personalInfo.name) || 
                       pageTitle.textContent.includes('Portfolio'))) {
        this.passedChecks.push('Page title includes personal branding');
      }
    }
  }

  /**
   * Validate projects content with flexible structure expectations
   */
  async validateProjects(document, projects, hasMoodboard) {
    if (!projects || projects.length === 0) {
      this.issues.push({
        type: 'no_projects',
        severity: 'critical',
        message: 'No projects found in portfolio data',
        fix: 'Add project information to showcase work'
      });
      return;
    }

    console.log(`Validating ${projects.length} projects with ${hasMoodboard ? 'flexible' : 'traditional'} expectations...`);

    let projectsDisplayed = 0;
    let projectsWithDescriptions = 0;
    let projectsWithTags = 0;

    projects.forEach((project, index) => {
      // Check if project title exists (flexible placement)
      const titleFound = this.findTextContent(document, project.title);
      if (titleFound) {
        projectsDisplayed++;
      } else {
        const severity = hasMoodboard ? 'medium' : 'high'; // More flexible with moodboard
        this.issues.push({
          type: 'missing_project_title',
          severity,
          message: `Project "${project.title}" title not found in portfolio`,
          fix: hasMoodboard ?
            `Display project "${project.title}" title in style matching moodboard aesthetic` :
            `Ensure project ${index + 1} title is displayed in projects section`
        });
      }

      // Check if project description/overview exists (flexible format)
      if (project.overview && project.overview.length > 20) {
        const overviewFound = this.findTextContent(document, project.overview.substring(0, 25));
        if (overviewFound) {
          projectsWithDescriptions++;
        } else {
          const severity = hasMoodboard ? 'low' : 'medium'; // More flexible with moodboard
          this.issues.push({
            type: 'missing_project_description',
            severity,
            message: `Project "${project.title}" description not found`,
            fix: hasMoodboard ?
              `Add project description in format matching moodboard style (could be scattered, abbreviated, etc.)` :
              `Add description/overview for project "${project.title}"`
          });
        }
      }

      // Check if project tags are displayed (very flexible)
      if (project.tags && project.tags.length > 0) {
        const tagsFound = project.tags.some(tag => this.findTextContent(document, tag));
        if (tagsFound) {
          projectsWithTags++;
        } else {
          this.suggestions.push({
            type: 'missing_project_tags',
            message: `Project "${project.title}" tags not displayed`,
            suggestion: hasMoodboard ?
              'Consider displaying project tags/categories in creative way matching moodboard' :
              'Consider displaying project tags/categories for better organization'
          });
        }
      }

      // Check for project details (flexible approach)
      if (project.problem || project.solution || project.reflection) {
        const hasDetailedContent = this.findTextContent(document, project.problem) ||
                                 this.findTextContent(document, project.solution) ||
                                 this.findTextContent(document, project.reflection);
        
        if (hasDetailedContent) {
          this.passedChecks.push(`Project "${project.title}" has detailed content`);
        } else if (!hasMoodboard) {
          // Only suggest this for traditional layouts
          this.suggestions.push({
            type: 'missing_project_details',
            message: `Project "${project.title}" missing detailed content`,
            suggestion: 'Include problem, solution, and reflection sections in project details'
          });
        }
      }
    });

    // Summary checks with flexible expectations
    const displayRatio = projectsDisplayed / projects.length;
    
    if (displayRatio === 1) {
      this.passedChecks.push(`All ${projects.length} project titles displayed`);
    } else if (displayRatio >= 0.8) {
      this.passedChecks.push(`Most projects displayed (${projectsDisplayed}/${projects.length})`);
    } else {
      const severity = hasMoodboard ? 'medium' : 'high'; // More flexible with moodboard
      this.issues.push({
        type: 'missing_projects',
        severity,
        message: `Only ${projectsDisplayed}/${projects.length} projects displayed`,
        fix: hasMoodboard ?
          'Ensure all projects are included, even if presented in creative/non-traditional format' :
          'Ensure all projects are included in the portfolio'
      });
    }

    if (projectsWithDescriptions > projects.length * 0.5) {
      this.passedChecks.push('Most projects have descriptions');
    }

    if (projectsWithTags > 0) {
      this.passedChecks.push(`${projectsWithTags} projects have tags/categories`);
    }
  }

  /**
   * Validate skills content with flexible presentation expectations
   */
  async validateSkills(document, skills, hasMoodboard) {
    if (!skills || skills.length === 0) {
      this.suggestions.push({
        type: 'no_skills',
        message: 'No skills provided',
        suggestion: hasMoodboard ?
          'Add skills list (can be integrated creatively into moodboard-driven design)' :
          'Add skills section to highlight technical competencies'
      });
      return;
    }

    console.log(`Validating ${skills.length} skills with ${hasMoodboard ? 'flexible' : 'traditional'} expectations...`);

    // For moodboard designs, skills might be integrated creatively
    const skillsDisplayed = skills.filter(skill => this.findTextContent(document, skill));
    const skillsDisplayRatio = skillsDisplayed.length / skills.length;

    if (skillsDisplayRatio >= 0.8) {
      this.passedChecks.push(`Most skills displayed (${skillsDisplayed.length}/${skills.length})`);
    } else if (skillsDisplayRatio >= 0.5) {
      this.suggestions.push({
        type: 'some_skills_missing',
        message: `${skillsDisplayed.length}/${skills.length} skills displayed`,
        suggestion: hasMoodboard ?
          'Consider including more skills in creative format matching moodboard' :
          'Consider including all provided skills'
      });
    } else {
      const severity = hasMoodboard ? 'low' : 'medium'; // More flexible with moodboard
      this.issues.push({
        type: 'many_skills_missing',
        severity,
        message: `Only ${skillsDisplayed.length}/${skills.length} skills displayed`,
        fix: hasMoodboard ?
          'Include more skills in format matching moodboard aesthetic (could be scattered, abbreviated, visual, etc.)' :
          'Include more of the provided skills in the skills section'
      });
    }

    // Only check for traditional skills section if no moodboard
    if (!hasMoodboard) {
      const skillsSection = this.findSectionByHeading(document, ['skills', 'expertise', 'technologies', 'competencies']);
      
      if (!skillsSection) {
        this.issues.push({
          type: 'missing_skills_section',
          severity: 'medium',
          message: 'Skills section not found',
          fix: 'Add a dedicated skills/expertise section'
        });
      } else {
        this.passedChecks.push('Skills section found');
      }
    } else {
      // For moodboard designs, skills might be integrated anywhere
      this.passedChecks.push('Skills validation adapted for creative layout');
    }
  }

  /**
   * Validate contact information with flexible presentation
   */
  async validateContactInfo(document, personalInfo, hasMoodboard) {
    const contactFields = ['email', 'phone', 'website', 'linkedin', 'instagram', 'behance'];
    let contactFieldsFound = 0;
    let providedFields = 0;

    contactFields.forEach(field => {
      if (personalInfo[field] && personalInfo[field].trim()) {
        providedFields++;
        
        // Check if contact info is displayed or linked (flexible approach)
        const fieldElement = this.findTextContent(document, personalInfo[field]) ||
                           document.querySelector(`a[href*="${personalInfo[field]}"]`) ||
                           document.querySelector(`a[href*="${field}"]`);
        
        if (fieldElement) {
          contactFieldsFound++;
        }
      }
    });

    if (providedFields === 0) {
      this.suggestions.push({
        type: 'no_contact_info',
        message: 'No contact information provided',
        suggestion: 'Add contact information (email, social links, etc.)'
      });
      return;
    }

    if (contactFieldsFound === 0) {
      const severity = hasMoodboard ? 'medium' : 'high'; // More flexible with moodboard
      this.issues.push({
        type: 'no_contact_displayed',
        severity,
        message: 'No contact information displayed',
        fix: hasMoodboard ?
          'Add contact information in format matching moodboard aesthetic (could be footer, overlay, creative placement)' :
          'Add contact section with links to email, social profiles, etc.'
      });
    } else if (contactFieldsFound >= providedFields * 0.7) {
      this.passedChecks.push(`Contact information displayed (${contactFieldsFound}/${providedFields} methods)`);
    } else {
      this.suggestions.push({
        type: 'incomplete_contact',
        message: `${contactFieldsFound}/${providedFields} contact methods displayed`,
        suggestion: hasMoodboard ?
          'Display more contact options creatively throughout the design' :
          'Display more contact options for better accessibility'
      });
    }

    // Only check for traditional contact section if no moodboard
    if (!hasMoodboard) {
      const contactSection = this.findSectionByHeading(document, ['contact', 'get in touch', 'reach out', 'connect']);
      if (contactSection) {
        this.passedChecks.push('Dedicated contact section found');
      }
    }
  }

  /**
   * Validate moodboard-driven content structure (flexible approach)
   */
  async validateMoodboardDrivenContent(document, portfolioData) {
    console.log('🎨 Validating moodboard-driven content structure...');

    // Check for creative content organization
    const sections = document.querySelectorAll('section, div[class*="section"], main > div, article, .content-block');
    const sectionCount = sections.length;

    if (sectionCount > 0) {
      this.passedChecks.push(`Content organized into ${sectionCount} sections/blocks`);
      
      // Check for varied content presentation (suggests moodboard influence)
      let layoutVariety = 0;
      sections.forEach(section => {
        const className = section.getAttribute('class') || '';
        const style = section.getAttribute('style') || '';
        
        // Look for signs of creative layout
        if (className.includes('creative') || className.includes('experimental') || 
            style.includes('position: absolute') || style.includes('transform')) {
          layoutVariety++;
        }
      });

      if (layoutVariety > 0) {
        this.passedChecks.push('Creative content presentation detected - suggests moodboard influence');
      }
    } else {
      this.suggestions.push({
        type: 'single_content_block',
        message: 'Content appears to be in single block',
        suggestion: 'Consider organizing content into multiple sections/areas as suggested by moodboard'
      });
    }

    // Check for non-traditional content organization patterns
    const creativePatterns = this.detectCreativeContentPatterns(document);
    if (creativePatterns.length > 0) {
      this.passedChecks.push(`Creative content patterns detected: ${creativePatterns.join(', ')}`);
    }

    // Validate essential information is present (regardless of structure)
    await this.validateEssentialInformation(document, portfolioData, true);
  }

  /**
   * Validate traditional content structure (stricter approach)
   */
  async validateTraditionalContent(document, portfolioData) {
    console.log('📋 Validating traditional content structure...');

    // Check for essential sections (traditional approach)
    const essentialSections = [
      { names: ['about', 'bio', 'introduction'], required: true, label: 'About' },
      { names: ['projects', 'work', 'portfolio', 'showcase'], required: true, label: 'Projects' },
      { names: ['skills', 'expertise', 'technologies'], required: false, label: 'Skills' },
      { names: ['contact', 'get in touch', 'connect'], required: false, label: 'Contact' }
    ];

    let foundSections = 0;
    let requiredSections = 0;

    essentialSections.forEach(section => {
      if (section.required) requiredSections++;
      
      const sectionFound = this.findSectionByHeading(document, section.names);
      if (sectionFound) {
        foundSections++;
        this.passedChecks.push(`${section.label} section found`);
      } else if (section.required) {
        this.issues.push({
          type: 'missing_essential_section',
          severity: 'high',
          message: `Missing essential section: ${section.names.join(' or ')}`,
          fix: `Add ${section.label.toLowerCase()} section to portfolio`
        });
      }
    });

    // Validate essential information is present
    await this.validateEssentialInformation(document, portfolioData, false);
  }

  /**
   * Validate essential information is present (regardless of structure)
   */
  async validateEssentialInformation(document, portfolioData, isMoodboardDriven) {
    // Check content length/substance
    const bodyText = document.body ? document.body.textContent : '';
    const wordCount = bodyText.trim().split(/\s+/).length;

    const minWords = isMoodboardDriven ? 50 : 100; // More flexible for creative layouts
    const recommendedWords = isMoodboardDriven ? 200 : 300;

    if (wordCount < minWords) {
      this.issues.push({
        type: 'insufficient_content',
        severity: 'high',
        message: `Very little content (${wordCount} words)`,
        fix: isMoodboardDriven ?
          'Add more content throughout the creative layout' :
          'Add more descriptive content throughout the portfolio'
      });
    } else if (wordCount < recommendedWords) {
      this.suggestions.push({
        type: 'light_content',
        message: `Light content (${wordCount} words)`,
        suggestion: isMoodboardDriven ?
          'Consider adding more content integrated with moodboard aesthetic' :
          'Consider adding more detailed descriptions and information'
      });
    } else {
      this.passedChecks.push(`Substantial content (${wordCount} words)`);
    }
  }

  /**
   * Detect creative content patterns that suggest moodboard influence
   */
  detectCreativeContentPatterns(document) {
    const patterns = [];
    const htmlContent = document.documentElement.outerHTML.toLowerCase();

    // Check for overlapping content
    if (htmlContent.includes('position: absolute') || htmlContent.includes('z-index')) {
      patterns.push('overlapping elements');
    }

    // Check for scattered text/quotes
    if (htmlContent.includes('blockquote') || htmlContent.includes('pull-quote')) {
      patterns.push('featured quotes');
    }

    // Check for mixed media integration
    if (htmlContent.includes('video') || htmlContent.includes('iframe')) {
      patterns.push('mixed media');
    }

    // Check for creative navigation
    if (htmlContent.includes('hamburger') || htmlContent.includes('overlay') || htmlContent.includes('sidebar')) {
      patterns.push('creative navigation');
    }

    // Check for asymmetrical layouts
    if (htmlContent.includes('float:') || htmlContent.includes('transform:')) {
      patterns.push('asymmetrical layout');
    }

    return patterns;
  }

  /**
   * Analyze content structure
   */
  analyzeContentStructure(document) {
    const sections = document.querySelectorAll('section, div[class*="section"], main > div, article');
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const lists = document.querySelectorAll('ul, ol');
    const paragraphs = document.querySelectorAll('p');

    return {
      sectionCount: sections.length,
      headingCount: headings.length,
      listCount: lists.length,
      paragraphCount: paragraphs.length,
      structure: sections.length > 0 ? 'sectioned' : 'single-flow'
    };
  }

  /**
   * Analyze information density
   */
  analyzeInformationDensity(document) {
    const bodyText = document.body ? document.body.textContent : '';
    const wordCount = bodyText.trim().split(/\s+/).length;
    const elementCount = document.querySelectorAll('*').length;
    
    const density = elementCount > 0 ? wordCount / elementCount : 0;

    return {
      wordCount,
      elementCount,
      density,
      level: density > 5 ? 'high' : density > 2 ? 'medium' : 'low'
    };
  }

  /**
   * Validate content quality (universal checks)
   */
  async validateContentQuality(document, portfolioData) {
    // Check for placeholder text
    const bodyText = document.body ? document.body.textContent.toLowerCase() : '';
    const placeholderPhrases = [
      'lorem ipsum', 'placeholder', 'sample text', 'dummy text',
      'your name here', 'insert text', 'add content', 'coming soon'
    ];

    const hasPlaceholders = placeholderPhrases.some(phrase => bodyText.includes(phrase));
    if (hasPlaceholders) {
      this.issues.push({
        type: 'placeholder_content',
        severity: 'high',
        message: 'Placeholder text found in portfolio',
        fix: 'Replace all placeholder text with actual content'
      });
    } else {
      this.passedChecks.push('No placeholder text detected');
    }

    // Check for repeated content
    const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim());
    const uniqueParagraphs = new Set(paragraphs.filter(p => p.length > 20));
    
    if (paragraphs.length > 0 && uniqueParagraphs.size < paragraphs.length * 0.8) {
      this.suggestions.push({
        type: 'repetitive_content',
        message: 'Some content appears to be repeated',
        suggestion: 'Ensure each section has unique, valuable content'
      });
    }

    // Check for personal voice (flexible)
    const hasPersonalPronouns = bodyText.includes(' i ') || bodyText.includes(' my ') || bodyText.includes(' me ');
    if (hasPersonalPronouns) {
      this.passedChecks.push('Personal voice used in content');
    }
  }

  /**
   * Helper methods (keeping existing ones)
   */
  findTextContent(document, text) {
    if (!text || text.length < 3) return null;
    
    const searchText = text.toLowerCase().substring(0, Math.min(text.length, 50));
    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      const textContent = (el.textContent || '').toLowerCase();
      return textContent.includes(searchText);
    });

    return elements.length > 0 ? elements[0] : null;
  }

  findSectionByHeading(document, headingTexts) {
    for (const headingText of headingTexts) {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      for (const heading of headings) {
        const headingContent = heading.textContent.toLowerCase();
        if (headingContent.includes(headingText.toLowerCase())) {
          return heading.closest('section') || 
                 heading.parentElement?.closest('div') || 
                 heading.parentElement;
        }
      }
      
      const elementsWithClass = document.querySelectorAll(`[class*="${headingText}"], [id*="${headingText}"]`);
      if (elementsWithClass.length > 0) {
        return elementsWithClass[0];
      }
    }
    return null;
  }

  /**
   * Generate summary based on score and approach
   */
  generateSummary(score, hasMoodboard) {
    const approach = hasMoodboard ? 'creative content integration' : 'traditional content structure';
    
    if (score >= 90) {
      return `Excellent ${approach} - ${hasMoodboard ? 'content beautifully integrated with creative design' : 'comprehensive and well-organized information'}`;
    } else if (score >= 75) {
      return `Good ${approach} - ${hasMoodboard ? 'content mostly integrates well with creative layout' : 'most essential information is present'}`;
    } else if (score >= 60) {
      return `Fair ${approach} - ${hasMoodboard ? 'content present but integration could be improved' : 'missing some important information or sections'}`;
    } else {
      return `Poor ${approach} - ${hasMoodboard ? 'content poorly integrated or insufficient' : 'significant information gaps need to be addressed'}`;
    }
  }

  /**
   * Generate auto-fix suggestions (adapted for flexibility)
   */
  generateAutoFixes() {
    const autoFixes = [];

    this.issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_name':
          autoFixes.push({
            type: 'add_name',
            action: 'addContent',
            content: 'Add name prominently to design',
            flexible: true
          });
          break;

        case 'missing_title':
          autoFixes.push({
            type: 'add_professional_title',
            action: 'addContent',
            content: 'Add professional title',
            flexible: true
          });
          break;

        case 'missing_bio':
          autoFixes.push({
            type: 'add_bio_content',
            action: 'addContent',
            content: 'Add bio/about content',
            flexible: true
          });
          break;

        case 'no_contact_displayed':
          autoFixes.push({
            type: 'add_contact_info',
            action: 'addContent',
            content: 'Add contact information',
            flexible: true
          });
          break;
      }
    });

    return autoFixes;
  }
}

module.exports = new ContentValidator();