const fs = require('fs-extra');
const path = require('path');

class PromptGenerator {
  constructor() {
    this.skeletonsPath = path.join(__dirname, '..', 'api', 'skeletons');
    
    this.systemPrompts = {
      base: `You are an elite AI design system with surgical precision for creating portfolios. You have been provided with multiple intelligence layers that create a complete picture of what the user needs.

CRITICAL PHILOSOPHY: You are not just generating a portfolio - you are creating a design that feels like it was custom-made by an expert who:
1. ✨ Created the moodboard images themselves (perfect aesthetic match)
2. 🎯 Understands exactly what type of content the user has (content strategy)  
3. 🎭 Has deep expertise in the user's specific industry (industry intelligence)
4. 📸 Knows precisely how to showcase each project's story (project intelligence)`,

      responseFormat: `🚨 CRITICAL RESPONSE FORMAT:
- Your response must contain ONLY the HTML code
- NO explanations, comments, or descriptions
- NO markdown code blocks (\`\`\`html)
- NO "Here's your portfolio:" or similar text
- START immediately with <!DOCTYPE html>
- END immediately with </html>
- PURE HTML ONLY - any additional text will break the system`
    };

    // 🆕 SKELETON REPLACEMENT PATTERNS
    this.skeletonPatterns = {
      // Personal Info
      USER_NAME: (data) => data.personalInfo?.name || 'Creative Professional',
      USER_FIRST_NAME: (data) => data.personalInfo?.name?.split(' ')[0] || 'Creative',
      USER_TITLE: (data) => data.personalInfo?.title || 'Designer & Strategist',
      USER_EMAIL: (data) => data.personalInfo?.email || 'contact@portfolio.com',
      USER_PHONE: (data) => data.personalInfo?.phone || '',
      USER_LINKEDIN: (data) => data.personalInfo?.linkedin || '#',
      USER_INSTAGRAM: (data) => data.personalInfo?.instagram || '#',
      
      // Bio sections
      USER_BIO_PARAGRAPH_1: (data) => this.splitBio(data.personalInfo?.bio, 0),
      USER_BIO_PARAGRAPH_2: (data) => this.splitBio(data.personalInfo?.bio, 1),
      USER_BIO_PARAGRAPH_3: (data) => this.splitBio(data.personalInfo?.bio, 2),
      USER_ABOUT_TEXT: (data) => this.formatAboutText(data.personalInfo?.bio, data.personalInfo?.name),
      
      // Skills
      USER_SKILLS_LIST: (data) => this.formatSkillsList(data.personalInfo?.skills),
      USER_TOOLS_LIST: (data) => this.formatToolsList(data.personalInfo?.skills),
      
      // Portfolio description
      PORTFOLIO_DESCRIPTION: (data) => this.generatePortfolioDescription(data.projects),
      
      // Gallery-specific patterns
      FILTER_CATEGORIES: (data) => this.generateFilterCategories(data.projects),
      PROJECT_DATA_JSON: (data) => this.generateProjectDataJSON(data.projects),
      
      // Hero images (for gallery-first)
      HERO_IMAGE_1: (data) => this.getHeroImage(data.projects, 0),
      HERO_IMAGE_2: (data) => this.getHeroImage(data.projects, 1),
      HERO_IMAGE_3: (data) => this.getHeroImage(data.projects, 2),
      HERO_IMAGE_4: (data) => this.getHeroImage(data.projects, 3),
      HERO_IMAGE_5: (data) => this.getHeroImage(data.projects, 4),
      
      // Contact
      CONTACT_INTRO_TEXT: (data) => `Ready to bring your vision to life? I'm ${data.personalInfo?.name || 'always'} excited to collaborate on meaningful projects that make a difference.`,
      CONTACT_AVAILABILITY_TEXT: (data) => 'Available for commissions, collaborations, and creative projects',
      FOOTER_TEXT: (data) => 'Crafted with passion and attention to detail.',
      
      // Skills section
      SKILLS_SECTION_TITLE: (data) => 'Creative Excellence',
      SKILLS_DESCRIPTION: (data) => `My toolkit spans traditional design principles to cutting-edge digital technologies, always focused on creating meaningful connections between brands and their audiences.`
    };

    // 🎨 MOODBOARD COLOR EXTRACTION PATTERNS
    this.moodboardColorPatterns = {
      MOODBOARD_PRIMARY_COLOR: 'background',
      MOODBOARD_SECONDARY_COLOR: 'secondary backgrounds',
      MOODBOARD_TEXT_COLOR: 'primary text',
      MOODBOARD_ACCENT_COLOR: 'accent and hover states',
      MOODBOARD_CTA_COLOR: 'call-to-action buttons',
      MOODBOARD_GRADIENT: 'gradient overlays',
      MOODBOARD_CARD_BG: 'card backgrounds',
      MOODBOARD_PROJECT_GRADIENT: 'project image overlays'
    };
  }

  /**
   * 🎯 MAIN METHOD: Generate messages for Claude with enhanced skeleton support
   */
  async generateEnhancedAnthropicMessages(portfolioData, projectImages, insaneAnalysis, moodboardFiles = [], designOptions = {}) {
    const { selectedSkeleton = 'none', customDesignRequest = '' } = designOptions;
    
    console.log(`🚀 Generating prompt - Skeleton: ${selectedSkeleton}, Custom Request: ${customDesignRequest ? 'Yes' : 'No'}`);
    
    // SKELETON MODE: Load and customize existing HTML
    if (selectedSkeleton !== 'none') {
      const skeletonHTML = await this.loadSkeletonHTML(selectedSkeleton);
      if (skeletonHTML) {
        return this.generateSkeletonMessages(skeletonHTML, portfolioData, projectImages, moodboardFiles, customDesignRequest, insaneAnalysis);
      }
    }

    // CREATIVE MODE: Build from scratch with INSANE analysis
    return this.generateCreativeMessages(portfolioData, projectImages, insaneAnalysis, moodboardFiles, customDesignRequest);
  }

  /**
   * 🗂️ ENHANCED SKELETON MODE: Comprehensive customization with moodboard integration
   */
  async generateSkeletonMessages(skeletonHTML, portfolioData, projectImages, moodboardFiles, customDesignRequest, insaneAnalysis) {
    const contentArray = [
      { type: "text", text: this.systemPrompts.base },
      { type: "text", text: "\n🗂️ SKELETON CUSTOMIZATION MODE - ENHANCED" }
    ];

    // Add moodboard images for color extraction
    if (moodboardFiles?.length > 0) {
      await this.addMoodboardImagesToContent(contentArray, moodboardFiles);
    }

    // Pre-process skeleton with user data
    const processedSkeleton = this.preprocessSkeleton(skeletonHTML, portfolioData, projectImages);

    // Main customization instructions
    contentArray.push({
      type: "text",
      text: this.buildEnhancedSkeletonInstructions(processedSkeleton, portfolioData, projectImages, customDesignRequest, insaneAnalysis, moodboardFiles.length > 0)
    });

    contentArray.push({ type: "text", text: this.systemPrompts.responseFormat });

    return [{ role: "user", content: contentArray }];
  }

  /**
   * 🔄 PRE-PROCESS SKELETON: Replace basic placeholders with user data
   */
  preprocessSkeleton(skeletonHTML, portfolioData, projectImages) {
    let processedHTML = skeletonHTML;
    
    // Replace basic user info patterns
    Object.entries(this.skeletonPatterns).forEach(([pattern, processor]) => {
      const placeholder = `[${pattern}]`;
      if (processedHTML.includes(placeholder)) {
        const replacement = processor(portfolioData) || placeholder;
        processedHTML = processedHTML.replace(new RegExp(`\\[${pattern}\\]`, 'g'), replacement);
      }
    });

    // Replace project-specific data
    processedHTML = this.replaceProjectData(processedHTML, projectImages);

    return processedHTML;
  }

  /**
   * 📂 REPLACE PROJECT DATA: Dynamic project insertion with gallery support
   */
  replaceProjectData(html, projectImages) {
    let processedHTML = html;
    const projects = projectImages?.projectImages || [];

    projects.forEach((project, index) => {
      const projectNum = index + 1;
      
      // Basic project info
      processedHTML = processedHTML.replace(new RegExp(`\\[PROJECT_${projectNum}_TITLE\\]`, 'g'), 
        project.title || `Project ${projectNum}`);
      processedHTML = processedHTML.replace(new RegExp(`\\[PROJECT_${projectNum}_CATEGORY\\]`, 'g'), 
        project.category || project.customCategory || 'Creative Work');
      processedHTML = processedHTML.replace(new RegExp(`\\[PROJECT_${projectNum}_OVERVIEW\\]`, 'g'), 
        project.overview || project.description || 'Innovative project showcasing creative expertise');
      
      // Gallery-specific patterns
      processedHTML = processedHTML.replace(new RegExp(`\\[PROJECT_${projectNum}_CATEGORY_FILTER\\]`, 'g'), 
        this.formatCategoryForFilter(project.category || project.customCategory));
      processedHTML = processedHTML.replace(new RegExp(`\\[PROJECT_${projectNum}_DATE\\]`, 'g'), 
        this.formatProjectDate(project.createdAt));

      // Project images
      if (project.finalImages?.length > 0) {
        project.finalImages.forEach((img, imgIndex) => {
          processedHTML = processedHTML.replace(new RegExp(`\\[PROJECT_${projectNum}_FINAL_IMAGE_${imgIndex + 1}\\]`, 'g'), 
            img.url || '');
        });
      }

      if (project.processImages?.length > 0) {
        project.processImages.forEach((img, imgIndex) => {
          processedHTML = processedHTML.replace(new RegExp(`\\[PROJECT_${projectNum}_PROCESS_IMAGE_${imgIndex + 1}\\]`, 'g'), 
            img.url || '');
        });
      }

      // Project tags
      const tagsHTML = project.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || 
        '<span class="tag">design</span><span class="tag">creative</span>';
      processedHTML = processedHTML.replace(new RegExp(`\\[PROJECT_${projectNum}_TAGS\\]`, 'g'), tagsHTML);
    });

    return processedHTML;
  }

