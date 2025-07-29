// src/pages/VisualEditPage.tsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Rocket, Download, Eye, Settings } from 'lucide-react';
import { VisualEditor } from '@/components/VisualEditor/VisualEditor';
import { useToast } from '@/hooks/use-toast';
import { deployToNetlify } from '@/lib/netlifyDeploy';

const NETLIFY_TOKEN = "nfp_ubQ5p2gRqsLfiTf1vj1d1ghjXbPhsXSRea18";

const VisualEditPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
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

  const handleSave = (modifiedHtml: string) => {
    setCurrentHtml(modifiedHtml);
    setHasUnsavedChanges(false);
    
    toast({
      title: "Changes Saved",
      description: "Your modifications have been saved successfully.",
    });
  };

  const handlePreview = () => {
    if (hasUnsavedChanges) {
      toast({
        title: "Unsaved Changes",
        description: "Please save your changes before previewing.",
        variant: "destructive",
      });
      return;
    }

    // Open preview in new tab
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(currentHtml);
      previewWindow.document.close();
    }
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
      setIsDeploying(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentHtml], { type: 'text/html' });
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
      description: "Your portfolio HTML file has been downloaded.",
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

  // Handle browser refresh/close with unsaved changes
  React.useEffect(() => {
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
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
          
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Visual Editor</h1>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-gray-500">
                {portfolioData.personalInfo.name}'s Portfolio
              </p>
              {hasUnsavedChanges && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Center Section - Project Info */}
        <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Elements: {portfolioData.projects?.length || 0} projects</span>
          </div>
          {metadata && (
            <div className="text-xs">
              Generated: {new Date(metadata.generatedAt || Date.now()).toLocaleDateString()}
            </div>
          )}
        </div>
        
        {/* Right Section - Actions */}
        <div className="flex items-center space-x-2">
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

      {/* Status Bar */}
      <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-4 text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Ready to edit</span>
          {hasUnsavedChanges && (
            <span className="text-yellow-600">● Unsaved changes</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>Last saved: {hasUnsavedChanges ? 'Never' : 'Just now'}</span>
        </div>
      </div>

      {/* Visual Editor */}
      <div className="flex-1 overflow-hidden">
        <VisualEditor 
          htmlString={currentHtml}
          onSave={(html) => {
            handleSave(html);
            setHasUnsavedChanges(false);
          }}
          onChange={() => setHasUnsavedChanges(true)}
        />
      </div>

      {/* Footer - Quick Stats */}
      <div className="h-6 bg-gray-800 text-gray-300 text-xs flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <span>Visual Portfolio Editor</span>
          <span>•</span>
          <span>Ready</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>HTML: {Math.round(currentHtml.length / 1024)}KB</span>
          <span>•</span>
          <span>Claude AI Generated</span>
        </div>
      </div>
    </div>
  );
};

export default VisualEditPage;