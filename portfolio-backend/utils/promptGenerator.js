const imageParser = require('./imageParser');
const fs = require('fs-extra');

class PromptGenerator {
  constructor() {
    this.basePrompt = `You are an expert web designer creating visually-driven portfolio websites. Generate a SINGLE HTML file with embedded CSS/JS that is COMPLETELY DRIVEN by the provided images and user data.

CRITICAL PHILOSOPHY: THE MOODBOARD IMAGES ARE YOUR DESIGN DNA
- You can SEE the actual moodboard images provided - analyze them directly
- Extract colors, layouts, typography styles, and aesthetic patterns from what you see
- The portfolio should look like it was born from these visual references
- Combine the visual inspiration with the user's personal/project data

TECHNICAL REQUIREMENTS:
- Single HTML file with embedded styles/scripts - NO separate files
- Fully responsive (mobile, tablet, desktop)
- Modern CSS features (Grid, Flexbox, CSS Variables)
- Smooth animations/interactions
- High performance and accessibility
- Use client's actual processed images when provided

WORKFLOW:
1. ANALYZE the moodboard images I'm showing you
2. EXTRACT design patterns, colors, typography, layouts
3. COMBINE with user data to create personalized portfolio
4. GENERATE complete HTML with embedded CSS/JS`;
  }

