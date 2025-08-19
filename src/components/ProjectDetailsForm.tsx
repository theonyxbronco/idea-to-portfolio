import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Palette, Loader2, AlertTriangle, RefreshCw, Settings, ChevronDown, User, FolderOpen, ArrowLeft, Eye, Sparkles, X, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/clerk-react';
import { API_BASE_URL } from '@/services/api';
import { getSkeletonPreview, getAllSkeletonPreviews } from '../skeletons';

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
  description: string; // Changed from overview to description
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
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, isLoaded, isSignedIn } = useUser();
  
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
    projects: [],
    moodboardImages: [],
    stylePreferences: {
      colorScheme: '',
      layoutStyle: '',
      typography: '',
      mood: ''
    }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [autoCompleteAttempt, setAutoCompleteAttempt] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [fromDashboard, setFromDashboard] = useState(false);

  // Advanced settings state
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [customColors, setCustomColors] = useState({
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#8b5cf6',
    background: '#ffffff',
    text: '#1f2937'
  });
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [selectedLayout, setSelectedLayout] = useState('instagram');

  const FONT_OPTIONS = [
    { value: 'Inter', label: 'Inter (Modern Sans-serif)' },
    { value: 'Roboto', label: 'Roboto (Clean)' },
    { value: 'Open Sans', label: 'Open Sans (Friendly)' },
    { value: 'Montserrat', label: 'Montserrat (Bold)' },
    { value: 'Playfair Display', label: 'Playfair Display (Elegant)' },
    { value: 'Lora', label: 'Lora (Serif)' },
    { value: 'Space Mono', label: 'Space Mono (Monospace)' },
  ];
  
  const LAYOUT_OPTIONS = [
    { value: 'instagram', label: 'Instagram Feed Style' },
    { value: 'pinterest', label: 'Pinterest Masonry Style' },
    { value: 'reddit', label: 'Reddit Content-First Style' },
    { value: 'videogame', label: 'Video Game UI Style' },
    { value: 'minimal', label: 'Minimal Portfolio' },
    { value: 'magazine', label: 'Magazine Layout' },
  ];

  // Load user data and projects on component mount
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.primaryEmailAddress?.emailAddress) {
      // Check if we're coming from dashboard with selected projects
      const state = location.state as { selectedProjectIds?: string[], fromDashboard?: boolean };
      if (state?.fromDashboard && state?.selectedProjectIds) {
        setFromDashboard(true);
        loadUserDataAndSelectedProjects(state.selectedProjectIds);
      } else {
        loadUserDataAndProjects();
      }
    }
  }, [isLoaded, isSignedIn, user, location.state]);

  const loadUserDataAndSelectedProjects = async (selectedProjectIds: string[]) => {
    try {
      setIsLoadingData(true);
      setDataLoadError(null);
      
      const userEmail = user?.primaryEmailAddress?.emailAddress;
      
      if (!userEmail) {
        throw new Error("Could not retrieve user email");
      }

      // Load personal info and all projects in parallel
      const [userInfoResponse, projectsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/get-user-info?email=${encodeURIComponent(userEmail)}`),
        fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/get-user-projects?email=${encodeURIComponent(userEmail)}`)
      ]);

      let loadedPersonalInfo = portfolioData.personalInfo;
      let allProjects: Project[] = [];

      // Process user info response
      if (userInfoResponse.ok) {
        const userResult = await userInfoResponse.json();
        if (userResult.success && userResult.data) {
          loadedPersonalInfo = userResult.data;
        }
      }

      // Process projects response
      if (projectsResponse.ok) {
        const projectsResult = await projectsResponse.json();
        if (projectsResult.success && projectsResult.data) {
          allProjects = projectsResult.data;
        }
      }

      // Filter to only selected projects
      const selectedProjects = allProjects.filter(project => 
        selectedProjectIds.includes(project.id!)
      );

      // Update portfolio data
      setPortfolioData(prev => ({
        ...prev,
        personalInfo: loadedPersonalInfo,
        projects: selectedProjects
      }));

      toast({
        title: "Portfolio Builder Ready",
        description: `Loaded ${selectedProjects.length} selected project(s) and personal information`,
      });

    } catch (error) {
      console.error('Error loading selected projects:', error);
      setDataLoadError(error instanceof Error ? error.message : 'Failed to load selected projects');
      
      toast({
        title: "Loading Error",
        description: "Could not load selected projects. You can still generate your portfolio.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadUserDataAndProjects = async () => {
    try {
      setIsLoadingData(true);
      setDataLoadError(null);
      
      const userEmail = user?.primaryEmailAddress?.emailAddress;
      
      if (!userEmail) {
        throw new Error("Could not retrieve user email");
      }

      // Load personal info and projects in parallel
      const [userInfoResponse, projectsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/get-user-info?email=${encodeURIComponent(userEmail)}`),
        fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/get-user-projects?email=${encodeURIComponent(userEmail)}`)
      ]);

      let loadedPersonalInfo = portfolioData.personalInfo;
      let loadedProjects: Project[] = [];

      // Process user info response
      if (userInfoResponse.ok) {
        const userResult = await userInfoResponse.json();
        if (userResult.success && userResult.data) {
          loadedPersonalInfo = userResult.data;
        }
      } else {
        console.warn('Could not load user info - using defaults');
      }

      // Process projects response
      if (projectsResponse.ok) {
        const projectsResult = await projectsResponse.json();
        if (projectsResult.success && projectsResult.data) {
          loadedProjects = projectsResult.data;
        }
      } else {
        console.warn('Could not load projects - using empty array');
      }

      // Update portfolio data
      setPortfolioData(prev => ({
        ...prev,
        personalInfo: loadedPersonalInfo,
        projects: loadedProjects
      }));

      // Show success message if we loaded some data
      if (loadedPersonalInfo.name || loadedProjects.length > 0) {
        toast({
          title: "Data Loaded",
          description: `Loaded ${loadedProjects.length} project(s) and personal information`,
        });
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      setDataLoadError(error instanceof Error ? error.message : 'Failed to load user data');
      
      toast({
        title: "Loading Error",
        description: "Some data could not be loaded. You can still generate your portfolio.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
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

  // AUTO-CONTINUE generation function (same as original)
  const autoContinueGeneration = async (partialHtml: string, attempt: number = 1) => {
    const maxAttempts = 2;
    
    if (attempt > maxAttempts) {
      toast({
        title: "Generation Failed",
        description: "Unable to complete generation after multiple attempts. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
      setIsAutoCompleting(false);
      return;
    }

    console.log(`Auto-continuing generation (attempt ${attempt}/${maxAttempts})`);
    setIsAutoCompleting(true);
    setAutoCompleteAttempt(attempt);

    try {
      setGenerationProgress(70);
      
      const formData = new FormData();
      formData.append('portfolioData', JSON.stringify({
        ...portfolioData,
        personalInfo: portfolioData.personalInfo,
        projects: portfolioData.projects.map(project => ({
          title: project.title,
          subtitle: project.subtitle,
          description: project.description, // Updated field name
          category: project.category || project.customCategory,
          customCategory: project.customCategory,
          tags: project.tags,
          processImages: [],
          finalProductImage: null
        })),
        moodboardImages: [],
        stylePreferences: portfolioData.stylePreferences
      }));

      formData.append('partialHtml', partialHtml);
      formData.append('continueGeneration', 'true');

      // Add images
      portfolioData.projects.forEach((project, projectIndex) => {
        project.processImages.forEach((image, imageIndex) => {
          formData.append(`process_${projectIndex}_${imageIndex}`, image);
        });
        
        if (project.finalProductImage) {
          formData.append(`final_${projectIndex}`, project.finalProductImage);
        }
      });

      portfolioData.moodboardImages.forEach((image, index) => {
        formData.append(`moodboard_${index}`, image);
      });

      setGenerationProgress(85);

      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/generate-portfolio`, {
        method: 'POST',
        body: formData,
      });

      setGenerationProgress(95);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setGenerationProgress(100);

      if (result.incomplete) {
        console.log(`Generation still incomplete after attempt ${attempt}, trying again...`);
        
        toast({
          title: `Auto-completing (${attempt}/${maxAttempts})...`,
          description: "Prism needs more time to finish your portfolio",
        });

        setTimeout(() => {
          autoContinueGeneration(result.partialHtml, attempt + 1);
        }, 1000);
        return;
      }

      if (result.success && result.portfolio) {
        toast({
          title: "Portfolio Generated Successfully!",
          description: "Your portfolio has been created and completed automatically.",
        });

        navigate('/preview', { 
          state: { 
            portfolioData,
            generatedPortfolio: result.portfolio,
            metadata: { 
              ...result.portfolio.metadata, 
              autoCompleted: true, 
              attempts: attempt,
              portfolioId: result.portfolio.metadata.portfolioId
            }
          }
        });
      } else {
        throw new Error(result.error || 'Failed to complete portfolio generation');
      }

    } catch (error) {
      console.error('Auto-continuation failed:', error);
      
      if (attempt >= maxAttempts) {
        toast({
          title: "Generation Partially Complete",
          description: "Some sections may be incomplete. You can review and continue manually.",
          variant: "destructive",
        });

        navigate('/incomplete', {
          state: {
            portfolioData,
            partialHtml: partialHtml,
            completionStatus: { estimatedCompletion: 75, issues: ['Auto-completion failed'], canContinue: true },
            metadata: { autoAttempts: attempt },
            error: 'Auto-completion failed after multiple attempts'
          }
        });
      } else {
        setTimeout(() => {
          autoContinueGeneration(partialHtml, attempt + 1);
        }, 2000);
      }
    } finally {
      if (attempt >= maxAttempts) {
        setIsGenerating(false);
        setIsAutoCompleting(false);
        setAutoCompleteAttempt(0);
        setGenerationProgress(0);
      }
    }
  };

  // MAIN generation function
  const handleBuild = async () => {
    // Validation
    if (!portfolioData.personalInfo.name.trim()) {
      toast({
        title: "Missing Personal Information",
        description: "Please complete your personal information first",
        variant: "destructive",
      });
      navigate('/user');
      return;
    }
  
    if (!portfolioData.personalInfo.title.trim()) {
      toast({
        title: "Missing Personal Information", 
        description: "Please complete your professional title first",
        variant: "destructive",
      });
      navigate('/user');
      return;
    }
  
    if (portfolioData.projects.length === 0) {
      toast({
        title: "No Projects Found",
        description: "Please add at least one project before generating your portfolio",
        variant: "destructive",
      });
      if (fromDashboard) {
        navigate('/dashboard');
      } else {
        navigate('/projects');
      }
      return;
    }

    if (portfolioData.projects.some(project => !project.title.trim())) {
      toast({
        title: "Validation Error",
        description: "Please provide titles for all projects",
        variant: "destructive",
      });
      navigate('/projects');
      return;
    }
  
    setIsGenerating(true);
    setGenerationProgress(0);
    setIsAutoCompleting(false);
    setAutoCompleteAttempt(0);
  
    try {
      // Progress simulation for initial generation
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 60) {
            clearInterval(progressInterval);
            return 60;
          }
          return prev + Math.random() * 15;
        });
      }, 500);
  
      // Prepare form data for initial generation
      const formData = new FormData();
      
      const backendData = {
        personalInfo: portfolioData.personalInfo,
        projects: portfolioData.projects.map(project => ({
          title: project.title,
          subtitle: project.subtitle,
          description: project.description, // Updated field name
          category: project.category || project.customCategory,
          customCategory: project.customCategory,
          tags: project.tags,
          processImages: [],
          finalProductImage: null
        })),
        moodboardImages: [],
        stylePreferences: portfolioData.stylePreferences,
        selectedSkeleton: portfolioData.selectedSkeleton,
        customDesignRequest: portfolioData.customDesignRequest
      };
      
      formData.append('portfolioData', JSON.stringify(backendData));
  
      // Add images
      portfolioData.projects.forEach((project, projectIndex) => {
        project.processImages.forEach((image, imageIndex) => {
          formData.append(`process_${projectIndex}_${imageIndex}`, image);
        });
        
        if (project.finalProductImage) {
          formData.append(`final_${projectIndex}`, project.finalProductImage);
        }
      });
  
      portfolioData.moodboardImages.forEach((image, index) => {
        formData.append(`moodboard_${index}`, image);
      });
  
      console.log('Starting initial generation...');
      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/generate-portfolio`, {
        method: 'POST',
        body: formData,
      });
  
      clearInterval(progressInterval);
      setGenerationProgress(65);
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();

      // AUTO-CONTINUE logic: If incomplete, automatically try to continue
      if (result.incomplete) {
        console.log('Initial generation incomplete, starting auto-completion...');
        
        toast({
          title: "Auto-completing Generation...",
          description: "Portfolio needs finishing touches. Continuing automatically...",
        });

        await autoContinueGeneration(result.partialHtml, 1);
        return;
      }

      // If generation was complete on first try
      setGenerationProgress(100);

      if (result.success && result.portfolio) {
        toast({
          title: "Portfolio Generated!",
          description: "Your portfolio has been created successfully.",
        });

        navigate('/preview', { 
          state: { 
            portfolioData,
            generatedPortfolio: result.portfolio,
            metadata: {
              ...result.portfolio.metadata,
              portfolioId: result.portfolio.metadata.portfolioId
            }
          }
        });
      } else {
        throw new Error(result.error || 'Failed to generate portfolio');
      }
  
    } catch (error) {
      console.error('Error generating portfolio:', error);
      
      let errorMessage = 'Failed to generate portfolio. Please try again.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Make sure backend is running on port 3001.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      if (!isAutoCompleting) {
        setIsGenerating(false);
        setGenerationProgress(0);
      }
    }
  };

  // Auth checking
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  useEffect(() => {
    if (isLoaded) {
      setIsAuthChecking(false);
      if (!isSignedIn) {
        navigate('/sign-in');
      }
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (isAuthChecking || !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {fromDashboard ? 'Loading selected projects...' : 'Loading your portfolio data...'}
          </p>
        </div>
      </div>
    );
  }

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
              {fromDashboard ? 'Selected projects loaded - ready to generate!' : 'Ready to generate your portfolio'}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mb-8">
            {fromDashboard ? (
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate('/user')}
                className="text-sm"
              >
                ← Edit Personal Info
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => navigate('/projects')}
              className="text-sm"
            >
              ← Edit Projects
            </Button>
          </div>

          {/* Data Load Error */}
          {dataLoadError && (
            <Card className="shadow-large border-0 mb-8 border-destructive/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Data Loading Issue</p>
                    <p className="text-sm text-muted-foreground">{dataLoadError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fromDashboard ? () => loadUserDataAndSelectedProjects([]) : loadUserDataAndProjects}
                      className="mt-2"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Loading
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-large border-0">
              <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <User className="h-5 w-5 mr-3" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p><strong>Name:</strong> {portfolioData.personalInfo.name || 'Not provided'}</p>
                  <p><strong>Title:</strong> {portfolioData.personalInfo.title || 'Not provided'}</p>
                  <p><strong>Skills:</strong> {portfolioData.personalInfo.skills.length} skills</p>
                  <p><strong>Bio:</strong> {portfolioData.personalInfo.bio ? 'Provided' : 'Not provided'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/user')}
                  className="mt-4"
                >
                  Edit Info
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-large border-0">
              <CardHeader className="bg-gradient-secondary text-secondary-foreground rounded-t-lg">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <FolderOpen className="h-5 w-5 mr-3" />
                  Projects ({portfolioData.projects.length})
                  {fromDashboard && <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">Selected</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {portfolioData.projects.length > 0 ? (
                  <div className="space-y-2">
                    {portfolioData.projects.slice(0, 3).map((project, idx) => (
                      <p key={idx} className="text-sm">
                        <strong>{idx + 1}.</strong> {project.title}
                      </p>
                    ))}
                    {portfolioData.projects.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        +{portfolioData.projects.length - 3} more projects
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No projects loaded</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(fromDashboard ? '/dashboard' : '/projects')}
                  className="mt-4"
                >
                  {fromDashboard ? 'Change Selection' : 'Manage Projects'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Moodboard Section */}
          <EnhancedMoodboardSection 
            portfolioData={portfolioData}
            setPortfolioData={setPortfolioData}
            onStylePreferenceChange={handleStylePreferenceChange}
          />

          {/* Advanced Settings Section */}
          <Card className="shadow-large border-0 mt-8">
            <CardHeader 
              className={`rounded-t-lg cursor-not-allowed ${showAdvancedSettings ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}
              title="Pro feature - Coming soon!"
              onClick={(e) => {
                e.preventDefault();
                toast({
                  title: "Pro Feature",
                  description: "Advanced settings will be available soon!",
                  variant: "default",
                });
              }}
            >
              <CardTitle className="text-xl font-semibold flex items-center justify-between">
                <span className="flex items-center">
                  <Settings className="h-5 w-5 mr-3" />
                  Advanced Settings
                </span>
                <ChevronDown className={`h-5 w-5 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>

            {showAdvancedSettings && (
              <CardContent className="p-8 space-y-8">
                {/* Custom Color Scheme */}
                <div className="space-y-4">
                  <div className="text-base font-medium">Custom Color Scheme</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['primary', 'secondary', 'accent', 'text'].map((type) => (
                      <div key={type} className="space-y-2">
                        <div className="text-sm flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: customColors[type] }} />
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </div>
                        <input
                          type="color"
                          value={customColors[type]}
                          onChange={(e) => setCustomColors({ ...customColors, [type]: e.target.value })}
                          className="w-full h-10 cursor-pointer"
                        />
                        <Input
                          value={customColors[type]}
                          onChange={(e) => setCustomColors({ ...customColors, [type]: e.target.value })}
                          className="text-xs h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Typography */}
                <div className="space-y-4">
                  <div className="text-base font-medium">Typography</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="text-sm">Font Family</div>
                      <select
                        value={selectedFont}
                        onChange={(e) => setSelectedFont(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-base shadow-soft focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ fontFamily: selectedFont }}
                      >
                        {FONT_OPTIONS.map((font) => (
                          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">Preview</div>
                      <div 
                        className="w-full p-4 rounded-md border border-input bg-background text-base shadow-soft"
                        style={{ fontFamily: selectedFont }}
                      >
                        The quick brown fox jumps over the lazy dog. 1234567890
                      </div>
                    </div>
                  </div>
                </div>

                {/* Layout Structure */}
                <div className="space-y-4">
                  <div className="text-base font-medium">Layout Structure</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {LAYOUT_OPTIONS.map((layout) => (
                      <div 
                        key={layout.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedLayout === layout.value 
                            ? 'border-accent bg-accent/10 ring-2 ring-accent/30' 
                            : 'border-muted hover:border-accent/50'
                        }`}
                        onClick={() => setSelectedLayout(layout.value)}
                      >
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full mr-3 border-2 flex items-center justify-center">
                            {selectedLayout === layout.value && (
                              <div className="w-2 h-2 rounded-full bg-accent" />
                            )}
                          </div>
                          <span className="font-medium">{layout.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Build Button Section */}
          <div className="pt-8 border-t border-border">
            <div className="flex flex-col items-center space-y-4">
              {(isGenerating || isAutoCompleting) && (
                <div className="w-full max-w-md">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>
                      {!isAutoCompleting ? "Generating your portfolio..." : 
                       `Auto-completing (attempt ${autoCompleteAttempt}/2)...`}
                    </span>
                    <span>{Math.round(generationProgress)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-gradient-primary h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    {!isAutoCompleting ? (
                      <>
                        {generationProgress < 30 && "Analyzing your information..."}
                        {generationProgress >= 30 && generationProgress < 60 && "Designing your layout..."}
                        {generationProgress >= 60 && generationProgress < 90 && "Generating content..."}
                        {generationProgress >= 90 && "Finalizing your portfolio..."}
                      </>
                    ) : (
                      <>
                        {generationProgress < 80 && "Completing unfinished sections..."}
                        {generationProgress >= 80 && generationProgress < 95 && "Adding final touches..."}
                        {generationProgress >= 95 && "Almost done..."}
                      </>
                    )}
                  </div>
                  {isAutoCompleting && (
                    <div className="flex items-center justify-center mt-3 text-xs text-accent">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Auto-completing generation automatically
                    </div>
                  )}
                </div>
              )}
              
              <Button
                onClick={handleBuild}
                variant="build"
                size="lg"
                className="px-12 py-4 text-lg"
                disabled={isGenerating || isAutoCompleting || portfolioData.projects.length === 0}
              >
                {(isGenerating || isAutoCompleting) ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {!isAutoCompleting ? "Generating..." : "Auto-completing..."}
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Generate Portfolio with Prism
                  </>
                )}
              </Button>

              {!(isGenerating || isAutoCompleting) && (
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Prism will analyze your information and create a stunning, personalized portfolio website. 
                  {' '}
                  <span className="text-accent font-medium">
                    If generation is incomplete, it will automatically continue until finished.
                  </span>
                </p>
              )}

              {portfolioData.projects.length === 0 && (
                <p className="text-sm text-destructive text-center max-w-md">
                  {fromDashboard ? 
                    'Please select projects from the dashboard before generating your portfolio.' :
                    'Please add at least one project before generating your portfolio.'
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EnhancedMoodboardSection = ({ portfolioData, setPortfolioData, onStylePreferenceChange }) => {
  const [selectedSkeleton, setSelectedSkeleton] = useState('none');
  const [customRequest, setCustomRequest] = useState('');
  const [showSkeletonPreview, setShowSkeletonPreview] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  // Load skeleton options from the imported previews
  const skeletonOptions = [
    {
      id: 'none',
      name: 'No Skeleton',
      description: 'Let Prism create a completely custom design based on your moodboard',
      features: ['100% Custom Prism Design', 'Moodboard-Driven', 'Unique Layout', 'Creative Freedom'],
      color: 'from-purple-500 to-pink-500',
      html: null
    },
    ...getAllSkeletonPreviews()
  ];

  // Suggestion prompts that cycle through
  const suggestionPrompts = [
    "Make it feel premium and expensive, like a luxury brand...",
    "I want a playful, energetic vibe with bright colors...",
    "Keep it minimal and clean, focusing on white space...",
    "Make it edgy and modern with dark themes...",
    "I love retro aesthetics with vintage typography...",
    "Create something warm and inviting, like a cozy cafe...",
    "I want it to feel professional but not boring...",
    "Make it artistic and experimental with bold layouts..."
  ];

  const [currentSuggestion, setCurrentSuggestion] = useState(0);

  // Cycle through suggestions every 3 seconds
  useEffect(() => {
    if (!isTyping && !customRequest) {
      const interval = setInterval(() => {
        setCurrentSuggestion((prev) => (prev + 1) % suggestionPrompts.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isTyping, customRequest]);

  // Handle moodboard image upload
  const handleMoodboardUpload = (files: FileList | null) => {
    if (files) {
      const validFiles = Array.from(files).filter((file: File) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        // Check file type
        if (!validTypes.includes(file.type)) {
          toast({
            title: "Invalid File Type",
            description: `${file.name} is not a valid image format`,
            variant: "destructive",
          });
          return false;
        }
        
        // Check file size (5MB limit)
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

      setPortfolioData(prev => ({
        ...prev,
        moodboardImages: [...prev.moodboardImages, ...validFiles]
      }));
    }
  };

  // Remove moodboard image
  const removeMoodboardImage = (imageIndex: number) => {
    setPortfolioData(prev => ({
      ...prev,
      moodboardImages: prev.moodboardImages.filter((_, i) => i !== imageIndex)
    }));
  };

  // Handle skeleton selection
  const handleSkeletonSelect = (skeletonId: string) => {
    setSelectedSkeleton(skeletonId);
    setPortfolioData(prev => ({
      ...prev,
      selectedSkeleton: skeletonId
    }));
  };

  // Handle custom request input
  const handleCustomRequestChange = (value: string) => {
    setCustomRequest(value);
    setIsTyping(value.length > 0);
    setPortfolioData(prev => ({
      ...prev,
      customDesignRequest: value
    }));
  };

  return (
    <Card className="shadow-large border-0">
      <CardHeader className="bg-gradient-accent text-accent-foreground rounded-t-lg">
        <CardTitle className="text-2xl font-semibold flex items-center">
          <Palette className="h-6 w-6 mr-3" />
          Design Inspiration & Style
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        
        {/* Moodboard Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Visual Inspiration (Moodboard)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload images that represent the style, mood, and aesthetic you want for your portfolio
              </p>
            </div>
            <div className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              {portfolioData.moodboardImages?.length || 0}/8 images
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {portfolioData.moodboardImages?.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden shadow-soft border-2 border-transparent hover:border-accent transition-colors">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Moodboard ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removeMoodboardImage(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {/* Upload Area */}
            {(portfolioData.moodboardImages?.length || 0) < 8 && (
              <label className="aspect-square border-2 border-dashed border-accent/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors bg-accent/10 group">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleMoodboardUpload(e.target.files)}
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-accent mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-accent text-center font-medium">
                  Add Images
                </span>
                <span className="text-xs text-accent/70 text-center mt-1">
                  Max 5MB each
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Skeleton Selection */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-accent" />
              Portfolio Style Foundation
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a skeleton as a starting point (all made by Prism), or let Prism create something completely custom
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skeletonOptions.map((skeleton) => (
              <div
                key={skeleton.id}
                className={`relative cursor-pointer transition-all duration-300 ${
                  selectedSkeleton === skeleton.id
                    ? 'ring-2 ring-accent ring-offset-2 scale-[1.02]'
                    : 'hover:scale-[1.01] hover:shadow-lg'
                }`}
                onClick={() => handleSkeletonSelect(skeleton.id)}
              >
                <Card className="h-full overflow-hidden">
                  {/* Preview Image */}
                  <div className="relative h-32 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${skeleton.color} opacity-80`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {skeleton.name}
                      </span>
                    </div>
                    {selectedSkeleton === skeleton.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-6 w-6 text-white bg-accent rounded-full" />
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h4 className="font-medium text-sm">{skeleton.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {skeleton.description}
                      </p>
                    </div>

                    <div className="space-y-1">
                      {skeleton.features.slice(0, 2).map((feature, idx) => (
                        <div key={idx} className="flex items-center text-xs text-muted-foreground">
                          <div className="w-1 h-1 bg-accent rounded-full mr-2" />
                          {feature}
                        </div>
                      ))}
                      {skeleton.features.length > 2 && (
                        <div className="text-xs text-accent">
                          +{skeleton.features.length - 2} more features
                        </div>
                      )}
                    </div>

                    {skeleton.id !== 'none' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSkeletonPreview(skeleton.id);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Live Preview
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Selected Skeleton Info */}
          {selectedSkeleton !== 'none' && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">
                    {skeletonOptions.find(s => s.id === selectedSkeleton)?.name} Selected
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Prism will use this as a foundation and customize it based on your moodboard and requirements
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Design Request */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Custom Design Request</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Describe any specific design elements, feelings, or styles you want
            </p>
          </div>

          <div className="relative">
            <textarea
              value={customRequest}
              onChange={(e) => handleCustomRequestChange(e.target.value)}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(customRequest.length > 0)}
              placeholder={isTyping || customRequest ? '' : suggestionPrompts[currentSuggestion]}
              className="w-full min-h-[120px] p-4 border border-input rounded-lg bg-background text-base resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              style={{
                lineHeight: '1.6'
              }}
            />
            
            {!isTyping && !customRequest && (
              <div className="absolute top-4 left-4 pointer-events-none">
                <span className="text-muted-foreground/60 italic">
                  {suggestionPrompts[currentSuggestion]}
                </span>
              </div>
            )}

            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {customRequest.length}/500
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Quick suggestions:</span>
            {['Modern & Minimal', 'Bold & Colorful', 'Dark & Edgy', 'Warm & Inviting'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleCustomRequestChange(suggestion + ' aesthetic with ')}
                className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2 py-1 rounded-md transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Modal */}
        {showSkeletonPreview && (
          <SkeletonPreviewModal 
            skeletonId={showSkeletonPreview}
            onClose={() => setShowSkeletonPreview(null)}
          />
        )}
      </CardContent>
    </Card>
  );
};

// Skeleton Preview Modal Component
interface SkeletonPreviewModalProps {
  skeletonId: string;
  onClose: () => void;
}

const SkeletonPreviewModal: React.FC<SkeletonPreviewModalProps> = ({ skeletonId, onClose }) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeSrc, setIframeSrc] = useState<string>('');
  const skeletonPreview = getSkeletonPreview(skeletonId);

  if (!skeletonPreview) {
    return null;
  }

  // Create blob URL only once when component mounts or skeletonId changes
  useEffect(() => {
    const htmlBlob = new Blob([skeletonPreview.html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(htmlBlob);
    setIframeSrc(blobUrl);

    // Cleanup function
    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [skeletonId]); // Only recreate when skeleton changes

  // Don't render iframe until we have a stable URL
  if (!iframeSrc) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg p-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2 text-center">Loading preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-accent/10 to-accent/5">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              {skeletonPreview.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {skeletonPreview.description}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIframeKey(prev => prev + 1)}
              title="Refresh preview"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-[calc(95vh-120px)] w-full border-0">
            <iframe
              key={iframeKey}
              src={iframeSrc}
              className="w-full h-full border-0"
              title={`${skeletonPreview.name} Preview`}
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="lazy"
              onLoad={() => {
                // Optional: Add any post-load logic here
                console.log(`Preview loaded for ${skeletonPreview.name}`);
              }}
            />
          </div>
        </div>

        {/* Footer with Features */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {skeletonPreview.features.map((feature, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center text-xs bg-accent/10 text-accent px-2 py-1 rounded-full"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {feature}
                </span>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="ml-auto"
            >
              Choose This Style
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsForm;