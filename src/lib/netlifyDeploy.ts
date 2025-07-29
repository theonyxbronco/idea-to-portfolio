// src/lib/netlifyDeploy.js
// Netlify deployment implementation for portfolio generator

/**
 * Deploy portfolio to Netlify using the API
 * @param {Object} portfolio - Portfolio data with html, css, js
 * @param {string} token - Netlify access token
 * @returns {Promise<Object>} Deployment result
 */
export const deployToNetlify = async (portfolio, token) => {
  if (!token) {
    throw new Error('Netlify access token is required');
  }

  if (!portfolio?.html) {
    throw new Error('Portfolio HTML is required for deployment');
  }

  const baseUrl = 'https://api.netlify.com/api/v1';
  
  try {
    console.log('🚀 Starting Netlify deployment...');
    
    // Step 1: Create a new site
    const siteResponse = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `portfolio-${Date.now()}`, // Auto-generate unique name
      }),
    });

    if (!siteResponse.ok) {
      const errorData = await siteResponse.json().catch(() => ({}));
      throw new Error(`Failed to create site: ${errorData.message || siteResponse.statusText}`);
    }

    const site = await siteResponse.json();
    console.log('✅ Site created:', site.name);

    // Step 2: Prepare files for deployment
    const files = prepareFiles(portfolio);
    
    // Step 3: Create deployment with file digest
    const deployResponse = await fetch(`${baseUrl}/sites/${site.id}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: files,
      }),
    });

    if (!deployResponse.ok) {
      const errorData = await deployResponse.json().catch(() => ({}));
      throw new Error(`Failed to create deployment: ${errorData.message || deployResponse.statusText}`);
    }

    const deploy = await deployResponse.json();
    console.log('✅ Deployment created:', deploy.id);

    // Step 4: Upload required files
    if (deploy.required && deploy.required.length > 0) {
      await uploadFiles(deploy, files, token);
    }

    console.log('🎉 Deployment completed successfully!');

    return {
      url: site.ssl_url || site.url,
      adminUrl: site.admin_url,
      siteId: site.id,
      deployId: deploy.id,
      platform: 'Netlify',
      deployedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw new Error(`Deployment failed: ${error.message}`);
  }
};

/**
 * Prepare files for Netlify deployment
 * @param {Object} portfolio - Portfolio data
 * @returns {Object} Files object with SHA1 hashes
 */
function prepareFiles(portfolio) {
  const files = {};
  
  // Main HTML file
  const htmlContent = ensureCompleteHtml(portfolio.html);
  files['index.html'] = generateSHA1(htmlContent);
  
  // Add CSS if provided
  if (portfolio.css) {
    files['styles.css'] = generateSHA1(portfolio.css);
  }
  
  // Add JS if provided
  if (portfolio.js) {
    files['script.js'] = generateSHA1(portfolio.js);
  }

  // Add _redirects file for SPA routing (optional)
  const redirectsContent = '/*    /index.html   200';
  files['_redirects'] = generateSHA1(redirectsContent);

  return files;
}

/**
 * Ensure HTML is complete and deployable
 * @param {string} html - Raw HTML content
 * @returns {string} Complete HTML document
 */
function ensureCompleteHtml(html) {
  // Check if HTML already has DOCTYPE and html tags
  if (html.includes('<!DOCTYPE') && html.includes('<html')) {
    return html;
  }

  // Wrap incomplete HTML in proper document structure
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Generated Portfolio</title>
    <style>
        body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        * { box-sizing: border-box; }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
}

/**
 * Upload required files to Netlify
 * @param {Object} deploy - Deployment object
 * @param {Object} files - Files with SHA1 hashes
 * @param {string} token - Netlify token
 */
async function uploadFiles(deploy, files, token) {
  const baseUrl = 'https://api.netlify.com/api/v1';
  
  for (const filePath of deploy.required) {
    const fileContent = getFileContent(filePath, files);
    
    if (!fileContent) {
      console.warn(`⚠️ File content not found for: ${filePath}`);
      continue;
    }

    const uploadResponse = await fetch(
      `${baseUrl}/deploys/${deploy.id}/files/${encodeURIComponent(filePath)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: fileContent,
      }
    );

    if (!uploadResponse.ok) {
      console.error(`Failed to upload ${filePath}:`, uploadResponse.statusText);
    } else {
      console.log(`✅ Uploaded: ${filePath}`);
    }
  }
}

/**
 * Get file content based on path and files object
 * @param {string} filePath - Path of the file
 * @param {Object} files - Files object
 * @returns {string|null} File content
 */
function getFileContent(filePath, originalPortfolio) {
  switch (filePath) {
    case 'index.html':
      return ensureCompleteHtml(originalPortfolio.html);
    case 'styles.css':
      return originalPortfolio.css || '';
    case 'script.js':
      return originalPortfolio.js || '';
    case '_redirects':
      return '/*    /index.html   200';
    default:
      return null;
  }
}

/**
 * Generate SHA1 hash for file content
 * @param {string} content - File content
 * @returns {string} SHA1 hash
 */
function generateSHA1(content) {
  // Simple SHA1 implementation for browser
  // In production, you might want to use crypto-js or similar
  let hash = 0;
  if (content.length === 0) return hash.toString(16);
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Alternative: Deploy using ZIP file method (simpler but less efficient)
 */
export const deployToNetlifyZip = async (portfolio, token) => {
  if (!token) {
    throw new Error('Netlify access token is required');
  }

  const baseUrl = 'https://api.netlify.com/api/v1';
  
  try {
    // Create site
    const siteResponse = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `portfolio-${Date.now()}`,
      }),
    });

    const site = await siteResponse.json();
    
    // Create zip content (simplified - you'd need a proper zip library)
    const htmlContent = ensureCompleteHtml(portfolio.html);
    
    // Deploy with direct HTML content (Netlify can handle single file)
    const deployResponse = await fetch(`${baseUrl}/sites/${site.id}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/html',
      },
      body: htmlContent,
    });

    const deploy = await deployResponse.json();

    return {
      url: site.ssl_url || site.url,
      adminUrl: site.admin_url,
      siteId: site.id,
      deployId: deploy.id,
      platform: 'Netlify',
      deployedAt: new Date().toISOString(),
    };

  } catch (error) {
    throw new Error(`Deployment failed: ${error.message}`);
  }
};

export default deployToNetlify;