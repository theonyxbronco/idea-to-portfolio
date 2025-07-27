const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

// Professional test data
const testPortfolioData = {
  personalInfo: {
    name: "Jane Smith",
    title: "Graphic Designer & Visual Artist",
    bio: "Passionate graphic designer with 5+ years of experience creating compelling visual stories. I specialize in brand identity, digital design, and creative problem-solving.",
    email: "jane.smith@example.com",
    phone: "(555) 123-4567",
    website: "https://janesmith.design",
    linkedin: "https://linkedin.com/in/janesmith",
    instagram: "https://instagram.com/janedesigns",
    behance: "https://behance.net/janesmith",
    skills: ["Adobe Creative Suite", "Brand Identity", "UI/UX Design", "Typography", "Digital Illustration"],
    experience: "5+ years in graphic design, working with startups and established brands to create compelling visual identities.",
    education: "BFA in Graphic Design from Art Institute"
  },
  projects: [
    {
      title: "Waloauto",
      subtitle: "Car Dealership Website",
      category: "Web Design",
      customCategory: "",
      overview: "Waloauto is a car-dealership that opened in Vantaa at the beginning of 2024. This project involved creating a comprehensive digital presence for the dealership.",
      problem: "Waloauto's digital presence was only on Nettiauto, limiting their ability to showcase their unique brand and connect directly with customers.",
      solution: "The primary objective was to create a dedicated digital platform that would represent the Waloauto brand and provide a seamless user experience for potential car buyers.",
      reflection: "We encountered many hurdles along the way, but the final result successfully established Waloauto's online presence and brand identity.",
      tags: ["Logo Design", "Brand Identity", "Tech", "Startup", "Corporate"],
      processImages: [],
      finalProductImage: null
    }
  ],
  moodboardImages: [],
  stylePreferences: {
    colorScheme: "minimal",
    layoutStyle: "minimal", 
    typography: "modern",
    mood: "professional"
  }
};

// Funky creative test data
const funkyTestPortfolioData = {
  personalInfo: {
    name: "Alex Thunder",
    title: "Creative Digital Artist & Wild Designer",
    bio: "Bold creative who breaks boundaries and creates mind-blowing digital experiences. I live for vibrant colors, wild animations, and designs that make people go 'WOW!' My work is an explosion of creativity that challenges conventional design norms.",
    email: "alex@thundercreative.com",
    phone: "(555) FUNKY-01",
    website: "https://alexthunder.art",
    linkedin: "https://linkedin.com/in/alexthunder",
    instagram: "https://instagram.com/thundercreative",
    behance: "https://behance.net/alexthunder",
    skills: ["Experimental Design", "3D Art", "Animation", "Creative Coding", "Visual Effects", "Brand Disruption"],
    experience: "6+ years creating award-winning designs that push creative boundaries and challenge traditional aesthetics.",
    education: "MFA in Experimental Digital Arts"
  },
  projects: [
    {
      title: "Neon Dreams Festival",
      subtitle: "Immersive Brand Experience",
      category: "Brand Design",
      customCategory: "",
      overview: "Created a complete visual identity for an underground electronic music festival that needed to capture the energy and wildness of the scene.",
      problem: "The festival organizers wanted something that would stand out in a crowded market and appeal to creative rebels and music lovers.",
      solution: "Developed a bold, neon-inspired brand with animated logos, holographic effects, and interactive design elements that brought the digital and physical worlds together.",
      reflection: "This project pushed me to experiment with new technologies and create designs that literally glowed. The festival sold out and became legendary in the underground scene.",
      tags: ["Neon Design", "Festival Branding", "Animation", "Experimental", "Glow Effects"],
      processImages: [],
      finalProductImage: null
    },
    {
      title: "Cosmic Coffee Shop",
      subtitle: "Space-Age Café Identity",
      category: "Brand Identity",
      customCategory: "",
      overview: "Transformed a small coffee shop into a galactic experience through otherworldly design and cosmic branding.",
      problem: "Local coffee shop wanted to differentiate from corporate chains and create a unique, memorable experience.",
      solution: "Created a space-themed brand with holographic menus, cosmic color schemes, and interactive wall projections that made customers feel like they were drinking coffee in space.",
      reflection: "This project proved that even small businesses can have big, bold identities. Sales increased 300% and it became the most Instagrammed café in the city.",
      tags: ["Space Design", "Interactive", "Cosmic", "Projection Mapping", "Experimental"],
      processImages: [],
      finalProductImage: null
    }
  ],
  moodboardImages: [],
  stylePreferences: {
    colorScheme: "vibrant",
    layoutStyle: "asymmetric", 
    typography: "bold",
    mood: "creative"
  }
};

