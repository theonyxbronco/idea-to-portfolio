import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Rocket, Eye, Edit3, Check, X, 
  Smartphone, Tablet, Monitor, Crown, Lock, Lightbulb,
  Type, Palette, Layout, Zap, AlertCircle, Save,
  Sparkles, ChevronRight, ExternalLink, Undo2, FileArchive
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EditableRegion {
  id: string;
  type: 'heading' | 'paragraph' | 'list-item' | 'button';
  content: string;
  selector: string;
  bounds: { top: number; left: number; width: number; height: number };
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
  const { portfolioData, generatedPortfolio, metadata, isIncomplete, isDraft, draftHtml } = location.state || {}; 
  const [aiRequest, setAiRequest] = useState('');
  const [isProcessingAiRequest, setIsProcessingAiRequest] = useState(false);
  const originalHtml = isDraft ? draftHtml : 
    (typeof generatedPortfolio === 'string' ? generatedPortfolio : generatedPortfolio?.html || '');

  if (!portfolioData || !generatedPortfolio) {
    React.useEffect(() => {
      navigate('/');
    }, [navigate]);
    return null;
  }
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedDraft, setLastSavedDraft] = useState<string | null>(null);

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

  // Parse editable regions from HTML
  const parseEditableRegions = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return;
    
    const doc = iframeRef.current.contentDocument;
    const regions: EditableRegion[] = [];
    
    const selectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', '.bio', '.about', '.description',
      '.project-title', '.project-description',
      'button', '.btn', '.button'
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
            
            const indicator = doc.createElement('div');
            indicator.className = 'freemium-edit-indicator';
            indicator.innerHTML = '✎';
            element.appendChild(indicator);
            
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
        
        const newHtml = iframeRef.current.contentDocument.documentElement.outerHTML;
        setHtmlContent(newHtml);
        setHasChanges(true);
        
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

  const handleSaveDraft = async () => {
    if (!portfolioData?.personalInfo?.email) {
      toast({
        title: "Cannot Save Draft",
        description: "No user email found in portfolio data",
        variant: "destructive",
      });
      return;
    }
  
    setIsSavingDraft(true);
  
    try {
      const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || htmlContent;
      const cleanedHtml = cleanHtmlForExport(currentHtml);
  
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/save-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: portfolioData.personalInfo.email,
          htmlContent: cleanedHtml
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.success) {
        setLastSavedDraft(new Date().toISOString());
        toast({
          title: "Draft Saved",
          description: "Your portfolio has been saved as a draft",
        });
      } else {
        throw new Error(data.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Draft Save Error:', error);
      toast({
        variant: "destructive",
        title: "Failed to Save Draft",
        description: error.message || 'Could not save your draft',
      });
    } finally {
      setIsSavingDraft(false);
    }
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

  const cleanHtmlForExport = (html: string): string => {
    if (!html) return '';
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Remove existing editable classes (existing code)
      const editableElements = doc.querySelectorAll('.freemium-editable');
      editableElements.forEach(el => {
        el.classList.remove('freemium-editable');
      });
      
      const indicators = doc.querySelectorAll('.freemium-edit-indicator');
      indicators.forEach(el => el.remove());
      
      const styleTags = doc.querySelectorAll('style');
      styleTags.forEach(styleTag => {
        if (styleTag.textContent?.includes('freemium-editable') || 
            styleTag.textContent?.includes('edit-indicator')) {
          styleTag.remove();
        }
      });
      
      // 🚨 NEW: Fix navigation and emoji issues
      let cleanedHtml = doc.documentElement.outerHTML;
      
      // Fix problematic navigation links
      const navigationFixes = [
        { pattern: /href=["']\/dashboard["']/gi, replacement: 'href="#about"' },
        { pattern: /href=["']\/works["']/gi, replacement: 'href="#projects"' },
        { pattern: /href=["']\/projects["']/gi, replacement: 'href="#projects"' },
        { pattern: /href=["']\/portfolio["']/gi, replacement: 'href="#projects"' },
        { pattern: /href=["']\#dashboard["']/gi, replacement: 'href="#about"' },
        { pattern: /href=["']\#works["']/gi, replacement: 'href="#projects"' }
      ];
      
      navigationFixes.forEach(({ pattern, replacement }) => {
        cleanedHtml = cleanedHtml.replace(pattern, replacement);
      });
      
      // Remove floating emoji animations
      const emojiPatterns = [
        /@keyframes\s+[^{]*emoji[^}]*\{[^}]+\}/gi,
        /animation[^;]*emoji[^;]*;/gi,
        /\.floating-emoji[^}]*\{[^}]+\}/gi,
        /\.emoji-rain[^}]*\{[^}]+\}/gi,
        /<div[^>]*class="[^"]*floating[^"]*emoji[^"]*"[^>]*>.*?<\/div>/gi
      ];
      
      emojiPatterns.forEach(pattern => {
        cleanedHtml = cleanedHtml.replace(pattern, '');
      });
      
      // Remove problematic JavaScript
      cleanedHtml = cleanedHtml.replace(
        /window\.location\s*=\s*["'][^"']*["']/gi, 
        '// navigation disabled for deployment'
      );
      
      cleanedHtml = cleanedHtml.replace(
        /location\.href\s*=\s*["'][^"']*["']/gi, 
        '// navigation disabled for deployment'
      );
      
      // Ensure proper DOCTYPE
      if (!cleanedHtml.includes('<!DOCTYPE')) {
        cleanedHtml = '<!DOCTYPE html>\n' + cleanedHtml;
      }
      
      return cleanedHtml;
    } catch (error) {
      console.warn('HTML cleaning failed, using original:', error);
      return html;
    }
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
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.success) {
        setHtmlContent(data.modifiedHtml);
        setHasChanges(true);
        
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
      
      // Add tracking call here
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/track-deployment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: portfolioData.personalInfo.name,
            email: portfolioData.personalInfo.email,
            title: portfolioData.personalInfo.title,
            userAgent: navigator.userAgent,
            projectCount: portfolioData.projects.length,
            tier: 'Free' // Default to Free tier
          }),
        });
      } catch (trackingError) {
        console.warn('Tracking failed:', trackingError);
      }
  
      let netlifyToken = import.meta.env.VITE_NETLIFY_TOKEN || 
                        localStorage.getItem('netlifyToken');
  
      if (!netlifyToken) {
        netlifyToken = prompt(
          "Please enter your Netlify Personal Access Token:\n\n" +
          "1. Go to netlify.com → User Settings → Applications\n" +
          "2. Click 'New access token'\n" +
          "3. Give it a descriptive name (e.g., 'Portfolio Generator')\n" +
          "4. Set expiration (recommended: 1 year)\n" +
          "5. Copy and paste the token here"
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
  
      if (!netlifyToken.trim().match(/^[a-zA-Z0-9_-]+$/)) {
        toast({
          title: "Invalid Token Format",
          description: "The token appears to be invalid. Please check and try again.",
          variant: "destructive",
        });
        return;
      }
  
      localStorage.setItem('netlifyToken', netlifyToken.trim());
      
      toast({ 
        title: "Starting Deployment...",
        description: "Preparing your portfolio for deployment",
      });
  
      const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || htmlContent;
      const cleanedHtml = cleanHtmlForExport(currentHtml);
  
      if (!cleanedHtml || cleanedHtml.length < 100) {
        throw new Error('Invalid HTML content - portfolio appears to be empty');
      }
  
      if (!cleanedHtml.includes('<html') && !cleanedHtml.includes('<!DOCTYPE')) {
        throw new Error('Invalid HTML structure - missing HTML document structure');
      }
  
      // 🆕 Extract project IDs from portfolioData
      const projectIds = portfolioData.projects ? 
        portfolioData.projects.map(project => project.id || `project_${Math.random().toString(36).substr(2, 9)}`) : 
        [];
  
      console.log('📋 Deploying with project IDs:', projectIds);
      console.log('👤 Deploying for user:', portfolioData.personalInfo.email);
  
      const deployStartTime = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/deploy-folder-to-netlify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: cleanedHtml,
          netlifyToken: netlifyToken.trim(),
          personName: portfolioData.personalInfo.name || 'Portfolio',
          userEmail: portfolioData.personalInfo.email, // 🆕 Add user email for tracking
          projectIds: projectIds, // 🆕 Add project IDs array for tracking
          metadata: {
            generatedAt: new Date().toISOString(),
            projectCount: (portfolioData.projects || []).length,
            hasCustomizations: hasChanges
          }
        }),
      });
  
      if (!response.ok) {
        let errorMessage = `Deployment failed with status ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
          
          if (response.status === 401) {
            localStorage.removeItem('netlifyToken');
            errorMessage = 'Invalid Netlify token. Please check your token and try again.';
          } else if (response.status === 403) {
            errorMessage = 'Insufficient permissions. Your Netlify token may not have site creation permissions.';
          } else if (response.status === 429) {
            errorMessage = 'Rate limit exceeded. Please wait a few minutes before trying again.';
          } else if (response.status === 422) {
            errorMessage = 'Invalid request data. Please try regenerating your portfolio.';
          }
          
          console.error('Deployment API Error:', errorData);
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }
  
      const result = await response.json();
  
      if (!result.success) {
        throw new Error(result.error || result.details || 'Deployment failed for unknown reason');
      }
  
      if (result.success) {
        const { deployment } = result;
        const deployTime = Math.round((Date.now() - deployStartTime) / 1000);
  
        // Update tracking with the deployment URL
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/update-deployment-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: portfolioData.personalInfo.email,
              url: deployment.url
            }),
          });
        } catch (updateError) {
          console.warn('Failed to update deployment URL:', updateError);
        }
  
        navigate('/deployment', {
          state: {
            portfolioData,
            generatedPortfolio: cleanedHtml,
            metadata: {
              generatedAt: new Date().toISOString(),
              projectCount: (portfolioData.projects || []).length,
              hasCustomizations: hasChanges,
              deployTime,
              deployedAt: new Date().toISOString(),
              projectIds: projectIds, // 🆕 Pass project IDs to deployment page
            },
            deploymentUrl: deployment.url,
            platform: 'Netlify',
            isDeployed: true,
          },
        });
  
        return;
      }
  
    } catch (error) {
      console.error('Deployment error:', error);
      
      let userFriendlyMessage = 'An unexpected error occurred during deployment.';
      let suggestions = 'Please try again in a few moments.';
  
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          userFriendlyMessage = 'Network connection error during deployment.';
          suggestions = 'Please check your internet connection and try again.';
        } else if (errorMessage.includes('token') || errorMessage.includes('auth')) {
          userFriendlyMessage = 'Authentication failed with Netlify.';
          suggestions = 'Please check your Netlify token and try again.';
          localStorage.removeItem('netlifyToken');
        } else if (errorMessage.includes('rate limit')) {
          userFriendlyMessage = 'Too many deployment requests.';
          suggestions = 'Please wait a few minutes before trying again.';
        } else if (errorMessage.includes('html') || errorMessage.includes('content')) {
          userFriendlyMessage = 'Invalid portfolio content detected.';
          suggestions = 'Try regenerating your portfolio and then deploy again.';
        } else if (errorMessage.includes('permission')) {
          userFriendlyMessage = 'Insufficient permissions for deployment.';
          suggestions = 'Make sure your Netlify token has site creation permissions.';
        } else {
          userFriendlyMessage = error.message;
        }
      }
  
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: `${userFriendlyMessage} ${suggestions}`,
        duration: 10000,
      });
  
      console.group('🔍 Deployment Error Details');
      console.log('Error:', error);
      console.log('Portfolio Data:', {
        name: portfolioData.personalInfo?.name,
        email: portfolioData.personalInfo?.email,
        htmlLength: htmlContent?.length,
        hasProjects: (portfolioData.projects || []).length > 0,
        projectIds: portfolioData.projects?.map(p => p.id || 'no-id'),
        hasChanges
      });
      console.log('Environment:', {
        apiUrl: import.meta.env.VITE_API_URL,
        hasStoredToken: !!localStorage.getItem('netlifyToken')
      });
      console.groupEnd();
  
    } finally {
      setIsDeploying(false);
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
                onClick={() => navigate('/', { state: location.state })}
                className="shadow-soft"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
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
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="flex items-center"
              >
                {isSavingDraft ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
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
              {/* Pro Upgrade */}
              <Card className="shadow-medium border-0 bg-gradient-to-br from-purple-50 to-blue-50">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Unlock Pro Features</h3>
                    <p className="text-xs text-gray-600">
                      Upgrade for advanced visual editing, custom styling, and unlimited suggestions
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

              {/* AI Assistant */}
              <Card className="shadow-medium border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Sparkles className="h-5 w-5 mr-2" />
                    AI Edit Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <Textarea
                      value={aiRequest}
                      onChange={(e) => setAiRequest(e.target.value)}
                      placeholder="Describe changes you'd like to make..."
                      className="min-h-[100px]"
                      disabled={isProcessingAiRequest}
                    />
                    <Button
                      onClick={handleAiEditRequest}
                      disabled={isProcessingAiRequest || !aiRequest.trim()}
                      className="w-full"
                    >
                      {isProcessingAiRequest ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Apply AI Changes
                        </>
                      )}
                    </Button>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Lightbulb className="h-3 w-3 mr-1" />
                      Example: "Make the header smaller and use blue colors"
                    </div>
                  </div>
                </CardContent>
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
                        <p className="font-medium">Use AI Assistant</p>
                        <p className="text-muted-foreground text-xs">
                          Describe changes you want to make
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
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 mt-8 border-t border-border">
            <Button
              variant="outline"
              onClick={() => navigate('/', { state: location.state })}
            >
              <Eye className="h-4 w-4 mr-2" />
              Back to Dashboard
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
                    <p className="font-medium">AI Assistant</p>
                    <p className="text-muted-foreground text-xs">
                      Describe changes you want to make to your portfolio
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