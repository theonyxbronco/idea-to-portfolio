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
  Mail,
  Phone,
  MessageCircle
} from 'lucide-react';

interface Experience {
  duration: string;
  description: string;
}

interface Education {
  duration: string;
  institution: string;
  degree: string;
}

interface PersonalInfo {
  name: string;
  title: string;
  bio: string;
  email: string;
  phone: string;
  linkedin: string;
  instagram: string;
  skills: string[];
  experiences: Experience[];
  education: Education[];
  contactPreference: string;
  websiteUrl: string;
  behanceUrl: string;
  dribbbleUrl: string;
}

const OnboardingFlow = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoaded, isSignedIn } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState('');
  const [selectedContactMethods, setSelectedContactMethods] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [theme, setTheme] = useState('light');
  
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: '',
    title: '',
    bio: '',
    email: '',
    phone: '',
    linkedin: '',
    instagram: '',
    skills: [],
    experiences: [],
    education: [],
    contactPreference: '',
    websiteUrl: '',
    behanceUrl: '',
    dribbbleUrl: ''
  });

  // Check auth and redirect if needed
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in');
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Pre-fill user data if available
  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      setPersonalInfo(prev => ({
        ...prev,
        name: user.fullName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
      }));
    }
  }, [user]);

  // Theme configuration
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

  const creativeTitles = [
    { icon: Palette, title: 'Graphic Designer', desc: 'Visual storytelling & branding' },
    { icon: Camera, title: 'Photographer', desc: 'Capturing moments & emotions' },
    { icon: Monitor, title: 'Web Designer', desc: 'Digital experiences & interfaces' },
    { icon: Paintbrush, title: 'Illustrator', desc: 'Art & creative illustrations' },
    { icon: Edit3, title: 'UI/UX Designer', desc: 'User-centered design' },
    { icon: FolderOpen, title: 'Art Director', desc: 'Creative vision & leadership' },
    { icon: Smartphone, title: 'Product Designer', desc: 'Digital products & apps' },
    { icon: Globe, title: 'Brand Designer', desc: 'Identity & visual systems' },
    { icon: Music, title: 'Motion Designer', desc: 'Animation & motion graphics' },
    { icon: Star, title: 'Creative Director', desc: 'Strategic creative leadership' },
    { icon: Coffee, title: 'Freelancer', desc: 'Independent creative professional' },
    { icon: Target, title: 'Other', desc: 'Something unique' }
  ];

  const skillCategories = {
    'Design Tools': {
      icon: Palette,
      skills: ['Figma', 'Adobe Photoshop', 'Adobe Illustrator', 'Sketch', 'Adobe XD', 'InDesign', 'After Effects']
    },
    'Creative Skills': {
      icon: Sparkles,
      skills: ['Typography', 'Branding', 'Logo Design', 'Color Theory', 'Layout Design', 'Print Design', 'Digital Art']
    },
    'Technical': {
      icon: Monitor,
      skills: ['HTML/CSS', 'JavaScript', 'WordPress', 'Webflow', 'Prototyping', 'User Research', 'Frontend Development']
    },
    'Photography': {
      icon: Camera,
      skills: ['Portrait Photography', 'Product Photography', 'Event Photography', 'Photo Editing', 'Lightroom', 'Studio Lighting']
    },
    'Specialties': {
      icon: Star,
      skills: ['3D Design', 'Motion Graphics', 'Video Editing', 'Illustration', 'Package Design', 'Social Media Design']
    }
  };

  const experienceLevels = [
    { level: 'Just Starting', duration: 'Less than 1 year', icon: Rocket },
    { level: 'Getting There', duration: '1-3 years', icon: Target },
    { level: 'Experienced', duration: '3-7 years', icon: Star },
    { level: 'Expert Level', duration: '7+ years', icon: Crown }
  ];

  const contactMethods = [
    { method: 'Phone', icon: Phone, desc: 'For quick conversations' },
    { method: 'LinkedIn', icon: User, desc: 'Professional networking' },
    { method: 'Instagram', icon: Camera, desc: 'Creative collaborations' },
    { method: 'Other', icon: MessageCircle, desc: 'Tell us your preferred way' }
  ];

  const steps = [
    {
      id: 'theme',
      title: 'Choose your style',
      subtitle: 'Pick a theme that feels right',
      progress: 0
    },
    {
      id: 'welcome',
      title: 'Welcome to Prism',
      subtitle: 'Transform your work into stunning portfolios',
      progress: 12
    },
    {
      id: 'name',
      title: "What's your name?",
      subtitle: 'Let\'s get to know you',
      progress: 24
    },
    {
      id: 'title',
      title: 'What do you create?',
      subtitle: 'Pick what best describes you',
      progress: 36
    },
    {
      id: 'skills',
      title: 'Show us your superpowers',
      subtitle: 'Select the tools and skills you use',
      progress: 48
    },
    {
      id: 'experience',
      title: 'How long have you been creating?',
      subtitle: 'This helps us tailor your portfolio',
      progress: 60
    },
    {
      id: 'contact',
      title: 'How can people reach you?',
      subtitle: 'Share your preferred contact method',
      progress: 72
    },
    {
      id: 'details',
      title: 'Add your contact details',
      subtitle: 'Help people connect with you',
      progress: 84
    },
    {
      id: 'ready',
      title: 'Ready to build magic?',
      subtitle: 'Your portfolio awaits',
      progress: 100
    }
  ];

  const handleStepTransition = (nextStep: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setIsAnimating(false);
    }, 300);
  };

  const handleTitleSelect = (title: string) => {
    setSelectedTitle(title);
    setPersonalInfo(prev => ({ ...prev, title }));
    
    setTimeout(() => {
      handleStepTransition(currentStep + 1);
    }, 800);
  };

  const handleSkillToggle = (skill: string) => {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    
    setSelectedSkills(newSkills);
    setPersonalInfo(prev => ({ ...prev, skills: newSkills }));
  };

  const handleExperienceSelect = (level: string, duration: string) => {
    setSelectedExperienceLevel(level);
    setPersonalInfo(prev => ({
      ...prev,
      experiences: [{ duration, description: level }]
    }));
    
    setTimeout(() => {
      handleStepTransition(currentStep + 1);
    }, 800);
  };

  const handleContactMethodSelect = (method: string) => {
    if (selectedContactMethods.includes(method)) {
      // Remove method if already selected
      setSelectedContactMethods(prev => prev.filter(m => m !== method));
    } else {
      // Add method to selection
      setSelectedContactMethods(prev => [...prev, method]);
    }
    
    // Update contact preference to be a comma-separated list
    const updatedMethods = selectedContactMethods.includes(method) 
      ? selectedContactMethods.filter(m => m !== method)
      : [...selectedContactMethods, method];
    
    setPersonalInfo(prev => ({ 
      ...prev, 
      contactPreference: updatedMethods.join(', ') 
    }));
  };

  const saveUserInfo = async (userInfo: PersonalInfo) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/save-user-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalInfo: userInfo,
          userEmail: userInfo.email,
          tier: 'Free' // Default tier for new users
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving user info:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Save user information to backend
      await saveUserInfo(personalInfo);
      
      toast({
        title: "🎉 Profile Created!",
        description: "Let's add your first project to showcase your work!",
      });
      
      // Navigate to projects page to add first project
      setTimeout(() => {
        navigate('/projects');
      }, 1500);
    } catch (error) {
      console.error('Error saving user info:', error);
      toast({
        title: "Oops! Something went wrong",
        description: "Let's try that again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderThemeSelector = () => (
    <div className="text-center space-y-8 h-[calc(100vh-200px)] flex flex-col justify-center">
      <div className="space-y-6">
        <h1 className="text-4xl xl:text-5xl font-light leading-tight" style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
          Choose your style
        </h1>
        
        <div className="flex gap-6 justify-center">
          {/* Light Theme */}
          <button
            onClick={() => {
              setTheme('light');
              setTimeout(() => handleStepTransition(1), 500);
            }}
            className={`w-[142px] h-[108px] sm:w-[244px] sm:h-[186px] transition-all duration-200 group border-2 rounded-2xl overflow-hidden ${
              theme === 'light' ? 'border-[#06070A] ring-2 ring-[#06070A]/20' : 'border-gray-200 hover:border-[#06070A]'
            }`}
          >
            <div className="relative h-full bg-white">
              <div className="absolute inset-4 bg-[#FFFEEA] rounded-lg border border-gray-200">
                <div className="p-3 space-y-2">
                  <div className="h-1.5 bg-[#06070A] rounded w-8"></div>
                  <div className="space-y-1">
                    <div className="h-1 bg-gray-300 rounded w-12"></div>
                    <div className="h-1 bg-gray-300 rounded w-8"></div>
                    <div className="h-1 bg-gray-300 rounded w-10"></div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3">
                <p className="text-sm font-light text-[#06070A]">Light</p>
              </div>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            onClick={() => {
              setTheme('dark');
              setTimeout(() => handleStepTransition(1), 500);
            }}
            className={`w-[142px] h-[108px] sm:w-[244px] sm:h-[186px] transition-all duration-200 group border-2 rounded-2xl overflow-hidden ${
              theme === 'dark' ? 'border-[#06070A] ring-2 ring-[#06070A]/20' : 'border-gray-200 hover:border-[#06070A]'
            }`}
          >
            <div className="relative h-full bg-white">
              <div className="absolute inset-4 bg-[#06070A] rounded-lg border border-gray-800">
                <div className="p-3 space-y-2">
                  <div className="h-1.5 bg-[#FFFEEA] rounded w-8"></div>
                  <div className="space-y-1">
                    <div className="h-1 bg-gray-600 rounded w-12"></div>
                    <div className="h-1 bg-gray-600 rounded w-8"></div>
                    <div className="h-1 bg-gray-600 rounded w-10"></div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3">
                <p className="text-sm font-light text-[#06070A]">Dark</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Theme Selection
        return renderThemeSelector();

      case 1: // Welcome
        return (
          <div className="text-center space-y-12 h-[calc(100vh-200px)] flex flex-col justify-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className={`text-5xl xl:text-6xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                  Welcome to Prism
                </h1>
                <h2 className={`text-lg xl:text-xl font-light max-w-3xl mx-auto leading-relaxed ${currentTheme.textSecondary}`}>
                  Upload your projects. Choose your vibe. Get a portfolio in minutes.
                </h2>
              </div>
              
              <div className="flex justify-center items-center gap-6 text-sm opacity-60">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className={currentTheme.textSecondary}>AI-powered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className={currentTheme.textSecondary}>Moodboard driven</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className={currentTheme.textSecondary}>5-minute deploy</span>
                </div>
              </div>
              
              <div className="pt-6">
                <div 
                  className="group cursor-pointer inline-block" 
                  onClick={() => handleStepTransition(2)}
                >
                  <div className={`inline-flex items-center space-x-3 px-12 py-8 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                    <span className="text-xl font-light">Let's Get Started</span>
                    <Play className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Name
        return (
          <div className="text-center space-y-8 max-w-2xl mx-auto h-[calc(100vh-200px)] flex flex-col justify-center">
            <div className="space-y-4">
              <h1 className={`text-4xl xl:text-5xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                What's your name?
              </h1>
              <h2 className={`text-lg font-light leading-relaxed ${currentTheme.textSecondary}`}>
                This is how you'll be credited on your portfolio
              </h2>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <Input
                  value={personalInfo.name}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                  className={`h-16 text-xl text-center border-0 border-b-2 ${currentTheme.border} rounded-none bg-transparent focus:border-current focus:ring-0 transition-all duration-200 ${currentTheme.textTertiary}`}
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: theme === 'light' ? '#06070A20' : '#FFFEEA20'
                  }}
                  autoFocus
                />
              </div>
              
              {personalInfo.name.trim() && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div 
                    className="group cursor-pointer inline-block"
                    onClick={() => handleStepTransition(3)}
                  >
                    <div className={`inline-flex items-center space-x-3 px-8 py-4 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                      <span className="text-lg font-light">Nice to meet you, {personalInfo.name.split(' ')[0]}!</span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3: // Title Selection
        return (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                What do you<br />
                create?
              </h1>
              <h2 className={`text-base font-light ${currentTheme.textSecondary}`}>
                Pick what best describes your creative work
              </h2>
            </div>

            <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
              {creativeTitles.map((item, index) => (
                <div 
                  key={item.title}
                  className={`p-3 text-center border rounded-xl cursor-pointer transition-all duration-300 will-change-transform hover:scale-105 group ${
                    selectedTitle === item.title 
                      ? theme === 'light'
                        ? 'bg-[#06070A] text-[#FFFEEA] border-[#06070A] shadow-xl scale-105'
                        : 'bg-[#FFFEEA] text-[#06070A] border-[#FFFEEA] shadow-xl scale-105'
                      : theme === 'light'
                      ? 'bg-white text-[#06070A] border-[#06070A]/10 hover:bg-[#06070A]/5'
                      : 'bg-[#06070A] text-[#FFFEEA] border-[#FFFEEA]/20 hover:bg-[#FFFEEA]/5'
                  }`}
                  onClick={() => handleTitleSelect(item.title)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="space-y-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-all duration-200 ${
                      selectedTitle === item.title 
                        ? theme === 'light' 
                          ? 'bg-[#FFFEEA]/20' 
                          : 'bg-[#06070A]/20'
                        : theme === 'light'
                        ? 'bg-[#06070A]/10 group-hover:bg-[#06070A]/20'
                        : 'bg-[#FFFEEA]/10 group-hover:bg-[#FFFEEA]/20'
                    }`}>
                      <item.icon className={`h-3 w-3 ${
                        selectedTitle === item.title 
                          ? theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'
                          : theme === 'light' ? 'text-[#06070A]' : 'text-[#FFFEEA]'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-xs font-light mb-1">{item.title}</h3>
                      <p className={`text-xs ${
                        selectedTitle === item.title 
                          ? theme === 'light' ? 'text-[#FFFEEA]/80' : 'text-[#06070A]/80'
                          : theme === 'light' ? 'text-[#06070A]/60' : 'text-[#FFFEEA]/60'
                      }`}>
                        {item.desc}
                      </p>
                    </div>
                    {selectedTitle === item.title && (
                      <div className="animate-in zoom-in-50 duration-200">
                        <Check className={`h-3 w-3 mx-auto ${theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'}`} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4: // Skills
        return (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                Show us your<br />
                superpowers
              </h1>
              <h2 className={`text-base font-light ${currentTheme.textSecondary}`}>
                Select the tools and skills you use (choose as many as you like)
              </h2>
              {selectedSkills.length > 0 && (
                <p className={`text-sm ${currentTheme.textSecondary}`}>
                  {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {Object.entries(skillCategories).map(([category, { icon: Icon, skills }]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-3 justify-center">
                    <div className={`w-6 h-6 ${theme === 'light' ? 'bg-[#06070A]/10' : 'bg-[#FFFEEA]/10'} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-3 w-3 ${currentTheme.text}`} />
                    </div>
                    <h3 className={`font-light text-sm ${currentTheme.text}`}>{category}</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {skills.map((skill) => (
                      <Button
                        key={skill}
                        variant={selectedSkills.includes(skill) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSkillToggle(skill)}
                        className={`transition-all duration-200 border font-light text-xs py-1 px-2 h-auto ${
                          selectedSkills.includes(skill)
                            ? `${currentTheme.primary} ${currentTheme.primaryText} shadow-lg scale-105 hover:scale-110`
                            : theme === 'light'
                            ? 'bg-[#FFFEEA] text-[#06070A] border-[#06070A]/20 hover:bg-[#06070A] hover:text-[#FFFEEA] hover:scale-105 shadow-sm hover:shadow-md'
                            : 'bg-[#06070A] text-[#FFFEEA] border-[#FFFEEA]/20 hover:bg-[#FFFEEA] hover:text-[#06070A] hover:scale-105 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {selectedSkills.includes(skill) && (
                          <Check className="h-2.5 w-2.5 mr-1" />
                        )}
                        <span>{skill}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedSkills.length > 0 && (
              <div className="text-center pt-4 animate-in slide-in-from-bottom-4 duration-500">
                <div
                  className="group cursor-pointer inline-block"
                  onClick={() => handleStepTransition(5)}
                >
                  <div className={`inline-flex items-center space-x-3 px-6 py-3 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                    <span className="text-base font-light">Continue with {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 5: // Experience Level
        return (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                How long have you<br />
                been creating?
              </h1>
              <h2 className={`text-base font-light ${currentTheme.textSecondary}`}>
                This helps us tailor your portfolio to your experience level
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
              {experienceLevels.map((item, index) => (
                <div 
                  key={item.level}
                  className={`p-6 text-center border rounded-xl cursor-pointer transition-all duration-300 will-change-transform hover:scale-105 group ${
                    selectedExperienceLevel === item.level 
                      ? theme === 'light'
                        ? 'bg-[#06070A] text-[#FFFEEA] border-[#06070A] shadow-xl scale-105'
                        : 'bg-[#FFFEEA] text-[#06070A] border-[#FFFEEA] shadow-xl scale-105'
                      : theme === 'light'
                      ? 'bg-white text-[#06070A] border-[#06070A]/10 hover:bg-[#06070A]/5 shadow-sm hover:shadow-md'
                      : 'bg-[#06070A] text-[#FFFEEA] border-[#FFFEEA]/20 hover:bg-[#FFFEEA]/5 shadow-sm hover:shadow-md'
                  }`}
                  onClick={() => handleExperienceSelect(item.level, item.duration)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                      selectedExperienceLevel === item.level 
                        ? theme === 'light' 
                          ? 'bg-[#FFFEEA]/20' 
                          : 'bg-[#06070A]/20'
                        : theme === 'light'
                        ? 'bg-[#06070A]/10'
                        : 'bg-[#FFFEEA]/10'
                    }`}>
                      <item.icon className={`h-6 w-6 ${
                        selectedExperienceLevel === item.level 
                          ? theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'
                          : theme === 'light' ? 'text-[#06070A]' : 'text-[#FFFEEA]'
                      }`} />
                    </div>
                    <h3 className="text-lg font-light">{item.level}</h3>
                    <p className={`text-sm font-light ${
                      selectedExperienceLevel === item.level 
                        ? theme === 'light' ? 'text-[#FFFEEA]/80' : 'text-[#06070A]/80'
                        : theme === 'light' ? 'text-[#06070A]/60' : 'text-[#FFFEEA]/60'
                    }`}>
                      {item.duration}
                    </p>
                    {selectedExperienceLevel === item.level && (
                      <div className="animate-in zoom-in-50 duration-300">
                        <Check className={`h-5 w-5 mx-auto ${theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'}`} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 6: // Contact Method
        return (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                How can people<br />
                reach you?
              </h1>
              <h2 className={`text-base font-light ${currentTheme.textSecondary}`}>
                Select all the ways people can connect with you
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {contactMethods.map((item, index) => (
                <div key={item.method}>
                  <div 
                    className={`p-4 text-center border rounded-xl cursor-pointer transition-all duration-300 will-change-transform hover:scale-105 group ${
                      selectedContactMethods.includes(item.method)
                        ? theme === 'light'
                          ? 'bg-[#06070A] text-[#FFFEEA] border-[#06070A] shadow-xl scale-105'
                          : 'bg-[#FFFEEA] text-[#06070A] border-[#FFFEEA] shadow-xl scale-105'
                        : theme === 'light'
                        ? 'bg-white text-[#06070A] border-[#06070A]/10 hover:bg-[#06070A]/5 shadow-sm hover:shadow-md'
                        : 'bg-[#06070A] text-[#FFFEEA] border-[#FFFEEA]/20 hover:bg-[#FFFEEA]/5 shadow-sm hover:shadow-md'
                    }`}
                    onClick={() => handleContactMethodSelect(item.method)}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="space-y-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${
                        selectedContactMethods.includes(item.method)
                          ? theme === 'light' 
                            ? 'bg-[#FFFEEA]/20' 
                            : 'bg-[#06070A]/20'
                          : theme === 'light'
                          ? 'bg-[#06070A]/10'
                          : 'bg-[#FFFEEA]/10'
                      }`}>
                        <item.icon className={`h-5 w-5 ${
                          selectedContactMethods.includes(item.method)
                            ? theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'
                            : theme === 'light' ? 'text-[#06070A]' : 'text-[#FFFEEA]'
                        }`} />
                      </div>
                      <h3 className="text-sm font-light">{item.method}</h3>
                      <p className={`text-xs font-light ${
                        selectedContactMethods.includes(item.method)
                          ? theme === 'light' ? 'text-[#FFFEEA]/80' : 'text-[#06070A]/80'
                          : theme === 'light' ? 'text-[#06070A]/60' : 'text-[#FFFEEA]/60'
                      }`}>
                        {item.desc}
                      </p>
                      {selectedContactMethods.includes(item.method) && (
                        <div className="animate-in zoom-in-50 duration-300">
                          <Check className={`h-4 w-4 mx-auto ${theme === 'light' ? 'text-[#FFFEEA]' : 'text-[#06070A]'}`} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Input Fields - Show for each selected method */}
            {selectedContactMethods.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                {selectedContactMethods.map((method) => (
                  <div key={method} className="space-y-2">
                    <label className={`text-sm font-light ${currentTheme.text} block`}>
                      {method === 'Phone' && '📱 Enter your phone number'}
                      {method === 'LinkedIn' && '💼 Enter your LinkedIn profile URL'}
                      {method === 'Instagram' && '📸 Enter your Instagram handle'}
                      {method === 'Other' && '💬 Tell us how people can reach you'}
                    </label>
                    {method === 'Other' ? (
                      <Textarea
                        value={personalInfo.dribbbleUrl} // Using dribbbleUrl field to store "other" contact method
                        onChange={(e) => {
                          setPersonalInfo(prev => ({ ...prev, dribbbleUrl: e.target.value }));
                        }}
                        placeholder="e.g., Behance profile, Discord username, carrier pigeon..."
                        className={`border ${currentTheme.border} focus:border-current focus:ring-0 rounded-lg min-h-[80px] resize-none`}
                      />
                    ) : (
                      <Input
                        type={method === 'Phone' ? 'tel' : method === 'LinkedIn' ? 'url' : 'text'}
                        value={
                          method === 'Phone' ? personalInfo.phone :
                          method === 'LinkedIn' ? personalInfo.linkedin :
                          method === 'Instagram' ? personalInfo.instagram : ''
                        }
                        onChange={(e) => {
                          if (method === 'Phone') {
                            setPersonalInfo(prev => ({ ...prev, phone: e.target.value }));
                          } else if (method === 'LinkedIn') {
                            setPersonalInfo(prev => ({ ...prev, linkedin: e.target.value }));
                          } else if (method === 'Instagram') {
                            setPersonalInfo(prev => ({ ...prev, instagram: e.target.value }));
                          }
                        }}
                        placeholder={
                          method === 'Phone' ? '+1 (555) 123-4567' :
                          method === 'LinkedIn' ? 'https://linkedin.com/in/yourname' :
                          method === 'Instagram' ? '@yourusername' : ''
                        }
                        className={`border ${currentTheme.border} focus:border-current focus:ring-0 rounded-lg`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Continue Button */}
            {selectedContactMethods.length > 0 && (
              <div className="text-center pt-4 animate-in slide-in-from-bottom-4 duration-500">
                <div
                  className="group cursor-pointer inline-block"
                  onClick={() => {
                    // Check if all selected methods have corresponding values
                    const allFieldsFilled = selectedContactMethods.every(method => {
                      if (method === 'Phone') return personalInfo.phone.trim();
                      if (method === 'LinkedIn') return personalInfo.linkedin.trim();
                      if (method === 'Instagram') return personalInfo.instagram.trim();
                      if (method === 'Other') return personalInfo.dribbbleUrl.trim();
                      return false;
                    });
                    
                    if (allFieldsFilled) {
                      handleStepTransition(7);
                    }
                  }}
                >
                  <div className={`inline-flex items-center space-x-3 px-6 py-3 border ${currentTheme.border} rounded-full transition-all duration-200 ${
                    // Only enable if all selected methods have values
                    selectedContactMethods.every(method => {
                      if (method === 'Phone') return personalInfo.phone.trim();
                      if (method === 'LinkedIn') return personalInfo.linkedin.trim();
                      if (method === 'Instagram') return personalInfo.instagram.trim();
                      if (method === 'Other') return personalInfo.dribbbleUrl.trim();
                      return false;
                    })
                      ? `${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg cursor-pointer`
                      : `${currentTheme.border} ${currentTheme.textTertiary} cursor-not-allowed opacity-50`
                  }`}>
                    <span className="text-base font-light">
                      Continue with {selectedContactMethods.length} contact method{selectedContactMethods.length !== 1 ? 's' : ''}
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 7: // Contact Details (simplified - removed redundant fields)
        return (
          <div className="space-y-8 max-w-4xl mx-auto py-8">
            <div className="text-center space-y-4">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                Tell us about<br />
                yourself
              </h1>
              <h2 className={`text-base font-light ${currentTheme.textSecondary}`}>
                Share a bit about your creative journey
              </h2>
            </div>

            <div className="space-y-6">
              {/* Bio */}
              <div className="space-y-2">
                <label className={`text-sm font-light ${currentTheme.text}`}>Brief Bio</label>
                <Textarea
                  value={personalInfo.bio}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell people a bit about yourself and your work..."
                  className={`min-h-[100px] border ${currentTheme.border} focus:border-current focus:ring-0 rounded-lg resize-none`}
                  maxLength={300}
                />
                <p className={`text-xs ${currentTheme.textSecondary}`}>
                  {personalInfo.bio.length}/300 characters
                </p>
              </div>

              {/* Optional Additional Contact Info */}
              <div className="space-y-4">
                <h3 className={`text-sm font-light ${currentTheme.text} text-center`}>
                  Optional: Add more ways to connect
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Only show fields that weren't already filled in the previous step */}
                  {!selectedContactMethods.includes('Phone') && (
                    <div className="space-y-2">
                      <label className={`text-sm font-light ${currentTheme.text}`}>Phone Number</label>
                      <Input
                        type="tel"
                        value={personalInfo.phone}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        className={`border ${currentTheme.border} focus:border-current focus:ring-0 rounded-lg`}
                      />
                    </div>
                  )}

                  {!selectedContactMethods.includes('LinkedIn') && (
                    <div className="space-y-2">
                      <label className={`text-sm font-light ${currentTheme.text}`}>LinkedIn Profile</label>
                      <Input
                        type="url"
                        value={personalInfo.linkedin}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, linkedin: e.target.value }))}
                        placeholder="https://linkedin.com/in/yourname"
                        className={`border ${currentTheme.border} focus:border-current focus:ring-0 rounded-lg`}
                      />
                    </div>
                  )}

                  {!selectedContactMethods.includes('Instagram') && (
                    <div className="space-y-2">
                      <label className={`text-sm font-light ${currentTheme.text}`}>Instagram Handle</label>
                      <Input
                        type="text"
                        value={personalInfo.instagram}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, instagram: e.target.value }))}
                        placeholder="@yourusername"
                        className={`border ${currentTheme.border} focus:border-current focus:ring-0 rounded-lg`}
                      />
                    </div>
                  )}

                  {/* Behance */}
                  <div className="space-y-2">
                    <label className={`text-sm font-light ${currentTheme.text}`}>Behance Profile</label>
                    <Input
                      type="url"
                      value={personalInfo.behanceUrl}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, behanceUrl: e.target.value }))}
                      placeholder="https://behance.net/yourname"
                      className={`border ${currentTheme.border} focus:border-current focus:ring-0 rounded-lg`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-4">
              <div
                className="group cursor-pointer inline-block"
                onClick={() => handleStepTransition(8)}
              >
                <div className={`inline-flex items-center space-x-3 px-6 py-3 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                  <span className="text-base font-light">Almost Done!</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        );

      case 8: // Ready
        return (
          <div className="text-center space-y-8 py-4">
            <div className="space-y-4">
              <h1 className={`text-3xl xl:text-4xl font-light leading-tight ${currentTheme.text}`} style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
                Ready to<br />
                build magic?
              </h1>
              <h2 className={`text-base font-light max-w-2xl mx-auto ${currentTheme.textSecondary}`}>
                Perfect! We have everything we need to create your stunning portfolio.
              </h2>
              
              <div className={`${currentTheme.card} ${currentTheme.cardBorder} rounded-2xl p-6 border shadow-lg max-w-xl mx-auto`}>
                <h3 className={`text-lg font-light mb-4 ${currentTheme.text}`}>Your Creative Profile</h3>
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <User className={`h-4 w-4 ${currentTheme.textSecondary}`} />
                    <span className={`font-light text-sm ${currentTheme.text}`}>{personalInfo.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className={`h-4 w-4 ${currentTheme.textSecondary}`} />
                    <span className={`font-light text-sm ${currentTheme.textSecondary}`}>{selectedTitle}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles className={`h-4 w-4 ${currentTheme.textSecondary}`} />
                    <span className={`font-light text-sm ${currentTheme.textSecondary}`}>{selectedSkills.length} skills selected</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className={`h-4 w-4 ${currentTheme.textSecondary}`} />
                    <span className={`font-light text-sm ${currentTheme.textSecondary}`}>{selectedExperienceLevel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageCircle className={`h-4 w-4 ${currentTheme.textSecondary}`} />
                    <span className={`font-light text-sm ${currentTheme.textSecondary}`}>
                      Contact via: {selectedContactMethods.join(', ')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="pt-6">
                <div
                  className="group cursor-pointer inline-block"
                  onClick={handleSubmit}
                >
                  <div className={`inline-flex items-center space-x-3 px-8 py-4 border ${currentTheme.border} rounded-full transition-all duration-200 ${currentTheme.primary} ${currentTheme.primaryText} group-hover:scale-105 shadow-lg`}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-base font-light">Setting up your workspace...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-light">Start Adding Your Projects</span>
                        <Rocket className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
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

  // Progress Bubbles Component
  const ProgressBubbles = () => (
    <div className="fixed left-0 right-0 bottom-2 md:bottom-8 h-4 xl:h-10">
      <div className="flex justify-center items-center gap-2">
        {steps.map((step, index) => (
          <div
            key={index}
            onClick={() => {
              // Allow clicking to go back to previous steps only
              if (index < currentStep) {
                handleStepTransition(index);
              }
            }}
            className={`rounded-full transition-all duration-300 ${
              index < currentStep ? 'cursor-pointer hover:scale-110' : ''
            } ${
              index === currentStep
                ? `w-5 h-2 ${currentTheme.primary}` // Active bubble - wider
                : index < currentStep
                ? `w-2 h-2 ${currentTheme.primary} opacity-60` // Completed bubbles
                : `w-2 h-2 ${currentTheme.primary} opacity-20` // Future bubbles
            }`}
            style={{
              opacity: index === currentStep ? 1 : index < currentStep ? 0.6 : 0.2
            }}
          />
        ))}
      </div>
    </div>
  );

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${currentTheme.bg}`}>
      {/* Subtle noise effect */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />

      {/* Header Progress Bar - Hide on theme selection step */}
      {currentStep > 0 && (
        <div className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b transition-colors duration-500 ${currentTheme.bg}/95 ${currentTheme.border}`}>
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`text-xs font-light ${currentTheme.textSecondary}`}>
                {currentStep} of {steps.length - 1}
              </div>
              <div className={`text-xs font-light ${currentTheme.textSecondary}`}>
                {steps[currentStep].subtitle}
              </div>
            </div>
            <div className={`w-full rounded-full h-1 ${theme === 'light' ? 'bg-[#06070A]/10' : 'bg-[#FFFEEA]/10'}`}>
              <div 
                className={`h-1 rounded-full transition-all duration-500 ease-out ${currentTheme.primary.replace('bg-', 'bg-')}`}
                style={{ width: `${steps[currentStep].progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`container mx-auto px-6 ${currentStep > 0 ? 'pt-20 pb-20' : 'py-4'}`}>
        <div className="max-w-6xl mx-auto min-h-[calc(100vh-160px)] flex flex-col justify-center">
          <div className={`transition-all duration-200 ease-out ${isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
            {renderStepContent()}
          </div>

          {/* Navigation - Back button on all steps except theme selection */}
          {currentStep > 0 && (
            <div className="fixed bottom-6 left-6 z-40">
              <div 
                className="group cursor-pointer"
                onClick={() => handleStepTransition(currentStep - 1)}
              >
                <div className={`inline-flex items-center space-x-2 px-4 py-2 backdrop-blur-sm border rounded-full transition-all duration-200 group-hover:scale-105 shadow-sm ${currentTheme.card}/90 ${currentTheme.cardBorder} ${currentTheme.hover}`}>
                  <ArrowLeft className={`h-4 w-4 transition-transform group-hover:-translate-x-1 ${currentTheme.text}`} />
                  <span className={`font-light text-sm ${currentTheme.text}`}>Back</span>
                </div>
              </div>
            </div>
          )}

          {/* Theme Toggle - Available after theme selection */}
          {currentStep > 0 && (
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
          )}
        </div>
      </div>

      {/* Progress Bubbles */}
      <ProgressBubbles />
    </div>
  );
};

export default OnboardingFlow;                      