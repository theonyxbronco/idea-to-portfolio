read these two versions one is meant to be "optimized but keeping functionality" what do we think:
const fs = require('fs-extra');
const path = require('path');

class PromptGenerator {
  constructor() {
    this.skeletonsPath = path.join(__dirname, '..', 'api', 'skeletons');
    
    // 🎯 CORE SYSTEM PROMPT - Compressed but complete
    this.systemPrompt = `You are an elite portfolio AI. Create custom HTML portfolios matching user aesthetic precisely.

CRITICAL: Response = ONLY HTML. No explanations. Start with <!DOCTYPE html>, end with </html>.`;

    // 🏗️ SKELETON TEMPLATES - Reference by ID, not full HTML
    this.skeletonTemplates = {
      'creative-professional': {
        structure: 'hero-about-portfolio-contact',
        style: 'modern-minimal',
        features: ['smooth-scroll', 'image-gallery', 'contact-form']
      },
      'gallery-first': {
        structure: 'hero-gallery-about-contact', 
        style: 'image-focused',
        features: ['masonry-grid', 'lightbox', 'filter-tabs']
      },
      'newspaper': {
        structure: 'header-columns-sidebar',
        style: 'editorial',
        features: ['text-heavy', 'multi-column', 'typography-focus']
      },
      'storyteller': {
        structure: 'narrative-flow',
        style: 'story-driven',
        features: ['scroll-narrative', 'timeline', 'process-showcase']
      }
    };

    // 🎨 COMPRESSED PATTERN SYSTEM
    this.dataPatterns = {
      // Basic user info (U = User)
      UN: (d) => d.personalInfo?.name || 'Creative Professional',
      UT: (d) => d.personalInfo?.title || 'Designer',
      UE: (d) => d.personalInfo?.email || 'contact@portfolio.com',
      UB: (d) => this.compressBio(d.personalInfo?.bio),
      US: (d) => (d.personalInfo?.skills || []).slice(0, 6).join(','),
      
      // Contact info (C = Contact)
      CL: (d) => d.personalInfo?.linkedin || '',
      CI: (d) => d.personalInfo?.instagram || '',
      CP: (d) => d.personalInfo?.phone || '',
      
      // Projects summary (P = Projects)
      PC: (d) => (d.projects || []).length,
      PT: (d) => this.compressProjects(d.projects),
      PG: (d) => this.getProjectCategories(d.projects)
    };
  }

  /**
   * 🎯 MAIN METHOD - Dramatically optimized
   */
  async generateEnhancedAnthropicMessages(portfolioData, projectImages, insaneAnalysis, moodboardFiles = [], designOptions = {}) {
    const { selectedSkeleton = 'none', customDesignRequest = '' } = designOptions;
    
    console.log(`🚀 Optimized generation - Skeleton: ${selectedSkeleton}`);
    
    // 📊 COMPRESSED DATA EXTRACTION
    const compressedData = this.compressPortfolioData(portfolioData, projectImages, insaneAnalysis);
    
    if (selectedSkeleton !== 'none') {
      return this.generateSkeletonMessages(selectedSkeleton, compressedData, moodboardFiles, customDesignRequest);
    }
    
    return this.generateCreativeMessages(compressedData, moodboardFiles, customDesignRequest);
  }

  /**
   * 🗂️ SKELETON MODE - 70% token reduction
   */
  async generateSkeletonMessages(skeletonId, compressedData, moodboardFiles, customRequest) {
    const template = this.skeletonTemplates[skeletonId];
    if (!template) {
      console.warn(`⚠️ Unknown skeleton: ${skeletonId}, falling back to creative mode`);
      return this.generateCreativeMessages(compressedData, moodboardFiles, customRequest);
    }

    const contentArray = [
      { type: "text", text: this.systemPrompt },
      { type: "text", text: `\n🗂️ SKELETON: ${skeletonId}` }
    ];

    // Add moodboard images efficiently
    if (moodboardFiles?.length > 0) {
      await this.addMoodboardImages(contentArray, moodboardFiles);
    }

    // Build ultra-compressed skeleton instruction
    contentArray.push({
      type: "text", 
      text: this.buildSkeletonInstruction(skeletonId, template, compressedData, customRequest, moodboardFiles.length > 0)
    });

    return [{ role: "user", content: contentArray }];
  }

