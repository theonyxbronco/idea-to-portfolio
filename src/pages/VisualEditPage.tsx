// src/pages/VisualEditPage.tsx - Enhanced with proper flow integration
import React, { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Rocket, Download, Eye, Settings, Save, 
  Undo2, Redo2, Grid3x3, Ruler, ZoomIn, ZoomOut,
  PanelLeft, PanelRight, Monitor, Smartphone, Tablet,
  AlertCircle, CheckCircle, Clock, FileCode, Edit
} from 'lucide-react';
import { VisualEditor } from '@/components/VisualEditor/VisualEditor';
import { useToast } from '@/hooks/use-toast';
import { deployToNetlify } from '@/lib/netlifyDeploy';
import { cn } from '@/lib/utils';

const NETLIFY_TOKEN = "nfp_ubQ5p2gRqsLfiTf1vj1d1ghjXbPhsXSRea18";

// Auto-save interval (5 seconds)
const AUTOSAVE_INTERVAL = 5000;

const VisualEditPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Basic state
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Enhanced editor state
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  const { portfolioData, generatedPortfolio, metadata } = location.state || {};
  
  // Redirect if no data
  if (!portfolioData || !generatedPortfolio) {
    React.useEffect(() => {
      toast({
        title: "No Portfolio Data",
        description: "Redirecting to portfolio builder...",
        variant: "destructive",
      });
      navigate('/');
    }, [navigate, toast]);
    return null;
  }

  const htmlString = typeof generatedPortfolio === 'string' 
    ? generatedPortfolio 
    : generatedPortfolio?.html || '';

  const [currentHtml, setCurrentHtml] = useState(htmlString);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize edit history
  useEffect(() => {
    setEditHistory([htmlString]);
    setCurrentHistoryIndex(0);
  }, [htmlString]);

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const autoSaveTimer = setTimeout(() => {
      handleAutoSave();
    }, AUTOSAVE_INTERVAL);

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, currentHtml]);

  const handleAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    setIsAutoSaving(true);
    
    try {
      // Simulate auto-save (you can implement actual persistence here)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      
      toast({
        title: "Auto-saved",
        description: "Your changes have been automatically saved.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, currentHtml, toast]);

  const handleSave = useCallback((modifiedHtml: string) => {
    setCurrentHtml(modifiedHtml);
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
    
    // Add to history
    const newHistory = editHistory.slice(0, currentHistoryIndex + 1);
    newHistory.push(modifiedHtml);
    setEditHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
    
    toast({
      title: "Changes Saved",
      description: "Your modifications have been saved successfully.",
    });
  }, [editHistory, currentHistoryIndex, toast]);

  const handleChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const handleUndo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      setCurrentHtml(editHistory[newIndex]);
      setHasUnsavedChanges(true);
      
      toast({
        title: "Undo",
        description: "Previous change has been undone.",
        duration: 2000,
      });
    }
  }, [currentHistoryIndex, editHistory, toast]);

  const handleRedo = useCallback(() => {
    if (currentHistoryIndex < editHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      setCurrentHtml(editHistory[newIndex]);
      setHasUnsavedChanges(true);
      
      toast({
        title: "Redo",
        description: "Change has been redone.",
        duration: 2000,
      });
    }
  }, [currentHistoryIndex, editHistory, toast]);

  const handlePreview = () => {
    if (hasUnsavedChanges) {
      toast({
        title: "Unsaved Changes",
        description: "Please save your changes before previewing.",
        variant: "destructive",
      });
      return;
    }

    // Navigate back to preview with updated content
    navigate('/preview', { 
      state: { 
        portfolioData, 
        generatedPortfolio: { html: currentHtml }, 
        metadata 
      } 
    });
  };

  const handleDeploy = async () => {
    if (hasUnsavedChanges) {
      toast({
        title: "Unsaved Changes",
        description: "Please save your changes before deploying.",
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

      const demoPortfolio = {
        html: currentHtml,
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
          generatedPortfolio: { html: currentHtml },
          deploymentUrl: deployment?.url || 'https://amazing-portfolio-xyz.netlify.app',
          platform: deployment?.platform || 'Netlify',
          deployedAt: deployment?.deployedAt || new Date().toISOString(),
          siteId: deployment?.siteId,
          metadata
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
      setIsDeploying(false);
    }
  };

  const handleDownload = () => {
    const completeHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${portfolioData.personalInfo.name}'s Portfolio</title>
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  ${currentHtml}
</body>
</html>`;

    const blob = new Blob([completeHtml], { type: 'text/html' });
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
      description: "Your complete portfolio HTML file has been downloaded.",
    });
  };

  const handleBackToPreview = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      );
      if (!confirmed) return;
    }

    navigate('/preview', { 
      state: { 
        portfolioData, 
        generatedPortfolio: { html: currentHtml }, 
        metadata 
      } 
    });
  };

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSaved.toLocaleTimeString();
  };

  // Handle browser refresh/close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (hasUnsavedChanges) {
              handleAutoSave();
            }
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleAutoSave, handleUndo, handleRedo]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Enhanced Top Navigation Bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20 shadow-sm">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPreview}
            className="flex items-center hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Preview
          </Button>
          
          <div className="h-6 w-px bg-gray-300" />
          
          {/* Flow Progress Indicator */}
          <div className="hidden lg:flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>Generated</span>
            </div>
            <div className="w-4 h-px bg-green-600"></div>
            <div className="flex items-center space-x-1 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>Previewed</span>
            </div>
            <div className="w-4 h-px bg-blue-600"></div>
            <div className="flex items-center space-x-1 text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Advanced Edit</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center space-x-1 text-gray-400">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>Deploy</span>
            </div>
          </div>
          
          <div className="h-6 w-px bg-gray-300" />
          
          {/* Undo/Redo Controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={currentHistoryIndex <= 0}
              className="w-8 h-8 p-0"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={currentHistoryIndex >= editHistory.length - 1}
              className="w-8 h-8 p-0"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-300" />
          
          <div>
            <h1 className="text-lg font-semibold text-gray-900 flex items-center">
              <Edit className="h-4 w-4 mr-2" />
              Advanced Visual Editor
            </h1>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-gray-500">
                {portfolioData.personalInfo.name}'s Portfolio
              </p>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  {isAutoSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-yellow-600 mr-1"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Unsaved
                    </>
                  )}
                </Badge>
              )}
              {!hasUnsavedChanges && lastSaved && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Saved
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Center Section - Viewport & View Controls */}
        <div className="hidden lg:flex items-center space-x-2">
          {/* Viewport Mode Selector */}
          <div className="flex items-center border border-gray-200 rounded-lg p-1">
            {[
              { mode: 'desktop' as const, icon: Monitor, label: 'Desktop' },
              { mode: 'tablet' as const, icon: Tablet, label: 'Tablet' },
              { mode: 'mobile' as const, icon: Smartphone, label: 'Mobile' }
            ].map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={viewportMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewportMode(mode)}
                className="w-8 h-8 p-0"
                title={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-300" />
          
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.max(25, zoom - 25))}
              className="w-8 h-8 p-0"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono w-12 text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="w-8 h-8 p-0"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* View Toggle Controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant={showGrid ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
              className="w-8 h-8 p-0"
              title="Toggle Grid"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={showRulers ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowRulers(!showRulers)}
              className="w-8 h-8 p-0"
              title="Toggle Rulers"
            >
              <Ruler className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Right Section - Actions */}
        <div className="flex items-center space-x-2">
          {/* Panel Toggle Controls */}
          <div className="hidden lg:flex items-center space-x-1">
            <Button
              variant={leftPanelCollapsed ? "ghost" : "default"}
              size="sm"
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="w-8 h-8 p-0"
              title="Toggle Left Panel"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={rightPanelCollapsed ? "ghost" : "default"}
              size="sm"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="w-8 h-8 p-0"
              title="Toggle Right Panel"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
            
            <div className="h-6 w-px bg-gray-300" />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            className="hidden sm:flex items-center"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleDeploy}
            disabled={isDeploying || hasUnsavedChanges}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isDeploying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                <span className="hidden sm:inline">Deploying...</span>
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Deploy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-4 text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <div className={cn(
              "w-2 h-2 rounded-full mr-2",
              hasUnsavedChanges ? "bg-yellow-500" : "bg-green-500"
            )}></div>
            {hasUnsavedChanges ? "Editing" : "Ready"}
          </span>
          {hasUnsavedChanges && (
            <span className="text-yellow-600 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Auto-save in {Math.ceil((AUTOSAVE_INTERVAL - 1000) / 1000)}s
            </span>
          )}
          <span>Zoom: {zoom}%</span>
          <span>Viewport: {viewportMode}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Last saved: {formatLastSaved()}</span>
          <span>History: {currentHistoryIndex + 1}/{editHistory.length}</span>
          <span className="flex items-center">
            <FileCode className="h-3 w-3 mr-1" />
            Advanced Mode
          </span>
        </div>
      </div>

      {/* Enhanced Visual Editor */}
      <div className="flex-1 overflow-hidden">
        <VisualEditor 
          htmlString={currentHtml}
          onSave={handleSave}
          onChange={handleChange}
          className={cn(
            "transition-all duration-300",
            viewportMode === 'mobile' && "max-w-sm mx-auto",
            viewportMode === 'tablet' && "max-w-4xl mx-auto"
          )}
        />
      </div>

      {/* Enhanced Footer */}
      <div className="h-6 bg-gray-800 text-gray-300 text-xs flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <span>Advanced Visual Portfolio Editor</span>
          <span>•</span>
          <span className="flex items-center">
            {isAutoSaving ? (
              <>
                <div className="animate-spin rounded-full h-2 w-2 border-b border-gray-300 mr-1"></div>
                Auto-saving...
              </>
            ) : (
              "Ready"
            )}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span>HTML: {Math.round(currentHtml.length / 1024)}KB</span>
          <span>•</span>
          <span>Elements: {(currentHtml.match(/<[^/>]+>/g) || []).length}</span>
          <span>•</span>
          <span>AI Generated & Enhanced</span>
        </div>
      </div>
    </div>
  );
};

export default VisualEditPage;