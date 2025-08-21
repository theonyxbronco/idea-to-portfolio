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

app.post('/api/upgrade-user-tier', async (req, res) => {
  try {
    const { email, newTier, paymentInfo } = req.body;
    
    if (!email || !newTier) {
      return res.status(400).json({
        success: false,
        error: 'Email and new tier are required'
      });
    }

    // Validate tier
    const validTiers = ['Free', 'Student', 'Pro'];
    if (!validTiers.includes(newTier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier specified'
      });
    }

    // TODO: Add payment processing logic here
    // For now, we'll just update the tier in Google Sheets

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

    // Find and update user's tier
    const response = await userInfoTracker.sheets.spreadsheets.values.get({
      spreadsheetId: userInfoTracker.sheetId,
      range: `${userInfoTracker.sheetName}!A:L`,
    });

    const rows = response.data.values || [];
    const userRowIndex = rows.findIndex((row, index) => 
      index > 0 && row[1] === email
    );

    if (userRowIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update only the tier column (L, index 11)
    const actualRowIndex = userRowIndex + 1;
    await userInfoTracker.sheets.spreadsheets.values.update({
      spreadsheetId: userInfoTracker.sheetId,
      range: `${userInfoTracker.sheetName}!L${actualRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[newTier]],
      },
    });

    // Log the upgrade
    console.log(`User ${email} upgraded to ${newTier} tier`);

    res.json({
      success: true,
      message: `Successfully upgraded to ${newTier} tier`,
      newTier: newTier,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error upgrading user tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upgrade user tier',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

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

app.post('/api/deploy-folder-to-netlify-with-paywall', async (req, res) => {
  const { htmlContent, netlifyToken, personName, userEmail, projectIds } = req.body;
  
  if (!htmlContent || !netlifyToken || !personName || !userEmail) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: htmlContent, netlifyToken, personName, and userEmail are required'
    });
  }

  try {
    // 🚨 STEP 1: Check user limits before deployment
    console.log('🔒 Checking deployment permissions for:', userEmail);
    
    const limitsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/check-user-limits?email=${encodeURIComponent(userEmail)}`);
    
    if (!limitsResponse.ok) {
      throw new Error('Failed to check user limits');
    }
    
    const limitsData = await limitsResponse.json();
    
    if (!limitsData.success) {
      throw new Error('Unable to verify user permissions');
    }

    const { tier, canCreate, paywall } = limitsData.data;

    // 🚨 STEP 2: Enforce paywall rules
    if (!canCreate.deployments) {
      const errorResponse = {
        success: false,
        error: 'DEPLOYMENT_BLOCKED',
        paywall: true,
        details: paywall.reason === 'FREE_TIER_NO_DEPLOYMENT' 
          ? 'Free tier users cannot deploy portfolios. Please upgrade to Student or Pro to deploy your portfolio.'
          : `You have reached your deployment limit for ${tier} tier. Please upgrade to Pro for unlimited deployments.`,
        tier: tier,
        upgradeRequired: paywall.upgradeRequired,
        limits: limitsData.data.limits,
        usage: limitsData.data.usage,
        remaining: limitsData.data.remaining
      };

      console.log(`🚫 Deployment blocked for ${userEmail}: ${paywall.reason}`);
      return res.status(403).json(errorResponse);
    }

    console.log(`✅ Deployment authorized for ${userEmail} (${tier} tier)`);

    // 🚨 STEP 3: Proceed with deployment using existing logic
    let siteId;
    const startTime = Date.now();

    const timestamp = Date.now();
    const siteName = `${personName.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 30)}-portfolio-${timestamp}`;
    
    console.log(`🚀 Starting deployment for: ${personName} (${tier} tier)`);

    // Create new Netlify site
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

    // Calculate SHA1 hash for HTML content
    const htmlSha1 = crypto.createHash('sha1').update(htmlContent, 'utf8').digest('hex');
    console.log(`🔐 HTML SHA1 calculated: ${htmlSha1}`);
    
    // Create deployment with proper file digest format
    console.log('📦 Creating deployment with file digest...');
    const deployPayload = {
      files: {
        "index.html": htmlSha1
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

    // Upload HTML file if required by Netlify
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

    // Poll deployment status until ready
    console.log('⏳ Waiting for deployment to complete...');
    let currentDeployState = deployState || 'building';
    const maxAttempts = 60;
    let attempts = 0;
    const statusesToWaitFor = ['building', 'processing', 'uploading', 'prepared', 'preparing'];

    while (statusesToWaitFor.includes(currentDeployState) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
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
        
        if (['error', 'crashed', 'cancelled'].includes(currentDeployState)) {
          console.error(`❌ Deploy failed with status: ${currentDeployState}`);
          break;
        }
        
      } catch (statusError) {
        console.warn(`⚠️ Status check ${attempts} failed:`, statusError.message);
        if (attempts >= maxAttempts - 5) break;
      }
    }

    // Get final site information
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

    // 🚨 STEP 4: Track deployment in Google Sheets (Portfolio Details)
    if (userEmail && finalUrl && currentDeployState === 'ready') {
      try {
        console.log('📝 Tracking deployment in Portfolio Details sheet...');
        
        const portfolioDetailsTracker = new GoogleSheetsTracker({
          clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
          sheetId: process.env.GOOGLE_SHEETS_ID3,
          sheetName: process.env.GOOGLE_SHEETS_NAME5 || 'Portfolio Details'
        });

        if (portfolioDetailsTracker.initialized) {
          // Ensure headers exist
          const headers = await portfolioDetailsTracker.getHeaders();
          if (!headers || headers.length === 0) {
            const defaultHeaders = [
              'Timestamp',
              'Email', 
              'Project ID(s)',
              'Portfolio URL',
              'Tier at Deploy' // 🚨 Track tier at time of deployment
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

          // Format project IDs as JSON object
          let formattedProjectIds = '';
          if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
            const projectIdObject = {};
            projectIds.forEach((id, index) => {
              projectIdObject[(index + 1).toString()] = id;
            });
            formattedProjectIds = JSON.stringify(projectIdObject);
          } else if (typeof projectIds === 'string') {
            formattedProjectIds = JSON.stringify({"1": projectIds});
          } else {
            formattedProjectIds = JSON.stringify({"1": "unknown"});
          }

          // Prepare data for the sheet
          const sheetData = [
            new Date().toISOString(), // Timestamp
            userEmail,                 // Email
            formattedProjectIds,       // Project ID(s) as JSON
            finalUrl,                 // Portfolio URL
            tier                      // 🚨 Tier at time of deployment
          ];

          // Append to sheet
          await portfolioDetailsTracker.sheets.spreadsheets.values.append({
            spreadsheetId: portfolioDetailsTracker.sheetId,
            range: `${portfolioDetailsTracker.sheetName}!A:E`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
              values: [sheetData],
            },
          });

          console.log(`✅ Portfolio deployment tracked successfully for: ${userEmail} (${tier} tier)`);
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
      tier: tier, // 🚨 Include tier information in response
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

    // Handle specific error cases
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

app.post('/api/deploy-folder-to-netlify', async (req, res) => {
  // Simply call the paywall-enabled function directly
  return app.post('/api/deploy-folder-to-netlify-with-paywall')(req, res);
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
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info'
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
        range: `${userInfoTracker.sheetName}!A:L`,
      });

      const rows = response.data.values || [];
      existingRowIndex = rows.findIndex((row, index) => 
        index > 0 && row[1] === userEmail
      );
    } catch (error) {
      console.warn('Could not check for existing user:', error.message);
    }

    // Helper functions remain the same...
    const arrayToJson = (arr) => {
      if (!arr || !Array.isArray(arr)) return '';
      if (arr.length === 0) return '';
      
      try {
        return JSON.stringify(arr);
      } catch {
        return arr.join(', ');
      }
    };

    const skillsToString = (skills) => {
      if (!skills || !Array.isArray(skills)) return '';
      return skills.join(', ');
    };

    // Prepare user data with tier information
    const userData = [
      new Date().toISOString(),
      userEmail,
      personalInfo.name || '',
      personalInfo.title || '',
      personalInfo.bio || '',
      personalInfo.phone || '',
      personalInfo.linkedin || '',
      personalInfo.instagram || '',
      skillsToString(personalInfo.skills),
      arrayToJson(personalInfo.experiences),
      arrayToJson(personalInfo.education),
      tier || 'Free' // Always ensure tier is set, default to Free
    ];

    if (existingRowIndex !== null && existingRowIndex !== -1) {
      const actualRowIndex = existingRowIndex + 1;
      await userInfoTracker.sheets.spreadsheets.values.update({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A${actualRowIndex}:L${actualRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [userData],
        },
      });
      
      console.log(`Updated user info for: ${userEmail} with tier: ${tier || 'Free'}`);
    } else {
      await userInfoTracker.sheets.spreadsheets.values.append({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A:L`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [userData],
        },
      });
      
      console.log(`Created new user info for: ${userEmail} with tier: ${tier || 'Free'}`);
    }

    res.json({
      success: true,
      message: existingRowIndex !== -1 ? 'User information updated' : 'User information saved',
      timestamp: new Date().toISOString(),
      tier: tier || 'Free',
      sheetUsed: `${process.env.GOOGLE_SHEETS_ID3}/${process.env.GOOGLE_SHEETS_NAME2 || 'User Info'}`
    });

  } catch (error) {
    console.error('Error saving user info:', error);
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

app.get('/api/check-user-limits', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Define tier limits with enhanced paywall rules
    const TIER_LIMITS = {
      Free: {
        maxProjects: 3,
        maxPortfolios: 0, // 🚨 Free users cannot deploy
        maxDrafts: 1,
        maxDeployments: 0, // 🚨 No deployments for free users
        features: ['Basic portfolio generation', 'Text editing', 'Save as draft'],
        restrictions: ['No deployment', 'Limited projects', 'No custom styling']
      },
      Student: {
        maxProjects: 20,
        maxPortfolios: 3, // Student users can deploy 3 portfolios
        maxDrafts: 5,
        maxDeployments: 3, // 🚨 Student users can deploy 3 times
        features: ['Portfolio deployment', 'AI editing', 'Multiple projects', 'Email support'],
        restrictions: ['Limited deployments', 'No custom CSS', 'No priority support']
      },
      Pro: {
        maxProjects: Infinity,
        maxPortfolios: Infinity,
        maxDrafts: Infinity,
        maxDeployments: Infinity, // 🚨 Pro users have unlimited deployments
        features: ['Unlimited deployments', 'Custom styling', 'Priority support', 'Advanced editing', 'Custom domains'],
        restrictions: []
      }
    };

    // Get user tier from User Info sheet
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

    // Get user info including tier
    const userResponse = await userInfoTracker.sheets.spreadsheets.values.get({
      spreadsheetId: userInfoTracker.sheetId,
      range: `${userInfoTracker.sheetName}!A:L`,
    });

    const userRows = userResponse.data.values || [];
    const userRow = userRows.find((row, index) => 
      index > 0 && row[1] === email
    );

    const userTier = userRow ? (userRow[11] || 'Free') : 'Free'; // Column L contains tier
    const limits = TIER_LIMITS[userTier] || TIER_LIMITS.Free;

    // Get current usage counts from multiple sources
    const [projectsResponse, draftsResponse, deploymentsResponse] = await Promise.all([
      // Projects count from Project Info sheet
      userInfoTracker.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID3,
        range: `${process.env.GOOGLE_SHEETS_NAME3 || 'Project Info'}!A:M`,
      }).catch(() => ({ data: { values: [] } })),
      
      // Drafts count from Portfolio Drafts sheet
      userInfoTracker.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID3,
        range: `${process.env.GOOGLE_SHEETS_NAME4 || 'Portfolio Drafts'}!A:C`,
      }).catch(() => ({ data: { values: [] } })),
      
      // Deployments count from Portfolio Details sheet
      userInfoTracker.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID3,
        range: `${process.env.GOOGLE_SHEETS_NAME5 || 'Portfolio Details'}!A:D`,
      }).catch(() => ({ data: { values: [] } }))
    ]);

    // Count active projects for this user
    const projectRows = projectsResponse.data.values || [];
    const activeProjects = projectRows.slice(1).filter(row => 
      row[1] === email && row[12] === 'active' // Email matches and status is active
    );
    const projectsCount = activeProjects.length;

    // Count drafts for this user
    const draftRows = draftsResponse.data.values || [];
    const userDrafts = draftRows.slice(1).filter(row => row[1] === email);
    const draftsCount = userDrafts.length;

    // Count deployments for this user
    const deploymentRows = deploymentsResponse.data.values || [];
    const userDeployments = deploymentRows.slice(1).filter(row => row[1] === email);
    const deploymentsCount = userDeployments.length;

    // Calculate remaining allocations
    const projectsRemaining = limits.maxProjects === Infinity ? Infinity : Math.max(0, limits.maxProjects - projectsCount);
    const draftsRemaining = limits.maxDrafts === Infinity ? Infinity : Math.max(0, limits.maxDrafts - draftsCount);
    const deploymentsRemaining = limits.maxDeployments === Infinity ? Infinity : Math.max(0, limits.maxDeployments - deploymentsCount);

    // Determine what user can create
    const canCreateProject = projectsCount < limits.maxProjects;
    const canCreateDraft = draftsCount < limits.maxDrafts;
    const canDeploy = deploymentsCount < limits.maxDeployments;

    // Enhanced response with paywall information
    res.json({
      success: true,
      data: {
        tier: userTier,
        limits: {
          maxProjects: limits.maxProjects,
          maxPortfolios: limits.maxPortfolios, // Legacy field name
          maxDrafts: limits.maxDrafts,
          maxDeployments: limits.maxDeployments // 🚨 New field for deployment limits
        },
        usage: {
          projects: projectsCount,
          portfolios: deploymentsCount, // Legacy field - now represents deployments
          drafts: draftsCount,
          deployments: deploymentsCount // 🚨 Explicit deployment count
        },
        remaining: {
          projects: projectsRemaining,
          drafts: draftsRemaining,
          deployments: deploymentsRemaining // 🚨 Deployments remaining
        },
        canCreate: {
          projects: canCreateProject,
          portfolios: canDeploy, // Legacy field
          drafts: canCreateDraft,
          deployments: canDeploy // 🚨 Can user deploy?
        },
        // 🚨 Enhanced paywall information
        paywall: {
          isBlocked: !canDeploy && userTier === 'Free',
          reason: !canDeploy ? (
            userTier === 'Free' ? 'FREE_TIER_NO_DEPLOYMENT' : 'DEPLOYMENT_LIMIT_REACHED'
          ) : null,
          upgradeRequired: userTier === 'Free' ? 'Student' : 'Pro',
          features: limits.features,
          restrictions: limits.restrictions
        }
      }
    });

  } catch (error) {
    console.error('Error checking user limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check user limits',
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

    // Check user limits before saving
    try {
      const limitsCheckResponse = await fetch(`${req.protocol}://${req.get('host')}/api/check-user-limits?email=${encodeURIComponent(projectData.userEmail)}`);
      
      if (limitsCheckResponse.ok) {
        const limitsData = await limitsCheckResponse.json();
        if (limitsData.success && !limitsData.data.canCreate.projects) {
          return res.status(403).json({
            success: false,
            error: 'Project limit reached',
            details: `${limitsData.data.tier} users can only have ${limitsData.data.limits.maxProjects} projects. Please upgrade to Pro for unlimited projects.`,
            tier: limitsData.data.tier,
            limits: limitsData.data.limits,
            usage: limitsData.data.usage
          });
        }
      }
    } catch (limitError) {
      console.warn('Could not check user limits:', limitError.message);
      // Continue with save if limit check fails
    }

    // Initialize Google Sheets tracker
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

    // Handle image uploads
    let savedImages = null;
    const projectFolder = path.join(tempDir, 'projects', projectId);

    if (files.length > 0) {
      try {
        if (cloudinaryUploader.initialized) {
          console.log('🌩️ Uploading images to Cloudinary...');
          savedImages = await cloudinaryUploader.uploadProjectImages(files, projectId, projectData.userEmail);
        } else {
          console.log('📁 Using local storage for images...');
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
        console.error('❌ Failed to save project images:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to save project images',
          details: error.message
        });
      }
    }

    // Prepare image metadata for Google Sheets
    let imageMetadata = {};
    if (savedImages) {
      if (cloudinaryUploader.initialized) {
        // Cloudinary format
        imageMetadata = {
          processImages: savedImages.process ? savedImages.process.map(img => ({
            filename: img.originalName,
            url: img.cloudinaryUrl,
            publicId: img.publicId,
            width: img.width,
            height: img.height,
            format: img.format
          })) : [],
          finalImages: savedImages.final ? (Array.isArray(savedImages.final) ? 
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
    // Note: Code 1 combines problem, solution, reflection into overview
    const overview = projectData.problem && projectData.solution && projectData.reflection 
      ? `Problem: ${projectData.problem}\n\nSolution: ${projectData.solution}\n\nReflection: ${projectData.reflection}`
      : projectData.overview || '';

    const sheetData = [
      new Date().toISOString(),                                           // A: Timestamp
      projectData.userEmail,                                             // B: Email
      projectId,                                                         // C: Project ID
      projectData.title || '',                                          // D: Title
      projectData.subtitle || '',                                       // E: Subtitle
      overview,                                                         // F: Overview (combined from problem/solution/reflection)
      projectData.category || projectData.customCategory || '',        // G: Category
      projectData.customCategory || '',                                // H: Custom Category
      (projectData.tags || []).join(', '),                            // I: Tags
      savedImages ? (savedImages.process ? savedImages.process.length : 0) : 0,  // J: Process images count
      savedImages ? (savedImages.final ? (Array.isArray(savedImages.final) ? savedImages.final.length : 1) : 0) : 0,  // K: Final images count
      JSON.stringify(imageMetadata),                                   // L: Image metadata
      'active'                                                         // M: Status
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

    console.log(`✅ Successfully saved project: ${projectData.title} for: ${projectData.userEmail}`);
    
    res.json({
      success: true,
      message: 'Project saved successfully',
      projectId: projectId,
      timestamp: new Date().toISOString(),
      storageType: cloudinaryUploader.initialized ? 'cloudinary' : 'local',
      imageCount: {
        process: savedImages ? (savedImages.process ? savedImages.process.length : 0) : 0,
        final: savedImages ? (savedImages.final ? (Array.isArray(savedImages.final) ? savedImages.final.length : 1) : 0) : 0
      }
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

    // Check user limits before saving draft
    const limitsCheckResponse = await fetch(`${req.protocol}://${req.get('host')}/api/check-user-limits?email=${encodeURIComponent(email)}`);
    
    if (limitsCheckResponse.ok) {
      const limitsData = await limitsCheckResponse.json();
      if (limitsData.success && !limitsData.data.canCreate.drafts) {
        return res.status(403).json({
          success: false,
          error: 'Draft limit reached',
          details: `${limitsData.data.tier} users can only have ${limitsData.data.limits.maxDrafts} draft(s). Please upgrade to Pro for unlimited drafts.`,
          tier: limitsData.data.tier,
          limits: limitsData.data.limits,
          usage: limitsData.data.usage
        });
      }
    }

    // Continue with existing save-draft logic...
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
    console.log('🚀 Starting Portfolio Generation with Enhanced Analysis...');
    
    // Extract all input data
    const portfolioData = req.portfolioData;
    const files = req.files || [];
    const isContinuation = req.body.continueGeneration === 'true';
    const partialHtml = req.body.partialHtml;
    const selectedSkeleton = req.body.selectedSkeleton || portfolioData.selectedSkeleton || 'none';
    const customDesignRequest = req.body.customDesignRequest || portfolioData.customDesignRequest || '';

    console.log(`📋 Generation Parameters:
    - User: ${portfolioData.personalInfo?.name || 'Unknown'}
    - Selected Skeleton: ${selectedSkeleton}
    - Custom Design Request: ${customDesignRequest ? 'Yes' : 'No'}
    - Total Files: ${files.length}
    - Is Continuation: ${isContinuation}`);

    // Separate different types of files
    const moodboardFiles = files.filter(file => {
      const fieldName = (file.fieldname || '').toLowerCase();
      return fieldName.includes('moodboard') || fieldName.startsWith('mood');
    });

    const projectImageFiles = files.filter(file => {
      const fieldName = (file.fieldname || '').toLowerCase();
      return fieldName.includes('process_') || fieldName.includes('final_') || fieldName.includes('project_');
    });

    console.log(`📁 File Analysis:
    - Moodboard files: ${moodboardFiles.length}
    - Project image files: ${projectImageFiles.length}`);

    // Log moodboard file details for debugging
    if (moodboardFiles.length > 0) {
      console.log('🖼️ Moodboard Files Details:');
      moodboardFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.originalname || 'unnamed'} - ${file.mimetype} - ${Math.round(file.buffer.length / 1024)}KB`);
      });
    }

    // Track generation in Google Sheets
    if (sheetsTracker.initialized) {
      sheetsTracker.appendData(
        portfolioData, 
        req.headers['user-agent'] || 'unknown',
        req.headers['sec-ch-ua-width'] || 'unknown'
      ).catch(() => {});
    }

    // STEP 1: Load complete project data from Google Sheets
    console.log('📊 Loading complete project data from Google Sheets...');
    const completeProjectData = await getProjectImagesFromSheets(portfolioData.personalInfo.email);
    
    if (!completeProjectData || !completeProjectData.projectImages) {
      console.log('⚠️ No project data found, using portfolio data projects');
      completeProjectData.projectImages = portfolioData.projects || [];
      completeProjectData.totalProjects = completeProjectData.projectImages.length;
      completeProjectData.totalImages = 0;
    }

    console.log(`✅ Project Data Loaded:
    - Total Projects: ${completeProjectData.totalProjects || 0}
    - Total Images: ${completeProjectData.totalImages || 0}`);

    // STEP 2: Run Comprehensive Analysis (only if not continuation)
    let comprehensiveAnalysis = null;
    
    if (!isContinuation) {
      console.log('🔍 Running Comprehensive Analysis...');
      
      try {
        // Enhanced analysis with all inputs
        comprehensiveAnalysis = await imageParser.runComprehensiveAnalysis(
          moodboardFiles,
          portfolioData,
          completeProjectData,
          {
            selectedSkeleton,
            customDesignRequest,
            hasProjectImages: projectImageFiles.length > 0,
            userAgent: req.headers['user-agent'] || 'unknown'
          }
        );
        
        console.log(`✅ Comprehensive Analysis Complete:
        - System Status: ${comprehensiveAnalysis.systemStatus}
        - Overall Confidence: ${Math.round(comprehensiveAnalysis.overallConfidence * 100)}%
        - Visual Style: ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category || 'unknown'}
        - Content Strategy: ${comprehensiveAnalysis.analysisLevels?.contentQuality?.strategy || 'unknown'}
        - Industry Focus: ${comprehensiveAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry || 'unknown'}`);
        
        // Log detailed analysis results
        if (comprehensiveAnalysis.analysisLevels?.visualIntelligence) {
          const visual = comprehensiveAnalysis.analysisLevels.visualIntelligence;
          console.log(`🎨 Visual Analysis Details:
          - Category: ${visual.visualDNA?.category || 'unknown'}
          - Mood: ${visual.visualDNA?.mood || 'unknown'}
          - Colors: ${visual.colors?.palette?.slice(0, 3).join(', ') || 'none'}
          - Analysis Method: ${visual.analysisMethod || 'unknown'}`);
        }
        
      } catch (analysisError) {
        console.error('❌ Comprehensive analysis failed:', analysisError);
        comprehensiveAnalysis = await imageParser.createFallbackAnalysis(
          portfolioData, 
          completeProjectData,
          { selectedSkeleton, customDesignRequest }
        );
        console.log('⚠️ Using fallback analysis');
      }
    }

    // STEP 3: Handle continuation requests
    if (isContinuation && partialHtml) {
      console.log('🔄 Processing continuation request...');
      
      try {
        const continuationResult = await processContinuationRequest(
          partialHtml, 
          portfolioData, 
          completeProjectData, 
          comprehensiveAnalysis,
          selectedSkeleton,
          customDesignRequest
        );
        
        if (continuationResult.success) {
          console.log('✅ Continuation successful');
          return res.json(continuationResult);
        } else {
          console.log('⚠️ Continuation failed, proceeding with fresh generation');
        }
      } catch (continuationError) {
        console.error('❌ Continuation failed:', continuationError);
        // Continue with fresh generation
      }
    }

// STEP 4: Generate Enhanced Anthropic Messages (FIXED VERSION)
console.log('🤖 Generating enhanced Anthropic messages...');

let anthropicMessages;
try {
  // Use the safe image processing method
  anthropicMessages = await promptGenerator.generateEnhancedAnthropicMessagesWithSafeImages(
    portfolioData, 
    completeProjectData,
    comprehensiveAnalysis,
    moodboardFiles, // Pass raw files, let the generator handle processing safely
    {
      selectedSkeleton,
      customDesignRequest,
      hasProjectImages: projectImageFiles.length > 0,
      systemStatus: comprehensiveAnalysis?.systemStatus || 'BASIC'
    }
  );
  
  console.log(`✅ Enhanced prompt generated successfully:
  - Message count: ${anthropicMessages.length}
  - Has moodboard images: ${moodboardFiles.length > 0}
  - Skeleton: ${selectedSkeleton}
  - Custom request: ${customDesignRequest ? 'Yes' : 'No'}`);
  
} catch (promptError) {
  console.error('❌ Enhanced prompt generation failed:', promptError);
  
  // Fallback to basic text-only prompt
  console.log('⚠️ Using fallback text-only prompt generation');
  const basicPrompt = `Create a professional portfolio website for ${portfolioData.personalInfo?.name || 'Creative Professional'}.

User Details:
- Name: ${portfolioData.personalInfo?.name || 'Creative Professional'}
- Title: ${portfolioData.personalInfo?.title || 'Designer'}
- Email: ${portfolioData.personalInfo?.email || 'contact@portfolio.com'}
- Bio: ${portfolioData.personalInfo?.bio || 'Passionate creative professional'}

Projects: ${completeProjectData.totalProjects || 0} projects with ${completeProjectData.totalImages || 0} images

${selectedSkeleton !== 'none' ? `Design Style: ${selectedSkeleton} skeleton` : ''}
${customDesignRequest ? `Custom Request: ${customDesignRequest}` : ''}

Create a complete, responsive HTML portfolio with embedded CSS and JavaScript. Include project galleries, contact section, and professional navigation.`;
  
  anthropicMessages = [{
    role: 'user',
    content: basicPrompt
  }];
}
    
    // STEP 5: Call Anthropic API
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    console.log('🤖 Sending request to Claude...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: anthropicMessages
    });
    
    // STEP 6: Process HTML response
    let generatedHTML = response.content[0].text.trim();
    
    // Clean up the response
    if (generatedHTML.startsWith('```html')) {
      generatedHTML = generatedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (generatedHTML.startsWith('```')) {
      generatedHTML = generatedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    console.log(`📄 Generated HTML length: ${generatedHTML.length} characters`);

    // STEP 7: Update HTML with project images
    console.log('🖼️ Updating HTML with project images...');
    const htmlWithImages = updateHtmlWithProjectImages(generatedHTML, completeProjectData);
    
    if (htmlWithImages !== generatedHTML) {
      console.log('✅ HTML successfully updated with project images');
    }

    // STEP 8: Validate HTML completeness
    const validation = htmlValidator.validateCompleteness(htmlWithImages);
    
    console.log(`🔍 HTML Validation:
    - Is Complete: ${validation.isComplete}
    - Can Continue: ${validation.canContinue}
    - Estimated Completion: ${Math.round((validation.estimatedCompletion || 0) * 100)}%`);

    // STEP 9: Handle incomplete generation with auto-continuation
    if (!validation.isComplete && !isContinuation && validation.canContinue) {
      console.log('🔄 Generation incomplete, attempting auto-continuation...');
      
      try {
        const autoContinuationResult = await processAutoContinuation(
          htmlWithImages, 
          portfolioData, 
          completeProjectData, 
          comprehensiveAnalysis,
          selectedSkeleton,
          customDesignRequest,
          1 // First attempt
        );
        
        if (autoContinuationResult && autoContinuationResult.success) {
          console.log('✅ Auto-continuation successful');
          return res.json(autoContinuationResult);
        }
      } catch (autoError) {
        console.error('❌ Auto-continuation failed:', autoError);
      }
      
      // Return incomplete response if auto-continuation fails
      return res.json({
        success: false,
        incomplete: true,
        partialHtml: htmlWithImages,
        completionStatus: validation,
        error: 'Generation incomplete',
        details: 'The AI response was cut off before completion. You can continue generation to complete it.',
        metadata: {
          estimatedCompletion: validation.estimatedCompletion,
          issues: validation.issues,
          canContinue: validation.canContinue,
          projectData: completeProjectData,
          comprehensiveAnalysis: comprehensiveAnalysis ? {
            systemStatus: comprehensiveAnalysis.systemStatus,
            confidence: comprehensiveAnalysis.overallConfidence
          } : null,
          autoContinuationAttempted: true,
          processingTime: Date.now() - processingStartTime
        }
      });
    }

    // STEP 10: Apply quality validation and auto-fixes
    let finalHTML = htmlWithImages;
    let validationResults = null;
    let autoFixApplied = false;
    
    try {
      console.log('🔍 Running quality validation...');
      validationResults = await qualityAnalyzer.validatePortfolio(
        htmlWithImages,
        portfolioData,
        completeProjectData
      );

      console.log(`📊 Quality Score: ${validationResults.overall.score}/100`);

      if (validationResults.overall.score < 85) {
        console.log('🔧 Applying auto-fixes...');
        const autoFixResult = await qualityAnalyzer.applyAutoFixes(
          htmlWithImages,
          validationResults,
          portfolioData,
          completeProjectData
        );
        
        if (autoFixResult.success && autoFixResult.improvedHtml) {
          finalHTML = autoFixResult.improvedHtml;
          autoFixApplied = true;
          console.log('✅ Auto-fixes applied successfully');
          
          // Re-update with project images after fixes
          finalHTML = updateHtmlWithProjectImages(finalHTML, completeProjectData);
          
          // Re-validate after fixes
          validationResults = await qualityAnalyzer.validatePortfolio(
            finalHTML,
            portfolioData,
            completeProjectData
          );
          console.log(`📊 Quality Score after fixes: ${validationResults.overall.score}/100`);
        }
      }
    } catch (validationError) {
      console.error('❌ Quality validation error:', validationError);
      validationResults = {
        overall: { score: 75, status: 'unknown' },
        content: { score: 75, issues: [], suggestions: [] },
        design: { score: 75, issues: [], suggestions: [] },
        technical: { score: 75, issues: [], suggestions: [] },
        accessibility: { score: 75, issues: [], suggestions: [] },
        error: 'Validation failed but generation completed'
      };
    }
    
    // STEP 11: Final validation
    if (!finalHTML.includes('<html') && !finalHTML.includes('<!DOCTYPE')) {
      throw new Error('Generated content does not appear to be valid HTML');
    }

    // STEP 12: Save portfolio files
    const portfolioId = `${portfolioData.personalInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const portfolioFolder = path.join(tempDir, `portfolio_${portfolioId}`);
    await fs.ensureDir(portfolioFolder);
    
    const htmlFilePath = path.join(portfolioFolder, 'index.html');
    await fs.writeFile(htmlFilePath, finalHTML);
    
    const processingTimeMs = Date.now() - processingStartTime;
    
    console.log(`✅ Portfolio generation successful!
    - Processing time: ${processingTimeMs}ms
    - Final HTML length: ${finalHTML.length} characters
    - Quality score: ${validationResults?.overall?.score || 'unknown'}
    - Auto-fixes applied: ${autoFixApplied}`);
    
    // STEP 13: Return success response
    res.json({
      success: true,
      portfolio: {
        html: finalHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          overview: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          processingTime: processingTimeMs,
          generationSystem: 'ENHANCED_V2',
          
          // Design inputs
          selectedSkeleton,
          customDesignRequest: customDesignRequest || null,
          hasCustomRequest: !!customDesignRequest,
          skeletonUsed: selectedSkeleton !== 'none',
          moodboardImagesUsed: moodboardFiles.length,
          
          // Project data
          projectData: completeProjectData,
          projectCount: completeProjectData.totalProjects || 0,
          imageCount: completeProjectData.totalImages || 0,
          
          // Analysis results
          comprehensiveAnalysis: comprehensiveAnalysis ? {
            systemStatus: comprehensiveAnalysis.systemStatus,
            overallConfidence: comprehensiveAnalysis.overallConfidence,
            visualStyle: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category,
            visualMood: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.mood,
            contentStrategy: comprehensiveAnalysis.analysisLevels?.contentQuality?.strategy,
            industryFocus: comprehensiveAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry,
            analysisMethod: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.analysisMethod,
            colorPalette: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.colors?.palette?.slice(0, 4),
            processingTime: comprehensiveAnalysis.processingTime
          } : null,
          
          // Quality metrics
          isContinuation,
          validationResult: validation,
          qualityValidation: validationResults,
          autoFixApplied,
          qualityScore: validationResults?.overall?.score || 'unknown',
          
          // File management
          portfolioId: portfolioId,
          portfolioFolder: portfolioFolder
        }
      }
    });
    
    // Clean up temporary files after 24 hours
    setTimeout(() => {
      fs.remove(portfolioFolder).catch(() => {});
    }, 24 * 60 * 60 * 1000);
    
  } catch (error) {
    console.error('❌ Portfolio generation error:', error);
    
    const processingTimeMs = Date.now() - processingStartTime;
    
    // Enhanced error handling with specific error types
    if (error.message && error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'API Configuration Error',
        details: 'Anthropic API key is not configured properly',
        processingTime: processingTimeMs
      });
    }
    
    if (error.message && error.message.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Rate Limit Exceeded',
        details: 'API rate limit exceeded. Please try again later.',
        processingTime: processingTimeMs
      });
    }

    if (error.message && error.message.includes('max_tokens')) {
      return res.status(400).json({
        success: false,
        error: 'Content Too Large',
        details: 'The portfolio content is too large to process. Try reducing the number of projects or images.',
        processingTime: processingTimeMs
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Portfolio Generation Failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred during portfolio generation',
      timestamp: new Date().toISOString(),
      processingTime: processingTimeMs,
      errorType: error.name || 'UnknownError'
    });
  }
});

const processContinuationRequest = async (partialHtml, portfolioData, completeProjectData, comprehensiveAnalysis, selectedSkeleton, customDesignRequest) => {
  console.log('🔄 Processing continuation request...');
  
  try {
    const continuationPrompt = `Continue completing this HTML portfolio. The generation was cut off mid-way.

CONTEXT:
- User: ${portfolioData.personalInfo.name} - ${portfolioData.personalInfo.title}
- Projects: ${completeProjectData.totalProjects || 0}
- Images Available: ${completeProjectData.totalImages || 0}
- Skeleton: ${selectedSkeleton}
- Custom Request: ${customDesignRequest || 'None'}
${comprehensiveAnalysis ? `- Detected Style: ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category || 'modern'}` : ''}
${comprehensiveAnalysis ? `- Color Palette: ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.colors?.palette?.slice(0, 3).join(', ') || 'modern colors'}` : ''}

CURRENT INCOMPLETE HTML:
\`\`\`html
${partialHtml}
\`\`\`

INSTRUCTIONS:
1. Complete the HTML exactly where it was cut off
2. Maintain the same design aesthetic and structure established
3. Ensure all HTML tags are properly closed
4. Include responsive design for all screen sizes
5. Integrate project data and images properly
6. Apply the detected visual style consistently
7. Ensure professional quality throughout

Return ONLY the COMPLETE HTML starting with <!DOCTYPE html> and ending with </html>.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: continuationPrompt }]
    });

    let continuedHTML = response.content[0].text.trim();
    
    // Clean the response
    if (continuedHTML.startsWith('```html')) {
      continuedHTML = continuedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (continuedHTML.startsWith('```')) {
      continuedHTML = continuedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Update with project images
    continuedHTML = updateHtmlWithProjectImages(continuedHTML, completeProjectData);

    // Validate the continued result
    const finalValidation = htmlValidator.validateCompleteness(continuedHTML);
    
    console.log(`✅ Continuation completed: ${finalValidation.isComplete ? 'Complete' : 'Still incomplete'}`);

    const portfolioId = `${portfolioData.personalInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    return {
      success: true,
      portfolio: {
        html: continuedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          overview: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          generationSystem: 'ENHANCED_V2_CONTINUED',
          selectedSkeleton,
          customDesignRequest: customDesignRequest || null,
          projectData: completeProjectData,
          projectCount: completeProjectData.totalProjects || 0,
          imageCount: completeProjectData.totalImages || 0,
          comprehensiveAnalysis: comprehensiveAnalysis ? {
            systemStatus: comprehensiveAnalysis.systemStatus,
            overallConfidence: comprehensiveAnalysis.overallConfidence,
            visualStyle: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category,
            contentStrategy: comprehensiveAnalysis.analysisLevels?.contentQuality?.strategy,
            industryFocus: comprehensiveAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry
          } : null,
          isContinuation: true,
          wasContinued: true,
          validationResult: finalValidation,
          portfolioId: portfolioId
        }
      }
    };

  } catch (error) {
    console.error('❌ Continuation request failed:', error);
    return {
      success: false,
      error: 'Continuation failed',
      details: error.message
    };
  }
};

const processAutoContinuation = async (partialHtml, portfolioData, completeProjectData, comprehensiveAnalysis, selectedSkeleton, customDesignRequest, attempt = 1) => {
  const maxAttempts = 2; // Reduced for faster response
  
  if (attempt > maxAttempts) {
    console.log(`❌ Auto-continuation failed after ${maxAttempts} attempts`);
    return {
      success: false,
      error: 'Max attempts reached',
      partialHtml: partialHtml
    };
  }

  console.log(`🔄 Auto-continuing generation (attempt ${attempt}/${maxAttempts})`);

  try {
    const continuationPrompt = `Continue and complete this HTML portfolio. It was cut off during generation.

USER: ${portfolioData.personalInfo.name} - ${portfolioData.personalInfo.title}
PROJECTS: ${completeProjectData.totalProjects || 0} projects
${comprehensiveAnalysis ? `STYLE: ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category || 'modern'} ${comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.mood || 'professional'}` : ''}
${selectedSkeleton !== 'none' ? `SKELETON: ${selectedSkeleton}` : ''}
${customDesignRequest ? `CUSTOM: ${customDesignRequest}` : ''}

INCOMPLETE HTML:
\`\`\`html
${partialHtml}
\`\`\`

Complete the HTML with proper closing tags and responsive design. Return ONLY the complete HTML.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: continuationPrompt }]
    });

    let continuedHTML = response.content[0].text.trim();
    
    // Clean the response
    if (continuedHTML.startsWith('```html')) {
      continuedHTML = continuedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (continuedHTML.startsWith('```')) {
      continuedHTML = continuedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Update with project images
    continuedHTML = updateHtmlWithProjectImages(continuedHTML, completeProjectData);

    // Validate the continued result
    const finalValidation = htmlValidator.validateCompleteness(continuedHTML);
    
    if (!finalValidation.isComplete && attempt < maxAttempts) {
      console.log(`⚠️ Auto-continuation ${attempt} still incomplete, trying again...`);
      return await processAutoContinuation(
        continuedHTML, 
        portfolioData, 
        completeProjectData, 
        comprehensiveAnalysis,
        selectedSkeleton,
        customDesignRequest,
        attempt + 1
      );
    }

    // Success - return completed portfolio
    const portfolioId = `${portfolioData.personalInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    return {
      success: true,
      portfolio: {
        html: continuedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          overview: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          generationSystem: 'ENHANCED_V2_AUTO_CONTINUED',
          continuationAttempts: attempt,
          finalCompletion: finalValidation.isComplete,
          selectedSkeleton,
          customDesignRequest: customDesignRequest || null,
          projectData: completeProjectData,
          projectCount: completeProjectData.totalProjects || 0,
          imageCount: completeProjectData.totalImages || 0,
          comprehensiveAnalysis: comprehensiveAnalysis ? {
            systemStatus: comprehensiveAnalysis.systemStatus,
            overallConfidence: comprehensiveAnalysis.overallConfidence,
            visualStyle: comprehensiveAnalysis.analysisLevels?.visualIntelligence?.visualDNA?.category,
            contentStrategy: comprehensiveAnalysis.analysisLevels?.contentQuality?.strategy,
            industryFocus: comprehensiveAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry
          } : null,
          isContinuation: true,
          wasAutoContinued: true,
          validationResult: finalValidation,
          portfolioId: portfolioId
        }
      }
    };

  } catch (error) {
    console.error(`❌ Auto-continuation attempt ${attempt} failed:`, error);
    
    if (attempt < maxAttempts) {
      console.log(`🔄 Retrying auto-continuation in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await processAutoContinuation(
        partialHtml, 
        portfolioData, 
        completeProjectData, 
        comprehensiveAnalysis,
        selectedSkeleton,
        customDesignRequest,
        attempt + 1
      );
    }
    
    // Final failure
    return {
      success: false,
      error: 'Auto-continuation failed after multiple attempts',
      partialHtml: partialHtml,
      continuationAttempts: attempt
    };
  }
};

const autoContinueGeneration = async (partialHtml, portfolioData, completeProjectData, enhancedAnalysis, selectedSkeleton, customDesignRequest, attempt = 1) => {
  const maxAttempts = 3;
  
  if (attempt > maxAttempts) {
    console.log(`❌ Auto-continuation failed after ${maxAttempts} attempts`);
    return {
      success: false,
      error: 'Max attempts reached',
      partialHtml: partialHtml
    };
  }

  console.log(`🔄 Auto-continuing generation (attempt ${attempt}/${maxAttempts})`);

  try {
    // Prepare enhanced continuation prompt
    const continuationPrompt = `Continue completing this HTML portfolio. The generation was cut off mid-way.

CONTEXT:
- User: ${portfolioData.personalInfo.name} - ${portfolioData.personalInfo.title}
- Skeleton: ${selectedSkeleton}
- Custom Request: ${customDesignRequest || 'None'}
- Projects: ${completeProjectData.totalProjects}
- Images Available: ${completeProjectData.totalImages}
${enhancedAnalysis ? `- Detected Style: ${enhancedAnalysis.analysisSummary?.visualStyle || 'modern professional'}` : ''}
${enhancedAnalysis ? `- Content Strategy: ${enhancedAnalysis.analysisLevels?.contentQuality?.strategy || 'balanced'}` : ''}

CURRENT INCOMPLETE HTML:
\`\`\`html
${partialHtml}
\`\`\`

INSTRUCTIONS:
1. Complete the HTML exactly where it was cut off
2. Maintain the same design aesthetic and structure
3. Ensure all HTML tags are properly closed
4. Include responsive design for all screen sizes
5. Integrate project images and data properly
6. Apply any moodboard styling that was established
7. Ensure professional quality throughout

Return ONLY the COMPLETE HTML starting with <!DOCTYPE html> and ending with </html>.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: continuationPrompt }]
    });

    let continuedHTML = response.content[0].text.trim();
    
    // Clean the response
    if (continuedHTML.startsWith('```html')) {
      continuedHTML = continuedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (continuedHTML.startsWith('```')) {
      continuedHTML = continuedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Update with project images
    continuedHTML = updateHtmlWithProjectImages(continuedHTML, completeProjectData);

    // Validate the continued result
    const finalValidation = htmlValidator.validateCompleteness(continuedHTML);
    
    if (!finalValidation.isComplete && attempt < maxAttempts) {
      console.log(`⚠️ Continuation ${attempt} still incomplete, trying again...`);
      return await autoContinueGeneration(
        continuedHTML, 
        portfolioData, 
        completeProjectData, 
        enhancedAnalysis,
        selectedSkeleton,
        customDesignRequest,
        attempt + 1
      );
    }

    // Success - return completed portfolio
    const portfolioId = `${portfolioData.personalInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    return {
      success: true,
      portfolio: {
        html: continuedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          overview: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          designStyle: 'auto-continued',
          generationSystem: 'V1_AUTO_CONTINUED',
          continuationAttempts: attempt,
          finalCompletion: finalValidation.isComplete,
          selectedSkeleton,
          customDesignRequest: customDesignRequest || null,
          projectData: completeProjectData,
          projectCount: completeProjectData.totalProjects || 0,
          imageCount: completeProjectData.totalImages || 0,
          enhancedAnalysis: enhancedAnalysis ? {
            systemStatus: enhancedAnalysis.systemStatus,
            overallConfidence: enhancedAnalysis.overallConfidence,
            visualStyle: enhancedAnalysis.analysisSummary?.visualStyle,
            contentStrategy: enhancedAnalysis.analysisLevels?.contentQuality?.strategy,
            industryFocus: enhancedAnalysis.analysisLevels?.industryIntelligence?.detectedIndustry
          } : null,
          isContinuation: true,
          wasAutoContinued: true,
          validationResult: finalValidation,
          portfolioId: portfolioId
        }
      }
    };

  } catch (error) {
    console.error(`❌ Auto-continuation attempt ${attempt} failed:`, error);
    
    if (attempt < maxAttempts) {
      console.log(`🔄 Retrying auto-continuation in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return await autoContinueGeneration(
        partialHtml, 
        portfolioData, 
        completeProjectData, 
        enhancedAnalysis,
        selectedSkeleton,
        customDesignRequest,
        attempt + 1
      );
    }
    
    // Final failure
    return {
      success: false,
      error: 'Auto-continuation failed after multiple attempts',
      partialHtml: partialHtml,
      continuationAttempts: attempt
    };
  }
};

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