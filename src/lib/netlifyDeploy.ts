// src/lib/netlifyDeploy.js
// Simplified Netlify deployment for single HTML file

/**
 * Deploy portfolio to Netlify using the API
 * @param {string} htmlContent - Portfolio HTML content
 * @param {string} token - Netlify access token
 * @returns {Promise<Object>} Deployment result
 */
export const deployToNetlify = async (htmlContent: string, token: string) => {
  if (!token) {
    throw new Error('Netlify access token is required');
  }

  if (!htmlContent) {
    throw new Error('Portfolio HTML is required for deployment');
  }

  const baseUrl = 'https://api.netlify.com/api/v1';
  
  try {
    // 1. Create a new site
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

    if (!siteResponse.ok) {
      const error = await siteResponse.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to create site');
    }

    const site = await siteResponse.json();
    
    // 2. Upload the HTML file directly to the site
    const uploadResponse = await fetch(
      `${baseUrl}/sites/${site.id}/files/index.html`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/html',
        },
        body: htmlContent, // Use the exact HTML content as-is
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed with response:', errorText);
      throw new Error(`Failed to upload HTML file: ${uploadResponse.statusText}`);
    }

    return {
      url: site.ssl_url || site.url,
      siteId: site.id,
      platform: 'Netlify',
      deployedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Deployment failed:', error);
    throw new Error(`Deployment failed: ${error.message}`);
  }
};

/**
 * Simple hash function for file identification
 */
function simpleHash(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}