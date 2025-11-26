/**
 * Deployment Routes
 * Handles Netlify deployment operations and deployment tracking
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const { GoogleSheetsTracker } = require('../utils/googleSheets');
const { Logger } = require('../utils/logger');

const logger = new Logger('DeploymentRoutes');

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const POLL_INTERVAL_MS = 2000;
const MAX_STATUS_POLLS = 60;

const createTracker = ({ sheetId, sheetName, fallbackName }) =>
  new GoogleSheetsTracker({
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    sheetId,
    sheetName: sheetName || fallbackName,
  });

const ensureTracker = (tracker, context) => {
  if (!tracker.initialized) {
    const error = new Error(`${context} tracker not configured`);
    error.statusCode = 500;
    throw error;
  }
  return tracker;
};

const ensureSheetHeaders = async (tracker, headers) => {
  const currentHeaders = await tracker.getHeaders();
  if (currentHeaders && currentHeaders.length > 0) return;

  await tracker.sheets.spreadsheets.values.update({
    spreadsheetId: tracker.sheetId,
    range: `${tracker.sheetName}!1:1`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [headers] },
  });
};

const formatProjectIds = (projectIds) => {
  if (Array.isArray(projectIds) && projectIds.length > 0) {
    const mapped = {};
    projectIds.forEach((id, index) => {
      mapped[(index + 1).toString()] = id;
    });
    return JSON.stringify(mapped);
  }

  if (typeof projectIds === 'string' && projectIds.trim().length > 0) {
    return JSON.stringify({ 1: projectIds });
  }

  return JSON.stringify({ 1: 'unknown' });
};

const checkUserLimits = async (req, email) => {
  const limitsResponse = await fetch(
    `${req.protocol}://${req.get('host')}/api/check-user-limits?email=${encodeURIComponent(email)}`
  );

  if (!limitsResponse.ok) {
    throw new Error('Failed to check user limits');
  }

  const limitsData = await limitsResponse.json();

  if (!limitsData.success) {
    throw new Error('Unable to verify user permissions');
  }

  return limitsData.data;
};

const buildPaywallError = ({ paywall, tier, limits, usage, remaining }) => ({
  success: false,
  error: 'DEPLOYMENT_BLOCKED',
  paywall: true,
  details: paywall.reason === 'FREE_TIER_NO_DEPLOYMENT'
    ? 'Free tier users cannot deploy portfolios. Please upgrade to Student or Pro to deploy your portfolio.'
    : `You have reached your deployment limit for ${tier} tier. Please upgrade to Pro for unlimited deployments.`,
  tier,
  upgradeRequired: paywall.upgradeRequired,
  limits,
  usage,
  remaining,
});

const trackPortfolioDeployment = async ({ email, projectIds, finalUrl, tier }) => {
  const tracker = ensureTracker(
    createTracker({
      sheetId: process.env.GOOGLE_SHEETS_ID3,
      sheetName: process.env.GOOGLE_SHEETS_NAME5,
      fallbackName: 'Portfolio Details'
    }),
    'Portfolio Details'
  );

  await ensureSheetHeaders(tracker, [
    'Timestamp',
    'Email',
    'Project ID(s)',
    'Portfolio URL',
    'Tier at Deploy'
  ]);

  await tracker.sheets.spreadsheets.values.append({
    spreadsheetId: tracker.sheetId,
    range: `${tracker.sheetName}!A:E`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [[
        new Date().toISOString(),
        email,
        formatProjectIds(projectIds),
        finalUrl,
        tier
      ]]
    },
  });

  logger.success(`Portfolio deployment tracked successfully for ${email}`);
};

const getDeploymentTracker = () =>
  ensureTracker(
    createTracker({
      sheetId: process.env.GOOGLE_SHEETS_ID1,
      sheetName: process.env.GOOGLE_SHEETS_NAME1,
      fallbackName: 'Deployments'
    }),
    'Deployment'
  );

const DEPLOYMENT_HEADERS = [
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

const appendDeploymentAnalytics = async ({ name, email, title, userAgent, projectCount, tier, deviceType }) => {
  const tracker = getDeploymentTracker();
  await ensureSheetHeaders(tracker, DEPLOYMENT_HEADERS);

  await tracker.sheets.spreadsheets.values.append({
    spreadsheetId: tracker.sheetId,
    range: `${tracker.sheetName}!A:I`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [[
        new Date().toISOString(),
        name,
        email,
        title || '',
        '',
        userAgent || 'Unknown',
        projectCount || 0,
        deviceType,
        tier || 'Free'
      ]]
    },
  });
};

const updateDeploymentUrl = async ({ email, url }) => {
  const tracker = getDeploymentTracker();
  await ensureSheetHeaders(tracker, DEPLOYMENT_HEADERS);

  const response = await tracker.sheets.spreadsheets.values.get({
    spreadsheetId: tracker.sheetId,
    range: `${tracker.sheetName}!A:I`,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[2] === email && !row[4]);

  if (rowIndex === -1) {
    return false;
  }

  const updateRange = `${tracker.sheetName}!E${rowIndex + 1}`;
  await tracker.sheets.spreadsheets.values.update({
    spreadsheetId: tracker.sheetId,
    range: updateRange,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[url]],
    },
  });

  return true;
};

/**
 * POST /api/deploy-folder-to-netlify-with-paywall
 * Deploy a portfolio to Netlify with paywall checks
 *
 * This is the main deployment endpoint that:
 * 1. Checks user limits and tier permissions
 * 2. Creates a Netlify site
 * 3. Deploys the portfolio HTML
 * 4. Tracks deployment in Google Sheets
 */
const deployWithPaywallHandler = async (req, res) => {
  const { htmlContent, netlifyToken, personName, userEmail, projectIds } = req.body;

  if (!htmlContent || !netlifyToken || !personName || !userEmail) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: htmlContent, netlifyToken, personName, and userEmail are required'
    });
  }

  let siteId;
  const startTime = Date.now();

  try {
    // STEP 1: Check user limits before deployment
    logger.info(`Checking deployment permissions for: ${userEmail}`);
    const limitsData = await checkUserLimits(req, userEmail);
    const { tier, canCreate, paywall, limits, usage, remaining } = limitsData;

    // STEP 2: Enforce paywall rules
    if (!canCreate.deployments) {
      logger.warn(`Deployment blocked for ${userEmail}: ${paywall.reason}`);
      return res.status(403).json(
        buildPaywallError({ paywall, tier, limits, usage, remaining })
      );
    }

    logger.success(`Deployment authorized for ${userEmail} (${tier} tier)`);

    // STEP 3: Proceed with deployment using existing logic
    const timestamp = Date.now();
    const siteName = `${personName.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 30)}-portfolio-${timestamp}`;

    logger.info(`Starting deployment for: ${personName} (${tier} tier)`);

    // Create new Netlify site
    logger.info('Creating Netlify site...');
    const siteResponse = await axios.post(
      `${NETLIFY_API}/sites`,
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
    logger.success(`Site created successfully: ${siteId}`);

    // Calculate SHA1 hash for HTML content
    const htmlSha1 = crypto.createHash('sha1').update(htmlContent, 'utf8').digest('hex');
    logger.debug(`HTML SHA1 calculated: ${htmlSha1}`);

    // Create deployment with proper file digest format
    logger.info('Creating deployment with file digest...');
    const deployPayload = {
      files: {
        "index.html": htmlSha1
      },
      draft: false
    };

    const deployResponse = await axios.post(
      `${NETLIFY_API}/sites/${siteId}/deploys`,
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

    logger.success(`Deployment created: ${deployId}`);
    logger.debug(`Initial state: ${deployState}`);
    logger.debug(`Required files: ${requiredFiles.length > 0 ? requiredFiles.join(', ') : 'none'}`);

    // Upload HTML file if required by Netlify
    if (requiredFiles.includes(htmlSha1)) {
      logger.info('Uploading HTML file to Netlify...');

      try {
        await axios.put(
          `${NETLIFY_API}/deploys/${deployId}/files/index.html`,
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
        logger.success('HTML file uploaded successfully');
      } catch (uploadError) {
        logger.error('File upload failed', uploadError);
        throw new Error(`File upload failed: ${uploadError.response?.data?.message || uploadError.message}`);
      }
    } else {
      logger.info('No file upload required (file already exists on Netlify)');
    }

    // Poll deployment status until ready
    logger.info('Waiting for deployment to complete...');
    let currentDeployState = deployState || 'building';
    const maxAttempts = 60;
    let attempts = 0;
    const statusesToWaitFor = ['building', 'processing', 'uploading', 'prepared', 'preparing'];

    while (statusesToWaitFor.includes(currentDeployState) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      try {
        const statusResponse = await axios.get(
          `${NETLIFY_API}/sites/${siteId}/deploys/${deployId}`,
          {
            headers: { 'Authorization': `Bearer ${netlifyToken}` },
            timeout: 10000
          }
        );

        currentDeployState = statusResponse.data.state;
        const progress = `(${Math.round((Date.now() - startTime) / 1000)}s elapsed)`;

        logger.debug(`Deploy status check ${attempts}/60: ${currentDeployState} ${progress}`);

        if (['error', 'crashed', 'cancelled'].includes(currentDeployState)) {
          logger.error(`Deploy failed with status: ${currentDeployState}`);
          break;
        }

      } catch (statusError) {
        logger.warn(`Status check ${attempts} failed: ${statusError.message}`);
        if (attempts >= maxAttempts - 5) break;
      }
    }

    // Get final site information
    let finalSiteData;
    try {
      const finalSiteResponse = await axios.get(
        `${NETLIFY_API}/sites/${siteId}`,
        { headers: { 'Authorization': `Bearer ${netlifyToken}` } }
      );
      finalSiteData = finalSiteResponse.data;
    } catch (siteError) {
      logger.warn('Could not fetch final site data', siteError);
      finalSiteData = siteResponse.data;
    }

    const finalUrl = finalSiteData.ssl_url || finalSiteData.url;
    const totalTime = Math.round((Date.now() - startTime) / 1000);

    logger.success(`Deployment completed in ${totalTime}s`);
    logger.info(`Live URL: ${finalUrl}`);
    logger.info(`Final status: ${currentDeployState}`);

    // STEP 4: Track deployment in Google Sheets (Portfolio Details)
    if (userEmail && finalUrl && currentDeployState === 'ready') {
      try {
        await trackPortfolioDeployment({
          email: userEmail,
          projectIds,
          finalUrl,
          tier,
        });
      } catch (trackingError) {
        logger.error('Error tracking portfolio deployment', trackingError);
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
      tier: tier,
      message: currentDeployState === 'ready' ?
        'Portfolio deployed successfully!' :
        `Portfolio deployed with status: ${currentDeployState}`
    });

  } catch (error) {
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    logger.error(`Deployment failed after ${totalTime}s`, error);

    // Clean up failed site
    if (siteId) {
      try {
        logger.info('Attempting to clean up failed site...');
        await axios.delete(`${NETLIFY_API}/sites/${siteId}`, {
          headers: { 'Authorization': `Bearer ${netlifyToken}` }
        });
        logger.success('Failed site cleaned up successfully');
      } catch (cleanupError) {
        logger.warn('Could not clean up failed site', cleanupError);
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
};

router.post('/deploy-folder-to-netlify-with-paywall', deployWithPaywallHandler);

/**
 * POST /api/deploy-folder-to-netlify
 * Legacy endpoint that redirects to the paywall-enabled version
 */
router.post('/deploy-folder-to-netlify', async (req, res) => {
  return deployWithPaywallHandler(req, res);
});

/**
 * POST /api/track-deployment
 * Track a deployment in Google Sheets (Deployments sheet)
 *
 * This is separate from the Portfolio Details tracking and is used
 * for detailed analytics including device type, browser, etc.
 */
router.post('/track-deployment', async (req, res) => {
  try {
    const { name, email, title, userAgent, projectCount, tier } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
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

    await appendDeploymentAnalytics({
      name,
      email,
      title,
      userAgent,
      projectCount,
      tier,
      deviceType,
    });

    logger.success(`Deployment tracked successfully for: ${name} (${email})`);

    res.json({
      success: true,
      message: 'Deployment tracked successfully'
    });

  } catch (error) {
    logger.error('Error tracking deployment', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track deployment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

/**
 * POST /api/update-deployment-url
 * Update the URL for a deployment record in Google Sheets
 *
 * This finds the most recent deployment record for an email
 * where the URL is empty and updates it with the provided URL
 */
router.post('/update-deployment-url', async (req, res) => {
  try {
    const { email, url } = req.body;

    if (!email || !url) {
      return res.status(400).json({
        success: false,
        error: 'Email and URL are required'
      });
    }

    const updated = await updateDeploymentUrl({ email, url });

    if (!updated) {
      logger.info(`No matching deployment record found to update for email: ${email}`);
      return res.json({
        success: true,
        message: 'No matching deployment record found to update'
      });
    }

    logger.success(`Deployment URL updated successfully for: ${email}`);

    res.json({
      success: true,
      message: 'Deployment URL updated successfully'
    });

  } catch (error) {
    logger.error('Error updating deployment URL', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update deployment URL',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

module.exports = router;
