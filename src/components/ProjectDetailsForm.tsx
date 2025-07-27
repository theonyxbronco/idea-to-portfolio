import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Plus } from 'lucide-react';

interface ProjectDetails {
  title: string;
  subtitle: string;
  overview: string;
  problem: string;
  solution: string;
  reflection: string;
  processImages: File[];
  finalProductImage: File | null;
}

const ProjectDetailsForm = () => {
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    title: '',
    subtitle: '',
    overview: '',
    problem: '',
    solution: '',
    reflection: '',
    processImages: [],
    finalProductImage: null,
  });

  const handleInputChange = (field: keyof ProjectDetails, value: string) => {
    setProjectDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProcessImageUpload = (files: FileList | null) => {
    if (files) {
      const newImages = Array.from(files);
      setProjectDetails(prev => ({
        ...prev,
        processImages: [...prev.processImages, ...newImages]
      }));
    }
  };

  const handleFinalImageUpload = (files: FileList | null) => {
    if (files && files[0]) {
      setProjectDetails(prev => ({
        ...prev,
        finalProductImage: files[0]
      }));
    }
  };

  const removeProcessImage = (index: number) => {
    setProjectDetails(prev => ({
      ...prev,
      processImages: prev.processImages.filter((_, i) => i !== index)
    }));
  };

  const handleBuild = () => {
    console.log('Building portfolio with:', projectDetails);
    // Here we'll later navigate to the preview page
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Portfolio Builder
            </h1>
            <p className="text-xl text-muted-foreground">
              Create a stunning portfolio showcase for your project
            </p>
          </div>

          {/* Form */}
          <Card className="shadow-large border-0">
            <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg">
              <CardTitle className="text-2xl font-semibold">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-medium">
                    Project Title
                  </Label>
                  <Input
                    id="title"
                    value={projectDetails.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter your project title"
                    className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle" className="text-base font-medium">
                    Project Subtitle
                  </Label>
                  <Input
                    id="subtitle"
                    value={projectDetails.subtitle}
                    onChange={(e) => handleInputChange('subtitle', e.target.value)}
                    placeholder="Brief description or tagline"
                    className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Text Areas */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="overview" className="text-base font-medium">
                    Project Overview
                  </Label>
                  <Textarea
                    id="overview"
                    value={projectDetails.overview}
                    onChange={(e) => handleInputChange('overview', e.target.value)}
                    placeholder="Provide a comprehensive overview of your project..."
                    className="min-h-[120px] text-base shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="problem" className="text-base font-medium">
                      Project Problem
                    </Label>
                    <Textarea
                      id="problem"
                      value={projectDetails.problem}
                      onChange={(e) => handleInputChange('problem', e.target.value)}
                      placeholder="What problem did this project solve?"
                      className="min-h-[100px] text-base shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="solution" className="text-base font-medium">
                      Project Solution
                    </Label>
                    <Textarea
                      id="solution"
                      value={projectDetails.solution}
                      onChange={(e) => handleInputChange('solution', e.target.value)}
                      placeholder="How did you solve the problem?"
                      className="min-h-[100px] text-base shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reflection" className="text-base font-medium">
                    Project Reflection
                  </Label>
                  <Textarea
                    id="reflection"
                    value={projectDetails.reflection}
                    onChange={(e) => handleInputChange('reflection', e.target.value)}
                    placeholder="What did you learn? What would you do differently?"
                    className="min-h-[120px] text-base shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>
              </div>

              {/* Image Uploads */}
              <div className="space-y-8">
                {/* Process Images */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Project Process Images
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {projectDetails.processImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden shadow-soft">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Process ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => removeProcessImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleProcessImageUpload(e.target.files)}
                        className="hidden"
                      />
                      <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground text-center">
                        Add Images
                      </span>
                    </label>
                  </div>
                </div>

                {/* Final Product Image */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Final Product Image
                  </Label>
                  <div className="max-w-md">
                    {projectDetails.finalProductImage ? (
                      <div className="relative group">
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-soft">
                          <img
                            src={URL.createObjectURL(projectDetails.finalProductImage)}
                            alt="Final product"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => setProjectDetails(prev => ({ ...prev, finalProductImage: null }))}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className="aspect-video border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFinalImageUpload(e.target.files)}
                          className="hidden"
                        />
                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-3" />
                        <span className="text-base text-muted-foreground text-center">
                          Upload Final Product Image
                        </span>
                        <span className="text-sm text-muted-foreground/60 text-center mt-1">
                          Click to browse files
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Build Button */}
              <div className="pt-8 border-t border-border">
                <div className="flex justify-center">
                  <Button
                    onClick={handleBuild}
                    variant="build"
                    size="lg"
                    className="px-12 py-4 text-lg"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Build Portfolio
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsForm;