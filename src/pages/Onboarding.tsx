import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/clerk-react';
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
  Play
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
}

const OnboardingFlow = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: user?.fullName || '',
    title: '',
    bio: '',
    email: user?.primaryEmailAddress?.emailAddress || '',
    phone: '',
    linkedin: '',
    instagram: '',
    skills: [],
    experiences: [],
    education: []
  });

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
    { level: 'Just Starting', duration: 'Less than 1 year', icon: Rocket, color: 'from-green-400 to-blue-500' },
    { level: 'Getting There', duration: '1-3 years', icon: Target, color: 'from-blue-400 to-purple-500' },
    { level: 'Experienced', duration: '3-7 years', icon: Star, color: 'from-purple-400 to-pink-500' },
    { level: 'Expert Level', duration: '7+ years', icon: Crown, color: 'from-yellow-400 to-red-500' }
  ];

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Prism',
      subtitle: 'Transform your work into stunning portfolios',
      progress: 0
    },
    {
      id: 'name',
      title: "What's your name?",
      subtitle: 'Let\'s get to know you',
      progress: 20
    },
    {
      id: 'title',
      title: 'What do you create?',
      subtitle: 'Pick what best describes you',
      progress: 40
    },
    {
      id: 'skills',
      title: 'Show us your superpowers',
      subtitle: 'Select the tools and skills you use',
      progress: 60
    },
    {
      id: 'experience',
      title: 'How long have you been creating?',
      subtitle: 'This helps us tailor your portfolio',
      progress: 80
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
    
    // Auto-advance after selection with a nice delay
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
    
    // Auto-advance after selection
    setTimeout(() => {
      handleStepTransition(currentStep + 1);
    }, 800);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/save-user-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalInfo,
          userEmail: user?.primaryEmailAddress?.emailAddress
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "🎉 Welcome to Prism!",
          description: "Let's create your first stunning portfolio!",
        });
        
        // Smooth transition to projects
        setTimeout(() => {
          window.location.href = '/projects';
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to save information');
      }
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="text-center space-y-12">
            <div className="relative">
              <div className="w-40 h-40 bg-gradient-to-r from-primary/20 to-primary/30 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Palette className="h-20 w-20 text-primary" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/20 rounded-full blur-3xl animate-pulse"></div>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-6xl font-semibold text-primary">
                Welcome to Prism
              </h1>
              <p className="text-2xl font-medium text-primary opacity-80 max-w-3xl mx-auto">
                Upload your projects. Choose your vibe. Get a portfolio in minutes.
              </p>
              
              <div className="flex justify-center items-center gap-6 text-sm text-primary opacity-60">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>AI-powered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Moodboard driven</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>5-minute deploy</span>
                </div>
              </div>
              
              <div className="pt-8">
                <Button
                  onClick={() => handleStepTransition(1)}
                  size="lg"
                  className="text-xl px-12 py-8 bg-primary hover:bg-primary/90 shadow-elegant hover:shadow-glow transition-all duration-300 transform hover:scale-105"
                >
                  Let's Get Started
                  <Play className="ml-3 h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 1: // Name
        return (
          <div className="text-center space-y-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-8">
                <User className="h-12 w-12 text-primary-foreground" />
              </div>
              <h2 className="text-4xl font-semibold text-primary">What's your name?</h2>
              <p className="text-lg text-primary opacity-60">This is how you'll be credited on your portfolio</p>
            </div>

            <div className="space-y-6">
              <Input
                value={personalInfo.name}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                className="h-16 text-xl text-center border-0 shadow-elegant bg-gradient-card focus:ring-2 focus:ring-primary/50 transition-all"
                autoFocus
              />
              
              {personalInfo.name.trim() && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <Button
                    onClick={() => handleStepTransition(2)}
                    size="lg"
                    className="px-8 py-4 bg-primary hover:bg-primary/90 shadow-elegant hover:shadow-glow transition-all duration-300"
                  >
                    Nice to meet you, {personalInfo.name.split(' ')[0]}!
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 2: // Title Selection
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-semibold text-primary">What do you create?</h2>
              <p className="text-lg text-primary opacity-60">Pick what best describes your creative work</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {creativeTitles.map((item, index) => (
                <Card 
                  key={item.title}
                  className={`cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-glow border-0 shadow-elegant ${
                    selectedTitle === item.title 
                      ? 'bg-gradient-primary text-primary-foreground shadow-glow scale-105' 
                      : 'bg-gradient-card hover:shadow-lg'
                  }`}
                  onClick={() => handleTitleSelect(item.title)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6 text-center space-y-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                      selectedTitle === item.title 
                        ? 'bg-white/20' 
                        : 'bg-primary/10'
                    }`}>
                      <item.icon className={`h-6 w-6 ${
                        selectedTitle === item.title 
                          ? 'text-white' 
                          : 'text-primary'
                      }`} />
                    </div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className={`text-xs ${
                      selectedTitle === item.title 
                        ? 'text-white/80' 
                        : 'text-primary/60'
                    }`}>
                      {item.desc}
                    </p>
                    {selectedTitle === item.title && (
                      <div className="animate-in zoom-in-50 duration-300">
                        <Check className="h-5 w-5 text-white mx-auto" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3: // Skills
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-semibold text-primary">Show us your superpowers</h2>
              <p className="text-lg text-primary opacity-60">
                Select the tools and skills you use (choose as many as you like)
              </p>
              {selectedSkills.length > 0 && (
                <p className="text-sm text-primary/80">
                  {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="space-y-6">
              {Object.entries(skillCategories).map(([category, { icon: Icon, skills }]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-primary">{category}</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <Button
                        key={skill}
                        variant={selectedSkills.includes(skill) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSkillToggle(skill)}
                        className={`transition-all duration-200 ${
                          selectedSkills.includes(skill)
                            ? 'bg-primary text-primary-foreground shadow-lg scale-105 hover:scale-110'
                            : 'hover:scale-105 bg-gradient-card border-0 shadow-soft hover:shadow-elegant'
                        }`}
                      >
                        {selectedSkills.includes(skill) && (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        {skill}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedSkills.length > 0 && (
              <div className="text-center pt-6 animate-in slide-in-from-bottom-4 duration-500">
                <Button
                  onClick={() => handleStepTransition(4)}
                  size="lg"
                  className="px-8 py-4 bg-primary hover:bg-primary/90 shadow-elegant hover:shadow-glow transition-all duration-300"
                >
                  Continue with {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        );

      case 4: // Experience Level
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-semibold text-primary">How long have you been creating?</h2>
              <p className="text-lg text-primary opacity-60">This helps us tailor your portfolio to your experience level</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {experienceLevels.map((item, index) => (
                <Card 
                  key={item.level}
                  className={`cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-glow border-0 shadow-elegant ${
                    selectedExperienceLevel === item.level 
                      ? 'bg-gradient-primary text-primary-foreground shadow-glow scale-105' 
                      : 'bg-gradient-card hover:shadow-lg'
                  }`}
                  onClick={() => handleExperienceSelect(item.level, item.duration)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-8 text-center space-y-4">
                    <div className={`w-16 h-16 bg-gradient-to-r ${item.color} rounded-full flex items-center justify-center mx-auto`}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">{item.level}</h3>
                    <p className={`text-sm ${
                      selectedExperienceLevel === item.level 
                        ? 'text-white/80' 
                        : 'text-primary/60'
                    }`}>
                      {item.duration}
                    </p>
                    {selectedExperienceLevel === item.level && (
                      <div className="animate-in zoom-in-50 duration-300">
                        <Check className="h-6 w-6 text-white mx-auto" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 5: // Ready
        return (
          <div className="text-center space-y-12">
            <div className="relative">
              <div className="w-40 h-40 bg-gradient-to-r from-green-400/20 to-primary/30 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Rocket className="h-20 w-20 text-primary" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-primary/20 rounded-full blur-3xl animate-pulse"></div>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl font-semibold text-primary">
                Ready to build magic?
              </h1>
              <p className="text-xl text-primary opacity-80 max-w-2xl mx-auto">
                Perfect! We have everything we need to create your stunning portfolio.
              </p>
              
              <div className="bg-gradient-card rounded-2xl p-8 border-0 shadow-elegant max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold text-primary mb-6">Your Creative Profile</h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary/60" />
                    <span className="text-primary font-medium">{personalInfo.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-primary/60" />
                    <span className="text-primary/80">{selectedTitle}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary/60" />
                    <span className="text-primary/80">{selectedSkills.length} skills selected</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-primary/60" />
                    <span className="text-primary/80">{selectedExperienceLevel}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-8">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="lg"
                  className="text-xl px-12 py-8 bg-primary hover:bg-primary/90 shadow-elegant hover:shadow-glow transition-all duration-300 transform hover:scale-105"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                      Setting up your workspace...
                    </>
                  ) : (
                    <>
                      Start Creating Your Portfolio
                      <Rocket className="ml-3 h-6 w-6" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="relative z-10">
        {/* Progress Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-primary/10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-primary">
                {currentStep + 1} of {steps.length}
              </div>
              <div className="text-sm text-primary/60">
                {steps[currentStep].subtitle}
              </div>
            </div>
            <div className="w-full bg-primary/10 rounded-full h-2">
              <div 
                className="bg-gradient-primary h-2 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${steps[currentStep].progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-6xl mx-auto">
            <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform translate-y-8' : 'opacity-100 transform translate-y-0'}`}>
              {renderStepContent()}
            </div>

            {/* Navigation */}
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <div className="flex items-center justify-between mt-16 pt-8 border-t border-primary/10">
                <Button
                  variant="outline"
                  onClick={() => handleStepTransition(currentStep - 1)}
                  className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {(currentStep === 3 && selectedSkills.length === 0) || 
                 (currentStep === 2 && !selectedTitle) ? null : (
                  <Button
                    onClick={() => handleStepTransition(currentStep + 1)}
                    className="bg-primary hover:bg-primary/90 shadow-elegant hover:shadow-glow"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer indicators */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-primary/10 py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center space-x-8 text-sm text-primary/60">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>AI-powered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Moodboard driven</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>5-minute deploy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;