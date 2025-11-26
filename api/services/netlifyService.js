/**
 * Netlify Service - Centralized service for Netlify deployment operations
 */

const axios = require('axios');
const crypto = require('crypto');
const { NETLIFY_CONFIG } = require('../config/constants');
const { Logger } = require('../utils/logger');

const logger = new Logger('NetlifyService');

class NetlifyService {
  constructor() {
    this.apiBaseUrl = NETLIFY_CONFIG.API_BASE_URL;
    this.deployTimeout = NETLIFY_CONFIG.DEPLOY_TIMEOUT;
  }

  /**
   * Generate a unique site name
   */
  generateSiteName(personName) {
    const timestamp = Date.now();
    const sanitized = personName.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 30);
    return `${sanitized}-portfolio-${timestamp}`;
  }

  /**
   * Calculate SHA1 hash for content
   */
  calculateSha1(content) {
    return crypto.createHash('sha1').update(content, 'utf8').digest('hex');
  }

  /**
   * Create a new Netlify site
   */
  async createSite(siteName, netlifyToken) {
    try {
      logger.info(`Creating Netlify site: ${siteName}`);

      const response = await axios.post(
        `${this.apiBaseUrl}/sites`,
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

      const siteId = response.data.id;
      const siteUrl = response.data.ssl_url || response.data.url;

      logger.success(`Site created successfully: ${siteId}`);

      return {
        siteId,
        siteUrl,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to create Netlify site', error);
      throw new Error(`Failed to create site: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a deployment
   */
  async createDeployment(siteId, htmlContent, netlifyToken) {
    try {
      const htmlSha1 = this.calculateSha1(htmlContent);
      logger.info(`Creating deployment for site ${siteId} with SHA1: ${htmlSha1}`);

      const deployPayload = {
        files: {
          "index.html": htmlSha1
        },
        draft: false
      };

      const response = await axios.post(
        `${this.apiBaseUrl}/sites/${siteId}/deploys`,
        deployPayload,
        {
          headers: {
            'Authorization': `Bearer ${netlifyToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const deployId = response.data.id;
      const requiredFiles = response.data.required || [];
      const deployState = response.data.state;

      logger.info(`Deployment created: ${deployId}, State: ${deployState}, Required files: ${requiredFiles.length}`);

      return {
        deployId,
        requiredFiles,
        deployState,
        htmlSha1,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to create deployment', error);
      throw new Error(`Failed to create deployment: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Upload HTML file to deployment
   */
  async uploadFile(deployId, htmlContent, netlifyToken) {
    try {
      logger.info(`Uploading HTML file to deployment ${deployId}`);

      await axios.put(
        `${this.apiBaseUrl}/deploys/${deployId}/files/index.html`,
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
      return true;
    } catch (error) {
      logger.error('Failed to upload file', error);
      throw new Error(`File upload failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check deployment status
   */
  async checkDeploymentStatus(siteId, deployId, netlifyToken) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/sites/${siteId}/deploys/${deployId}`,
        {
          headers: { 'Authorization': `Bearer ${netlifyToken}` },
          timeout: 10000
        }
      );

      return {
        state: response.data.state,
        data: response.data
      };
    } catch (error) {
      logger.warn(`Failed to check deployment status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Poll deployment until completion or failure
   */
  async waitForDeployment(siteId, deployId, netlifyToken, maxWaitTimeMs = 120000) {
    const startTime = Date.now();
    const maxAttempts = 60;
    let attempts = 0;
    const statusesToWaitFor = ['building', 'processing', 'uploading', 'prepared', 'preparing'];

    logger.info('Waiting for deployment to complete...');

    while (attempts < maxAttempts) {
      const elapsed = Date.now() - startTime;

      if (elapsed > maxWaitTimeMs) {
        throw new Error(`Deployment timed out after ${maxWaitTimeMs / 1000}s`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      try {
        const { state } = await this.checkDeploymentStatus(siteId, deployId, netlifyToken);

        logger.debug(`Deploy status check ${attempts}/${maxAttempts}: ${state} (${Math.round(elapsed / 1000)}s elapsed)`);

        if (['error', 'crashed', 'cancelled'].includes(state)) {
          throw new Error(`Deployment failed with status: ${state}`);
        }

        if (!statusesToWaitFor.includes(state)) {
          return state;
        }
      } catch (error) {
        if (attempts >= maxAttempts - 5) {
          throw error;
        }
        logger.warn(`Status check ${attempts} failed: ${error.message}`);
      }
    }

    throw new Error('Deployment polling exceeded maximum attempts');
  }

  /**
   * Get site information
   */
  async getSiteInfo(siteId, netlifyToken) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/sites/${siteId}`,
        {
          headers: { 'Authorization': `Bearer ${netlifyToken}` },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error) {
      logger.warn('Failed to fetch site info', error);
      throw error;
    }
  }

  /**
   * Deploy portfolio (orchestrates all steps)
   */
  async deployPortfolio(personName, htmlContent, netlifyToken) {
    const startTime = Date.now();
    let siteId = null;

    try {
      // Step 1: Generate site name
      const siteName = this.generateSiteName(personName);

      // Step 2: Create site
      const site = await this.createSite(siteName, netlifyToken);
      siteId = site.siteId;

      // Step 3: Create deployment
      const deployment = await this.createDeployment(siteId, htmlContent, netlifyToken);

      // Step 4: Upload file if required
      if (deployment.requiredFiles.includes(deployment.htmlSha1)) {
        await this.uploadFile(deployment.deployId, htmlContent, netlifyToken);
      } else {
        logger.info('No file upload required (file already exists on Netlify)');
      }

      // Step 5: Wait for deployment to complete
      const finalState = await this.waitForDeployment(siteId, deployment.deployId, netlifyToken);

      // Step 6: Get final site info
      const finalSiteData = await this.getSiteInfo(siteId, netlifyToken);
      const finalUrl = finalSiteData.ssl_url || finalSiteData.url;

      const totalTime = Math.round((Date.now() - startTime) / 1000);
      logger.success(`Deployment completed in ${totalTime}s. Live URL: ${finalUrl}`);

      return {
        success: true,
        siteId,
        deployId: deployment.deployId,
        url: finalUrl,
        state: finalState,
        deploymentTime: totalTime,
        siteName
      };
    } catch (error) {
      logger.error('Portfolio deployment failed', error);

      // Attempt to clean up failed site
      if (siteId) {
        try {
          await this.deleteSite(siteId, netlifyToken);
          logger.info(`Cleaned up failed site: ${siteId}`);
        } catch (cleanupError) {
          logger.warn('Failed to clean up site', cleanupError);
        }
      }

      throw error;
    }
  }

  /**
   * Delete a site
   */
  async deleteSite(siteId, netlifyToken) {
    try {
      await axios.delete(
        `${this.apiBaseUrl}/sites/${siteId}`,
        {
          headers: { 'Authorization': `Bearer ${netlifyToken}` },
          timeout: 10000
        }
      );

      logger.info(`Site deleted: ${siteId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete site', error);
      throw error;
    }
  }
}

// Export singleton instance
const netlifyService = new NetlifyService();

module.exports = {
  NetlifyService,
  netlifyService,
};
