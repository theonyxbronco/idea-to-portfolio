/**
 * Draft Routes
 * Handles saving and retrieving portfolio drafts
 */

const express = require('express');
const router = express.Router();
const { googleSheetsService } = require('../services/googleSheetsService');
const { Logger } = require('../utils/logger');

const logger = new Logger('DraftRoutes');

/**
 * POST /api/save-draft
 * Save a portfolio draft for a user
 */
router.post('/save-draft', async (req, res) => {
  try {
    const { email, htmlContent } = req.body;

    if (!email || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Email and HTML content are required'
      });
    }

    // Check user limits before saving draft
    const limitsCheckResponse = await fetch(
      `${req.protocol}://${req.get('host')}/api/check-user-limits?email=${encodeURIComponent(email)}`
    );

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

    // Check if Google Sheets service is ready
    if (!googleSheetsService.isReady()) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured for drafts'
      });
    }

    // Save the draft using the service
    const result = await googleSheetsService.saveDraft(email, htmlContent);

    logger.info(`Draft saved successfully for ${email}`);

    res.json({
      success: true,
      message: 'Draft saved successfully',
      timestamp: result.timestamp
    });

  } catch (error) {
    logger.error('Error saving draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save draft',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

/**
 * GET /api/get-drafts
 * Get all drafts for a user
 */
router.get('/get-drafts', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if Google Sheets service is ready
    if (!googleSheetsService.isReady()) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets integration not configured'
      });
    }

    // Get drafts using the service
    const userDrafts = await googleSheetsService.getUserDrafts(email);

    logger.info(`Retrieved ${userDrafts.length} drafts for ${email}`);

    res.json({
      success: true,
      data: userDrafts
    });

  } catch (error) {
    logger.error('Error fetching drafts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch drafts',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
});

module.exports = router;