class APITester {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      timeout: 120000 // 2 minutes timeout
    });
    
    this.uploadsFolders = {
      moodboard: path.join(__dirname, 'uploads', 'moodboard'),
      process: path.join(__dirname, 'uploads', 'process'),
      final: path.join(__dirname, 'uploads', 'final')
    };
  }

  async testHealthCheck() {
    console.log('🏥 Testing health check...');
    try {
      const response = await this.axios.get('/api/health');
      console.log('✅ Health check passed:', response.data.status);
      
      // Check if detailed health info is available
      if (response.data.services) {
        console.log('📊 Service status:', response.data.services);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }

  async testAPIInfo() {
    console.log('ℹ️  Testing API info...');
    try {
      const response = await this.axios.get('/api/info');
      console.log('✅ API info retrieved:', response.data.name);
      if (response.data.designStyles) {
        console.log('🎨 Available design styles:', response.data.designStyles);
      }
      return true;
    } catch (error) {
      console.error('❌ API info failed:', error.message);
      return false;
    }
  }

  async testPortfolioGeneration() {
    console.log('🎨 Testing portfolio generation (Professional style)...');
    
    try {
      // Reset rate limit before testing
      try {
        await this.axios.post('/api/reset-rate-limit');
        console.log('🔄 Rate limit reset');
      } catch (resetError) {
        console.log('⚠️  Could not reset rate limit (this is ok)');
      }

      // Test with minimal data first
      const formData = new FormData();
      formData.append('portfolioData', JSON.stringify(testPortfolioData));

      console.log('📤 Sending professional portfolio generation request...');
      const response = await this.axios.post('/api/generate-portfolio', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000 // 2 minutes timeout for AI generation
      });

      if (response.data.success && response.data.portfolio && response.data.portfolio.html) {
        console.log('✅ Professional portfolio generation successful');
        console.log(`📊 Generated ${response.data.portfolio.html.length} characters of HTML`);
        console.log(`🎨 Design style used: ${response.data.metadata.designStyle || 'default'}`);
        
        // Save the generated portfolio
        const outputPath = path.join(__dirname, 'generated_professional_portfolio.html');
        fs.writeFileSync(outputPath, response.data.portfolio.html);
        console.log(`💾 Professional portfolio saved to: ${outputPath}`);
        
        return true;
      } else {
        console.error('❌ Professional portfolio generation failed: Invalid response format');
        console.log('Response:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ Professional portfolio generation failed:', error.response?.data || error.message);
      
      // Provide specific guidance based on error type
      if (error.code === 'ECONNABORTED') {
        console.log('💡 The request timed out. This might be normal for the first AI request.');
      } else if (error.response?.status === 500 && error.response?.data?.error === 'API Configuration Error') {
        console.log('🔑 Make sure your ANTHROPIC_API_KEY is set in the .env file');
      } else if (error.response?.status === 429) {
        console.log('⏱️  Rate limit hit. Try waiting a moment or check DISABLE_RATE_LIMIT in .env');
      }
      
      return false;
    }
  }

  async testFunkyPortfolioGeneration() {
    console.log('🎨🌈 Testing SUPER FUNKY CREATIVE portfolio generation...');
    
    try {
      // Reset rate limit before testing
      try {
        await this.axios.post('/api/reset-rate-limit');
        console.log('🔄 Rate limit reset');
      } catch (resetError) {
        console.log('⚠️  Could not reset rate limit (this is ok)');
      }

      // Use the funky test data
      const formData = new FormData();
      formData.append('portfolioData', JSON.stringify(funkyTestPortfolioData));

      console.log('📤 Sending FUNKY portfolio generation request...');
      console.log('🎆 Expect: Neon colors, wild animations, cosmic vibes!');
      
      const response = await this.axios.post('/api/generate-portfolio', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000 // 2 minutes timeout for AI generation
      });

      if (response.data.success && response.data.portfolio && response.data.portfolio.html) {
        console.log('✅ FUNKY portfolio generation successful! 🎉');
        console.log(`📊 Generated ${response.data.portfolio.html.length} characters of WILD HTML`);
        console.log(`🎨 Design style used: ${response.data.metadata.designStyle || 'funky'}`);
        
        // Save the generated funky portfolio
        const outputPath = path.join(__dirname, 'generated_funky_portfolio.html');
        fs.writeFileSync(outputPath, response.data.portfolio.html);
        console.log(`💾 FUNKY portfolio saved to: ${outputPath}`);
        console.log('🌈 Open it in a browser to see the cosmic magic!');
        
        return true;
      } else {
        console.error('❌ Funky portfolio generation failed: Invalid response format');
        console.log('Response:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ Funky portfolio generation failed:', error.response?.data || error.message);
      
      // Provide specific guidance based on error type
      if (error.code === 'ECONNABORTED') {
        console.log('💡 The request timed out. This might be normal for the first AI request.');
      } else if (error.response?.status === 500 && error.response?.data?.error === 'API Configuration Error') {
        console.log('🔑 Make sure your ANTHROPIC_API_KEY is set in the .env file');
      } else if (error.response?.status === 429) {
        console.log('⏱️  Rate limit hit. Try waiting a moment or check DISABLE_RATE_LIMIT in .env');
      }
      
      return false;
    }
  }

  async testValidation() {
    console.log('🔍 Testing validation...');
    try {
      const invalidData = {
        personalInfo: {
          name: "",
          title: "Designer"
        },
        projects: [],
        stylePreferences: {}
      };

      const formData = new FormData();
      formData.append('portfolioData', JSON.stringify(invalidData));

      await this.axios.post('/api/generate-portfolio', formData, {
        headers: {
          ...formData.getHeaders(),
        }
      });

      console.error('❌ Validation test failed: Should have rejected invalid data');
      return false;
      
    } catch (error) {
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error === 'Validation Error' || errorData.validationErrors) {
          console.log('✅ Validation working correctly - rejected invalid data');
          return true;
        }
      }
      
      console.error('❌ Validation test failed with unexpected error:', error.response?.data || error.message);
      return false;
    }
  }

  async checkAPIKey() {
    console.log('🔑 Checking API key configuration...');
    try {
      const response = await this.axios.get('/api/health');
      const healthData = response.data;
      
      if (healthData.services && healthData.services.anthropic === 'configured') {
        console.log('✅ Anthropic API key is configured');
        return true;
      } else {
        console.log('⚠️  Anthropic API key may not be configured');
        console.log('💡 Add ANTHROPIC_API_KEY to your .env file');
        return false;
      }
    } catch (error) {
      console.error('❌ Could not check API key status');
      return false;
    }
  }

  createSampleUploadFolders() {
    console.log('📁 Creating sample upload folder structure...');
    
    Object.values(this.uploadsFolders).forEach(folder => {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✅ Created directory: ${folder}`);
      }
    });

    console.log('\n📋 Upload folder structure:');
    console.log('test/uploads/');
    console.log('├── moodboard/    (for moodboard images)');
    console.log('├── process/      (for project process images)');
    console.log('└── final/        (for final product images)');
    console.log('\n💡 Add your test images to these folders to test image processing');
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive API tests...\n');

    this.createSampleUploadFolders();

    // Check if server is running
    try {
      await this.axios.get('/api/health');
    } catch (error) {
      console.error('❌ Cannot connect to server. Make sure it\'s running on port 3001');
      console.error('   Run: npm run dev');
      return { passed: 0, total: 0, results: {} };
    }

    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'API Info', fn: () => this.testAPIInfo() },
      { name: 'API Key Check', fn: () => this.checkAPIKey() },
      { name: 'Validation', fn: () => this.testValidation() },
      { name: 'Professional Portfolio Generation', fn: () => this.testPortfolioGeneration() },
      { name: 'FUNKY Creative Portfolio 🌈', fn: () => this.testFunkyPortfolioGeneration() }
    ];

    const results = {};
    let passed = 0;
    let total = tests.length;

    for (const test of tests) {
      console.log(`\n--- ${test.name} ---`);
      try {
        const result = await test.fn();
        results[test.name] = result;
        if (result) passed++;
      } catch (error) {
        console.error(`❌ ${test.name} threw error:`, error.message);
        results[test.name] = false;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    
    Object.entries(results).forEach(([name, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${name}`);
    });

    console.log(`\n🎯 Total: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Your API is ready to use.');
      console.log('\n📂 Generated Files:');
      console.log('   - generated_professional_portfolio.html (Clean, professional design)');
      console.log('   - generated_funky_portfolio.html (Wild, creative design)');
      console.log('\n🌐 Open these HTML files in your browser to see the results!');
    } else {
      console.log('\n🔧 TROUBLESHOOTING GUIDE:');
      
      if (!results['API Key Check']) {
        console.log('1. 🔑 Set up your .env file with ANTHROPIC_API_KEY');
        console.log('   - Copy the .env.example to .env');
        console.log('   - Add your Anthropic API key');
      }
      
      if (!results['Professional Portfolio Generation'] || !results['FUNKY Creative Portfolio 🌈']) {
        console.log('2. 🤖 Portfolio generation failed:');
        console.log('   - Check your API key is valid');
        console.log('   - Ensure you have sufficient API credits');
        console.log('   - Check the server logs for detailed errors');
      }
      
      console.log('\n📚 Next steps:');
      console.log('1. Fix the failing tests above');
      console.log('2. Run the tests again with: npm test');
      console.log('3. Try different design styles by modifying the mood in stylePreferences');
    }

    return { passed, total, results };
  }
}

if (require.main === module) {
  const tester = new APITester();
  
  tester.runAllTests().then(({ passed, total }) => {
    process.exit(passed === total ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = APITester;