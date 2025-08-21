import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
// Remove API_BASE_URL import since we won't use it in demo mode
import { getSkeletonPreview, getAllSkeletonPreviews } from '../skeletons';
import { 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Briefcase, 
  GraduationCap,
  Sparkles,
  Plus,
  X,
  Check,
  Loader2,
  Palette,
  FolderOpen,
  Edit3,
  Zap,
  Target,
  Heart,
  Camera,
  Paintbrush,
  Monitor,
  Smartphone,
  Coffee,
  Music,
  Star,
  Crown,
  Rocket,
  Globe,
  Play,
  Sun,
  Moon,
  CheckCircle,
  Eye,
  RefreshCw,
  Upload,
  Type,
  Settings
} from 'lucide-react';

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
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  customCategory: string;
  tags: string[];
  processImages: File[];
  finalProductImage: File | null;
  imageMetadata?: {
    processImages?: string[];
    finalImage?: string;
  };
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
  selectedSkeleton?: string;
  customDesignRequest?: string;
}

const ProjectDetailsForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoaded, isSignedIn } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [theme, setTheme] = useState('light');
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Portfolio building states
  const [portfolioName, setPortfolioName] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedSkeleton, setSelectedSkeleton] = useState('none');
  const [customRequest, setCustomRequest] = useState('');
  const [moodboardImages, setMoodboardImages] = useState<File[]>([]);
  const [showSkeletonPreview, setShowSkeletonPreview] = useState<string | null>(null);
  
  // Data from backend - now using mock data
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: 'Demo User',
    title: 'Creative Designer',
    bio: 'Passionate about creating beautiful and functional designs that solve real problems.',
    email: 'demo@example.com',
    phone: '+1 (555) 123-4567',
    website: 'https://demo-portfolio.com',
    linkedin: 'demo-user',
    instagram: 'demo_user',
    behance: 'demo_user',
    dribbble: 'demo_user',
    skills: ['UI/UX Design', 'Product Design', 'Branding', 'Illustration'],
    experience: '5+ years of experience in design agencies and tech companies',
    education: 'BFA in Design, University of Creative Arts'
  });
  
  // Mock projects data for demo
  const [availableProjects, setAvailableProjects] = useState<Project[]>([
    {
      id: '1',
      title: 'E-Commerce Redesign',
      subtitle: 'Modern shopping experience',
      description: 'Complete redesign of an e-commerce platform focusing on user experience and conversion optimization.',
      category: 'Web Design',
      customCategory: '',
      tags: ['UI/UX', 'E-commerce', 'Responsive'],
      processImages: [],
      finalProductImage: null
    },
    {
      id: '2',
      title: 'Mobile App UI',
      subtitle: 'Fitness tracking application',
      description: 'Designed a comprehensive fitness app with personalized workout plans and progress tracking.',
      category: 'Mobile Design',
      customCategory: '',
      tags: ['iOS', 'Android', 'Health'],
      processImages: [],
      finalProductImage: null
    },
    {
      id: '3',
      title: 'Brand Identity',
      subtitle: 'For a tech startup',
      description: 'Created a complete brand identity including logo, color palette, typography, and marketing materials.',
      category: 'Branding',
      customCategory: '',
      tags: ['Logo', 'Branding', 'Identity'],
      processImages: [],
      finalProductImage: null
    }
  ]);
  
  // Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Theme configuration (matching onboarding)
  const themeConfig = {
    light: {
      bg: 'bg-[#FFFEEA]',
      text: 'text-[#06070A]',
      textSecondary: 'text-[#06070A]/60',
      textTertiary: 'text-[#06070A]/40',
      primary: 'bg-[#06070A]',
      primaryText: 'text-[#FFFEEA]',
      border: 'border-[#06070A]/20',
      card: 'bg-white',
      cardBorder: 'border-[#06070A]/10',
      hover: 'hover:bg-[#06070A]/5'
    },
    dark: {
      bg: 'bg-[#06070A]',
      text: 'text-[#FFFEEA]',
      textSecondary: 'text-[#FFFEEA]/60',
      textTertiary: 'text-[#FFFEEA]/40',
      primary: 'bg-[#FFFEEA]',
      primaryText: 'text-[#06070A]',
      border: 'border-[#FFFEEA]/20',
      card: 'bg-[#FFFEEA]/5',
      cardBorder: 'border-[#FFFEEA]/10',
      hover: 'hover:bg-[#FFFEEA]/5'
    }
  };

  const currentTheme = themeConfig[theme as keyof typeof themeConfig];

  const steps = [
    {
      id: 'name',
      title: 'Name your portfolio',
      subtitle: 'Give this collection a memorable name',
      progress: 20
    },
    {
      id: 'projects',
      title: 'Choose your projects',
      subtitle: 'Select which projects to showcase',
      progress: 40
    },
    {
      id: 'skeleton',
      title: 'Pick your foundation',
      subtitle: 'Choose a starting design or go fully custom',
      progress: 60
    },
    {
      id: 'customize',
      title: 'Make it uniquely yours',
      subtitle: 'Add your personal touch and style preferences',
      progress: 80
    },
    {
      id: 'generate',
      title: 'Ready to build',
      subtitle: 'Your portfolio awaits creation',
      progress: 100
    }
  ];

  // Load user data and projects on component mount - DEMO MODE
  useEffect(() => {
    if (isLoaded) {
      // In demo mode, we don't need to check for signed in status
      // Just set a timeout to simulate loading
      const timer = setTimeout(() => {
        setIsLoadingData(false);
        toast({
          title: "Demo Mode Activated",
          description: "Using sample data for demonstration purposes",
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  // Check auth and redirect if needed - DEMO MODE: Skip auth check
  useEffect(() => {
    // In demo mode, we don't redirect even if not signed in
    // This allows testing without authentication
  }, [isLoaded, isSignedIn, navigate]);

  const loadUserDataAndProjects = async () => {
    // This function is no longer needed in demo mode
    // We're using mock data instead
  };

  const handleStepTransition = (nextStep: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setIsAnimating(false);
    }, 300);
  };

  const handleProjectToggle = (projectId: string) => {
    const newSelection = selectedProjectIds.includes(projectId)
      ? selectedProjectIds.filter(id => id !== projectId)
      : [...selectedProjectIds, projectId];
    
    setSelectedProjectIds(newSelection);
  };

  const handleSkeletonSelect = (skeletonId: string) => {
    setSelectedSkeleton(skeletonId);
  };

  const handleMoodboardUpload = (files: FileList | null) => {
    if (files) {
      const validFiles = Array.from(files).filter((file: File) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
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

      setMoodboardImages(prev => [...prev, ...validFiles]);
    }
  };

  const removeMoodboardImage = (imageIndex: number) => {
    setMoodboardImages(prev => prev.filter((_, i) => i !== imageIndex));
  };

  const handleGenerate = async () => {
    if (selectedProjectIds.length === 0) {
      toast({
        title: "No Projects Selected",
        description: "Please select at least one project to showcase",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Progress simulation for demo
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      // Prepare mock data for demo
      const selectedProjects = availableProjects.filter(project => 
        selectedProjectIds.includes(project.id!)
      );

      const portfolioData = {
        personalInfo: personalInfo,
        projects: selectedProjects.map(project => ({
          title: project.title,
          subtitle: project.subtitle,
          overview: project.description,
          description: project.description,
          category: project.category || project.customCategory,
          customCategory: project.customCategory,
          tags: project.tags,
          processImages: [],
          finalProductImage: null
        })),
        moodboardImages: [],
        stylePreferences: {
          colorScheme: '',
          layoutStyle: '',
          typography: '',
          mood: ''
        },
        selectedSkeleton: selectedSkeleton || 'none',
        customDesignRequest: customRequest || '',
        portfolioName: portfolioName,
        enhancedOptions: {
          useClaudeVision: true,
          useSharpAnalysis: true,
          autoOptimize: true
        }
      };

      // Wait for progress to complete
      await new Promise(resolve => setTimeout(resolve, 4000));

      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Simulate successful generation in demo mode
      toast({
        title: "Portfolio Generated!",
        description: `"${portfolioName}" has been created successfully in demo mode.`,
      });

      // In demo mode, we'll navigate to a demo preview page or show a success message
      // For now, we'll just reset the form after a delay
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setCurrentStep(0);
        setSelectedProjectIds([]);
        setSelectedSkeleton('none');
        setCustomRequest('');
        setMoodboardImages([]);
        
        toast({
          title: "Demo Complete",
          description: "This is a demonstration of the portfolio generation process.",
        });
      }, 2000);

    } catch (error) {
      console.error('Error in demo mode:', error);
      
      toast({
        title: "Demo Error",
        description: "An error occurred in the demo simulation.",
        variant: "destructive",
      });
      
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Get skeleton options
  const skeletonOptions = [
    {
      id: 'none',
      name: 'No Skeleton',
      description: 'Let Prism create a completely custom design',
      features: ['100% Custom Prism Design', 'Moodboard-Driven', 'Unique Layout', 'Creative Freedom'],
      color: 'from-purple-500 to-pink-500',
      html: null
    },
    ...getAllSkeletonPreviews()
  ];

  // Loading screen
  if (!isLoaded || isLoadingData) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${currentTheme.bg}`}>
        <div className="text-center space-y-4">
          <Loader2 className={`h-12 w-12 animate-spin mx-auto ${currentTheme.text}`} />
          <p className={`${currentTheme.textSecondary}`}>
            Loading demo data...
          </p>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Portfolio Name
        return (
          <div className="text-center space-y-8 max-w-2xl mx-auto h-[calc(100vh-200px)] flex flex-col justify-center">
            <div className="space-y-4">
              <h1 className={`text-4xl xl:text-5xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                Name your<br />portfolio
              </h1>
              <h2 className={`text-lg font-light leading-relaxed ${currentTheme.textSecondary}`}>
                Give this collection a memorable name that represents your work
              </h2>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <Input
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="Enter portfolio name"
                  className={`h-16 text-xl text-center border-0 border-b-2 ${currentTheme.border} rounded-none bg-transparent focus:border-current focus:ring-0 transition-all duration-200 ${currentTheme.text}`}
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: theme === 'light' ? '#06070A20' : '#FFFEEA20'
                  }}
                  autoFocus
                />
              </div>
              
              {portfolioName.trim() && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div 
                    className="group cursor-pointer inline-block"
                    onClick={() => handleStepTransition(1)}
                  >
                    <div className={`inline-flex items-center space-x-3 px-8 py-4 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                      <span className="text-lg font-light">Perfect! Let's choose projects</span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 1: // Project Selection
        return (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                Choose your<br />projects
              </h1>
              <h2 className={`text-base font-light ${currentTheme.textSecondary}`}>
                Select the projects you want to showcase in "{portfolioName}"
              </h2>
              {selectedProjectIds.length > 0 && (
                <p className={`text-sm ${currentTheme.textSecondary}`}>
                  {selectedProjectIds.length} project{selectedProjectIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-4">
              {availableProjects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className={`h-16 w-16 mx-auto mb-4 ${currentTheme.textTertiary}`} />
                  <h3 className={`text-lg font-light mb-2 ${currentTheme.text}`}>No projects found</h3>
                  <p className={`text-sm ${currentTheme.textSecondary} mb-6`}>
                    You need to add some projects before creating a portfolio
                  </p>
                  <Button
                    onClick={() => navigate('/projects')}
                    className={`${currentTheme.primary} ${currentTheme.primaryText} hover:scale-105`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableProjects.map((project) => (
                    <div
                      key={project.id}
                      className={`p-6 border rounded-xl cursor-pointer transition-all duration-300 will-change-transform hover:scale-105 group ${
                        selectedProjectIds.includes(project.id!)
                          ? theme === 'light'
                            ? 'bg-[#06070A] text-[#FFFEEA] border-[#06070A] shadow-xl scale-105'
                            : 'bg-[#FFFEEA] text-[#06070A] border-[#FFFEEA] shadow-xl scale-105'
                          : theme === 'light'
                          ? 'bg-white text-[#06070A] border-[#06070A]/10 hover:bg-[#06070A]/5 shadow-sm hover:shadow-md'
                          : 'bg-[#06070A] text-[#FFFEEA] border-[#FFFEEA]/20 hover:bg-[#FFFEEA]/5 shadow-sm hover:shadow-md'
                      }`}
                      onClick={() => handleProjectToggle(project.id!)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-lg truncate">{project.title}</h3>
                            {project.subtitle && (
                              <p className={`text-sm mt-1 ${
                                selectedProjectIds.includes(project.id!)
                                  ? theme === 'light' ? 'text-[#FFFEEA]/80' : 'text-[#06070A]/80'
                                  : currentTheme.textSecondary
                              }`}>
                                {project.subtitle}
                              </p>
                            )}
                          </div>
                          {selectedProjectIds.includes(project.id!) && (
                            <CheckCircle className={`h-6 w-6 ml-3 flex-shrink-0 ${
                              theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'
                            }`} />
                          )}
                        </div>
                        
                        {project.description && (
                          <p className={`text-sm line-clamp-2 ${
                            selectedProjectIds.includes(project.id!)
                              ? theme === 'light' ? 'text-[#FFFEEA]/70' : 'text-[#06070A]/70'
                              : currentTheme.textTertiary
                          }`}>
                            {project.description}
                          </p>
                        )}
                        
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {project.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  selectedProjectIds.includes(project.id!)
                                    ? theme === 'light' ? 'bg-[#FFFEEA]/20 text-[#FFFEEA]' : 'bg-[#06070A]/20 text-[#06070A]'
                                    : theme === 'light' ? 'bg-[#06070A]/10 text-[#06070A]' : 'bg-[#FFFEEA]/10 text-[#FFFEEA]'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                            {project.tags.length > 3 && (
                              <span className={`text-xs ${currentTheme.textTertiary}`}>
                                +{project.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedProjectIds.length > 0 && (
              <div className="text-center pt-4 animate-in slide-in-from-bottom-4 duration-500">
                <div
                  className="group cursor-pointer inline-block"
                  onClick={() => handleStepTransition(2)}
                >
                  <div className={`inline-flex items-center space-x-3 px-6 py-3 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                    <span className="text-base font-light">Continue with {selectedProjectIds.length} project{selectedProjectIds.length !== 1 ? 's' : ''}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

        case 2: // Skeleton Selection
        return (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                Pick your<br />foundation
              </h1>
              <h2 className={`text-base font-light ${currentTheme.textSecondary}`}>
                Choose a design skeleton as your starting point, or go completely custom
              </h2>
            </div>
        
            <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
              <div className="flex flex-nowrap gap-4 pb-4 pr-2 overflow-x-auto">
                {skeletonOptions.map((skeleton) => (
                  <div
                    key={skeleton.id}
                    className="relative cursor-pointer transition-all duration-300 group flex-shrink-0 w-[320px]"
                    onClick={() => handleSkeletonSelect(skeleton.id)}
                  >
                    <div className={`h-full overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                      selectedSkeleton === skeleton.id
                        ? theme === 'light'
                          ? 'border-[#06070A] bg-[#06070A] text-[#FFFEEA] shadow-xl'
                          : 'border-[#FFFEEA] bg-[#FFFEEA] text-[#06070A] shadow-xl'
                        : theme === 'light'
                        ? 'border-[#06070A]/10 bg-white text-[#06070A] hover:border-[#06070A]/30 hover:shadow-lg'
                        : 'border-[#FFFEEA]/20 bg-[#FFFEEA]/5 text-[#FFFEEA] hover:border-[#FFFEEA]/40 hover:shadow-lg'
                    }`}>
                      {/* Header with Icon */}
                      <div className="p-6 pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-3 rounded-lg ${
                            selectedSkeleton === skeleton.id
                              ? theme === 'light'
                                ? 'bg-[#FFFEEA]/20'
                                : 'bg-[#06070A]/20'
                              : theme === 'light'
                              ? 'bg-[#06070A]/10'
                              : 'bg-[#FFFEEA]/10'
                          }`}>
                            {skeleton.id === 'none' ? (
                              <Sparkles className={`h-6 w-6 ${
                                selectedSkeleton === skeleton.id
                                  ? theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'
                                  : theme === 'light' ? 'text-[#06070A]' : 'text-[#FFFEEA]'
                              }`} />
                            ) : (
                              <Monitor className={`h-6 w-6 ${
                                selectedSkeleton === skeleton.id
                                  ? theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'
                                  : theme === 'light' ? 'text-[#06070A]' : 'text-[#FFFEEA]'
                              }`} />
                            )}
                          </div>
                          {selectedSkeleton === skeleton.id && (
                            <CheckCircle className={`h-6 w-6 ${
                              theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'
                            }`} />
                          )}
                        </div>
        
                        <div className="space-y-2">
                          <h4 className={`font-medium text-lg ${
                            selectedSkeleton === skeleton.id
                              ? theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'
                              : currentTheme.text
                          }`}>
                            {skeleton.name}
                          </h4>
                          <p className={`text-sm leading-relaxed ${
                            selectedSkeleton === skeleton.id
                              ? theme === 'light' ? 'text-[#FFFEEA]/80' : 'text-[#06070A]/80'
                              : currentTheme.textSecondary
                          }`}>
                            {skeleton.description}
                          </p>
                        </div>
                      </div>
        
                      {/* Features */}
                      <div className="px-6 pb-4">
                        <div className="space-y-2">
                          {skeleton.features.slice(0, 3).map((feature, idx) => (
                            <div key={idx} className={`flex items-center text-sm ${
                              selectedSkeleton === skeleton.id
                                ? theme === 'light' ? 'text-[#FFFEEA]/70' : 'text-[#06070A]/70'
                                : currentTheme.textSecondary
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full mr-3 ${
                                selectedSkeleton === skeleton.id
                                  ? theme === 'light' ? 'bg-[#FFFEEA]/60' : 'bg-[#06070A]/60'
                                  : theme === 'light' ? 'bg-[#06070A]/40' : 'bg-[#FFFEEA]/40'
                              }`} />
                              {feature}
                            </div>
                          ))}
                          {skeleton.features.length > 3 && (
                            <div className={`text-sm ml-5 ${
                              selectedSkeleton === skeleton.id
                                ? theme === 'light' ? 'text-[#FFFEEA]/60' : 'text-[#06070A]/60'
                                : currentTheme.textTertiary
                            }`}>
                              +{skeleton.features.length - 3} more features
                            </div>
                          )}
                        </div>
                      </div>
        
                      {/* Preview Button */}
                      {skeleton.id !== 'none' && (
                        <div className="px-6 pb-6">
                          <button
                            className={`w-full py-2 px-3 text-sm rounded-lg border transition-all duration-200 hover:scale-105 ${
                              selectedSkeleton === skeleton.id
                                ? theme === 'light'
                                  ? 'border-[#FFFEEA]/30 text-[#FFFEEA] hover:bg-[#FFFEEA]/10'
                                  : 'border-[#06070A]/30 text-[#06070A] hover:bg-[#06070A]/10'
                                : theme === 'light'
                                ? 'border-[#06070A]/20 text-[#06070A] hover:bg-[#06070A]/5'
                                : 'border-[#FFFEEA]/20 text-[#FFFEEA] hover:bg-[#FFFEEA]/5'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSkeletonPreview(skeleton.id);
                            }}
                          >
                            <div className="flex items-center justify-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Live Preview
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
        
            <div className="text-center pt-4">
              <div
                className="group cursor-pointer inline-block"
                onClick={() => handleStepTransition(3)}
              >
                <div className={`inline-flex items-center space-x-3 px-6 py-3 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                  <span className="text-base font-light">Continue with {skeletonOptions.find(s => s.id === selectedSkeleton)?.name || 'Custom'}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Customization
        return (
          <div className="space-y-8 py-4">
            <div className="text-center space-y-3">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                Make it uniquely<br />yours
              </h1>
              <h2 className={`text-base font-light ${currentTheme.textSecondary}`}>
                Add visual inspiration and describe your perfect portfolio style
              </h2>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
              {/* Moodboard Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-medium ${currentTheme.text}`}>Visual Inspiration</h3>
                    <p className={`text-sm mt-1 ${currentTheme.textSecondary}`}>
                      Upload images that represent the style and mood you want
                    </p>
                  </div>
                  <div className={`text-xs px-3 py-1 rounded-full ${theme === 'light' ? 'bg-[#06070A]/10 text-[#06070A]' : 'bg-[#FFFEEA]/10 text-[#FFFEEA]'}`}>
                    {moodboardImages.length}/8 images
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {moodboardImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className={`aspect-square rounded-lg overflow-hidden shadow-sm border-2 border-transparent hover:border-current transition-colors ${currentTheme.card}`}>
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Moodboard ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeMoodboardImage(index)}
                        className={`absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110 rounded-full ${theme === 'light' ? 'bg-red-500 text-white' : 'bg-red-400 text-black'}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  {moodboardImages.length < 8 && (
                    <label className={`aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors group ${theme === 'light' ? 'border-[#06070A]/30 hover:border-[#06070A] hover:bg-[#06070A]/5 bg-[#06070A]/10' : 'border-[#FFFEEA]/30 hover:border-[#FFFEEA] hover:bg-[#FFFEEA]/5 bg-[#FFFEEA]/10'}`}>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleMoodboardUpload(e.target.files)}
                        className="hidden"
                      />
                      <Upload className={`h-8 w-8 mb-2 group-hover:scale-110 transition-transform ${theme === 'light' ? 'text-[#06070A]' : 'text-[#FFFEEA]'}`} />
                      <span className={`text-sm text-center font-medium ${theme === 'light' ? 'text-[#06070A]' : 'text-[#FFFEEA]'}`}>
                        Add Images
                      </span>
                      <span className={`text-xs text-center mt-1 ${currentTheme.textTertiary}`}>
                        Max 5MB each
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Custom Design Request */}
              <div className="space-y-4">
                <div>
                  <h3 className={`text-lg font-medium ${currentTheme.text}`}>Describe Your Vision</h3>
                  <p className={`text-sm mt-1 ${currentTheme.textSecondary}`}>
                    Tell us about the style, mood, or specific elements you want in your portfolio
                  </p>
                </div>

                <div className="relative">
                  <textarea
                    value={customRequest}
                    onChange={(e) => setCustomRequest(e.target.value)}
                    placeholder="Describe your ideal portfolio style... (e.g., 'Modern and minimal with clean typography' or 'Bold and colorful with playful animations')"
                    className={`w-full min-h-[120px] p-4 border rounded-lg bg-transparent text-base resize-none focus:outline-none focus:ring-2 transition-all ${currentTheme.card} ${currentTheme.cardBorder} ${currentTheme.text}`}
                    style={{
                      lineHeight: '1.6',
                      borderColor: theme === 'light' ? '#06070A20' : '#FFFEEA20',
                      focusRingColor: theme === 'light' ? '#06070A' : '#FFFEEA'
                    }}
                  />
                  
                  <div className={`absolute bottom-3 right-3 text-xs ${currentTheme.textTertiary}`}>
                    {customRequest.length}/500
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs ${currentTheme.textSecondary}`}>Quick suggestions:</span>
                  {['Modern & Minimal', 'Bold & Colorful', 'Dark & Edgy', 'Warm & Inviting'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setCustomRequest(suggestion + ' aesthetic with clean layouts and smooth animations')}
                      className={`text-xs px-2 py-1 rounded-md transition-colors ${theme === 'light' ? 'bg-[#06070A]/10 hover:bg-[#06070A]/20 text-[#06070A]' : 'bg-[#FFFEEA]/10 hover:bg-[#FFFEEA]/20 text-[#FFFEEA]'}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center pt-4">
              <div
                className="group cursor-pointer inline-block"
                onClick={() => handleStepTransition(4)}
              >
                <div className={`inline-flex items-center space-x-3 px-6 py-3 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                  <span className="text-base font-light">Ready to generate</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        );

      case 4: // Generate
        return (
          <div className="text-center space-y-8 py-4">
            <div className="space-y-4">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                Ready to<br />build magic?
              </h1>
              <h2 className={`text-base font-light max-w-2xl mx-auto ${currentTheme.textSecondary}`}>
                Your portfolio "{portfolioName}" is ready to be created with Prism's magic.
              </h2>
              
              <div className={`${currentTheme.card} ${currentTheme.cardBorder} rounded-2xl p-6 border shadow-lg max-w-xl mx-auto`}>
                <h3 className={`text-lg font-light mb-4 ${currentTheme.text}`}>Portfolio Summary</h3>
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <Type className={`h-4 w-4 ${currentTheme.textSecondary}`} />
                    <span className={`font-light text-sm ${currentTheme.text}`}>"{portfolioName}"</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FolderOpen className={`h-4 w-4 ${currentTheme.textSecondary}`} />
                    <span className={`font-light text-sm ${currentTheme.textSecondary}`}>{selectedProjectIds.length} project{selectedProjectIds.length !== 1 ? 's' : ''} selected</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Settings className={`h-4 w-4 ${currentTheme.textSecondary}`} />
                    <span className={`font-light text-sm ${currentTheme.textSecondary}`}>
                      {skeletonOptions.find(s => s.id === selectedSkeleton)?.name || 'Custom'} foundation
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Palette className={`h-4 w-4 ${currentTheme.textSecondary}`} />
                    <span className={`font-light text-sm ${currentTheme.textSecondary}`}>
                      {moodboardImages.length} mood image{moodboardImages.length !== 1 ? 's' : ''}
                      {customRequest && ', custom style request'}
                    </span>
                  </div>
                </div>
              </div>
              
              {isGenerating && (
                <div className="w-full max-w-md mx-auto space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className={currentTheme.textSecondary}>Generating your portfolio...</span>
                    <span className={currentTheme.textSecondary}>{Math.round(generationProgress)}%</span>
                  </div>
                  <div className={`w-full rounded-full h-2 ${theme === 'light' ? 'bg-[#06070A]/10' : 'bg-[#FFFEEA]/10'}`}>
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ease-out ${theme === 'light' ? 'bg-[#06070A]' : 'bg-[#FFFEEA]'}`}
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <div className={`text-xs text-center ${currentTheme.textSecondary}`}>
                    {generationProgress < 30 && "Analyzing your projects and style..."}
                    {generationProgress >= 30 && generationProgress < 60 && "Designing your unique layout..."}
                    {generationProgress >= 60 && generationProgress < 90 && "Generating content and styling..."}
                    {generationProgress >= 90 && "Adding final touches..."}
                  </div>
                </div>
              )}
              
              <div className="pt-6">
                <div
                  className="group cursor-pointer inline-block"
                  onClick={handleGenerate}
                >
                  <div className={`inline-flex items-center space-x-3 px-8 py-4 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-base font-light">Generating...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-light">Generate Portfolio with Prism</span>
                        <Rocket className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!isGenerating && (
                <p className={`text-sm text-center max-w-md mx-auto ${currentTheme.textSecondary}`}>
                  Prism will create a stunning, personalized portfolio website based on your selections and style preferences.
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Progress Bubbles Component (matching onboarding)
  const ProgressBubbles = () => (
    <div className="fixed left-0 right-0 bottom-2 md:bottom-8 h-4 xl:h-10">
      <div className="flex justify-center items-center gap-2">
        {steps.map((step, index) => (
          <div
            key={index}
            onClick={() => {
              if (index < currentStep) {
                handleStepTransition(index);
              }
            }}
            className={`rounded-full transition-all duration-300 ${
              index < currentStep ? 'cursor-pointer hover:scale-110' : ''
            } ${
              index === currentStep
                ? `w-5 h-2 ${currentTheme.primary}` 
                : index < currentStep
                ? `w-2 h-2 ${currentTheme.primary} opacity-60` 
                : `w-2 h-2 ${currentTheme.primary} opacity-20` 
            }`}
            style={{
              opacity: index === currentStep ? 1 : index < currentStep ? 0.6 : 0.2
            }}
          />
        ))}
      </div>
    </div>
  );

  // Skeleton Preview Modal (simplified version)
  const SkeletonPreviewModal = ({ skeletonId, onClose }: { skeletonId: string; onClose: () => void }) => {
    const skeletonPreview = getSkeletonPreview(skeletonId);
    const [iframeSrc, setIframeSrc] = useState<string>('');

    useEffect(() => {
      if (skeletonPreview) {
        const htmlBlob = new Blob([skeletonPreview.html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(htmlBlob);
        setIframeSrc(blobUrl);
        return () => URL.revokeObjectURL(blobUrl);
      }
    }, [skeletonId]);

    if (!skeletonPreview || !iframeSrc) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${currentTheme.card} rounded-lg p-8`}>
            <Loader2 className={`h-8 w-8 animate-spin mx-auto ${currentTheme.text}`} />
            <p className={`text-sm mt-2 text-center ${currentTheme.textSecondary}`}>Loading preview...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className={`${currentTheme.card} rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl`}>
          <div className={`p-6 border-b flex items-center justify-between ${currentTheme.cardBorder}`}>
            <div>
              <h3 className={`text-xl font-semibold ${currentTheme.text}`}>
                {skeletonPreview.name}
              </h3>
              <p className={`text-sm mt-1 ${currentTheme.textSecondary}`}>
                {skeletonPreview.description}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={currentTheme.hover}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-[calc(95vh-120px)] w-full">
            <iframe
              src={iframeSrc}
              className="w-full h-full border-0"
              title={`${skeletonPreview.name} Preview`}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${currentTheme.bg}`}>
      {/* Subtle noise effect (matching onboarding) */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />

      {/* Header Progress Bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-colors duration-500 ${currentTheme.bg}/95 ${currentTheme.border}`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className={`text-xs font-light ${currentTheme.textSecondary}`}>
              {currentStep + 1} of {steps.length}
            </div>
            <div className={`text-xs font-light ${currentTheme.textSecondary}`}>
              {steps[currentStep].subtitle}
            </div>
          </div>
          <div className={`w-full rounded-full h-1 ${theme === 'light' ? 'bg-[#06070A]/10' : 'bg-[#FFFEEA]/10'}`}>
            <div 
              className={`h-1 rounded-full transition-all duration-500 ease-out ${theme === 'light' ? 'bg-[#06070A]' : 'bg-[#FFFEEA]'}`}
              style={{ width: `${steps[currentStep].progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-20 pb-20">
        <div className="max-w-6xl mx-auto min-h-[calc(100vh-160px)] flex flex-col justify-center">
          <div className={`transition-all duration-200 ease-out ${isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
            {renderStepContent()}
          </div>

          {/* Navigation - Back button */}
          <div className="fixed bottom-6 left-6 z-40">
            <div 
              className="group cursor-pointer"
              onClick={() => currentStep > 0 ? handleStepTransition(currentStep - 1) : navigate('/dashboard')}
            >
              <div className={`inline-flex items-center space-x-2 px-4 py-2 backdrop-blur-sm border rounded-full transition-all duration-200 group-hover:scale-105 shadow-sm ${currentTheme.card}/90 ${currentTheme.cardBorder} ${currentTheme.hover}`}>
                <ArrowLeft className={`h-4 w-4 transition-transform group-hover:-translate-x-1 ${currentTheme.text}`} />
                <span className={`font-light text-sm ${currentTheme.text}`}>
                  {currentStep === 0 ? 'Dashboard' : 'Back'}
                </span>
              </div>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="fixed top-6 right-6 z-50">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`p-3 rounded-full border transition-all duration-200 hover:scale-105 ${currentTheme.card} ${currentTheme.cardBorder} ${currentTheme.hover} shadow-sm`}
            >
              {theme === 'light' ? (
                <Moon className={`h-5 w-5 ${currentTheme.text}`} />
              ) : (
                <Sun className={`h-5 w-5 ${currentTheme.text}`} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bubbles */}
      <ProgressBubbles />

      {/* Skeleton Preview Modal */}
      {showSkeletonPreview && (
        <SkeletonPreviewModal 
          skeletonId={showSkeletonPreview}
          onClose={() => setShowSkeletonPreview(null)}
        />
      )}
    </div>
  );
};

export default ProjectDetailsForm;