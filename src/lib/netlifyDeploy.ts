import JSZip from "jszip";

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
  NETLIFY_TOKEN: string // Pass this in from your config or env
): Promise<DeploymentResult> => {
  // 1. Create a new site
  const siteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const siteData = await siteResponse.json();
  const siteId = siteData.id;

  // 2. Create a ZIP of your files
  const zip = new JSZip();
  zip.file("index.html", portfolio.html);
  if (portfolio.css) zip.file("styles.css", portfolio.css);
  if (portfolio.js) zip.file("script.js", portfolio.js);
  const zipBlob = await zip.generateAsync({ type: "blob" });

  // 3. Deploy the ZIP to the new site
  const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': 'application/zip',
    },
    body: zipBlob,
  });
  const deployData = await deployResponse.json();

  return {
    url: deployData.ssl_url || deployData.url,
    siteId: siteId,
    platform: 'Netlify',
    deployedAt: new Date().toISOString()
  };
};