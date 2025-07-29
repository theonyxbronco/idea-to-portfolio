// src/pages/Preview.tsx - Improved Flow Integration
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Eye, Code, Smartphone, Monitor, Tablet, ExternalLink, 
  Rocket, AlertCircle, Download, Edit, RotateCcw, Split, Settings,
  Zap, FileCode
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { deployToNetlify } from '@/lib/netlifyDeploy';
import { useHtmlParser } from '@/hooks/useHtmlParser';
import EditableComponent from '@/components/EditableComponent';
import EditPanel from '@/components/EditPanel';

const NETLIFY_TOKEN = "nfp_ubQ5p2gRqsLfiTf1vj1d1ghjXbPhsXSRea18";

type ViewportSize = 'mobile' | 'tablet' | 'desktop';
type ViewMode = 'original' | 'editable';

const Preview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('editable');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get data from previous page
  const { portfolioData, generatedPortfolio, metadata, isIncomplete } = location.state || {};
  
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

  const handleAdvancedEdit = () => {
    // Navigate to advanced visual editor
    navigate('/edit', { 
      state: { 
        portfolioData, 
        generatedPortfolio: hasModifications ? { html: generateModifiedHtml() } : generatedPortfolio, 
        metadata 
      } 
    });
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

    toast({
      title: "Portfolio Downloaded",
      description: "Your HTML file has been downloaded successfully",
    });
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
                  Portfolio Preview & Edit
                </h1>
                <p className="text-muted-foreground">
                  Review, edit, and deploy your AI-generated portfolio
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
                <span>Preview/Edit</span>
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
              {hasModifications && (
                <Badge variant="default" className="px-3 py-1 text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Modified
                </Badge>
              )}
              {isIncomplete && (
                <Badge variant="destructive" className="px-3 py-1 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Incomplete
                </Badge>
              )}
            </div>
          </div>

          {/* Enhanced Controls Bar */}
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
                  variant={viewMode === 'editable' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('editable')}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editable
                </Button>
              </div>

              {/* Viewport Size Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Device:</span>
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

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 flex-wrap">
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
                onClick={handleAdvancedEdit}
                className="hidden md:flex"
              >
                <Settings className="h-4 w-4 mr-2" />
                Advanced Edit
              </Button>

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
                <div className="flex items-center space-x-2">
                  {viewMode === 'editable' && selectedElement && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Editing: {selectedElement.type}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {/* Preview Container */}
              <div className="flex justify-center">
                <div className={`${getViewportClasses()} transition-all duration-300 bg-white rounded-lg shadow-medium overflow-hidden border border-border`}>
                  {viewMode === 'original' && renderOriginalView()}
                  {viewMode === 'editable' && renderEditableComponents()}
                </div>
              </div>

              {/* Next Steps Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mt-8 pt-8 border-t border-border">
                {/* Advanced Edit Button */}
                <Button
                  onClick={handleAdvancedEdit}
                  variant="accent"
                  size="lg"
                  className="px-8 py-3"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Advanced Visual Editor
                </Button>

                {/* Deploy Button */}
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
              </div>

              {/* Flow Guidance */}
              <div className="text-center mt-6 text-sm text-muted-foreground">
                <p>
                  💡 Tip: Use <strong>Editable mode</strong> for quick text changes, or try the <strong>Advanced Visual Editor</strong> for complete design control
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Inline Edit Panel - Only show when element is selected in editable mode */}
          {selectedElement && viewMode === 'editable' && (
            <Card className="shadow-large border-0">
              <CardHeader className="bg-gradient-accent text-accent-foreground">
                <CardTitle className="text-xl flex items-center justify-between">
                  <span>Quick Edit: {selectedElement.type} element</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectElement(null)}
                    className="text-accent-foreground hover:bg-accent-foreground/20"
                  >
                    <Code className="h-4 w-4" />
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
    </div>
  );
};

export default Preview;