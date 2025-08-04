const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class FileProcessor {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    // Get the server base URL for generating accessible URLs
    this.serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:3001';

    // Ensure upload directory exists
    this.initializeUploadDir();
  }

  async initializeUploadDir() {
    try {
      await fs.ensureDir(this.uploadDir);
      await fs.ensureDir(path.join(this.uploadDir, 'temp'));
      await fs.ensureDir(path.join(this.uploadDir, 'processed'));
    } catch (error) {
      console.error('Failed to initialize upload directory:', error);
    }
  }

  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type: ${file.mimetype}. Allowed types: ${this.allowedTypes.join(', ')}`);
    }

    if (file.size > this.maxFileSize) {
      const maxSizeMB = (this.maxFileSize / 1024 / 1024).toFixed(1);
      errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size: ${maxSizeMB}MB`);
    }

    return { valid: errors.length === 0, errors };
  }

  async processImage(file, options = {}) {
    try {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const fileId = uuidv4();
      const filename = `${fileId}.webp`;
      const outputPath = path.join(this.uploadDir, 'processed', filename);

      // Default processing options
      const defaultOptions = {
        width: 1200,
        height: 800,
        quality: 85,
        format: 'webp',
        fit: 'inside',
        withoutEnlargement: true
      };

      const processOptions = { ...defaultOptions, ...options };

      // Process image with Sharp
      await sharp(file.buffer)
        .resize(processOptions.width, processOptions.height, {
          fit: processOptions.fit,
          withoutEnlargement: processOptions.withoutEnlargement
        })
        .webp({ quality: processOptions.quality })
        .toFile(outputPath);

      // Get image metadata
      const metadata = await sharp(file.buffer).metadata();

    // Generate both relative and absolute URLs
    const relativeUrl = `/uploads/processed/${filename}`;
    const absoluteUrl = `${this.serverBaseUrl}/uploads/processed/${filename}`;

    return {
      id: fileId,
      filename,
      path: outputPath,
      url: relativeUrl,
      absoluteUrl: absoluteUrl,
      originalName: file.originalname,
      size: (await fs.stat(outputPath)).size,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      processed: true
    };
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  async processMultipleImages(files, options = {}) {
    if (!Array.isArray(files)) {
      files = [files];
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const processed = await this.processImage(file, options);
        results.push(processed);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    return { results, errors };
  }

  async processProjectImages(projectImages) {
    const processedImages = [];

    for (const image of projectImages) {
      try {
        const processed = await this.processImage(image, {
          width: 1200,
          height: 800,
          quality: 90
        });
        processedImages.push(processed);
      } catch (error) {
        console.error(`Failed to process project image ${image.originalname}:`, error);
      }
    }

    return processedImages;
  }

  async processMoodboardImages(moodboardImages) {
    const processedImages = [];

    for (const image of moodboardImages) {
      try {
        const processed = await this.processImage(image, {
          width: 800,
          height: 600,
          quality: 80
        });
        processedImages.push(processed);
      } catch (error) {
        console.error(`Failed to process moodboard image ${image.originalname}:`, error);
      }
    }

    return processedImages;
  }

  async cleanupTempFiles(fileIds) {
    try {
      for (const fileId of fileIds) {
        const filePath = path.join(this.uploadDir, 'processed', `${fileId}.webp`);
        await fs.remove(filePath).catch(() => {}); // Ignore errors
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Convert image to base64 for AI prompt (if needed)
  async imageToBase64(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer.toString('base64');
    } catch (error) {
      console.error('Base64 conversion error:', error);
      throw error;
    }
  }

  // Get image dimensions without processing
  async getImageDimensions(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      };
    } catch (error) {
      console.error('Failed to get image dimensions:', error);
      return null;
    }
  }
}

module.exports = new FileProcessor();