/**
 * Utility Routes
 * Handles health checks, waitlist, showroom portfolios, and ZIP creation
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const JSZip = require('jszip');
const { GoogleSheetsTracker } = require('../utils/googleSheets');
const { detailedHealthCheck } = require('../middleware/portfolioMiddleware');
const { logger } = require('../utils/logger');
const { errorResponse, successResponse, ErrorTypes, sendError } = require('../helpers/responseHelper');

const router = express.Router();

// Get temp directory based on environment
const tempDir = process.env.NODE_ENV === 'production' || process.env.VERCEL
  ? '/tmp'
  : path.join(__dirname, '..', 'temp');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createSheetsTracker = ({ sheetId, sheetName, fallbackName }) => (
  new GoogleSheetsTracker({
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    sheetId,
    sheetName: sheetName || fallbackName
  })
);

const ensureTracker = (tracker, description) => {
  if (!tracker.initialized) {
    const error = new Error(`${description} tracker not configured`);
    error.statusCode = 500;
    throw error;
  }
  return tracker;
};

const fetchSheetValues = async (tracker, range, description) => {
  try {
    const response = await tracker.sheets.spreadsheets.values.get({
      spreadsheetId: tracker.sheetId,
      range
    });
    return response.data.values || [];
  } catch (error) {
    logger.error(`Failed getting ${description} data`, error);
    throw new Error(`Unable to load ${description} data`);
  }
};

const commaSeparatedToArray = value =>
  value ? value.split(',').map(entry => entry.trim()).filter(Boolean) : [];

const buildUserInfoMap = (rows = []) => {
  const map = new Map();
  rows.slice(1).forEach(row => {
    const email = row[1];
    if (!email) return;
    map.set(email, {
      name: row[2] || '',
      title: row[3] || '',
      bio: row[4] || '',
      phone: row[5] || '',
      linkedin: row[6] || '',
      instagram: row[7] || '',
      skills: commaSeparatedToArray(row[8]),
      experiences: row[9] || '',
      education: row[10] || '',
    });
  });
  return map;
};

const buildProjectInfoMap = (rows = []) => {
  const map = new Map();
  rows.slice(1).forEach(row => {
    const projectId = row[2];
    const status = row[12];
    if (!projectId || status !== 'active') return;
    map.set(projectId, {
      id: projectId,
      title: row[3] || '',
      subtitle: row[4] || '',
      overview: row[5] || '',
      category: row[6] || '',
      customCategory: row[7] || '',
      tags: commaSeparatedToArray(row[8]),
      createdAt: row[0] || '',
      processImagesCount: parseInt(row[9], 10) || 0,
      finalImagesCount: parseInt(row[10], 10) || 0,
      imageMetadata: row[11] || '',
    });
  });
  return map;
};

const parseProjectIds = (projectIdsJson) => {
  try {
    const parsed = JSON.parse(projectIdsJson);
    return Object.values(parsed);
  } catch {
    return [];
  }
};

/**
 * GET /api/health
 * Health check endpoint with detailed system information
 * Uses detailedHealthCheck middleware
 */
router.get('/health', detailedHealthCheck);

/**
 * POST /api/join-waitlist
 * Add email to waitlist
 */
router.post('/join-waitlist', async (req, res) => {
  try {
    const { email } = req.body;

    const normalizedEmail = email?.trim();
    if (!normalizedEmail) {
      return sendError(res, ErrorTypes.BAD_REQUEST, 'Email is required');
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return sendError(res, ErrorTypes.BAD_REQUEST, 'Invalid email format');
    }

    const waitlistTracker = ensureTracker(
      createSheetsTracker({
        sheetId: process.env.GOOGLE_SHEETS_ID2,
        sheetName: process.env.GOOGLE_SHEETS_NAME2,
        fallbackName: 'Sheet1'
      }),
      'Waitlist'
    );

    try {
      const emailColumn = await fetchSheetValues(
        waitlistTracker,
        `${waitlistTracker.sheetName}!B:B`,
        'waitlist emails'
      );
      const existingEmails = emailColumn.slice(1).map(row => row[0]);

      if (existingEmails.includes(normalizedEmail)) {
        logger.warn(`Email already on waitlist: ${normalizedEmail}`);
        return res.status(409).json({
          success: false,
          error: 'Email already registered',
          message: 'This email is already on the waitlist'
        });
      }
    } catch (error) {
      logger.warn('Could not check for duplicate emails', error);
    }

    await waitlistTracker.sheets.spreadsheets.values.append({
      spreadsheetId: waitlistTracker.sheetId,
      range: `${waitlistTracker.sheetName}!A:B`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[new Date().toISOString(), normalizedEmail]],
      },
    });

    logger.success(`Successfully added email to waitlist: ${normalizedEmail}`);

    res.json({
      success: true,
      message: 'Successfully joined waitlist',
      email: normalizedEmail,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error adding to waitlist', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join waitlist',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

/**
 * GET /api/get-showroom-portfolios
 * Fetch and aggregate portfolio data for the showroom
 * Combines data from Portfolio Details, User Info, and Project Info sheets
 */
router.get('/get-showroom-portfolios', async (req, res) => {
  try {
    logger.info('Starting showroom data fetch...');

    const portfolioDetailsTracker = ensureTracker(
      createSheetsTracker({
        sheetId: process.env.GOOGLE_SHEETS_ID3,
        sheetName: process.env.GOOGLE_SHEETS_NAME5,
        fallbackName: 'Portfolio Details'
      }),
      'Portfolio Details'
    );
    const userInfoTracker = ensureTracker(
      createSheetsTracker({
        sheetId: process.env.GOOGLE_SHEETS_ID3,
        sheetName: process.env.GOOGLE_SHEETS_NAME2,
        fallbackName: 'User Info'
      }),
      'User Info'
    );
    const projectsTracker = ensureTracker(
      createSheetsTracker({
        sheetId: process.env.GOOGLE_SHEETS_ID3,
        sheetName: process.env.GOOGLE_SHEETS_NAME3,
        fallbackName: 'Project Info'
      }),
      'Project Info'
    );

    const [deploymentRows, userRows, projectRows] = await Promise.all([
      fetchSheetValues(portfolioDetailsTracker, `${portfolioDetailsTracker.sheetName}!A:D`, 'portfolio deployments'),
      fetchSheetValues(userInfoTracker, `${userInfoTracker.sheetName}!A:L`, 'user info'),
      fetchSheetValues(projectsTracker, `${projectsTracker.sheetName}!A:M`, 'project info'),
    ]);

    logger.info(`Fetched showroom data: ${deploymentRows.length - 1} deployments, ${userRows.length - 1} users, ${projectRows.length - 1} projects`);

    const userInfoMap = buildUserInfoMap(userRows);
    const projectInfoMap = buildProjectInfoMap(projectRows);
    const portfolios = [];

    deploymentRows.slice(1).forEach(deploymentRow => {
      const timestamp = deploymentRow[0];
      const email = deploymentRow[1];
      const projectIdsJson = deploymentRow[2];
      const portfolioUrl = deploymentRow[3];

      if (!email || !portfolioUrl || !projectIdsJson) {
        logger.warn(`Skipping incomplete deployment record: ${email}`);
        return;
      }

      const userInfo = userInfoMap.get(email);
      if (!userInfo || !userInfo.name) {
        logger.warn(`No user info found for: ${email}`);
        return;
      }

      const projectIds = parseProjectIds(projectIdsJson);
      if (projectIds.length === 0) {
        logger.warn(`No valid project IDs for deployment: ${email}`);
        return;
      }

      const projects = projectIds
        .map(projectId => {
          const projectInfo = projectInfoMap.get(projectId);
          if (!projectInfo) {
            logger.warn(`Project not found: ${projectId}`);
          }
          return projectInfo;
        })
        .filter(Boolean);

      if (projects.length === 0) {
        logger.warn(`No valid projects found for portfolio: ${email}`);
        return;
      }

      portfolios.push({
        id: `portfolio_${email.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`,
        personName: userInfo.name,
        title: userInfo.title,
        email,
        phone: userInfo.phone,
        linkedin: userInfo.linkedin,
        instagram: userInfo.instagram,
        bio: userInfo.bio,
        portfolioUrl,
        deployedAt: timestamp,
        projects,
        skills: userInfo.skills,
        experiences: userInfo.experiences,
        education: userInfo.education,
        totalProjects: projects.length,
        totalImages: projects.reduce((sum, p) => sum + p.processImagesCount + p.finalImagesCount, 0)
      });
    });

    // Sort portfolios by deployment date (newest first)
    portfolios.sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime());

    logger.success(`Showroom ready with ${portfolios.length} portfolios`);

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
    logger.error('Showroom API error', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to fetch showroom data',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/create-zip
 * Create a ZIP file containing the portfolio HTML and images
 */
router.post('/create-zip', async (req, res) => {
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
      logger.error(`HTML file not found: ${filePath}`);
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
        logger.warn(`Could not add image ${imageFile.originalSrc} to ZIP`, error);
      }
    }

    // Add the updated HTML file to ZIP
    zip.file("index.html", htmlContent);

    // Generate ZIP buffer
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    logger.success(`Created ZIP file: ${filename} with ${imageFiles.length} images`);

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
        logger.debug('Cleaned up temp files');
      } catch (error) {
        logger.warn('Error cleaning up temp files', error);
      }
    }, 5000);

  } catch (error) {
    logger.error('Error creating zip', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create zip file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
