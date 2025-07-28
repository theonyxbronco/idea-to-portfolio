class ContentValidator {
    async validate(dom, portfolioData) {
      const issues = [];
      const fixes = [];
      let score = 100;
  
      console.log('📝 Validating content...');
  
      try {
        // Check personal information
        await this.validatePersonalInfo(dom, portfolioData.personalInfo, issues);
        
        // Check projects
        await this.validateProjects(dom, portfolioData.projects, issues);
        
        // Check skills
        await this.validateSkills(dom, portfolioData.personalInfo.skills, issues);
        
        // Check contact information
        await this.validateContactInfo(dom, portfolioData.personalInfo, issues);
  
        // Calculate score based on issues
        score = Math.max(0, 100 - (issues.length * 10));
  
        console.log(`📝 Content validation complete. Found ${issues.length} issues. Score: ${score}`);
  
        return {
          score,
          issues,
          fixes,
          summary: `${issues.length} content issues found`
        };
  
      } catch (error) {
        console.error('Content validation error:', error);
        return {
          score: 0,
          issues: [{ 
            type: 'validation_error', 
            severity: 'critical', 
            description: 'Content validation failed',
            autoFixable: false 
          }],
          fixes: [],
          summary: 'Content validation failed'
        };
      }
    }
  
    async validatePersonalInfo(dom, personalInfo, issues) {
      // Check if name is displayed
      const nameElement = this.findTextContent(dom, personalInfo.name);
      if (!nameElement) {
        issues.push({
          type: 'missing_content',
          severity: 'critical',
          description: `Name "${personalInfo.name}" not found in portfolio`,
          autoFixable: true,
          fix: {
            type: 'add_text_content',
            content: personalInfo.name,
            selector: 'h1, .hero-title, .name'
          }
        });
      }
  
      // Check if title/role is displayed
      const titleElement = this.findTextContent(dom, personalInfo.title);
      if (!titleElement) {
        issues.push({
          type: 'missing_content',
          severity: 'high',
          description: `Professional title "${personalInfo.title}" not found`,
          autoFixable: true,
          fix: {
            type: 'add_text_content',
            content: personalInfo.title,
            selector: 'h2, .hero-subtitle, .title'
          }
        });
      }
  
      // Check if bio is included (if provided)
      if (personalInfo.bio && personalInfo.bio.length > 50) {
        const bioElement = this.findTextContent(dom, personalInfo.bio.substring(0, 50));
        if (!bioElement) {
          issues.push({
            type: 'missing_content',
            severity: 'medium',
            description: 'Bio/About section not found or incomplete',
            autoFixable: true,
            fix: {
              type: 'add_about_section',
              content: personalInfo.bio
            }
          });
        }
      }
    }
  
    async validateProjects(dom, projects, issues) {
      if (!projects || projects.length === 0) return;
  
      console.log(`Validating ${projects.length} projects...`);
  
      projects.forEach((project, index) => {
        // Check if project title exists
        const titleElement = this.findTextContent(dom, project.title);
        if (!titleElement) {
          issues.push({
            type: 'missing_content',
            severity: 'high',
            description: `Project "${project.title}" title not found`,
            autoFixable: true,
            fix: {
              type: 'add_project_title',
              projectIndex: index,
              content: project.title
            }
          });
        }
  
        // Check if project description/overview exists
        if (project.overview && project.overview.length > 30) {
          const overviewElement = this.findTextContent(dom, project.overview.substring(0, 30));
          if (!overviewElement) {
            issues.push({
              type: 'missing_content',
              severity: 'medium',
              description: `Project "${project.title}" description missing`,
              autoFixable: true,
              fix: {
                type: 'add_project_description',
                projectIndex: index,
                content: project.overview
              }
            });
          }
        }
  
        // Check if project tags are displayed
        if (project.tags && project.tags.length > 0) {
          const tagsFound = project.tags.some(tag => this.findTextContent(dom, tag));
          if (!tagsFound) {
            issues.push({
              type: 'missing_content',
              severity: 'low',
              description: `Project "${project.title}" tags not displayed`,
              autoFixable: true,
              fix: {
                type: 'add_project_tags',
                projectIndex: index,
                content: project.tags
              }
            });
          }
        }
      });
    }
  
    async validateSkills(dom, skills, issues) {
      if (!skills || skills.length === 0) return;
  
      console.log(`Validating ${skills.length} skills...`);
  
      // Check if skills section exists
      const skillsSection = dom.querySelector('.skills, [class*="skill"], #skills') ||
                           this.findSectionByHeading(dom, ['skills', 'expertise', 'technologies']);
  
      if (!skillsSection) {
        issues.push({
          type: 'missing_content',
          severity: 'medium',
          description: 'Skills section not found',
          autoFixable: true,
          fix: {
            type: 'add_skills_section',
            content: skills
          }
        });
        return;
      }
  
      // Check if most skills are displayed (at least 70%)
      const displayedSkills = skills.filter(skill => this.findTextContent(dom, skill));
      const skillsDisplayRatio = displayedSkills.length / skills.length;
  
      if (skillsDisplayRatio < 0.7) {
        issues.push({
          type: 'missing_content',
          severity: 'medium',
          description: `Only ${displayedSkills.length}/${skills.length} skills displayed`,
          autoFixable: true,
          fix: {
            type: 'add_missing_skills',
            content: skills.filter(skill => !this.findTextContent(dom, skill))
          }
        });
      }
    }
  
    async validateContactInfo(dom, personalInfo, issues) {
      const contactFields = ['email', 'phone', 'website', 'linkedin', 'instagram'];
      let contactFieldsFound = 0;
      let providedFields = 0;
  
      contactFields.forEach(field => {
        if (personalInfo[field] && personalInfo[field].trim()) {
          providedFields++;
          
          // Check if contact info is displayed or linked
          const fieldElement = this.findTextContent(dom, personalInfo[field]) ||
                             dom.querySelector(`a[href*="${personalInfo[field]}"]`) ||
                             dom.querySelector(`a[href*="${field}"]`);
          
          if (fieldElement) {
            contactFieldsFound++;
          }
        }
      });
  
      if (providedFields > 0 && contactFieldsFound === 0) {
        issues.push({
          type: 'missing_content',
          severity: 'high',
          description: 'No contact information displayed',
          autoFixable: true,
          fix: {
            type: 'add_contact_section',
            content: personalInfo
          }
        });
      } else if (contactFieldsFound < providedFields * 0.5) {
        issues.push({
          type: 'missing_content',
          severity: 'medium',
          description: `Only ${contactFieldsFound}/${providedFields} contact methods displayed`,
          autoFixable: true,
          fix: {
            type: 'improve_contact_section',
            content: personalInfo
          }
        });
      }
    }
  
    // Helper methods
    findTextContent(dom, text) {
      if (!text || text.length < 3) return null;
      
      // Search for exact matches and partial matches
      const elements = Array.from(dom.querySelectorAll('*')).filter(el => {
        const textContent = el.textContent || '';
        return textContent.includes(text.substring(0, Math.min(text.length, 30)));
      });
  
      return elements.length > 0 ? elements[0] : null;
    }
  
    findSectionByHeading(dom, headingTexts) {
      for (const headingText of headingTexts) {
        const headings = dom.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (const heading of headings) {
          if (heading.textContent.toLowerCase().includes(headingText.toLowerCase())) {
            return heading.closest('section') || heading.parentElement;
          }
        }
      }
      return null;
    }
  }
  
  module.exports = new ContentValidator();