  /**
   * 🎨 CREATIVE MODE - 60% token reduction
   */
  async generateCreativeMessages(compressedData, moodboardFiles, customRequest) {
    const contentArray = [
      { type: "text", text: this.systemPrompt },
      { type: "text", text: "\n🎨 CREATIVE MODE" }
    ];

    // Add intelligence summary if available
    if (compressedData.intelligence) {
      contentArray.push({
        type: "text",
        text: this.buildIntelligenceSummary(compressedData.intelligence)
      });
    }

    // Add moodboard images
    if (moodboardFiles?.length > 0) {
      await this.addMoodboardImages(contentArray, moodboardFiles);
    }

    // Build compressed creative instruction
    contentArray.push({
      type: "text",
      text: this.buildCreativeInstruction(compressedData, customRequest, moodboardFiles.length > 0)
    });

    return [{ role: "user", content: contentArray }];
  }

  /**
   * 📊 DATA COMPRESSION SYSTEM
   */
  compressPortfolioData(portfolioData, projectImages, insaneAnalysis) {
    const projects = projectImages?.projectImages || [];
    
    return {
      // User essentials (U)
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
      
      // Projects compressed (P)
      p: this.compressProjectsData(projects),
      
      // Intelligence summary (I)
      intelligence: insaneAnalysis ? this.compressIntelligence(insaneAnalysis) : null,
      
      // Metadata
      meta: {
        projectCount: projects.length,
        imageCount: projects.reduce((sum, p) => sum + (p.processImages?.length || 0) + (p.finalImages?.length || 0), 0)
      }
    };
  }

