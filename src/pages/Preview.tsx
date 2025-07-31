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
  Sparkles, ChevronRight, ExternalLink, Undo2, FileArchive
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiRequest, setAiRequest] = useState('');
  const [isProcessingAiRequest, setIsProcessingAiRequest] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<Array<{request: string; timestamp: string}>>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const originalHtml = typeof generatedPortfolio === 'string' 
    ? generatedPortfolio 
    : generatedPortfolio?.html || '';

  if (!portfolioData || !generatedPortfolio) {
    React.useEffect(() => {
      navigate('/');
    }, [navigate]);
    return null;
  }

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
      },
      {
        id: 'enhance-colors',
        title: 'Enhance Color Contrast',
        description: 'Improve accessibility with better color contrast',
        type: 'style',
        confidence: 0.6,
        action: () => {
          const updatedHtml = htmlContent.replace(
            /<style>/,
            '<style>\nbody { color: #1f2937; } h1, h2, h3 { color: #111827; }'
          );
          setHtmlContent(updatedHtml);
          setHasChanges(true);
          toast({ title: "Colors Enhanced", description: "Better contrast for accessibility" });
        }
      },
      {
        id: 'mobile-responsive',
        title: 'Improve Mobile Experience',
        description: 'Add responsive design improvements for mobile devices',
        type: 'layout',
        confidence: 0.8,
        action: () => {
          const mobileCSS = `
@media (max-width: 768px) {
  body { padding: 1rem; font-size: 14px; }
  h1 { font-size: 1.8rem; }
  h2 { font-size: 1.4rem; }
  .container { max-width: 100%; }
}`;
          const updatedHtml = htmlContent.replace('</style>', mobileCSS + '</style>');
          setHtmlContent(updatedHtml);
          setHasChanges(true);
          toast({ title: "Mobile Improved", description: "Better experience on small screens" });
        }
      }
    ];
    
    setSuggestions(newSuggestions);
  }, [htmlContent, portfolioData, toast]);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  // Parse editable regions from HTML
  const parseEditableRegions = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return;
    
    const doc = iframeRef.current.contentDocument;
    const regions: EditableRegion[] = [];
    
    // Find text elements that can be edited
    const selectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // Headings
      'p', // Paragraphs
      '.bio', '.about', '.description', // Common bio sections
      '.project-title', '.project-description', // Project content
      'button', '.btn', '.button' // Buttons
    ];
    
    selectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const text = element.textContent?.trim() || '';
        
        if (text.length > 3 && rect.width > 0 && rect.height > 0) {
          regions.push({
            id: `${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${index}`,
            type: selector.startsWith('h') ? 'heading' : 
                  selector === 'p' || selector.includes('description') || selector.includes('bio') ? 'paragraph' :
                  selector.includes('button') || selector.includes('btn') ? 'button' : 'paragraph',
            content: text,
            selector: `${selector}:nth-of-type(${index + 1})`,
            bounds: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            }
          });
        }
      });
    });
    
    setEditableRegions(regions);
  }, []);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return;
    
    // Add hover styles for editable regions
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
    
    // Add click handlers to editable elements
    const addEditableHandlers = () => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      
      const editableSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', '.btn'];
      
      editableSelectors.forEach(selector => {
        const elements = doc.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const textContent = element.textContent?.trim();
          if (textContent && textContent.length > 3) {
            element.classList.add('freemium-editable');
            
            // Add edit indicator
            const indicator = doc.createElement('div');
            indicator.className = 'freemium-edit-indicator';
            indicator.innerHTML = '✎';
            element.appendChild(indicator);
            
            // Add click handler
            element.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              const regionId = `${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${index}`;
              setActiveEdit(regionId);
              setEditingText(textContent);
            });
          }
        });
      });
    };
    
    setTimeout(addEditableHandlers, 100);
    setTimeout(parseEditableRegions, 200);
  }, [parseEditableRegions]);

  // Apply text edit
