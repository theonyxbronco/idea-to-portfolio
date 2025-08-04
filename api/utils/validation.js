class ValidationError extends Error {
    constructor(message, field, code) {
      super(message);
      this.name = 'ValidationError';
      this.field = field;
      this.code = code;
    }
  }
  
  class PortfolioValidator {
    constructor() {
      this.requiredPersonalFields = ['name', 'title'];
      this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      this.urlRegex = /^https?:\/\/.+/;
      this.maxTextLength = {
        name: 100,
        title: 150,
        bio: 1000,
        projectTitle: 200,
        projectOverview: 2000,
        skill: 50
      };
    }
  
    validatePersonalInfo(personalInfo) {
      const errors = [];
      
      if (!personalInfo) {
        throw new ValidationError('Personal information is required', 'personalInfo', 'REQUIRED');
      }
  
      // Required fields
      this.requiredPersonalFields.forEach(field => {
        if (!personalInfo[field] || personalInfo[field].trim().length === 0) {
          errors.push({
            field: `personalInfo.${field}`,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
            code: 'REQUIRED'
          });
        }
      });
  
      // Length validations
      Object.keys(this.maxTextLength).forEach(field => {
        if (personalInfo[field] && personalInfo[field].length > this.maxTextLength[field]) {
          errors.push({
            field: `personalInfo.${field}`,
            message: `${field} must be less than ${this.maxTextLength[field]} characters`,
            code: 'MAX_LENGTH'
          });
        }
      });
  
      // Email validation
      if (personalInfo.email && !this.emailRegex.test(personalInfo.email)) {
        errors.push({
          field: 'personalInfo.email',
          message: 'Invalid email format',
          code: 'INVALID_FORMAT'
        });
      }
  
      // URL validations
      const urlFields = ['website', 'linkedin', 'instagram', 'behance'];
      urlFields.forEach(field => {
        if (personalInfo[field] && personalInfo[field].trim().length > 0) {
          let url = personalInfo[field].trim();
          
          // Add https:// if missing
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (field === 'linkedin' && !url.startsWith('linkedin.com')) {
              url = `https://linkedin.com/in/${url}`;
            } else if (field === 'instagram' && !url.startsWith('instagram.com')) {
              url = `https://instagram.com/${url.replace('@', '')}`;
            } else if (field === 'behance' && !url.startsWith('behance.net')) {
              url = `https://behance.net/${url}`;
            } else {
              url = `https://${url}`;
            }
            personalInfo[field] = url; // Update the field with corrected URL
          }
          
          try {
            new URL(url);
          } catch {
            errors.push({
              field: `personalInfo.${field}`,
              message: `Invalid ${field} URL format`,
              code: 'INVALID_URL'
            });
          }
        }
      });
  
      // Skills validation
      if (personalInfo.skills) {
        if (!Array.isArray(personalInfo.skills)) {
          errors.push({
            field: 'personalInfo.skills',
            message: 'Skills must be an array',
            code: 'INVALID_TYPE'
          });
        } else {
          personalInfo.skills.forEach((skill, index) => {
            if (typeof skill !== 'string' || skill.trim().length === 0) {
              errors.push({
                field: `personalInfo.skills[${index}]`,
                message: 'Each skill must be a non-empty string',
                code: 'INVALID_SKILL'
              });
            } else if (skill.length > this.maxTextLength.skill) {
              errors.push({
                field: `personalInfo.skills[${index}]`,
                message: `Skill must be less than ${this.maxTextLength.skill} characters`,
                code: 'SKILL_TOO_LONG'
              });
            }
          });
        }
      }
  
      return { isValid: errors.length === 0, errors, correctedData: personalInfo };
    }
  
    validateProjects(projects) {
      const errors = [];
      
      if (!Array.isArray(projects)) {
        throw new ValidationError('Projects must be an array', 'projects', 'INVALID_TYPE');
      }
  
      if (projects.length === 0) {
        errors.push({
          field: 'projects',
          message: 'At least one project is required',
          code: 'MIN_PROJECTS'
        });
      }
  
      if (projects.length > 10) {
        errors.push({
          field: 'projects',
          message: 'Maximum 10 projects allowed',
          code: 'MAX_PROJECTS'
        });
      }
  
      projects.forEach((project, index) => {
        // Required project fields
        if (!project.title || project.title.trim().length === 0) {
          errors.push({
            field: `projects[${index}].title`,
            message: 'Project title is required',
            code: 'REQUIRED'
          });
        }
  
        // Length validations
        if (project.title && project.title.length > this.maxTextLength.projectTitle) {
          errors.push({
            field: `projects[${index}].title`,
            message: `Project title must be less than ${this.maxTextLength.projectTitle} characters`,
            code: 'MAX_LENGTH'
          });
        }
  
        if (project.overview && project.overview.length > this.maxTextLength.projectOverview) {
          errors.push({
            field: `projects[${index}].overview`,
            message: `Project overview must be less than ${this.maxTextLength.projectOverview} characters`,
            code: 'MAX_LENGTH'
          });
        }
  
        // Category validation
        if (!project.category && !project.customCategory) {
          errors.push({
            field: `projects[${index}].category`,
            message: 'Project category is required',
            code: 'REQUIRED'
          });
        }
  
        // Tags validation
        if (project.tags && !Array.isArray(project.tags)) {
          errors.push({
            field: `projects[${index}].tags`,
            message: 'Project tags must be an array',
            code: 'INVALID_TYPE'
          });
        }
      });
  
      return { isValid: errors.length === 0, errors };
    }
  
    validateStylePreferences(stylePreferences) {
      const errors = [];
      
      if (!stylePreferences) {
        return { isValid: true, errors }; // Style preferences are optional
      }
  
      const validColorSchemes = ['monochrome', 'minimal', 'warm', 'cool', 'vibrant', 'earthy', 'pastel'];
      const validLayoutStyles = ['minimal', 'grid', 'masonry', 'magazine', 'asymmetric', 'fullscreen'];
      const validTypography = ['modern', 'classic', 'artistic', 'minimal', 'bold', 'elegant'];
      const validMoods = ['professional', 'creative', 'playful', 'elegant', 'edgy', 'warm', 'minimal'];
  
      if (stylePreferences.colorScheme && !validColorSchemes.includes(stylePreferences.colorScheme)) {
        errors.push({
          field: 'stylePreferences.colorScheme',
          message: `Invalid color scheme. Valid options: ${validColorSchemes.join(', ')}`,
          code: 'INVALID_OPTION'
        });
      }
  
      if (stylePreferences.layoutStyle && !validLayoutStyles.includes(stylePreferences.layoutStyle)) {
        errors.push({
          field: 'stylePreferences.layoutStyle',
          message: `Invalid layout style. Valid options: ${validLayoutStyles.join(', ')}`,
          code: 'INVALID_OPTION'
        });
      }
  
      if (stylePreferences.typography && !validTypography.includes(stylePreferences.typography)) {
        errors.push({
          field: 'stylePreferences.typography',
          message: `Invalid typography. Valid options: ${validTypography.join(', ')}`,
          code: 'INVALID_OPTION'
        });
      }
  
      if (stylePreferences.mood && !validMoods.includes(stylePreferences.mood)) {
        errors.push({
          field: 'stylePreferences.mood',
          message: `Invalid mood. Valid options: ${validMoods.join(', ')}`,
          code: 'INVALID_OPTION'
        });
      }
  
      return { isValid: errors.length === 0, errors };
    }
  
    validateComplete(portfolioData) {
      const allErrors = [];
      let correctedPersonalInfo = portfolioData.personalInfo;
  
      try {
        // Validate personal info
        const personalValidation = this.validatePersonalInfo(portfolioData.personalInfo);
        if (!personalValidation.isValid) {
          allErrors.push(...personalValidation.errors);
        }
        correctedPersonalInfo = personalValidation.correctedData;
  
        // Validate projects
        const projectsValidation = this.validateProjects(portfolioData.projects);
        if (!projectsValidation.isValid) {
          allErrors.push(...projectsValidation.errors);
        }
  
        // Validate style preferences
        const styleValidation = this.validateStylePreferences(portfolioData.stylePreferences);
        if (!styleValidation.isValid) {
          allErrors.push(...styleValidation.errors);
        }
  
      } catch (error) {
        if (error instanceof ValidationError) {
          allErrors.push({
            field: error.field,
            message: error.message,
            code: error.code
          });
        } else {
          allErrors.push({
            field: 'general',
            message: 'Validation error occurred',
            code: 'VALIDATION_ERROR'
          });
        }
      }
  
      return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        correctedData: {
          ...portfolioData,
          personalInfo: correctedPersonalInfo
        }
      };
    }
  
    // File validation helper
    validateFiles(files) {
      const errors = [];
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
      if (!files || typeof files !== 'object') {
        return { isValid: true, errors }; // Files are optional
      }
  
      Object.keys(files).forEach(fieldName => {
        const fileArray = files[fieldName];
        if (Array.isArray(fileArray)) {
          fileArray.forEach((file, index) => {
            if (file.size > maxFileSize) {
              errors.push({
                field: `files.${fieldName}[${index}]`,
                message: `File ${file.originalname} is too large. Maximum size is 10MB`,
                code: 'FILE_TOO_LARGE'
              });
            }
  
            if (!allowedTypes.includes(file.mimetype)) {
              errors.push({
                field: `files.${fieldName}[${index}]`,
                message: `File ${file.originalname} has invalid type. Allowed types: ${allowedTypes.join(', ')}`,
                code: 'INVALID_FILE_TYPE'
              });
            }
          });
        }
      });
  
      return { isValid: errors.length === 0, errors };
    }
  }
  
  // Error formatter for API responses
  class ErrorFormatter {
    static formatValidationErrors(errors) {
      return {
        success: false,
        error: 'Validation Failed',
        details: 'Please check your input data',
        validationErrors: errors.map(error => ({
          field: error.field,
          message: error.message,
          code: error.code
        }))
      };
    }
  
    static formatAPIError(error, isDevelopment = false) {
      const baseResponse = {
        success: false,
        timestamp: new Date().toISOString()
      };
  
      if (error.name === 'ValidationError') {
        return {
          ...baseResponse,
          error: 'Validation Error',
          details: error.message,
          field: error.field,
          code: error.code
        };
      }
  
      if (error.message?.includes('rate limit')) {
        return {
          ...baseResponse,
          error: 'Rate Limit Exceeded',
          details: 'API rate limit exceeded. Please try again later.',
          retryAfter: 60
        };
      }
  
      if (error.message?.includes('API key')) {
        return {
          ...baseResponse,
          error: 'API Configuration Error',
          details: 'Invalid or missing API key'
        };
      }
  
      // Generic error response
      return {
        ...baseResponse,
        error: 'Internal Server Error',
        details: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && { stack: error.stack })
      };
    }
  }
  
  module.exports = {
    PortfolioValidator,
    ValidationError,
    ErrorFormatter
  };