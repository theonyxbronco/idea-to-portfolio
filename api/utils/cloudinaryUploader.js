const cloudinary = require('cloudinary').v2;
const path = require('path');
const { logger } = require('./logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryUploader {
  constructor() {
    this.initialized = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  /**
   * Upload a single image buffer to Cloudinary
   * @param {Buffer} buffer - Image buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Cloudinary response with URL
   */
  async uploadImage(buffer, options = {}) {
    if (!this.initialized) {
      throw new Error('Cloudinary not configured. Check environment variables.');
    }

    try {
      const uploadOptions = {
        resource_type: 'image',
        quality: 'auto', // Auto-optimize quality
        fetch_format: 'auto', // Auto-deliver best format
        ...options
      };

      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      logger.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  /**
   * Upload project images to Cloudinary - ONLY for project storage
   * @param {Array} files - Array of file objects with buffer and metadata
   * @param {string} projectId - Unique project identifier
   * @param {string} userEmail - User email for organization
   * @returns {Promise<Object>} - Object with uploaded image data
   */
  async uploadProjectImages(files, projectId, userEmail) {
    if (!this.initialized) {
      throw new Error('Cloudinary not configured');
    }

    const uploadedImages = {
      process: [],
      final: [],
    };

    // Create consistent folder structure: portfolio{projectId}
    const folderPath = `portfolio${projectId}`;

    for (const file of files) {
      try {
        const category = this.categorizeFile(file);
        const currentCount = uploadedImages[category].length + 1;
        
        // Create consistent public ID: portfolio{projectId}/{category}_{index}
        const publicId = `${folderPath}/${category}_${currentCount}`;

        const uploadResult = await this.uploadImage(file.buffer, {
          public_id: publicId,
          folder: folderPath,
          use_filename: false,
          unique_filename: false, // We control the naming
          overwrite: false,
          tags: [category, 'portfolio', projectId, userEmail]
        });

        const imageData = {
          id: `${category}_${currentCount}`,
          cloudinaryUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          originalName: file.originalname || file.filename,
          mimetype: file.mimetype,
          size: file.size,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          category: category,
          index: currentCount,
          cloudinaryData: uploadResult
        };

        uploadedImages[category].push(imageData);
        logger.info(`✅ Uploaded ${category} image ${currentCount}: ${uploadResult.secure_url}`);

      } catch (error) {
        logger.error(`❌ Failed to upload image ${file.originalname}:`, error);
        // Continue with other images even if one fails
      }
    }

    return uploadedImages;
  }

  /**
   * Upload a single image for temporary analysis (moodboard, etc.)
   * This is only for sending to Anthropic - not saved permanently
   * @param {Object} file - File object with buffer
   * @param {string} purpose - Purpose (e.g., 'moodboard_analysis')
   * @returns {Promise<Object>} - Temporary upload result
   */
  async uploadSingleImage(file, projectId, userEmail, category) {
    if (!this.initialized) {
      throw new Error('Cloudinary not configured');
    }

    try {
      // Create temporary upload for analysis
      const uploadResult = await this.uploadImage(file.buffer, {
        public_id: `temp_analysis/${category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tags: ['temporary', 'analysis', category],
        auto_tagging: 0.6 // Auto-tag for analysis purposes
      });

      return {
        cloudinaryUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        originalName: file.originalname,
        temporary: true
      };

    } catch (error) {
      logger.error('Failed to upload single image:', error);
      throw error;
    }
  }

  /**
   * Categorize file based on fieldname or filename
   * @param {Object} file - File object
   * @returns {string} - Category (process, final)
   */
  categorizeFile(file) {
    const fieldName = (file.fieldname || '').toLowerCase();
    const originalName = (file.originalname || file.filename || '').toLowerCase();

    if (fieldName.includes('final') || originalName.includes('final')) {
      return 'final';
    }
    return 'process';
  }

  /**
   * Delete images from Cloudinary
   * @param {Array} publicIds - Array of Cloudinary public IDs to delete
   * @returns {Promise<Object>} - Deletion results
   */
  async deleteImages(publicIds) {
    if (!this.initialized || !publicIds || publicIds.length === 0) {
      return { deleted: [], failed: [] };
    }

    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error) {
      logger.error('Error deleting images from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete entire folder from Cloudinary
   * @param {string} folderPath - Folder path to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteFolder(folderPath) {
    if (!this.initialized || !folderPath) {
      return;
    }

    try {
      // Delete all resources in folder
      await cloudinary.api.delete_resources_by_prefix(folderPath);
      // Delete the folder itself
      await cloudinary.api.delete_folder(folderPath);
      logger.info(`✅ Deleted Cloudinary folder: ${folderPath}`);
    } catch (error) {
      logger.error(`❌ Error deleting folder ${folderPath}:`, error);
    }
  }

  /**
   * Clean up temporary analysis files
   * @returns {Promise<void>}
   */
  async cleanupTemporaryFiles() {
    if (!this.initialized) {
      return;
    }

    try {
      // Delete all temporary analysis files older than 1 hour
      await cloudinary.api.delete_resources_by_prefix('temp_analysis/');
      logger.info('✅ Cleaned up temporary analysis files');
    } catch (error) {
      logger.warn('Could not clean up temporary files:', error);
    }
  }

  /**
   * Generate responsive image URLs
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} transformations - Image transformations
   * @returns {Object} - Object with different sized URLs
   */
  generateResponsiveUrls(publicId, transformations = {}) {
    if (!this.initialized) {
      return null;
    }

    const baseTransformations = {
      fetch_format: 'auto',
      quality: 'auto',
      ...transformations
    };

    return {
      thumbnail: cloudinary.url(publicId, {
        ...baseTransformations,
        width: 300,
        height: 200,
        crop: 'fill'
      }),
      medium: cloudinary.url(publicId, {
        ...baseTransformations,
        width: 800,
        crop: 'scale'
      }),
      large: cloudinary.url(publicId, {
        ...baseTransformations,
        width: 1200,
        crop: 'scale'
      }),
      original: cloudinary.url(publicId, baseTransformations)
    };
  }

  /**
   * Generate Cloudinary URL with transformations
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - Transformation options
   * @returns {string} - Generated URL
   */
  generateUrl(publicId, options = {}) {
    if (!this.initialized) {
      return null;
    }

    return cloudinary.url(publicId, {
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    });
  }
}

module.exports = new CloudinaryUploader();