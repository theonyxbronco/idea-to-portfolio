import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Plus, X, Loader2, CheckCircle, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/clerk-react';

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

const UserPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoaded, isSignedIn } = useUser();
  
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
    education: []
  });

  const [newSkill, setNewSkill] = useState('');
  const [newExperience, setNewExperience] = useState({ duration: '', description: '' });
  const [newEducation, setNewEducation] = useState({ duration: '', institution: '', degree: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingData, setHasExistingData] = useState(false);

  // Duration options for experience and education
  const DURATION_OPTIONS = [
    'Less than 1 year',
    '1-2 years',
    '2-3 years',
    '3-5 years',
    '5-10 years',
    'More than 10 years'
  ];

  const EDUCATION_DURATION_OPTIONS = [
    'Currently studying',
    'Completed',
    'In progress',
    'Certification/Course',
    'Self-taught'
  ];

  // Load existing user data when component mounts
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.primaryEmailAddress?.emailAddress) {
      loadUserData();
    }
  }, [isLoaded, isSignedIn, user]);

  const loadUserData = async () => {
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

      // Pre-populate email
      setPersonalInfo(prev => ({
        ...prev,
        email: userEmail
      }));

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/get-user-info?email=${encodeURIComponent(userEmail)}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPersonalInfo(result.data);
          setHasExistingData(true);
          toast({
            title: "Data Loaded",
            description: "Your existing information has been loaded",
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Don't show error toast for missing data - just use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !personalInfo.skills.includes(newSkill.trim())) {
      setPersonalInfo(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setPersonalInfo(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const addExperience = () => {
    if (newExperience.duration && newExperience.description.trim()) {
      setPersonalInfo(prev => ({
        ...prev,
        experiences: [...prev.experiences, { ...newExperience }]
      }));
      setNewExperience({ duration: '', description: '' });
    }
  };

  const removeExperience = (index: number) => {
    setPersonalInfo(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    if (newEducation.duration && newEducation.institution.trim() && newEducation.degree.trim()) {
      setPersonalInfo(prev => ({
        ...prev,
        education: [...prev.education, { ...newEducation }]
      }));
      setNewEducation({ duration: '', institution: '', degree: '' });
    }
  };

  const removeEducation = (index: number) => {
    setPersonalInfo(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!personalInfo.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (!personalInfo.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your professional title",
        variant: "destructive",
      });
      return;
    }

    if (!personalInfo.linkedin.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your LinkedIn profile",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/save-user-info`, {
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
          title: "Information Saved!",
          description: "Your personal information has been saved successfully",
        });
        setHasExistingData(true);
      } else {
        throw new Error(result.error || 'Failed to save user information');
      }
    } catch (error) {
      console.error('Error saving user info:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save user information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
          <p className="text-muted-foreground">Loading your information...</p>
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
              Personal Information
            </h1>
            <p className="text-xl text-muted-foreground">
              {hasExistingData ? 'Update your personal information' : 'Tell us about yourself'}
            </p>
          </div>

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
                    value={personalInfo.name}
                    onChange={(e) => handlePersonalInfoChange('name', e.target.value)}
                    placeholder="Your full name"
                    className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Professional Title *</Label>
                  <Input
                    id="title"
                    value={personalInfo.title}
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
                  value={personalInfo.bio}
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
                    value={personalInfo.email}
                    onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                    placeholder="your@email.com"
                    className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">Email is automatically filled from your account</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={personalInfo.phone}
                    onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Social Links - Simplified */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Social Links</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="text-sm">LinkedIn *</Label>
                    <Input
                      id="linkedin"
                      value={personalInfo.linkedin}
                      onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                      placeholder="linkedin.com/in/yourname"
                      className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="text-sm">Instagram</Label>
                    <Input
                      id="instagram"
                      value={personalInfo.instagram}
                      onChange={(e) => handlePersonalInfoChange('instagram', e.target.value)}
                      placeholder="@yourusername"
                      className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Skills & Expertise</Label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {personalInfo.skills.map((skill, index) => (
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

              {/* Experience Section - Tag-based */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Professional Experience</Label>
                
                {/* Display existing experiences */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {personalInfo.experiences.map((exp, index) => (
                    <Badge key={index} variant="outline" className="px-3 py-2 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{exp.duration}</span>
                        <span className="text-xs">{exp.description}</span>
                      </div>
                      <button
                        onClick={() => removeExperience(index)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {/* Add new experience */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    value={newExperience.duration}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, duration: e.target.value }))}
                    className="h-10 px-3 rounded-md border border-input bg-background shadow-soft focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Select duration</option>
                    {DURATION_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <Input
                    value={newExperience.description}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Web Design, Marketing..."
                    className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    onKeyPress={(e) => e.key === 'Enter' && addExperience()}
                  />
                  <Button onClick={addExperience} variant="outline" className="w-full md:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Experience
                  </Button>
                </div>
              </div>

              {/* Education Section - Tag-based */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Education</Label>
                
                {/* Display existing education */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {personalInfo.education.map((edu, index) => (
                    <Badge key={index} variant="outline" className="px-3 py-2 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{edu.degree}</span>
                        <span className="text-xs">{edu.institution}</span>
                        <span className="text-xs text-muted-foreground">{edu.duration}</span>
                      </div>
                      <button
                        onClick={() => removeEducation(index)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {/* Add new education */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      value={newEducation.institution}
                      onChange={(e) => setNewEducation(prev => ({ ...prev, institution: e.target.value }))}
                      placeholder="School/Institution name"
                      className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    />
                    <Input
                      value={newEducation.degree}
                      onChange={(e) => setNewEducation(prev => ({ ...prev, degree: e.target.value }))}
                      placeholder="Degree/Program/Course"
                      className="shadow-soft border-0 focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={newEducation.duration}
                      onChange={(e) => setNewEducation(prev => ({ ...prev, duration: e.target.value }))}
                      className="h-10 px-3 rounded-md border border-input bg-background shadow-soft focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">Select status</option>
                      {EDUCATION_DURATION_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <Button onClick={addEducation} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Education
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button Section */}
          <div className="pt-8 border-t border-border mt-8">
            <div className="flex flex-col items-center space-y-4">
              <Button
                onClick={handleSave}
                variant="build"
                size="lg"
                className="px-12 py-4 text-lg"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : hasExistingData ? (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Update Information
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Save Information
                  </>
                )}
              </Button>

              {!isSaving && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {hasExistingData 
                      ? 'Update your information and continue to projects'
                      : 'Save your information to continue building your portfolio'
                    }
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/projects')}
                    className="text-sm"
                  >
                    Continue to Projects →
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPage;