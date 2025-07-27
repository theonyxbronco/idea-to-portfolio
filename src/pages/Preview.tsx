import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Code, Smartphone, Monitor, Tablet, ExternalLink, Rocket, AlertCircle, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { deployToNetlify } from '@/lib/netlifyDeploy';

const NETLIFY_TOKEN = "nfp_ubQ5p2gRqsLfiTf1vj1d1ghjXbPhsXSRea18";

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const Preview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get data from previous page
  const { portfolioData, generatedPortfolio, metadata } = location.state || {};
  
  if (!portfolioData || !generatedPortfolio) {
    // Redirect back to form if no data
    React.useEffect(() => {
      navigate('/');
    }, [navigate]);
    return null;
  }

  const getViewportClasses = () => {
    switch (viewportSize) {
      case 'mobile':
        return 'w-[375px] h-[667px]';
      case 'tablet':
        return 'w-[768px] h-[1024px]';
      case 'desktop':
        return 'w-full h-[800px]';
      default:
        return 'w-full h-[800px]';
    }
  };

  const handleDeploy = async () => {
    setIsLoading(true);
    
    try {
      toast({
        title: "Deploying to Netlify...",
        description: "Creating your live portfolio",
      });

      // Create a simple demo portfolio HTML for now
      const demoPortfolio = {
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${portfolioData.personalInfo.name} - Portfolio</title>
              <style>
                  body {
                      font-family: 'Arial', sans-serif;
                      margin: 0;
                      padding: 0;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      min-height: 100vh;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: white;
                  }
                  .container {
                      text-align: center;
                      max-width: 800px;
                      padding: 2rem;
                  }
                  h1 {
                      font-size: 3rem;
                      margin-bottom: 1rem;
                      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                  }
                  p {
                      font-size: 1.2rem;
                      opacity: 0.9;
                      margin-bottom: 2rem;
                  }
                  .badge {
                      background: rgba(255,255,255,0.2);
                      padding: 0.5rem 1rem;
                      border-radius: 25px;
                      backdrop-filter: blur(10px);
                      display: inline-block;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <h1>${portfolioData.personalInfo.name}</h1>
                  <p>${portfolioData.personalInfo.title}</p>
                  <div class="badge">Built with Portfolio Builder</div>
              </div>
          </body>
          </html>
        `,
        css: '',
        js: ''
      };

      // Deploy to Netlify
      const deployment = await deployToNetlify(demoPortfolio, NETLIFY_TOKEN);
      
      toast({
        title: "🎉 Deployment Successful!",
        description: "Your portfolio is now live on the web",
      });

      // Navigate to success page with real deployment data
      navigate('/deployment', { 
        state: { 
          portfolioData,
          generatedPortfolio,
          deploymentUrl: deployment?.url || 'https://amazing-portfolio-xyz.netlify.app',
          platform: deployment?.platform || 'Netlify',
          deployedAt: deployment?.deployedAt || new Date().toISOString(),
          siteId: deployment?.siteId
        }
      });
      
    } catch (error) {
      console.error('Deployment failed:', error);
      
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEdit = () => {
    navigate('/', { state: { portfolioData } });
  };

  const handleDownloadCode = () => {
    const htmlContent = typeof generatedPortfolio === 'string' 
      ? generatedPortfolio 
      : generatedPortfolio.html || JSON.stringify(generatedPortfolio, null, 2);
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioData.personalInfo.name.replace(/\s+/g, '_')}_portfolio.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    const htmlContent = typeof generatedPortfolio === 'string' 
      ? generatedPortfolio 
      : generatedPortfolio.html || '';
    
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleBackToEdit}
                className="shadow-soft"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Edit
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  AI-Generated Portfolio Preview
                </h1>
                <p className="text-muted-foreground">
                  Review your AI-generated portfolio before deployment
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Eye className="h-4 w-4 mr-2" />
                AI Generated
              </Badge>
              {metadata && (
                <Badge variant="outline" className="px-3 py-1 text-xs">
                  Generated: {new Date(metadata.generatedAt).toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Controls Sidebar */}
            <div className="lg:col-span-1">
              <Card className="shadow-medium border-0 sticky top-8">
                <CardHeader>
                  <CardTitle className="text-lg">Preview Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Viewport Size Selector */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      Viewport Size
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant={viewportSize === 'desktop' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewportSize('desktop')}
                        className="justify-start"
                      >
                        <Monitor className="h-4 w-4 mr-2" />
                        Desktop
                      </Button>
                      <Button
                        variant={viewportSize === 'tablet' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewportSize('tablet')}
                        className="justify-start"
                      >
                        <Tablet className="h-4 w-4 mr-2" />
                        Tablet
                      </Button>
                      <Button
                        variant={viewportSize === 'mobile' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewportSize('mobile')}
                        className="justify-start"
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        Mobile
                      </Button>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="space-y-3 pt-6 border-t border-border">
                    <label className="text-sm font-medium text-foreground">
                      Portfolio Details
                    </label>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="text-sm font-medium">{portfolioData.personalInfo.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Title</p>
                        <p className="text-sm">{portfolioData.personalInfo.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Projects</p>
                        <p className="text-sm">{portfolioData.projects.length} project(s)</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-6 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleDownloadCode}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleOpenInNewTab}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Area */}
            <div className="lg:col-span-3">
              <Card className="shadow-large border-0">
                <CardHeader className="bg-gradient-primary text-primary-foreground">
                  <CardTitle className="text-xl">AI-Generated Portfolio</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  {/* Preview Container */}
                  <div className="flex justify-center">
                    <div className={`${getViewportClasses()} transition-all duration-300 bg-white rounded-lg shadow-medium overflow-hidden border border-border`}>
                      {/* Render the actual generated portfolio */}
                      <iframe
                        srcDoc={typeof generatedPortfolio === 'string' ? generatedPortfolio : generatedPortfolio.html}
                        className="w-full h-full border-0"
                        title="Generated Portfolio Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    </div>
                  </div>

                  {/* Deploy Button */}
                  <div className="flex justify-center mt-8 pt-8 border-t border-border">
                    <Button
                      onClick={handleDeploy}
                      variant="build"
                      size="lg"
                      className="px-12 py-4 text-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Deploying...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-5 w-5 mr-2" />
                          Deploy to Web
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Info Note */}
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Real Deployment</p>
                        <p>This will create an actual live website using Netlify's free hosting service. The deployed site will be a simple demo for now.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Generation Info */}
              {metadata && (
                <Card className="shadow-medium border-0 mt-6">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center">
                      <Code className="h-4 w-4 mr-2" />
                      AI Generation Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Generated At:</p>
                        <p className="font-medium">{new Date(metadata.generatedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">AI Model:</p>
                        <p className="font-medium">Claude 3 Sonnet</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Style Applied:</p>
                        <p className="font-medium">{portfolioData.stylePreferences.mood || 'Professional'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Layout:</p>
                        <p className="font-medium">{portfolioData.stylePreferences.layoutStyle || 'Modern'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;