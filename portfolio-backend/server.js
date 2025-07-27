const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to convert files to base64
const convertFilesToBase64 = (files) => {
  return files.map(file => ({
    name: file.originalname,
    type: file.mimetype,
    data: file.buffer.toString('base64'),
    size: file.size
  }));
};

// Generate portfolio endpoint
app.post('/api/generate-portfolio', upload.fields([
  { name: 'processImages', maxCount: 20 },
  { name: 'finalProductImages', maxCount: 10 },
  { name: 'moodboardImages', maxCount: 15 }
]), async (req, res) => {
  try {
    const portfolioData = JSON.parse(req.body.portfolioData);
    
    // Convert uploaded files to base64
    const processImages = req.files.processImages ? convertFilesToBase64(req.files.processImages) : [];
    const finalProductImages = req.files.finalProductImages ? convertFilesToBase64(req.files.finalProductImages) : [];
    const moodboardImages = req.files.moodboardImages ? convertFilesToBase64(req.files.moodboardImages) : [];

    // Create prompt for Anthropic API
    const prompt = createPortfolioPrompt(portfolioData, {
      processImages,
      finalProductImages,
      moodboardImages
    });

    console.log('Generating portfolio with Anthropic API...');
    
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const generatedPortfolio = response.content[0].text;
    
    // Parse the generated portfolio (assuming it returns structured data)
    let portfolioCode;
    try {
      portfolioCode = JSON.parse(generatedPortfolio);
    } catch (parseError) {
      // If not JSON, treat as HTML/CSS code
      portfolioCode = {
        html: generatedPortfolio,
        css: '', // Extract CSS if needed
        metadata: {
          title: portfolioData.personalInfo.name || 'Portfolio',
          description: portfolioData.personalInfo.bio || 'Creative Portfolio'
        }
      };
    }

    res.json({
      success: true,
      portfolio: portfolioCode,
      metadata: {
        generatedAt: new Date().toISOString(),
        userInfo: {
          name: portfolioData.personalInfo.name,
          title: portfolioData.personalInfo.title
        }
      }
    });

  } catch (error) {
    console.error('Error generating portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate portfolio',
      details: error.message
    });
  }
});

// Create detailed prompt for Anthropic API
function createPortfolioPrompt(portfolioData, images) {
  const { personalInfo, projects, stylePreferences } = portfolioData;
  
  return `
You are an expert web designer and developer. Create a stunning, modern, and responsive portfolio website based on the following user information. Return the complete HTML with embedded CSS and JavaScript as a single file.

PERSONAL INFORMATION:
- Name: ${personalInfo.name}
- Title: ${personalInfo.title}
- Bio: ${personalInfo.bio}
- Email: ${personalInfo.email}
- Phone: ${personalInfo.phone}
- Website: ${personalInfo.website}
- LinkedIn: ${personalInfo.linkedin}
- Instagram: ${personalInfo.instagram}
- Behance: ${personalInfo.behance}
- Skills: ${personalInfo.skills.join(', ')}
- Experience: ${personalInfo.experience}
- Education: ${personalInfo.education}

PROJECTS:
${projects.map((project, index) => `
Project ${index + 1}:
- Title: ${project.title}
- Subtitle: ${project.subtitle}
- Category: ${project.category || project.customCategory}
- Overview: ${project.overview}
- Problem: ${project.problem}
- Solution: ${project.solution}
- Reflection: ${project.reflection}
- Tags: ${project.tags.join(', ')}
- Process Images: ${project.processImages.length} images uploaded
- Final Product Image: ${project.finalProductImage ? 'Yes' : 'No'}
`).join('\n')}

STYLE PREFERENCES:
- Color Scheme: ${stylePreferences.colorScheme}
- Layout Style: ${stylePreferences.layoutStyle}
- Typography: ${stylePreferences.typography}
- Mood: ${stylePreferences.mood}
- Moodboard Images: ${images.moodboardImages.length} inspiration images provided

REQUIREMENTS:
1. Create a modern, responsive single-page portfolio website
2. Use the specified color scheme and typography preferences
3. Include sections for: Hero, About, Projects, Skills, Contact
4. Make it mobile-responsive
5. Add smooth scrolling and modern animations
6. Use placeholder images for project images (use https://picsum.photos for placeholder images)
7. Implement a clean, professional design that matches the specified mood and style
8. Include proper meta tags and SEO optimization
9. Add interactive elements like hover effects and smooth transitions
10. Make sure the design reflects the user's creative field and personal brand

TECHNICAL SPECIFICATIONS:
- Single HTML file with embedded CSS and minimal JavaScript
- Use modern CSS features (Grid, Flexbox, CSS Variables)
- Implement smooth scrolling navigation
- Add responsive breakpoints for mobile, tablet, and desktop
- Include Font Awesome or similar icon library via CDN
- Use Google Fonts for typography
- Optimize for performance and accessibility

Please generate a complete, production-ready portfolio website that beautifully showcases this person's work and personality. The design should be modern, professional, and visually stunning.

Return ONLY the complete HTML code with embedded CSS and JavaScript. Do not include any explanations or additional text.
`;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Portfolio Generator API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;