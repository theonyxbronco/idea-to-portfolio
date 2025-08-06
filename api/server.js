const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();
const axios = require('axios');
const JSZip = require('jszip');
const FormData = require('form-data');
const fileProcessor = require('./utils/fileProcessor');
const PromptGenerator = require('./utils/promptGenerator');
const ImageParser = require('./utils/imageParser');
const htmlValidator = require('./utils/htmlValidator');
const qualityAnalyzer = require('./utils/validators/qualityAnalyzer');
const { GoogleSheetsTracker } = require('./utils/googleSheets');
const {
  validatePortfolioData,
  rateLimit,
  requestLogger,
  securityHeaders,
  detailedHealthCheck,
  errorHandler
} = require('./middleware/portfolioMiddleware');
const app = express();
const PORT = process.env.PORT || 3001;
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tempDir = process.env.NODE_ENV === 'production' || process.env.VERCEL
  ? '/tmp' 
  : path.join(__dirname, 'temp');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
const cloudinaryUploader = require('./utils/cloudinaryUploader');
const crypto = require('crypto');
const imageParser = new ImageParser(anthropic);
const promptGenerator = new PromptGenerator();

const isValidCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Check if it's a valid Cloudinary URL format
  const cloudinaryRegex = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/[a-zA-Z0-9\/_.-]+$/;
  const isValid = cloudinaryRegex.test(url);
  
  // Additional check: ensure no nested URLs
  const hasNestedUrls = (url.match(/https:\/\//g) || []).length > 1;
  
  return isValid && !hasNestedUrls;
};

app.use(securityHeaders);
app.use(requestLogger);
app.use(rateLimit);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow all .vercel.app domains and localhost for development
  if (!origin || 
      origin.includes('.vercel.app') || 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔍 Preflight request from:', origin);
    return res.sendStatus(200);
  }
  
  console.log(`🔍 ${req.method} ${req.path} from:`, origin || 'no origin');
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all .vercel.app domains
    if (origin.includes('.vercel.app') || origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Allow specific domains
    const allowedOrigins = [
      'https://moodi-bice.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`CORS blocked origin: ${origin}`);
    callback(null, true); // Allow for now during debugging
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Explicit OPTIONS handler
app.options('*', (req, res) => {
  console.log('🔍 OPTIONS request from:', req.headers.origin);
  res.sendStatus(200);
});

app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve images from temp folders
app.use('/temp', express.static(path.join(__dirname, 'temp')));

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 50
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

const sheetsTracker = new GoogleSheetsTracker({
  clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  sheetId: process.env.GOOGLE_SHEETS_ID1,
  sheetName: process.env.GOOGLE_SHEETS_NAME1
});

// Helper to calculate SHA1 hash
const calculateSha = (content) => {
  return crypto.createHash('sha1').update(content).digest('hex');
};

const getFilesRecursively = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getFilesRecursively(fullPath)));
    } else if (entry.isFile()) {
      files.push({
        path: fullPath,
        relativePath: `/${path.relative(dir, fullPath).replace(/\\/g, '/')}`,
        content: await fs.readFile(fullPath)
      });
    }
  }

  return files;
};

app.post('/api/deploy-folder-to-netlify', async (req, res) => {
  const { htmlContent, netlifyToken, personName, userEmail, projectIds } = req.body;
  
  if (!htmlContent || !netlifyToken || !personName) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: htmlContent, netlifyToken, and personName are required'
    });
  }

  let siteId;
  const startTime = Date.now();

  try {
    const timestamp = Date.now();
    const siteName = `${personName.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 30)}-portfolio-${timestamp}`;
    
    console.log(`🚀 Starting deployment for: ${personName}`);

    // 1. Create new Netlify site
    console.log('🌐 Creating Netlify site...');
    const siteResponse = await axios.post(
      'https://api.netlify.com/api/v1/sites',
      { 
        name: siteName,
        custom_domain: null
      },
      { 
        headers: { 
          'Authorization': `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    siteId = siteResponse.data.id;
    const siteUrl = siteResponse.data.ssl_url || siteResponse.data.url;
    console.log(`✅ Site created successfully: ${siteId}`);

    // 2. Calculate SHA1 hash for HTML content
    const htmlSha1 = crypto.createHash('sha1').update(htmlContent, 'utf8').digest('hex');
    console.log(`🔐 HTML SHA1 calculated: ${htmlSha1}`);
    
    // 3. Create deployment with proper file digest format
    console.log('📦 Creating deployment with file digest...');
    const deployPayload = {
      files: {
        "index.html": htmlSha1  // Key is filename, value is SHA1
      },
      draft: false
    };
    
    const deployResponse = await axios.post(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      deployPayload,
      { 
        headers: { 
          'Authorization': `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const deployId = deployResponse.data.id;
    const requiredFiles = deployResponse.data.required || [];
    const deployState = deployResponse.data.state;
    
    console.log(`✅ Deployment created: ${deployId}`);
    console.log(`📋 Initial state: ${deployState}`);
    console.log(`📁 Required files: ${requiredFiles.length > 0 ? requiredFiles.join(', ') : 'none'}`);

    // 4. Upload HTML file if required by Netlify
    if (requiredFiles.includes(htmlSha1)) {
      console.log('📤 Uploading HTML file to Netlify...');
      
      try {
        await axios.put(
          `https://api.netlify.com/api/v1/deploys/${deployId}/files/index.html`,
          htmlContent,
          {
            headers: {
              'Authorization': `Bearer ${netlifyToken}`,
              'Content-Type': 'application/octet-stream'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000
          }
        );
        console.log('✅ HTML file uploaded successfully');
      } catch (uploadError) {
        console.error('❌ File upload failed:', uploadError.response?.data || uploadError.message);
        throw new Error(`File upload failed: ${uploadError.response?.data?.message || uploadError.message}`);
      }
    } else {
      console.log('ℹ️ No file upload required (file already exists on Netlify)');
    }

    // 5. Poll deployment status until ready
    console.log('⏳ Waiting for deployment to complete...');
    let currentDeployState = deployState || 'building';
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;
    const statusesToWaitFor = ['building', 'processing', 'uploading', 'prepared', 'preparing'];

    while (statusesToWaitFor.includes(currentDeployState) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;
      
      try {
        const statusResponse = await axios.get(
          `https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployId}`,
          { 
            headers: { 'Authorization': `Bearer ${netlifyToken}` },
            timeout: 10000
          }
        );
        
        currentDeployState = statusResponse.data.state;
        const progress = `(${Math.round((Date.now() - startTime) / 1000)}s elapsed)`;
        
        console.log(`🔄 Deploy status check ${attempts}/60: ${currentDeployState} ${progress}`);
        
        // Break on error states
        if (['error', 'crashed', 'cancelled'].includes(currentDeployState)) {
          console.error(`❌ Deploy failed with status: ${currentDeployState}`);
          break;
        }
        
      } catch (statusError) {
        console.warn(`⚠️ Status check ${attempts} failed:`, statusError.message);
        if (attempts >= maxAttempts - 5) break;
      }
    }

    // 6. Get final site information
    let finalSiteData;
    try {
      const finalSiteResponse = await axios.get(
        `https://api.netlify.com/api/v1/sites/${siteId}`,
        { headers: { 'Authorization': `Bearer ${netlifyToken}` } }
      );
      finalSiteData = finalSiteResponse.data;
    } catch (siteError) {
      console.warn('⚠️ Could not fetch final site data:', siteError.message);
      finalSiteData = siteResponse.data;
    }

    const finalUrl = finalSiteData.ssl_url || finalSiteData.url;
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`🎉 Deployment completed in ${totalTime}s`);
    console.log(`🌍 Live URL: ${finalUrl}`);
    console.log(`📊 Final status: ${currentDeployState}`);

    // 🆕 TRACK DEPLOYMENT IN GOOGLE SHEETS (Portfolio Details)
    if (userEmail && finalUrl && currentDeployState === 'ready') {
      try {
        console.log('📝 Tracking deployment in Portfolio Details sheet...');
        
        // Create Google Sheets tracker for Portfolio Details
        const portfolioDetailsTracker = new GoogleSheetsTracker({
          clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
          sheetId: process.env.GOOGLE_SHEETS_ID3, // Using GOOGLE_SHEETS_ID3
          sheetName: process.env.GOOGLE_SHEETS_NAME5 || 'Portfolio Details' // Using GOOGLE_SHEETS_NAME5
        });

        if (portfolioDetailsTracker.initialized) {
          // Ensure headers exist
          const headers = await portfolioDetailsTracker.getHeaders();
          if (!headers || headers.length === 0) {
            const defaultHeaders = [
              'Timestamp',
              'Email', 
              'Project ID(s)',
              'Portfolio URL'
            ];
            
            await portfolioDetailsTracker.sheets.spreadsheets.values.update({
              spreadsheetId: portfolioDetailsTracker.sheetId,
              range: `${portfolioDetailsTracker.sheetName}!1:1`,
              valueInputOption: 'USER_ENTERED',
              resource: {
                values: [defaultHeaders],
              },
            });
            
            console.log('✅ Portfolio Details sheet headers created');
          }

          // Format project IDs as JSON object {"1":"ID_NAME", "2":"ID_NAME"}
          let formattedProjectIds = '';
          if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
            const projectIdObject = {};
            projectIds.forEach((id, index) => {
              projectIdObject[(index + 1).toString()] = id;
            });
            formattedProjectIds = JSON.stringify(projectIdObject);
          } else if (typeof projectIds === 'string') {
            // If single project ID passed as string
            formattedProjectIds = JSON.stringify({"1": projectIds});
          } else {
            // Fallback if no project IDs provided
            formattedProjectIds = JSON.stringify({"1": "unknown"});
          }

          // Prepare data for the sheet
          const sheetData = [
            new Date().toISOString(), // Timestamp
            userEmail,                 // Email
            formattedProjectIds,       // Project ID(s) as JSON
            finalUrl                  // Portfolio URL
          ];

          // Append to sheet
          await portfolioDetailsTracker.sheets.spreadsheets.values.append({
            spreadsheetId: portfolioDetailsTracker.sheetId,
            range: `${portfolioDetailsTracker.sheetName}!A:D`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
              values: [sheetData],
            },
          });

          console.log(`✅ Portfolio deployment tracked successfully for: ${userEmail}`);
        } else {
          console.warn('⚠️ Portfolio Details sheet tracker not initialized');
        }
      } catch (trackingError) {
        console.error('❌ Error tracking portfolio deployment:', trackingError);
        // Don't fail the entire deployment if tracking fails
      }
    }

    return res.json({
      success: true,
      deployment: {
        url: finalUrl,
        siteId: siteId,
        deployId: deployId,
        status: currentDeployState,
        siteName: siteName,
        deployTime: totalTime,
        ready: currentDeployState === 'ready'
      },
      message: currentDeployState === 'ready' ? 
        'Portfolio deployed successfully!' : 
        `Portfolio deployed with status: ${currentDeployState}`
    });

  } catch (error) {
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.error(`❌ Deployment failed after ${totalTime}s:`, error.response?.data || error.message);
    
    // Clean up failed site
    if (siteId) {
      try {
        console.log('🧹 Attempting to clean up failed site...');
        await axios.delete(`https://api.netlify.com/api/v1/sites/${siteId}`, {
          headers: { 'Authorization': `Bearer ${netlifyToken}` }
        });
        console.log('✅ Failed site cleaned up successfully');
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up failed site:', cleanupError.message);
      }
    }
    
    const errorResponse = {
      success: false,
      error: 'Deployment failed',
      details: error.message,
      deployTime: totalTime
    };

    // Handle specific Netlify API error cases
    if (error.response?.data) {
      if (error.response.data.error) {
        errorResponse.error = error.response.data.error;
      }
      if (error.response.data.message) {
        errorResponse.details = error.response.data.message;
      }
      
      if (error.response.status === 401) {
        errorResponse.error = 'Invalid Netlify token';
        errorResponse.details = 'Please check your Netlify Personal Access Token';
      } else if (error.response.status === 403) {
        errorResponse.error = 'Insufficient permissions';
        errorResponse.details = 'Your Netlify token does not have permission to create sites';
      } else if (error.response.status === 422) {
        errorResponse.error = 'Invalid request data';
        errorResponse.details = 'The HTML content or site name may be invalid';
      }
    }

    const statusCode = error.response?.status || 500;
    return res.status(statusCode).json(errorResponse);
  }
});

