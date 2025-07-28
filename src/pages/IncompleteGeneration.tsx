import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Download,
  Loader2,
  FileCode,
  Zap
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface IncompleteGenerationProps {
  // Props will be passed via location.state
}

const IncompleteGeneration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [isContinuing, setIsContinuing] = useState(false);
  const [continuationProgress, setContinuationProgress] = useState(0);

  // Get data from the previous generation attempt
  const { 
    portfolioData, 
    partialHtml, 
    completionStatus,
    metadata,
    error 
  } = location.state || {};

  if (!portfolioData || !partialHtml) {
    React.useEffect(() => {
      navigate('/');
    }, [navigate]);
    return null;
  }

  // Analyze the completion status
  const getCompletionAnalysis = () => {
    const htmlLength = partialHtml.length;
    const hasClosingBody = partialHtml.includes('</body>');
    const hasClosingHtml = partialHtml.includes('</html>');
    const openTags = (partialHtml.match(/</g) || []).length;
    const closeTags = (partialHtml.match(/>/g) || []).length;
    
    let estimatedCompletion = 0;
    let issues = [];

    // Estimate completion percentage
    if (hasClosingHtml && hasClosingBody) {
      estimatedCompletion = 90;
    } else if (hasClosingBody) {
      estimatedCompletion = 70;
    } else if (htmlLength > 1000) {
      estimatedCompletion = 50;
    } else {
      estimatedCompletion = 25;
    }

    // Identify specific issues
    if (!hasClosingHtml) issues.push('Missing closing </html> tag');
    if (!hasClosingBody) issues.push('Missing closing </body> tag');
    if (openTags !== closeTags) issues.push('Unmatched HTML tags detected');
    if (!partialHtml.includes('<style') && !partialHtml.includes('<link')) {
      issues.push('No CSS styling detected');
    }

    return { estimatedCompletion, issues };
  };

  const { estimatedCompletion, issues } = getCompletionAnalysis();

