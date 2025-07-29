class PromptGenerator {
  constructor() {
    this.basePrompt = `You are an expert web designer creating visually-driven portfolio websites. Generate a SINGLE HTML file with embedded CSS/JS that is COMPLETELY DRIVEN by the client's moodboard aesthetic.

CRITICAL PHILOSOPHY: THE MOODBOARD IS KING
- The moodboard images are your PRIMARY design reference - not just color inspiration
- Layout structure, navigation style, content organization should ALL mirror moodboard patterns
- Ignore traditional portfolio conventions if they conflict with moodboard vibes
- Create something that feels like it was born from the moodboard, not forced into a template

MOODBOARD-DRIVEN DESIGN APPROACH:
1. ANALYZE moodboard layout patterns (grid vs organic, symmetrical vs chaotic, minimal vs maximalist)
2. EXTRACT spatial relationships and visual hierarchy from moodboard
3. MIRROR the moodboard's information density and organization style
4. CAPTURE the moodboard's navigation/flow patterns
5. REPLICATE the moodboard's overall compositional approach

TECHNICAL REQUIREMENTS:
- Single HTML file with embedded styles/scripts - NO separate files
- Fully responsive (mobile, tablet, desktop)
- Modern CSS features (Grid, Flexbox, CSS Variables)
- Smooth animations/interactions
- High performance and accessibility
- Use client's actual images when provided
- Projects as expandable interactive elements (if moodboard suggests this pattern)

ANTI-PATTERNS TO AVOID:
- DO NOT default to hero-about-work-contact structure unless moodboard clearly suggests this
- DO NOT use standard navigation patterns if moodboard shows alternative approaches
- DO NOT force symmetrical layouts if moodboard is asymmetrical/organic
- DO NOT use corporate typography if moodboard shows artistic/experimental fonts
- DO NOT create uniform project grids if moodboard suggests varied/organic layouts`;
  }

  generateMoodboardAnalysisSection(processedImages) {
    if (!processedImages?.moodboard?.length) {
      return `
NO MOODBOARD PROVIDED - CREATE MODERN CREATIVE PORTFOLIO:
- Use contemporary design trends
- Asymmetrical layouts
- Bold typography mixing
- Unexpected navigation patterns
- Creative project showcases
- Break away from traditional portfolio conventions`;
    }

    return `
🎨 MOODBOARD IS YOUR CREATIVE BIBLE (${processedImages.moodboard.length} images):

STEP 1 - VISUAL ANALYSIS (Study each moodboard image):
${processedImages.moodboard.map((img, i) => `
MOODBOARD IMAGE ${i + 1}: ${img.url}
- Dimensions: ${img.dimensions.width}x${img.dimensions.height}
- Study: Layout patterns, information hierarchy, spatial relationships
- Extract: Typography treatment, color harmony, compositional flow
- Note: Navigation style, content organization, visual density`).join('')}

STEP 2 - DESIGN DNA EXTRACTION:
From moodboard patterns, determine:
- Layout Structure: (grid-based vs organic, symmetrical vs asymmetrical, minimal vs dense)
- Information Flow: (top-to-bottom vs scattered, linear vs radial, conventional vs experimental)
- Typography Style: (clean vs textured, uniform vs varied, conservative vs experimental)
- Color Relationships: (monochromatic vs vibrant, subtle vs bold, warm vs cool)
- Interactive Patterns: (hover effects, transitions, micro-interactions)
- Spatial Usage: (generous whitespace vs tight packing, balanced vs chaotic)

STEP 3 - PORTFOLIO STRUCTURE INSPIRATION:
Based on moodboard analysis, create structure that mirrors the visual patterns:
- If moodboard shows magazine-style layouts → Create editorial portfolio
- If moodboard shows Instagram-feed patterns → Create social media inspired grid
- If moodboard shows artistic collages → Create overlapping, layered sections
- If moodboard shows minimalist compositions → Create spacious, focused layouts
- If moodboard shows Pinterest-style arrangements → Create masonry/varied-size layouts
- If moodboard shows experimental typography → Break text into creative formations

MANDATORY: Your final design should feel like it was created BY the moodboard artist, not just inspired by it.`;
  }

  generatePersonalInfoSection(personalInfo) {
    return `
PERSONAL INFORMATION TO WEAVE INTO MOODBOARD-DRIVEN DESIGN:
- Name: ${personalInfo.name}
- Title: ${personalInfo.title}
- Bio: ${personalInfo.bio || 'Creative professional'}
- Contact: ${personalInfo.email || ''} | ${personalInfo.phone || ''}
- Links: ${[
      personalInfo.website,
      personalInfo.linkedin,
      personalInfo.instagram,
      personalInfo.behance
    ].filter(Boolean).join(' | ')}
- Skills: ${personalInfo.skills?.join(', ') || 'Design, Visual Arts'}
- Background: ${personalInfo.experience || 'Experienced'} | ${personalInfo.education || 'Design education'}

INTEGRATION APPROACH:
- Present this information using the moodboard's visual language
- If moodboard is playful → make bio playful
- If moodboard is minimal → present info cleanly
- If moodboard is chaotic → scatter information creatively
- If moodboard is editorial → present like a magazine profile`;
  }

  generateProjectsSection(projects, processedImages) {
    if (!projects?.length) {
      return `
PROJECTS: Create 2-3 sample projects that reflect the moodboard aesthetic
- Project presentation should mirror moodboard layout patterns
- Use moodboard-inspired interaction styles
- Present work in the same visual language as moodboard`;
    }

    return `
PROJECTS TO SHOWCASE (${projects.length} projects):
${projects.map((project, index) => {
      const projectImages = processedImages?.process?.filter(img => 
        img.originalName.includes(`project_${index}`) || 
        img.originalName.includes(project.title.toLowerCase().replace(/\s+/g, '_'))
      ) || [];
      
      const mainImage = processedImages?.final?.find(img => 
        img.originalName.includes(`project_${index}`) || 
        img.originalName.includes(project.title.toLowerCase().replace(/\s+/g, '_'))
      );

      return `
PROJECT ${index + 1}: ${project.title}
- Category: ${project.category || project.customCategory || 'Creative Work'}
- Tags: ${Array.isArray(project.tags) ? project.tags.join(', ') : ''}
- Overview: ${project.overview || 'Innovative creative project'}
- Challenge: ${project.problem || 'Creative challenge'}
- Solution: ${project.solution || 'Strategic approach'}
- Results: ${project.reflection || 'Successful outcome'}

IMAGES:
- Main Image: ${mainImage?.url || 'Use placeholder matching moodboard aesthetic'}
${projectImages.length > 0 ? `- Process Images: ${projectImages.map(img => img.url).join(', ')}` : ''}

PRESENTATION STYLE: Present this project using moodboard-inspired layout and interaction patterns`;
    }).join('')}

PROJECT SHOWCASE PHILOSOPHY:
- If moodboard shows grid patterns → Organized project grid
- If moodboard shows scattered layouts → Organic project placement
- If moodboard shows layered compositions → Overlapping project elements  
- If moodboard shows editorial styles → Story-driven project presentations
- If moodboard shows minimalist approach → Clean, focused project displays`;
  }

  generateFlexibleStructureApproach() {
    return `
🚫 IGNORE TRADITIONAL PORTFOLIO STRUCTURE - CREATE MOODBOARD-INSPIRED LAYOUT:

INSTEAD OF: Hero → About → Work → Contact
CREATE BASED ON MOODBOARD PATTERNS:

OPTION A - MAGAZINE/EDITORIAL INSPIRED:
- Feature story layout with large typography
- Sidebar navigation
- Article-style project presentations
- Pull quotes and featured elements

OPTION B - SOCIAL MEDIA/INSTAGRAM INSPIRED:
- Profile header with avatar and stats
- Grid-based project showcase
- Story highlights for different project categories
- Social-style interactions and micro-animations

OPTION C - ARTISTIC/EXPERIMENTAL INSPIRED:
- Asymmetrical layouts
- Overlapping content sections
- Creative navigation (hidden menus, hover reveals)
- Artistic project presentations with mixed media

OPTION D - MINIMAL/CLEAN INSPIRED:
- Generous whitespace
- Single-column layouts
- Typography-focused design
- Subtle interactions and animations

OPTION E - COLLAGE/PINTEREST INSPIRED:
- Masonry layouts
- Varied content sizes
- Overlapping elements
- Pin-board style organization

CHOOSE THE APPROACH THAT BEST MATCHES YOUR MOODBOARD ANALYSIS!`;
  }

  generateFooterRequirements(personalInfo) {
    const creativeEmojis = ['🎨', '✨', '🚀', '💫', '🎯', '💡', '🌟', '🎪', '🎭', '🖌️', '📐', '🎬', '📸'];
    const randomEmoji = creativeEmojis[Math.floor(Math.random() * creativeEmojis.length)];
    
    return `
FOOTER REQUIREMENTS (MANDATORY):
- Add this EXACT footer styled to match moodboard aesthetic:
  "2025 ${personalInfo.name || '[Name]'} — product of Interract Agency. All rights reserved. ${randomEmoji}"
- Style footer to blend with moodboard-inspired design
- Size, color, and placement should feel integrated, not tacked on`;
  }

  generateCompletePrompt(portfolioData, processedImages = {}) {
    const { personalInfo, projects, stylePreferences } = portfolioData;
    
    return [
      this.basePrompt,
      this.generateMoodboardAnalysisSection(processedImages),
      this.generatePersonalInfoSection(personalInfo),
      this.generateProjectsSection(projects, processedImages),
      this.generateFlexibleStructureApproach(),
      this.generateFooterRequirements(personalInfo)
    ].join('\n');
  }

  generateStyledPrompt(portfolioData, processedImages, mappedStyle) {
    // If moodboard exists, ignore mappedStyle and use moodboard
    if (processedImages?.moodboard?.length > 0) {
      console.log('🎨 Moodboard detected - ignoring style preferences in favor of moodboard analysis');
      return this.generateCompletePrompt(portfolioData, processedImages);
    }

    // Only use style mappings if no moodboard is provided
    const basePrompt = this.generateCompletePrompt(portfolioData, processedImages);
    
    const styleEnhancements = {
      'professional': `
PROFESSIONAL STYLE (No Moodboard Provided):
- Clean, business-appropriate aesthetic
- Structured layouts with clear hierarchy
- Conservative color palette
- Readable typography
- Conventional navigation patterns`,
      
      'creative': `
CREATIVE STYLE (No Moodboard Provided):
- Artistic, experimental aesthetic
- Asymmetrical layouts
- Bold color choices
- Mixed typography styles
- Unexpected interactive elements`,
      
      'funky': `
FUNKY STYLE (No Moodboard Provided):
- Wild, unconventional aesthetic
- Chaotic but purposeful layouts
- Neon and vibrant colors
- Experimental typography
- Surprising navigation and interactions`,
      
      'minimal': `
MINIMAL STYLE (No Moodboard Provided):
- Clean, spacious aesthetic
- Lots of whitespace
- Limited color palette
- Simple, clean typography
- Subtle, refined interactions`
    };

    const enhancement = styleEnhancements[mappedStyle] || styleEnhancements['creative'];
    return basePrompt + '\n' + enhancement;
  }
}

module.exports = new PromptGenerator();