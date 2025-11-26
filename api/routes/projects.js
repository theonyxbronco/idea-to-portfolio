/**
 * Project Routes
 * Handles project CRUD operations including image uploads
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { GoogleSheetsTracker } = require('../utils/googleSheets');
const cloudinaryUploader = require('../utils/cloudinaryUploader');
const { Logger } = require('../utils/logger');

const logger = new Logger('ProjectRoutes');

// Temp directory configuration
const tempDir = process.env.NODE_ENV === 'production' || process.env.VERCEL
  ? '/tmp'
  : path.join(__dirname, '..', 'temp');

/**
 * Export router as a function that accepts upload middleware
 */
module.exports = (upload) => {
  /**
   * POST /api/save-project
   * Save a new project with images
   */
  router.post('/save-project', upload.any(), async (req, res) => {
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
        const limitsCheckResponse = await fetch(
          `${req.protocol}://${req.get('host')}/api/check-user-limits?email=${encodeURIComponent(projectData.userEmail)}`
        );

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
        logger.warn('Could not check user limits:', limitError);
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
            logger.info('Uploading images to Cloudinary...');
            savedImages = await cloudinaryUploader.uploadProjectImages(files, projectId, projectData.userEmail);
          } else {
            logger.info('Using local storage for images...');
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
          logger.error('Failed to save project images:', error);
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

      logger.success(`Successfully saved project: ${projectData.title} for: ${projectData.userEmail}`);

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
      logger.error('Error saving project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save project',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
      });
    }
  });

  /**
   * POST /api/update-project
   * Update an existing project with optional new images
   */
  router.post('/update-project', upload.any(), async (req, res) => {
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
        logger.warn('Could not parse existing image metadata');
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
          logger.error('Failed to update project images:', error);
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
        projectData.overview || '', // Overview (F)
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

      logger.success(`Successfully updated project ${projectData.id} for: ${projectData.userEmail}`);

      res.json({
        success: true,
        message: 'Project updated successfully',
        projectId: projectData.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update project',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
      });
    }
  });

  /**
   * GET /api/get-user-projects
   * Retrieve all active projects for a user
   */
  router.get('/get-user-projects', async (req, res) => {
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
      logger.error('Error fetching user projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user projects',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
      });
    }
  });

  /**
   * DELETE /api/delete-project
   * Soft delete a project (mark as deleted)
   */
  router.delete('/delete-project', async (req, res) => {
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
          logger.warn('Error cleaning up Cloudinary images:', error);
        }
      }

      logger.success(`Successfully deleted project ${projectId} for: ${userEmail}`);

      res.json({
        success: true,
        message: 'Project deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete project',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
      });
    }
  });

  /**
   * POST /api/save-multiple-projects
   * Save multiple projects in bulk with images
   */
  router.post('/save-multiple-projects', upload.any(), async (req, res) => {
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
              logger.info(`Uploading project ${projectIndex + 1} images to Cloudinary...`);
              savedImages = await cloudinaryUploader.uploadProjectImages(projectFiles, projectId, projectData.userEmail);
            } else {
              logger.warn(`Cloudinary not configured, using local storage for project ${projectIndex + 1}`);

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
            logger.error(`Image upload failed for project ${projectIndex + 1}:`, error);
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

        logger.success(`Successfully saved project ${projectIndex + 1}: ${projectData.title} for: ${projectData.userEmail}`);
      }

      res.json({
        success: true,
        message: `Successfully saved ${savedProjects.length} projects`,
        projects: savedProjects,
        storageType: cloudinaryUploader.initialized ? 'cloudinary' : 'local',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error saving multiple projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save projects',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
      });
    }
  });

  return router;
};
