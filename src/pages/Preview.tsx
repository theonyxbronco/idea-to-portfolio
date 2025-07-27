// src/pages/Preview.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Eye, Code, Smartphone, Monitor, Tablet, ExternalLink, 
  Rocket, AlertCircle, Download, Edit, RotateCcw, Split 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { deployToNetlify } from '@/lib/netlifyDeploy';
import { useHtmlParser } from '@/hooks/useHtmlParser';
import EditableComponent from '@/components/EditableComponent';
import EditPanel from '@/components/EditPanel';

const NETLIFY_TOKEN = "nfp_ubQ5p2gRqsLfiTf1vj1d1ghjXbPhsXSRea18";

type ViewportSize = 'mobile' | 'tablet' | 'desktop';
type ViewMode = 'original' | 'edit-only';

const Preview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('edit-only');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get data from previous page
  const { portfolioData, generatedPortfolio, metadata } = location.state || {};
  
  // Initialize HTML parser
  const htmlString = typeof generatedPortfolio === 'string' 
    ? generatedPortfolio 
    : generatedPortfolio?.html || '';
    
  const {
    parsedComponents,
    selectedElementId,
    selectedElement,
    selectElement,
    modifyElement,
    hasModifications,
    resetModifications,
    generateModifiedHtml
  } = useHtmlParser(htmlString);
  
  if (!portfolioData || !generatedPortfolio) {
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

      const finalHtml = hasModifications ? generateModifiedHtml() : htmlString;
      const demoPortfolio = {
        html: finalHtml,
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
    const finalHtml = hasModifications ? generateModifiedHtml() : htmlString;
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioData.personalInfo.name.replace(/\s+/g, '_')}_portfolio.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleElementSelect = (elementId: string) => {
    selectElement(elementId);
  };

  const handleElementEdit = (elementId: string) => {
    selectElement(elementId);
  };

  const renderEditableComponents = () => {
    return (
      <div className="w-full h-full overflow-auto bg-white">
        {parsedComponents.map((component) => (
          <EditableComponent
            key={component.id}
            element={component}
            isSelected={selectedElementId === component.id}
            onSelect={handleElementSelect}
            onEdit={handleElementEdit}
          />
        ))}
      </div>
    );
  };

  const renderOriginalView = () => (
    <iframe
      srcDoc={htmlString}
      className="w-full h-full border-0"
      title="Original Portfolio Preview"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );

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
                  Review and edit your AI-generated portfolio before deployment
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Eye className="h-4 w-4 mr-2" />
                AI Generated
              </Badge>
              {hasModifications && (
                <Badge variant="default" className="px-3 py-1 text-xs">
                  Modified
                </Badge>
              )}
            </div>
          </div>

          {/* Top Controls Bar */}
          <div className="flex flex-wrap items-center justify-between mb-8 p-4 bg-card rounded-lg border shadow-soft">
            <div className="flex flex-wrap items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">View:</span>
                <Button
                  variant={viewMode === 'original' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('original')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Original
                </Button>
                <Button
                  variant={viewMode === 'edit-only' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('edit-only')}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editable
                </Button>
              </div>

              {/* Viewport Size Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Size:</span>
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
            </div>

            <div className="flex items-center space-x-2">
              {hasModifications && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetModifications}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Changes
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCode}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Preview Area */}
          <div>
          <Card className="shadow-large border-0 mb-8">
            <CardHeader className="bg-gradient-primary text-primary-foreground">
              <CardTitle className="text-xl">Portfolio Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {/* Preview Container */}
              <div className="flex justify-center">
                <div className={`${getViewportClasses()} transition-all duration-300 bg-white rounded-lg shadow-medium overflow-hidden border border-border`}>
                  {viewMode === 'original' && renderOriginalView()}
                  {viewMode === 'edit-only' && renderEditableComponents()}
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
            </CardContent>
          </Card>

          {/* Edit Panel Below - Only show when element is selected */}
          {selectedElement && (
            <Card className="shadow-large border-0">
              <CardHeader className="bg-gradient-accent text-accent-foreground">
                <CardTitle className="text-xl flex items-center justify-between">
                  <span>Editing: {selectedElement.type} element</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectElement(null)}
                    className="text-accent-foreground hover:bg-accent-foreground/20"
                  >
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <EditPanel
                  element={selectedElement}
                  onClose={() => selectElement(null)}
                  onModify={(changes) => modifyElement(selectedElement.id, changes)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>    </div>
  );
};

export default Preview;