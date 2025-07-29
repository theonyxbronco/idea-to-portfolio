class PromptGenerator {
  constructor() {
    this.basePrompt = `You are an expert web designer and developer specializing in creating stunning, modern, and responsive portfolio websites. You will receive detailed information about a creative professional and generate a complete, production-ready HTML portfolio website.

CRITICAL REQUIREMENTS:
1. Generate a SINGLE HTML file with embedded CSS and JavaScript - DO NOT create multiple pages
2. Create a modern, visually stunning SINGLE-PAGE design that reflects the user's creative field
3. Implement responsive design for mobile, tablet, and desktop
4. Use modern CSS features (Grid, Flexbox, CSS Variables, Animations)
5. Include smooth scrolling navigation and modern animations
6. Optimize for performance and accessibility
7. Use placeholder images with proper aspect ratios
8. Create a professional, portfolio-worthy result
9. IMPORTANT: This must be a single-page portfolio with all sections on one page

TECHNICAL SPECIFICATIONS:
- Single HTML file with embedded <style> and <script> tags
- Use CSS Grid and Flexbox for layouts
- Implement CSS Variables for consistent theming
- Add smooth animations and hover effects
- Include Font Awesome or similar icons via CDN
- Use Google Fonts for typography
- Implement scroll-triggered animations
- Add proper meta tags for SEO
- Ensure accessibility with proper ARIA labels and semantic HTML
- Include JavaScript for interactive elements (especially project cards)

DESIGN PRINCIPLES:
- Clean, modern aesthetic
- Strong visual hierarchy
- Consistent spacing and typography
- Strategic use of white space
- Professional color palette
- High-contrast text for readability
- Mobile-first responsive design`;
  }

  generatePersonalInfoSection(personalInfo) {
    return `
PERSONAL INFORMATION:
- Full Name: ${personalInfo.name}
- Professional Title: ${personalInfo.title}
- Bio/About: ${personalInfo.bio || 'Creative professional with passion for excellent design'}
- Email: ${personalInfo.email || ''}
- Phone: ${personalInfo.phone || ''}
- Website: ${personalInfo.website || ''}
- LinkedIn: ${personalInfo.linkedin || ''}
- Instagram: ${personalInfo.instagram || ''}
- Behance: ${personalInfo.behance || ''}
- Skills: ${personalInfo.skills?.join(', ') || 'Creative Design, Visual Arts'}
- Experience: ${personalInfo.experience || 'Experienced creative professional'}
- Education: ${personalInfo.education || 'Formal training in design and creative arts'}`;
  }

  generateProjectsSection(projects, processedImages) {
    if (!projects || projects.length === 0) {
      return '\nPROJECTS: No projects provided - create 2-3 sample projects based on the user\'s title and skills with interactive expandable cards.';
    }
  
    let projectsText = '\nPROJECTS - INTERACTIVE CARD SYSTEM WITH REAL CLIENT IMAGES:';
    projectsText += `
  
  🖼️ CRITICAL: CLIENT HAS PROVIDED REAL PROJECT IMAGES!
  The client has uploaded actual project images that MUST be used instead of placeholder images.
  
  INTERACTIVE PROJECT CARD REQUIREMENTS:
  1. Show project cards in a grid layout (2-3 columns on desktop, 1-2 on tablet, 1 on mobile)
  2. Each card MUST use the client's actual final product images as thumbnails (not placeholders)
  3. Cards should have hover effects and be clearly clickable
  4. When clicked, cards expand to show full project details in a modal or expanded view
  5. Include a "View Details" or "Learn More" button on each card
  6. The expanded view MUST include the client's actual process images in a gallery
  7. Include JavaScript to handle the expand/collapse functionality
  8. Add smooth animations for the expand/collapse transitions
  9. Ensure the expanded view has a close button to return to the card grid
  10. Make sure all content fits on ONE PAGE - no separate project pages
  
  📸 CLIENT'S ACTUAL IMAGES TO USE:
  ${processedImages ? `
  Process Images Available: ${processedImages.process?.length || 0} images
  Final Product Images Available: ${processedImages.final?.length || 0} images
  
  ACTUAL IMAGE URLS TO USE (replace all placeholders with these):
  ${processedImages.process?.map((img, index) => `- Process Image ${index + 1}: ${img.url}`).join('\n') || ''}
  ${processedImages.final?.map((img, index) => `- Final Product Image ${index + 1}: ${img.url}`).join('\n') || ''}
  ` : 'No images provided - use high-quality placeholders'}
  `;
  
    projects.forEach((project, index) => {
      // Find corresponding images for this project
      const projectProcessImages = processedImages?.process?.filter(img => 
        img.originalName.includes(`project_${index}`) || 
        img.originalName.includes(project.title.toLowerCase().replace(/\s+/g, '_'))
      ) || [];
      
      const projectFinalImage = processedImages?.final?.find(img => 
        img.originalName.includes(`project_${index}`) || 
        img.originalName.includes(project.title.toLowerCase().replace(/\s+/g, '_'))
      );
  
      projectsText += `
        
  Project ${index + 1} - ${project.title} (REAL IMAGES PROVIDED):
  CARD PREVIEW (Always Visible):
  - Title: ${project.title}
  - Subtitle: ${project.subtitle || ''}
  - Category: ${project.category || project.customCategory || 'Creative Work'}
  - Card Thumbnail: ${projectFinalImage ? `USE CLIENT'S ACTUAL IMAGE: ${projectFinalImage.url}` : 'Use high-quality placeholder matching project type'}
  
  EXPANDED DETAILS (Show when card is clicked):
  - Full Overview: ${project.overview || 'Compelling creative project showcasing skills and innovation'}
  - Challenge/Problem: ${project.problem || 'Creative challenge requiring innovative solution'}
  - Solution/Approach: ${project.solution || 'Strategic approach resulting in successful outcome'}
  - Results/Reflection: ${project.reflection || 'Successful project demonstrating expertise and creativity'}
  - Tags: ${Array.isArray(project.tags) ? project.tags.join(', ') : 'Creative, Design, Professional'}
  
  🖼️ REAL CLIENT IMAGES FOR THIS PROJECT:
  ${projectProcessImages.length > 0 ? `
  - Process Images Gallery: Include ALL of these client images in an expandable gallery:
  ${projectProcessImages.map((img, imgIndex) => `  * ${img.url} (${img.originalName})`).join('\n')}
  - Create an image gallery/carousel with these actual images
  - Add lightbox functionality for full-size viewing` : '- No process images provided for this project - use relevant placeholders'}
  
  ${projectFinalImage ? `
  - Featured Result Image: ${projectFinalImage.url} (${projectFinalImage.originalName})
  - This should be the main hero image for the project
  - Use this as the card thumbnail AND the main project image` : '- No final image provided - use high-quality placeholder'}
  
  IMAGE INTEGRATION REQUIREMENTS:
  - Prioritize showing the client's actual images over placeholders
  - Create hover effects and zoom functionality for the real images
  - Ensure images are properly sized and responsive
  - Add loading states for images
  - Include alt text based on project titles and descriptions`;
    });
  
    return projectsText;
  }

  generateStyleSection(stylePreferences, processedImages) {
    let styleText = `
STYLE PREFERENCES:
- Color Scheme: ${stylePreferences?.colorScheme || 'Professional and modern'}
- Layout Style: ${stylePreferences?.layoutStyle || 'Clean and minimal'}
- Typography: ${stylePreferences?.typography || 'Modern and readable'}
- Overall Mood: ${stylePreferences?.mood || 'Professional and creative'}`;

    // ENHANCED: Add detailed moodboard analysis with specific instructions
    if (processedImages && processedImages.moodboard && processedImages.moodboard.length > 0) {
      styleText += `

🎨 CRITICAL MOODBOARD INSPIRATION (${processedImages.moodboard.length} images provided):
⚠️  HIGHEST PRIORITY: THE CLIENT REALLY WANTS THE PORTFOLIO TO LOOK SIMILAR TO THESE MOODBOARD IMAGES!

MANDATORY MOODBOARD ADHERENCE REQUIREMENTS:

1. VISUAL ANALYSIS INSTRUCTIONS:
   - Study each moodboard image carefully for design patterns, color schemes, typography choices
   - Extract the dominant colors, accent colors, and color relationships
   - Identify layout patterns: grid systems, spacing, alignment, visual hierarchy
   - Note typography characteristics: font weights, sizes, letter spacing, line heights
   - Observe visual elements: shadows, borders, gradients, textures, shapes
   - Capture the overall mood and energy: minimalist, bold, playful, professional, artistic

2. IMPLEMENTATION PRIORITY ORDER:
   a) Color Palette (HIGHEST) - Match the exact color schemes from moodboard
   b) Layout Structure (HIGH) - Replicate spacing, grid patterns, and visual rhythm
   c) Typography Style (HIGH) - Match font weights, sizes, and text treatment
   d) Visual Elements (MEDIUM) - Include similar design elements and effects
   e) Overall Aesthetic (HIGH) - Ensure the final result captures the same feeling

3. SPECIFIC MOODBOARD IMAGES TO ANALYZE:
${processedImages.moodboard.map((img, index) => `
📸 MOODBOARD IMAGE ${index + 1}: ${img.url}
   - Dimensions: ${img.dimensions.width}x${img.dimensions.height}
   - INSTRUCTION: Extract and apply the color palette, layout grid, typography style, and visual elements from this image
   - FOCUS AREAS: Look for color combinations, spacing patterns, font treatments, and design motifs
   - IMPLEMENTATION: Use this as PRIMARY reference for section ${index + 1} of the portfolio
`).join('')}

4. MOODBOARD-DRIVEN DESIGN DECISIONS:
   - If moodboard shows dark themes → Create dark/moody portfolio sections
   - If moodboard shows bright colors → Use vibrant, energetic color schemes  
   - If moodboard shows minimal layouts → Apply clean, spacious design with lots of whitespace
   - If moodboard shows bold typography → Use strong, impactful font treatments
   - If moodboard shows geometric patterns → Incorporate geometric elements and shapes
   - If moodboard shows organic/flowing shapes → Use curved elements and fluid layouts
   - If moodboard shows specific color combinations → Extract and use those exact color palettes

5. TECHNICAL IMPLEMENTATION NOTES:
   - Use CSS custom properties to define colors extracted from moodboard
   - Create responsive layouts that maintain moodboard aesthetic across devices
   - Implement hover effects and animations inspired by moodboard energy
   - Use box-shadows, gradients, and borders that reflect moodboard style
   - Apply typography scales and spacing that match moodboard proportions

