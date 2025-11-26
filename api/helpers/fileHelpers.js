/**
 * File Helper Functions
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * Calculate SHA1 hash for content
 */
const calculateSha = (content) => {
  return crypto.createHash('sha1').update(content).digest('hex');
};

/**
 * Recursively get all files from a directory
 */
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

module.exports = {
  calculateSha,
  getFilesRecursively
};