  /**
   * Generate message array for Anthropic with images
   * @param {Object} portfolioData - User portfolio data
   * @param {Object} processedImages - Processed images with paths and URLs
   * @param {string} designStyle - Fallback design style
   * @returns {Array} - Message array for Anthropic API
   */
  async generateAnthropicMessages(portfolioData, processedImages, designStyle = 'modern') {
    console.log('🎨 Generating Anthropic messages with direct image analysis...');
    
    const messages = [];
    let textContent = this.basePrompt;

    // Add user data to text content
    textContent += '\n\n' + this.generateUserDataSection(portfolioData, designStyle);

    // Prepare content array (text + images)
    const contentArray = [
      {
        type: "text",
        text: textContent
      }
    ];

    // Add moodboard images for direct Claude analysis
    if (processedImages.moodboard && processedImages.moodboard.length > 0) {
      console.log(`🖼️ Adding ${processedImages.moodboard.length} moodboard images for Claude to analyze...`);
      
      for (const [index, image] of processedImages.moodboard.entries()) {
        try {
          const imageBuffer = await fs.readFile(image.path);
          const base64Image = imageBuffer.toString('base64');
          
          // Determine media type
          const mediaType = this.getMediaType(image.path);
          
          contentArray.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image
            }
          });

          console.log(`✅ Added moodboard image ${index + 1}: ${image.originalName}`);
        } catch (error) {
          console.warn(`⚠️ Failed to load moodboard image ${index + 1}:`, error.message);
        }
      }

      // Add instruction for moodboard analysis
      contentArray.push({
        type: "text",
        text: `\n🎨 MOODBOARD ANALYSIS INSTRUCTIONS:
I've provided ${processedImages.moodboard.length} moodboard images above. Please:

1. ANALYZE each image for:
   - Color palettes and schemes
   - Typography styles and treatments
   - Layout patterns and compositions
   - Visual hierarchy and spacing
   - Overall aesthetic mood and vibe

2. EXTRACT design patterns:
   - How is content organized?
   - What layout styles do you see? (grid, asymmetrical, minimal, etc.)
   - What color combinations are used?
   - How is text treated? (fonts, sizes, positioning)
   - What's the overall visual mood?

3. APPLY these insights to create a portfolio that feels like it belongs in this visual universe.

The portfolio should look and feel like it was designed by someone who created these moodboard images.`
      });
    }

    // Add project images with context
    await this.addProjectImagesToContent(contentArray, processedImages, portfolioData);

    // Add final instructions
    contentArray.push({
      type: "text",
      text: this.generateFinalInstructions(portfolioData, processedImages)
    });

    messages.push({
      role: "user",
      content: contentArray
    });

    return messages;
  }

  /**
   * Add project images to content array
   */
  async addProjectImagesToContent(contentArray, processedImages, portfolioData) {
    // Add process images
    if (processedImages.process && processedImages.process.length > 0) {
      console.log(`📸 Adding ${processedImages.process.length} process images...`);
      
      contentArray.push({
        type: "text",
        text: `\n📸 PROCESS IMAGES (${processedImages.process.length} images):
These show the user's creative process and should be integrated into the portfolio design:`
      });

      for (const [index, image] of processedImages.process.entries()) {
        try {
          const imageBuffer = await fs.readFile(image.path);
          const base64Image = imageBuffer.toString('base64');
          const mediaType = this.getMediaType(image.path);
          
          contentArray.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image
            }
          });

          // Add context for this process image
          contentArray.push({
            type: "text",
            text: `Process Image ${index + 1}: ${image.originalName} - Use in portfolio with URL: ${image.url}`
          });
        } catch (error) {
          console.warn(`⚠️ Failed to load process image ${index + 1}:`, error.message);
        }
      }
    }

    // Add final images
    if (processedImages.final && processedImages.final.length > 0) {
      console.log(`🎯 Adding ${processedImages.final.length} final project images...`);
      
      contentArray.push({
        type: "text",
        text: `\n🎯 FINAL PROJECT IMAGES (${processedImages.final.length} images):
These are completed works that should be prominently featured:`
      });

      for (const [index, image] of processedImages.final.entries()) {
        try {
          const imageBuffer = await fs.readFile(image.path);
          const base64Image = imageBuffer.toString('base64');
          const mediaType = this.getMediaType(image.path);
          
          contentArray.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image
            }
          });

          // Add context for this final image
          contentArray.push({
            type: "text",
            text: `Final Image ${index + 1}: ${image.originalName} - Feature prominently with URL: ${image.url}`
          });
        } catch (error) {
          console.warn(`⚠️ Failed to load final image ${index + 1}:`, error.message);
        }
      }
    }
  }

  /**
   * Generate user data section
   */
  generateUserDataSection(portfolioData, designStyle) {
    return `
👤 USER PORTFOLIO DATA:

PERSONAL INFO:
- Name: ${portfolioData.personalInfo.name}
- Title: ${portfolioData.personalInfo.title}
- Bio: "${portfolioData.personalInfo.bio || 'Creative professional'}"
- Email: ${portfolioData.personalInfo.email || ''}
- Social Links: ${[
      portfolioData.personalInfo.website,
      portfolioData.personalInfo.linkedin,
      portfolioData.personalInfo.instagram,
      portfolioData.personalInfo.behance,
      portfolioData.personalInfo.dribbble
    ].filter(Boolean).join(' | ')}

PROJECTS (${portfolioData.projects?.length || 0}):
${portfolioData.projects?.map((project, index) => `
${index + 1}. ${project.title}
   - Overview: ${project.overview || 'Creative project'}
   - Category: ${project.category || project.customCategory || 'Design'}
   - Tags: ${project.tags?.join(', ') || 'creative, design'}
   ${project.problem ? `- Problem: ${project.problem}` : ''}
   ${project.solution ? `- Solution: ${project.solution}` : ''}
   ${project.reflection ? `- Reflection: ${project.reflection}` : ''}
`).join('') || 'No projects provided - create sample projects that match the moodboard aesthetic'}

SKILLS: ${portfolioData.personalInfo.skills?.join(', ') || 'Creative skills matching the visual style'}

STYLE PREFERENCES:
- Color Scheme: ${portfolioData.stylePreferences?.colorScheme || 'Extract from moodboard'}
- Layout: ${portfolioData.stylePreferences?.layoutStyle || 'Extract from moodboard'}
- Typography: ${portfolioData.stylePreferences?.typography || 'Extract from moodboard'}
- Mood: ${portfolioData.stylePreferences?.mood || designStyle}`;
  }

  /**
   * Generate final instructions
   */
  generateFinalInstructions(portfolioData, processedImages) {
    const totalImages = Object.values(processedImages).flat().length;
    const creativeEmojis = ['🎨', '✨', '🚀', '💫', '🎯', '💡', '🌟', '🎪', '🎭', '🖌️'];
    const randomEmoji = creativeEmojis[Math.floor(Math.random() * creativeEmojis.length)];

    return `
🎯 FINAL INSTRUCTIONS:

DESIGN PROCESS:
1. Study the moodboard images carefully - extract the exact aesthetic
2. Use the detected colors, typography styles, and layout patterns
3. Integrate the user's project images seamlessly into this aesthetic
4. Create a cohesive portfolio that feels authentically inspired by the moodboard

TECHNICAL REQUIREMENTS:
- Responsive design (mobile-first)
- Fast loading and accessible
- Use provided image URLs: ${Object.values(processedImages).flat().map(img => img.url).join(', ')}
- Embed all CSS and JavaScript inline
- Modern web standards (CSS Grid, Flexbox, semantic HTML)

MANDATORY FOOTER:
"© ${new Date().getFullYear()} ${portfolioData.personalInfo.name} — product of Interract Agency. All rights reserved. ${randomEmoji}"

CRITICAL SUCCESS METRICS:
✅ Portfolio looks like it was designed by the same person who created the moodboard
✅ Colors and typography match the moodboard aesthetic exactly
✅ Layout patterns reflect the moodboard compositions
✅ All user data is integrated seamlessly
✅ All provided images are used effectively
✅ Design is responsive and accessible
✅ Single HTML file with embedded styles

Generate the complete portfolio HTML now.`;
  }

  /**
   * Get media type from file path
   */
  getMediaType(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    const mediaTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mediaTypes[ext] || 'image/jpeg';
  }

  /**
   * Legacy method for text-only prompts (fallback)
   */
  async generateStyledPrompt(portfolioData, processedImages, designStyle = 'modern') {
    console.log('⚠️ Using legacy text-only prompt - consider using generateAnthropicMessages for image support');
    
    // This is the old text-only method for backwards compatibility
    let prompt = this.basePrompt;
    
    if (processedImages.moodboard && processedImages.moodboard.length > 0) {
      prompt += `\n\n🖼️ MOODBOARD IMAGES PROVIDED: ${processedImages.moodboard.length} images (descriptions only in text mode)`;
      
      // Try to analyze images with simplified parser for text descriptions
      try {
        const moodboardPaths = processedImages.moodboard.map(img => img.path);
        const analysis = await imageParser.analyzeImageSet(moodboardPaths, 'moodboard');
        prompt += `\n\nMOODBOARD ANALYSIS:\n${analysis.aiPromptInsights}`;
      } catch (error) {
        console.warn('Failed to analyze moodboard for text prompt:', error.message);
      }
    }
    
    prompt += '\n\n' + this.generateUserDataSection(portfolioData, designStyle);
    prompt += '\n\n' + this.generateFinalInstructions(portfolioData, processedImages);
    
    return prompt;
  }
}

module.exports = new PromptGenerator();