import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Rocket, Download, Eye, Edit3, Check, X, 
  Smartphone, Tablet, Monitor, Crown, Lock, Lightbulb,
  Type, Palette, Layout, Zap, AlertCircle, Save,
  Sparkles, ChevronRight, ExternalLink, Undo2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deployToNetlify } from '@/lib/netlifyDeploy';
import { cn } from '@/lib/utils';

const NETLIFY_TOKEN = "nfp_xLq21tc1XRGTE5dbtKL4qK4sdtRw85wjd15f";

interface EditableRegion {
  id: string;
  type: 'heading' | 'paragraph' | 'list-item' | 'button';
  content: string;
  selector: string;
  bounds: { top: number; left: number; width: number; height: number };
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'text' | 'style' | 'layout';
  confidence: number;
  action: () => void;
  previewText?: string;
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const FreemiumEditPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [isDeploying, setIsDeploying] = useState(false);
  const [editableRegions, setEditableRegions] = useState<EditableRegion[]>([]);
  const [activeEdit, setActiveEdit] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { portfolioData, generatedPortfolio, metadata, isIncomplete } = location.state || {};
  
  if (!portfolioData || !generatedPortfolio) {
    React.useEffect(() => {
      navigate('/');
    }, [navigate]);
    return null;
  }

  const originalHtml = typeof generatedPortfolio === 'string' 
    ? generatedPortfolio 
    : generatedPortfolio?.html || '';

  // Initialize HTML content
  useEffect(() => {
    setHtmlContent(originalHtml);
  }, [originalHtml]);

  // Reset all changes to original content
  const handleResetChanges = useCallback(() => {
    setHtmlContent(originalHtml);
    setHasChanges(false);
    setActiveEdit(null);
    setEditingText('');
    toast({
      title: "Changes Reset",
      description: "All edits have been reverted to original content",
    });
  }, [originalHtml, toast]);

  // Generate suggestions based on content
  const generateSuggestions = useCallback(() => {
    const newSuggestions: Suggestion[] = [
      {
        id: 'improve-readability',
        title: 'Improve Text Readability',
        description: 'Increase line spacing and font size for better readability',
        type: 'style',
        confidence: 0.8,
        action: () => {
          const updatedHtml = htmlContent.replace(
            /<style>/,
            '<style>\nbody { line-height: 1.6; font-size: 16px; }'
          );
          setHtmlContent(updatedHtml);
          setHasChanges(true);
          toast({ title: "Style Updated", description: "Text readability improved" });
        }
      },
      {
        id: 'add-contact-button',
        title: 'Add Contact Call-to-Action',
        description: 'Make it easier for visitors to contact you',
        type: 'text',
        confidence: 0.9,
        action: () => {
          if (portfolioData.personalInfo.email) {
            const contactButton = `<div style="text-align: center; margin: 2rem 0;"><a href="mailto:${portfolioData.personalInfo.email}" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Get In Touch</a></div>`;
            const updatedHtml = htmlContent.replace('</body>', contactButton + '</body>');
            setHtmlContent(updatedHtml);
            setHasChanges(true);
            toast({ title: "Contact Button Added", description: "Visitors can now easily reach out to you" });
          }
        },
        previewText: 'Get In Touch'
      },
      {
        id: 'improve-spacing',
        title: 'Better Visual Spacing',
        description: 'Add consistent spacing between sections',
        type: 'layout',
        confidence: 0.7,
        action: () => {
          const updatedHtml = htmlContent.replace(
            /<style>/,
            '<style>\n.section { margin-bottom: 3rem; } h1, h2, h3 { margin-top: 2rem; margin-bottom: 1rem; }'
          );
          setHtmlContent(updatedHtml);
          setHasChanges(true);
          toast({ title: "Spacing Improved", description: "Better visual hierarchy added" });
        }
      }
    ];
    
    setSuggestions(newSuggestions);
  }, [htmlContent, portfolioData, toast]);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return;
    
