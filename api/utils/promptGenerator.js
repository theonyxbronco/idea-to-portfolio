const fs = require('fs-extra');
const path = require('path');
const { Logger } = require('./logger');

class PromptGenerator {
  constructor() {
    this.logger = new Logger('PromptGenerator');
    this.skeletonsPath = path.join(__dirname, '..', 'api', 'skeletons');
    
    // 🎯 ULTRA-COMPRESSED SYSTEM PROMPT - Maximum efficiency
    this.systemPrompt = `You are an elite portfolio AI. Create custom HTML portfolios matching user aesthetic precisely.

CRITICAL: Response = ONLY HTML. No explanations. Start with <!DOCTYPE html>, end with </html>.`;

    // 🗂️ COMPRESSED SKELETON DEFINITIONS - Structure only, no bloat
    this.skeletonTemplates = {
      'creative-professional': {
        name: 'Creative Professional',
        structure: 'hero-about-projects-skills-contact',
        style: 'glassmorphism + grain texture',
        sections: {
          hero: 'full-height intro + 3 floating shapes',
          about: 'side-by-side + image + story',
          projects: 'expandable timeline',
          skills: 'two-column + animated bars',
          contact: 'multiple methods in cards'
        },
        animations: 'loading fade, floating shapes 12s infinite, project expand, scroll reveals, magnetic buttons',
        interactions: 'smooth scroll, project expand, skill bars animate, magnetic effect',
        technical: 'responsive 768px, a11y, no deps, single HTML'
      },

      'gallery-first': {
        name: 'Photography Gallery',
        structure: 'hero-gallery-about-contact',
        style: 'dark minimal image-focused',
        sections: {
          hero: 'mosaic grid 5 images + central text (3×2 grid, first spans 2 rows)',
          gallery: 'masonry layout + filter tags + hover overlays',
          about: 'centered text + social links',
          contact: 'simple email + availability'
        },
        animations: 'staggered fadeInUp 0.6s, masonry 4cols→1, hover scale(1.05), filter fadeIn, modal scale entry, parallax hero',
        gallery: 'aspectRatios: 3:4,4:5,1:1 rotating, categories: Photography,Digital,Portraits,Abstract, count: 12',
        technical: 'CSS columns, parallax, modal, filter'
      },

      'newspaper': {
        name: 'Editorial Newspaper',
        structure: 'masthead-articles-sidebar',
        style: 'vintage newspaper authentic',
        sections: {
          masthead: 'newspaper header + volume + date + taglines',
          articles: 'portfolio as news stories',
          sidebar: 'stats + quotes + contact + metrics',
          layout: '3 columns (1.5fr 2px 2fr 2px 1.5fr)'
        },
        animations: 'staggered article loading, newspaper lines overlay, hover translateY(-5px), modal slide center, counter animate 0→target, aged paper gradients',
        interactions: 'article expansion, counter trigger, responsive collapse',
        technical: 'multi-column CSS grid, modal, counter animations'
      },

      'storyteller': {
        name: 'Documentary Filmmaker',
        structure: 'hero-chapters-timeline-process-about',
        style: 'cinematic narrative flow',
        sections: {
          hero: 'full-height + filmmaker mission',
          chapters: 'narrative documentary projects',
          timeline: 'impact metrics + recognition',
          process: 'behind-scenes methodology',
          about: 'personal story + contact'
        },
        animations: 'chapter nav fixed right, parallax images, timeline alternating, floating images, metrics counters, video play button, navigation blur backdrop',
        interactions: 'chapter progression, timeline reveals, video modal, metrics animation',
        technical: 'intersection observer, backdrop filters, cinematic treatment'
      }
    };

    // 📊 ULTRA-COMPRESSED DATA PATTERNS - Maximum token efficiency
    this.dataPatterns = {
      // User info - Single letters for maximum compression
      UN: (d) => d.personalInfo?.name || 'Creative Professional',
      UT: (d) => d.personalInfo?.title || 'Designer',
      UE: (d) => d.personalInfo?.email || 'contact@portfolio.com',
      UB: (d) => this.compressBio(d.personalInfo?.bio),
      US: (d) => (d.personalInfo?.skills || []).slice(0, 6).join(','),
      UL: (d) => d.personalInfo?.linkedin || '',
      UI: (d) => d.personalInfo?.instagram || '',
      UP: (d) => d.personalInfo?.phone || '',
      
      // Project info - Compressed arrays
      PC: (d) => (d.projects || []).length,
      PT: (d) => this.compressProjects(d.projects),
      PG: (d) => this.getProjectCategories(d.projects),
      
      // Analysis - Compressed intelligence
      AS: (analysis) => analysis?.analysisLevels?.visualIntelligence?.visualDNA?.category || 'modern',
      AM: (analysis) => analysis?.analysisLevels?.visualIntelligence?.visualDNA?.mood || 'professional',
      AI: (analysis) => analysis?.analysisLevels?.industryIntelligence?.detectedIndustry || 'creative',
      AC: (analysis) => Math.round((analysis?.overallConfidence || 0.5) * 100)
    };
  }

  /**
   * 🚀 MAIN METHOD - Enhanced with full server.js compatibility
   */
  async generateEnhancedAnthropicMessages(portfolioData, projectImages, enhancedAnalysis, moodboardFiles = [], designOptions = {}) {
    const { selectedSkeleton = 'none', customDesignRequest = '' } = designOptions;
    
    this.logger.info(`🚀 V1 Enhanced Prompt Generation: Skeleton=${selectedSkeleton}, Custom=${customDesignRequest ? 'Yes' : 'No'}, Moodboard=${moodboardFiles?.length || 0}, Status=${enhancedAnalysis?.systemStatus || 'None'}`);
    
    // 🔧 FIX: Debug moodboard files structure  
    if (moodboardFiles && moodboardFiles.length > 0) {
      this.logger.info('📋 Moodboard files debug:');
      moodboardFiles.forEach((file, index) => {
        const hasBuffer = !!file.buffer;
        const hasData = !!file.data;
        const mimetype = file.mimetype || file.type || 'unknown';
        const size = file.buffer ? file.buffer.length : (file.data ? file.data.length : 0);
        this.logger.info(`  ${index + 1}. ${file.originalname || 'unnamed'} - ${mimetype} - ${size} bytes - buffer:${hasBuffer} data:${hasData}`);
      });
    }
      
    const compressedData = this.compressPortfolioData(portfolioData, projectImages, enhancedAnalysis);
    
    if (selectedSkeleton !== 'none') {
      return this.generateSkeletonMessages(selectedSkeleton, compressedData, moodboardFiles, customDesignRequest, enhancedAnalysis);
    }
    
    return this.generateCreativeMessages(compressedData, moodboardFiles, customDesignRequest, enhancedAnalysis);
  }

  /**
   * 🗂️ SKELETON MODE - Ultra-compressed with full HTML loading
   */
  async generateSkeletonMessages(skeletonId, compressedData, moodboardFiles, customRequest, enhancedAnalysis) {
    const template = this.skeletonTemplates[skeletonId];
    if (!template) {
      this.logger.warn(`⚠️ Unknown skeleton: ${skeletonId}, falling back to creative mode`);
      return this.generateCreativeMessages(compressedData, moodboardFiles, customRequest, enhancedAnalysis);
    }

    // Try to load actual skeleton HTML file
    let skeletonHTML = null;
    try {
      skeletonHTML = await this.loadSkeletonHTML(skeletonId);
      this.logger.info(`✅ Loaded skeleton HTML: ${skeletonId}`);
    } catch (error) {
      this.logger.warn(`⚠️ Could not load skeleton HTML: ${error.message}`);
    }

    const contentArray = [
      { type: "text", text: this.systemPrompt },
      { type: "text", text: `\n🗂️ SKELETON: ${template.name}` }
    ];

    // Add moodboard images efficiently
    if (moodboardFiles?.length > 0) {
      await this.addMoodboardImages(contentArray, moodboardFiles);
    }

    // Build ultra-compressed skeleton instruction
    if (skeletonHTML) {
      // HTML preprocessing mode
      const processedHTML = this.preprocessSkeletonHTML(skeletonHTML, compressedData);
      contentArray.push({
        type: "text", 
        text: this.buildHTMLCustomizationInstruction(processedHTML, compressedData, customRequest, enhancedAnalysis, moodboardFiles.length > 0)
      });
    } else {
      // Template-based mode (fallback)
      contentArray.push({
        type: "text", 
        text: this.buildCompressedSkeletonInstruction(skeletonId, template, compressedData, customRequest, enhancedAnalysis, moodboardFiles.length > 0)
      });
    }

    return [{ role: "user", content: contentArray }];
  }