app.get('/api/get-showroom-portfolios', async (req, res) => {
  try {
    console.log('🎭 Starting showroom data fetch...');

    // Create Google Sheets trackers for all three sheets
    const portfolioDetailsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME5 || 'Portfolio Details' // Deployment records
    });

    const userInfoTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info' // User information
    });

    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info' // Project details
    });

    // Check if all trackers are initialized
    if (!portfolioDetailsTracker.initialized || !userInfoTracker.initialized || !projectsTracker.initialized) {
      console.error('❌ One or more Google Sheets trackers not initialized');
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured properly'
      });
    }

    console.log('✅ All Google Sheets trackers initialized');

    // Fetch all data in parallel
    const [portfolioDetailsResponse, userInfoResponse, projectsResponse] = await Promise.all([
      portfolioDetailsTracker.sheets.spreadsheets.values.get({
        spreadsheetId: portfolioDetailsTracker.sheetId,
        range: `${portfolioDetailsTracker.sheetName}!A:D`, // Timestamp, Email, Project ID(s), Portfolio URL
      }),
      userInfoTracker.sheets.spreadsheets.values.get({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A:L`, // All user info columns
      }),
      projectsTracker.sheets.spreadsheets.values.get({
        spreadsheetId: projectsTracker.sheetId,
        range: `${projectsTracker.sheetName}!A:M`, // All project columns
      })
    ]);

    console.log('📊 Data fetched from all sheets');

    // Parse the data
    const portfolioDetailsRows = portfolioDetailsResponse.data.values || [];
    const userInfoRows = userInfoResponse.data.values || [];
    const projectsRows = projectsResponse.data.values || [];

    console.log(`📋 Found ${portfolioDetailsRows.length - 1} deployment records`);
    console.log(`👥 Found ${userInfoRows.length - 1} user records`);
    console.log(`📁 Found ${projectsRows.length - 1} project records`);

    // Skip header rows and process deployment records
    const deploymentRecords = portfolioDetailsRows.slice(1);
    const userRecords = userInfoRows.slice(1);
    const projectRecords = projectsRows.slice(1);

    // Create lookup maps for efficient data matching
    const userInfoMap = new Map();
    userRecords.forEach(row => {
      const email = row[1]; // Email is in column B (index 1)
      if (email) {
        userInfoMap.set(email, {
          name: row[2] || '',           // C: Name
          title: row[3] || '',          // D: Title  
          bio: row[4] || '',            // E: Bio
          phone: row[5] || '',          // F: Phone
          linkedin: row[6] || '',       // G: LinkedIn
          instagram: row[7] || '',      // H: Instagram
          skills: row[8] ? row[8].split(',').map(s => s.trim()).filter(Boolean) : [], // I: Skills
          experiences: row[9] || '',    // J: Experiences
          education: row[10] || '',     // K: Education
        });
      }
    });

    const projectInfoMap = new Map();
    projectRecords.forEach(row => {
      const projectId = row[2]; // Project ID is in column C (index 2)
      const status = row[12]; // Status is in column M (index 12)
      
      if (projectId && status === 'active') {
        projectInfoMap.set(projectId, {
          id: projectId,
          title: row[3] || '',          // D: Title
          subtitle: row[4] || '',       // E: Subtitle
          overview: row[5] || '',       // F: Overview
          category: row[6] || '',       // G: Category
          customCategory: row[7] || '', // H: Custom Category
          tags: row[8] ? row[8].split(',').map(t => t.trim()).filter(Boolean) : [], // I: Tags
          createdAt: row[0] || '',      // A: Timestamp
          processImagesCount: parseInt(row[9]) || 0, // J: Process Images Count
          finalImagesCount: parseInt(row[10]) || 0,  // K: Final Images Count
          imageMetadata: row[11] || '', // L: Image Metadata
        });
      }
    });

    console.log(`🗺️ Created lookup maps: ${userInfoMap.size} users, ${projectInfoMap.size} active projects`);

    // Process deployment records and build portfolio data
    const portfolios = [];
    
    for (const deploymentRow of deploymentRecords) {
      try {
        const timestamp = deploymentRow[0];     // A: Timestamp
        const email = deploymentRow[1];         // B: Email
        const projectIdsJson = deploymentRow[2]; // C: Project ID(s)
        const portfolioUrl = deploymentRow[3];   // D: Portfolio URL

        // Skip if missing essential data
        if (!email || !portfolioUrl || !projectIdsJson) {
          console.warn(`⚠️ Skipping incomplete deployment record: ${email}`);
          continue;
        }

        // Get user info
        const userInfo = userInfoMap.get(email);
        if (!userInfo || !userInfo.name) {
          console.warn(`⚠️ No user info found for: ${email}`);
          continue;
        }

        // Parse project IDs from JSON
        let projectIds = [];
        try {
          const parsedProjectIds = JSON.parse(projectIdsJson);
          projectIds = Object.values(parsedProjectIds); // Extract values from {"1":"id1", "2":"id2"}
        } catch (parseError) {
          console.warn(`⚠️ Could not parse project IDs for ${email}:`, projectIdsJson);
          continue;
        }

        // Get project details
        const projects = [];
        for (const projectId of projectIds) {
          const projectInfo = projectInfoMap.get(projectId);
          if (projectInfo) {
            projects.push(projectInfo);
          } else {
            console.warn(`⚠️ Project not found: ${projectId}`);
          }
        }

        // Only include portfolios that have at least one project
        if (projects.length === 0) {
          console.warn(`⚠️ No valid projects found for portfolio: ${email}`);
          continue;
        }

        // Build complete portfolio object
        const portfolio = {
          id: `portfolio_${email.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`,
          personName: userInfo.name,
          title: userInfo.title,
          email: email,
          phone: userInfo.phone,
          linkedin: userInfo.linkedin,
          instagram: userInfo.instagram,
          bio: userInfo.bio,
          portfolioUrl: portfolioUrl,
          deployedAt: timestamp,
          projects: projects,
          skills: userInfo.skills,
          experiences: userInfo.experiences,
          education: userInfo.education,
          totalProjects: projects.length,
          totalImages: projects.reduce((sum, p) => sum + p.processImagesCount + p.finalImagesCount, 0)
        };

        portfolios.push(portfolio);
        console.log(`✅ Added portfolio for ${userInfo.name} (${projects.length} projects, ${portfolio.totalImages} images)`);

      } catch (recordError) {
        console.error(`❌ Error processing deployment record:`, recordError);
        continue;
      }
    }

    // Sort portfolios by deployment date (newest first)
    portfolios.sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime());

    console.log(`🎭 Showroom ready with ${portfolios.length} portfolios`);

    // Return success response
    return res.json({
      success: true,
      data: portfolios,
      metadata: {
        totalPortfolios: portfolios.length,
        totalProjects: portfolios.reduce((sum, p) => sum + p.totalProjects, 0),
        totalImages: portfolios.reduce((sum, p) => sum + p.totalImages, 0),
        lastUpdated: new Date().toISOString(),
        dataSources: {
          deployments: `${process.env.GOOGLE_SHEETS_ID3}/${process.env.GOOGLE_SHEETS_NAME5}`,
          users: `${process.env.GOOGLE_SHEETS_ID3}/${process.env.GOOGLE_SHEETS_NAME2}`,
          projects: `${process.env.GOOGLE_SHEETS_ID3}/${process.env.GOOGLE_SHEETS_NAME3}`
        }
      }
    });

  } catch (error) {
    console.error('❌ Showroom API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch showroom data',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/save-user-info', async (req, res) => {
  try {
    const { personalInfo, userEmail, tier } = req.body;
    
    if (!personalInfo || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Basic validation
    if (!personalInfo.name?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    // Create Google Sheets tracker for User Info sheet (GOOGLE_SHEETS_ID3/User Info)
    const userInfoTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3, // Using GOOGLE_SHEETS_ID3
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info' // Using GOOGLE_SHEETS_NAME2
    });

    if (!userInfoTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured'
      });
    }

    // Check if user already exists
    let existingRowIndex = null;
    try {
      const response = await userInfoTracker.sheets.spreadsheets.values.get({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A:L`, // Updated to include Tier column (L)
      });

      const rows = response.data.values || [];
      existingRowIndex = rows.findIndex((row, index) => 
        index > 0 && row[1] === userEmail // Skip header row, check email column (index 1)
      );
    } catch (error) {
      console.warn('Could not check for existing user:', error.message);
    }

    // Helper function to safely convert arrays to JSON
    const arrayToJson = (arr) => {
      if (!arr || !Array.isArray(arr)) return '';
      if (arr.length === 0) return '';
      
      try {
        return JSON.stringify(arr);
      } catch {
        return arr.join(', '); // Fallback to comma-separated string
      }
    };

    // Helper function to safely convert skills array to comma-separated string
    const skillsToString = (skills) => {
      if (!skills || !Array.isArray(skills)) return '';
      return skills.join(', ');
    };

    // Prepare user data matching User Info sheet structure:
    // Timestamp | Email | Name | Title | Bio | Phone | LinkedIn | Instagram | Skills | Experiences | Education | Tier
    const userData = [
      new Date().toISOString(),                          // A: Timestamp
      userEmail,                                         // B: Email
      personalInfo.name || '',                           // C: Name
      personalInfo.title || '',                          // D: Title
      personalInfo.bio || '',                            // E: Bio
      personalInfo.phone || '',                          // F: Phone
      personalInfo.linkedin || '',                       // G: LinkedIn
      personalInfo.instagram || '',                      // H: Instagram
      skillsToString(personalInfo.skills),               // I: Skills (comma-separated)
      arrayToJson(personalInfo.experiences),             // J: Experiences (JSON array)
      arrayToJson(personalInfo.education),               // K: Education (JSON array)
      tier || 'Free'                                     // L: Tier (default to Free)
    ];

    if (existingRowIndex !== null && existingRowIndex !== -1) {
      // Update existing row (columns A-L)
      const actualRowIndex = existingRowIndex + 1;
      await userInfoTracker.sheets.spreadsheets.values.update({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A${actualRowIndex}:L${actualRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [userData],
        },
      });
      
      console.log(`Updated user info for: ${userEmail} in User Info sheet`);
    } else {
      // Add new row
      await userInfoTracker.sheets.spreadsheets.values.append({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A:L`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [userData],
        },
      });
      
      console.log(`Created new user info for: ${userEmail} in User Info sheet`);
    }

    res.json({
      success: true,
      message: existingRowIndex !== -1 ? 'User information updated' : 'User information saved',
      timestamp: new Date().toISOString(),
      tier: tier || 'Free',
      sheetUsed: `${process.env.GOOGLE_SHEETS_ID3}/${process.env.GOOGLE_SHEETS_NAME2 || 'User Info'}`
    });

  } catch (error) {
    console.error('Error saving user info to User Info sheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save user information',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.get('/api/get-user-info', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Create Google Sheets tracker for user info
    const userInfoTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info'
    });

    if (!userInfoTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured'
      });
    }

    // Get all data from the sheet
    const response = await userInfoTracker.sheets.spreadsheets.values.get({
      spreadsheetId: userInfoTracker.sheetId,
      range: `${userInfoTracker.sheetName}!A:L`, // Updated to include Tier column
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return res.json({
        success: true,
        data: null,
        message: 'No user data found'
      });
    }

    // Find user by email (column B, index 1)
    const userRow = rows.find((row, index) => 
      index > 0 && row[1] === email
    );

    if (!userRow) {
      return res.json({
        success: true,
        data: null,
        message: 'User not found'
      });
    }

    // Map row data to PersonalInfo structure based on your headers
    // Helper function to safely parse education/experience data
    const parseArrayField = (field, fallbackKey) => {
      if (!field) return [];
      
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // If not JSON, treat as string and convert to array format
        const trimmed = field.trim();
        if (trimmed) {
          return [{ [fallbackKey]: trimmed }];
        }
        return [];
      }
    };

    const personalInfo = {
      name: userRow[2] || '', // Full Name
      title: userRow[3] || '', // Job Title/Role
      bio: userRow[4] || '', // Bio/Description
      email: userRow[1] || '', // Email
      phone: userRow[5] || '', // Phone Number
      linkedin: userRow[6] || '', // LinkedIn URL
      instagram: userRow[7] || '', // Social Media Handle
      socialHandle: userRow[7] || '', // Alternative field name
      skills: userRow[8] ? userRow[8].split(',').map(s => s.trim()).filter(Boolean) : [], // Skills
      
      // Always return arrays for experiences and education to match frontend expectations
      experiences: parseArrayField(userRow[9], 'title'),
      education: parseArrayField(userRow[10], 'degree'),
      
      // Keep original fields for backward compatibility
      experience: userRow[9] || '',
      educationText: userRow[10] || '',
      
      // NEW: Include tier information
      tier: userRow[11] || 'Free' // L: Tier column
    };

    res.json({
      success: true,
      data: personalInfo
    });

  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user information',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});


const ensureUserInfoSheetHeaders = async () => {
  try {
    // Ensure User Info sheet headers with correct configuration
    const userInfoTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,           // Using GOOGLE_SHEETS_ID3
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info'  // Using GOOGLE_SHEETS_NAME2
    });

    if (userInfoTracker.initialized) {
      const userHeaders = await userInfoTracker.getHeaders();
      if (!userHeaders || userHeaders.length === 0 || !userHeaders.includes('Tier (Free, Student, Pro)')) {
        // Headers that match the save-user-info endpoint structure + Tier
        const defaultUserHeaders = [
          'Timestamp',              // A
          'Email',                  // B 
          'Name',                   // C
          'Title',                  // D
          'Bio',                    // E
          'Phone',                  // F
          'LinkedIn',               // G
          'Instagram',              // H
          'Skills',                 // I
          'Experiences',            // J
          'Education',              // K
          'Tier (Free, Student, Pro)' // L - NEW COLUMN
        ];
        
        await userInfoTracker.sheets.spreadsheets.values.update({
          spreadsheetId: userInfoTracker.sheetId,
          range: `${userInfoTracker.sheetName}!1:1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [defaultUserHeaders],
          },
        });
        
        console.log(`User Info sheet headers updated with Tier column in ${process.env.GOOGLE_SHEETS_ID3}/${process.env.GOOGLE_SHEETS_NAME2 || 'User Info'}`);
      } else {
        console.log(`User Info sheet headers already exist in ${process.env.GOOGLE_SHEETS_ID3}/${process.env.GOOGLE_SHEETS_NAME2 || 'User Info'}`);
      }
    }

  } catch (error) {
    console.error('Error ensuring User Info sheet headers:', error);
  }
};

