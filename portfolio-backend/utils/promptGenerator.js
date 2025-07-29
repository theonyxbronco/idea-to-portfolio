class PromptGenerator {
  constructor() {
    this.basePrompt = `CRITICAL INSTRUCTION: RETURN ONLY VALID HTML - NO EXPLANATORY TEXT, NO ANALYSIS, NO MARKDOWN CODE BLOCKS.

Your response must start with <!DOCTYPE html> and end with </html>. Nothing else.

You are an expert web designer creating visually-driven portfolio websites. Generate a SINGLE HTML file with embedded CSS/JS that EXACTLY REPLICATES the moodboard's visual structure and aesthetic.

MOODBOARD REPLICATION PHILOSOPHY:
- The moodboard shows the EXACT layout structure you should recreate
- If moodboard shows masonry/Pinterest layout → CREATE masonry layout, NOT traditional sections
- If moodboard shows no navigation menu → DON'T add Portfolio/About/Contact nav
- If moodboard shows varied image sizes → CREATE varied image containers, NOT uniform cards
- If moodboard shows minimal text → USE minimal text, NOT lengthy descriptions
- If moodboard shows specific color palette → EXTRACT and use those exact colors
- If moodboard shows organic/scattered layout → CREATE organic positioning, NOT rigid grids

LAYOUT ANALYSIS PRIORITY:
1. IDENTIFY the primary layout pattern (masonry, grid, scattered, editorial, etc.)
2. COUNT the number of content blocks and their relative sizes
3. NOTICE the spacing, gaps, and alignment patterns
4. OBSERVE text placement and hierarchy
5. EXTRACT the exact color palette from the moodboard images
6. REPLICATE the visual rhythm and flow

FORBIDDEN TEMPLATE PATTERNS:
- DO NOT create traditional hero sections unless moodboard shows them
- DO NOT add standard navigation menus unless moodboard has them  
- DO NOT use uniform project cards if moodboard shows varied layouts
- DO NOT add lengthy text content if moodboard is image-focused
- DO NOT impose traditional portfolio structure over moodboard patterns`;
  }

  generateMoodboardReplicationSection(processedImages) {
    if (!processedImages?.moodboard?.length) {
      return `
NO MOODBOARD PROVIDED - CREATE EXPERIMENTAL PORTFOLIO:
- Use unconventional layouts (masonry, scattered, collage)
- Vary content block sizes and shapes
- Create organic, non-grid arrangements
- Use creative navigation (minimal, hidden, or integrated)
- Focus on visual impact over traditional structure`;
    }

    return `
🎨 MOODBOARD REPLICATION INSTRUCTIONS (${processedImages.moodboard.length} images):

VISUAL STRUCTURE ANALYSIS:
${processedImages.moodboard.map((img, i) => `
Moodboard Image ${i + 1}: ${img.url}
- Dimensions: ${img.dimensions.width}x${img.dimensions.height}
- Role: Study this image's layout contribution to overall composition`).join('')}

REPLICATION CHECKLIST:
□ Identify if moodboard shows: Masonry layout, Grid system, Scattered/organic, Editorial columns, or Collage style
□ Count content blocks and note their size relationships (large, medium, small)
□ Extract exact colors from moodboard images (use color picker mentality)
□ Notice navigation style: None, Minimal header, Sidebar, or Integrated
□ Observe text treatment: Overlays, Minimal labels, Typography focus, or Image-dominant
□ Study spacing patterns: Tight gaps, Generous whitespace, or Overlapping elements

LAYOUT REPLICATION RULES:
- PINTEREST/MASONRY STYLE: Create CSS masonry with varied heights, uniform width columns
- GRID STYLE: Create uniform grid with consistent sizing and gaps
- SCATTERED/ORGANIC: Use absolute positioning with creative placement
- EDITORIAL: Create magazine-style columns with mixed content types
- COLLAGE: Layer and overlap elements with varied sizes and angles

COLOR EXTRACTION REQUIREMENT:
- Sample primary colors directly from moodboard images
- Use color picker approach: identify dominant hues, accent colors, neutral tones
- Apply extracted palette throughout design, not generic color schemes

CONTENT DENSITY MATCHING:
- If moodboard is image-heavy with minimal text → Make portfolio image-focused
- If moodboard shows lots of typography → Include typography as design element
- If moodboard has mixed content → Balance images, text, and white space proportionally

SPATIAL RELATIONSHIP REPLICATION:
- Study gaps between elements in moodboard → Replicate same spacing ratios
- Notice alignment patterns → Use same alignment approach (centered, left-aligned, scattered)
- Observe visual weight distribution → Balance content density similarly`;
  }

  generateLayoutSpecificInstructions() {
    return `
🏗️ SPECIFIC LAYOUT IMPLEMENTATIONS:

FOR PINTEREST/MASONRY LAYOUTS:
- Use CSS columns or masonry-style flexbox
- Create varied content heights (some tall, some short)
- Maintain consistent gaps between items
- Allow natural content flow without forcing uniform sizing
- Example structure: .masonry-container { columns: 3; gap: 20px; }

FOR SCATTERED/ORGANIC LAYOUTS:
- Use absolute positioning for creative placement
- Vary rotation angles slightly (transform: rotate())
- Create overlapping elements with z-index layering
- Break from grid constraints completely
- Implement random but purposeful positioning

FOR EDITORIAL/MAGAZINE LAYOUTS:
- Create asymmetrical column layouts
- Mix content types (large images, text blocks, small images)
- Use typography as major design element
- Implement sidebar or floating navigation
- Create reading flow with clear visual hierarchy

FOR COLLAGE LAYOUTS:
- Layer multiple elements with different sizes
- Use mix-blend-modes for element interaction
- Implement varied opacity levels
- Create depth with shadows and positioning
- Allow elements to break container boundaries

FOR MINIMAL/CLEAN LAYOUTS:
- Use generous whitespace as primary design element
- Limit color palette to 2-3 colors maximum
- Focus on typography and spacing
- Create breathing room around all elements
- Implement subtle interactions and animations`;
  }

  generateColorExtractionInstructions() {
    return `
🎨 COLOR PALETTE EXTRACTION:

MOODBOARD COLOR SAMPLING:
- Identify 3-5 dominant colors from moodboard images
- Note warm vs cool temperature bias
- Extract both saturated and muted variations
- Include neutral tones (grays, beiges, whites)
- Consider seasonal color associations (earthy, bright, pastel, dark)

COLOR APPLICATION STRATEGY:
- Primary color: Most dominant moodboard color for main elements
- Secondary color: Supporting color for accents and highlights  
- Neutral colors: For backgrounds, text, and spacing elements
- Accent color: Brightest or most contrasting color for CTAs and important elements

AVOID GENERIC PALETTES:
- Don't default to black/white/gray if moodboard shows color
- Don't use primary blue/red unless specifically in moodboard
- Don't apply corporate color schemes to artistic moodboards
- Don't ignore color temperature (warm/cool) shown in moodboard`;
  }

  generateContentDensityInstructions() {
    return `
📏 CONTENT DENSITY MATCHING:

IMAGE-TO-TEXT RATIO ANALYSIS:
- If moodboard is 80%+ images → Make portfolio image-dominant with minimal text
- If moodboard has 50/50 mix → Balance images and typography equally
- If moodboard is text-heavy → Feature typography as main design element

CONTENT ORGANIZATION PATTERNS:
- Large hero images → Feature one dominant image prominently
- Mixed size gallery → Create varied-size image grid or masonry
- Text overlays → Implement text over images, not separate sections
- Minimal labels → Use short, concise project titles and descriptions
- Photography focus → Let images tell the story, minimize descriptive text

INFORMATION HIERARCHY:
- Primary: Most prominent element in moodboard (usually largest image/text)
- Secondary: Supporting elements that create visual balance
- Tertiary: Small details, captions, navigation elements
- Interactive: Elements that suggest hover states or clickable areas`;
  }

  generateResponsiveAdaptation() {
    return `
📱 RESPONSIVE MOODBOARD ADAPTATION:

MOBILE ADAPTATION STRATEGY:
- Maintain moodboard aesthetic at smaller sizes
- Convert masonry to single/double column on mobile
- Preserve color palette and visual mood
- Adapt spacing proportionally (larger gaps become smaller)
- Keep key visual elements prominent

BREAKPOINT CONSIDERATIONS:
- Desktop: Full moodboard layout replication
- Tablet: Moderate compression while maintaining aesthetic
- Mobile: Simplified version that captures essential mood
- Focus: Keep visual impact strong across all sizes

LAYOUT FLEXIBILITY:
- Masonry → Stack vertically on mobile while keeping varied heights
- Scattered → Convert to organized vertical flow
- Grid → Reduce columns but maintain proportions
- Editorial → Convert multi-column to single column with preserved typography`;
  }

  generateCompletePrompt(portfolioData, processedImages = {}) {
    const { personalInfo, projects, stylePreferences } = portfolioData;
    
    const personalInfoSection = `
PERSONAL INFORMATION TO INTEGRATE:
- Name: ${personalInfo.name}
- Title: ${personalInfo.title}  
- Bio: ${personalInfo.bio || 'Creative professional'}
- Contact: ${personalInfo.email || ''} | ${personalInfo.phone || ''}
- Skills: ${personalInfo.skills?.join(', ') || 'Design, Visual Arts'}

INTEGRATION APPROACH:
- Place information according to moodboard layout patterns
- Use moodboard typography style for text treatment
- Don't force traditional About/Contact sections if moodboard doesn't suggest them`;

    const projectsSection = `
PROJECTS TO SHOWCASE (${projects?.length || 0} projects):
${projects?.map((project, index) => `
Project ${index + 1}: ${project.title}
- Category: ${project.category || 'Creative Work'}
- Overview: ${project.overview || 'Creative project'}
- Images: Use client images if provided, otherwise create placeholders matching moodboard aesthetic`).join('') || 'Create sample projects matching moodboard style'}

PROJECT INTEGRATION:
- Present projects according to moodboard layout (masonry, grid, scattered, etc.)
- Use image-focused approach if moodboard is image-heavy
- Implement expandable details only if moodboard suggests interactive elements`;

    const footerSection = `
FOOTER REQUIREMENT:
- Include: "2025 ${personalInfo.name} — product of Interract Agency. All rights reserved. 🎨"
- Style to match moodboard aesthetic (could be overlay, minimal footer, or integrated into design)`;

    const outputInstructions = `
🎯 FINAL EXECUTION REQUIREMENTS:

OUTPUT FORMAT:
- Return only HTML starting with <!DOCTYPE html> and ending with </html>
- No explanatory text, analysis, or markdown code blocks
- No "Looking at the moodboard..." commentary

DESIGN FIDELITY:
- The final portfolio should look like it belongs in the same visual family as the moodboard
- Someone who loves the moodboard should immediately connect with the portfolio design
- Every layout decision should feel intentional and moodboard-inspired
- Break completely free from traditional portfolio templates

QUALITY BENCHMARKS:
- Layout structure directly mirrors moodboard composition
- Color palette extracted from moodboard images
- Content density matches moodboard image-to-text ratio
- Spacing and proportions feel consistent with moodboard aesthetic
- Navigation style (or lack thereof) matches moodboard approach`;

    return [
      this.basePrompt,
      this.generateMoodboardReplicationSection(processedImages),
      this.generateLayoutSpecificInstructions(),
      this.generateColorExtractionInstructions(),
      this.generateContentDensityInstructions(),
      this.generateResponsiveAdaptation(),
      personalInfoSection,
      projectsSection,
      footerSection,
      outputInstructions
    ].join('\n\n');
  }

  generateStyledPrompt(portfolioData, processedImages, mappedStyle) {
    // Always prioritize moodboard if available
    if (processedImages?.moodboard?.length > 0) {
      console.log('🎨 Moodboard detected - creating moodboard-driven design');
      return this.generateCompletePrompt(portfolioData, processedImages);
    }

    // Fallback styles with creative approaches
    const basePrompt = this.generateCompletePrompt(portfolioData, processedImages);
    
    const creativeStyles = {
      'professional': `
PROFESSIONAL CREATIVE APPROACH:
- Clean masonry layout with generous whitespace
- Sophisticated color palette (navy, charcoal, cream)
- Elegant typography with proper hierarchy
- Subtle hover animations and transitions
- Grid-based project organization`,
      
      'creative': `
CREATIVE EXPERIMENTAL APPROACH:  
- Mixed layout: combine masonry, scattered, and grid elements
- Bold color combinations with artistic flair
- Typography as design element with varied sizes
- Creative navigation (floating, hidden, or artistic)
- Overlapping elements and creative positioning`,
      
      'funky': `
FUNKY EXPERIMENTAL APPROACH:
- Scattered/collage layout with rotation and overlaps
- Neon and electric color palette with high contrast
- Bold, experimental typography with varied fonts
- Unexpected navigation patterns and interactions
- Creative shapes, angles, and visual effects`,
      
      'minimal': `
MINIMAL ARTISTIC APPROACH:
- Clean masonry or single-column layout
- Monochromatic or limited color palette (2-3 colors max)
- Typography-focused with elegant, simple fonts
- Generous whitespace as primary design element
- Subtle, refined interactions and micro-animations`
    };

    return basePrompt + '\n\n' + (creativeStyles[mappedStyle] || creativeStyles['creative']);
  }
}

module.exports = new PromptGenerator();