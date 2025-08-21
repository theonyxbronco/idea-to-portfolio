import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DashboardWelcome } from '@/components/auth/AuthComponents';
import { 
  Plus, 
  Eye, 
  Download, 
  ExternalLink, 
  Calendar, 
  FileText,
  Sparkles,
  TrendingUp,
  Zap,
  FolderOpen,
  Edit,
  Trash2,
  ImageIcon,
  Edit3,
  Crown,
  Lock,
  AlertTriangle,
  ArrowRight,
  Palette,
  Target,
  User,
  Play
} from 'lucide-react';
import { API_BASE_URL } from '@/services/api';

interface Portfolio {
  id: string;
  name: string;
  createdAt: string;
  status: 'draft' | 'generated' | 'deployed';
  deployUrl?: string;
  thumbnail?: string;
  lastModified: string;
}

interface Draft {
  id: string;
  name: string;
  htmlContent: string;
  createdAt: string;
  lastModified: string;
  status: 'draft';
}

interface Project {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  customCategory: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  imageMetadata?: {
    processImages?: string[];
    finalImage?: string;
  };
}

interface UserTier {
  tier: 'Free' | 'Student' | 'Pro';
  limits: {
    maxProjects: number;
    maxPortfolios: number;
    maxDrafts: number;
  };
}

