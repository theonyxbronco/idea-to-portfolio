import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Plus, X, Loader2, Save, Edit, Trash2, ImageIcon, Upload, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/clerk-react';
import { API_BASE_URL } from '@/services/api';

interface Project {
  id?: string;
  title: string;
  subtitle: string;
  overview: string; // Changed from description to overview
  category: string;
  customCategory: string;
  tags: string[];
  processImages: File[];
  finalProductImage: File | null;
  createdAt?: string;
  updatedAt?: string;
}

const CREATIVE_CATEGORIES = [
  'Graphic Design',
  'Photography',
  'Web Design',
  'Branding',
  'Illustration',
  'UI/UX Design',
  'Print Design',
  'Digital Art',
  'Motion Graphics',
  'Product Design',
  'Fashion Design',
  'Interior Design',
  'Other'
];

const COMMON_TAGS = [
  'Logo Design', 'Business Cards', 'Posters', 'Packaging', 'Typography',
  'Portrait', 'Landscape', 'Street Photography', 'Product Photography', 'Event Photography',
  'Minimalist', 'Modern', 'Vintage', 'Abstract', 'Corporate', 'Artistic',
  'Adobe Photoshop', 'Adobe Illustrator', 'Figma', 'Sketch', 'InDesign',
  'Editorial', 'Marketing', 'Social Media', 'Campaign', 'Identity'
];

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoaded, isSignedIn } = useUser();
  
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [newTag, setNewTag] = useState('');
  const [currentProjects, setCurrentProjects] = useState<Project[]>([{
    title: '',
    subtitle: '',
    overview: '', // Changed from description to overview
    category: '',
    customCategory: '',
    tags: [],
    processImages: [],
    finalProductImage: null
  }]);
  
  const [isSaving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Load user's projects when component mounts
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.primaryEmailAddress?.emailAddress) {
      loadUserProjects();
    }
  }, [isLoaded, isSignedIn, user]);

  const loadUserProjects = async () => {
    try {
      setIsLoading(true);
      const userEmail = user?.primaryEmailAddress?.emailAddress;
      
      if (!userEmail) {
        toast({
          title: "Error",
          description: "Could not retrieve user email",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/get-user-projects?email=${encodeURIComponent(userEmail)}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSavedProjects(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewProject = () => {
    setCurrentProjects(prev => [...prev, {
      title: '',
      subtitle: '',
      overview: '',
      category: '',
      customCategory: '',
      tags: [],
      processImages: [],
      finalProductImage: null
    }]);
  };

  const removeProject = (index: number) => {
    if (currentProjects.length > 1) {
      setCurrentProjects(prev => prev.filter((_, i) => i !== index));
    }
  };

  const duplicateProject = (index: number) => {
    const projectToDuplicate = currentProjects[index];
    const duplicatedProject = {
      ...projectToDuplicate,
      title: `${projectToDuplicate.title} (Copy)`,
      id: undefined // Remove ID so it's treated as new
    };
    setCurrentProjects(prev => [...prev, duplicatedProject]);
  };

  const updateProject = (index: number, field: keyof Project, value: string | File[] | File | null | string[]) => {
    setCurrentProjects(prev => 
      prev.map((project, i) => 
        i === index ? { ...project, [field]: value } : project
      )
    );
  };

  const addTag = (projectIndex: number, tag: string) => {
    if (tag.trim() && !currentProjects[projectIndex].tags.includes(tag.trim())) {
      updateProject(projectIndex, 'tags', [...currentProjects[projectIndex].tags, tag.trim()]);
    }
  };

  const removeTag = (projectIndex: number, tagToRemove: string) => {
    updateProject(projectIndex, 'tags', currentProjects[projectIndex].tags.filter(tag => tag !== tagToRemove));
  };

  const handleProcessImageUpload = (projectIndex: number, files: FileList | null) => {
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
          toast({
            title: "Invalid File Type",
            description: `${file.name} is not a valid image format`,
            variant: "destructive",
          });
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 5MB`,
            variant: "destructive",
          });
          return false;
        }
        return true;
      });

      updateProject(projectIndex, 'processImages', [...currentProjects[projectIndex].processImages, ...validFiles]);
    }
  };

  const handleFinalImageUpload = (projectIndex: number, files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a valid image format",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      updateProject(projectIndex, 'finalProductImage', file);
    }
  };

  const removeProcessImage = (projectIndex: number, imageIndex: number) => {
    updateProject(projectIndex, 'processImages', 
      currentProjects[projectIndex].processImages.filter((_, i) => i !== imageIndex)
    );
  };

  const handleSaveAllProjects = async () => {
    // Validation
    const validProjects = currentProjects.filter(project => 
      project.title.trim() && (project.category || project.customCategory)
    );

    if (validProjects.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one project with title and category",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      
      // Add all projects data
      const projectsData = validProjects.map(project => ({
        ...project,
        processImages: [], // Remove file objects for JSON
        finalProductImage: null,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        overview: project.overview 
      }));
      
      formData.append('projectsData', JSON.stringify(projectsData));

      // Add all images with project index prefix
      validProjects.forEach((project, projectIndex) => {
        project.processImages.forEach((image, imageIndex) => {
          formData.append(`project_${projectIndex}_process_${imageIndex}`, image);
        });
        
        if (project.finalProductImage) {
          formData.append(`project_${projectIndex}_final`, project.finalProductImage);
        }
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/save-multiple-projects`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Projects Saved!",
          description: `Successfully saved ${validProjects.length} project${validProjects.length > 1 ? 's' : ''}`,
        });
        
        // Reset form to single empty project
        setCurrentProjects([{
          title: '',
          subtitle: '',
          overview: '',
          category: '',
          customCategory: '',
          tags: [],
          processImages: [],
          finalProductImage: null
        }]);
        
        // Reload saved projects
        await loadUserProjects();
      } else {
        throw new Error(result.error || 'Failed to save projects');
      }
    } catch (error) {
      console.error('Error saving projects:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save projects",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!projectId) return;
    
    setIsDeleting(projectId);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/delete-project`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          userEmail: user?.primaryEmailAddress?.emailAddress
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Project Deleted",
          description: "Your project has been deleted successfully",
        });
        
        await loadUserProjects();
      } else {
        throw new Error(result.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Auth checking
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    navigate('/sign-in');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Your Projects
            </h1>
            <p className="text-xl text-muted-foreground">
              Add multiple projects at once to showcase your creative work
            </p>
          </div>

          {/* Saved Projects List */}
          {savedProjects.length > 0 && (
            <Card className="shadow-large border-0 mb-8">
              <CardHeader className="bg-gradient-secondary text-secondary-foreground rounded-t-lg">
                <CardTitle className="text-xl font-semibold flex items-center">
                  <FolderOpen className="h-5 w-5 mr-3" />
                  Your Saved Projects ({savedProjects.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedProjects.map((project) => (
                    <Card key={project.id} className="border border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2 truncate">{project.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 truncate">{project.subtitle}</p>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.overview}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          <Badge variant="outline" className="text-xs">{project.category || project.customCategory}</Badge>
                          {project.tags.slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                          {project.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">+{project.tags.length - 2}</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProject(project.id!)}
                            disabled={isDeleting === project.id}
                            className="text-xs"
                          >
                            {isDeleting === project.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Multiple Projects Form */}
          <div className="space-y-6">
            {currentProjects.map((project, projectIndex) => (
              <Card key={projectIndex} className="shadow-large border-0">
                <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold flex items-center">
                      <FolderOpen className="h-5 w-5 mr-3" />
                      Project {projectIndex + 1}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => duplicateProject(projectIndex)}
                        variant="secondary"
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Duplicate
                      </Button>
                      {currentProjects.length > 1 && (
                        <Button 
                          onClick={() => removeProject(projectIndex)}
                          variant="destructive"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Basic Project Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project Title *</Label>
                      <Input
                        value={project.title}
                        onChange={(e) => updateProject(projectIndex, 'title', e.target.value)}
                        placeholder="Enter project title"
                        className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Project Subtitle</Label>
                      <Input
                        value={project.subtitle}
                        onChange={(e) => updateProject(projectIndex, 'subtitle', e.target.value)}
                        placeholder="Brief description or tagline"
                        className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <select
                        value={project.category}
                        onChange={(e) => updateProject(projectIndex, 'category', e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background shadow-soft focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Select a category</option>
                        {CREATIVE_CATEGORIES.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    {project.category === 'Other' && (
                      <div className="space-y-2">
                        <Label>Custom Category *</Label>
                        <Input
                          value={project.customCategory}
                          onChange={(e) => updateProject(projectIndex, 'customCategory', e.target.value)}
                          placeholder="Enter custom category"
                          className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                        />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Project Description</Label>
                    <Textarea
                      value={project.overview}
                      onChange={(e) => updateProject(projectIndex, 'overview', e.target.value)}
                      placeholder="Describe your project, process, and results..."
                      className="min-h-[100px] shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-3">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {project.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="secondary" className="px-2 py-1">
                          {tag}
                          <button
                            onClick={() => removeTag(projectIndex, tag)}
                            className="ml-2 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Custom Tag Input */}
                    <div className="flex gap-2 mb-3">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add custom tag..."
                        className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newTag.trim()) {
                              addTag(projectIndex, newTag.trim());
                              setNewTag('');
                            }
                          }
                        }}
                      />
                      <Button 
                        onClick={() => {
                          if (newTag.trim()) {
                            addTag(projectIndex, newTag.trim());
                            setNewTag('');
                          }
                        }} 
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {COMMON_TAGS.filter(tag => !project.tags.includes(tag)).slice(0, 8).map(tag => (
                        <Button
                          key={tag}
                          variant="outline"
                          size="sm"
                          onClick={() => addTag(projectIndex, tag)}
                          className="text-xs h-7"
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Images - Larger Layout (80% increase) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Process Images */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Process Images</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {project.processImages.slice(0, 3).map((image, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-muted rounded-md overflow-hidden w-24 h-24">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`Process ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              onClick={() => removeProcessImage(projectIndex, index)}
                              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {project.processImages.length > 3 && (
                          <div className="aspect-square bg-muted/50 rounded-md flex items-center justify-center w-24 h-24">
                            <span className="text-sm text-muted-foreground">+{project.processImages.length - 3}</span>
                          </div>
                        )}
                        <label className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center cursor-pointer hover:border-accent transition-colors w-24 h-24">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleProcessImageUpload(projectIndex, e.target.files)}
                            className="hidden"
                          />
                          <Plus className="h-6 w-6 text-muted-foreground" />
                        </label>
                      </div>
                    </div>

                    {/* Final Image */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Final Result</Label>
                      <div className="max-w-none">
                        {project.finalProductImage ? (
                          <div className="relative group">
                            <div className="aspect-square bg-muted rounded-md overflow-hidden w-24 h-24">
                              <img
                                src={URL.createObjectURL(project.finalProductImage)}
                                alt="Final result"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              onClick={() => updateProject(projectIndex, 'finalProductImage', null)}
                              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors w-24 h-24">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFinalImageUpload(projectIndex, e.target.files)}
                              className="hidden"
                            />
                            <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground text-center">
                              Upload
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Project Button */}
            <div className="text-center">
              <Button
                onClick={addNewProject}
                variant="outline"
                className="px-8"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Project
              </Button>
            </div>

            {/* Save All Projects Button */}
            <div className="pt-6 border-t border-border text-center">
              <Button
                onClick={handleSaveAllProjects}
                variant="build"
                size="lg"
                className="px-12 py-4 text-lg"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving Projects...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save All Projects ({currentProjects.filter(p => p.title.trim()).length})
                  </>
                )}
              </Button>

                        {/* Navigation */}
          <div className="flex justify-between items-center mb-8">
            <Button
              variant="outline"
              onClick={() => navigate('/user')}
              className="text-sm"
            >
              ← Back to Personal Info
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/portfolio-builder')}
              className="text-sm"
            >
              Continue to Portfolio Builder →
            </Button>
          </div>
          
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;