❗ CRITICAL REMINDER: The client chose these moodboard images specifically because they represent their desired aesthetic. Failing to incorporate the moodboard inspiration will result in client dissatisfaction. This is not optional - it's a core requirement that should influence every design decision.`;
    }

    // Enhanced project images integration
    if (processedImages && (processedImages.process.length > 0 || processedImages.final.length > 0)) {
      styleText += `

📸 CLIENT PROJECT IMAGES (MUST BE INCLUDED):
The client has provided actual project images that MUST be prominently featured in the portfolio:

PROCESS IMAGES (${processedImages.process.length} images):
- These show the client's creative process and behind-the-scenes work
- MUST be included in project card expandable galleries
- Use these instead of placeholder images wherever possible
${processedImages.process.map((img, index) => `
- Process Image ${index + 1}: ${img.url} (${img.originalName})
  Dimensions: ${img.dimensions.width}x${img.dimensions.height}
`).join('')}

FINAL PRODUCT IMAGES (${processedImages.final.length} images):
- These are the finished project results
- MUST be used as the main project card thumbnails and featured images
- These should be the hero images for each project
${processedImages.final.map((img, index) => `
- Final Image ${index + 1}: ${img.url} (${img.originalName})
  Dimensions: ${img.dimensions.width}x${img.dimensions.height}
`).join('')}

CRITICAL IMAGE REQUIREMENTS:
1. Replace ALL placeholder images with the actual client images provided
2. Use final product images as project card thumbnails and main project images
3. Include process images in expandable project galleries
4. Create an image-heavy portfolio that showcases the client's actual work
5. Ensure images are prominently displayed and properly sized
6. Add hover effects and image galleries for the uploaded images`;
    }

    return styleText;
  }

  generateImagePlaceholders(projects, processedImages) {
    let imageText = `
  IMAGE INTEGRATION STRATEGY:`;
  
    if (processedImages && (processedImages.moodboard?.length > 0 || processedImages.process?.length > 0 || processedImages.final?.length > 0)) {
      imageText += `
  
  🖼️ CLIENT HAS PROVIDED REAL IMAGES - USE THESE INSTEAD OF PLACEHOLDERS!
  
  MOODBOARD IMAGES (${processedImages.moodboard?.length || 0} provided):
  ${processedImages.moodboard?.map((img, index) => `
  - Moodboard ${index + 1}: ${img.url || img.absoluteUrl}
    Use this for design inspiration - colors, layout, aesthetic`).join('') || 'None provided'}
  
  CLIENT'S ACTUAL PROJECT IMAGES:
  ${processedImages.final?.map((img, index) => `
  - Final Product ${index + 1}: ${img.url || img.absoluteUrl} 
    USE THIS as project card thumbnail and main project image`).join('') || 'No final images provided'}
  
  ${processedImages.process?.map((img, index) => `
  - Process Image ${index + 1}: ${img.url || img.absoluteUrl}
    INCLUDE THIS in project galleries and process sections`).join('') || 'No process images provided'}
  
  CRITICAL IMAGE INTEGRATION REQUIREMENTS:
  1. Replace ALL placeholder images with these actual client images
  2. Use final product images as project card thumbnails and main project images
  3. Create galleries with process images in expandable project details
  4. Add proper alt text based on image context
  5. Ensure images are responsive and properly sized
  6. Include hover effects and lightbox functionality
  7. Make sure images load with fallbacks
  
  IMPORTANT: These image URLs are already accessible from the web server.
  Use them directly in <img src="..."> tags without modification.
  The URLs are relative paths that will work in the generated HTML.`;
    } else {
      imageText += `
  
  PLACEHOLDER IMAGES (No client images provided):
  Use these high-quality placeholder images that match the project aesthetics:
  - Hero/Banner images: Use https://picsum.photos/1200/600 with appropriate IDs
  - Project card thumbnails: Use https://picsum.photos/400/300 with different IDs
  - Project detail images: Use https://picsum.photos/800/600 for expanded views
  - Process images: Use https://picsum.photos/400/300 for smaller images in galleries
  - Portrait/About image: Use https://picsum.photos/400/400 for profile
  
  IMPORTANT: Use different image IDs (e.g., /800/600?random=1, /800/600?random=2) to ensure variety.`;
    }
  
    return imageText;
  }

  generateStructureRequirements() {
    return `
SINGLE-PAGE WEBSITE STRUCTURE REQUIREMENTS:
1. Hero Section: Eye-catching header with name, title, and compelling tagline
2. About Section: Professional bio, skills, and personality
3. Portfolio/Projects Section: Interactive card grid with expandable project details
4. Skills Section: Technical and creative competencies
5. Contact Section: Professional contact information and social links
6. Navigation: Fixed navigation bar with smooth scrolling between sections

PROJECT SECTION DETAILED REQUIREMENTS:
- Create a grid of project cards (not individual project pages)
- Each card is a preview with: image, title, subtitle, category
- Cards have hover effects and clear visual feedback
- Clicking a card opens an expanded view (modal, overlay, or inline expansion)
- Expanded view shows all project details, images, and descriptions
- Include smooth JavaScript animations for opening/closing
- Ensure mobile-friendly interaction (touch-friendly)
- Add a close button/mechanism to return to card grid
- CRITICAL: Everything stays on the same page - no navigation to separate pages

RESPONSIVE DESIGN:
- Mobile (320px-768px): Single column cards, touch-friendly navigation
- Tablet (768px-1024px): 2-column card grid, adapted modal/expansion
- Desktop (1024px+): 2-3 column card grid, full-featured interactions

JAVASCRIPT REQUIREMENTS:
- Card click handlers for expanding project details
- Smooth animations for expand/collapse
- Modal or overlay system for project details
- Close button functionality
- Keyboard navigation support (ESC key to close)
- Smooth scroll navigation between sections
- Fade-in animations on scroll for other sections
- Ensure all interactions work on touch devices`;
  }

  generateQualityRequirements() {
    return `
QUALITY STANDARDS:
- Professional single-page portfolio quality for job applications
- Modern web design trends and best practices
- Clean, semantic HTML structure with proper sections
- Efficient CSS with proper organization
- Functional JavaScript for interactive elements
- Cross-browser compatibility
- Fast loading performance
- SEO-optimized structure
- Accessible design following WCAG guidelines

CRITICAL OUTPUT REQUIREMENTS:
1. Return ONLY ONE complete HTML file with embedded CSS and JavaScript
2. DO NOT create multiple HTML files or suggest creating separate pages
3. Everything must be contained in a single file
4. The portfolio must be a single-page application with smooth scrolling
5. Project details should expand within the same page, not navigate to new pages
6. Include all JavaScript functionality inline within <script> tags
7. Do not include any explanations, comments, or additional text outside the HTML
8. The HTML should be ready to save as a single .html file and open in a browser
9. Ensure the design is modern, professional, and impressive
10. Make it portfolio-quality that someone would be proud to show employers`;
  }

  generateCompletePrompt(portfolioData, processedImages = {}) {
    const { personalInfo, projects, stylePreferences, moodboardImages } = portfolioData;
    
    // Enhanced prompt with image emphasis
    const enhancedBasePrompt = this.basePrompt + `

🎨 MOODBOARD & IMAGE INTEGRATION PRIORITY:
This client has provided specific visual inspiration and their actual project work.
The generated portfolio MUST reflect their aesthetic preferences and showcase their real work.

MOODBOARD REQUIREMENTS (if provided):
- Analyze any moodboard images for color palette, typography, layout style, and overall aesthetic
- The final design should strongly reflect the moodboard aesthetic
- Extract design patterns, color schemes, and visual elements from moodboard images
- This is a HIGH PRIORITY client requirement

REAL PROJECT IMAGES REQUIREMENTS (if provided):
- Use the client's actual project images instead of placeholders
- Feature final product images prominently as project thumbnails
- Include process images in expandable project galleries
- Create image-heavy portfolio showcasing real work
- Add professional image presentation with hover effects and galleries`;

    const prompt = [
      enhancedBasePrompt,
      this.generatePersonalInfoSection(personalInfo),
      this.generateProjectsSection(projects, processedImages),
      this.generateStyleSection(stylePreferences, processedImages),
      this.generateImagePlaceholders(projects, processedImages),
      this.generateStructureRequirements(),
      this.generateQualityRequirements()
    ].join('\n');

    return prompt;
  }

  generateStyledPrompt(portfolioData, processedImages = {}, designStyle = 'modern') {
    const basePrompt = this.generateCompletePrompt(portfolioData, processedImages);
    
    const styleSpecificAdditions = {
      modern: `
MODERN DESIGN SPECIFICATIONS:
- Use a clean, minimalist aesthetic with plenty of white space
- Implement subtle gradients and soft shadows for project cards
- Use geometric shapes and clean lines
- Apply modern typography with good contrast
- Include smooth micro-interactions and hover animations for cards
- Card hover effects: subtle lift, shadow changes, scale transforms
- Modern modal/expansion design with backdrop blur effects
- Color palette: whites, grays, blues with accent colors
- Typography: Sans-serif fonts like Inter, Roboto, or Poppins`,
      
      creative: `
CREATIVE DESIGN SPECIFICATIONS:
- Bold, artistic design with creative card layouts
- Experimental typography and unique compositions
- Vibrant colors and creative use of space
- Artistic elements and creative visual effects
- Show personality and creative flair throughout
- Creative card animations and unique expansion effects
- Playful interactions and unexpected design elements
- Mixed typography styles and creative text layouts
- Use of illustrations, creative shapes, and artistic elements`,
      
      professional: `
PROFESSIONAL DESIGN SPECIFICATIONS:
- Corporate-friendly, clean design with professional card styling
- Professional color palette (blues, grays, whites)
- Traditional layouts with modern touches
- Focus on readability and trustworthiness
- Conservative but elegant design choices
- Subtle, professional hover effects and interactions
- Clean, business-appropriate modal designs
- Professional typography like Source Sans Pro or Open Sans
- Trust-building elements and clean structure`,
      
      minimal: `
MINIMAL DESIGN SPECIFICATIONS:
- Ultra-clean, minimal aesthetic with simple card designs
- Monochromatic or very limited color palette (whites, grays, one accent)
- Abundant white space around and within cards
- Simple, elegant typography
- Focus on content over decoration
- Minimal animations and subtle interactions
- Clean, distraction-free expansion views
- Typography: Clean fonts like Helvetica Neue or system fonts
- Emphasis on negative space and simplicity`,
      
      funky: `
SUPER FUNKY CREATIVE DESIGN SPECIFICATIONS:
- BOLD, experimental design that pushes creative boundaries to the MAX
- Use VIBRANT, contrasting colors: neon greens (#00ff41), electric blues (#0080ff), hot pinks (#ff0080), cyber purples (#8000ff)
- Implement CRAZY animations: floating elements, rotating cards, morphing shapes, pulsing effects
- Experimental layouts: diagonal sections, overlapping elements, tilted grids, asymmetric designs
- WILD typography: mix multiple fonts, varying sizes, creative text effects, glowing text
- Interactive elements: hover effects that TRANSFORM completely, animated backgrounds, particles
- Creative card designs: 3D tilted cards, neon borders, holographic effects, unusual shapes
- FUNKY visual effects: rainbow gradients, neon shadows, blur effects, color overlays, glitch effects
- Playful navigation: animated menu buttons with glow effects, creative scroll indicators
- Artistic project expansions: slide-in with neon trails, zoom with particle effects, creative transitions
- Include CSS animations: @keyframes for bouncing, pulsing, rotating, glowing elements
- Creative color schemes: rainbow gradients, duotone effects, high contrast neon combinations
- Unconventional layouts that still maintain usability but look like digital art
- Add personality through micro-animations, hover surprises, and delightful interactions
- Typography effects: text shadows, neon glows, gradient text, animated text
- Background effects: animated gradients, floating shapes, particle systems
- Think: cyberpunk + digital art + rave culture + creative portfolio
- Make it look like it belongs in a sci-fi movie or underground art gallery
- Use CSS transforms, box-shadows, and filters creatively
- Include fun cursor effects and interactive elements that respond to mouse movement
- GOAL: Make visitors say "WHOA!" when they see it`
    };

    return basePrompt + (styleSpecificAdditions[designStyle] || styleSpecificAdditions.modern);
  }
}

module.exports = new PromptGenerator();