const TIER_LIMITS = {
  Free: {
    maxProjects: 3,
    maxPortfolios: 1,
    maxDrafts: 1
  },
  Student: {
    maxProjects: 20,
    maxPortfolios: 3,
    maxDrafts: 5
  },
  Pro: {
    maxProjects: Infinity,
    maxPortfolios: Infinity,
    maxDrafts: Infinity
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [tier, setTier] = useState<'Free' | 'Student' | 'Pro'>('Free');
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  
  // Paywall states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'projects' | 'portfolios' | 'drafts'>('projects');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;

      try {
        setIsLoading(true);
        
        // Fetch user info first to get tier
        const userInfoResponse = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/get-user-info?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);
        if (userInfoResponse.ok) {
          const userResult = await userInfoResponse.json();
          if (userResult.success && userResult.data) {
            setTier(userResult.data.tier || 'Free');
          }
        }

        // Fetch portfolio data
        const portfolioResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/user-data?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);        
        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json();
          if (portfolioData.success) {
            setPortfolios(portfolioData.data.portfolios || []);
            setUserTags(portfolioData.data.tags || []);
          }
        }

        // Fetch drafts
        const draftsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/get-drafts?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);
        if (draftsResponse.ok) {
          const draftsData = await draftsResponse.json();
          if (draftsData.success) {
            setDrafts(draftsData.data || []);
          }
        }

        // Fetch user projects
        const projectsResponse = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/get-user-projects?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          if (projectsData.success) {
            setProjects(projectsData.data || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Check if user can perform an action based on their tier
  const canPerformAction = (action: 'projects' | 'portfolios' | 'drafts'): boolean => {
    const limits = TIER_LIMITS[tier];
    
    switch (action) {
      case 'projects':
        return projects.length < limits.maxProjects;
      case 'portfolios':
        return (portfolios.length + drafts.length) < limits.maxPortfolios;
      case 'drafts':
        return drafts.length < limits.maxDrafts;
      default:
        return false;
    }
  };

  const getUsageStatus = (action: 'projects' | 'portfolios' | 'drafts') => {
    const limits = TIER_LIMITS[tier];
    let current = 0;
    let max = 0;

    switch (action) {
      case 'projects':
        current = projects.length;
        max = limits.maxProjects;
        break;
      case 'portfolios':
        current = portfolios.length + drafts.length;
        max = limits.maxPortfolios;
        break;
      case 'drafts':
        current = drafts.length;
        max = limits.maxDrafts;
        break;
    }

    return { current, max, isAtLimit: current >= max };
  };

  const handleUpgradeModal = (reason: 'projects' | 'portfolios' | 'drafts') => {
    setUpgradeReason(reason);
    setShowUpgradeModal(true);
  };

  const handleCreateNewPortfolio = () => {
    // Check portfolio limit
    if (!canPerformAction('portfolios')) {
      handleUpgradeModal('portfolios');
      return;
    }

    if (projects.length === 0) {
      navigate('/create');
      return;
    }
    setShowProjectSelector(true);
  };

  const handleEditProjects = () => {
    navigate('/projects');
  };

  const handleAddProject = () => {
    // Check project limit
    if (!canPerformAction('projects')) {
      handleUpgradeModal('projects');
      return;
    }
    
    navigate('/projects');
  };

  const getStatusColor = (status: Portfolio['status']) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-100 text-green-800';
      case 'generated':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Portfolio['status']) => {
    switch (status) {
      case 'deployed':
        return <ExternalLink className="h-3 w-3" />;
      case 'generated':
        return <Eye className="h-3 w-3" />;
      case 'draft':
        return <FileText className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleProjectSelection = (projectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects(prev => [...prev, projectId]);
    } else {
      setSelectedProjects(prev => prev.filter(id => id !== projectId));
    }
  };

  const handleProceedToPortfolioBuilder = () => {
    if (selectedProjects.length === 0) return;
    
    navigate('/portfolio-builder', { 
      state: { 
        selectedProjectIds: selectedProjects,
        fromDashboard: true 
      } 
    });
    setShowProjectSelector(false);
    setSelectedProjects([]);
  };

  const handleLoadDraft = (draft: Draft) => {
    navigate('/preview', {
      state: {
        portfolioData: {
          personalInfo: {
            name: 'Draft Portfolio',
            email: 'draft@example.com'
          }
        },
        generatedPortfolio: {
          html: draft.htmlContent
        },
        metadata: {
          isDraft: true,
          generatedAt: draft.createdAt,
          lastModified: draft.lastModified,
          title: draft.name
        },
        isDraft: true,
        draftHtml: draft.htmlContent
      }
    });
  };

  const handlePreviewDraft = (draft: Draft) => {
    setPreviewDraft(draft);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFEEA]">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-32 bg-[#06070A]/5 rounded-lg mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-[#06070A]/5 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const projectsUsage = getUsageStatus('projects');
  const portfoliosUsage = getUsageStatus('portfolios');

  return (
    <div className="min-h-screen bg-[#FFFEEA] relative overflow-hidden">
      {/* Subtle noise effect */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <DashboardWelcome />

          {/* Current Plan Section with Usage */}
          <Card className="shadow-sm border border-[#06070A]/10 mb-6 bg-[#FFFEEA]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#06070A]/50 font-light">Current Plan</p>
                  <p className="text-xl font-light flex items-center text-[#06070A]">
                    {tier}
                    <Badge variant="outline" className="ml-2 border-[#06070A]/20 text-[#06070A] font-light">
                      {tier === 'Free' ? 'Upgrade Available' : 'Active'}
                    </Badge>
                  </p>
                  
                  {/* Usage Information for Free Users */}
                  {tier === 'Free' && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm font-light">
                        <span className="text-[#06070A]/50">Projects:</span>
                        <span className={projectsUsage.isAtLimit ? 'text-red-600 font-medium' : 'text-[#06070A]/50'}>
                          {projectsUsage.current}/{projectsUsage.max}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-light">
                        <span className="text-[#06070A]/50">Portfolios:</span>
                        <span className={portfoliosUsage.isAtLimit ? 'text-red-600 font-medium' : 'text-[#06070A]/50'}>
                          {portfoliosUsage.current}/{portfoliosUsage.max}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/pro-waitlist')}
                  className="border-[#06070A]/20 text-[#06070A] hover:bg-[#06070A] hover:text-[#FFFEEA] font-light"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {tier === 'Free' ? 'Upgrade to Pro' : 'Manage Plan'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-sm border border-[#06070A]/10 bg-[#FFFEEA]">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#06070A]/10 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-[#06070A]" />
                  </div>
                  <div>
                    <p className="text-2xl font-light text-[#06070A]">{portfolios.length + drafts.length}</p>
                    <p className="text-sm text-[#06070A]/50 font-light">Portfolios</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-[#06070A]/10 bg-[#FFFEEA]">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#06070A]/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-[#06070A]" />
                  </div>
                  <div>
                    <p className="text-2xl font-light text-[#06070A] flex items-center">
                      {projects.length}
                      {tier === 'Free' && projectsUsage.isAtLimit && (
                        <Lock className="h-4 w-4 ml-1 text-red-500" />
                      )}
                    </p>
                    <p className="text-sm text-[#06070A]/50 font-light">Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-[#06070A]/10 bg-[#FFFEEA]">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#06070A]/10 rounded-lg flex items-center justify-center">
                    <ExternalLink className="h-6 w-6 text-[#06070A]" />
                  </div>
                  <div>
                    <p className="text-2xl font-light text-[#06070A]">
                      {portfolios.filter(p => p.status === 'deployed').length}
                    </p>
                    <p className="text-sm text-[#06070A]/50 font-light">Live Sites</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-[#06070A]/10 bg-[#FFFEEA]">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#06070A]/10 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-[#06070A]" />
                  </div>
                  <div>
                    <p className="text-2xl font-light text-[#06070A]">AI</p>
                    <p className="text-sm text-[#06070A]/50 font-light">Powered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SHOWROOM CTA SECTION */}
          <Card className="shadow-sm border border-[#06070A]/10 mb-12 bg-gradient-to-r from-[#06070A]/5 to-[#06070A]/10">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-[#06070A] rounded-full flex items-center justify-center">
                    <Eye className="h-8 w-8 text-[#FFFEEA]" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-light text-[#06070A]">
                  🌟 Discover Amazing Portfolios
                </h2>
                <p className="text-[#06070A]/60 max-w-2xl mx-auto font-light">
                  Get inspired by portfolios created with Prism. See what other creatives are building 
                  and discover new talent from around the world.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
                  <Button
                    onClick={() => navigate('/showroom')}
                    className="bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light px-8 py-3 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                    size="lg"
                  >
                    <Eye className="h-5 w-5 mr-2" />
                    Explore Portfolio Showroom
                  </Button>
                  
                  <div className="flex items-center space-x-4 text-sm text-[#06070A]/50 font-light">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span>Live Portfolios</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <span>AI Generated</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Projects Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-[#06070A]">Your Projects</h2>
            <div className="flex gap-3">
              <Button 
                onClick={handleCreateNewPortfolio} 
                className="bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light shadow-sm border-0"
                disabled={tier === 'Free' && portfoliosUsage.isAtLimit}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Portfolio
                {tier === 'Free' && portfoliosUsage.isAtLimit && (
                  <Lock className="h-4 w-4 ml-2" />
                )}
              </Button>
              <Button 
                onClick={handleEditProjects} 
                variant="outline" 
                className="border-[#06070A]/20 text-[#06070A] hover:bg-[#06070A] hover:text-[#FFFEEA] font-light shadow-sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Manage Projects
              </Button>
            </div>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <Card className="shadow-sm border border-[#06070A]/10 mb-8 bg-[#FFFEEA]">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-[#06070A] rounded-full flex items-center justify-center mx-auto mb-6">
                  <FolderOpen className="h-12 w-12 text-[#FFFEEA]" />
                </div>
                <h3 className="text-xl font-light text-[#06070A] mb-2">No Projects Yet</h3>
                <p className="text-[#06070A]/60 mb-6 max-w-md mx-auto font-light">
                  Start by adding your creative projects. These will be used to generate your AI-powered portfolio.
                </p>
                <Button 
                  onClick={handleAddProject} 
                  className="bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light border-0"
                  size="lg"
                  disabled={tier === 'Free' && projectsUsage.isAtLimit}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Project
                  {tier === 'Free' && projectsUsage.isAtLimit && (
                    <Lock className="h-4 w-4 ml-2" />
                  )}
                </Button>
                
                {tier === 'Free' && projectsUsage.isAtLimit && (
                  <p className="text-sm text-red-600 mt-3 font-light">
                    You've reached the limit of {TIER_LIMITS.Free.maxProjects} projects for free users
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {projects.slice(0, 6).map((project) => (
                  <Card key={project.id} className="shadow-sm border border-[#06070A]/10 bg-[#FFFEEA] hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-light truncate text-[#06070A]">{project.title}</CardTitle>
                        <Badge variant="outline" className="text-xs border-[#06070A]/20 text-[#06070A] font-light">
                          {project.category || project.customCategory}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Project Preview */}
                      <div className="aspect-video bg-[#06070A]/10 rounded-lg flex items-center justify-center">
                        {project.imageMetadata?.finalImage ? (
                          <div className="text-center">
                            <ImageIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <p className="text-xs text-[#06070A]/50 font-light">Has Images</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <FileText className="h-8 w-8 text-[#06070A]/50 mx-auto mb-2" />
                            <p className="text-xs text-[#06070A]/50 font-light">Project Preview</p>
                          </div>
                        )}
                      </div>

                      {/* Project Info */}
                      <div className="space-y-2">
                        <p className="text-sm text-[#06070A]/60 font-light line-clamp-2">{project.subtitle}</p>
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-[#06070A]/10 text-[#06070A] font-light">{tag}</Badge>
                          ))}
                          {project.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs bg-[#06070A]/10 text-[#06070A] font-light">+{project.tags.length - 3}</Badge>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-[#06070A]/50 font-light">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(project.createdAt || '').toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Add Project Card - Only show if not at limit */}
                {tier !== 'Free' || !projectsUsage.isAtLimit ? (
                  <Card 
                    className="shadow-sm border-2 border-dashed border-[#06070A]/30 hover:border-[#06070A] hover:shadow-md transition-all cursor-pointer bg-[#FFFEEA]"
                    onClick={handleAddProject}
                  >
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[250px]">
                      <div className="w-16 h-16 bg-[#06070A]/10 rounded-full flex items-center justify-center mb-4">
                        <Plus className="h-8 w-8 text-[#06070A]" />
                      </div>
                      <h3 className="text-lg font-light text-[#06070A] mb-2">Add New Project</h3>
                      <p className="text-sm text-[#06070A]/60 text-center font-light">
                        Click to add another project to your portfolio
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="shadow-sm border-2 border-dashed border-red-300 bg-red-50">
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[250px]">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <Lock className="h-8 w-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-light text-red-800 mb-2">Project Limit Reached</h3>
                      <p className="text-sm text-red-600 text-center mb-4 font-light">
                        Free users can have up to {TIER_LIMITS.Free.maxProjects} projects
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => handleUpgradeModal('projects')}
                        className="bg-red-600 hover:bg-red-700 text-[#FFFEEA] font-light border-0"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Pro
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {projects.length > 6 && (
                <div className="text-center mb-8">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/projects')}
                    className="border-[#06070A]/20 text-[#06070A] hover:bg-[#06070A] hover:text-[#FFFEEA] font-light"
                  >
                    View All {projects.length} Projects
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Your Portfolios Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-[#06070A]">Your Portfolios</h2>
          </div>

          {/* Portfolios Grid */}
          {portfolios.length === 0 && drafts.length === 0 ? (
            <Card className="shadow-sm border border-[#06070A]/10 mb-8 bg-[#FFFEEA]">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-[#06070A] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-12 w-12 text-[#FFFEEA]" />
                </div>
                <h3 className="text-xl font-light text-[#06070A] mb-2">No Portfolios Yet</h3>
                <p className="text-[#06070A]/60 mb-6 max-w-md mx-auto font-light">
                  Create your first AI-powered portfolio to showcase your work and land your dream opportunities.
                </p>
                <Button 
                  onClick={handleCreateNewPortfolio} 
                  className="bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light border-0"
                  size="lg" 
                  disabled={projects.length === 0 || (tier === 'Free' && portfoliosUsage.isAtLimit)}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {projects.length === 0 ? 'Add Projects First' : 'Create Your First Portfolio'}
                  {tier === 'Free' && portfoliosUsage.isAtLimit && (
                    <Lock className="h-4 w-4 ml-2" />
                  )}
                </Button>
                
                {tier === 'Free' && portfoliosUsage.isAtLimit && (
                  <p className="text-sm text-red-600 mt-3 font-light">
                    You've reached the limit of {TIER_LIMITS.Free.maxPortfolios} portfolio for free users
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Render drafts first */}
              {drafts.map((draft) => (
                <Card key={draft.id} className="shadow-sm border border-[#06070A]/10 bg-[#FFFEEA] hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-light truncate text-[#06070A]">{draft.name}</CardTitle>
                      <Badge className="bg-yellow-100 text-yellow-800 font-light">
                        <span className="flex items-center space-x-1">
                          <FileText className="h-3 w-3" />
                          <span className="capitalize">Draft</span>
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Draft Preview */}
                    <div 
                      className="aspect-video bg-[#06070A]/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#06070A]/20"
                      onClick={() => handlePreviewDraft(draft)}
                    >
                      <div className="text-center">
                        <FileText className="h-8 w-8 text-[#06070A]/50 mx-auto mb-2" />
                        <p className="text-xs text-[#06070A]/50 font-light">Click to Preview Draft</p>
                      </div>
                    </div>

                    {/* Draft Info */}
                    <div className="space-y-2 text-sm font-light">
                      <div className="flex items-center text-[#06070A]/50">
                        <Calendar className="h-4 w-4 mr-2" />
                        Created {new Date(draft.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-[#06070A]/50">
                        <FileText className="h-4 w-4 mr-2" />
                        Modified {new Date(draft.lastModified).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button 
                        className="flex-1 bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light border-0"
                        size="sm" 
                        onClick={() => handleLoadDraft(draft)}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Continue Editing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Render regular portfolios */}
              {portfolios.map((portfolio) => (
                <Card key={portfolio.id} className="shadow-sm border border-[#06070A]/10 bg-[#FFFEEA] hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-light truncate text-[#06070A]">{portfolio.name}</CardTitle>
                      <Badge className={getStatusColor(portfolio.status) + " font-light"}>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(portfolio.status)}
                          <span className="capitalize">{portfolio.status}</span>
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Portfolio Preview/Thumbnail */}
                    <div className="aspect-video bg-[#06070A]/10 rounded-lg flex items-center justify-center">
                      {portfolio.thumbnail ? (
                        <img 
                          src={portfolio.thumbnail} 
                          alt={portfolio.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center">
                          <FileText className="h-8 w-8 text-[#06070A]/50 mx-auto mb-2" />
                          <p className="text-xs text-[#06070A]/50 font-light">Portfolio Preview</p>
                        </div>
                      )}
                    </div>

                    {/* Portfolio Info */}
                    <div className="space-y-2 text-sm font-light">
                      <div className="flex items-center text-[#06070A]/50">
                        <Calendar className="h-4 w-4 mr-2" />
                        Created {new Date(portfolio.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-[#06070A]/50">
                        <FileText className="h-4 w-4 mr-2" />
                        Modified {new Date(portfolio.lastModified).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {portfolio.status === 'deployed' && portfolio.deployUrl ? (
                        <Button 
                          className="flex-1 bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light border-0"
                          size="sm" 
                          onClick={() => window.open(portfolio.deployUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Live
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1 bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light border-0"
                          size="sm" 
                          onClick={() => navigate('/preview', { 
                            state: { portfolioId: portfolio.id } 
                          })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {portfolio.status === 'draft' ? 'Continue' : 'Preview'}
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-[#06070A]/20 text-[#06070A] hover:bg-[#06070A] hover:text-[#FFFEEA] font-light"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Project Selection Modal */}
          <Dialog open={showProjectSelector} onOpenChange={setShowProjectSelector}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#FFFEEA] border border-[#06070A]/10">
              <DialogHeader>
                <DialogTitle className="text-[#06070A] font-light">Select Projects for Your Portfolio</DialogTitle>
                <p className="text-sm text-[#06070A]/60 font-light">
                  Choose which projects you'd like to showcase in your new portfolio
                </p>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-start space-x-3 p-4 border border-[#06070A]/10 rounded-lg hover:bg-[#06070A]/5 bg-[#FFFEEA]">
                    <Checkbox
                      checked={selectedProjects.includes(project.id!)}
                      onCheckedChange={(checked) => handleProjectSelection(project.id!, checked as boolean)}
                      className="border-[#06070A]/30 data-[state=checked]:bg-[#06070A] data-[state=checked]:border-[#06070A]"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-light text-[#06070A] truncate">{project.title}</h4>
                      <p className="text-sm text-[#06070A]/60 font-light truncate">{project.subtitle}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-xs border-[#06070A]/20 text-[#06070A] font-light">{project.category || project.customCategory}</Badge>
                        {project.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-[#06070A]/10 text-[#06070A] font-light">{tag}</Badge>
                        ))}
                        {project.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs bg-[#06070A]/10 text-[#06070A] font-light">+{project.tags.length - 2}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowProjectSelector(false)}
                  className="border-[#06070A]/20 text-[#06070A] hover:bg-[#06070A] hover:text-[#FFFEEA] font-light"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleProceedToPortfolioBuilder} 
                  disabled={selectedProjects.length === 0}
                  className="bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light border-0"
                >
                  Continue with {selectedProjects.length} Project{selectedProjects.length !== 1 ? 's' : ''}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Draft Preview Modal */}
          <Dialog open={!!previewDraft} onOpenChange={(open) => !open && setPreviewDraft(null)}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-[#FFFEEA] border border-[#06070A]/10">
              <DialogHeader>
                <DialogTitle className="text-[#06070A] font-light">Preview: {previewDraft?.name}</DialogTitle>
                <p className="text-sm text-[#06070A]/60 font-light">
                  This is a preview of your draft portfolio
                </p>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                {previewDraft && (
                  <iframe 
                    srcDoc={previewDraft.htmlContent}
                    className="w-full h-full border border-[#06070A]/10 rounded-lg"
                    sandbox="allow-same-origin"
                    title="Draft Preview"
                  />
                )}
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setPreviewDraft(null)}
                  className="border-[#06070A]/20 text-[#06070A] hover:bg-[#06070A] hover:text-[#FFFEEA] font-light"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    if (previewDraft) {
                      handleLoadDraft(previewDraft);
                      setPreviewDraft(null);
                    }
                  }}
                  className="bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light border-0"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Continue Editing
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Recent Activity Section */}
          <Card className="shadow-sm border border-[#06070A]/10 mt-8 bg-[#FFFEEA]">
            <CardHeader>
              <CardTitle className="text-[#06070A] font-light">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(portfolios.length > 0 || drafts.length > 0) && (
                  <>
                    <div className="flex items-center text-sm font-light text-[#06070A]">
                      <Calendar className="h-4 w-4 mr-2 text-[#06070A]/50" />
                      <span>
                        Last modified: <strong className="font-normal">{
                          drafts.length > 0 && portfolios.length > 0 
                            ? new Date(drafts[0].lastModified) > new Date(portfolios[0].lastModified)
                              ? `Draft "${drafts[0].name}"`
                              : `Portfolio "${portfolios[0].name}"`
                            : drafts.length > 0
                              ? `Draft "${drafts[0].name}"`
                              : `Portfolio "${portfolios[0].name}"`
                        }</strong> on {
                          drafts.length > 0 && portfolios.length > 0 
                            ? new Date(drafts[0].lastModified) > new Date(portfolios[0].lastModified)
                              ? new Date(drafts[0].lastModified).toLocaleDateString()
                              : new Date(portfolios[0].lastModified).toLocaleDateString()
                            : drafts.length > 0
                              ? new Date(drafts[0].lastModified).toLocaleDateString()
                              : new Date(portfolios[0].lastModified).toLocaleDateString()
                        }
                      </span>
                    </div>
                  </>
                )}
                {projects.length > 0 && (
                  <div className="flex items-center text-sm font-light text-[#06070A]">
                    <FolderOpen className="h-4 w-4 mr-2 text-[#06070A]/50" />
                    <span>
                      Latest project: <strong className="font-normal">{projects[0].title}</strong> on {new Date(projects[0].createdAt || '').toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Tags Section */}
          {userTags.length > 0 && (
            <Card className="shadow-sm border border-[#06070A]/10 mt-8 bg-[#FFFEEA]">
              <CardHeader>
                <CardTitle className="text-[#06070A] font-light">Your Portfolio Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {userTags.map(tag => (
                    <Badge key={tag} variant="outline" className="border-[#06070A]/20 text-[#06070A] font-light">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pro Features Teaser - Only show for Free tier */}
          {tier === 'Free' && (
            <Card className="shadow-sm border border-[#06070A]/10 mt-8 bg-gradient-to-r from-[#06070A]/5 to-[#06070A]/10">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-light text-[#06070A]">Ready for More?</h3>
                  <p className="text-[#06070A]/60 max-w-2xl mx-auto font-light">
                    Upgrade to Pro for unlimited portfolios, advanced editing, custom domains, analytics, and priority AI generation.
                  </p>
                  <Button 
                    className="bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light border-0"
                    onClick={() => navigate('/pro-waitlist')}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upgrade Modal */}
          <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
            <DialogContent className="max-w-md bg-[#FFFEEA] border border-[#06070A]/10">
              <DialogHeader>
                <DialogTitle className="flex items-center text-[#06070A] font-light">
                  <Crown className="h-6 w-6 mr-2 text-yellow-500" />
                  Upgrade to Pro
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-light text-red-800">
                      {upgradeReason === 'projects' && 'Project Limit Reached'}
                      {upgradeReason === 'portfolios' && 'Portfolio Limit Reached'}
                      {upgradeReason === 'drafts' && 'Draft Limit Reached'}
                    </h3>
                    <p className="text-sm text-red-600 font-light">
                      {upgradeReason === 'projects' && `Free users can only have ${TIER_LIMITS.Free.maxProjects} projects. Upgrade to Pro for unlimited projects.`}
                      {upgradeReason === 'portfolios' && `Free users can only have ${TIER_LIMITS.Free.maxPortfolios} portfolio. Upgrade to Pro for unlimited portfolios.`}
                      {upgradeReason === 'drafts' && `Free users can only have ${TIER_LIMITS.Free.maxDrafts} draft. Upgrade to Pro for unlimited drafts.`}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-light text-[#06070A]">Pro Plan Includes:</h4>
                  <ul className="space-y-2 text-sm font-light text-[#06070A]">
                    <li className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-green-600" />
                      Unlimited projects and portfolios
                    </li>
                    <li className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-green-600" />
                      Advanced AI editing features
                    </li>
                    <li className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-green-600" />
                      Custom domains and analytics
                    </li>
                    <li className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-green-600" />
                      Priority support
                    </li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowUpgradeModal(false)}
                  className="border-[#06070A]/20 text-[#06070A] hover:bg-[#06070A] hover:text-[#FFFEEA] font-light"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate('/pro-waitlist');
                  }}
                  className="bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] font-light border-0"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;