  /**
   * 🗃️ HTML PREPROCESSING - Process skeleton HTML with user data
   */
  preprocessSkeletonHTML(skeletonHTML, data) {
    let processedHTML = skeletonHTML;
    const { u: user, p: projects } = data;
    
    // Replace basic user patterns
    const userReplacements = {
      '[USER_NAME]': user.n,
      '[USER_TITLE]': user.t,
      '[USER_EMAIL]': user.e,
      '[USER_BIO]': user.b || this.generateDefaultBio(user.n, user.t),
      '[USER_SKILLS]': user.s.join(', '),
      '[USER_LINKEDIN]': user.l,
      '[USER_INSTAGRAM]': user.i,
      '[USER_PHONE]': user.p
    };

    Object.entries(userReplacements).forEach(([pattern, replacement]) => {
      processedHTML = processedHTML.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement || '');
    });

    // Replace project patterns (up to 8 projects)
    projects.forEach((project, index) => {
      const projectNum = index + 1;
      if (projectNum <= 8) { // Limit to avoid bloat
        const projectReplacements = {
          [`[PROJECT_${projectNum}_TITLE]`]: project.t,
          [`[PROJECT_${projectNum}_CATEGORY]`]: project.c,
          [`[PROJECT_${projectNum}_OVERVIEW]`]: project.d,
          [`[PROJECT_${projectNum}_TAGS]`]: project.tags.join(', ')
        };

        Object.entries(projectReplacements).forEach(([pattern, replacement]) => {
          processedHTML = processedHTML.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement || '');
        });
      }
    });

    return processedHTML;
  }

  /**
   * 🎨 HTML CUSTOMIZATION INSTRUCTION - Ultra-compressed
   */
  buildHTMLCustomizationInstruction(processedHTML, data, customRequest, enhancedAnalysis, hasMoodboard) {
    const { meta } = data;
    
    return `TASK: Customize skeleton HTML with user data + ${hasMoodboard ? 'moodboard aesthetic' : 'professional styling'}

${hasMoodboard ? `🎨 MOODBOARD: Extract ALL colors/typography from images. Apply to CSS variables.` : ''}

${enhancedAnalysis ? `🧠 AI: ${this.dataPatterns.AS(enhancedAnalysis)}+${this.dataPatterns.AM(enhancedAnalysis)} ${this.dataPatterns.AI(enhancedAnalysis)} (${this.dataPatterns.AC(enhancedAnalysis)}%)` : ''}

📊 DATA: ${meta.projectCount} projects, ${meta.imageCount} images

${customRequest ? `🔥 CUSTOM: "${customRequest}" - PRIORITY: HIGH - Apply throughout` : ''}

🚨 SKELETON HTML:
\`\`\`html
${processedHTML}
\`\`\`

CUSTOMIZE:
${hasMoodboard ? '- Replace MOODBOARD_* colors with extracted palette' : '- Apply professional color scheme'}
- Replace [PROJECT_*] with real project data
- No placeholders remain
- Mobile responsive
- ${customRequest ? 'Custom styling integrated' : 'Clean modern design'}`;
  }

  /**
   * 🗂️ COMPRESSED SKELETON INSTRUCTION - Template-based fallback
   */
  buildCompressedSkeletonInstruction(skeletonId, template, compressedData, customRequest, enhancedAnalysis, hasMoodboard) {
    const { u: user, p: projects, meta } = compressedData;
    
    let instruction = `TASK: Build ${template.name} using compressed data
  
  USER: ${user.n} | ${user.t} | ${user.e}
  ${user.b ? `Bio: ${user.b}` : ''}
  Skills: ${user.s.join(', ')}
  
  PROJECTS (${meta.projectCount}):
  ${projects.slice(0, 6).map(p => `${p.i}. ${p.t} [${p.c}] - ${p.d} (${p.imgs.f}F+${p.imgs.p}P)`).join('\n')}
  
  SKELETON: ${template.structure}
  Style: ${template.style}
  Sections: ${Object.entries(template.sections).map(([k,v]) => `${k}:${v}`).join(' | ')}
  Animations: ${template.animations}`;
  
    // Add enhanced analysis insights
    if (enhancedAnalysis) {
      const visual = enhancedAnalysis.analysisLevels?.visualIntelligence;
      const industry = enhancedAnalysis.analysisLevels?.industryIntelligence;
      const content = enhancedAnalysis.analysisLevels?.contentQuality;
      
      instruction += `\n\nAI ANALYSIS (${enhancedAnalysis.systemStatus}):
  Visual DNA: ${visual?.visualDNA?.category || 'modern'} + ${visual?.visualDNA?.mood || 'professional'}
  Industry: ${industry?.detectedIndustry || 'creative'}
  Content Strategy: ${content?.strategy || 'balanced'}`;
  
      if (enhancedAnalysis.skeletonIntegration?.hasInfluence) {
        instruction += `\nSkeleton Integration: Enhanced blend detected`;
      }
  
      if (enhancedAnalysis.customDesignIntegration?.confidence > 0.5) {
        const custom = enhancedAnalysis.customDesignIntegration;
        instruction += `\nCustom Style: ${custom.primaryStyle} detected`;
      }
    }
  
    instruction += `\n\n${hasMoodboard ? 'AESTHETIC: Extract colors/typography from moodboard images' : 'AESTHETIC: Modern professional'}`;
  
    if (customRequest) {
      instruction += `\n\nCUSTOM REQUEST: "${customRequest}" - PRIORITY: HIGH - Apply throughout`;
    }
  
    instruction += `\n\nBUILD: Single HTML with embedded CSS/JS, mobile responsive, professional quality`;
  
    return instruction;
  }

  /**
   * 🎨 CREATIVE MODE - Ultra-compressed
   */
  async generateCreativeMessages(compressedData, moodboardFiles, customRequest, enhancedAnalysis) {
    const contentArray = [
      { type: "text", text: this.systemPrompt },
      { type: "text", text: "\n🎨 CREATIVE MODE" }
    ];

    if (enhancedAnalysis) {
      contentArray.push({
        type: "text",
        text: `🧠 AI: ${this.dataPatterns.AS(enhancedAnalysis)}+${this.dataPatterns.AM(enhancedAnalysis)} ${this.dataPatterns.AI(enhancedAnalysis)} (${this.dataPatterns.AC(enhancedAnalysis)}%)`
      });
    }

    if (moodboardFiles?.length > 0) {
      await this.addMoodboardImages(contentArray, moodboardFiles);
    }

    contentArray.push({
      type: "text",
      text: this.buildCompressedCreativeInstruction(compressedData, customRequest, moodboardFiles.length > 0, enhancedAnalysis)
    });

    return [{ role: "user", content: contentArray }];
  }

  /**
   * 🎨 COMPRESSED CREATIVE INSTRUCTION
   */
  buildCompressedCreativeInstruction(data, customRequest, hasMoodboard, enhancedAnalysis) {
    const { u: user, p: projects, meta } = data;
    
    return `TASK: Custom portfolio

USER: ${user.n} - ${user.t} | ${user.e}
Skills: ${user.s.join(', ')}
${user.b ? `About: ${user.b}` : ''}

PROJECTS (${meta.projectCount}):
${projects.slice(0, 8).map(p => `• ${p.t} [${p.c}] - ${p.d} | ${p.tags.join(' ')}`).join('\n')}

${hasMoodboard ? 'AESTHETIC: Extract colors/style from moodboard images' : 'AESTHETIC: Modern professional'}

${enhancedAnalysis ? `STRATEGY: ${this.dataPatterns.AS(enhancedAnalysis)} + ${this.dataPatterns.AM(enhancedAnalysis)} for ${this.dataPatterns.AI(enhancedAnalysis)}` : ''}

${customRequest ? `CUSTOM: "${customRequest}" - Apply as core design philosophy` : ''}

REQUIREMENTS:
- Single HTML + embedded CSS/JS
- Mobile responsive
- Project galleries with image placeholders
- Contact section
- Professional navigation
- Smooth animations

Create stunning production-ready portfolio`;
  }