ensureUserInfoSheetHeaders();

app.post('/api/save-project', upload.any(), async (req, res) => {
  try {
    const { projectData: projectDataString } = req.body;
    const files = req.files || [];
    
    if (!projectDataString) {
      return res.status(400).json({
        success: false,
        error: 'Project data is required'
      });
    }

    const projectData = JSON.parse(projectDataString);
    
    if (!projectData.userEmail || !projectData.title?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'User email and project title are required'
      });
    }

    // Create Google Sheets tracker for projects
    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (!projectsTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured for projects'
      });
    }

    // Generate unique project ID
    const projectId = `${projectData.userEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Upload images to Cloudinary or save locally
    let savedImages = null;
    if (files.length > 0) {
      try {
        if (cloudinaryUploader.initialized) {
          console.log('🌩️ Uploading project images to Cloudinary...');
          savedImages = await cloudinaryUploader.uploadProjectImages(files, projectId, projectData.userEmail);
        } else {
          console.log('⚠️ Cloudinary not configured, using local storage');
          
          // Local storage fallback
          const projectFolder = path.join(tempDir, 'projects', projectId);
          await fs.ensureDir(projectFolder);
          
          savedImages = {
            process: [],
            final: null,
            projectFolder: projectFolder
          };

          for (const file of files) {
            const fieldName = file.fieldname || '';
            
            if (fieldName === 'final_image') {
              const fileExt = path.extname(file.originalname);
              const fileName = `final${fileExt}`;
              const filePath = path.join(projectFolder, fileName);
              
              await fs.writeFile(filePath, file.buffer);
              savedImages.final = {
                filename: fileName,
                originalName: file.originalname,
                path: filePath,
                relativePath: `./${fileName}`
              };
            } else if (fieldName.startsWith('process_')) {
              const fileExt = path.extname(file.originalname);
              const fileName = `process_${savedImages.process.length + 1}${fileExt}`;
              const filePath = path.join(projectFolder, fileName);
              
              await fs.writeFile(filePath, file.buffer);
              savedImages.process.push({
                filename: fileName,
                originalName: file.originalname,
                path: filePath,
                relativePath: `./${fileName}`
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Image upload failed:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to upload images',
          details: error.message
        });
      }
    }

    // Prepare image metadata for Google Sheets
    let imageMetadata = {};
    if (savedImages) {
      if (cloudinaryUploader.initialized) {
        // Cloudinary format - use Cloudinary URLs
        imageMetadata = {
          processImages: savedImages.process ? savedImages.process.map(img => ({
            filename: img.originalName,
            url: img.cloudinaryUrl, // Using cloudinaryUrl instead of path
            publicId: img.publicId,
            width: img.width,
            height: img.height,
            format: img.format
          })) : [],
          finalImages: savedImages.final ? (Array.isArray(savedImages.final) ? 
            savedImages.final.map(img => ({
              filename: img.originalName,
              url: img.cloudinaryUrl, // Using cloudinaryUrl instead of path
              publicId: img.publicId,
              width: img.width,
              height: img.height,
              format: img.format
            })) : [{
              filename: savedImages.final.originalName,
              url: savedImages.final.cloudinaryUrl,
              publicId: savedImages.final.publicId,
              width: savedImages.final.width,
              height: savedImages.final.height,
              format: savedImages.final.format
            }]) : [],
          folder: `portfolio${projectId}`,
          storageType: 'cloudinary'
        };
      } else {
        // Local storage format
        imageMetadata = {
          processImages: savedImages.process ? savedImages.process.map(img => ({
            filename: img.originalName,
            path: img.relativePath
          })) : [],
          finalImages: savedImages.final ? [{
            filename: savedImages.final.originalName,
            path: savedImages.final.relativePath
          }] : [],
          folder: projectId,
          storageType: 'local'
        };
      }
    }

    const sheetData = [
      new Date().toISOString(),
      projectData.userEmail,
      projectId,
      projectData.title || '',
      projectData.subtitle || '',
      projectData.overview || '',
      projectData.category || projectData.customCategory || '',
      projectData.customCategory || '',
      (projectData.tags || []).join(', '),
      savedImages ? (savedImages.process ? savedImages.process.length : 0) : 0,
      savedImages ? (savedImages.final ? (Array.isArray(savedImages.final) ? savedImages.final.length : 1) : 0) : 0,
      JSON.stringify(imageMetadata),
      'active'
    ];
    
    // Save to Google Sheets
    await projectsTracker.sheets.spreadsheets.values.append({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A:M`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [sheetData],
      },
    });

    console.log(`Successfully saved project for: ${projectData.userEmail}`);
    
    res.json({
      success: true,
      message: 'Project saved successfully',
      projectId: projectId,
      images: savedImages,
      storageType: cloudinaryUploader.initialized ? 'cloudinary' : 'local',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save project',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.post('/api/update-project', upload.any(), async (req, res) => {
  try {
    const { projectData: projectDataString } = req.body;
    const files = req.files || [];
    
    if (!projectDataString) {
      return res.status(400).json({
        success: false,
        error: 'Project data is required'
      });
    }

    const projectData = JSON.parse(projectDataString);
    
    if (!projectData.userEmail || !projectData.title?.trim() || !projectData.id) {
      return res.status(400).json({
        success: false,
        error: 'User email, project title, and project ID are required'
      });
    }

    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (!projectsTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured for projects'
      });
    }

    // Get all rows to find the exact row to update
    const response = await projectsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A:Z`, // Get all columns
    });

    const rows = response.data.values || [];
    const projectRowIndex = rows.findIndex((row, index) => 
      index > 0 && row[2] === projectData.id && row[1] === projectData.userEmail
    );

    if (projectRowIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get existing image metadata
    let existingImageData = {};
    try {
      const existingMetadata = rows[projectRowIndex][11]; // Column L contains image metadata
      if (existingMetadata) {
        existingImageData = JSON.parse(existingMetadata);
      }
    } catch (error) {
      console.warn('Could not parse existing image metadata');
    }

    // Handle image updates if new files provided
    let savedImages = null;
    const projectFolder = path.join(tempDir, 'projects', projectData.id);

    if (files.length > 0) {
      try {
        if (cloudinaryUploader.initialized) {
          savedImages = await cloudinaryUploader.uploadProjectImages(files, projectData.id, projectData.userEmail);
        } else {
          await fs.ensureDir(projectFolder);
          
          savedImages = {
            process: [],
            final: null,
            projectFolder: projectFolder
          };

          for (const file of files) {
            const fieldName = file.fieldname || '';
            
            if (fieldName === 'final_image') {
              const fileExt = path.extname(file.originalname);
              const fileName = `final${fileExt}`;
              const filePath = path.join(projectFolder, fileName);
              
              await fs.writeFile(filePath, file.buffer);
              savedImages.final = {
                filename: fileName,
                originalName: file.originalname,
                path: filePath,
                relativePath: `./${fileName}`
              };
            } else if (fieldName.startsWith('process_')) {
              const fileExt = path.extname(file.originalname);
              const fileName = `process_${savedImages.process.length + 1}${fileExt}`;
              const filePath = path.join(projectFolder, fileName);
              
              await fs.writeFile(filePath, file.buffer);
              savedImages.process.push({
                filename: fileName,
                originalName: file.originalname,
                path: filePath,
                relativePath: `./${fileName}`
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to update project images:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update project images',
          details: error.message
        });
      }
    }

    // Merge existing and new image data
    let imageMetadata = {};
    if (cloudinaryUploader.initialized && savedImages) {
      imageMetadata = {
        processImages: [
          ...(existingImageData.processImages || []).filter(img => 
            !savedImages.process.some(newImg => newImg.publicId === img.publicId)
          ),
          ...(savedImages.process || []).map(img => ({
            filename: img.originalName,
            url: img.cloudinaryUrl,
            publicId: img.publicId,
            width: img.width,
            height: img.height,
            format: img.format
          }))
        ],
        finalImages: savedImages.final ? [
          ...(existingImageData.finalImages || []).filter(img => 
            !savedImages.final.some(newImg => newImg.publicId === img.publicId)
          ),
          ...(Array.isArray(savedImages.final) ? 
            savedImages.final.map(img => ({
              filename: img.originalName,
              url: img.cloudinaryUrl,
              publicId: img.publicId,
              width: img.width,
              height: img.height,
              format: img.format
            })) : [{
              filename: savedImages.final.originalName,
              url: savedImages.final.cloudinaryUrl,
              publicId: savedImages.final.publicId,
              width: savedImages.final.width,
              height: savedImages.final.height,
              format: savedImages.final.format
            }]
          )] : (existingImageData.finalImages || []),
        folder: `portfolio${projectData.id}`,
        storageType: 'cloudinary'
      };
    } else {
      imageMetadata = {
        processImages: [
          ...(existingImageData.processImages || []),
          ...(savedImages?.process?.map(img => ({
            filename: img.originalName,
            path: img.relativePath
          })) || [])
        ],
        finalImages: savedImages?.final ? [{
          filename: savedImages.final.originalName,
          path: savedImages.final.relativePath
        }] : (existingImageData.finalImages || []),
        folder: projectData.id,
        storageType: 'local'
      };
    }

    const updatedData = [
      new Date().toISOString(), // Updated timestamp (A)
      projectData.userEmail, // Email (B)
      projectData.id, // Project ID (C)
      projectData.title || '', // Title (D)
      projectData.subtitle || '', // Subtitle (E)
      projectData.overview || '', // Overview (F) - This was missing!
      projectData.category || projectData.customCategory || '', // Category (G)
      projectData.customCategory || '', // Custom Category (H)
      (projectData.tags || []).join(', '), // Tags (I)
      imageMetadata.processImages.length, // Process images count (J)
      imageMetadata.finalImages.length, // Final images count (K)
      JSON.stringify(imageMetadata), // Image metadata (L)
      'active' // Status (M)
    ];

    // Update the specific row
    const actualRowIndex = projectRowIndex + 1; // Convert to 1-based index
    await projectsTracker.sheets.spreadsheets.values.update({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A${actualRowIndex}:M${actualRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [updatedData],
      },
    });

    console.log(`Successfully updated project ${projectData.id} for: ${projectData.userEmail}`);
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      projectId: projectData.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.get('/api/get-user-projects', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Create Google Sheets tracker for projects
    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (!projectsTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured'
      });
    }

    // Get all data from the sheet
    const response = await projectsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A:P`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Filter projects for this user (email in column B, index 1) and active status
    const userProjects = rows
    .slice(1) // Skip header row
    .filter(row => row[1] === email && row[12] === 'active') // Status is now column 12 (M)
    .map(row => ({
      id: row[2] || '', // Project ID
      title: row[3] || '',
      subtitle: row[4] || '',
      overview: row[5] || '',
      category: row[6] || '',
      customCategory: row[7] || '',
      tags: row[8] ? row[8].split(',').map(t => t.trim()).filter(Boolean) : [],
      // Removed: problem, solution, reflection
      processImages: [], // Will be empty for display purposes
      finalProductImage: null, // Will be null for display purposes
      createdAt: row[0] || new Date().toISOString(),
      updatedAt: row[0] || new Date().toISOString(),
      imageMetadata: row[11] ? (() => { // Image metadata is now column 11 (L)
        try {
          return JSON.parse(row[11]);
        } catch {
          return {};
        }
      })() : {}
    }));

    res.json({
      success: true,
      data: userProjects
    });

  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user projects',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.delete('/api/delete-project', async (req, res) => {
  try {
    const { projectId, userEmail } = req.body;
    
    if (!projectId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Project ID and user email are required'
      });
    }

    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (!projectsTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured for projects'
      });
    }

    // Get all rows to find the exact row to delete
    const response = await projectsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A:Z`,
    });

    const rows = response.data.values || [];
    const projectRowIndex = rows.findIndex((row, index) => 
      index > 0 && row[2] === projectId && row[1] === userEmail
    );

    if (projectRowIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Instead of deleting the row, mark it as 'deleted' (soft delete)
    const actualRowIndex = projectRowIndex + 1; // Convert to 1-based index
    await projectsTracker.sheets.spreadsheets.values.update({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!M${actualRowIndex}`, // Status column
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['deleted']],
      },
    });

    // Clean up project files
    const projectFolder = path.join(tempDir, 'projects', projectId);
    if (await fs.pathExists(projectFolder)) {
      await fs.remove(projectFolder).catch(() => {});
    }

    if (cloudinaryUploader.initialized) {
      try {
        // Get image metadata to delete from Cloudinary
        const imageMetadata = rows[projectRowIndex][11]; // Column L
        if (imageMetadata) {
          const parsedMetadata = JSON.parse(imageMetadata);
          if (parsedMetadata.storageType === 'cloudinary') {
            // Delete process images
            if (parsedMetadata.processImages) {
              await Promise.all(parsedMetadata.processImages.map(img => 
                cloudinaryUploader.deleteImage(img.publicId).catch(() => {})
              ));
            }
            // Delete final images
            if (parsedMetadata.finalImages) {
              await Promise.all(parsedMetadata.finalImages.map(img => 
                cloudinaryUploader.deleteImage(img.publicId).catch(() => {})
              ));
            }
          }
        }
      } catch (error) {
        console.warn('Error cleaning up Cloudinary images:', error);
      }
    }

    console.log(`Successfully deleted project ${projectId} for: ${userEmail}`);
    
    res.json({
      success: true,
      message: 'Project deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.get('/api/get-portfolio-data', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Create trackers for both sheets
    const userInfoTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info'
    });

    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (!userInfoTracker.initialized || !projectsTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured'
      });
    }

    // Fetch user info and projects in parallel
    const [userInfoResponse, projectsResponse] = await Promise.all([
      userInfoTracker.sheets.spreadsheets.values.get({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A:N`,
      }),
      projectsTracker.sheets.spreadsheets.values.get({
        spreadsheetId: projectsTracker.sheetId,
        range: `${projectsTracker.sheetName}!A:P`,
      })
    ]);

    // Process user info
    let personalInfo = null;
    const userRows = userInfoResponse.data.values || [];
    if (userRows.length > 1) {
      const userRow = userRows.find((row, index) => 
        index > 0 && row[1] === email
      );

      if (userRow) {
        personalInfo = {
          name: userRow[2] || '',
          title: userRow[3] || '',
          bio: userRow[4] || '',
          email: userRow[1] || '',
          phone: userRow[5] || '',
          website: userRow[6] || '',
          linkedin: userRow[7] || '',
          instagram: userRow[8] || '',
          behance: userRow[9] || '',
          dribbble: userRow[10] || '',
          skills: userRow[11] ? userRow[11].split(',').map(s => s.trim()).filter(Boolean) : [],
          experience: userRow[12] || '',
          education: userRow[13] || ''
        };
      }
    }

    // Process projects
    let projects = [];
    const projectRows = projectsResponse.data.values || [];
    if (projectRows.length > 1) {
      projects = projectRows
      .slice(1) // Skip header row
      .filter(row => row[1] === email && row[12] === 'active') // Status is now column 12 (M)
      .map(row => ({
        id: row[2] || '',
        title: row[3] || '',
        subtitle: row[4] || '',
        overview: row[5] || '',
        category: row[6] || '',
        customCategory: row[7] || '',
        tags: row[8] ? row[8].split(',').map(t => t.trim()).filter(Boolean) : [],
        // Removed: problem, solution, reflection
        processImages: [], // Empty for portfolio generation
        finalProductImage: null, // Will be handled by image loading
        createdAt: row[0] || new Date().toISOString(),
        imageMetadata: row[11] ? (() => { // Image metadata is now column 11 (L)
          try {
            return JSON.parse(row[11]);
          } catch {
            return {};
          }
        })() : {}
      }));
    }

    res.json({
      success: true,
      data: {
        personalInfo,
        projects,
        hasUserInfo: !!personalInfo,
        projectCount: projects.length
      }
    });

  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio data',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.post('/api/save-multiple-projects', upload.any(), async (req, res) => {
  try {
    const { projectsData: projectsDataString } = req.body;
    const files = req.files || [];
    
    if (!projectsDataString) {
      return res.status(400).json({
        success: false,
        error: 'Projects data is required'
      });
    }

    const projectsData = JSON.parse(projectsDataString);
    
    if (!Array.isArray(projectsData) || projectsData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one project is required'
      });
    }

    // Validate that all projects have required fields
    for (const project of projectsData) {
      if (!project.userEmail || !project.title?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'User email and project title are required for all projects'
        });
      }
    }

    // Create Google Sheets tracker for projects
    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (!projectsTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured for projects'
      });
    }

    const savedProjects = [];

    // Process each project
    for (let projectIndex = 0; projectIndex < projectsData.length; projectIndex++) {
      const projectData = projectsData[projectIndex];
      
      // Generate unique project ID
      const projectId = `${projectData.userEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${projectIndex}`;

      // Handle images for this project
      let savedImages = null;
      const projectFiles = files.filter(file => 
        file.fieldname.startsWith(`project_${projectIndex}_`)
      );

      if (projectFiles.length > 0) {
        try {
          if (cloudinaryUploader.initialized) {
            console.log(`🌩️ Uploading project ${projectIndex + 1} images to Cloudinary...`);
            savedImages = await cloudinaryUploader.uploadProjectImages(projectFiles, projectId, projectData.userEmail);
          } else {
            console.log(`⚠️ Cloudinary not configured, using local storage for project ${projectIndex + 1}`);
            
            // Local storage fallback
            const projectFolder = path.join(tempDir, 'projects', projectId);
            await fs.ensureDir(projectFolder);
            
            savedImages = {
              process: [],
              final: null,
              projectFolder: projectFolder
            };

            for (const file of projectFiles) {
              const fieldName = file.fieldname || '';
              
              if (fieldName === `project_${projectIndex}_final`) {
                const fileExt = path.extname(file.originalname);
                const fileName = `final${fileExt}`;
                const filePath = path.join(projectFolder, fileName);
                
                await fs.writeFile(filePath, file.buffer);
                savedImages.final = {
                  filename: fileName,
                  originalName: file.originalname,
                  path: filePath,
                  relativePath: `./${fileName}`
                };
              } else if (fieldName.startsWith(`project_${projectIndex}_process_`)) {
                const fileExt = path.extname(file.originalname);
                const fileName = `process_${savedImages.process.length + 1}${fileExt}`;
                const filePath = path.join(projectFolder, fileName);
                
                await fs.writeFile(filePath, file.buffer);
                savedImages.process.push({
                  filename: fileName,
                  originalName: file.originalname,
                  path: filePath,
                  relativePath: `./${fileName}`
                });
              }
            }
          }
        } catch (error) {
          console.error(`❌ Image upload failed for project ${projectIndex + 1}:`, error);
          // Continue with other projects even if one fails
        }
      }

      // Prepare image metadata for Google Sheets
      let imageMetadata = {};
      if (savedImages) {
        if (cloudinaryUploader.initialized) {
          // Cloudinary format - use Cloudinary URLs
          imageMetadata = {
            processImages: savedImages.process ? savedImages.process.map(img => ({
              filename: img.originalName,
              url: img.cloudinaryUrl, // Using cloudinaryUrl instead of path
              publicId: img.publicId,
              width: img.width,
              height: img.height,
              format: img.format
            })) : [],
            finalImages: savedImages.final ? (Array.isArray(savedImages.final) ? 
              savedImages.final.map(img => ({
                filename: img.originalName,
                url: img.cloudinaryUrl, // Using cloudinaryUrl instead of path
                publicId: img.publicId,
                width: img.width,
                height: img.height,
                format: img.format
              })) : [{
                filename: savedImages.final.originalName,
                url: savedImages.final.cloudinaryUrl,
                publicId: savedImages.final.publicId,
                width: savedImages.final.width,
                height: savedImages.final.height,
                format: savedImages.final.format
              }]) : [],
            folder: `portfolio${projectId}`,
            storageType: 'cloudinary'
          };
        } else {
          // Local storage format
          imageMetadata = {
            processImages: savedImages.process ? savedImages.process.map(img => ({
              filename: img.originalName,
              path: img.relativePath
            })) : [],
            finalImages: savedImages.final ? [{
              filename: savedImages.final.originalName,
              path: savedImages.final.relativePath
            }] : [],
            folder: projectId,
            storageType: 'local'
          };
        }
      }

      // Prepare project data for Google Sheets
      const sheetData = [
        new Date().toISOString(),
        projectData.userEmail,
        projectId,
        projectData.title || '',
        projectData.subtitle || '',
        projectData.overview || '',
        projectData.category || projectData.customCategory || '',
        projectData.customCategory || '',
        (projectData.tags || []).join(', '),
        savedImages ? (savedImages.process ? savedImages.process.length : 0) : 0,
        savedImages ? (savedImages.final ? (Array.isArray(savedImages.final) ? savedImages.final.length : 1) : 0) : 0,
        JSON.stringify(imageMetadata),
        'active'
      ];

      // Save to Google Sheets
      await projectsTracker.sheets.spreadsheets.values.append({
        spreadsheetId: projectsTracker.sheetId,
        range: `${projectsTracker.sheetName}!A:M`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [sheetData],
        },
      });

      savedProjects.push({
        id: projectId,
        title: projectData.title,
        status: 'saved',
        storageType: cloudinaryUploader.initialized ? 'cloudinary' : 'local'
      });

      console.log(`Successfully saved project ${projectIndex + 1}: ${projectData.title} for: ${projectData.userEmail}`);
    }

    res.json({
      success: true,
      message: `Successfully saved ${savedProjects.length} projects`,
      projects: savedProjects,
      storageType: cloudinaryUploader.initialized ? 'cloudinary' : 'local',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving multiple projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save projects',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.post('/api/save-draft', async (req, res) => {
  try {
    const { email, htmlContent } = req.body;
    
    if (!email || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Email and HTML content are required'
      });
    }

    // Create Google Sheets tracker for drafts
    const draftsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME4 || 'Portfolio Drafts'
    });

    if (!draftsTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured for drafts'
      });
    }

    // Prepare data for the sheet
    const sheetData = [
      new Date().toISOString(), // Timestamp
      email,                    // Email
      htmlContent               // HTML content
    ];

    // Append the data
    await draftsTracker.sheets.spreadsheets.values.append({
      spreadsheetId: draftsTracker.sheetId,
      range: `${draftsTracker.sheetName}!A:C`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [sheetData],
      },
    });

    res.json({
      success: true,
      message: 'Draft saved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save draft',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.get('/api/get-drafts', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const draftsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME4 || 'Portfolio Drafts'
    });

    if (!draftsTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured'
      });
    }

    const response = await draftsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: draftsTracker.sheetId,
      range: `${draftsTracker.sheetName}!A:C`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Filter drafts for this user (email in column B, index 1)
    const userDrafts = rows
      .slice(1) // Skip header row
      .filter(row => row[1] === email)
      .map(row => ({
        id: `draft_${row[0]?.replace(/[^a-zA-Z0-9]/g, '_') || Date.now()}`,
        name: `Draft from ${new Date(row[0]).toLocaleDateString()}`,
        htmlContent: row[2] || '',
        createdAt: row[0] || new Date().toISOString(),
        lastModified: row[0] || new Date().toISOString(),
        status: 'draft'
      }));

    res.json({
      success: true,
      data: userDrafts
    });

  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch drafts',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

const ensureSheetHeaders = async () => {
  try {
    // Ensure User Info sheet headers (GOOGLE_SHEETS_ID3/GOOGLE_SHEETS_NAME2)
    const userInfoTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info'
    });

    const draftsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME4 || 'Portfolio Drafts'
    });

    if (draftsTracker.initialized) {
      const draftsHeaders = await draftsTracker.getHeaders();
      if (!draftsHeaders || draftsHeaders.length === 0) {
        const defaultDraftHeaders = [
          'Timestamp',
          'Email',
          'HTML content'
        ];
        
        await draftsTracker.sheets.spreadsheets.values.update({
          spreadsheetId: draftsTracker.sheetId,
          range: `${draftsTracker.sheetName}!1:1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [defaultDraftHeaders],
          },
        });
        
        console.log('Portfolio Drafts sheet headers created');
      }
    }

    if (userInfoTracker.initialized) {
      const userHeaders = await userInfoTracker.getHeaders();
      if (!userHeaders || userHeaders.length === 0 || !userHeaders.includes('Tier (Free, Student, Pro)')) {
        const defaultUserHeaders = [
          'Timestamp',              // A
          'Email',                  // B 
          'Name',                   // C
          'Title',                  // D
          'Bio',                    // E
          'Phone',                  // F
          'LinkedIn',               // G
          'Instagram',              // H
          'Skills',                 // I
          'Experiences',            // J
          'Education',              // K
          'Tier (Free, Student, Pro)' // L - NEW COLUMN
        ];
        
        await userInfoTracker.sheets.spreadsheets.values.update({
          spreadsheetId: userInfoTracker.sheetId,
          range: `${userInfoTracker.sheetName}!1:1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [defaultUserHeaders],
          },
        });
        
        console.log('User Info sheet headers created with Tier column');
      }
    }

    // Ensure Project Info sheet headers (GOOGLE_SHEETS_ID3/GOOGLE_SHEETS_NAME3)
    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (projectsTracker.initialized) {
      const projectHeaders = await projectsTracker.getHeaders();
      if (!projectHeaders || projectHeaders.length === 0) {
        const defaultProjectHeaders = [
          'Timestamp',           // A
          'Email',              // B  
          'Project ID',         // C
          'Title',              // D
          'Subtitle',           // E
          'Overview',           // F
          'Category',           // G
          'Custom Category',    // H
          'Tags',               // I
          'Process Images Count', // J
          'Final Image Count',    // K
          'Image Metadata',       // L
          'Status'               // M
        ];
        
        await projectsTracker.sheets.spreadsheets.values.update({
          spreadsheetId: projectsTracker.sheetId,
          range: `${projectsTracker.sheetName}!1:1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [defaultProjectHeaders],
          },
        });
        
        console.log('Project Info sheet headers created');
      }
    }

  } catch (error) {
    console.error('Error ensuring sheet headers:', error);
  }
};

ensureSheetHeaders();

app.post('/api/generate-portfolio', upload.any(), validatePortfolioData, async (req, res) => {
  const processingStartTime = Date.now();
  
  try {
    const portfolioData = req.portfolioData;
    const files = req.files || [];
    const isContinuation = req.body.continueGeneration === 'true';
    const partialHtml = req.body.partialHtml;

    // Track in Google Sheets if available
    if (sheetsTracker.initialized) {
      sheetsTracker.appendData(
        portfolioData, 
        req.headers['user-agent'] || 'unknown',
        req.headers['sec-ch-ua-width'] || 'unknown'
      ).catch(() => {});
    }

    // 🚨 FIXED: Get complete project data FIRST
    console.log('📊 Fetching complete project data from Google Sheets...');
    const completeProjectData = await getProjectImagesFromSheets(portfolioData.personalInfo.email);
    
    console.log(`✅ Retrieved ${completeProjectData.totalProjects || 0} projects with ${completeProjectData.totalImages || 0} total images`);

    // 🚨 FIXED: Handle moodboard images with INSANE analysis
    let insaneAnalysis = null;
    const moodboardFiles = files.filter(file => {
      const fieldName = (file.fieldname || '').toLowerCase();
      const originalName = (file.originalname || '').toLowerCase();
      return fieldName.includes('moodboard') || originalName.includes('moodboard');
    });

    if (moodboardFiles.length > 0 && !isContinuation) {
      try {
        console.log(`🧠 Running INSANE Analysis on ${moodboardFiles.length} moodboard images...`);
        
        // Create temporary paths for file-based analysis
        const moodboardPaths = await Promise.all(
          moodboardFiles.map(async (file) => {
            const tempPath = path.join(tempDir, 'temp_analysis', `moodboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`);
            await fs.ensureDir(path.dirname(tempPath));
            await fs.writeFile(tempPath, file.buffer);
            return tempPath;
          })
        );

        // 🚨 FIXED: Use the complete INSANE analysis system
        insaneAnalysis = await imageParser.runInsaneAnalysis(
          moodboardPaths,
          portfolioData,
          completeProjectData
        );
        
        // Clean up temporary files immediately after analysis
        await Promise.all(moodboardPaths.map(tempPath => 
          fs.remove(tempPath).catch(() => {})
        ));
        
        console.log(`🎯 INSANE Analysis completed with ${insaneAnalysis.systemStatus} status (${Math.round(insaneAnalysis.overallConfidence * 100)}% confidence)`);
        
      } catch (analysisError) {
        console.error('❌ INSANE Analysis failed:', analysisError);
        
        // 🚨 FIXED: Fallback with proper error handling
        console.log('⚠️ Falling back to uploaded image analysis...');
        try {
          insaneAnalysis = await imageParser.analyzeUploadedImages(moodboardFiles, 'moodboard');
          
          // Complete the analysis with missing components
          insaneAnalysis.analysisLevels = {
            visualIntelligence: insaneAnalysis,
            contentQuality: imageParser.analyzeContentQuality(portfolioData, completeProjectData),
            industryIntelligence: imageParser.detectIndustry(portfolioData)
          };
          
          insaneAnalysis.intelligentPrompt = imageParser.assembleIntelligentPrompt(
            portfolioData,
            completeProjectData,
            insaneAnalysis.analysisLevels.visualIntelligence,
            insaneAnalysis.analysisLevels.contentQuality,
            insaneAnalysis.analysisLevels.industryIntelligence
          );
          
          insaneAnalysis.systemStatus = 'FALLBACK';
          insaneAnalysis.overallConfidence = 0.4;
          
          console.log('✅ Fallback analysis completed');
        } catch (fallbackError) {
          console.error('❌ Fallback analysis also failed:', fallbackError);
          // Use basic analysis if everything fails
          insaneAnalysis = {
            systemStatus: 'BASIC',
            overallConfidence: 0.3,
            analysisLevels: {
              visualIntelligence: imageParser.getBasicFallback(),
              contentQuality: imageParser.analyzeContentQuality(portfolioData, completeProjectData),
              industryIntelligence: imageParser.detectIndustry(portfolioData)
            }
          };
        }
      }
    } else if (!isContinuation) {
      // 🚨 FIXED: Run content and industry analysis even without moodboard
      console.log('📝 No moodboard provided, running content and industry analysis...');
      try {
        const contentAnalysis = imageParser.analyzeContentQuality(portfolioData, completeProjectData);
        const industryAnalysis = imageParser.detectIndustry(portfolioData);
        const visualAnalysis = imageParser.getBasicFallback();
        
        insaneAnalysis = {
          systemStatus: 'BASIC',
          overallConfidence: (contentAnalysis.confidence + industryAnalysis.confidence + 0.3) / 3,
          analysisLevels: {
            visualIntelligence: visualAnalysis,
            contentQuality: contentAnalysis,
            industryIntelligence: industryAnalysis
          }
        };
        
        // Generate intelligent prompt even without moodboard
        insaneAnalysis.intelligentPrompt = imageParser.assembleIntelligentPrompt(
          portfolioData,
          completeProjectData,
          visualAnalysis,
          contentAnalysis,
          industryAnalysis
        );
        
        console.log(`📊 Basic analysis completed: ${Math.round(insaneAnalysis.overallConfidence * 100)}% confidence`);
      } catch (basicAnalysisError) {
        console.error('❌ Even basic analysis failed:', basicAnalysisError);
        insaneAnalysis = null;
      }
    }

    // 🚨 FIXED: Generate messages using INSANE analysis
    let anthropicMessages;
    if (isContinuation && partialHtml) {
      anthropicMessages = [{
        role: 'user',
        content: htmlValidator.generateContinuationPrompt(partialHtml, portfolioData)
      }];
    } else {
      try {
        console.log('🤖 Generating enhanced prompt with INSANE analysis...');
        
        if (insaneAnalysis && insaneAnalysis.intelligentPrompt) {
          // 🚨 FIXED: Use the INSANE system for message generation
          anthropicMessages = await promptGenerator.generateInsaneAnthropicMessages(
            portfolioData, 
            completeProjectData,
            insaneAnalysis,
            moodboardFiles
          );
          
          console.log(`✅ Enhanced prompt generated using ${insaneAnalysis.systemStatus} system`);
        } else {
          // Fallback to standard generation
          console.log('⚠️ Using fallback prompt generation');
          const designStyle = portfolioData.stylePreferences?.mood?.toLowerCase() || 'modern';
          anthropicMessages = await promptGenerator.generateAnthropicMessages(
            portfolioData, 
            completeProjectData,
            designStyle,
            null // No analysis available
          );
        }
        
      } catch (promptError) {
        console.error('❌ Enhanced prompt generation failed:', promptError);
        
        // Final fallback
        console.log('🔄 Using final fallback prompt generation...');
        const designStyle = portfolioData.stylePreferences?.mood?.toLowerCase() || 'modern';
        const basicPrompt = await promptGenerator.generateStyledPrompt(
          portfolioData, 
          completeProjectData,
          designStyle,
          insaneAnalysis
        );
        
        anthropicMessages = [{
          role: 'user',
          content: basicPrompt
        }];
      }
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    console.log('🚀 Sending request to Claude with enhanced intelligence...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: anthropicMessages
    });
    
    let cleanedHTML = response.content[0].text.trim();
    if (isContinuation && partialHtml) {
      cleanedHTML = htmlValidator.mergeHtmlParts(partialHtml, cleanedHTML);
    } else {
      if (cleanedHTML.startsWith('```html')) {
        cleanedHTML = cleanedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
      } else if (cleanedHTML.startsWith('```')) {
        cleanedHTML = cleanedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
      }
    }

    // 🚨 ENHANCED: Update HTML with project image URLs using complete project data
    cleanedHTML = updateHtmlWithProjectImages(cleanedHTML, completeProjectData);

    // Validate completeness
    const validation = htmlValidator.validateCompleteness(cleanedHTML);
    if (!validation.isComplete && !isContinuation && validation.canContinue) {
      return res.json({
        success: false,
        incomplete: true,
        partialHtml: cleanedHTML,
        completionStatus: validation,
        error: 'Generation incomplete',
        details: 'The AI response was cut off before completion. You can continue generation or start over.',
        metadata: {
          estimatedCompletion: validation.estimatedCompletion,
          issues: validation.issues,
          canContinue: validation.canContinue,
          projectData: completeProjectData,
          projectCount: completeProjectData.totalProjects,
          imageCount: completeProjectData.totalImages,
          insaneAnalysis: insaneAnalysis ? {
            systemStatus: insaneAnalysis.systemStatus,
            confidence: insaneAnalysis.overallConfidence,
            visualConfidence: insaneAnalysis.analysisLevels?.visualIntelligence?.confidence,
            contentConfidence: insaneAnalysis.analysisLevels?.contentQuality?.confidence,
            industryConfidence: insaneAnalysis.analysisLevels?.industryIntelligence?.confidence
          } : null
        }
      });
    }

    // Quality validation with INSANE analysis
    let validatedHTML = cleanedHTML;
    let validationResults = null;
    let autoFixApplied = false;
    
    try {
      validationResults = await qualityAnalyzer.validatePortfolio(
        cleanedHTML,
        portfolioData,
        completeProjectData
      );

      if (validationResults.overall.score < 85) {
        const autoFixResult = await qualityAnalyzer.applyAutoFixes(
          cleanedHTML,
          validationResults,
          portfolioData,
          completeProjectData
        );
        
        if (autoFixResult.success && autoFixResult.improvedHtml) {
          validatedHTML = autoFixResult.improvedHtml;
          autoFixApplied = true;
          
          validatedHTML = updateHtmlWithProjectImages(validatedHTML, completeProjectData);
          
          validationResults = await qualityAnalyzer.validatePortfolio(
            validatedHTML,
            portfolioData,
            completeProjectData
          );
        }
      }
    } catch (validationError) {
      console.error('Validation error:', validationError);
      validationResults = {
        overall: { score: 75, status: 'unknown' },
        content: { score: 75, issues: [], suggestions: [] },
        design: { score: 75, issues: [], suggestions: [] },
        technical: { score: 75, issues: [], suggestions: [] },
        accessibility: { score: 75, issues: [], suggestions: [] },
        error: 'Validation failed but generation completed'
      };
    }
    
    if (!validatedHTML.includes('<html') && !validatedHTML.includes('<!DOCTYPE')) {
      throw new Error('Generated content does not appear to be valid HTML');
    }

    // Generate portfolio ID for download purposes
    const portfolioId = `${portfolioData.personalInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const portfolioFolder = path.join(tempDir, `portfolio_${portfolioId}`);
    await fs.ensureDir(portfolioFolder);
    
    const htmlFilePath = path.join(portfolioFolder, 'index.html');
    await fs.writeFile(htmlFilePath, validatedHTML);
    
    const processingTimeMs = Date.now() - processingStartTime;
    
    console.log(`🎉 Portfolio generated successfully with INSANE analysis`);
    console.log(`📊 System Status: ${insaneAnalysis?.systemStatus || 'BASIC'}`);
    console.log(`🎯 Overall Confidence: ${Math.round((insaneAnalysis?.overallConfidence || 0.5) * 100)}%`);
    console.log(`📁 Projects: ${completeProjectData.totalProjects} with ${completeProjectData.totalImages} images`);
    
    res.json({
      success: true,
      portfolio: {
        html: validatedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          overvier: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          processingTime: processingTimeMs,
          designStyle: isContinuation ? 'continued' : (portfolioData.stylePreferences?.mood || 'intelligent'),
          
          // 🚨 ENHANCED: Complete metadata with INSANE analysis
          projectData: completeProjectData,
          projectCount: completeProjectData.totalProjects || 0,
          imageCount: completeProjectData.totalImages || 0,
          projectsWithOverview: completeProjectData.projectSummary ? 
            completeProjectData.projectSummary.filter(p => p.hasOverview).length : 0,
          
          // INSANE Analysis metadata
          insaneAnalysis: insaneAnalysis ? {
            systemStatus: insaneAnalysis.systemStatus,
            overallConfidence: insaneAnalysis.overallConfidence,
            visualIntelligence: {
              confidence: insaneAnalysis.analysisLevels?.visualIntelligence?.confidence,
              category: insaneAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category,
              mood: insaneAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.mood
            },
            contentStrategy: {
              confidence: insaneAnalysis.analysisLevels?.contentQuality?.confidence,
              strategy: insaneAnalysis.analysisLevels?.contentQuality?.strategy,
              contentType: insaneAnalysis.analysisLevels?.contentQuality?.contentType
            },
            industryIntelligence: {
              confidence: insaneAnalysis.analysisLevels?.industryIntelligence?.confidence,
              detectedIndustry: insaneAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry,
              portfolioFocus: insaneAnalysis.analysisLevels?.industryIntelligence?.portfolioFocus
            }
          } : null,
          
          isContinuation,
          validationResult: validation,
          qualityValidation: validationResults,
          autoFixApplied,
          qualityScore: validationResults?.overall?.score || 'unknown',
          portfolioId: portfolioId,
          portfolioFolder: portfolioFolder
        }
      }
    });
    
    // Clean up portfolio folder after 24 hours
    setTimeout(() => {
      fs.remove(portfolioFolder).catch(() => {});
    }, 24 * 60 * 60 * 1000);
    
  } catch (error) {
    console.error('Portfolio generation error:', error);
    
    if (error.message && error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'API Configuration Error',
        details: 'Anthropic API key is not configured properly'
      });
    }
    
    if (error.message && error.message.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Rate Limit Exceeded',
        details: 'API rate limit exceeded. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Portfolio Generation Failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      insaneAnalysisAvailable: !!insaneAnalysis
    });
  }
});

const getProjectImagesFromSheets = async (userEmail) => {
  try {
    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (!projectsTracker.initialized) {
      return { projectImages: [] };
    }

    const response = await projectsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A:P`,
    });

    const rows = response.data.values || [];
    const userProjects = rows
      .slice(1)
      .filter(row => row[1] === userEmail && row[12] === 'active');

    console.log(`📊 Found ${userProjects.length} active projects for ${userEmail}`);

    const projectImages = userProjects.map((row, projectIndex) => {
      // COMPLETE PROJECT DATA - including overview and all details
      const projectData = {
        projectId: row[2] || `project_${projectIndex}`,
        title: row[3] || 'Untitled Project',
        subtitle: row[4] || '', // Column E (index 4)
        overview: row[5] || '', // Column F (index 5) - THIS WAS MISSING!
        category: row[6] || '', // Column G (index 6)
        customCategory: row[7] || '', // Column H (index 7)
        tags: row[8] ? row[8].split(',').map(t => t.trim()).filter(Boolean) : [], // Column I (index 8)
        processImages: [],
        finalImages: [],
        createdAt: row[0] || new Date().toISOString(),
        
        // Add image counts for better organization
        processImageCount: 0,
        finalImageCount: 0
      };

      // Parse image metadata from Google Sheets
      const imageMetadataJson = row[11]; // Column L (index 11)
      if (imageMetadataJson) {
        try {
          const imageMetadata = JSON.parse(imageMetadataJson);
          
          // Process final images with enhanced metadata
          if (imageMetadata.finalImages && Array.isArray(imageMetadata.finalImages)) {
            projectData.finalImages = imageMetadata.finalImages.map((img, index) => ({
              ...img,
              url: img.url,
              displayOrder: index + 1,
              imageType: 'final',
              projectTitle: projectData.title
            }));
            projectData.finalImageCount = projectData.finalImages.length;
          }

          // Process process images with enhanced metadata
          if (imageMetadata.processImages && Array.isArray(imageMetadata.processImages)) {
            projectData.processImages = imageMetadata.processImages.map((img, index) => ({
              ...img,
              url: img.url,
              displayOrder: index + 1,
              imageType: 'process',
              projectTitle: projectData.title
            }));
            projectData.processImageCount = projectData.processImages.length;
          }
        } catch (error) {
          console.warn(`⚠️ Error parsing image metadata for project ${projectData.title}:`, error.message);
        }
      }

      console.log(`✅ Project "${projectData.title}": ${projectData.processImageCount} process + ${projectData.finalImageCount} final images`);
      console.log(`📝 Overview: ${projectData.overview ? 'Present' : 'Missing'}`);

      return projectData;
    });

    // Enhanced return object with better organization
    return { 
      projectImages,
      totalProjects: projectImages.length,
      totalImages: projectImages.reduce((sum, project) => 
        sum + project.processImageCount + project.finalImageCount, 0),
      projectSummary: projectImages.map(p => ({
        title: p.title,
        hasOverview: !!p.overview,
        imageCount: p.processImageCount + p.finalImageCount
      }))
    };
  } catch (error) {
    console.error('❌ Error fetching complete project data:', error);
    return { projectImages: [] };
  }
};

const cleanCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // If it's already a clean Cloudinary URL, return as-is
  if (url.startsWith('https://res.cloudinary.com/') && !url.includes('https://res.cloudinary.com/')) {
    return url;
  }
  
  // If it contains nested URLs, extract the first valid one
  const cloudinaryMatch = url.match(/https:\/\/res\.cloudinary\.com\/[^"'\s]+/);
  if (cloudinaryMatch) {
    return cloudinaryMatch[0];
  }
  
  return url;
};

const updateHtmlWithProjectImages = (html, completeProjectData) => {
  let updatedHtml = html;
  
  if (!completeProjectData || !completeProjectData.projectImages) {
    console.log('⚠️ No complete project data available for HTML update');
    return updatedHtml;
  }

  const projects = completeProjectData.projectImages;
  console.log(`🔄 Updating HTML with ${projects.length} projects containing ${completeProjectData.totalImages || 0} images`);

  // 🚨 CRITICAL FIX: Clean up navigation and emoji issues FIRST (existing code)
  try {
    // Navigation fixes (keep existing code)
    const problematicPatterns = [
      /href=["']\/dashboard["']/gi,
      /href=["']\/works["']/gi,
      /href=["']\/projects["']/gi,
      /href=["']\/portfolio["']/gi,
      /href=["']\/about["']/gi,
      /href=["']\/contact["']/gi,
      /href=["']\#dashboard["']/gi,
      /href=["']\#works["']/gi
    ];
    
    problematicPatterns.forEach(pattern => {
      updatedHtml = updatedHtml.replace(pattern, 'href="#projects"');
    });
    
    // Remove floating emoji animations (keep existing code)
    const emojiPatterns = [
      /@keyframes\s+[^{]*emoji[^}]*\{[^}]+\}/gi,
      /animation[^;]*emoji[^;]*;/gi,
      /\.floating-emoji[^}]*\{[^}]+\}/gi,
      /\.emoji-rain[^}]*\{[^}]+\}/gi,
      /<div[^>]*class="[^"]*floating[^"]*emoji[^"]*"[^>]*>.*?<\/div>/gi
    ];
    
    emojiPatterns.forEach(pattern => {
      updatedHtml = updatedHtml.replace(pattern, '');
    });
    
    // JavaScript fixes (keep existing code)
    updatedHtml = updatedHtml.replace(
      /window\.location\s*=\s*["'][^"']*["']/gi, 
      '// navigation disabled'
    );
    
    updatedHtml = updatedHtml.replace(
      /location\.href\s*=\s*["'][^"']*["']/gi, 
      '// navigation disabled'
    );
    
    // Add base target (keep existing code)
    if (!updatedHtml.includes('<base') && updatedHtml.includes('<head>')) {
      updatedHtml = updatedHtml.replace(
        '<head>', 
        '<head>\n<base target="_parent">'
      );
    }
    
    console.log('✅ Applied navigation and emoji fixes');
  } catch (error) {
    console.warn('⚠️ Failed to apply navigation/emoji fixes:', error);
  }

  // 🚨 COMPLETELY REWRITTEN IMAGE REPLACEMENT SYSTEM
  const imageReplacements = new Map();
  let replacementCount = 0;
  
  // Step 1: Build comprehensive replacement map
  projects.forEach((project, projectIndex) => {
    console.log(`📝 Processing project ${projectIndex + 1}: "${project.title}"`);
    console.log(`   Overview: ${project.overview ? 'Present ✅' : 'Missing ❌'}`);
    console.log(`   Images: ${project.finalImageCount || 0} final + ${project.processImageCount || 0} process`);
    
    // === FINAL IMAGES ===
    if (project.finalImages && project.finalImages.length > 0) {
      project.finalImages.forEach((image, imageIndex) => {
        if (!image.url) return;
        
        // Clean the URL to ensure it's properly formatted
        const cleanUrl = image.url.trim();
        console.log(`🖼️ Final image ${imageIndex + 1}: ${cleanUrl}`);
        
        // Create SPECIFIC, NON-OVERLAPPING patterns for this exact image
        const specificPatterns = [
          // Project-specific patterns with exact indices
          `project_${projectIndex + 1}_final_${imageIndex + 1}`,
          `${project.projectId}_final_${imageIndex + 1}`,
          `final_${projectIndex + 1}_${imageIndex + 1}`,
          `project${projectIndex + 1}_final${imageIndex + 1}`,
          
          // Generic patterns that should ONLY match placeholders, not existing URLs
          `final_${imageIndex + 1}.jpg`,
          `final_${imageIndex + 1}.png`,
          `final_${imageIndex + 1}.jpeg`,
          `final_${imageIndex + 1}.webp`,
          `final_${imageIndex + 1}.gif`,
          
          // Placeholder patterns
          `placeholder_final_${imageIndex + 1}`,
          `FINAL_IMAGE_${imageIndex + 1}`,
          `[FINAL_${imageIndex + 1}]`
        ];
        
        specificPatterns.forEach(pattern => {
          imageReplacements.set(pattern, {
            url: cleanUrl,
            type: 'final',
            project: project.title,
            imageIndex: imageIndex + 1,
            projectIndex: projectIndex + 1
          });
        });
      });
    }
    
    // === PROCESS IMAGES ===
    if (project.processImages && project.processImages.length > 0) {
      project.processImages.forEach((image, imageIndex) => {
        if (!image.url) return;
        
        const cleanUrl = image.url.trim();
        console.log(`📷 Process image ${imageIndex + 1}: ${cleanUrl}`);
        
        const specificPatterns = [
          `project_${projectIndex + 1}_process_${imageIndex + 1}`,
          `${project.projectId}_process_${imageIndex + 1}`,
          `process_${projectIndex + 1}_${imageIndex + 1}`,
          `project${projectIndex + 1}_process${imageIndex + 1}`,
          
          `process_${imageIndex + 1}.jpg`,
          `process_${imageIndex + 1}.png`,
          `process_${imageIndex + 1}.jpeg`,
          `process_${imageIndex + 1}.webp`,
          `process_${imageIndex + 1}.gif`,
          
          `placeholder_process_${imageIndex + 1}`,
          `PROCESS_IMAGE_${imageIndex + 1}`,
          `[PROCESS_${imageIndex + 1}]`
        ];
        
        specificPatterns.forEach(pattern => {
          imageReplacements.set(pattern, {
            url: cleanUrl,
            type: 'process',
            project: project.title,
            imageIndex: imageIndex + 1,
            projectIndex: projectIndex + 1
          });
        });
      });
    }
    
    // === PROJECT METADATA REPLACEMENTS ===
    const metadataReplacements = [
      {
        pattern: `[PROJECT_${projectIndex + 1}_TITLE]`,
        replacement: project.title,
        type: 'title'
      },
      {
        pattern: `[PROJECT_${projectIndex + 1}_SUBTITLE]`,
        replacement: project.subtitle || '',
        type: 'subtitle'
      },
      {
        pattern: `[PROJECT_${projectIndex + 1}_OVERVIEW]`,
        replacement: project.overview || 'This project showcases creative work and innovative solutions.',
        type: 'overview'
      },
      {
        pattern: `[PROJECT_${projectIndex + 1}_CATEGORY]`,
        replacement: project.category || project.customCategory || '',
        type: 'category'
      },
      {
        pattern: `[PROJECT_${projectIndex + 1}_TAGS]`,
        replacement: project.tags ? project.tags.join(', ') : '',
        type: 'tags'
      }
    ];
    
    metadataReplacements.forEach(meta => {
      imageReplacements.set(meta.pattern, {
        url: meta.replacement,
        type: meta.type,
        project: project.title,
        projectIndex: projectIndex + 1
      });
    });
  });
  
  // Step 2: Apply replacements using EXACT string matching (not regex)
  console.log(`🔄 Applying ${imageReplacements.size} specific replacements...`);
  
  imageReplacements.forEach((replacement, pattern) => {
    const beforeLength = updatedHtml.length;
    
    // Use simple string replacement for exact matches only
    if (updatedHtml.includes(pattern)) {
      updatedHtml = updatedHtml.split(pattern).join(replacement.url);
      const afterLength = updatedHtml.length;
      
      if (beforeLength !== afterLength) {
        replacementCount++;
        console.log(`✅ Replaced ${replacement.type} for "${replacement.project}" (${pattern} → URL)`);
      }
    }
  });
  
  // Step 3: Safety replacements for any remaining placeholders
  const safetyReplacements = [
    {
      // Remove any remaining file path references that might cause issues
      pattern: /src=["'](?:\.\/)?(?:uploads\/|temp\/)[^"']*\.(?:jpg|jpeg|png|gif|webp)["']/gi,
      replacement: 'src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\' viewBox=\'0 0 400 300\'%3E%3Crect fill=\'%23f0f0f0\' width=\'400\' height=\'300\'/%3E%3Ctext fill=\'%23999\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3EProject Image%3C/text%3E%3C/svg%3E"'
    },
    {
      // Clean up any remaining project overview placeholders
      pattern: /\[PROJECT_\d+_OVERVIEW\]/gi,
      replacement: 'This project showcases creative work and innovative solutions.'
    },
    {
      // Fix generic alt text
      pattern: /alt=["']Project Image["']/gi,
      replacement: 'alt="Creative project showcase"'
    }
  ];

  safetyReplacements.forEach(({pattern, replacement}) => {
    const beforeLength = updatedHtml.length;
    updatedHtml = updatedHtml.replace(pattern, replacement);
    const afterLength = updatedHtml.length;
    
    if (beforeLength !== afterLength) {
      console.log('🛡️ Applied safety replacement');
    }
  });

  // Step 4: Validation and logging
  const finalImageCount = (updatedHtml.match(/https:\/\/res\.cloudinary\.com/gi) || []).length;
  console.log(`📊 Final HTML contains ${finalImageCount} Cloudinary image references`);
  console.log(`🔄 Applied ${replacementCount} total replacements`);
  
  // Check for any corrupted URLs (nested cloudinary URLs)
  const corruptedUrls = updatedHtml.match(/https:\/\/res\.cloudinary\.com[^"']*https:\/\/res\.cloudinary\.com/gi);
  if (corruptedUrls && corruptedUrls.length > 0) {
    console.error(`❌ DETECTED ${corruptedUrls.length} CORRUPTED NESTED URLS!`);
    corruptedUrls.forEach((url, index) => {
      console.error(`   ${index + 1}. ${url.substring(0, 100)}...`);
    });
  } else {
    console.log('✅ No corrupted nested URLs detected');
  }
  
  // Verify project overviews are integrated
  projects.forEach((project, index) => {
    if (project.overview) {
      const overviewExists = updatedHtml.includes(project.overview.substring(0, 50));
      console.log(`📝 Project "${project.title}" overview integrated: ${overviewExists ? '✅' : '❌'}`);
    }
  });

  return updatedHtml;
};

app.get('/api/debug-image-urls', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const projectsTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'
    });

    if (!projectsTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured'
      });
    }

    const response = await projectsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A:P`,
    });

    const rows = response.data.values || [];
    const userProjects = rows
      .slice(1)
      .filter(row => row[1] === email && row[12] === 'active');

    const debugInfo = [];
    
    userProjects.forEach((row, projectIndex) => {
      try {
        const projectTitle = row[3] || 'Untitled Project';
        const imageMetadataJson = row[11];
        
        if (imageMetadataJson) {
          const imageMetadata = JSON.parse(imageMetadataJson);
          const projectDebug = {
            project: projectTitle,
            rawMetadata: imageMetadataJson.substring(0, 200) + '...', // First 200 chars
            processImages: [],
            finalImages: []
          };
          
          if (imageMetadata.processImages) {
            imageMetadata.processImages.forEach((img, imgIndex) => {
              projectDebug.processImages.push({
                index: imgIndex,
                originalUrl: img.url,
                cleanedUrl: cleanCloudinaryUrl(img.url),
                isValid: isValidCloudinaryUrl(cleanCloudinaryUrl(img.url) || img.url)
              });
            });
          }
          
          if (imageMetadata.finalImages) {
            imageMetadata.finalImages.forEach((img, imgIndex) => {
              projectDebug.finalImages.push({
                index: imgIndex,
                originalUrl: img.url,
                cleanedUrl: cleanCloudinaryUrl(img.url),
                isValid: isValidCloudinaryUrl(cleanCloudinaryUrl(img.url) || img.url)
              });
            });
          }
          
          debugInfo.push(projectDebug);
        }
      } catch (parseError) {
        debugInfo.push({
          project: row[3] || 'Untitled Project',
          error: parseError.message,
          rawMetadata: row[11]
        });
      }
    });

    res.json({
      success: true,
      email,
      totalProjects: userProjects.length,
      debugInfo
    });

  } catch (error) {
    console.error('Error debugging image URLs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to debug image URLs',
      details: error.message
    });
  }
});

app.post('/api/download-portfolio', async (req, res) => {
  try {
    const { portfolioId } = req.body;
    
    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio ID is required'
      });
    }

    const portfolioFolder = path.join(tempDir, `portfolio_${portfolioId}`);
    
    if (!await fs.pathExists(portfolioFolder)) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio folder not found'
      });
    }

    const zip = new JSZip();
    
    // Read all files in the portfolio folder
    const files = await fs.readdir(portfolioFolder);
    
    for (const fileName of files) {
      const filePath = path.join(portfolioFolder, fileName);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const fileContent = await fs.readFile(filePath);
        zip.file(fileName, fileContent);
      }
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=portfolio_${portfolioId}.zip`);
    res.send(zipContent);

  } catch (error) {
    console.error('Error creating portfolio zip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portfolio zip',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/user-data', async (req, res) => {
  try {
    const userEmail = req.query.email;
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Create a separate Google Sheets tracker for user data using GOOGLE_SHEETS_ID1
    const userDataTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID1, // Using GOOGLE_SHEETS_ID1 for user data
      sheetName: process.env.GOOGLE_SHEETS_NAME1 || 'Sheet1' // Using GOOGLE_SHEETS_NAME1
    });

    if (!userDataTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured'
      });
    }

    // Get all rows from the sheet
    const response = await userDataTracker.sheets.spreadsheets.values.get({
      spreadsheetId: userDataTracker.sheetId,
      range: `${userDataTracker.sheetName}!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return res.json({
        success: true,
        data: {
          portfolios: [],
          tier: 'Free',
          tags: []
        }
      });
    }

    // Extract headers (first row)
    const headers = rows[0];
    const emailIndex = headers.indexOf('Email');
    const tierIndex = headers.indexOf('Tier');
    const tagsIndex = headers.indexOf('Project Tags');
    
    if (emailIndex === -1) {
      return res.status(500).json({
        success: false,
        error: 'Email column not found in sheet'
      });
    }

    // Filter rows for this user's email
    const userRows = rows.slice(1).filter(row => row[emailIndex] === userEmail);
    
    // Extract relevant data
    const result = {
      portfolios: userRows.map((row, index) => ({
        id: `sheet-${row[0]}-${index}`, // Using timestamp and index as part of ID
        name: row[1] || 'Untitled Portfolio',
        createdAt: row[0],
        status: 'deployed', // Assuming all from sheets are deployed
        deployUrl: '', // Can be empty or add a column for this
        lastModified: row[0] // Using creation time as modified time
      })),
      tier: userRows.length > 0 ? (userRows[0][tierIndex] || 'Free') : 'Free',
      tags: userRows.length > 0 ? 
        [...new Set(userRows[0][tagsIndex]?.split(',').map(tag => tag.trim()).filter(Boolean) || [])] : []
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.post('/api/ai-edit-portfolio', async (req, res) => {
  console.log('AI Edit Route Hit:', req.method, req.url);
  
  try {
    const { htmlContent, editRequest, isContinuation, partialHtml } = req.body;
    
    // Validation
    if (!htmlContent || !editRequest) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Both htmlContent and editRequest are required'
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'API Configuration Error',
        details: 'Anthropic API key is not configured properly'
      });
    }

    // Determine if this is a continuation request
    const shouldContinue = isContinuation && partialHtml;

    let prompt;
    if (shouldContinue) {
      // Continuation mode
      prompt = `Continue editing the HTML below based on the previous edit request: "${editRequest}".
      
Current incomplete HTML:
\`\`\`html
${partialHtml}
\`\`\`

Please continue editing the HTML to fulfill the original request. Respond with ONLY the complete modified HTML.`;
    } else {
      // Initial edit request
      prompt = `You are a web design assistant that helps modify HTML/CSS based on user requests.
The user has provided their current HTML and wants to make the following changes:
"${editRequest}"

Here is the current HTML:
\`\`\`html
${htmlContent}
\`\`\`

Please respond with ONLY the modified HTML that implements the requested changes.
The HTML should be complete and valid. Do not include any explanations or markdown formatting.`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    let modifiedHtml = response.content[0].text.trim();
    
    // Clean up the response if it includes markdown formatting
    if (modifiedHtml.startsWith('```html')) {
      modifiedHtml = modifiedHtml.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (modifiedHtml.startsWith('```')) {
      modifiedHtml = modifiedHtml.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Merge with partial HTML if this was a continuation
    let finalHtml = shouldContinue ? htmlValidator.mergeHtmlParts(partialHtml, modifiedHtml) : modifiedHtml;

    // Check if the generation is complete
    const validation = htmlValidator.validateCompleteness(finalHtml);
    if (!validation.isComplete && validation.canContinue && !shouldContinue) {
      // If initial request is incomplete, automatically continue
      console.log('Initial edit incomplete, automatically continuing...');
      const continuationResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: `Continue editing the HTML below based on the previous edit request: "${editRequest}".
          
Current incomplete HTML:
\`\`\`html
${finalHtml}
\`\`\`

Please continue editing the HTML to fulfill the original request. Respond with ONLY the complete modified HTML.`
        }]
      });

      let continuedHtml = continuationResponse.content[0].text.trim();
      if (continuedHtml.startsWith('```html')) {
        continuedHtml = continuedHtml.replace(/^```html\n/, '').replace(/\n```$/, '');
      } else if (continuedHtml.startsWith('```')) {
        continuedHtml = continuedHtml.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      finalHtml = htmlValidator.mergeHtmlParts(finalHtml, continuedHtml);
      
      // Verify completion after continuation
      const postContinuationValidation = htmlValidator.validateCompleteness(finalHtml);
      if (!postContinuationValidation.isComplete) {
        return res.json({
          success: false,
          incomplete: true,
          partialHtml: finalHtml,
          completionStatus: postContinuationValidation,
          error: 'Edit still incomplete after continuation',
          details: 'The AI response was cut off before completion. You may need to continue generation again.',
          metadata: {
            estimatedCompletion: postContinuationValidation.estimatedCompletion,
            issues: postContinuationValidation.issues,
            canContinue: postContinuationValidation.canContinue,
            autoContinued: true
          }
        });
      }
    } else if (!validation.isComplete && !validation.canContinue) {
      return res.json({
        success: false,
        incomplete: true,
        partialHtml: finalHtml,
        error: 'Edit incomplete and cannot continue',
        details: 'The AI response was cut off before completion and cannot be automatically continued.',
        metadata: {
          issues: validation.issues,
          canContinue: false,
          autoContinued: false
        }
      });
    }

    res.json({
      success: true,
      modifiedHtml: finalHtml,
      metadata: {
        processedAt: new Date().toISOString(),
        request: editRequest,
        originalLength: htmlContent.length,
        modifiedLength: finalHtml.length,
        isContinuation: shouldContinue,
        autoContinued: !shouldContinue && validation.isComplete === false,
        isComplete: true
      }
    });

  } catch (error) {
    console.error('AI Edit Error:', error);
    
    if (error.message && error.message.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Rate Limit Exceeded',
        details: 'API rate limit exceeded. Please try again later.'
      });
    }
    
    if (error.message && error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'API Configuration Error',
        details: 'Anthropic API key is not configured properly'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'AI Edit Failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
});