const handleContinueGeneration = async () => {
  setIsContinuing(true);
  setContinuationProgress(0);

  try {
    // Progress simulation
    const progressInterval = setInterval(() => {
      setContinuationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    toast({
      title: "Continuing generation...",
      description: "AI is completing your portfolio",
    });

    // Call API to continue generation
    const formData = new FormData();
    
    // Add the original portfolio data
    formData.append('portfolioData', JSON.stringify(portfolioData));
    
    // Add the partial HTML for context
    formData.append('partialHtml', partialHtml);
    formData.append('continueGeneration', 'true');

    // FIXED: Re-add all the original images with correct field names
    // Add moodboard images
    if (portfolioData.moodboardImages && portfolioData.moodboardImages.length > 0) {
      portfolioData.moodboardImages.forEach((image: File, index: number) => {
        formData.append(`moodboard_image_${index}`, image, image.name);
      });
    }

    // Add project images
    if (portfolioData.projects) {
      portfolioData.projects.forEach((project: any, projectIndex: number) => {
        // Process images
        if (project.processImages && project.processImages.length > 0) {
          project.processImages.forEach((image: File, imageIndex: number) => {
            formData.append(`process_project_${projectIndex}_${imageIndex}`, image, image.name);
          });
        }
        
        // Final product image
        if (project.finalProductImage) {
          formData.append(`final_project_${projectIndex}`, project.finalProductImage, project.finalProductImage.name);
        }
      });
    }

    console.log('Continuing generation with images:');
    let imageCount = 0;
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
        imageCount++;
      }
    }
    console.log(`Total images being sent: ${imageCount}`);

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/generate-portfolio`, {
      method: 'POST',
      body: formData,
    });

    clearInterval(progressInterval);
    setContinuationProgress(100);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.portfolio) {
      toast({
        title: "Generation completed!",
        description: "Your portfolio has been successfully completed.",
      });

      // Navigate to preview with the completed portfolio
      navigate('/preview', { 
        state: { 
          portfolioData,
          generatedPortfolio: result.portfolio,
          metadata: result.metadata
        }
      });
    } else {
      throw new Error(result.error || 'Failed to complete portfolio generation');
    }

  } catch (error) {
    console.error('Continuation failed:', error);
    
    toast({
      title: "Continuation Failed",
      description: error instanceof Error ? error.message : "Failed to complete generation",
      variant: "destructive",
    });
  } finally {
    setIsContinuing(false);
    setContinuationProgress(0);
  }
};

  const handleAbandonProject = () => {
    toast({
      title: "Project abandoned",
      description: "Starting fresh with a new portfolio",
    });
    navigate('/');
  };

  const handlePreviewPartial = () => {
    // Navigate to preview but with a warning about incomplete content
    navigate('/preview', { 
      state: { 
        portfolioData,
        generatedPortfolio: { html: partialHtml },
        metadata: { ...metadata, incomplete: true },
        isIncomplete: true
      }
    });
  };

  const handleDownloadPartial = () => {
    const blob = new Blob([partialHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioData.personalInfo.name.replace(/\s+/g, '_')}_partial_portfolio.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Partial portfolio downloaded",
      description: "Note: This is incomplete and may have broken HTML",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center shadow-large">
                <AlertTriangle className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Generation Incomplete
            </h1>
            <p className="text-xl text-muted-foreground">
              Your portfolio generation was cut off. What would you like to do?
            </p>
          </div>

          {/* Status Analysis */}
          <Card className="shadow-large border-0 mb-8">
            <CardHeader className="bg-gradient-accent text-accent-foreground">
              <CardTitle className="text-2xl font-semibold flex items-center">
                <FileCode className="h-6 w-6 mr-3" />
                Generation Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {/* Completion Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Estimated Completion</span>
                  <Badge variant={estimatedCompletion > 70 ? "default" : "destructive"}>
                    {estimatedCompletion}%
                  </Badge>
                </div>
                <Progress value={estimatedCompletion} className="h-2" />
              </div>

              {/* Issues Detected */}
              <div>
                <h3 className="font-semibold mb-3">Issues Detected:</h3>
                <div className="space-y-2">
                  {issues.length > 0 ? (
                    issues.map((issue, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>{issue}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Eye className="h-4 w-4" />
                      <span>No major structural issues detected</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Summary */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Content Length</p>
                  <p className="font-medium">{partialHtml.length.toLocaleString()} characters</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Has CSS Styling</p>
                  <p className="font-medium">
                    {partialHtml.includes('<style') || partialHtml.includes('<link') ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue Generation Progress */}
          {isContinuing && (
            <Card className="shadow-medium border-0 mb-8">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Continuing generation...</span>
                    <span className="text-sm text-muted-foreground">{Math.round(continuationProgress)}%</span>
                  </div>
                  <Progress value={continuationProgress} className="h-2" />
                  <div className="text-xs text-muted-foreground text-center">
                    {continuationProgress < 30 && "Analyzing incomplete content..."}
                    {continuationProgress >= 30 && continuationProgress < 60 && "Generating missing sections..."}
                    {continuationProgress >= 60 && continuationProgress < 90 && "Finalizing HTML structure..."}
                    {continuationProgress >= 90 && "Almost complete..."}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Continue Generation */}
            <Card className="shadow-medium border-0 hover:shadow-large transition-shadow">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Continue Generation</h3>
                  <p className="text-muted-foreground">
                    Let AI complete your portfolio from where it left off
                  </p>
                  <Button
                    onClick={handleContinueGeneration}
                    variant="build"
                    className="w-full"
                    disabled={isContinuing}
                  >
                    {isContinuing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Continuing...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Continue Generation
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Start Over */}
            <Card className="shadow-medium border-0 hover:shadow-large transition-shadow">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Start Over</h3>
                  <p className="text-muted-foreground">
                    Abandon this attempt and create a fresh portfolio
                  </p>
                  <Button
                    onClick={handleAbandonProject}
                    variant="outline"
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Abandon & Start Fresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alternative Actions */}
          <Card className="shadow-medium border-0">
            <CardHeader>
              <CardTitle className="text-lg">Alternative Options</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handlePreviewPartial}
                  variant="outline"
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview As-Is
                </Button>
                <Button
                  onClick={handleDownloadPartial}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Partial
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Warning: Partial content may have broken HTML or missing sections
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IncompleteGeneration;