  /**
   * 🎨 BUILD ENHANCED SKELETON INSTRUCTIONS: Comprehensive customization guide
   */
  buildEnhancedSkeletonInstructions(processedSkeleton, portfolioData, projectImages, customDesignRequest, insaneAnalysis, hasMoodboard) {
    const projects = projectImages?.projectImages || [];
    const totalImages = projects.reduce((sum, p) => 
      sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0);

    const moodboardAnalysis = insaneAnalysis?.analysisLevels?.visualIntelligence || {};
    const industryInsights = insaneAnalysis?.analysisLevels?.industryIntelligence || {};

    return `
🎯 ENHANCED SKELETON CUSTOMIZATION TASK:

${hasMoodboard ? `🎨 MOODBOARD COLOR EXTRACTION CRITICAL:
You have been provided with moodboard images. Extract the EXACT color palette and apply it to ALL color variables in the CSS.

REPLACE THESE COLOR PATTERNS WITH MOODBOARD COLORS:
• MOODBOARD_PRIMARY_COLOR → Main background color from moodboard
• MOODBOARD_SECONDARY_COLOR → Secondary/accent background from moodboard  
• MOODBOARD_TEXT_COLOR → Primary text color that works with moodboard
• MOODBOARD_ACCENT_COLOR → Accent color for hovers/highlights from moodboard
• MOODBOARD_CTA_COLOR → Bold color for call-to-action buttons from moodboard
• MOODBOARD_GRADIENT → Create gradients using moodboard color palette
• All other MOODBOARD_* variables → Match the aesthetic perfectly

CRITICAL: The final result must look like it was designed specifically for these moodboard images.` : ''}

${insaneAnalysis ? `🧠 INTELLIGENCE INTEGRATION:
• Visual Style: ${moodboardAnalysis.visualDNA?.category || 'modern'} ${moodboardAnalysis.visualDNA?.mood || 'aesthetic'}
• Industry Focus: ${industryInsights.detectedIndustry || 'creative professional'}
• Content Strategy: ${insaneAnalysis.analysisLevels?.contentQuality?.strategy || 'balanced'}
• Confidence: ${Math.round((insaneAnalysis.overallConfidence || 0.5) * 100)}% AI analysis` : ''}

📊 USER DATA INTEGRATION STATUS:
✅ Name: ${portfolioData.personalInfo?.name || 'NEEDS_REPLACEMENT'}
✅ Title: ${portfolioData.personalInfo?.title || 'NEEDS_REPLACEMENT'}  
✅ Email: ${portfolioData.personalInfo?.email || 'NEEDS_REPLACEMENT'}
✅ Bio: ${portfolioData.personalInfo?.bio ? 'PROVIDED' : 'NEEDS_CREATIVE_BIO'}
✅ Skills: ${portfolioData.personalInfo?.skills?.length || 0} skills provided
✅ Projects: ${projects.length} projects with ${totalImages} total images

${customDesignRequest ? `🔥 CUSTOM STYLING REQUEST: "${customDesignRequest}"
- PRIORITY: HIGH - This request should be the primary design philosophy
- Integration: Apply this styling throughout while maintaining skeleton structure
- Creative interpretation: Go beyond literal implementation` : ''}

🚨 SKELETON CUSTOMIZATION RULES:

1. **COMPLETE COLOR REPLACEMENT**: 
   ${hasMoodboard ? 'Extract and apply moodboard colors to EVERY MOODBOARD_* variable' : 'Create a cohesive color scheme based on user industry/style preferences'}

2. **PROJECT IMAGE INTEGRATION**:
   - Replace [PROJECT_*_FINAL_IMAGE_*] with actual project image URLs
   - Replace [PROJECT_*_PROCESS_IMAGE_*] with actual process image URLs  
   - Ensure all images are properly referenced in background-image styles

3. **DYNAMIC PROJECT SECTIONS**:
   - If user has fewer than 3 projects, remove unused PROJECT_*_START to PROJECT_*_END sections
   - If user has more than 3 projects, duplicate the project template section
   - Each project should showcase its unique images and content

4. **CONTENT PERSONALIZATION**:
   - Replace all [USER_*] placeholders with actual user data
   - Create compelling bio paragraphs if user bio is short
   - Generate relevant skills lists based on user's background

5. **RESPONSIVE & MODERN**:
   - Ensure mobile-first design approach
   - Maintain smooth animations and interactions
   - Keep professional aesthetic with personality

6. **FINAL QUALITY CHECKS**:
   - No placeholder text should remain
   - All images should have proper URLs or elegant fallbacks
   - Color scheme should be cohesive and professional
   - Typography should match the overall aesthetic

SKELETON HTML TO CUSTOMIZE:
\`\`\`html
${processedSkeleton}
\`\`\`

Return the fully customized, production-ready HTML with:
${hasMoodboard ? '- Moodboard colors applied throughout' : '- Professional color scheme'}
- All user data properly integrated  
- Real project images and content
- ${customDesignRequest ? 'Custom styling request implemented' : 'Clean, modern design'}
- No placeholder text remaining`;
  }

  /**
   * 🎨 CREATIVE MODE: Build completely custom portfolio with INSANE analysis
   */
  async generateCreativeMessages(portfolioData, projectImages, insaneAnalysis, moodboardFiles, customDesignRequest) {
    const contentArray = [
      { type: "text", text: this.systemPrompts.base }
    ];

    // Add INSANE analysis if available
    if (insaneAnalysis) {
      contentArray.push({
        type: "text",
        text: this.generateIntelligenceSummary(insaneAnalysis, customDesignRequest)
      });

      if (insaneAnalysis.intelligentPrompt) {
        contentArray.push({
          type: "text",
          text: insaneAnalysis.intelligentPrompt.assembledPrompt
        });
      }
    }

    // Add moodboard images if available
    if (moodboardFiles?.length > 0) {
      await this.addMoodboardImagesToContent(contentArray, moodboardFiles);
    }

    // Add user data and instructions
    contentArray.push({
      type: "text",
      text: this.buildCreativeInstructions(portfolioData, projectImages, insaneAnalysis, customDesignRequest)
    });

    contentArray.push({ type: "text", text: this.systemPrompts.responseFormat });

    return [{ role: "user", content: contentArray }];
  }

