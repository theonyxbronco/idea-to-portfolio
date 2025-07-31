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
const promptGenerator = require('./utils/promptGenerator');
const imageParser = require('./utils/imageParser');
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
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
const cloudinaryUploader = require('./utils/cloudinaryUploader');
const crypto = require('crypto');


app.use(securityHeaders);
app.use(requestLogger);
app.use(rateLimit);

app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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
  sheetId: process.env.GOOGLE_SHEETS_ID,
  sheetName: process.env.GOOGLE_SHEETS_NAME
});

// Helper to calculate SHA1 hash
const calculateSha = (content) => {
  return crypto.createHash('sha1').update(content).digest('hex');
};

// Recursively get all files with their paths and content
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

// Clean folder names for Netlify
const cleanFolderName = (name) => {
  return name.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 50);
};

app.post('/api/deploy-folder-to-netlify', async (req, res) => {
  const { htmlContent, netlifyToken, personName } = req.body;
  
  // Validate inputs
  if (!htmlContent || !netlifyToken || !personName) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters'
    });
  }

  let deployFolderPath;
  let siteId;

  try {
    // 1. Create deployment folder
    const timestamp = Date.now();
    const folderName = `${cleanFolderName(personName)}_${timestamp}`;
    deployFolderPath = path.join(__dirname, 'temp-deployments', folderName);
    await fs.ensureDir(deployFolderPath);

    // 2. Save HTML as index.html
    await fs.writeFile(path.join(deployFolderPath, 'index.html'), htmlContent);

    // 3. Add SPA redirects file
    await fs.writeFile(
      path.join(deployFolderPath, '_redirects'),
      '/* /index.html 200'
    );

    // 4. Get all files recursively
    const files = await getFilesRecursively(deployFolderPath);

    // 5. Create file manifest with SHA hashes
    const fileManifest = {};
    files.forEach(file => {
      fileManifest[file.relativePath] = calculateSha(file.content);
    });

    // 6. Create site on Netlify
    const siteResponse = await axios.post(
      'https://api.netlify.com/api/v1/sites',
      { name: folderName },
      { 
        headers: { 
          'Authorization': `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    siteId = siteResponse.data.id;

    // 7. Create deployment with file manifest
    const deployResponse = await axios.post(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      { files: fileManifest },
      { 
        headers: { 
          'Authorization': `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 8. Upload required files in parallel
    const { required } = deployResponse.data;
    if (required && typeof required === 'object') {
      await Promise.all(
        Object.entries(required).map(async ([filePath, uploadUrl]) => {
          const file = files.find(f => f.relativePath === filePath);
          if (file) {
            await axios.put(uploadUrl, file.content, {
              headers: { 'Content-Type': 'application/octet-stream' },
              maxContentLength: Infinity,
              maxBodyLength: Infinity
            });
          }
        })
      );
    }

    // 9. Poll deployment status with timeout
    const startTime = Date.now();
    const timeoutMs = 30000;
    let deployStatus = 'building';

    while (deployStatus === 'building' && Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(
        `https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployResponse.data.id}`,
        { headers: { 'Authorization': `Bearer ${netlifyToken}` } }
      );
      deployStatus = statusResponse.data.state;
    }

    // 10. Get final site details
    const siteDetails = await axios.get(
      `https://api.netlify.com/api/v1/sites/${siteId}`,
      { headers: { 'Authorization': `Bearer ${netlifyToken}` } }
    );

    // 11. Clean up
    await fs.remove(deployFolderPath).catch(console.error);

    return res.json({
      success: true,
      deployment: {
        url: siteDetails.data.ssl_url || siteDetails.data.url,
        siteId: siteDetails.data.id,
        deployId: deployResponse.data.id,
        status: deployStatus,
        folderName
      }
    });

  } catch (error) {
    // Cleanup on error
    if (deployFolderPath) {
      await fs.remove(deployFolderPath).catch(console.error);
    }

    console.error('Deployment error:', error);
    
    const errorResponse = {
      success: false,
      error: 'Deployment failed',
      details: error.message
    };

    if (error.response) {
      errorResponse.error = error.response.data.error || error.response.statusText;
      errorResponse.details = error.response.data.message;
      console.error('Netlify API error:', error.response.data);
    }

    return res.status(500).json(errorResponse);
  }
});

app.post('/api/save-user-info', async (req, res) => {
  try {
    const { personalInfo, userEmail } = req.body;
    
    if (!personalInfo || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validation
    if (!personalInfo.name?.trim() || !personalInfo.title?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name and title are required'
      });
    }

    // Create Google Sheets tracker for user info (GOOGLE_SHEETS_ID3 + GOOGLE_SHEETS_NAME2)
    const userInfoTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info'
    });

    if (!userInfoTracker.initialized) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured for user info'
      });
    }

    // Check if user already exists
    let existingRowIndex = null;
    try {
      const response = await userInfoTracker.sheets.spreadsheets.values.get({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A:B`,
      });

      const rows = response.data.values || [];
      existingRowIndex = rows.findIndex((row, index) => 
        index > 0 && row[1] === userEmail // Skip header row, check email column
      );
    } catch (error) {
      console.warn('Could not check for existing user:', error.message);
    }

    // Prepare user data for sheets with exact headers you specified
    const userData = [
      new Date().toISOString(), // Timestamp
      userEmail, // Email
      personalInfo.name || '', // Full Name
      personalInfo.title || '', // Job Title/Role
      personalInfo.bio || '', // Bio/Description
      personalInfo.phone || '', // Phone Number
      personalInfo.linkedin || '', // LinkedIn URL
      personalInfo.instagram || personalInfo.twitter || personalInfo.socialHandle || '', // Social Media Handle
      (personalInfo.skills || []).join(', '), // Skills
      personalInfo.experience || JSON.stringify(personalInfo.experiences || []), // Experience
      personalInfo.education || JSON.stringify(personalInfo.education || []) // Education
    ];

    if (existingRowIndex !== -1) {
      // Update existing row
      const actualRowIndex = existingRowIndex + 1; // Convert to 1-based index
      await userInfoTracker.sheets.spreadsheets.values.update({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A${actualRowIndex}:K${actualRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [userData],
        },
      });
    } else {
      // Add new row
      await userInfoTracker.sheets.spreadsheets.values.append({
        spreadsheetId: userInfoTracker.sheetId,
        range: `${userInfoTracker.sheetName}!A:K`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [userData],
        },
      });
    }

    console.log(`Successfully saved user info for: ${userEmail}`);
    
    res.json({
      success: true,
      message: existingRowIndex !== -1 ? 'User information updated' : 'User information saved',
      timestamp: new Date().toISOString()
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
      range: `${userInfoTracker.sheetName}!A:K`,
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
      educationText: userRow[10] || ''
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
    // Ensure User Info sheet headers with your exact specification
    const userInfoTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info'
    });

    if (userInfoTracker.initialized) {
      const userHeaders = await userInfoTracker.getHeaders();
      if (!userHeaders || userHeaders.length === 0) {
        // Your exact header specification
        const defaultUserHeaders = [
          'Timestamp',
          'Email', 
          'Full Name',
          'Job Title/Role',
          'Bio/Description',
          'Phone Number',
          'LinkedIn URL',
          'Social Media Handle',
          'Skills',
          'Experience',
          'Education'
        ];
        
        await userInfoTracker.sheets.spreadsheets.values.update({
          spreadsheetId: userInfoTracker.sheetId,
          range: `${userInfoTracker.sheetName}!1:1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [defaultUserHeaders],
          },
        });
        
        console.log('User Info sheet headers created with specified titles');
      }
    }

  } catch (error) {
    console.error('Error ensuring user info sheet headers:', error);
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

    // Find the existing project row
    const response = await projectsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A:P`,
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

    // Handle image updates if new files provided
    let savedImages = null;
    const projectFolder = path.join(tempDir, 'projects', projectData.id);

    if (files.length > 0) {
      try {
        if (cloudinaryUploader.initialized) {
          console.log('🌩️ Uploading updated project images to Cloudinary...');
          savedImages = await cloudinaryUploader.uploadProjectImages(files, projectData.id, projectData.userEmail);
        } else {
          console.log('⚠️ Cloudinary not configured, using local storage for updates');
          await fs.ensureDir(projectFolder);
          
          savedImages = {
            process: [],
            final: null,
            projectFolder: projectFolder
          };

          // Process uploaded files
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

    // Get existing image metadata or create new
    let existingImageData = {};
    try {
      const existingMetadata = rows[projectRowIndex][11]; // Column L contains image metadata
      if (existingMetadata) {
        existingImageData = JSON.parse(existingMetadata);
      }
    } catch (error) {
      console.warn('Could not parse existing image metadata');
    }

    // Merge existing and new image data
    let imageMetadata = {};
    if (cloudinaryUploader.initialized && savedImages) {
      // Cloudinary format - use Cloudinary URLs
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
      // Local storage format
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
      new Date().toISOString(), // Updated timestamp
      projectData.userEmail, // Email (referral ID)
      projectData.id, // Project ID
      projectData.title || '',
      projectData.subtitle || '',
      projectData.overview || '',
      projectData.category || projectData.customCategory || '',
      projectData.customCategory || '',
      (projectData.tags || []).join(', '),
      imageMetadata.processImages.length, // Number of process images
      imageMetadata.finalImages.length, // Number of final images
      JSON.stringify(imageMetadata), // Image metadata JSON
      'active' // Status
    ];
    
    // Update the row in Google Sheets
    const actualRowIndex = projectRowIndex + 1;
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

    // Find the project row
    const response = await projectsTracker.sheets.spreadsheets.values.get({
      spreadsheetId: projectsTracker.sheetId,
      range: `${projectsTracker.sheetName}!A:P`,
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
      range: `${projectsTracker.sheetName}!P${actualRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['deleted']],
      },
    });

    // Clean up project files
    const projectFolder = path.join(tempDir, 'projects', projectId);
    if (await fs.pathExists(projectFolder)) {
      await fs.remove(projectFolder);
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

const ensureSheetHeaders = async () => {
  try {
    // Ensure User Info sheet headers
    const userInfoTracker = new GoogleSheetsTracker({
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info'
    });

    if (userInfoTracker.initialized) {
      const userHeaders = await userInfoTracker.getHeaders();
      if (!userHeaders || userHeaders.length === 0) {
        const defaultUserHeaders = [
          'Timestamp', 'Email', 'Name', 'Title', 'Bio', 'Phone',
          'LinkedIn', 'Instagram', 'Skills', 'Experiences', 'Education'
        ];
        
        await userInfoTracker.sheets.spreadsheets.values.update({
          spreadsheetId: userInfoTracker.sheetId,
          range: `${userInfoTracker.sheetName}!1:1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [defaultUserHeaders],
          },
        });
        
        console.log('User Info sheet headers created');
      }
    }

    // Ensure Project Info sheet headers
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
          // Removed: Problem, Solution, Reflection
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

const deployPortfolioToNetlify = async (portfolioFolder, token) => {
  if (!token) throw new Error('Netlify access token is required');
  if (!portfolioFolder) throw new Error('Portfolio folder is required');

  const baseUrl = 'https://api.netlify.com/api/v1';
  
  try {
    console.log('Starting Netlify deployment...');

    // First, create an empty site
    const siteResponse = await axios.post(`${baseUrl}/sites`, {
      name: `portfolio-${Date.now()}`
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const site = siteResponse.data;
    console.log('Created Netlify site:', site.name, site.id);

    // Read all files from the portfolio folder
    const files = await fs.readdir(portfolioFolder);
    const fileUploads = {};

    for (const fileName of files) {
      const filePath = path.join(portfolioFolder, fileName);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        console.log('Processing file:', fileName);
        const fileContent = await fs.readFile(filePath);
        
        // For text files, use UTF-8, for binary files use base64
        const isTextFile = fileName.endsWith('.html') || fileName.endsWith('.css') || fileName.endsWith('.js') || fileName.endsWith('.txt');
        
        if (isTextFile) {
          fileUploads[fileName] = fileContent.toString('utf8');
        } else {
          // Binary files (images, etc.)
          fileUploads[fileName] = {
            content: fileContent.toString('base64'),
            encoding: 'base64'
          };
        }
      }
    }

    console.log('Files prepared for upload:', Object.keys(fileUploads));

    // Deploy the files
    const deployResponse = await axios.post(`${baseUrl}/sites/${site.id}/deploys`, {
      files: fileUploads
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const deployment = deployResponse.data;
    console.log('Deployment created:', deployment.id);

    // Wait for deployment to complete
    let deploymentStatus = 'building';
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (deploymentStatus === 'building' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      try {
        const statusResponse = await axios.get(`${baseUrl}/sites/${site.id}/deploys/${deployment.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        deploymentStatus = statusResponse.data.state;
        console.log(`Deployment status (attempt ${attempts}):`, deploymentStatus);
      } catch (statusError) {
        console.warn('Could not check deployment status:', statusError.message);
        break; // Continue anyway
      }
    }

    const finalUrl = site.ssl_url || site.url || `https://${site.subdomain}.netlify.app`;
    
    return {
      url: finalUrl,
      siteId: site.id,
      deployId: deployment.id,
      siteName: site.name,
      subdomain: site.subdomain,
      platform: 'Netlify',
      deployedAt: new Date().toISOString(),
      status: deploymentStatus
    };

  } catch (error) {
    console.error('Netlify deployment failed:', error);
    
    if (error.response) {
      console.error('Netlify API Error:', error.response.status, error.response.data);
      throw new Error(`Netlify API Error: ${error.response.data.message || error.response.statusText}`);
    } else if (error.request) {
      console.error('Network Error:', error.message);
      throw new Error('Network error: Could not reach Netlify API');
    } else {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
};

app.post('/api/generate-portfolio', upload.any(), validatePortfolioData, async (req, res) => {
  const processingStartTime = Date.now();
  
  try {
    const portfolioData = req.portfolioData;
    const files = req.files || [];
    const isContinuation = req.body.continueGeneration === 'true';
    const partialHtml = req.body.partialHtml;

    if (sheetsTracker.initialized) {
      sheetsTracker.appendData(
        portfolioData, 
        req.headers['user-agent'] || 'unknown',
        req.headers['sec-ch-ua-width'] || 'unknown'
      ).catch(() => {});
    }

    // Handle moodboard images - ONLY for AI analysis, never saved
    let moodboardAnalysis = null;
    const moodboardFiles = files.filter(file => {
      const fieldName = (file.fieldname || '').toLowerCase();
      const originalName = (file.originalname || '').toLowerCase();
      return fieldName.includes('moodboard') || originalName.includes('moodboard');
    });

    if (moodboardFiles.length > 0 && !isContinuation) {
      try {
        // Analyze moodboard images in memory only (optional local analysis)
        const moodboardPaths = await Promise.all(
          moodboardFiles.map(async (file) => {
            // Create temporary file for analysis only
            const tempPath = path.join(tempDir, 'temp_analysis', `moodboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`);
            await fs.ensureDir(path.dirname(tempPath));
            await fs.writeFile(tempPath, file.buffer);
            return tempPath;
          })
        );
        
        moodboardAnalysis = await imageParser.analyzeImageSet(moodboardPaths, 'moodboard');
        
        // Clean up temporary files immediately after analysis
        await Promise.all(moodboardPaths.map(path => fs.remove(path).catch(() => {})));
        
      } catch (analysisError) {
        console.error('Moodboard analysis failed:', analysisError);
      }
    }

    // Get project images from Google Sheets metadata only
    const projectImages = await getProjectImagesFromSheets(portfolioData.personalInfo.email);

    let anthropicMessages;
    if (isContinuation && partialHtml) {
      anthropicMessages = [{
        role: 'user',
        content: htmlValidator.generateContinuationPrompt(partialHtml, portfolioData)
      }];
    } else {
      const designStyle = portfolioData.stylePreferences?.mood?.toLowerCase() || 'modern';
      try {
        anthropicMessages = await promptGenerator.generateAnthropicMessages(
          portfolioData, 
          projectImages, 
          designStyle,
          moodboardAnalysis
        );

        // Add moodboard images to the messages if available
        if (moodboardFiles.length > 0) {
          await promptGenerator.addMoodboardImagesToContent(
            anthropicMessages[0].content,
            moodboardFiles
          );
        }
      } catch {
        anthropicMessages = [{
          role: 'user',
          content: await promptGenerator.generateStyledPrompt(
            portfolioData, 
            projectImages, 
            designStyle,
            moodboardAnalysis
          )
        }];
      }
    }
    
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
    
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
      if (cleanedHTML.startsWith('```html')) cleanedHTML = cleanedHTML.replace(/^```html\n/, '').replace(/\n```$/, '');
      else if (cleanedHTML.startsWith('```')) cleanedHTML = cleanedHTML.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Update HTML with project image URLs from sheets
    cleanedHTML = updateHtmlWithProjectImages(cleanedHTML, projectImages);

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
          projectImages: projectImages,
          moodboardAnalyzed: !!moodboardAnalysis
        }
      });
    }

    let validatedHTML = cleanedHTML;
    let validationResults = null;
    let autoFixApplied = false;
    
    try {
      validationResults = await qualityAnalyzer.validatePortfolio(
        cleanedHTML,
        portfolioData,
        projectImages
      );

      if (validationResults.overall.score < 85) {
        const autoFixResult = await qualityAnalyzer.applyAutoFixes(
          cleanedHTML,
          validationResults,
          portfolioData,
          projectImages
        );
        
        if (autoFixResult.success && autoFixResult.improvedHtml) {
          validatedHTML = autoFixResult.improvedHtml;
          autoFixApplied = true;
          
          // Update with project images again after auto-fixes
          validatedHTML = updateHtmlWithProjectImages(validatedHTML, projectImages);
          
          validationResults = await qualityAnalyzer.validatePortfolio(
            validatedHTML,
            portfolioData,
            projectImages
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
    
    // Save the final HTML file only
    const htmlFilePath = path.join(portfolioFolder, 'index.html');
    await fs.writeFile(htmlFilePath, validatedHTML);
    
    const processingTimeMs = Date.now() - processingStartTime;
    
    res.json({
      success: true,
      portfolio: {
        html: validatedHTML,
        metadata: {
          title: `${portfolioData.personalInfo.name} - Portfolio`,
          description: portfolioData.personalInfo.bio || `Portfolio of ${portfolioData.personalInfo.name}, ${portfolioData.personalInfo.title}`,
          generatedAt: new Date().toISOString(),
          processingTime: processingTimeMs,
          designStyle: isContinuation ? 'continued' : (portfolioData.stylePreferences?.mood || 'modern'),
          projectImages: projectImages,
          isContinuation,
          validationResult: validation,
          qualityValidation: validationResults,
          autoFixApplied,
          qualityScore: validationResults?.overall?.score || 'unknown',
          moodboardAnalyzed: !!moodboardAnalysis,
          portfolioId: portfolioId,
          portfolioFolder: portfolioFolder
        }
      }
    });
    
    // Clean up portfolio folder after 24 hours
    setTimeout(() => {
      fs.remove(portfolioFolder).catch(() => {});
    }, 24 * 60 * 60 * 1000); // 24 hours
    
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
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
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

    const projectImages = userProjects.map((row, projectIndex) => {
      const projectData = {
        projectId: row[2] || `project_${projectIndex}`,
        title: row[3] || 'Untitled Project',
        processImages: [],
        finalImages: []
      };

      const imageMetadataJson = row[11];
      if (imageMetadataJson) {
        try {
          const imageMetadata = JSON.parse(imageMetadataJson);
          
          // Process final images
          if (imageMetadata.finalImages) {
            projectData.finalImages = imageMetadata.finalImages.map(img => ({
              ...img,
              url: img.url // Use URL as-is from Cloudinary
            }));
          }

          // Process process images
          if (imageMetadata.processImages) {
            projectData.processImages = imageMetadata.processImages.map(img => ({
              ...img,
              url: img.url // Use URL as-is from Cloudinary
            }));
          }
        } catch (error) {
          console.warn('Error parsing image metadata:', error);
        }
      }

      return projectData;
    });

    return { projectImages };
  } catch (error) {
    console.error('Error fetching project images:', error);
    return { projectImages: [] };
  }
};

const updateHtmlWithProjectImages = (html, projectImages) => {
  let updatedHtml = html;
  
  if (!projectImages || !projectImages.projectImages) {
    return updatedHtml;
  }

  // Create a mapping of placeholder patterns to actual URLs
  const replacements = [];
  
  projectImages.projectImages.forEach((project) => {
    // Process final images
    project.finalImages.forEach((image, index) => {
      const cleanUrl = image.url; // Already clean from getProjectImagesFromSheets
      replacements.push({
        pattern: new RegExp(`(?:\./)?uploads/final_${index + 1}\\.\\w+`, 'gi'),
        replacement: cleanUrl
      });
      replacements.push({
        pattern: new RegExp(`placeholder_final_${index + 1}`, 'gi'),
        replacement: cleanUrl
      });
    });

    // Process process images
    project.processImages.forEach((image, index) => {
      const cleanUrl = image.url; // Already clean from getProjectImagesFromSheets
      replacements.push({
        pattern: new RegExp(`(?:\./)?uploads/process_${index + 1}\\.\\w+`, 'gi'),
        replacement: cleanUrl
      });
      replacements.push({
        pattern: new RegExp(`placeholder_process_${index + 1}`, 'gi'),
        replacement: cleanUrl
      });
    });
  });

  // Apply all replacements
  replacements.forEach(({pattern, replacement}) => {
    updatedHtml = updatedHtml.replace(pattern, replacement);
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
  console.log('Request body keys:', Object.keys(req.body || {}));
  
  try {
    const { htmlContent, editRequest } = req.body;
    
    console.log('HTML Content received:', !!htmlContent);
    console.log('Edit Request received:', !!editRequest);
    
    // Validation
    if (!htmlContent || !editRequest) {
      console.log('Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Both htmlContent and editRequest are required'
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Missing Anthropic API key');
      return res.status(500).json({
        success: false,
        error: 'API Configuration Error',
        details: 'Anthropic API key is not configured properly'
      });
    }

    console.log('Making request to Anthropic API...');

    // Prepare the prompt for Claude
    const prompt = `You are a web design assistant that helps modify HTML/CSS based on user requests.
The user has provided their current HTML and wants to make the following changes:
"${editRequest}"

Here is the current HTML:
\`\`\`html
${htmlContent}
\`\`\`

Please respond with ONLY the modified HTML that implements the requested changes.
The HTML should be complete and valid. Do not include any explanations or markdown formatting.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    console.log('Received response from Anthropic API');

    let modifiedHtml = response.content[0].text.trim();
    
    // Clean up the response if it includes markdown formatting
    if (modifiedHtml.startsWith('```html')) {
      modifiedHtml = modifiedHtml.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (modifiedHtml.startsWith('```')) {
      modifiedHtml = modifiedHtml.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    console.log('Sending successful response');

    // Ensure we're sending valid JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      modifiedHtml,
      metadata: {
        processedAt: new Date().toISOString(),
        request: editRequest,
        originalLength: htmlContent.length,
        modifiedLength: modifiedHtml.length
      }
    });

  } catch (error) {
    console.error('AI Edit Error:', error);
    
    // Handle specific error types
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
    
    // Ensure we're sending valid JSON even in error cases
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
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
    description: 'AI-powered portfolio generation using Anthropic Claude with computer vision image analysis',
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

const server = app.listen(PORT, () => {
  const uploadDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads', 'processed'),
    path.join(__dirname, 'uploads', 'temp'),
    tempDir
  ];

  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  console.log(`Portfolio Generator API running on port ${PORT}`);
  console.log(`Temp directory: ${tempDir}`);
});

module.exports = app;