    const style = iframeRef.current.contentDocument.createElement('style');
    style.textContent = `
      .freemium-editable {
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .freemium-editable:hover {
        background-color: rgba(59, 130, 246, 0.1) !important;
        outline: 2px dashed rgba(59, 130, 246, 0.4);
        outline-offset: 2px;
      }
      .freemium-edit-indicator {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #3b82f6;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        z-index: 1000;
      }
      .freemium-editable:hover .freemium-edit-indicator {
        opacity: 1;
      }
    `;
    iframeRef.current.contentDocument.head.appendChild(style);
  }, []);

  // Apply text edit
  const applyTextEdit = useCallback((regionId: string, newText: string) => {
    if (!iframeRef.current?.contentDocument) return;
    
    const region = editableRegions.find(r => r.id === regionId);
    if (!region) return;
    
    try {
      const element = iframeRef.current.contentDocument.querySelector(region.selector);
      if (element) {
        element.textContent = newText;
        const newHtml = iframeRef.current.contentDocument.documentElement.outerHTML;
        setHtmlContent(newHtml);
        setHasChanges(true);
        setEditableRegions(prev => 
          prev.map(r => r.id === regionId ? { ...r, content: newText } : r)
        );
        toast({ title: "Text Updated", description: "Your changes have been applied" });
      }
    } catch (error) {
      console.error('Failed to apply text edit:', error);
      toast({
        title: "Update Failed",
        description: "Could not apply the text change",
        variant: "destructive",
      });
    }
  }, [editableRegions, toast]);

  const handleSaveEdit = () => {
    if (activeEdit && editingText.trim()) {
      applyTextEdit(activeEdit, editingText.trim());
    }
    setActiveEdit(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setActiveEdit(null);
    setEditingText('');
  };

  const getViewportClasses = () => {
    switch (viewportSize) {
      case 'mobile': return 'w-[375px] h-[667px]';
      case 'tablet': return 'w-[768px] h-[1024px]';
      case 'desktop': return 'w-full h-[700px]';
      default: return 'w-full h-[700px]';
    }
  };

// Updated handleDeploy function for your component

const handleDeploy = async () => {
  if (isIncomplete) {
    toast({
      title: "Cannot Deploy Incomplete Portfolio",
      description: "Please complete the generation first",
      variant: "destructive",
    });
    return;
  }

  // Check if user has provided a Netlify token
  const netlifyToken = process.env.REACT_APP_NETLIFY_TOKEN || prompt("Please enter your Netlify Personal Access Token:");
  
  if (!netlifyToken) {
    toast({
      title: "Netlify Token Required",
      description: "You need a Netlify Personal Access Token to deploy",
      variant: "destructive",
    });
    return;
  }

  setIsDeploying(true);
  
  try {
    toast({
      title: "Deploying to Netlify...",
      description: "Creating your live portfolio",
    });

    // Use the simpler deployment method
    const deployment = await deployToNetlify(htmlContent, netlifyToken);
    
    toast({
      title: "🎉 Deployment Successful!",
      description: "Your portfolio is now live on the web",
    });

    navigate('/deployment', { 
      state: { 
        portfolioData,
        generatedPortfolio: { html: htmlContent },
        deploymentUrl: deployment.url,
        platform: deployment.platform,
        deployedAt: deployment.deployedAt,
        siteId: deployment.siteId,
        metadata
      }
    });
    
  } catch (error) {
    console.error('Deployment failed:', error);
    
    // More helpful error messages
    let errorMessage = "An unknown error occurred";
    
    if (error.message.includes("401")) {
      errorMessage = "Invalid Netlify token. Please check your Personal Access Token.";
    } else if (error.message.includes("403")) {
      errorMessage = "Permission denied. Check your Netlify token permissions.";
    } else if (error.message.includes("network")) {
      errorMessage = "Network error. Please check your internet connection.";
    } else {
      errorMessage = error.message;
    }
    
    toast({
      variant: "destructive",
      title: "Deployment Failed",
      description: errorMessage,
    });
  } finally {
    setIsDeploying(false);
  }
};
  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioData.personalInfo.name.replace(/\s+/g, '_')}_portfolio.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Portfolio Downloaded", description: "Your HTML file has been downloaded successfully" });
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'text': return Type;
      case 'style': return Palette;
      case 'layout': return Layout;
      default: return Lightbulb;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-100';
    return 'text-orange-600 bg-orange-100';
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/preview', { state: location.state })} className="shadow-soft">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Preview
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center">
                  <Edit3 className="h-5 w-5 mr-2" />
                  Quick Edit
                  <Badge variant="secondary" className="ml-2 text-xs">Free tier</Badge>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Click on any text to edit • {hasChanges ? 'Unsaved changes' : 'No changes'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <Button variant="outline" onClick={handleResetChanges}>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Reset Changes
                </Button>
              )}
              
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              
              <Button onClick={handleDeploy} variant="build" disabled={isDeploying || isIncomplete}>
                {isDeploying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy to Web
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Preview Area */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4 p-3 bg-card rounded-lg border shadow-soft">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Device Preview:</span>
                  <Button variant={viewportSize === 'desktop' ? 'default' : 'outline'} size="sm" onClick={() => setViewportSize('desktop')}>
                    <Monitor className="h-4 w-4 mr-1" />
                    Desktop
                  </Button>
                  <Button variant={viewportSize === 'tablet' ? 'default' : 'outline'} size="sm" onClick={() => setViewportSize('tablet')}>
                    <Tablet className="h-4 w-4 mr-1" />
                    Tablet
                  </Button>
                  <Button variant={viewportSize === 'mobile' ? 'default' : 'outline'} size="sm" onClick={() => setViewportSize('mobile')}>
                    <Smartphone className="h-4 w-4 mr-1" />
                    Mobile
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground flex items-center">
                  <Edit3 className="h-3 w-3 mr-1" />
                  Click text to edit
                </div>
              </div>

              <Card className="shadow-large border-0">
                <CardContent className="p-6">
                  <div className="flex justify-center">
                    <div className={`${getViewportClasses()} transition-all duration-300 bg-white rounded-lg shadow-medium overflow-hidden border border-border relative`}>
                      <iframe
                        ref={iframeRef}
                        srcDoc={htmlContent}
                        className="w-full h-full border-0"
                        title="Portfolio Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                        onLoad={handleIframeLoad}
                      />
                      
                      {activeEdit && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
                          <Card className="w-96 max-w-[90%]">
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center">
                                <Edit3 className="h-5 w-5 mr-2" />
                                Edit Text
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  New text content:
                                </label>
                                {editingText.length > 50 ? (
                                  <Textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="mt-2"
                                    rows={3}
                                    autoFocus
                                  />
                                ) : (
                                  <Input
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="mt-2"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEdit();
                                      if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                  />
                                )}
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button onClick={handleSaveEdit} variant="default" className="flex-1">
                                  <Check className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                                <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="shadow-medium border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Quick Improvements
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setShowSuggestions(!showSuggestions)}>
                      <ChevronRight className={cn("h-4 w-4 transition-transform", showSuggestions && "rotate-90")} />
                    </Button>
                  </CardTitle>
                </CardHeader>
                
                {showSuggestions && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {suggestions.slice(0, 3).map((suggestion) => {
                        const Icon = getSuggestionIcon(suggestion.type);
                        return (
                          <div
                            key={suggestion.id}
                            className="p-3 border border-border rounded-lg hover:shadow-soft transition-shadow cursor-pointer"
                            onClick={suggestion.action}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-4 w-4 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-sm font-medium truncate">{suggestion.title}</h4>
                                  <Badge variant="secondary" className={cn("text-xs", getConfidenceColor(suggestion.confidence))}>
                                    {Math.round(suggestion.confidence * 100)}%
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {suggestion.description}
                                </p>
                                {suggestion.previewText && (
                                  <p className="text-xs text-accent mt-1 font-mono">
                                    Preview: "{suggestion.previewText}"
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {suggestions.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-3 text-xs"
                        onClick={() => toast({
                          title: "More Suggestions Available",
                          description: "Upgrade to Pro for advanced suggestions and editing",
                        })}
                      >
                        View {suggestions.length - 3} More Suggestions
                        <Crown className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>

              <Card className="shadow-medium border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    How to Edit
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Click on Text</p>
                        <p className="text-muted-foreground text-xs">
                          Hover over any text and click to edit
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-green-600">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Apply Suggestions</p>
                        <p className="text-muted-foreground text-xs">
                          Use quick improvements to enhance your portfolio
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-purple-600">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Deploy When Ready</p>
                        <p className="text-muted-foreground text-xs">
                          Click deploy to make your portfolio live
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-medium border-0 bg-gradient-to-br from-purple-50 to-blue-50">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Want More Control?</h3>
                    <p className="text-xs text-gray-600">
                      Upgrade to Pro for advanced visual editing, custom styling, and unlimited suggestions
                    </p>
                    <Button 
                      size="sm"
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs h-8"
                      onClick={() => toast({
                        title: "Pro Features Coming Soon",
                        description: "Advanced editing features will be available in our Pro plan",
                      })}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Upgrade to Pro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 mt-8 border-t border-border">
            <Button variant="outline" onClick={() => navigate('/preview', { state: location.state })}>
              <Eye className="h-4 w-4 mr-2" />
              Back to Preview
            </Button>

            <Button variant="outline" onClick={() => window.open('https://example.com/pro-features', '_blank')}>
              <Crown className="h-4 w-4 mr-2" />
              Learn About Pro
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>

            <Button onClick={handleDeploy} variant="build" disabled={isDeploying || isIncomplete} className="px-8">
              {isDeploying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy Portfolio
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreemiumEditPreview;