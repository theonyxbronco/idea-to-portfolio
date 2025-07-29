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
- Accessible markup (ARIA, alt text)`;
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
3. Projects: Showcase work (moodboard layout)
4. Contact: Simple, effective CTA

MOODBOARD PRIORITY:
- Layout must derive from moodboard
- Section order can vary to match aesthetic
- Spacing/rhythm should mirror inspiration`;
  }

  generateCompletePrompt(portfolioData, processedImages = {}) {
    const { personalInfo, projects, stylePreferences } = portfolioData;
    
    return [
      this.basePrompt,
      this.generatePersonalInfoSection(personalInfo),
      this.generateProjectsSection(projects, processedImages),
      this.generateStyleSection(stylePreferences, processedImages),
      this.generateStructureRequirements(),
      `FOOTER: Include copyright with "${personalInfo.name || 'Client'} © ${new Date().getFullYear()}"`
    ].join('\n');
  }
}

module.exports = new PromptGenerator();