  compressProjectsData(projects) {
    return projects.slice(0, 8).map((p, i) => ({
      i: i + 1, // index
      t: p.title || `Project ${i + 1}`, // title
      c: p.category || p.customCategory || 'Creative', // category
      d: this.compressDescription(p.overview || p.description), // description
      tags: (p.tags || []).slice(0, 4), // tags (max 4)
      imgs: {
        f: p.finalImages?.length || 0, // final count
        p: p.processImages?.length || 0, // process count
        main: p.finalImages?.[0]?.url || p.processImages?.[0]?.url || '' // main image
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

  /**
   * 🏗️ SKELETON INSTRUCTION BUILDER - Ultra compressed
   */
  buildSkeletonInstruction(skeletonId, template, data, customRequest, hasMoodboard) {
    const { u: user, p: projects, intelligence, meta } = data;
    
    return `TASK: Customize ${skeletonId} skeleton

USER: ${user.n} | ${user.t} | ${user.e}
${user.b ? `BIO: ${user.b}` : ''}
SKILLS: ${user.s.join(',')}
SOCIAL: ${[user.l && `li:${user.l}`, user.i && `ig:${user.i}`, user.p && `ph:${user.p}`].filter(Boolean).join('|')}

PROJECTS (${meta.projectCount}):
${projects.map(p => `${p.i}.${p.t}[${p.c}]${p.imgs.f}f+${p.imgs.p}p|${p.tags.join(',')}`).join('\n')}

STRUCTURE: ${template.structure}
STYLE: ${template.style}
FEATURES: ${template.features.join(',')}

${intelligence ? `AI: ${intelligence.style}+${intelligence.mood} ${intelligence.industry} (${intelligence.confidence}%)` : ''}

${hasMoodboard ? 'COLORS: Extract from moodboard images and apply throughout' : ''}

${customRequest ? `CUSTOM: ${customRequest}` : ''}

Generate complete HTML with embedded CSS/JS. All placeholders filled. Production ready.`;
  }

  /**
   * 🎨 CREATIVE INSTRUCTION BUILDER - Compressed
   */
  buildCreativeInstruction(data, customRequest, hasMoodboard) {
    const { u: user, p: projects, intelligence, meta } = data;
    
    return `TASK: Create custom portfolio

USER: ${user.n}(${user.t}) | ${user.e}
${user.s.length > 0 ? `SKILLS: ${user.s.join(',')}` : ''}
${user.b ? `BIO: ${user.b}` : ''}

PROJECTS(${meta.projectCount}):
${projects.map(p => `${p.t}[${p.c}]:${p.d}|tags:${p.tags.join(',')}|imgs:${p.imgs.f}f+${p.imgs.p}p`).join('\n')}

${intelligence ? `STYLE: ${intelligence.style} ${intelligence.mood} for ${intelligence.industry} (${intelligence.confidence}% confidence)` : ''}

${hasMoodboard ? 'COLORS: Match moodboard aesthetic exactly' : ''}

${customRequest ? `CUSTOM: ${customRequest}` : ''}

REQ: Modern responsive HTML+CSS+JS. Mobile-first. Professional. Image galleries for projects. Contact form. Smooth animations.`;
  }

  /**
   * 🧠 INTELLIGENCE SUMMARY - Compressed
   */
  buildIntelligenceSummary(intelligence) {
    return `🧠 AI ANALYSIS: ${intelligence.style}+${intelligence.mood} ${intelligence.industry} portfolio (${intelligence.confidence}% confidence)
Strategy: ${intelligence.strategy}`;
  }

  /**
   * 🖼️ MOODBOARD IMAGES - Streamlined
   */
  async addMoodboardImages(contentArray, moodboardFiles) {
    console.log(`🖼️ Adding ${moodboardFiles.length} moodboard images`);
    
    contentArray.push({
      type: "text",
      text: `\n🎨 MOODBOARD(${moodboardFiles.length}): Extract colors+style+layout. Apply aesthetic throughout.`
    });

    for (const [index, file] of moodboardFiles.entries()) {
      try {
        const base64Image = file.buffer.toString('base64');
        const mediaType = this.getMediaType(file.mimetype);
        
        contentArray.push({
          type: "image",
          source: {
            type: "base64", 
            media_type: mediaType,
            data: base64Image
          }
        });
      } catch (error) {
        console.warn(`⚠️ Failed to load moodboard ${index + 1}:`, error.message);
      }
    }
  }

  /**
   * 🔧 COMPRESSION UTILITIES
   */
  compressBio(bio) {
    if (!bio) return '';
    
    // Compress to max 100 chars, preserve key info
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

  getProjectCategories(projects) {
    if (!projects || projects.length === 0) return 'creative work';
    
    const categories = [...new Set(projects.map(p => p.category || p.customCategory).filter(Boolean))];
    
    if (categories.length === 0) return 'creative work';
    if (categories.length <= 2) return categories.join(' & ');
    return categories.slice(0, 2).join(', ') + ` +${categories.length - 2}`;
  }

  getMediaType(mimetype) {
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
   * 🔄 BACKWARD COMPATIBILITY METHODS
   */
  async generateSkeletonAwareMessages(portfolioData, projectImages, designStyle, designOptions = {}) {
    console.log('🔄 Legacy compatibility mode');
    return this.generateEnhancedAnthropicMessages(portfolioData, projectImages, null, [], designOptions);
  }

  async generateStyledPrompt(portfolioData, projectImages, designStyle, insaneAnalysis, designOptions = {}) {
    console.log('🔄 Legacy text prompt mode');
    const compressed = this.compressPortfolioData(portfolioData, projectImages, insaneAnalysis);
    const { selectedSkeleton = 'none', customDesignRequest = '' } = designOptions || {};
    
    if (selectedSkeleton !== 'none') {
      const template = this.skeletonTemplates[selectedSkeleton];
      if (template) {
        return this.buildSkeletonInstruction(selectedSkeleton, template, compressed, customDesignRequest, false);
      }
    }
    
    return `${this.systemPrompt}

STYLE: ${designStyle}
USER: ${compressed.u.n} - ${compressed.u.t}
PROJECTS: ${compressed.meta.projectCount}
${customDesignRequest ? `CUSTOM: ${customDesignRequest}` : ''}

Create professional portfolio with ${designStyle} aesthetic.`;
  }

  async generateAnthropicMessages(portfolioData, projectImages, designStyle = 'modern', analysisResults = null) {
    console.log('🔄 Legacy message generation');
    return this.generateEnhancedAnthropicMessages(
      portfolioData,
      projectImages, 
      analysisResults,
      [],
      { selectedSkeleton: 'none' }
    );
  }

  /**
   * 📊 PERFORMANCE METRICS
   */
  estimateTokens(data) {
    const text = JSON.stringify(data);
    return Math.ceil(text.length / 4); // Rough token estimate
  }

  logOptimizationMetrics(originalSize, optimizedSize) {
    const reduction = Math.round(((originalSize - optimizedSize) / originalSize) * 100);
    console.log(`📊 Token optimization: ${originalSize} → ${optimizedSize} (${reduction}% reduction)`);
  }
}

module.exports = PromptGenerator;