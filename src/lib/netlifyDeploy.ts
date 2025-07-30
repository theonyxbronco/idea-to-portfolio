// netlifyDeploy.ts
export const deployToNetlify = async (htmlContent: string, token: string) => {
  if (!token) throw new Error('Netlify access token is required');
  if (!htmlContent) throw new Error('Portfolio HTML is required');

  const baseUrl = 'https://api.netlify.com/api/v1';
  
  try {
    // Create a FormData object with the HTML content
    const formData = new FormData();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    formData.append('file', blob, 'index.html');

    // Create a new Netlify site
    const siteResponse = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!siteResponse.ok) {
      const errorData = await siteResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create Netlify site');
    }

    const site = await siteResponse.json();

    return {
      url: site.ssl_url || site.url || `https://${site.subdomain}.netlify.app`,
      siteId: site.id,
      platform: 'Netlify',
      deployedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Netlify deployment failed:', error);
    throw new Error(`Netlify deployment failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};