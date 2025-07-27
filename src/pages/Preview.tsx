import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Code, Smartphone, Monitor, Tablet, ExternalLink, Rocket, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const Preview = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleDeploy = () => {
    setIsLoading(true);
    // Simulate deployment process
    setTimeout(() => {
      navigate('/deployment', { 
        state: { 
          portfolioData,
          generatedPortfolio,
          deploymentUrl: 'https://amazing-portfolio-xyz.netlify.app',
          platform: 'Netlify',
          deployedAt: new Date().toISOString()
        }
      });
    }, 2000);
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
                          Deploy Portfolio
                        </>
                      )}
                    </Button>
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