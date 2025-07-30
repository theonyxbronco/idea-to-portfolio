import ImageParser from './imageParser.js';

class PromptGenerator {
  constructor() {
    this.imageParser = ImageParser;
    this.basePrompt = `You are an expert web designer creating visually-driven portfolio websites. Generate a SINGLE HTML file with embedded CSS/JS that is COMPLETELY DRIVEN by the client's moodboard aesthetic.

CRITICAL PHILOSOPHY: THE MOODBOARD IS KING
- The moodboard images are your PRIMARY design reference - not just color inspiration
- Layout structure, navigation style, content organization should ALL mirror moodboard patterns
- Ignore traditional portfolio conventions if they conflict with moodboard vibes
- Create something that feels like it was born from the moodboard, not forced into a template

TECHNICAL REQUIREMENTS:
- Single HTML file with embedded styles/scripts - NO separate files
- Fully responsive (mobile, tablet, desktop)
- Modern CSS features (Grid, Flexbox, CSS Variables)
- Smooth animations/interactions
- High performance and accessibility
- Use client's actual images when provided`;
  }

  async generateFromMoodboard(imagePath, portfolioData) {
    const technicalAnalysis = await this.imageParser.analyzeImage(imagePath);

    return [
      this.basePrompt,
      this.generateTechnicalAnalysisSection(technicalAnalysis),
      this.generateMoodboardAnalysisSection({ moodboard: [imagePath] }), // placeholder for moodboard images
      this.generatePersonalInfoSection(portfolioData.personalInfo),
      this.generateProjectsSection(portfolioData.projects),
      this.generateFooterSection(portfolioData.personalInfo)
    ].join('\n\n');
  }

  generateTechnicalAnalysisSection(analysis) {
    return `🎨 TECHNICAL DIRECTIVES (From Moodboard Analysis):
- Theme: ${analysis.theme}
- Primary Color: ${analysis.technicalSpecs.colors.primary}
- Accent Color: ${analysis.technicalSpecs.colors.accent}
- Color Palette: ${analysis.technicalSpecs.colors.palette.join(', ')}
- Brightness: ${analysis.technicalSpecs.colors.brightness}

LAYOUT:
- Type: ${analysis.technicalSpecs.layout.type.toUpperCase()}
- Grid: ${analysis.technicalSpecs.layout.grid}
- Spacing: ${analysis.technicalSpecs.layout.spacing}
- Image Treatment: ${analysis.technicalSpecs.layout.imageTreatment}

TYPOGRAPHY:
- Font Family: ${analysis.technicalSpecs.typography.family}
- Stack: ${analysis.technicalSpecs.typography.stack}
- Scale: ${analysis.technicalSpecs.typography.scale}
- Base Size: ${analysis.technicalSpecs.typography.baseSize}

INTERACTIONS:
- Hover Effects: ${analysis.technicalSpecs.interactions.hover}
- Transitions: ${analysis.technicalSpecs.interactions.transition}
- Focus States: ${analysis.technicalSpecs.interactions.focus}

IMPLEMENTATION NOTES:
- Dominant Aspect Ratio: ${analysis.technicalSpecs.imageHandling.dominantAspectRatio}
- Grid Gaps: ${analysis.technicalSpecs.imageHandling.gridGaps}
- Loading Behavior: ${analysis.technicalSpecs.imageHandling.loading}

🔖 TAGS: ${analysis.tags.map(t => `${t.className} (${t.confidence}%)`).join(', ')}`;
  }

  generateMoodboardAnalysisSection(processedImages) {
    if (!processedImages?.moodboard?.length) {
      return `📂 NO MOODBOARD PROVIDED - USE MODERN CREATIVE AESTHETICS:
- Asymmetrical layouts
- Bold typography mixing
- Unexpected navigation patterns`;
    }

    return `🖼️ MOODBOARD ANALYSIS (${processedImages.moodboard.length} images):\n` +
      processedImages.moodboard.map((img, i) => `
IMAGE ${i + 1}:
- Dimensions: ${img.dimensions.width}x${img.dimensions.height}
- Study: Layout patterns, hierarchy, spatial relationships`).join('');
  }

  generatePersonalInfoSection(info) {
    return `👤 CLIENT BIO:
- Name: ${info.name}
- Title: ${info.title}
- Bio: "${info.bio || 'Creative professional'}"
- Contact: ${info.email || ''}${info.phone ? ` | ${info.phone}` : ''}
- Links: ${[
      info.website,
      info.linkedin,
      info.instagram,
      info.behance
    ].filter(Boolean).join(' | ')}`;
  }

  generateProjectsSection(projects) {
    if (!projects?.length) return `🖼️ PROJECTS: Create 2-3 sample projects matching the aesthetic`;

    return `🖼️ PROJECTS (${projects.length}):
${projects.map(p => `
• ${p.title.toUpperCase()}
  - ${p.overview || 'Innovative creative project'}
  - Category: ${p.category || 'Design'}
  - Tags: ${p.tags?.join(', ') || 'creative, art'}`).join('')}`;
  }

  generateFooterSection(info) {
    return `✨ FOOTER REQUIREMENT:
"© ${new Date().getFullYear()} ${info.name} | Crafted with Interract AI"`;
  }

  generateCompletePrompt(portfolioData, processedImages = {}, technicalAnalysis = null) {
    return [
      this.basePrompt,
      technicalAnalysis ? this.generateTechnicalAnalysisSection(technicalAnalysis) : '',
      this.generateMoodboardAnalysisSection(processedImages),
      this.generatePersonalInfoSection(portfolioData.personalInfo),
      this.generateProjectsSection(portfolioData.projects),
      this.generateFooterSection(portfolioData.personalInfo)
    ].filter(Boolean).join('\n\n');
  }
}

export default new PromptGenerator();