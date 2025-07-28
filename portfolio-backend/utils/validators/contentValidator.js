// portfolio-backend/utils/validators/contentValidator.js
const { JSDOM } = require('jsdom');

class ContentValidator {
  constructor() {
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * Main content validation function
   * @param {string} htmlString - Generated HTML content
   * @param {Object} portfolioData - Original portfolio data
   * @param {Object} processedImages - Processed images with URLs
   * @returns {Object} Content validation results
   */
  async validate(htmlString, portfolioData, processedImages = {}) {
    console.log('📝 Running content validation...');
    
    this.passedChecks = [];
    this.issues = [];
    this.suggestions = [];

    try {
      const dom = new JSDOM(htmlString);
      const document = dom.window.document;

      // Run all content checks
      await this.validatePersonalInfo(document, portfolioData.personalInfo);
      await this.validateProjects(document, portfolioData.projects || []);
      await this.validateSkills(document, portfolioData.personalInfo.skills || []);
      await this.validateContactInfo(document, portfolioData.personalInfo);
      await this.validateContentCompleteness(document, portfolioData);
      await this.validateContentQuality(document, portfolioData);

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
   * Validate personal information content
   */
  async validatePersonalInfo(document, personalInfo) {
    if (!personalInfo) {
      this.issues.push({
        type: 'missing_personal_info',
        severity: 'critical',
        message: 'No personal information provided',
        fix: 'Add personal information to portfolio data'
      });
      return;
    }

    // Check if name is displayed
    const nameFound = this.findTextContent(document, personalInfo.name);
    if (nameFound) {
      this.passedChecks.push('Name displayed in portfolio');
    } else {
      this.issues.push({
        type: 'missing_name',
        severity: 'critical',
        message: `Name "${personalInfo.name}" not found in portfolio`,
        fix: 'Ensure name is prominently displayed (usually in header or hero section)'
      });
    }

    // Check if title/role is displayed
    if (personalInfo.title) {
      const titleFound = this.findTextContent(document, personalInfo.title);
      if (titleFound) {
        this.passedChecks.push('Professional title displayed');
      } else {
        this.issues.push({
          type: 'missing_title',
          severity: 'high',
          message: `Professional title "${personalInfo.title}" not found`,
          fix: 'Display professional title near name'
        });
      }
    }

    // Check if bio is included
    if (personalInfo.bio && personalInfo.bio.length > 50) {
      const bioFound = this.findTextContent(document, personalInfo.bio.substring(0, 30));
      if (bioFound) {
        this.passedChecks.push('Bio/About section included');
      } else {
        this.issues.push({
          type: 'missing_bio',
          severity: 'medium',
          message: 'Bio/About section not found or incomplete',
          fix: 'Include about/bio section with personal and professional information'
        });
      }
    } else {
      this.suggestions.push({
        type: 'short_bio',
        message: 'Bio is very short or missing',
        suggestion: 'Consider adding a more detailed professional bio'
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
   * Validate projects content
   */
  async validateProjects(document, projects) {
    if (!projects || projects.length === 0) {
      this.issues.push({
        type: 'no_projects',
        severity: 'critical',
        message: 'No projects found in portfolio data',
        fix: 'Add project information to showcase work'
      });
      return;
    }

    console.log(`Validating ${projects.length} projects...`);

    let projectsDisplayed = 0;
    let projectsWithDescriptions = 0;
    let projectsWithTags = 0;

    projects.forEach((project, index) => {
      // Check if project title exists
      const titleFound = this.findTextContent(document, project.title);
      if (titleFound) {
        projectsDisplayed++;
      } else {
        this.issues.push({
          type: 'missing_project_title',
          severity: 'high',
          message: `Project "${project.title}" title not found in portfolio`,
          fix: `Ensure project ${index + 1} title is displayed in projects section`
        });
      }

      // Check if project description/overview exists
      if (project.overview && project.overview.length > 20) {
        const overviewFound = this.findTextContent(document, project.overview.substring(0, 25));
        if (overviewFound) {
          projectsWithDescriptions++;
        } else {
          this.issues.push({
            type: 'missing_project_description',
            severity: 'medium',
            message: `Project "${project.title}" description not found`,
            fix: `Add description/overview for project "${project.title}"`
          });
        }
      }

      // Check if project tags are displayed
      if (project.tags && project.tags.length > 0) {
        const tagsFound = project.tags.some(tag => this.findTextContent(document, tag));
        if (tagsFound) {
          projectsWithTags++;
        } else {
          this.suggestions.push({
            type: 'missing_project_tags',
            message: `Project "${project.title}" tags not displayed`,
            suggestion: 'Consider displaying project tags/categories for better organization'
          });
        }
      }

      // Check for project details in expanded view
      if (project.problem || project.solution || project.reflection) {
        const hasDetailedContent = this.findTextContent(document, project.problem) ||
                                 this.findTextContent(document, project.solution) ||
                                 this.findTextContent(document, project.reflection);
        
        if (hasDetailedContent) {
          this.passedChecks.push(`Project "${project.title}" has detailed content`);
        } else {
          this.suggestions.push({
            type: 'missing_project_details',
            message: `Project "${project.title}" missing detailed content`,
            suggestion: 'Include problem, solution, and reflection sections in project details'
          });
        }
      }
    });

    // Summary checks
    if (projectsDisplayed === projects.length) {
      this.passedChecks.push(`All ${projects.length} project titles displayed`);
    } else {
      this.issues.push({
        type: 'missing_projects',
        severity: 'high',
        message: `Only ${projectsDisplayed}/${projects.length} projects displayed`,
        fix: 'Ensure all projects are included in the portfolio'
      });
    }

    if (projectsWithDescriptions > projects.length * 0.7) {
      this.passedChecks.push('Most projects have descriptions');
    }

    if (projectsWithTags > 0) {
      this.passedChecks.push(`${projectsWithTags} projects have tags/categories`);
    }
  }

  /**
   * Validate skills content
   */
  async validateSkills(document, skills) {
    if (!skills || skills.length === 0) {
      this.suggestions.push({
        type: 'no_skills',
        message: 'No skills provided',
        suggestion: 'Add skills section to highlight technical competencies'
      });
      return;
    }

    console.log(`Validating ${skills.length} skills...`);

    // Check if skills section exists
    const skillsSection = this.findSectionByHeading(document, ['skills', 'expertise', 'technologies', 'competencies']);
    
    if (!skillsSection) {
      this.issues.push({
        type: 'missing_skills_section',
        severity: 'medium',
        message: 'Skills section not found',
        fix: 'Add a dedicated skills/expertise section'
      });
      return;
    } else {
      this.passedChecks.push('Skills section found');
    }

    // Check if skills are displayed
    const displayedSkills = skills.filter(skill => this.findTextContent(document, skill));
    const skillsDisplayRatio = displayedSkills.length / skills.length;

    if (skillsDisplayRatio >= 0.8) {
      this.passedChecks.push(`Most skills displayed (${displayedSkills.length}/${skills.length})`);
    } else if (skillsDisplayRatio >= 0.5) {
      this.suggestions.push({
        type: 'some_skills_missing',
        message: `${displayedSkills.length}/${skills.length} skills displayed`,
        suggestion: 'Consider including all provided skills'
      });
    } else {
      this.issues.push({
        type: 'many_skills_missing',
        severity: 'medium',
        message: `Only ${displayedSkills.length}/${skills.length} skills displayed`,
        fix: 'Include more of the provided skills in the skills section'
      });
    }
  }

  /**
   * Validate contact information
   */
  async validateContactInfo(document, personalInfo) {
    const contactFields = ['email', 'phone', 'website', 'linkedin', 'instagram', 'behance'];
    let contactFieldsFound = 0;
    let providedFields = 0;

    contactFields.forEach(field => {
      if (personalInfo[field] && personalInfo[field].trim()) {
        providedFields++;
        
        // Check if contact info is displayed or linked
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
      this.issues.push({
        type: 'no_contact_displayed',
        severity: 'high',
        message: 'No contact information displayed',
        fix: 'Add contact section with links to email, social profiles, etc.'
      });
    } else if (contactFieldsFound >= providedFields * 0.7) {
      this.passedChecks.push(`Contact information displayed (${contactFieldsFound}/${providedFields} methods)`);
    } else {
      this.suggestions.push({
        type: 'incomplete_contact',
        message: `${contactFieldsFound}/${providedFields} contact methods displayed`,
        suggestion: 'Display more contact options for better accessibility'
      });
    }

    // Check for contact section specifically
    const contactSection = this.findSectionByHeading(document, ['contact', 'get in touch', 'reach out', 'connect']);
    if (contactSection) {
      this.passedChecks.push('Dedicated contact section found');
    }
  }

  /**
   * Validate overall content completeness
   */
  async validateContentCompleteness(document, portfolioData) {
    // Check for essential sections
    const essentialSections = [
      { names: ['about', 'bio', 'introduction'], required: true },
      { names: ['projects', 'work', 'portfolio', 'showcase'], required: true },
      { names: ['skills', 'expertise', 'technologies'], required: false },
      { names: ['contact', 'get in touch', 'connect'], required: false }
    ];

    let foundSections = 0;
    let requiredSections = 0;

    essentialSections.forEach(section => {
      if (section.required) requiredSections++;
      
      const sectionFound = this.findSectionByHeading(document, section.names);
      if (sectionFound) {
        foundSections++;
        this.passedChecks.push(`${section.names[0]} section found`);
      } else if (section.required) {
        this.issues.push({
          type: 'missing_essential_section',
          severity: 'high',
          message: `Missing essential section: ${section.names.join(' or ')}`,
          fix: `Add ${section.names[0]} section to portfolio`
        });
      }
    });

    // Check content length/substance
    const bodyText = document.body ? document.body.textContent : '';
    const wordCount = bodyText.trim().split(/\s+/).length;

    if (wordCount < 100) {
      this.issues.push({
        type: 'insufficient_content',
        severity: 'high',
        message: `Very little content (${wordCount} words)`,
        fix: 'Add more descriptive content throughout the portfolio'
      });
    } else if (wordCount < 300) {
      this.suggestions.push({
        type: 'light_content',
        message: `Light content (${wordCount} words)`,
        suggestion: 'Consider adding more detailed descriptions and information'
      });
    } else {
      this.passedChecks.push(`Substantial content (${wordCount} words)`);
    }
  }

  /**
   * Validate content quality
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

    // Check for professional tone (basic check)
    const hasPersonalPronouns = bodyText.includes(' i ') || bodyText.includes(' my ') || bodyText.includes(' me ');
    if (hasPersonalPronouns) {
      this.passedChecks.push('Personal voice used in content');
    }
  }

  /**
   * Helper methods
   */
  findTextContent(document, text) {
    if (!text || text.length < 3) return null;
    
    // Search for text content (case-insensitive, partial matches)
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
      
      // Also check for elements with class names or IDs containing the heading text
      const elementsWithClass = document.querySelectorAll(`[class*="${headingText}"], [id*="${headingText}"]`);
      if (elementsWithClass.length > 0) {
        return elementsWithClass[0];
      }
    }
    return null;
  }

  /**
   * Generate summary based on score
   */
  generateSummary(score) {
    if (score >= 90) {
      return 'Excellent content - comprehensive and well-organized information';
    } else if (score >= 75) {
      return 'Good content quality - most essential information is present';
    } else if (score >= 60) {
      return 'Fair content - missing some important information or sections';
    } else {
      return 'Poor content quality - significant information gaps need to be addressed';
    }
  }

  /**
   * Generate auto-fix suggestions
   */
  generateAutoFixes() {
    const autoFixes = [];

    this.issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_name':
          autoFixes.push({
            type: 'add_name',
            action: 'addToHeader',
            content: 'Add name to header/hero section'
          });
          break;

        case 'missing_title':
          autoFixes.push({
            type: 'add_professional_title',
            action: 'addToHeader',
            content: 'Add professional title near name'
          });
          break;

        case 'missing_skills_section':
          autoFixes.push({
            type: 'add_skills_section',
            action: 'addSection',
            content: 'Create skills/expertise section'
          });
          break;

        case 'missing_contact_displayed':
          autoFixes.push({
            type: 'add_contact_section',
            action: 'addSection',
            content: 'Create contact section with links'
          });
          break;
      }
    });

    return autoFixes;
  }
}

module.exports = new ContentValidator();