/**
 * 🖼️ SAFE MOODBOARD IMAGES - FIXED WITH SHARP PROCESSING
 */
async addMoodboardImages(contentArray, moodboardFiles) {
  if (!moodboardFiles || moodboardFiles.length === 0) {
    this.logger.info('⚠️ No moodboard files provided to prompt generator');
    return;
  }
  
  this.logger.info(`🖼️ Processing ${moodboardFiles.length} moodboard images for Claude Vision...`);
  
  // Add instruction text for moodboard analysis
  contentArray.push({
    type: "text",
    text: `\n🎨 MOODBOARD ANALYSIS (${moodboardFiles.length} images):
Extract EXACT visual DNA from these reference images:
- Color palettes (specific hex codes where visible)
- Typography styles and font characteristics  
- Layout patterns and spacing principles
- Visual mood and aesthetic direction
- Design elements and signature styles

Apply this extracted aesthetic throughout the entire portfolio design.`
  });

  const sharp = require('sharp');
  let processedCount = 0;

  // Process each image with Sharp normalization
  for (const [index, file] of moodboardFiles.entries()) {
    try {
      let imageBuffer;
      
      // Handle different file object structures
      if (file.buffer) {
        imageBuffer = file.buffer;
      } else if (file.data) {
        imageBuffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
      } else {
        this.logger.warn(`⚠️ File ${index + 1} has unknown structure:`, Object.keys(file));
        continue;
      }
      
      if (!imageBuffer || imageBuffer.length === 0) {
        this.logger.warn(`⚠️ File ${index + 1} has empty buffer`);
        continue;
      }

      this.logger.info(`🔍 Processing moodboard image ${index + 1}: ${file.originalname || `image_${index + 1}`}`);

      // Use Sharp to normalize the image (same as ImageParser)
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      if (!metadata.format) {
        this.logger.warn(`⚠️ Could not detect format for image ${index + 1}, skipping`);
        continue;
      }

      // Always convert to JPEG for consistency
      const normalizedBuffer = await image
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      const base64Image = normalizedBuffer.toString('base64');
      
      // Validate base64 data
      if (!base64Image || base64Image.length < 100) {
        this.logger.warn(`⚠️ Image ${index + 1} produced invalid base64`);
        continue;
      }
      
      contentArray.push({
        type: "image",
        source: {
          type: "base64", 
          media_type: "image/jpeg", // Always use JPEG
          data: base64Image
        }
      });
      
      processedCount++;
      const sizeKB = Math.round(normalizedBuffer.length / 1024);
      this.logger.info(`✅ Added moodboard image ${index + 1}: JPEG (${sizeKB}KB)`);
      
      // Limit to 4 images for API efficiency
      if (processedCount >= 4) {
        this.logger.info(`📏 Limiting to 4 images for API efficiency`);
        break;
      }
      
    } catch (error) {
      this.logger.error(`❌ Failed to process moodboard image ${index + 1}:`, error.message);
      continue;
    }
  }
  
  this.logger.info(`✅ Successfully processed ${processedCount} moodboard images for Claude Vision`);
}