const applyTextEdit = useCallback((regionId: string, newText: string) => {
  if (!iframeRef.current?.contentDocument) return;
  
  const region = editableRegions.find(r => r.id === regionId);
  if (!region) return;
  
  try {
    const element = iframeRef.current.contentDocument.querySelector(region.selector);
    if (element) {
      element.textContent = newText;
      
      // Get the complete updated HTML
      const newHtml = iframeRef.current.contentDocument.documentElement.outerHTML;
      setHtmlContent(newHtml);
      setHasChanges(true);
      
      // Update the region in our state
      setEditableRegions(prev => 
        prev.map(r => r.id === regionId ? { ...r, content: newText } : r)
      );
      
      toast({
        title: "Text Updated",
        description: "Your changes have been applied",
      });
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

useEffect(() => {
  // Show disclaimer toast when preview loads if there are images
  const hasImages = metadata?.imagesProcessed && 
    (metadata.imagesProcessed.final > 0 || metadata.imagesProcessed.process > 0 || metadata.imagesProcessed.moodboard > 0);
  
  if (hasImages) {
    const timer = setTimeout(() => {
      toast({
        title: "📸 Preview Note",
        description: "Images may not display in this preview due to browser security. Your images will appear correctly when downloaded or deployed to the web.",
        duration: 8000, // Show for 8 seconds
        className: "border-blue-200 bg-blue-50 text-blue-900",
      });
    }, 1500); // Show after 1.5 seconds to let page settle

    return () => clearTimeout(timer);
  }
}, [metadata, toast]);

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
      case 'mobile':
        return 'w-[375px] h-[667px]';
      case 'tablet':
        return 'w-[768px] h-[1024px]';
      case 'desktop':
        return 'w-full h-[700px]';
      default:
        return 'w-full h-[700px]';
    }
  };

  const handleDeploy = async () => {
    if (isIncomplete) {
      toast({
        title: "Cannot Deploy Incomplete Portfolio",
        description: "Please complete the generation first",
        variant: "destructive",
      });
      return;
    }
  
    try {
      setIsDeploying(true);
      
      // Get Netlify token
      let netlifyToken = import.meta.env.VITE_NETLIFY_TOKEN || 
                        localStorage.getItem('netlifyToken');
  
      if (!netlifyToken) {
        netlifyToken = prompt(
          "Please enter your Netlify Personal Access Token:\n\n" +
          "1. Go to netlify.com → User Settings → Applications\n" +
          "2. Click 'New access token'\n" +
          "3. Copy and paste it here"
        );
      }
  
      if (!netlifyToken?.trim()) {
        toast({
          title: "Netlify Token Required",
          description: "You need a Netlify Personal Access Token to deploy",
          variant: "destructive",
        });
        return;
      }
  
      localStorage.setItem('netlifyToken', netlifyToken.trim());
      toast({ title: "Preparing deployment..." });
  
      // Get current HTML and clean it
      const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || htmlContent;
      const cleanedHtml = cleanHtmlForExport(currentHtml);
  
      // Deploy folder with HTML to Netlify
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/deploy-folder-to-netlify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: cleanedHtml,
          netlifyToken: netlifyToken.trim(),
          personName: portfolioData.personalInfo.name,
          siteName: `${portfolioData.personalInfo.name.replace(/\s+/g, '-')}-portfolio`
        }),
      });
  
      const result = await response.json();
  
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Deployment failed with status ${response.status}`);
      }
  
      const { url } = result.deployment;
  
      // Save deployment info
      const deploymentInfo = {
        url,
        deployedAt: new Date().toISOString(),
        portfolioId: metadata?.portfolioId,
        folderName: result.deployment.folderName
      };
      
      localStorage.setItem('lastDeployment', JSON.stringify(deploymentInfo));
  
      // Open deployed site after a short delay
      setTimeout(() => {
        window.open(url, '_blank');
      }, 1500);
  
      toast({
        title: "🚀 Portfolio Deployed!",
        description: `Live at: ${url}`,
      });
  
    } catch (error) {
      console.error('Deployment error:', error);
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : 'Could not deploy portfolio',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const cleanHtmlForExport = (html: string) => {
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove all elements with freemium-editable class
    const editableElements = doc.querySelectorAll('.freemium-editable');
    editableElements.forEach(el => {
      el.classList.remove('freemium-editable');
    });
    
    // Remove all edit indicators
    const indicators = doc.querySelectorAll('.freemium-edit-indicator');
    indicators.forEach(el => el.remove());
    
    // Remove our injected style tag (but keep others)
    const styleTags = doc.querySelectorAll('style');
    styleTags.forEach(styleTag => {
      if (styleTag.textContent?.includes('freemium-editable')) {
        styleTag.remove();
      }
    });
    
    // Return the cleaned HTML
    return doc.documentElement.outerHTML;
  };

  const handleDownload = async () => {
    try {
      // Get the current HTML from the iframe
      const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || htmlContent;
      
      // Clean the HTML before saving
      const cleanedHtml = cleanHtmlForExport(currentHtml);
      
      // Create a blob with the cleaned HTML
      const blob = new Blob([cleanedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${portfolioData.personalInfo.name.replace(/\s+/g, '_')}_portfolio.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  
      toast({
        title: "Portfolio Downloaded",
        description: "HTML file downloaded with all current edits",
      });
  
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'Could not download portfolio',
        variant: "destructive",
      });
    }
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

  const handleAiEditRequest = async () => {
    if (!aiRequest.trim()) return;
    
    setIsProcessingAiRequest(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai-edit-portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent,
          editRequest: aiRequest
        }),
      });
  
      // First check if the response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      // Then try to parse the JSON
      const data = await response.json();
      
      if (data.success) {
        setHtmlContent(data.modifiedHtml);
        setHasChanges(true);
        
        // Update the chat history
        setAiChatHistory(prev => [
          ...prev,
          {
            request: aiRequest,
            timestamp: new Date().toLocaleTimeString(),
          }
        ]);
        
        toast({
          title: "AI Edit Applied",
          description: "Your changes have been processed",
        });
      } else {
        throw new Error(data.error || 'Failed to process AI edit');
      }
    } catch (error) {
      console.error('AI Edit Error:', error);
      toast({
        variant: "destructive",
        title: "AI Edit Failed",
        description: error.message || 'Could not process your request',
      });
    } finally {
      setIsProcessingAiRequest(false);
      setAiRequest('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/preview', { state: location.state })}
                className="shadow-soft"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Preview
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center">
                  <Edit3 className="h-5 w-5 mr-2" />
                  Quick Edit
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Free tier
                  </Badge>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Click on any text to edit • {hasChanges ? 'Unsaved changes' : 'No changes'}
                </p>
              </div>
            </div>
            
            {/* Status and Actions */}
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <Button variant="outline" onClick={handleResetChanges}>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Reset Changes
                </Button>
              )}
              
              {/* AI Chat Dialog */}
              <Dialog open={aiChatOpen} onOpenChange={setAiChatOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="shadow-soft">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Edit Assistant
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <Sparkles className="h-5 w-5 mr-2" />
                      AI Edit Assistant
                    </DialogTitle>
                    <DialogDescription>
                      Describe the changes you'd like to make to your portfolio
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {aiChatHistory.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Previous Requests</h4>
                        <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                          {aiChatHistory.map((item, index) => (
                            <div key={index} className="text-sm mb-2 last:mb-0">
                              <div className="flex justify-between">
                                <span className="font-medium">{item.request}</span>
                                <span className="text-muted-foreground text-xs">{item.timestamp}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Textarea
                      value={aiRequest}
                      onChange={(e) => setAiRequest(e.target.value)}
                      placeholder="Example: I want to make the header smaller and all the text varying shades of blue"
                      className="min-h-[120px]"
                      disabled={isProcessingAiRequest}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setAiChatOpen(false)}
                        disabled={isProcessingAiRequest}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAiEditRequest}
                        disabled={isProcessingAiRequest || !aiRequest.trim()}
                      >
                        {isProcessingAiRequest ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Apply Changes
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Lock className="h-3 w-3 mr-1" />
                      Note: Only one AI edit is allowed per session
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
  variant="outline"
  size="sm"
  onClick={handleDownload}
  disabled={isDownloading}
>
  {isDownloading ? (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      Preparing...
    </>
  ) : (
    <>
      <Download className="h-4 w-4 mr-2" />
      Download HTML
    </>
  )}
</Button>
              
              <Button
                onClick={handleDeploy}
                variant="build"
                disabled={isDeploying || isIncomplete}
              >
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Preview Area */}
            <div className="lg:col-span-3">
              {/* Viewport Controls */}
              <div className="flex items-center justify-between mb-4 p-3 bg-card rounded-lg border shadow-soft">
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
                
                <div className="text-xs text-muted-foreground flex items-center">
                  <Edit3 className="h-3 w-3 mr-1" />
                  Click text to edit
                </div>
              </div>

              {/* Preview Container */}
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
                      
                      {/* Edit Overlay */}
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
                                <Button
                                  onClick={handleSaveEdit}
                                  variant="default"
                                  className="flex-1"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                                <Button
                                  onClick={handleCancelEdit}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* AI Processing Overlay */}
                      {isProcessingAiRequest && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
                          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span>Applying AI changes...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Suggestions */}
              <Card className="shadow-medium border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Quick Improvements
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                    >
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform",
                        showSuggestions && "rotate-90"
                      )} />
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
                                  <h4 className="text-sm font-medium truncate">
                                    {suggestion.title}
                                  </h4>
                                  <Badge 
                                    variant="secondary" 
                                    className={cn("text-xs", getConfidenceColor(suggestion.confidence))}
                                  >
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
                        onClick={() => {
                          toast({
                            title: "More Suggestions Available",
                            description: "Upgrade to Pro for advanced suggestions and editing",
                          });
                        }}
                      >
                        View {suggestions.length - 3} More Suggestions
                        <Crown className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Editing Instructions */}
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

              {/* Pro Upgrade */}
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
                    <div className="flex flex-wrap justify-center gap-1 text-xs text-gray-500">
                      <span className="flex items-center"><Lock className="h-2 w-2 mr-1" />Visual Editor</span>
                      <span className="flex items-center"><Lock className="h-2 w-2 mr-1" />Custom CSS</span>
                      <span className="flex items-center"><Lock className="h-2 w-2 mr-1" />Advanced Layouts</span>
                    </div>
                    <Button 
                      size="sm"
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs h-8"
                      onClick={() => navigate('/pro-waitlist')}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Upgrade to Pro
                  </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Editable Elements */}
              {editableRegions.length > 0 && (
                <Card className="shadow-medium border-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      Editable Elements
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {editableRegions.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {editableRegions.slice(0, 8).map((region) => (
                        <div
                          key={region.id}
                          className="p-2 border border-border rounded text-xs hover:bg-accent/5 cursor-pointer transition-colors"
                          onClick={() => {
                            setActiveEdit(region.id);
                            setEditingText(region.content);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="capitalize text-muted-foreground">
                              {region.type.replace('-', ' ')}
                            </span>
                            <Edit3 className="h-3 w-3 text-accent" />
                          </div>
                          <p className="font-medium line-clamp-1 text-foreground">
                            {region.content}
                          </p>
                        </div>
                      ))}
                      
                      {editableRegions.length > 8 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          +{editableRegions.length - 8} more elements available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 mt-8 border-t border-border">
            <Button
              variant="outline"
              onClick={() => navigate('/preview', { state: location.state })}
            >
              <Eye className="h-4 w-4 mr-2" />
              Back to Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/pro-waitlist')}
            >
              <Crown className="h-4 w-4 mr-2" />
              Learn About Pro
            </Button>

            <Button
              onClick={handleDeploy}
              variant="build"
              disabled={isDeploying || isIncomplete}
              className="px-8"
            >
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

          {/* Usage Tips */}
          <Card className="shadow-medium border-0 mt-8 bg-gradient-subtle">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Edit3 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Quick Text Edits</p>
                    <p className="text-muted-foreground text-xs">
                      Click any text to make instant changes to your content
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">AI Suggestions</p>
                    <p className="text-muted-foreground text-xs">
                      Apply intelligent improvements to enhance your portfolio
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Rocket className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">One-Click Deploy</p>
                    <p className="text-muted-foreground text-xs">
                      Make your portfolio live on the web instantly
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FreemiumEditPreview;