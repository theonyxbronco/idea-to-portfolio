class PromptGenerator {
  constructor() {
    this.basePrompt = `You are an expert web designer creating visually-driven portfolio websites. Generate a SINGLE HTML file with embedded CSS/JS that perfectly matches the client's aesthetic preferences and showcases their work.

CRITICAL REQUIREMENTS:
1. Single HTML file with embedded styles/scripts - NO separate files
2. Moodboard-driven design is TOP priority
3. Fully responsive (mobile, tablet, desktop)
4. Modern CSS features (Grid, Flexbox, CSS Variables)
5. Smooth animations/interactions
6. High performance and accessibility
7. Use client's actual images when provided
8. Polished, custom feel that matches the moodboard
9. Projects MUST be implemented as expandable interactive cards

PROJECT CARD REQUIREMENTS:
- Each project must start as a compact card showing only title, category and thumbnail
- Cards should expand smoothly when clicked/tapped to reveal full details
- Expanded state should show: full description, images, tags, and project details
- Only one project card should be expanded at a time (accordion behavior)
- Include subtle animation on expand/collapse (scale and fade preferred)
- Mobile: cards should expand to full viewport width
- Desktop: cards can expand within grid or to larger modal-like view
- Must include clear visual indicator of expandable nature (chevron, plus icon, etc.)

DESIGN PRINCIPLES:
- Layout MUST derive from moodboard images
- Color scheme MUST match moodboard palette
- Typography should reflect moodboard style
- Visual hierarchy should mirror inspiration
- Projects should showcase real work prominently

TECHNICAL OUTPUT:
- Single self-contained HTML file
- Semantic HTML5 structure
- Mobile-first responsive design
- CSS variables for theming
- Efficient, commented code
- Accessible markup (ARIA, alt text)
- Vanilla JavaScript for interactivity (no frameworks)`;
  }

  generatePersonalInfoSection(personalInfo) {
    return `
PERSONAL INFORMATION:
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
- Background: ${personalInfo.experience || 'Experienced'} | ${personalInfo.education || 'Design education'}`;
  }

  generateProjectsSection(projects, processedImages) {
    if (!projects?.length) {
      return '\nPROJECTS: Create 2-3 sample projects based on the user\'s title and skills.';
    }
  
    let projectsText = '\nPROJECTS:';
    projects.forEach((project, index) => {
      const projectImages = processedImages?.process?.filter(img => 
        img.originalName.includes(`project_${index}`) || 
        img.originalName.includes(project.title.toLowerCase().replace(/\s+/g, '_'))
      ) || [];
      
      const mainImage = processedImages?.final?.find(img => 
        img.originalName.includes(`project_${index}`) || 
        img.originalName.includes(project.title.toLowerCase().replace(/\s+/g, '_'))
      );
  
      projectsText += `
        
PROJECT ${index + 1}: ${project.title}
- Category: ${project.category || project.customCategory || 'Creative Work'}
- Tags: ${Array.isArray(project.tags) ? project.tags.join(', ') : ''}
- Overview: ${project.overview || 'Innovative creative project'}
- Challenge: ${project.problem || 'Creative challenge'}
- Solution: ${project.solution || 'Strategic approach'}
- Results: ${project.reflection || 'Successful outcome'}
  
IMAGES:
- Main Image: ${mainImage?.url || 'Use placeholder matching project'}
${projectImages.length > 0 ? `
- Process Images: Include these in gallery:
${projectImages.map(img => `  * ${img.url}`).join('\n')}` : ''}`;
    });
  
    return projectsText;
  }

  generateStyleSection(stylePreferences, processedImages) {
    let styleText = `
STYLE PREFERENCES:
- Colors: ${stylePreferences?.colorScheme || 'Professional'}
- Layout: ${stylePreferences?.layoutStyle || 'Clean'}
- Fonts: ${stylePreferences?.typography || 'Modern'}
- Mood: ${stylePreferences?.mood || 'Creative'}`;

    if (processedImages?.moodboard?.length) {
      styleText += `

MOODBOARD ANALYSIS (${processedImages.moodboard.length} images):
Extract and apply:
1. Color palette
2. Layout patterns
3. Typography style
4. Visual elements
5. Overall aesthetic

IMPLEMENTATION ORDER:
1. Match color scheme exactly
2. Replicate layout structure
3. Mirror typography treatment
4. Include similar design elements
5. Capture same mood/energy`;

      styleText += processedImages.moodboard.map((img, i) => `
MOODBOARD IMAGE ${i + 1}:
- URL: ${img.url}
- Dimensions: ${img.dimensions.width}x${img.dimensions.height}
- Key Features: Analyze for dominant colors, spacing, font treatments`);
    }

    if (processedImages?.process?.length || processedImages?.final?.length) {
      styleText += `

CLIENT IMAGES (MUST USE):
${processedImages.final?.map(img => `- Final: ${img.url}`).join('\n')}
${processedImages.process?.map(img => `- Process: ${img.url}`).join('\n')}

IMAGE REQUIREMENTS:
1. Replace all placeholders with client images
2. Feature final images prominently
3. Include process images in galleries
4. Add hover/lightbox effects
5. Ensure responsive sizing`;
    }

    return styleText;
  }

  generateStructureRequirements() {
    return `
STRUCTURE GUIDELINES:
1. Hero: Name, title, visual hook
2. About: Bio, personality, profile
3. Projects: Showcase work in expandable card layout
   - Default: Compact grid of project cards
   - Expanded: Detailed view with images and text
4. Contact: Simple, effective CTA

PROJECT CARD IMPLEMENTATION EXAMPLE:
<!-- HTML Structure -->
<div class="projects-grid">
  <article class="project-card" aria-expanded="false">
    <button class="card-toggle" aria-controls="project1-content">
      <div class="card-preview">
        <img src="project-thumb.jpg" alt="Project thumbnail">
        <h3>Project Title</h3>
        <span class="category">Category</span>
        <span class="toggle-icon">+</span>
      </div>
    </button>
    
    <div id="project1-content" class="card-content">
      <div class="project-details">
        <!-- Full project details here -->
      </div>
    </div>
  </article>
  <!-- More project cards -->
</div>

<!-- CSS Example -->
.project-card {
  transition: all 0.3s ease;
  overflow: hidden;
}
.card-content {
  max-height: 0;
  opacity: 0;
  transition: max-height 0.3s ease, opacity 0.2s ease;
}
.project-card[aria-expanded="true"] .card-content {
  max-height: 1000px; /* Adjust as needed */
  opacity: 1;
}

<!-- JavaScript Example -->
document.querySelectorAll('.card-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const card = button.closest('.project-card');
    const isExpanded = card.getAttribute('aria-expanded') === 'true';
    
    // Close all cards first
    document.querySelectorAll('.project-card').forEach(c => {
      c.setAttribute('aria-expanded', 'false');
    });
    
    // Open current if wasn't already expanded
    if (!isExpanded) {
      card.setAttribute('aria-expanded', 'true');
    }
  });
});`;
  }

  generateFooterRequirements(personalInfo) {
    // Generate a random appropriate emoji for creative portfolios
    const creativeEmojis = ['🎨', '✨', '🚀', '💫', '🎯', '💡', '🌟', '🎪', '🎭', '🎨', '🖌️', '📐', '🎬', '📸'];
    const randomEmoji = creativeEmojis[Math.floor(Math.random() * creativeEmojis.length)];
    
    return `
FOOTER REQUIREMENTS (MANDATORY):
- Add this EXACT footer at the bottom of the page:
  "2025 ${personalInfo.name || '[Name]'} — product of Interract Agency. All rights reserved. ${randomEmoji}"
- Footer styling requirements:
  * Small font size (12px-14px)
  * Light gray color (#888 or similar)
  * Centered text alignment
  * Add margin-top: 40px or padding-top: 40px to separate from main content
  * Footer must always be visible on the page
  * Use semantic <footer> HTML element
- Example CSS for footer:
  footer {
    text-align: center;
    font-size: 12px;
    color: #888;
    margin-top: 40px;
    padding: 20px 0;
    border-top: 1px solid #eee;
  }`;
  }

  generateCompletePrompt(portfolioData, processedImages = {}) {
    const { personalInfo, projects, stylePreferences } = portfolioData;
    
    return [
      this.basePrompt,
      this.generatePersonalInfoSection(personalInfo),
      this.generateProjectsSection(projects, processedImages),
      this.generateStyleSection(stylePreferences, processedImages),
      this.generateStructureRequirements(),
      this.generateFooterRequirements(personalInfo) // Added footer requirements
    ].join('\n');
  }

  generateStyledPrompt(portfolioData, processedImages, mappedStyle) {
    const basePrompt = this.generateCompletePrompt(portfolioData, processedImages);
    
    // Add style-specific enhancements
    const styleEnhancements = {
      'professional': `
PROFESSIONAL STYLE ENHANCEMENTS:
- Clean, corporate aesthetic
- Neutral color palette (blues, grays, whites)
- Sans-serif typography
- Grid-based layouts
- Subtle animations
- Focus on readability and trust`,
      
      'creative': `
CREATIVE STYLE ENHANCEMENTS:
- Bold, artistic aesthetic
- Vibrant color combinations
- Mix of serif and sans-serif fonts
- Asymmetric layouts
- Dynamic animations
- Focus on visual impact`,
      
      'funky': `
FUNKY STYLE ENHANCEMENTS:
- Wild, experimental aesthetic
- Neon and electric colors
- Bold, playful typography
- Unconventional layouts
- Eye-catching animations
- Focus on uniqueness and fun`,
      
      'elegant': `
ELEGANT STYLE ENHANCEMENTS:
- Sophisticated, refined aesthetic
- Muted, premium colors
- Elegant serif typography
- Balanced, harmonious layouts
- Smooth, subtle animations
- Focus on luxury and sophistication`,
      
      'minimal': `
MINIMAL STYLE ENHANCEMENTS:
- Clean, simple aesthetic
- Monochrome or limited color palette
- Clean sans-serif typography
- Lots of whitespace
- Minimal animations
- Focus on content and clarity`,
      
      'warm': `
WARM STYLE ENHANCEMENTS:
- Inviting, friendly aesthetic
- Warm colors (oranges, reds, yellows)
- Readable, friendly typography
- Comfortable layouts
- Gentle animations
- Focus on approachability`
    };

    const enhancement = styleEnhancements[mappedStyle] || styleEnhancements['professional'];
    
    return basePrompt + '\n' + enhancement;
  }
}

module.exports = new PromptGenerator();