app.get('/api/health', detailedHealthCheck);

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Portfolio Generator API',
    version: '1.0.0',
    overview: 'AI-powered portfolio generation using Anthropic Claude with computer vision image analysis',
    endpoints: {
      'POST /api/generate-portfolio': 'Generate portfolio from user data and images with AI analysis',
      'POST /api/download-portfolio': 'Download portfolio as ZIP file',
      'GET /api/health': 'Health check endpoint',
      'GET /api/info': 'API information'
    },
    features: {
      computerVision: 'Sharp-based image analysis for color extraction and style detection',
      aiGeneration: 'Anthropic Claude with enhanced prompts from image analysis',
      qualityValidation: 'Comprehensive HTML, design, and accessibility validation',
      autoFixes: 'Automatic fixes for common issues',
      responsiveDesign: 'Mobile-first responsive portfolio generation',
      imageManagement: 'Organized image storage and ZIP download'
    },
    limits: {
      maxFileSize: '10MB',
      maxFiles: 50,
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'WebP']
    }
  });
});

app.get('/api/test-image-analysis', async (req, res) => {
  try {
    res.json({
      status: 'Image analysis system ready',
      method: 'sharp-based',
      capabilities: [
        'Color palette extraction',
        'Brightness analysis',
        'Style detection from filenames',
        'Metadata extraction',
        'Combined multi-image analysis'
      ]
    });
  } catch (error) {
    res.status(500).json({
      status: 'Image analysis test failed',
      error: error.message
    });
  }
});

app.post('/api/join-waitlist', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Create a separate Google Sheets tracker for the waitlist
    const waitlistTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID2, // Using your waitlist sheet ID
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'Sheet1'
    });

    if (!waitlistTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Waitlist tracking not configured'
      });
    }

    // Check if email already exists in the sheet
    try {
      const response = await waitlistTracker.sheets.spreadsheets.values.get({
        spreadsheetId: waitlistTracker.sheetId,
        range: `${waitlistTracker.sheetName}!B:B`, // Email column
      });

      const emailColumn = response.data.values || [];
      const existingEmails = emailColumn.slice(1).map(row => row[0]); // Skip header row
      
      if (existingEmails.includes(email.trim())) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered',
          message: 'This email is already on the waitlist'
        });
      }
    } catch (error) {
      console.warn('Could not check for duplicate emails:', error.message);
    }

    // Add to waitlist sheet
    const values = [
      [
        new Date().toISOString(), // Timestamp
        email.trim()              // Email
      ]
    ];

    await waitlistTracker.sheets.spreadsheets.values.append({
      spreadsheetId: waitlistTracker.sheetId,
      range: `${waitlistTracker.sheetName}!A:B`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values,
      },
    });

    console.log('Successfully added email to waitlist:', email.trim());
    
    res.json({
      success: true,
      message: 'Successfully joined waitlist',
      email: email.trim(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error adding to waitlist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join waitlist',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.post('/api/save-portfolio', async (req, res) => {
  try {
    const { htmlContent, filename, includeImages = true } = req.body;
    
    if (!htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing HTML content'
      });
    }

    // Use provided filename or generate default one
    const finalFilename = filename || `portfolio_${Date.now()}.html`;
    const filePath = path.join(tempDir, finalFilename);

    // Save the HTML file
    await fs.writeFile(filePath, htmlContent);

    let imageFiles = [];
    
    if (includeImages) {
      // Extract image sources from HTML
      const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      const backgroundImageRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
      const imageSources = new Set();
      
      let match;
      
      // Find img src attributes
      while ((match = imageRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
          imageSources.add(src);
        }
      }
      
      // Find background-image URLs
      while ((match = backgroundImageRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
          imageSources.add(src);
        }
      }
      
      // Copy image files to temp directory
      for (const imageSrc of imageSources) {
        try {
          // Remove leading slash if present
          const cleanSrc = imageSrc.startsWith('/') ? imageSrc.substring(1) : imageSrc;
          const sourcePath = path.join(__dirname, cleanSrc);
          
          if (await fs.pathExists(sourcePath)) {
            const imageName = path.basename(cleanSrc);
            const tempImagePath = path.join(tempDir, `${finalFilename}_${imageName}`);
            await fs.copy(sourcePath, tempImagePath);
            imageFiles.push({
              originalSrc: imageSrc,
              filename: `${finalFilename}_${imageName}`,
              tempPath: tempImagePath
            });
          }
        } catch (error) {
          console.warn(`Could not copy image ${imageSrc}:`, error.message);
        }
      }
    }

    res.json({
      success: true,
      filename: finalFilename,
      imageFiles: imageFiles,
      savedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save portfolio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/create-zip', async (req, res) => {
  try {
    const { filename, imageFiles = [] } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing filename'
      });
    }

    const filePath = path.join(tempDir, filename);
    
    // Check if HTML file exists
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'HTML file not found'
      });
    }

    let htmlContent = await fs.readFile(filePath, 'utf8');
    const zip = new JSZip();
    
    // Create images folder in ZIP if we have images
    const imagesFolder = imageFiles.length > 0 ? zip.folder("images") : null;
    
    // Add images to ZIP and update HTML paths
    for (const imageFile of imageFiles) {
      try {
        if (await fs.pathExists(imageFile.tempPath)) {
          const imageBuffer = await fs.readFile(imageFile.tempPath);
          const imageName = path.basename(imageFile.originalSrc);
          
          // Add image to ZIP in images folder
          if (imagesFolder) {
            imagesFolder.file(imageName, imageBuffer);
          }
          
          // Update HTML to reference images in the images folder
          const oldSrc = imageFile.originalSrc;
          const newSrc = `images/${imageName}`;
          htmlContent = htmlContent.replace(new RegExp(oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newSrc);
        }
      } catch (error) {
        console.warn(`Could not add image ${imageFile.originalSrc} to ZIP:`, error.message);
      }
    }
    
    // Add the updated HTML file to ZIP
    zip.file("index.html", htmlContent);
    
    // Generate ZIP buffer
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=portfolio.zip');
    res.send(zipContent);

    // Clean up temp files after sending
    setTimeout(async () => {
      try {
        await fs.remove(filePath);
        for (const imageFile of imageFiles) {
          await fs.remove(imageFile.tempPath).catch(() => {});
        }
      } catch (error) {
        console.warn('Error cleaning up temp files:', error.message);
      }
    }, 5000);

  } catch (error) {
    console.error('Error creating zip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create zip file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/track-deployment', async (req, res) => {
  try {
    const { name, email, title, userAgent, projectCount, tier } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Create Google Sheets tracker for deployment tracking (GOOGLE_SHEETS_ID1)
    const deploymentTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID1,
      sheetName: process.env.GOOGLE_SHEETS_NAME1 || 'Deployments'
    });

    if (!deploymentTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured for tracking'
      });
    }

    // Ensure headers exist with the new format
    const headers = await deploymentTracker.getHeaders();
    if (!headers || headers.length === 0) {
      const defaultHeaders = [
        'Timestamp',
        'Full Name',
        'Email',
        'Title',
        'Generated URL',
        'Browser (User Agent)',
        'Projects Used',
        'Device Type',
        'Tier (Free/Student/Pro)'
      ];
      
      await deploymentTracker.sheets.spreadsheets.values.update({
        spreadsheetId: deploymentTracker.sheetId,
        range: `${deploymentTracker.sheetName}!1:1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [defaultHeaders],
        },
      });
    }

    // Determine device type from user agent
    let deviceType = 'Desktop';
    const userAgentLower = (userAgent || '').toLowerCase();
    if (userAgentLower.includes('mobile')) {
      deviceType = 'Mobile';
    } else if (userAgentLower.includes('tablet')) {
      deviceType = 'Tablet';
    }

    // Prepare data for the sheet
    const sheetData = [
      new Date().toISOString(), // Timestamp
      name, // Full Name
      email, // Email
      title || '', // Title
      '', // Generated URL (will be empty initially)
      userAgent || 'Unknown', // Browser (User Agent)
      projectCount || 0, // Projects Used
      deviceType, // Device Type
      tier || 'Free' // Tier
    ];

    // Append the data
    await deploymentTracker.sheets.spreadsheets.values.append({
      spreadsheetId: deploymentTracker.sheetId,
      range: `${deploymentTracker.sheetName}!A:I`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [sheetData],
      },
    });

    res.json({
      success: true,
      message: 'Deployment tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track deployment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.post('/api/update-deployment-url', async (req, res) => {
  try {
    const { email, url } = req.body;
    
    if (!email || !url) {
      return res.status(400).json({
        success: false,
        error: 'Email and URL are required'
      });
    }

    const deploymentTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID1,
      sheetName: process.env.GOOGLE_SHEETS_NAME1 || 'Deployments'
    });

    if (!deploymentTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured for tracking'
      });
    }

    // Find the most recent record for this email
    const response = await deploymentTracker.sheets.spreadsheets.values.get({
      spreadsheetId: deploymentTracker.sheetId,
      range: `${deploymentTracker.sheetName}!A:I`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row, index) => 
      index > 0 && row[2] === email && !row[4] // Email matches and URL is empty
    );

    if (rowIndex === -1) {
      return res.json({
        success: true,
        message: 'No matching deployment record found to update'
      });
    }

    // Update the URL column (column E, index 4)
    const updateRange = `${deploymentTracker.sheetName}!E${rowIndex + 1}`;
    await deploymentTracker.sheets.spreadsheets.values.update({
      spreadsheetId: deploymentTracker.sheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[url]],
      },
    });

    res.json({
      success: true,
      message: 'Deployment URL updated successfully'
    });

  } catch (error) {
    console.error('Error updating deployment URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update deployment URL',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

app.get('/api/debug-cors', (req, res) => {
  console.log('🔍 Debug CORS endpoint hit');
  console.log('Origin:', req.headers.origin);
  console.log('Headers:', req.headers);
  
  res.json({
    success: true,
    message: 'CORS debug endpoint working',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN,
    headers: req.headers
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Add this before your detailed health check if it doesn't exist
app.get('/api/simple-health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    message: 'Simple health check working'
  });
});

app.use(errorHandler);
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    details: `Route ${req.method} ${req.originalUrl} not found`
  });
});

process.on('SIGTERM', () => server.close(() => {}));
process.on('SIGINT', () => server.close(() => {}));


const createUploadDirs = () => {
  // In Vercel (production), only use /tmp directory
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    try {
      // Only create directories in /tmp which is writable in Vercel
      const tmpDirs = [
        '/tmp',
        '/tmp/projects',
        '/tmp/temp_analysis'
      ];
      
      tmpDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
      
      console.log('✅ Vercel directories created in /tmp');
    } catch (error) {
      console.warn('⚠️ Could not create /tmp directories:', error.message);
    }
  } else {
    // Development mode - create local directories
    const uploadDirs = [
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'uploads', 'processed'),
      path.join(__dirname, 'uploads', 'temp'),
      tempDir
    ];

    uploadDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (error) {
          console.warn(`Could not create directory ${dir}:`, error.message);
        }
      }
    });
  }
};

// Initialize directories
createUploadDirs();

// Only start server in development
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`Portfolio Generator API running on port ${PORT}`);
    console.log(`Temp directory: ${tempDir}`);
  });
  
  process.on('SIGTERM', () => server.close(() => {}));
  process.on('SIGINT', () => server.close(() => {}));
}

// Export for Vercel
module.exports = app;