  /**
   * 🖼️ Add moodboard images to content array
   */
  async addMoodboardImagesToContent(contentArray, moodboardFiles) {
    if (!moodboardFiles || moodboardFiles.length === 0) return;

    console.log(`🖼️ Adding ${moodboardFiles.length} moodboard images...`);
    
    contentArray.push({
      type: "text",
      text: `\n🎨 MOODBOARD ANALYSIS INSTRUCTIONS:
I'm providing ${moodboardFiles.length} moodboard images representing the EXACT aesthetic the portfolio must match.

CRITICAL ANALYSIS TASKS:
1. Extract precise design patterns, color schemes, and typography  
2. Identify layout principles and navigation styles
3. Find distinctive visual elements that make this style unique
4. Determine how to authentically recreate this aesthetic`
    });

    for (const [index, file] of moodboardFiles.entries()) {
      try {
        const base64Image = file.buffer.toString('base64');
        const mediaType = this.getMediaTypeFromMimetype(file.mimetype);
        
        contentArray.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64Image
          }
        });
      } catch (error) {
        console.warn(`⚠️ Failed to load moodboard image ${index + 1}:`, error.message);
      }
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */
  
  splitBio(bio, paragraphIndex) {
    if (!bio) {
      const defaultBios = [
        "I'm a passionate creative professional with years of experience crafting memorable experiences that connect with audiences on an emotional level.",
        "My approach combines strategic thinking with beautiful aesthetics, ensuring every project not only looks stunning but also drives real business results.",
        "When I'm not designing, you'll find me exploring new creative techniques, collaborating with fellow artists, and pushing the boundaries of what's possible."
      ];
      return defaultBios[paragraphIndex] || '';
    }

    const sentences = bio.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentencesPerParagraph = Math.ceil(sentences.length / 3);
    const start = paragraphIndex * sentencesPerParagraph;
    const end = start + sentencesPerParagraph;
    
    return sentences.slice(start, end).join('. ').trim() + (sentences.slice(start, end).length > 0 ? '.' : '');
  }

  formatAboutText(bio, name) {
    if (bio && bio.length > 100) return bio;
    
    const defaultAbout = `I'm a visual storyteller ${name ? `named ${name.split(' ')[0]} ` : ''}passionate about capturing authentic moments and creating compelling narratives through my work. With years of experience behind the lens, I specialize in bringing creative visions to life through thoughtful composition, lighting, and post-production techniques. My work explores the intersection of emotion and artistry, always seeking to tell stories that resonate with viewers on a deeper level.`;
    
    return bio || defaultAbout;
  }

  generatePortfolioDescription(projects) {
    if (!projects || projects.length === 0) {
      return 'A curated collection of creative work spanning visual storytelling, design, and artistic exploration.';
    }
    
    const categories = this.getProjectCategories(projects);
    return `A curated collection of recent projects spanning ${categories}. Each piece explores the delicate balance between creativity, technique, and authentic storytelling.`;
  }

  generateFilterCategories(projects) {
    if (!projects || projects.length === 0) {
      return '<div class="filter-tag" data-filter="creative">Creative</div><div class="filter-tag" data-filter="design">Design</div>';
    }
    
    const categories = [...new Set(projects.map(p => 
      this.formatCategoryForFilter(p.category || p.customCategory)
    ))].filter(Boolean);
    
    return categories.map(cat => 
      `<div class="filter-tag" data-filter="${cat}">${this.formatCategoryForDisplay(cat)}</div>`
    ).join('');
  }

  generateProjectDataJSON(projects) {
    if (!projects || projects.length === 0) return '{}';
    
    const projectData = {};
    projects.forEach((project, index) => {
      const key = this.formatProjectKey(project.title, index);
      projectData[key] = {
        title: project.title || `Project ${index + 1}`,
        subtitle: project.subtitle || 'Creative exploration',
        category: project.category || project.customCategory || 'Creative Work',
        overview: project.overview || project.description || 'Innovative project showcasing creative expertise',
        tags: project.tags || ['design', 'creative'],
        date: this.formatProjectDate(project.createdAt),
        image: project.finalImages?.[0]?.url || '',
        finalImages: project.finalImages || [],
        processImages: project.processImages || []
      };
    });
    
    // Return valid JavaScript object literal without outer braces
    return JSON.stringify(projectData, null, 2);
  }

  getHeroImage(projects, index) {
    if (!projects || projects.length === 0) return '';
    
    const project = projects[index % projects.length];
    return project?.finalImages?.[0]?.url || project?.processImages?.[0]?.url || '';
  }

  formatCategoryForFilter(category) {
    if (!category) return 'creative';
    return category.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  formatCategoryForDisplay(filterCategory) {
    return filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1);
  }

  formatProjectKey(title, index) {
    if (!title) return `project-${index + 1}`;
    return title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }

  formatProjectDate(dateString) {
    if (!dateString) return new Date().getFullYear().toString();
    
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return new Date().getFullYear().toString();
    }
  }

  formatSkillsList(skills) {
    if (!skills || !Array.isArray(skills)) return '<li>Creative Design</li><li>Strategy</li><li>Innovation</li>';
    
    return skills.slice(0, 4).map(skill => 
      `<li class="skill-item">
        <span>${skill}</span>
        <div class="skill-level" style="--skill-width: ${85 + Math.random() * 15}%"></div>
      </li>`
    ).join('');
  }

  formatToolsList(skills) {
    // Extract tool-like skills or create default ones
    const toolSkills = skills?.filter(skill => 
      skill.toLowerCase().includes('adobe') || 
      skill.toLowerCase().includes('figma') ||
      skill.toLowerCase().includes('sketch') ||
      skill.toLowerCase().includes('photo')
    ) || ['Adobe Creative Suite', 'Figma', 'Photography', 'Digital Design'];

    return toolSkills.slice(0, 4).map(tool => 
      `<li class="skill-item">
        <span>${tool}</span>
        <div class="skill-level" style="--skill-width: ${80 + Math.random() * 20}%"></div>
      </li>`
    ).join('');
  }

  getProjectCategories(projects) {
    if (!projects || projects.length === 0) return 'creative work';
    
    const categories = projects.map(p => p.category || p.customCategory).filter(Boolean);
    const uniqueCategories = [...new Set(categories)];
    
    if (uniqueCategories.length === 0) return 'creative work';
    if (uniqueCategories.length === 1) return uniqueCategories[0];
    if (uniqueCategories.length === 2) return uniqueCategories.join(' and ');
    
    return uniqueCategories.slice(0, -1).join(', ') + ', and ' + uniqueCategories.slice(-1);
  }

  /**
   * 🧠 Generate intelligence summary with custom request integration
   */
  generateIntelligenceSummary(insaneAnalysis, customDesignRequest = '') {
    const visual = insaneAnalysis.analysisLevels?.visualIntelligence || {};
    const content = insaneAnalysis.analysisLevels?.contentQuality || {};
    const industry = insaneAnalysis.analysisLevels?.industryIntelligence || {};

    return `
🧠 INTELLIGENCE ANALYSIS SUMMARY:

🎨 VISUAL INTELLIGENCE (${Math.round((visual.confidence || 0) * 100)}% confidence):
- Style: ${visual.visualDNA?.category || 'modern'} ${visual.visualDNA?.mood || 'aesthetic'}
- Colors: ${visual.colors?.palette?.join(', ') || 'Balanced palette'}
- Typography: ${visual.typography?.category || 'sans-serif'} fonts
- Layout: ${visual.layout?.grid || 'standard'} grid

📝 CONTENT STRATEGY (${Math.round((content.confidence || 0) * 100)}% confidence):
- Approach: ${content.strategy || 'balanced'}
- Focus: ${content.recommendations?.join(' | ') || 'Professional presentation'}

🎭 INDUSTRY INTELLIGENCE (${Math.round((industry.confidence || 0) * 100)}% confidence):
- Industry: ${industry.detectedIndustry || 'creative professional'}
- Portfolio Focus: ${industry.portfolioFocus || 'balanced showcase'}

${customDesignRequest ? `🔥 CUSTOM DESIGN INTEGRATION: "${customDesignRequest}"
- Implementation: Blend this request seamlessly with intelligence analysis
- Priority: High - this custom request should feel like a core design principle` : ''}`;
  }

  /**
   * 🎨 Build creative mode instructions
   */
  buildCreativeInstructions(portfolioData, projectImages, insaneAnalysis, customDesignRequest) {
    const projects = projectImages?.projectImages || [];
    const totalImages = projects.reduce((sum, p) => 
      sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0);
    const strategy = insaneAnalysis?.analysisLevels?.contentQuality?.strategy || 'design-focused';

    return `
🎯 CREATIVE PORTFOLIO TASK:

📊 USER PROFILE:
• Name: ${portfolioData.personalInfo.name}
• Title: ${portfolioData.personalInfo.title}
• Industry: ${insaneAnalysis?.analysisLevels?.industryIntelligence?.detectedIndustry || 'Creative'}
• Bio: "${portfolioData.personalInfo.bio || 'Passionate creative professional'}"
• Contact: ${portfolioData.personalInfo.email || 'contact@portfolio.com'}
• Social: ${this.formatSocialLinks(portfolioData.personalInfo)}
• Skills: ${portfolioData.personalInfo.skills?.join(', ') || 'Creative Design'}

📝 PROJECTS (${projects.length} projects, ${totalImages} images):
${projects.length > 0 ? projects.map((project, i) => this.formatProjectWithImages(project, i + 1)).join('\n') : 'Create compelling sample projects that match the user\'s industry and aesthetic'}

🎯 CONTENT STRATEGY: ${this.getStrategyDescription(strategy)}

${customDesignRequest ? `🔥 CUSTOM DESIGN REQUEST: "${customDesignRequest}"
- Integration: Make this the core design philosophy driving all aesthetic decisions` : ''}

🚨 DESIGN REQUIREMENTS:
1. Match moodboard aesthetic exactly
2. Create unique layout based on intelligence analysis
3. Showcase projects with proper image integration
4. Mobile-responsive design (mobile-first approach)
5. Modern CSS (Grid, Flexbox, smooth animations)
6. Professional and premium feel
7. Fast loading with embedded styles and scripts
8. Accessibility standards (ARIA, semantic HTML)

🎯 SUCCESS CRITERIA:
Create a portfolio that looks expertly crafted and perfectly tailored to this user's needs, industry, and aesthetic preferences.`;
  }

  /**
   * 📝 Format project with image details (for creative mode)
   */
  formatProjectWithImages(project, index) {
    const finalCount = project.finalImages?.length || 0;
    const processCount = project.processImages?.length || 0;
    
    let projectText = `\n┌─── PROJECT ${index}: "${project.title}" ───┐
• Category: ${project.category || project.customCategory || 'Creative Work'}
• Overview: ${project.overview || project.description || 'Innovative project showcasing creative expertise'}
• Tags: ${project.tags?.join(', ') || 'design, creative'}
• Images: ${finalCount} final + ${processCount} process`;

    if (finalCount > 0) {
      projectText += `\n  Final Images:`;
      project.finalImages.slice(0, 2).forEach((img, i) => {
        projectText += `\n    ${i + 1}. ${img.url}`;
      });
      if (finalCount > 2) projectText += `\n    ... and ${finalCount - 2} more final images`;
    }

    if (processCount > 0) {
      projectText += `\n  Process Images:`;
      project.processImages.slice(0, 2).forEach((img, i) => {
        projectText += `\n    ${i + 1}. ${img.url}`;
      });
      if (processCount > 2) projectText += `\n    ... and ${processCount - 2} more process images`;
    }

    return projectText + '\n└─────────────────────────────────────┘';
  }

  /**
   * 🔗 Format social links
   */
  formatSocialLinks(personalInfo) {
    const links = [
      personalInfo.linkedin && `LinkedIn: ${personalInfo.linkedin}`,
      personalInfo.instagram && `Instagram: ${personalInfo.instagram}`,
      personalInfo.behance && `Behance: ${personalInfo.behance}`,
      personalInfo.dribbble && `Dribbble: ${personalInfo.dribbble}`,
      personalInfo.website && `Website: ${personalInfo.website}`
    ].filter(Boolean);
    
    return links.length > 0 ? links.join(' | ') : 'No social links provided';
  }

  /**
   * 📋 Get strategy description
   */
  getStrategyDescription(strategy) {
    const strategyTemplates = {
      'showcase-heavy': 'Detailed project storytelling with rich case studies',
      'visual-first': 'Images as primary storytelling device',
      'story-driven': 'Narrative-based project presentation',
      'design-focused': 'Aesthetic execution matching moodboard precisely'
    };
    
    return strategyTemplates[strategy] || 'Balanced presentation showcasing creativity and professionalism';
  }

  /**
   * 📂 Load skeleton HTML file
   */
  async loadSkeletonHTML(selectedSkeleton) {
    const skeletonFiles = {
      'creative-professional': 'creative-professional.html',
      'gallery-first': 'gallery-first.html',
      'newspaper': 'newspaper.html',
      'storyteller': 'storyteller.html'
    };

    const fileName = skeletonFiles[selectedSkeleton];
    if (!fileName) {
      console.warn(`⚠️ Unknown skeleton: ${selectedSkeleton}`);
      return null;
    }

    const skeletonPath = path.join(this.skeletonsPath, fileName);
    
    try {
      if (await fs.pathExists(skeletonPath)) {
        const html = await fs.readFile(skeletonPath, 'utf8');
        console.log(`✅ Loaded skeleton: ${selectedSkeleton} (${Math.round(html.length / 1024)}KB)`);
        return html;
      } else {
        console.warn(`⚠️ Skeleton file not found: ${skeletonPath}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error loading skeleton ${selectedSkeleton}:`, error.message);
      return null;
    }
  }

  /**
   * 🔧 Utility methods
   */
  getMediaTypeFromMimetype(mimetype) {
    const types = {
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg', 
      'image/png': 'image/png',
      'image/gif': 'image/gif',
      'image/webp': 'image/webp'
    };
    return types[mimetype] || 'image/jpeg';
  }

  /**
   * 🔧 FALLBACK METHODS for backward compatibility
   */
  async generateSkeletonAwareMessages(portfolioData, projectImages, designStyle, designOptions = {}) {
    console.log('⚠️ Using fallback skeleton-aware generation');
    return this.generateEnhancedAnthropicMessages(portfolioData, projectImages, null, [], designOptions);
  }

  async generateStyledPrompt(portfolioData, projectImages, designStyle, insaneAnalysis, designOptions = {}) {
    console.log('⚠️ Using legacy text-only prompt');
    
    const { selectedSkeleton = 'none', customDesignRequest = '' } = designOptions || {};
    
    if (selectedSkeleton !== 'none') {
      const skeletonHTML = await this.loadSkeletonHTML(selectedSkeleton);
      if (skeletonHTML) {
        const processedSkeleton = this.preprocessSkeleton(skeletonHTML, portfolioData, projectImages);
        return this.buildEnhancedSkeletonInstructions(processedSkeleton, portfolioData, projectImages, customDesignRequest, insaneAnalysis, false);
      }
    }

    const projects = projectImages?.projectImages || [];
    return `${this.systemPrompts.base}

🎨 DESIGN STYLE: ${designStyle}
📊 USER: ${portfolioData.personalInfo.name} - ${portfolioData.personalInfo.title}
📝 PROJECTS: ${projects.length} projects available
${customDesignRequest ? `🔥 CUSTOM REQUEST: "${customDesignRequest}"` : ''}

Create a professional portfolio showcasing the user's work with a ${designStyle} design approach.

${this.systemPrompts.responseFormat}`;
  }

  async generateAnthropicMessages(portfolioData, projectImages, designStyle = 'modern', analysisResults = null) {
    console.log('⚠️ Using legacy message generation');
    return this.generateEnhancedAnthropicMessages(
      portfolioData, 
      projectImages, 
      analysisResults, 
      [], 
      { selectedSkeleton: 'none' }
    );
  }
}

module.exports = PromptGenerator;