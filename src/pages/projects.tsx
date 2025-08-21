import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { API_BASE_URL } from '@/services/api';
import { 
  ArrowRight, 
  ArrowLeft, 
  FolderOpen, 
  Camera, 
  Lightbulb,
  Calendar,
  User,
  Target,
  Sparkles,
  Check,
  Upload,
  ImageIcon,
  Plus,
  X,
  Star,
  Clock,
  Zap,
  Play,
  Loader2,
  Monitor,
  Palette,
  Edit
} from 'lucide-react';

interface Project {
  title: string;
  role: string;
  timeline: string;
  category: string;
  customCategory: string;
  tags: string[];
  problem: string;
  solution: string;
  reflection: string;
  processImages: File[];
  finalProductImage: File | null;
}

const ProjectsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoaded, isSignedIn } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showOtherInput, setShowOtherInput] = useState({
    role: false,
    timeline: false,
    category: false
  });
  
  const [project, setProject] = useState<Project>({
    title: '',
    role: '',
    timeline: '',
    category: '',
    customCategory: '',
    tags: [],
    problem: '',
    solution: '',
    reflection: '',
    processImages: [],
    finalProductImage: null
  });

  // Check auth on mount
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in');
    }
  }, [isLoaded, isSignedIn, navigate]);

  const creativeTitles = [
    { icon: Camera, title: 'Photography', desc: 'Capturing moments & emotions' },
    { icon: Palette, title: 'Graphic Design', desc: 'Visual storytelling & branding' },
    { icon: Monitor, title: 'UI/UX Design', desc: 'User-centered experiences' },
    { icon: Star, title: 'Branding', desc: 'Identity & visual systems' },
    { icon: Lightbulb, title: 'Illustration', desc: 'Art & creative illustrations' },
    { icon: Zap, title: 'Web Design', desc: 'Digital experiences' },
    { icon: Target, title: 'Product Design', desc: 'Digital products & apps' },
    { icon: Clock, title: 'Motion Graphics', desc: 'Animation & movement' },
    { icon: User, title: 'Other', desc: 'Something unique' }
  ];

  const roleOptions = [
    'Lead Designer', 'Solo Designer', 'Design Lead', 'Creative Director',
    'Junior Designer', 'Senior Designer', 'Freelancer', 'Team Member'
  ];

  const timelineOptions = [
    'Recent (2024-2025)', 'Last year (2024)', '2023', '2022', 
    'College project', 'Personal project', 'Ongoing'
  ];

  const commonTags = [
    'Mobile App', 'Website', 'Branding', 'Logo', 'Print', 'Digital',
    'Minimalist', 'Modern', 'Bold', 'Creative', 'Corporate', 'Artistic',
    'Figma', 'Photoshop', 'Illustrator', 'Sketch', 'Adobe XD',
    'Responsive', 'Interactive', 'Animation', 'User Research', 'Prototyping'
  ];

  const steps = [
    {
      id: 'welcome',
      title: 'Add Your Creative Work',
      subtitle: 'Let\'s showcase your amazing project',
      progress: 0
    },
    {
      id: 'title',
      title: "What's this project called?",
      subtitle: 'Give your project a memorable name',
      progress: 16
    },
    {
      id: 'details',
      title: 'Tell us about your involvement',
      subtitle: 'Your role and when you created this',
      progress: 32
    },
    {
      id: 'category',
      title: 'What type of project is this?',
      subtitle: 'Help us understand your creative domain',
      progress: 48
    },
    {
      id: 'images',
      title: 'Show us your work',
      subtitle: 'Upload images that tell your project\'s story',
      progress: 64
    },
    {
      id: 'story',
      title: 'What\'s the story behind it?',
      subtitle: 'Share the problem, solution, and your insights',
      progress: 80
    },
    {
      id: 'complete',
      title: 'Project saved! 🎉',
      subtitle: 'Ready to add another or continue?',
      progress: 100
    }
  ];

  // Smart auto-continue with 3-second buffer for involvement and category pages
  useEffect(() => {
    let timeoutId;
    
    // Auto-continue for details step after 3 seconds of no changes
    if (currentStep === 2 && project.role && project.timeline) {
      timeoutId = setTimeout(() => {
        handleStepTransition(3);
      }, 3000);
    }
    
    // Auto-continue for category step after 3 seconds (clicked categories only)
    if (currentStep === 3 && project.category && !showOtherInput.category) {
      timeoutId = setTimeout(() => {
        handleStepTransition(4);
      }, 3000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentStep, project.role, project.timeline, project.category, showOtherInput.category]);

  const handleStepTransition = (nextStep: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setIsAnimating(false);
    }, 200);
  };

  const updateProject = (field: keyof Project, value: string | File[] | File | null | string[]) => {
    setProject(prev => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (category: string) => {
    updateProject('category', category);
  };

  const addTag = () => {
    if (newTag.trim() && !project.tags.includes(newTag.trim())) {
      updateProject('tags', [...project.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateProject('tags', project.tags.filter(tag => tag !== tagToRemove));
  };

  const toggleTag = (tag: string) => {
    if (project.tags.includes(tag)) {
      removeTag(tag);
    } else {
      updateProject('tags', [...project.tags, tag]);
    }
  };

  const handleImageUpload = (files: FileList | null, type: 'process' | 'final') => {
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        // ✅ Use 'type' instead of 'mimetype'
        if (!validTypes.includes(file.type)) {
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
  
      if (type === 'process') {
        updateProject('processImages', [...project.processImages, ...validFiles]);
      } else if (type === 'final' && validFiles[0]) {
        updateProject('finalProductImage', validFiles[0]);
      }
    }
  };

  const removeProcessImage = (index: number) => {
    updateProject('processImages', project.processImages.filter((_, i) => i !== index));
  };

  const saveProject = async (projectData: any) => {
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress;
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Create FormData for file uploads
      const formData = new FormData();
      
      // Combine the three text fields into overview
      const overview = `Problem: ${projectData.problem}\n\nSolution: ${projectData.solution}\n\nReflection: ${projectData.reflection}`;
      
      const projectPayload = {
        title: projectData.title,
        subtitle: '', // Can be added later if needed
        role: projectData.role,
        timeline: projectData.timeline,
        category: projectData.category || projectData.customCategory,
        customCategory: projectData.customCategory,
        tags: projectData.tags,
        overview: overview, // Combined overview field
        userEmail: userEmail,
        timestamp: new Date().toISOString()
      };

      formData.append('projectData', JSON.stringify(projectPayload));

      // Add process images
      projectData.processImages.forEach((file: File, index: number) => {
        formData.append(`process_${index}`, file);
      });

      // Add final image
      if (projectData.finalProductImage) {
        formData.append('final_image', projectData.finalProductImage);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/save-project`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const result = await saveProject(project);
      
      if (result.success) {
        toast({
          title: "Project Saved! 🎉",
          description: "Your project has been added to your portfolio",
        });
        
        setIsSaving(false);
        handleStepTransition(6);
      } else {
        throw new Error(result.error || 'Failed to save project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save project",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const handleContinueToPortfolio = () => {
    toast({
      title: "Great work! 🚀",
      description: "Let's create your portfolio with this project",
    });
    
    navigate('/portfolio-builder');
  };

  const handleAddAnother = () => {
    // Reset project state
    setProject({
      title: '',
      role: '',
      timeline: '',
      category: '',
      customCategory: '',
      tags: [],
      problem: '',
      solution: '',
      reflection: '',
      processImages: [],
      finalProductImage: null
    });
    setShowOtherInput({ role: false, timeline: false, category: false });
    setCurrentStep(0);
  };

  const getSmartTagSuggestions = () => {
    const titleLower = project.title.toLowerCase();
    const categoryLower = (project.category || project.customCategory).toLowerCase();
    const combined = `${titleLower} ${categoryLower}`;
    
    let suggestions = [];
    
    // Design tools
    if (combined.includes('design') || combined.includes('ui') || combined.includes('ux')) {
      suggestions.push('Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research');
    }
    if (combined.includes('graphic') || combined.includes('visual') || combined.includes('brand')) {
      suggestions.push('Adobe Illustrator', 'Adobe Photoshop', 'Logo Design', 'Typography', 'Brand Identity');
    }
    if (combined.includes('web') || combined.includes('website') || combined.includes('digital')) {
      suggestions.push('Responsive', 'Interactive', 'HTML/CSS', 'JavaScript', 'Modern');
    }
    if (combined.includes('photo') || combined.includes('camera')) {
      suggestions.push('Portrait', 'Landscape', 'Adobe Lightroom', 'Photography', 'Visual Storytelling');
    }
    if (combined.includes('mobile') || combined.includes('app')) {
      suggestions.push('Mobile App', 'iOS', 'Android', 'User Interface', 'App Design');
    }
    if (combined.includes('motion') || combined.includes('animation')) {
      suggestions.push('After Effects', 'Motion Graphics', 'Animation', 'Video', 'Transitions');
    }
    
    // Style suggestions
    if (combined.includes('minimal') || combined.includes('clean')) {
      suggestions.push('Minimalist', 'Clean', 'Simple');
    }
    if (combined.includes('corporate') || combined.includes('business')) {
      suggestions.push('Corporate', 'Professional', 'Business');
    }
    if (combined.includes('creative') || combined.includes('artistic')) {
      suggestions.push('Creative', 'Artistic', 'Experimental');
    }
    
    return [...new Set(suggestions)].filter(tag => !project.tags.includes(tag)).slice(0, 8);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="text-center space-y-8 h-[calc(100vh-200px)] flex flex-col justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-[#06070A]/5 to-[#06070A]/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <FolderOpen className="h-16 w-16 text-[#06070A]" />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-5xl xl:text-6xl font-light text-[#06070A] leading-tight">
                  Explore<br />
                  your<br />
                  creativity
                </h1>
                <h2 className="text-lg xl:text-xl font-light text-[#06070A]/70 max-w-3xl mx-auto leading-relaxed">
                  Share your design journeys, methods, reflections, and outcomes. Let's showcase your creative process.
                </h2>
              </div>
              
              <div className="pt-6">
                <div className="group cursor-pointer" onClick={() => handleStepTransition(1)}>
                  <div className="inline-flex items-center space-x-3 px-6 py-3 border border-[#06070A]/20 rounded-full transition-all duration-200 hover:bg-[#06070A] hover:text-[#FFFEEA] group-hover:scale-105">
                    <span className="text-lg font-light">Add Your Project</span>
                    <Play className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Title
        return (
          <div className="text-center space-y-8 max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col justify-center">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-light text-[#06070A] leading-tight">
                What's this<br />
                project called?
              </h1>
              <h2 className="text-lg font-light text-[#06070A]/60 leading-relaxed">
                Give it a name that captures its essence
              </h2>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <Input
                  value={project.title}
                  onChange={(e) => updateProject('title', e.target.value)}
                  placeholder="Enter your project title"
                  className="h-16 text-xl text-center border-0 border-b-2 border-[#06070A]/20 rounded-none bg-transparent focus:border-[#06070A] focus:ring-0 transition-all duration-200 placeholder:text-[#06070A]/30"
                  autoFocus
                />
              </div>
              
              {project.title.trim() && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div 
                    className="group cursor-pointer inline-block"
                    onClick={() => handleStepTransition(2)}
                  >
                    <div className="inline-flex items-center space-x-3 px-6 py-3 border border-[#06070A]/20 rounded-full transition-all duration-200 hover:bg-[#06070A] hover:text-[#FFFEEA] group-hover:scale-105">
                      <span className="text-lg font-light">Great choice! Continue</span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2: // Role & Timeline
        return (
          <div className="space-y-8 max-w-6xl mx-auto py-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl xl:text-5xl font-light text-[#06070A] leading-tight">
                Tell us about<br />
                your involvement
              </h1>
              <h2 className="text-lg font-light text-[#06070A]/60">
                Your role and when you created this masterpiece
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Role */}
              <div className="space-y-6">
                <h3 className="text-xl font-light text-[#06070A] flex items-center justify-center">
                  <User className="h-5 w-5 mr-2" />
                  What was your role?
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((role) => (
                    <div
                      key={role}
                      onClick={() => updateProject('role', role)}
                      className={`p-3 text-center text-sm border border-[#06070A]/20 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
                        project.role === role
                          ? 'bg-[#06070A] text-[#FFFEEA] shadow-lg scale-105'
                          : 'hover:bg-[#06070A]/5'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        {project.role === role && <Check className="h-3 w-3" />}
                        <span className="font-light">{role}</span>
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => setShowOtherInput(prev => ({ ...prev, role: true }))}
                    className="p-3 text-center text-sm border border-[#06070A]/20 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-[#06070A]/5"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <Edit className="h-3 w-3" />
                      <span className="font-light">Other</span>
                    </div>
                  </div>
                </div>
                {showOtherInput.role && (
                  <Input
                    value={project.role}
                    onChange={(e) => updateProject('role', e.target.value)}
                    placeholder="Enter custom role..."
                    className="border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded-lg text-center"
                    autoFocus
                  />
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                <h3 className="text-xl font-light text-[#06070A] flex items-center justify-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  When did you create this?
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {timelineOptions.map((timeline) => (
                    <div
                      key={timeline}
                      onClick={() => updateProject('timeline', timeline)}
                      className={`p-3 text-center text-sm border border-[#06070A]/20 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
                        project.timeline === timeline
                          ? 'bg-[#06070A] text-[#FFFEEA] shadow-lg scale-105'
                          : 'hover:bg-[#06070A]/5'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        {project.timeline === timeline && <Check className="h-3 w-3" />}
                        <span className="font-light">{timeline}</span>
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => setShowOtherInput(prev => ({ ...prev, timeline: true }))}
                    className="p-3 text-center text-sm border border-[#06070A]/20 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-[#06070A]/5"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <Edit className="h-3 w-3" />
                      <span className="font-light">Other</span>
                    </div>
                  </div>
                </div>
                {showOtherInput.timeline && (
                  <Input
                    value={project.timeline}
                    onChange={(e) => updateProject('timeline', e.target.value)}
                    placeholder="Enter custom timeline..."
                    className="border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded-lg text-center"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {(project.role && project.timeline) && (
              <div className="text-center pt-4 animate-in slide-in-from-bottom-2 duration-300">
                <div 
                  className="group cursor-pointer inline-block"
                  onClick={() => handleStepTransition(3)}
                >
                  <div className="inline-flex items-center space-x-3 px-6 py-3 border border-[#06070A]/20 rounded-full transition-all duration-200 hover:bg-[#06070A] hover:text-[#FFFEEA] group-hover:scale-105">
                    <span className="text-lg font-light">Continue</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3: // Category
        return (
          <div className="space-y-8 py-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl xl:text-5xl font-light text-[#06070A] leading-tight">
                What type of<br />
                project is this?
              </h1>
              <h2 className="text-lg font-light text-[#06070A]/60">
                Help us understand your creative domain
              </h2>
            </div>

            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-6xl mx-auto">
              {creativeTitles.map((item, index) => (
                <div 
                  key={item.title}
                  className={`p-4 text-center border border-[#06070A]/20 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 group ${
                    project.category === item.title 
                      ? 'bg-[#06070A] text-[#FFFEEA] shadow-xl scale-105' 
                      : 'hover:bg-[#06070A]/5'
                  }`}
                  onClick={() => handleCategorySelect(item.title)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="space-y-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all duration-200 ${
                      project.category === item.title 
                        ? 'bg-[#FFFEEA]/20' 
                        : 'bg-[#06070A]/10 group-hover:bg-[#06070A]/20'
                    }`}>
                      <item.icon className={`h-4 w-4 ${
                        project.category === item.title 
                          ? 'text-[#FFFEEA]' 
                          : 'text-[#06070A]'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-light mb-1">{item.title}</h3>
                      <p className={`text-xs ${
                        project.category === item.title 
                          ? 'text-[#FFFEEA]/80' 
                          : 'text-[#06070A]/60'
                      }`}>
                        {item.desc}
                      </p>
                    </div>
                    {project.category === item.title && (
                      <div className="animate-in zoom-in-50 duration-200">
                        <Check className="h-4 w-4 text-[#FFFEEA] mx-auto" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div
                onClick={() => setShowOtherInput(prev => ({ ...prev, category: true }))}
                className="p-4 text-center border border-[#06070A]/20 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-[#06070A]/5"
              >
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto bg-[#06070A]/10">
                    <Edit className="h-4 w-4 text-[#06070A]" />
                  </div>
                  <h3 className="text-sm font-light">Other</h3>
                  <p className="text-xs text-[#06070A]/60">Custom</p>
                </div>
              </div>
            </div>

            {showOtherInput.category && (
              <div className="max-w-md mx-auto animate-in slide-in-from-bottom-2 duration-300">
                <Input
                  value={project.customCategory}
                  onChange={(e) => updateProject('customCategory', e.target.value)}
                  placeholder="Enter your custom category..."
                  className="h-12 text-lg text-center border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded-lg"
                  autoFocus
                />
              </div>
            )}

            {/* Continue button for both selected categories and custom input */}
            {(project.category || (showOtherInput.category && project.customCategory.trim())) && (
              <div className="text-center pt-4 animate-in slide-in-from-bottom-2 duration-300">
                <div 
                  className="group cursor-pointer inline-block"
                  onClick={() => handleStepTransition(4)}
                >
                  <div className="inline-flex items-center space-x-3 px-6 py-3 border border-[#06070A]/20 rounded-full transition-all duration-200 hover:bg-[#06070A] hover:text-[#FFFEEA] group-hover:scale-105">
                    <span className="text-lg font-light">Continue</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 4: // Images
        return (
          <div className="space-y-8 max-w-6xl mx-auto h-[calc(100vh-200px)] flex flex-col justify-center">
            <div className="text-center space-y-4">
              <h1 className="text-4xl xl:text-5xl font-light text-[#06070A] leading-tight">
                Show us<br />
                your work
              </h1>
              <h2 className="text-lg font-light text-[#06070A]/60">
                Upload images that tell your project's story
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Process Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-light text-[#06070A] flex items-center justify-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Process Images
                </h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {project.processImages.slice(0, 5).map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-[#06070A]/5 rounded-lg overflow-hidden border border-[#06070A]/10">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Process ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeProcessImage(index)}
                        className="absolute -top-1 -right-1 bg-[#06070A] text-[#FFFEEA] rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  {project.processImages.length > 5 && (
                    <div className="aspect-square bg-[#06070A]/5 rounded-lg flex items-center justify-center border border-[#06070A]/10">
                      <span className="text-xs text-[#06070A]/60 font-light">+{project.processImages.length - 5}</span>
                    </div>
                  )}
                  
                  <label className="aspect-square border-2 border-dashed border-[#06070A]/20 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#06070A]/40 hover:bg-[#06070A]/5 transition-all duration-200 group">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files, 'process')}
                      className="hidden"
                    />
                    <Plus className="h-6 w-6 text-[#06070A]/60 group-hover:scale-110 transition-transform" />
                  </label>
                </div>
              </div>

              {/* Final Image */}
              <div className="space-y-4">
                <h3 className="text-lg font-light text-[#06070A] flex items-center justify-center">
                  <Star className="h-5 w-5 mr-2" />
                  Final Result
                </h3>
                
                <div className="max-w-none">
                  {project.finalProductImage ? (
                    <div className="relative group max-w-48 mx-auto">
                      <div className="aspect-square bg-[#06070A]/5 rounded-lg overflow-hidden border border-[#06070A]/10">
                        <img
                          src={URL.createObjectURL(project.finalProductImage)}
                          alt="Final result"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => updateProject('finalProductImage', null)}
                        className="absolute -top-1 -right-1 bg-[#06070A] text-[#FFFEEA] rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="aspect-square border-2 border-dashed border-[#06070A]/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#06070A]/40 hover:bg-[#06070A]/5 transition-all duration-200 group w-48 mx-auto">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files, 'final')}
                        className="hidden"
                      />
                      <ImageIcon className="h-8 w-8 text-[#06070A]/60 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs text-[#06070A]/60 text-center font-light">
                        Upload Final
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Smart Tags */}
              <div className="space-y-4">
                <h3 className="text-lg font-light text-[#06070A] flex items-center justify-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Smart Tags
                </h3>
                
                <div className="space-y-3">
                  {/* Selected tags */}
                  <div className="flex flex-wrap gap-1 justify-center min-h-[2rem]">
                    {project.tags.slice(0, 6).map((tag, index) => (
                      <Badge key={index} className="px-2 py-1 bg-[#06070A] text-[#FFFEEA] hover:bg-[#06070A]/80 cursor-pointer text-xs">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-300"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    ))}
                    {project.tags.length > 6 && (
                      <Badge className="px-2 py-1 bg-[#06070A]/20 text-[#06070A] text-xs">
                        +{project.tags.length - 6}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Custom tag input */}
                  <div className="flex gap-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                      className="text-xs h-8 border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button 
                      onClick={addTag}
                      className="bg-[#06070A] hover:bg-[#06070A]/80 text-[#FFFEEA] h-8 px-2"
                      size="sm"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Smart suggestions */}
                  <div className="space-y-2">
                    <p className="text-xs text-[#06070A]/60 font-light text-center">Suggested for you:</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {getSmartTagSuggestions().map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className="px-2 py-1 text-xs border border-[#06070A]/20 rounded hover:bg-[#06070A] hover:text-[#FFFEEA] transition-all duration-200 font-light"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-4">
              <div 
                className="group cursor-pointer inline-block"
                onClick={() => handleStepTransition(5)}
              >
                <div className="inline-flex items-center space-x-2 px-4 py-2 border border-[#06070A]/20 rounded-full transition-all duration-200 hover:bg-[#06070A] hover:text-[#FFFEEA] group-hover:scale-105">
                  <span className="text-sm font-light">Continue to Story</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        );

      case 5: // Story
        return (
          <div className="space-y-8 max-w-6xl mx-auto h-[calc(100vh-200px)] flex flex-col justify-center">
            <div className="text-center space-y-4">
              <h1 className="text-4xl xl:text-5xl font-light text-[#06070A] leading-tight">
                What's the story<br />
                behind it?
              </h1>
              <h2 className="text-lg font-light text-[#06070A]/60">
                Share the journey, challenges, and insights
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Problem */}
              <div className="space-y-3">
                <h3 className="text-lg font-light text-[#06070A] flex items-center justify-center">
                  <Target className="h-5 w-5 mr-2" />
                  Problem
                </h3>
                <p className="text-xs text-[#06070A]/60 font-light text-center">
                  What challenge did this solve?
                </p>
                <Textarea
                  value={project.problem}
                  onChange={(e) => updateProject('problem', e.target.value)}
                  placeholder="e.g., Small businesses needed an affordable way to create professional websites..."
                  className="min-h-[120px] border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded-lg resize-none text-sm font-light p-4 leading-relaxed"
                />
              </div>

              {/* Solution */}
              <div className="space-y-3">
                <h3 className="text-lg font-light text-[#06070A] flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Solution
                </h3>
                <p className="text-xs text-[#06070A]/60 font-light text-center">
                  How did you solve it?
                </p>
                <Textarea
                  value={project.solution}
                  onChange={(e) => updateProject('solution', e.target.value)}
                  placeholder="e.g., I designed a drag-and-drop interface that allows users to build websites..."
                  className="min-h-[120px] border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded-lg resize-none text-sm font-light p-4 leading-relaxed"
                />
              </div>

              {/* Reflection */}
              <div className="space-y-3">
                <h3 className="text-lg font-light text-[#06070A] flex items-center justify-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Reflection
                </h3>
                <p className="text-xs text-[#06070A]/60 font-light text-center">
                  What did you learn?
                </p>
                <Textarea
                  value={project.reflection}
                  onChange={(e) => updateProject('reflection', e.target.value)}
                  placeholder="e.g., This project taught me the importance of user testing early..."
                  className="min-h-[120px] border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded-lg resize-none text-sm font-light p-4 leading-relaxed"
                />
              </div>
            </div>

            <div className="text-center pt-4">
              <div
                className="group cursor-pointer inline-block"
                onClick={handleSave}
              >
                <div className="inline-flex items-center space-x-3 px-8 py-3 border border-[#06070A]/20 rounded-full transition-all duration-200 hover:bg-[#06070A] hover:text-[#FFFEEA] group-hover:scale-105">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-lg font-light">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span className="text-lg font-light">Save Project</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 6: // Complete
        return (
          <div className="text-center space-y-8 h-[calc(100vh-200px)] flex flex-col justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-green-400/10 to-[#06070A]/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <Check className="h-16 w-16 text-[#06070A]" />
              </div>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-4xl xl:text-5xl font-light text-[#06070A] leading-tight">
                Project<br />
                saved! 🎉
              </h1>
              <h2 className="text-lg font-light text-[#06070A]/70 max-w-2xl mx-auto">
                Amazing! Your project "{project.title}" has been added to your portfolio.
              </h2>
              
              <div className="bg-white rounded-xl p-6 border border-[#06070A]/10 shadow-lg max-w-2xl mx-auto">
                <h3 className="text-lg font-light text-[#06070A] mb-4">Project Summary</h3>
                <div className="space-y-3 text-left text-sm">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-[#06070A]/60" />
                    <span className="text-[#06070A] font-light">{project.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-[#06070A]/60" />
                    <span className="text-[#06070A]/80 font-light">{project.role} • {project.timeline}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-[#06070A]/60" />
                    <span className="text-[#06070A]/80 font-light">{project.category || project.customCategory}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Camera className="h-4 w-4 text-[#06070A]/60" />
                    <span className="text-[#06070A]/80 font-light">
                      {project.processImages.length} process, {project.finalProductImage ? '1' : '0'} final
                    </span>
                  </div>
                  {project.tags.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-4 w-4 text-[#06070A]/60 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {project.tags.slice(0, 4).map((tag, index) => (
                          <Badge key={index} className="bg-[#06070A]/10 text-[#06070A] border-0 text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {project.tags.length > 4 && (
                          <Badge className="bg-[#06070A]/10 text-[#06070A] border-0 text-xs">
                            +{project.tags.length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <div
                  className="group cursor-pointer"
                  onClick={handleAddAnother}
                >
                  <div className="inline-flex items-center space-x-2 px-6 py-3 border border-[#06070A]/20 rounded-full transition-all duration-200 hover:bg-[#06070A] hover:text-[#FFFEEA] group-hover:scale-105">
                    <Plus className="h-5 w-5" />
                    <span className="font-light">Add Another Project</span>
                  </div>
                </div>
                
                <div
                  className="group cursor-pointer"
                  onClick={handleContinueToPortfolio}
                >
                  <div className="inline-flex items-center space-x-2 px-6 py-3 border border-[#06070A]/20 rounded-full transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 bg-[#06070A] text-[#FFFEEA]">
                    <span className="font-light">Build Portfolio Now</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading if checking auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFEEA] relative overflow-hidden">
      {/* Subtle noise effect */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFFEEA]/95 backdrop-blur-sm border-b border-[#06070A]/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-light text-[#06070A]/60">
              {currentStep + 1} of {steps.length}
            </div>
            <div className="text-xs text-[#06070A]/60 font-light">
              {steps[currentStep].subtitle}
            </div>
          </div>
          <div className="w-full bg-[#06070A]/10 rounded-full h-1">
            <div 
              className="bg-[#06070A] h-1 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${steps[currentStep].progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-20">
        <div className="max-w-7xl mx-auto">
          <div className={`transition-all duration-200 ease-out ${isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
            {renderStepContent()}
          </div>

          {/* Navigation */}
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <div className="fixed bottom-6 left-6">
              <div 
                className="group cursor-pointer"
                onClick={() => handleStepTransition(currentStep - 1)}
              >
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#06070A]/10 rounded-full transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span className="font-light text-sm">Back</span>
                </div>
              </div>
            </div>
          )}

          {/* Skip to Portfolio Button - Show on any step after title */}
          {currentStep > 1 && currentStep < 6 && (
            <div className="fixed bottom-6 right-6">
              <div 
                className="group cursor-pointer"
                onClick={handleContinueToPortfolio}
              >
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#06070A]/10 rounded-full transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
                  <span className="font-light text-sm">Skip to Portfolio</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;