/**
 * Google Sheets Service - Centralized service for all Google Sheets operations
 */

const { GoogleSheetsTracker } = require('../utils/googleSheets');
const { GOOGLE_SHEETS_CONFIG } = require('../config/constants');
const { Logger } = require('../utils/logger');

const logger = new Logger('GoogleSheetsService');

class GoogleSheetsService {
  constructor() {
    this.trackers = {};
    this.initialized = false;
    this.initializeTrackers();
  }

  /**
   * Initialize all Google Sheets trackers
   */
  initializeTrackers() {
    try {
      const { CREDENTIALS } = GOOGLE_SHEETS_CONFIG;

      if (!CREDENTIALS.clientEmail || !CREDENTIALS.privateKey) {
        logger.warn('Google Sheets credentials not configured');
        return;
      }

      // Initialize User Info tracker
      this.trackers.userInfo = new GoogleSheetsTracker({
        clientEmail: CREDENTIALS.clientEmail,
        privateKey: CREDENTIALS.privateKey,
        sheetId: GOOGLE_SHEETS_CONFIG.USER_INFO.sheetId,
        sheetName: GOOGLE_SHEETS_CONFIG.USER_INFO.sheetName,
      });

      // Initialize Project Info tracker
      this.trackers.projectInfo = new GoogleSheetsTracker({
        clientEmail: CREDENTIALS.clientEmail,
        privateKey: CREDENTIALS.privateKey,
        sheetId: GOOGLE_SHEETS_CONFIG.PROJECT_INFO.sheetId,
        sheetName: GOOGLE_SHEETS_CONFIG.PROJECT_INFO.sheetName,
      });

      // Initialize Deployment Tracking tracker
      this.trackers.deploymentTracking = new GoogleSheetsTracker({
        clientEmail: CREDENTIALS.clientEmail,
        privateKey: CREDENTIALS.privateKey,
        sheetId: GOOGLE_SHEETS_CONFIG.DEPLOYMENT_TRACKING.sheetId,
        sheetName: GOOGLE_SHEETS_CONFIG.DEPLOYMENT_TRACKING.sheetName,
      });

      // Initialize Portfolio Drafts tracker
      this.trackers.portfolioDrafts = new GoogleSheetsTracker({
        clientEmail: CREDENTIALS.clientEmail,
        privateKey: CREDENTIALS.privateKey,
        sheetId: GOOGLE_SHEETS_CONFIG.PORTFOLIO_DRAFTS.sheetId,
        sheetName: GOOGLE_SHEETS_CONFIG.PORTFOLIO_DRAFTS.sheetName,
      });

      this.initialized = true;
      logger.success('Google Sheets trackers initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets trackers', error);
    }
  }

  /**
   * Get User Info tracker
   */
  getUserInfoTracker() {
    if (!this.initialized || !this.trackers.userInfo) {
      throw new Error('User Info tracker not initialized');
    }
    return this.trackers.userInfo;
  }

  /**
   * Get Project Info tracker
   */
  getProjectInfoTracker() {
    if (!this.initialized || !this.trackers.projectInfo) {
      throw new Error('Project Info tracker not initialized');
    }
    return this.trackers.projectInfo;
  }

  /**
   * Get Deployment Tracking tracker
   */
  getDeploymentTrackingTracker() {
    if (!this.initialized || !this.trackers.deploymentTracking) {
      throw new Error('Deployment Tracking tracker not initialized');
    }
    return this.trackers.deploymentTracking;
  }

  /**
   * Get Portfolio Drafts tracker
   */
  getPortfolioDraftsTracker() {
    if (!this.initialized || !this.trackers.portfolioDrafts) {
      throw new Error('Portfolio Drafts tracker not initialized');
    }
    return this.trackers.portfolioDrafts;
  }

  /**
   * Find user by email in User Info sheet
   */
  async findUserByEmail(email) {
    try {
      const tracker = this.getUserInfoTracker();
      const response = await tracker.sheets.spreadsheets.values.get({
        spreadsheetId: tracker.sheetId,
        range: `${tracker.sheetName}!A:L`,
      });

      const rows = response.data.values || [];
      const userRowIndex = rows.findIndex((row, index) =>
        index > 0 && row[1] === email
      );

      if (userRowIndex === -1) {
        return null;
      }

      const userRow = rows[userRowIndex];
      return {
        rowIndex: userRowIndex,
        data: {
          name: userRow[0] || '',
          email: userRow[1] || '',
          tier: userRow[2] || 'Free',
          projectCount: parseInt(userRow[3] || '0'),
          deploymentCount: parseInt(userRow[4] || '0'),
          createdAt: userRow[5] || '',
          lastActive: userRow[6] || '',
        },
        rawRow: userRow,
      };
    } catch (error) {
      logger.error(`Failed to find user by email: ${email}`, error);
      throw error;
    }
  }

  /**
   * Update user tier
   */
  async updateUserTier(email, newTier) {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      const tracker = this.getUserInfoTracker();
      const updateRange = `${tracker.sheetName}!C${user.rowIndex + 1}`;

      await tracker.sheets.spreadsheets.values.update({
        spreadsheetId: tracker.sheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[newTier]],
        },
      });

      logger.success(`Updated tier for ${email} to ${newTier}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update user tier for ${email}`, error);
      throw error;
    }
  }

  /**
   * Get user projects
   */
  async getUserProjects(email, status = 'active') {
    try {
      const tracker = this.getProjectInfoTracker();
      const response = await tracker.sheets.spreadsheets.values.get({
        spreadsheetId: tracker.sheetId,
        range: `${tracker.sheetName}!A:P`,
      });

      const rows = response.data.values || [];
      const projects = rows
        .slice(1)
        .filter(row => row[1] === email && (!status || row[12] === status))
        .map((row, index) => ({
          rowIndex: index + 2, // +2 because of header and 1-based indexing
          projectId: row[0] || '',
          email: row[1] || '',
          projectTitle: row[3] || 'Untitled Project',
          description: row[4] || '',
          status: row[12] || 'active',
          createdAt: row[13] || '',
          rawRow: row,
        }));

      return projects;
    } catch (error) {
      logger.error(`Failed to get projects for user: ${email}`, error);
      throw error;
    }
  }

  /**
   * Track deployment
   */
  async trackDeployment(deploymentData) {
    try {
      const tracker = this.getDeploymentTrackingTracker();
      const timestamp = new Date().toISOString();

      const rowData = [
        deploymentData.email || '',
        deploymentData.siteName || '',
        deploymentData.deployUrl || '',
        deploymentData.skeleton || '',
        deploymentData.netlifyToken ? 'token_provided' : 'no_token',
        timestamp,
        deploymentData.status || 'success',
        deploymentData.deploymentId || '',
      ];

      await tracker.appendRow(rowData);
      logger.success(`Deployment tracked for ${deploymentData.email}`);
      return true;
    } catch (error) {
      logger.error('Failed to track deployment', error);
      throw error;
    }
  }

  /**
   * Save draft to Google Sheets
   */
  async saveDraft(email, htmlContent) {
    try {
      const tracker = this.getPortfolioDraftsTracker();
      const timestamp = new Date().toISOString();

      const sheetData = [
        timestamp,
        email,
        htmlContent
      ];

      await tracker.sheets.spreadsheets.values.append({
        spreadsheetId: tracker.sheetId,
        range: `${tracker.sheetName}!A:C`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [sheetData],
        },
      });

      logger.success(`Draft saved for ${email}`);
      return { success: true, timestamp };
    } catch (error) {
      logger.error(`Failed to save draft for ${email}`, error);
      throw error;
    }
  }

  /**
   * Get drafts for a specific user
   */
  async getUserDrafts(email) {
    try {
      const tracker = this.getPortfolioDraftsTracker();

      const response = await tracker.sheets.spreadsheets.values.get({
        spreadsheetId: tracker.sheetId,
        range: `${tracker.sheetName}!A:C`,
      });

      const rows = response.data.values || [];

      // Skip header row and filter by email
      const userDrafts = rows
        .slice(1)
        .filter(row => row[1] === email)
        .map(row => ({
          id: `draft_${row[0]?.replace(/[^a-zA-Z0-9]/g, '_') || Date.now()}`,
          name: `Draft from ${new Date(row[0]).toLocaleDateString()}`,
          htmlContent: row[2] || '',
          createdAt: row[0] || new Date().toISOString(),
          lastModified: row[0] || new Date().toISOString(),
          status: 'draft'
        }));

      return userDrafts;
    } catch (error) {
      logger.error(`Failed to get drafts for ${email}`, error);
      throw error;
    }
  }

  /**
   * Count drafts for a specific user
   */
  async countUserDrafts(email) {
    try {
      const drafts = await this.getUserDrafts(email);
      return drafts.length;
    } catch (error) {
      logger.error(`Failed to count drafts for ${email}`, error);
      throw error;
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.initialized;
  }
}

// Export singleton instance
const googleSheetsService = new GoogleSheetsService();

module.exports = {
  GoogleSheetsService,
  googleSheetsService,
};
