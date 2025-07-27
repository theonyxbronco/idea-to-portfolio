import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Image as ImageIcon, Plus, X, User, Palette, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PersonalInfo {
  name: string;
  title: string;
  bio: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  instagram: string;
  behance: string;
  dribbble: string;
  skills: string[];
  experience: string;
  education: string;
}

interface Project {
  title: string;
  subtitle: string;
  overview: string;
  category: string;
  customCategory: string;
  tags: string[];
  problem: string;
  solution: string;
  reflection: string;
  processImages: File[];
  finalProductImage: File | null;
}

interface PortfolioData {
  personalInfo: PersonalInfo;
  projects: Project[];
  moodboardImages: File[];
  stylePreferences: {
    colorScheme: string;
    layoutStyle: string;
    typography: string;
    mood: string;
  };
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

const ProjectDetailsForm = () => {
  const navigate = useNavigate();
  
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    personalInfo: {
      name: '',
      title: '',
      bio: '',
      email: '',
      phone: '',
      website: '',
      linkedin: '',
      instagram: '',
      behance: '',
      dribbble: '',
      skills: [],
      experience: '',
      education: ''
    },
    projects: [{
      title: '',
      subtitle: '',
      overview: '',
      category: '',
      customCategory: '',
      tags: [],
      problem: '',
      solution: '',
      reflection: '',
      processImages: [],
      finalProductImage: null
    }],
    moodboardImages: [],
    stylePreferences: {
      colorScheme: '',
      layoutStyle: '',
      typography: '',
      mood: ''
    }
  });

  const [newSkill, setNewSkill] = useState('');
  const [newTag, setNewTag] = useState('');
  const [currentProject, setCurrentProject] = useState(0);

  // Personal Info Handlers
  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPortfolioData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !portfolioData.personalInfo.skills.includes(newSkill.trim())) {
      setPortfolioData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          skills: [...prev.personalInfo.skills, newSkill.trim()]
        }
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setPortfolioData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        skills: prev.personalInfo.skills.filter(skill => skill !== skillToRemove)
      }
    }));
  };

  // Project Handlers
  const handleProjectChange = (field: keyof Project, value: string, projectIndex: number = currentProject) => {
    setPortfolioData(prev => ({
      ...prev,
      projects: prev.projects.map((project, index) => 
        index === projectIndex ? { ...project, [field]: value } : project
      )
    }));
  };

  const addProject = () => {
    const newProject: Project = {
      title: '',
      subtitle: '',
      overview: '',
      category: '',
      customCategory: '',
      tags: [],
      problem: '',
      solution: '',
      reflection: '',
      processImages: [],
      finalProductImage: null
    };
    
    setPortfolioData(prev => ({
      ...prev,
      projects: [...prev.projects, newProject]
    }));
    setCurrentProject(portfolioData.projects.length);
  };

  const removeProject = (projectIndex: number) => {
    if (portfolioData.projects.length > 1) {
      setPortfolioData(prev => ({
        ...prev,
        projects: prev.projects.filter((_, index) => index !== projectIndex)
      }));
      if (currentProject >= projectIndex && currentProject > 0) {
        setCurrentProject(currentProject - 1);
      }
    }
  };

  // Tag Management
  const addTag = () => {
    if (newTag.trim() && !portfolioData.projects[currentProject].tags.includes(newTag.trim())) {
      setPortfolioData(prev => ({
        ...prev,
        projects: prev.projects.map((project, index) => 
          index === currentProject 
            ? { ...project, tags: [...project.tags, newTag.trim()] }
            : project
        )
      }));
      setNewTag('');
    }
  };

  const addPresetTag = (tag: string) => {
    if (!portfolioData.projects[currentProject].tags.includes(tag)) {
      setPortfolioData(prev => ({
        ...prev,
        projects: prev.projects.map((project, index) => 
          index === currentProject 
            ? { ...project, tags: [...project.tags, tag] }
            : project
        )
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setPortfolioData(prev => ({
      ...prev,
      projects: prev.projects.map((project, index) => 
        index === currentProject 
          ? { ...project, tags: project.tags.filter(tag => tag !== tagToRemove) }
          : project
      )
    }));
  };

  // Image Handlers
  const handleProcessImageUpload = (files: FileList | null) => {
    if (files) {
      const newImages = Array.from(files);
      setPortfolioData(prev => ({
        ...prev,
        projects: prev.projects.map((project, index) => 
          index === currentProject 
            ? { ...project, processImages: [...project.processImages, ...newImages] }
            : project
        )
      }));
    }
  };

  const handleFinalImageUpload = (files: FileList | null) => {
    if (files && files[0]) {
      setPortfolioData(prev => ({
        ...prev,
        projects: prev.projects.map((project, index) => 
          index === currentProject 
            ? { ...project, finalProductImage: files[0] }
            : project
        )
      }));
    }
  };

  const removeProcessImage = (imageIndex: number) => {
    setPortfolioData(prev => ({
      ...prev,
      projects: prev.projects.map((project, index) => 
        index === currentProject 
          ? { ...project, processImages: project.processImages.filter((_, i) => i !== imageIndex) }
          : project
      )
    }));
  };

  // Moodboard Handlers
  const handleMoodboardUpload = (files: FileList | null) => {
    if (files) {
      const newImages = Array.from(files);
      setPortfolioData(prev => ({
        ...prev,
        moodboardImages: [...prev.moodboardImages, ...newImages]
      }));
    }
  };

  const removeMoodboardImage = (imageIndex: number) => {
    setPortfolioData(prev => ({
      ...prev,
      moodboardImages: prev.moodboardImages.filter((_, i) => i !== imageIndex)
    }));
  };

  // Style Preferences
  const handleStylePreferenceChange = (field: keyof typeof portfolioData.stylePreferences, value: string) => {
    setPortfolioData(prev => ({
      ...prev,
      stylePreferences: {
        ...prev.stylePreferences,
        [field]: value
      }
    }));
  };

  const handleBuild = () => {
    console.log('Building portfolio with:', portfolioData);
    navigate('/preview', { state: { portfolioData } });
  };

  const currentProjectData = portfolioData.projects[currentProject];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Creative Portfolio Builder
            </h1>
            <p className="text-xl text-muted-foreground">
              Showcase your creative work with a stunning AI-generated portfolio
            </p>
          </div>

          <div className="space-y-8">
            {/* Personal Information Section */}
            <Card className="shadow-large border-0">
              <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg">
                <CardTitle className="text-2xl font-semibold flex items-center">
                  <User className="h-6 w-6 mr-3" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={portfolioData.personalInfo.name}
                      onChange={(e) => handlePersonalInfoChange('name', e.target.value)}
                      placeholder="Your full name"
                      className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Professional Title *</Label>
                    <Input
                      id="title"
                      value={portfolioData.personalInfo.title}
                      onChange={(e) => handlePersonalInfoChange('title', e.target.value)}
                      placeholder="e.g., Graphic Designer, Photographer"
                      className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio / About Me</Label>
                  <Textarea
                    id="bio"
                    value={portfolioData.personalInfo.bio}
                    onChange={(e) => handlePersonalInfoChange('bio', e.target.value)}
                    placeholder="Tell us about yourself, your creative journey, and what drives your work..."
                    className="min-h-[120px] text-base shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={portfolioData.personalInfo.email}
                      onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                      placeholder="your@email.com"
                      className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={portfolioData.personalInfo.phone}
                      onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Social Links */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Social & Portfolio Links</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-sm">Website</Label>
                      <Input
                        id="website"
                        value={portfolioData.personalInfo.website}
                        onChange={(e) => handlePersonalInfoChange('website', e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin" className="text-sm">LinkedIn</Label>
                      <Input
                        id="linkedin"
                        value={portfolioData.personalInfo.linkedin}
                        onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                        placeholder="linkedin.com/in/yourname"
                        className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="text-sm">Instagram</Label>
                      <Input
                        id="instagram"
                        value={portfolioData.personalInfo.instagram}
                        onChange={(e) => handlePersonalInfoChange('instagram', e.target.value)}
                        placeholder="@yourusername"
                        className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="behance" className="text-sm">Behance</Label>
                      <Input
                        id="behance"
                        value={portfolioData.personalInfo.behance}
                        onChange={(e) => handlePersonalInfoChange('behance', e.target.value)}
                        placeholder="behance.net/yourname"
                        className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Skills & Expertise</Label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {portfolioData.personalInfo.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {skill}
                        <button
                          onClick={() => removeSkill(skill)}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill..."
                      className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    />
                    <Button onClick={addSkill} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Experience & Education */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience</Label>
                    <Textarea
                      id="experience"
                      value={portfolioData.personalInfo.experience}
                      onChange={(e) => handlePersonalInfoChange('experience', e.target.value)}
                      placeholder="Brief overview of your professional experience..."
                      className="min-h-[100px] shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="education">Education</Label>
                    <Textarea
                      id="education"
                      value={portfolioData.personalInfo.education}
                      onChange={(e) => handlePersonalInfoChange('education', e.target.value)}
                      placeholder="Your educational background..."
                      className="min-h-[100px] shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Projects Section */}
            <Card className="shadow-large border-0">
              <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg">
                <CardTitle className="text-2xl font-semibold flex items-center justify-between">
                  <span className="flex items-center">
                    <FolderOpen className="h-6 w-6 mr-3" />
                    Projects ({portfolioData.projects.length})
                  </span>
                  <Button 
                    onClick={addProject}
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {/* Project Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
                  {portfolioData.projects.map((project, index) => (
                    <div key={index} className="flex items-center">
                      <Button
                        variant={currentProject === index ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentProject(index)}
                        className="mr-1"
                      >
                        Project {index + 1}
                        {project.title && `: ${project.title.substring(0, 15)}${project.title.length > 15 ? '...' : ''}`}
                      </Button>
                      {portfolioData.projects.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProject(index)}
                          className="text-destructive hover:text-destructive w-8 h-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-8">
                  {/* Basic Project Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="projectTitle">Project Title *</Label>
                      <Input
                        id="projectTitle"
                        value={currentProjectData.title}
                        onChange={(e) => handleProjectChange('title', e.target.value)}
                        placeholder="Enter project title"
                        className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projectSubtitle">Project Subtitle</Label>
                      <Input
                        id="projectSubtitle"
                        value={currentProjectData.subtitle}
                        onChange={(e) => handleProjectChange('subtitle', e.target.value)}
                        placeholder="Brief description or tagline"
                        className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      value={currentProjectData.category}
                      onChange={(e) => handleProjectChange('category', e.target.value)}
                      className="w-full h-12 px-3 rounded-md border border-input bg-background text-base shadow-soft focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">Select a category</option>
                      {CREATIVE_CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Category Input - Show when "Other" is selected */}
                  {currentProjectData.category === 'Other' && (
                    <div className="space-y-2">
                      <Label htmlFor="customCategory">Custom Category *</Label>
                      <Input
                        id="customCategory"
                        value={currentProjectData.customCategory}
                        onChange={(e) => handleProjectChange('customCategory', e.target.value)}
                        placeholder="Enter your custom category"
                        className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  )}

                  {/* Tags */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {currentProjectData.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1">
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Custom Tag Input */}
                    <div className="flex gap-2 mb-4">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add custom tag..."
                        className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <Button onClick={addTag} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Preset Tags */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Quick Add Tags:</Label>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_TAGS.filter(tag => !currentProjectData.tags.includes(tag)).slice(0, 12).map(tag => (
                          <Button
                            key={tag}
                            variant="outline"
                            size="sm"
                            onClick={() => addPresetTag(tag)}
                            className="text-xs h-8"
                          >
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="overview">Project Overview</Label>
                      <Textarea
                        id="overview"
                        value={currentProjectData.overview}
                        onChange={(e) => handleProjectChange('overview', e.target.value)}
                        placeholder="Provide a comprehensive overview of your project..."
                        className="min-h-[120px] text-base shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="problem">Challenge / Problem</Label>
                        <Textarea
                          id="problem"
                          value={currentProjectData.problem}
                          onChange={(e) => handleProjectChange('problem', e.target.value)}
                          placeholder="What challenge did this project address?"
                          className="min-h-[100px] text-base shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="solution">Solution / Approach</Label>
                        <Textarea
                          id="solution"
                          value={currentProjectData.solution}
                          onChange={(e) => handleProjectChange('solution', e.target.value)}
                          placeholder="How did you approach and solve it?"
                          className="min-h-[100px] text-base shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reflection">Reflection / Results</Label>
                      <Textarea
                        id="reflection"
                        value={currentProjectData.reflection}
                        onChange={(e) => handleProjectChange('reflection', e.target.value)}
                        placeholder="What did you learn? What were the results?"
                        className="min-h-[120px] text-base shadow-soft border-0 focus:ring-2 focus:ring-accent resize-none"
                      />
                    </div>
                  </div>

                  {/* Project Images */}
                  <div className="space-y-8">
                    {/* Process Images */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Process Images</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {currentProjectData.processImages.map((image, index) => (
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
                      <Label className="text-base font-medium">Final Result Image</Label>
                      <div className="max-w-md">
                        {currentProjectData.finalProductImage ? (
                          <div className="relative group">
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-soft">
                              <img
                                src={URL.createObjectURL(currentProjectData.finalProductImage)}
                                alt="Final product"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              onClick={() => handleProjectChange('finalProductImage', null as any)}
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
                              Upload Final Result Image
                            </span>
                            <span className="text-sm text-muted-foreground/60 text-center mt-1">
                              Click to browse files
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Moodboard & Style Preferences */}
            <Card className="shadow-large border-0">
              <CardHeader className="bg-gradient-accent text-accent-foreground rounded-t-lg">
                <CardTitle className="text-2xl font-semibold flex items-center">
                  <Palette className="h-6 w-6 mr-3" />
                  Moodboard & Style Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Moodboard Upload */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Visual Inspiration (Moodboard)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Upload images that represent the style, mood, and aesthetic you want for your portfolio
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {portfolioData.moodboardImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden shadow-soft">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Moodboard ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => removeMoodboardImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    
                    {/* Upload Area */}
                    <label className="aspect-square border-2 border-dashed border-accent/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors bg-accent/10">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleMoodboardUpload(e.target.files)}
                        className="hidden"
                      />
                      <Upload className="h-8 w-8 text-accent mb-2" />
                      <span className="text-sm text-accent text-center font-medium">
                        Add Inspiration
                      </span>
                    </label>
                  </div>
                </div>

                {/* Style Preferences */}
                <div className="space-y-6">
                  <Label className="text-base font-medium">Style Preferences</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="colorScheme" className="text-sm">Preferred Color Scheme</Label>
                      <select
                        id="colorScheme"
                        value={portfolioData.stylePreferences.colorScheme}
                        onChange={(e) => handleStylePreferenceChange('colorScheme', e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background shadow-soft focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Select color preference</option>
                        <option value="monochrome">Monochrome (Black & White)</option>
                        <option value="minimal">Minimal (Neutral tones)</option>
                        <option value="warm">Warm (Reds, oranges, yellows)</option>
                        <option value="cool">Cool (Blues, greens, purples)</option>
                        <option value="vibrant">Vibrant (Bold, bright colors)</option>
                        <option value="earthy">Earthy (Natural, organic tones)</option>
                        <option value="pastel">Pastel (Soft, muted colors)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="layoutStyle" className="text-sm">Layout Style</Label>
                      <select
                        id="layoutStyle"
                        value={portfolioData.stylePreferences.layoutStyle}
                        onChange={(e) => handleStylePreferenceChange('layoutStyle', e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background shadow-soft focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Select layout preference</option>
                        <option value="minimal">Minimal & Clean</option>
                        <option value="grid">Grid-based</option>
                        <option value="masonry">Masonry (Pinterest-style)</option>
                        <option value="magazine">Magazine-style</option>
                        <option value="asymmetric">Asymmetric & Creative</option>
                        <option value="fullscreen">Full-screen Showcase</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="typography" className="text-sm">Typography Style</Label>
                      <select
                        id="typography"
                        value={portfolioData.stylePreferences.typography}
                        onChange={(e) => handleStylePreferenceChange('typography', e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background shadow-soft focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Select typography preference</option>
                        <option value="modern">Modern Sans-serif</option>
                        <option value="classic">Classic Serif</option>
                        <option value="artistic">Artistic & Creative</option>
                        <option value="minimal">Minimal & Light</option>
                        <option value="bold">Bold & Strong</option>
                        <option value="elegant">Elegant & Refined</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mood" className="text-sm">Overall Mood</Label>
                      <select
                        id="mood"
                        value={portfolioData.stylePreferences.mood}
                        onChange={(e) => handleStylePreferenceChange('mood', e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background shadow-soft focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Select mood preference</option>
                        <option value="professional">Professional & Corporate</option>
                        <option value="creative">Creative & Artistic</option>
                        <option value="playful">Playful & Fun</option>
                        <option value="elegant">Elegant & Sophisticated</option>
                        <option value="edgy">Edgy & Modern</option>
                        <option value="warm">Warm & Inviting</option>
                        <option value="minimal">Minimal & Clean</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  Generate Portfolio with AI
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsForm;