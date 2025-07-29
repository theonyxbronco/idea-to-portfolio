// src/pages/Preview.tsx - Focused on Free Editing Experience
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Eye, Smartphone, Monitor, Tablet, ExternalLink, 
  Rocket, AlertCircle, Download, RotateCcw, Zap, FileCode,
  Crown, Lock
} from 'lucide-react';
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
  const { portfolioData, generatedPortfolio, metadata, isIncomplete } = location.state || {};
  
  if (!portfolioData || !generatedPortfolio) {
    React.useEffect(() => {
      navigate('/');
    }, [navigate]);
    return null;
  }

  const htmlString = typeof generatedPortfolio === 'string' 
    ? generatedPortfolio 
    : generatedPortfolio?.html || '';

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
    if (isIncomplete) {
      toast({
        title: "Cannot Deploy Incomplete Portfolio",
        description: "Please complete the generation first or fix incomplete sections",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      toast({
        title: "Deploying to Netlify...",
        description: "Creating your live portfolio",
      });

      const demoPortfolio = {
        html: htmlString,
        css: '',
        js: ''
      };

      const deployment = await deployToNetlify(demoPortfolio, NETLIFY_TOKEN);
      
      toast({
        title: "🎉 Deployment Successful!",
        description: "Your portfolio is now live on the web",
      });

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
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioData.personalInfo.name.replace(/\s+/g, '_')}_portfolio.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Portfolio Downloaded",
      description: "Your HTML file has been downloaded successfully",
    });
  };

  const handleProFeature = () => {
    toast({
      title: "Pro Feature",
      description: "Advanced editing is available in our Pro plan. Coming soon!",
      variant: "default",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Flow Indicators */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleBackToEdit}
                className="shadow-soft"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Generate
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Portfolio Preview
                </h1>
                <p className="text-muted-foreground">
                  Review your AI-generated portfolio and deploy to the web
                </p>
              </div>
            </div>
            
            {/* Flow Progress Indicator */}
            <div className="hidden lg:flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>Generated</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className="flex items-center space-x-1 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Preview</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className="flex items-center space-x-1 text-gray-400">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Deploy</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Eye className="h-4 w-4 mr-2" />
                AI Generated
              </Badge>
              {isIncomplete && (
                <Badge variant="destructive" className="px-3 py-1 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Incomplete
                </Badge>
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between mb-8 p-4 bg-card rounded-lg border shadow-soft">
            {/* Viewport Size Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Device Preview:</span>
              <Button
                variant={viewportSize === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewportSize('desktop')}
              >
                <Monitor className="h-4 w-4 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewportSize === 'tablet' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewportSize('tablet')}
              >
                <Tablet className="h-4 w-4 mr-1" />
                Tablet
              </Button>
              <Button
                variant={viewportSize === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewportSize('mobile')}
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCode}
              >
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
            </div>
          </div>

          {/* Warning for incomplete content */}
          {isIncomplete && (
            <Card className="shadow-medium border-0 mb-8 border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Incomplete Portfolio Warning</p>
                    <p className="text-sm">This portfolio was generated from incomplete content and may have broken sections or missing elements.</p>
                    <div className="mt-3 flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate('/incomplete', { 
                          state: { 
                            portfolioData, 
                            partialHtml: htmlString,
                            completionStatus: metadata?.validationResult,
                            metadata: metadata,
                            error: 'Portfolio incomplete'
                          }
                        })}
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Continue Generation
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate('/')}
                      >
                        <FileCode className="h-4 w-4 mr-1" />
                        Start Over
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Area */}
          <Card className="shadow-large border-0 mb-8">
            <CardHeader className="bg-gradient-primary text-primary-foreground">
              <CardTitle className="text-xl flex items-center justify-between">
                <span>Portfolio Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {/* Preview Container */}
              <div className="flex justify-center">
                <div className={`${getViewportClasses()} transition-all duration-300 bg-white rounded-lg shadow-medium overflow-hidden border border-border`}>
                  <iframe
                    srcDoc={htmlString}
                    className="w-full h-full border-0"
                    title="Portfolio Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                </div>
              </div>

              {/* Deploy Action */}
              <div className="flex flex-col items-center justify-center space-y-4 mt-8 pt-8 border-t border-border">
                <Button
                  onClick={handleDeploy}
                  variant="build"
                  size="lg"
                  className="px-12 py-3 text-lg"
                  disabled={isLoading || isIncomplete}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Deploying...
                    </>
                  ) : isIncomplete ? (
                    <>
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Complete Generation First
                    </>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5 mr-2" />
                      Deploy to Web
                    </>
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Deploy your portfolio to get a live website URL that you can share with anyone
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pro Features Teaser */}
          <Card className="shadow-medium border-0 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <Crown className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Want to Edit Your Portfolio?</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Advanced editing features including visual editor, custom styling, and real-time text editing are coming soon in our Pro plan!
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
                  <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Visual Editor</span>
                  <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Custom Styling</span>
                  <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Real-time Editing</span>
                  <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Advanced Layouts</span>
                </div>
                <Button 
                  onClick={handleProFeature}
                  variant="default"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Learn More About Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Preview;