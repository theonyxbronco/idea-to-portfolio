/**
 * User Routes
 * Handles user management, tier upgrades, and user data operations
 */

const express = require('express');
const router = express.Router();
const { GoogleSheetsTracker } = require('../utils/googleSheets');
const { Logger } = require('../utils/logger');

const logger = new Logger('UserRoutes');

/**
 * POST /api/upgrade-user-tier
 * Upgrade a user's tier (Free, Student, Pro)
 */
router.post('/upgrade-user-tier', async (req, res) => {
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
    logger.info(`User ${email} upgraded to ${newTier} tier`);

    res.json({
      success: true,
      message: `Successfully upgraded to ${newTier} tier`,
      newTier: newTier,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error upgrading user tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upgrade user tier',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

/**
 * POST /api/save-user-info
 * Save or update user information
 */
router.post('/save-user-info', async (req, res) => {
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
      logger.warn('Could not check for existing user:', error.message);
    }

    // Helper functions
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

      logger.info(`Updated user info for: ${userEmail} with tier: ${tier || 'Free'}`);
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

      logger.info(`Created new user info for: ${userEmail} with tier: ${tier || 'Free'}`);
    }

    res.json({
      success: true,
      message: existingRowIndex !== -1 ? 'User information updated' : 'User information saved',
      timestamp: new Date().toISOString(),
      tier: tier || 'Free',
      sheetUsed: `${process.env.GOOGLE_SHEETS_ID3}/${process.env.GOOGLE_SHEETS_NAME2 || 'User Info'}`
    });

  } catch (error) {
    logger.error('Error saving user info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save user information',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

/**
 * GET /api/get-user-info
 * Get user information by email
 */
router.get('/get-user-info', async (req, res) => {
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

      // Include tier information
      tier: userRow[11] || 'Free' // L: Tier column
    };

    res.json({
      success: true,
      data: personalInfo
    });

  } catch (error) {
    logger.error('Error fetching user info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user information',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

/**
 * GET /api/check-user-limits
 * Check user's tier limits and current usage
 */
router.get('/check-user-limits', async (req, res) => {
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
        maxPortfolios: 0, // Free users cannot deploy
        maxDrafts: 1,
        maxDeployments: 0, // No deployments for free users
        features: ['Basic portfolio generation', 'Text editing', 'Save as draft'],
        restrictions: ['No deployment', 'Limited projects', 'No custom styling']
      },
      Student: {
        maxProjects: 20,
        maxPortfolios: 3, // Student users can deploy 3 portfolios
        maxDrafts: 5,
        maxDeployments: 3, // Student users can deploy 3 times
        features: ['Portfolio deployment', 'AI editing', 'Multiple projects', 'Email support'],
        restrictions: ['Limited deployments', 'No custom CSS', 'No priority support']
      },
      Pro: {
        maxProjects: Infinity,
        maxPortfolios: Infinity,
        maxDrafts: Infinity,
        maxDeployments: Infinity, // Pro users have unlimited deployments
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
          maxDeployments: limits.maxDeployments // New field for deployment limits
        },
        usage: {
          projects: projectsCount,
          portfolios: deploymentsCount, // Legacy field - now represents deployments
          drafts: draftsCount,
          deployments: deploymentsCount // Explicit deployment count
        },
        remaining: {
          projects: projectsRemaining,
          drafts: draftsRemaining,
          deployments: deploymentsRemaining // Deployments remaining
        },
        canCreate: {
          projects: canCreateProject,
          portfolios: canDeploy, // Legacy field
          drafts: canCreateDraft,
          deployments: canDeploy // Can user deploy?
        },
        // Enhanced paywall information
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
    logger.error('Error checking user limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check user limits',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

/**
 * GET /api/user-data
 * Get user's portfolio data from primary sheet
 */
router.get('/user-data', async (req, res) => {
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
    logger.error('Error fetching user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

module.exports = router;
