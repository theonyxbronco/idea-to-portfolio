import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Code, Smartphone, Monitor, Tablet, ExternalLink, Rocket } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const Preview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  
  // In a real app, this would come from the previous page's state or API
  const projectData = location.state?.projectData || {
    title: 'Sample Project',
    subtitle: 'A beautiful portfolio showcase'
  };

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
          projectData,
          deploymentUrl: 'https://amazing-portfolio-xyz.netlify.app',
          platform: 'Netlify',
          deployedAt: new Date().toISOString()
        }
      });
    }, 2000);
  };

  const handleBackToEdit = () => {
    navigate('/', { state: { projectData } });
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
                  Portfolio Preview
                </h1>
                <p className="text-muted-foreground">
                  Review your generated portfolio before deployment
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Eye className="h-4 w-4 mr-2" />
              Preview Mode
            </Badge>
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
                      Project Details
                    </label>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Title</p>
                        <p className="text-sm font-medium">{projectData.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Subtitle</p>
                        <p className="text-sm">{projectData.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-6 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Code className="h-4 w-4 mr-2" />
                      View Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
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
                  <CardTitle className="text-xl">Generated Portfolio</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  {/* Preview Container */}
                  <div className="flex justify-center">
                    <div className={`${getViewportClasses()} transition-all duration-300 bg-white rounded-lg shadow-medium overflow-hidden border border-border`}>
                      {/* Simulated Portfolio Content */}
                      <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
                        {/* Mock Navigation */}
                        <div className="bg-white border-b border-gray-200 px-6 py-4">
                          <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                              {projectData.title}
                            </h2>
                            <div className="flex space-x-4 text-sm text-gray-600">
                              <span>Home</span>
                              <span>About</span>
                              <span>Projects</span>
                              <span>Contact</span>
                            </div>
                          </div>
                        </div>

                        {/* Mock Hero Section */}
                        <div className="flex-1 flex items-center justify-center p-8">
                          <div className="text-center space-y-4">
                            <div className="w-32 h-32 bg-gradient-primary rounded-full mx-auto flex items-center justify-center">
                              <div className="w-16 h-16 bg-white/20 rounded-full"></div>
                            </div>
                            <h1 className="text-4xl font-bold text-gray-900">
                              {projectData.title}
                            </h1>
                            <p className="text-xl text-gray-600 max-w-md">
                              {projectData.subtitle}
                            </p>
                            <div className="flex justify-center space-x-4 pt-4">
                              <div className="bg-blue-600 text-white px-6 py-2 rounded-lg">
                                View Project
                              </div>
                              <div className="border border-gray-300 px-6 py-2 rounded-lg">
                                Contact Me
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mock Footer */}
                        <div className="bg-gray-900 text-white text-center py-6 text-sm">
                          © 2024 {projectData.title}. Built with Portfolio Builder.
                        </div>
                      </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;