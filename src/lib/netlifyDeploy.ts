interface DeploymentResult {
  url: string;
  siteId: string;
  platform: string;
  deployedAt: string;
}

interface GeneratedPortfolio {
  html: string;
  css: string;
  js: string;
}

export const deployToNetlify = async (
  portfolio: GeneratedPortfolio,
  NETLIFY_TOKEN: string
): Promise<DeploymentResult> => {
  // Simplified deployment for testing - no ZIP dependency needed
  
  try {
    // 1. Create a new site
    const siteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!siteResponse.ok) {
      throw new Error(`Failed to create site: ${siteResponse.status}`);
    }
    
    const siteData = await siteResponse.json();
    const siteId = siteData.id;

    // 2. Deploy HTML directly (simplified - no ZIP needed)
    const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
        'Content-Type': 'application/zip',
      },
      body: portfolio.html, // Simplified for now
    });

    if (!deployResponse.ok) {
      throw new Error(`Failed to deploy: ${deployResponse.status}`);
    }

    const deployData = await deployResponse.json();

    return {
      url: deployData.ssl_url || deployData.url,
      siteId: siteId,
      platform: 'Netlify',
      deployedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Deployment error:', error);
    throw error;
  }
};