/**
 * 🛡️ SAFE ANTHROPIC MESSAGES GENERATION WITH SHARP PROCESSING
 */
async generateEnhancedAnthropicMessagesWithSafeImages(portfolioData, projectImages, enhancedAnalysis, moodboardFiles = [], designOptions = {}) {
  this.logger.info('🛡️ Using safe image processing for Anthropic messages');
  
  const { selectedSkeleton = 'none', customDesignRequest = '' } = designOptions;
  
  try {
    // Use the existing method which now has safe image processing
    return await this.generateEnhancedAnthropicMessages(
      portfolioData, 
      projectImages, 
      enhancedAnalysis, 
      moodboardFiles, 
      designOptions
    );
  } catch (error) {
    this.logger.error('❌ Safe message generation failed:', error);
    
    // Ultimate fallback - text only
    this.logger.info('⚠️ Falling back to text-only prompt');
    
    const compressedData = this.compressPortfolioData(portfolioData, projectImages, enhancedAnalysis);
    
    const fallbackPrompt = `${this.systemPrompt}

USER: ${compressedData.u.n} - ${compressedData.u.t}
EMAIL: ${compressedData.u.e}
SKILLS: ${compressedData.u.s.join(', ')}
${compressedData.u.b ? `BIO: ${compressedData.u.b}` : ''}

PROJECTS (${compressedData.meta.projectCount}):
${compressedData.p.slice(0, 6).map(p => `• ${p.t} [${p.c}] - ${p.d}`).join('\n')}

${selectedSkeleton !== 'none' ? `SKELETON: ${selectedSkeleton}` : 'STYLE: Modern Professional'}
${customDesignRequest ? `CUSTOM: "${customDesignRequest}"` : ''}

BUILD: Complete responsive HTML portfolio with embedded CSS/JS`;

    return [{
      role: 'user',
      content: fallbackPrompt
    }];
  }
}

  /**
   * 🗂️ LOAD SKELETON HTML - File loading capability
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
      throw new Error(`Unknown skeleton: ${selectedSkeleton}`);
    }

    const skeletonPath = path.join(this.skeletonsPath, fileName);
    
    if (await fs.pathExists(skeletonPath)) {
      const html = await fs.readFile(skeletonPath, 'utf8');
      this.logger.info(`✅ Loaded skeleton: ${selectedSkeleton} (${Math.round(html.length / 1024)}KB)`);
      return html;
    } else {
      throw new Error(`Skeleton file not found: ${skeletonPath}`);
    }
  }

  /**
   * 🔧 ULTRA-COMPRESSED DATA PROCESSING
   */
  compressPortfolioData(portfolioData, projectImages, enhancedAnalysis) {
    const projects = projectImages?.projectImages || [];
    
    return {
      u: {
        n: portfolioData.personalInfo?.name || 'Creative Professional',
        t: portfolioData.personalInfo?.title || 'Designer', 
        e: portfolioData.personalInfo?.email || 'contact@portfolio.com',
        b: this.compressBio(portfolioData.personalInfo?.bio),
        s: (portfolioData.personalInfo?.skills || []).slice(0, 6),
        l: portfolioData.personalInfo?.linkedin || '',
        i: portfolioData.personalInfo?.instagram || '',
        p: portfolioData.personalInfo?.phone || ''
      },
      p: this.compressProjectsData(projects),
      intelligence: enhancedAnalysis ? this.compressIntelligence(enhancedAnalysis) : null,
      meta: {
        projectCount: projects.length,
        imageCount: projects.reduce((sum, p) => sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0)
      }
    };
  }

  compressProjectsData(projects) {
    return projects.slice(0, 8).map((p, i) => ({
      i: i + 1,
      t: p.title || `Project ${i + 1}`,
      c: p.category || p.customCategory || 'Creative',
      d: this.compressDescription(p.overview || p.description),
      tags: (p.tags || []).slice(0, 4),
      imgs: {
        f: p.finalImages?.length || 0,
        p: p.processImages?.length || 0
      }
    }));
  }

  compressIntelligence(analysis) {
    const visual = analysis.analysisLevels?.visualIntelligence || {};
    const industry = analysis.analysisLevels?.industryIntelligence || {};
    const content = analysis.analysisLevels?.contentQuality || {};
    
    return {
      style: visual.visualDNA?.category || 'modern',
      mood: visual.visualDNA?.mood || 'professional', 
      industry: industry.detectedIndustry || 'creative',
      strategy: content.strategy || 'balanced',
      confidence: Math.round((analysis.overallConfidence || 0.5) * 100)
    };
  }

  compressBio(bio) {
    if (!bio) return '';
    if (bio.length <= 100) return bio;
    
    const sentences = bio.split(/[.!?]+/).filter(s => s.trim());
    let compressed = sentences[0]?.trim() || '';
    
    if (compressed.length > 100) {
      compressed = compressed.substring(0, 97) + '...';
    }
    
    return compressed;
  }

  compressDescription(desc) {
    if (!desc) return 'Creative project showcasing expertise';
    if (desc.length <= 60) return desc;
    return desc.substring(0, 57) + '...';
  }

  generateDefaultBio(name, title) {
    return `${name || 'I'} am a passionate ${title || 'creative professional'} dedicated to crafting memorable experiences through innovative design and strategic thinking.`;
  }

  getProjectCategories(projects) {
    if (!projects || projects.length === 0) return 'creative work';
    
    const categories = [...new Set(projects.map(p => p.category || p.customCategory).filter(Boolean))];
    
    if (categories.length === 0) return 'creative work';
    if (categories.length <= 2) return categories.join(' & ');
    return categories.slice(0, 2).join(', ') + ` +${categories.length - 2}`;
  }

  /**
   * 🔧 ENHANCED MEDIA TYPE DETECTION
   */
  getMediaType(mimetype) {
    if (!mimetype) return 'image/jpeg';
    
    const types = {
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/png': 'image/png', 
      'image/gif': 'image/gif',
      'image/webp': 'image/webp'
    };
    
    const normalizedType = mimetype.toLowerCase();
    return types[normalizedType] || 'image/jpeg';
  }

  // 🔧 BACKWARD COMPATIBILITY - All existing methods maintained for server.js compatibility

  /**
   * 📄 SKELETON-AWARE MESSAGES - V1 Compatibility
   */
  async generateSkeletonAwareMessages(portfolioData, projectImages, designStyle, designOptions = {}) {
    this.logger.info('🔄 V1 Skeleton-aware generation (compatibility mode)');
    return this.generateEnhancedAnthropicMessages(portfolioData, projectImages, null, [], designOptions);
  }

  /**
   * 📝 STYLED PROMPT - V1 Compatibility
   */
  async generateStyledPrompt(portfolioData, projectImages, designStyle, enhancedAnalysis, designOptions = {}) {
    this.logger.info('🔄 V1 Text prompt generation (compatibility mode)');
    const compressed = this.compressPortfolioData(portfolioData, projectImages, enhancedAnalysis);
    const { selectedSkeleton = 'none', customDesignRequest = '' } = designOptions || {};
    
    if (selectedSkeleton !== 'none') {
      const template = this.skeletonTemplates[selectedSkeleton];
      if (template) {
        return this.buildCompressedSkeletonInstruction(selectedSkeleton, template, compressed, customDesignRequest, enhancedAnalysis, false);
      }
    }
    
    return `${this.systemPrompt}\n\nSTYLE: ${designStyle}\nUSER: ${compressed.u.n} - ${compressed.u.t}\nPROJECTS: ${compressed.meta.projectCount}\n${customDesignRequest ? `CUSTOM: ${customDesignRequest}` : ''}\n\nCreate professional portfolio with ${designStyle} aesthetic.`;
  }

  /**
   * 📬 ANTHROPIC MESSAGES - V1 Compatibility
   */
  async generateAnthropicMessages(portfolioData, projectImages, designStyle = 'modern', analysisResults = null) {
    this.logger.info('🔄 V1 Legacy message generation (compatibility mode)');
    return this.generateEnhancedAnthropicMessages(
      portfolioData,
      projectImages, 
      analysisResults,
      [],
      { selectedSkeleton: 'none' }
    );
  }

  /**
   * 📊 TOKEN ESTIMATION - Utility function
   */
  estimateTokens(data) {
    const text = JSON.stringify(data);
    return Math.ceil(text.length / 4);
  }

  /**
   * 📈 OPTIMIZATION METRICS - Logging utility
   */
  logOptimizationMetrics(originalSize, optimizedSize) {
    const reduction = Math.round(((originalSize - optimizedSize) / originalSize) * 100);
    this.logger.info(`📊 V1 Token optimization: ${originalSize} → ${optimizedSize} (${reduction}% reduction)`);
  }
}

module.exports = PromptGenerator;