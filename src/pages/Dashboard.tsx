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
  ImageIcon
} from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
  createdAt: string;
  status: 'draft' | 'generated' | 'deployed';
  deployUrl?: string;
  thumbnail?: string;
  lastModified: string;
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [tier, setTier] = useState<string>('Free');
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;

      try {
        setIsLoading(true);
        
        // Fetch portfolio data
        const portfolioResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/user-data?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);        
        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json();
          if (portfolioData.success) {
            setPortfolios(portfolioData.data.portfolios || []);
            setUserTags(portfolioData.data.tags || []);
            setTier(portfolioData.data.tier || 'Free');
          }
        }

        // Fetch user projects
        const projectsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/get-user-projects?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);
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

  const handleCreateNewPortfolio = () => {
    if (projects.length === 0) {
      // If no projects, redirect to create projects first
      navigate('/create');
      return;
    }
    setShowProjectSelector(true);
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
    
    // Navigate to portfolio builder with selected projects
    navigate('/portfolio-builder', { 
      state: { 
        selectedProjectIds: selectedProjects,
        fromDashboard: true 
      } 
    });
    setShowProjectSelector(false);
    setSelectedProjects([]);
  };

  const handleEditProjects = () => {
    navigate('/projects');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-shadow">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <DashboardWelcome />

          {/* Current Plan Section */}
          <Card className="shadow-medium border-0 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-xl font-bold flex items-center">
                    {tier}
                    <Badge variant="outline" className="ml-2">
                      {tier === 'Free' ? 'Upgrade Available' : 'Active'}
                    </Badge>
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/pro-waitlist')}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {tier === 'Free' ? 'Upgrade to Pro' : 'Manage Plan'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-medium border-0">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{portfolios.length}</p>
                    <p className="text-sm text-muted-foreground">Portfolios</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-medium border-0">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{projects.length}</p>
                    <p className="text-sm text-muted-foreground">Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-medium border-0">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <ExternalLink className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {portfolios.filter(p => p.status === 'deployed').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Live Sites</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-medium border-0">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">AI</p>
                    <p className="text-sm text-muted-foreground">Powered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Your Projects Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Projects</h2>
            <div className="flex gap-3">
              <Button onClick={handleCreateNewPortfolio} variant="build" className="shadow-medium">
                <Plus className="h-4 w-4 mr-2" />
                Create New Portfolio
              </Button>
              <Button onClick={handleEditProjects} variant="outline" className="shadow-medium">
                <Edit className="h-4 w-4 mr-2" />
                Manage Projects
              </Button>
            </div>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <Card className="shadow-large border-0 mb-8">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                  <FolderOpen className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start by adding your creative projects. These will be used to generate your AI-powered portfolio.
                </p>
                <Button onClick={() => navigate('/projects')} variant="build" size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {projects.slice(0, 6).map((project) => (
                <Card key={project.id} className="shadow-medium border-0 hover:shadow-large transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{project.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {project.category || project.customCategory}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Project Preview */}
                    <div className="aspect-video bg-gradient-accent/10 rounded-lg flex items-center justify-center">
                      {project.imageMetadata?.finalImage ? (
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Has Images</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Project Preview</p>
                        </div>
                      )}
                    </div>

                    {/* Project Info */}
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">{project.subtitle}</p>
                      <div className="flex flex-wrap gap-1">
                        {project.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                        {project.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{project.tags.length - 3}</Badge>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(project.createdAt || '').toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {projects.length > 6 && (
            <div className="text-center mb-8">
              <Button variant="outline" onClick={() => navigate('/projects')}>
                View All {projects.length} Projects
              </Button>
            </div>
          )}

          {/* Your Portfolios Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Portfolios</h2>
          </div>

          {/* Portfolios Grid */}
          {portfolios.length === 0 ? (
            <Card className="shadow-large border-0">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Portfolios Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your first AI-powered portfolio to showcase your work and land your dream opportunities.
                </p>
                <Button onClick={handleCreateNewPortfolio} variant="build" size="lg" disabled={projects.length === 0}>
                  <Plus className="h-5 w-5 mr-2" />
                  {projects.length === 0 ? 'Add Projects First' : 'Create Your First Portfolio'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolios.map((portfolio) => (
                <Card key={portfolio.id} className="shadow-medium border-0 hover:shadow-large transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{portfolio.name}</CardTitle>
                      <Badge className={getStatusColor(portfolio.status)}>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(portfolio.status)}
                          <span className="capitalize">{portfolio.status}</span>
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Portfolio Preview/Thumbnail */}
                    <div className="aspect-video bg-gradient-accent/10 rounded-lg flex items-center justify-center">
                      {portfolio.thumbnail ? (
                        <img 
                          src={portfolio.thumbnail} 
                          alt={portfolio.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center">
                          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Portfolio Preview</p>
                        </div>
                      )}
                    </div>

                    {/* Portfolio Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        Created {new Date(portfolio.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <FileText className="h-4 w-4 mr-2" />
                        Modified {new Date(portfolio.lastModified).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {portfolio.status === 'deployed' && portfolio.deployUrl ? (
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => window.open(portfolio.deployUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Live
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate('/preview', { 
                            state: { portfolioId: portfolio.id } 
                          })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {portfolio.status === 'draft' ? 'Continue' : 'Preview'}
                        </Button>
                      )}
                      
                      <Button variant="outline" size="sm">
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
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Projects for Your Portfolio</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Choose which projects you'd like to showcase in your new portfolio
                </p>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/5">
                    <Checkbox
                      checked={selectedProjects.includes(project.id!)}
                      onCheckedChange={(checked) => handleProjectSelection(project.id!, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{project.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{project.subtitle}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">{project.category || project.customCategory}</Badge>
                        {project.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                        {project.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">+{project.tags.length - 2}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowProjectSelector(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleProceedToPortfolioBuilder} 
                  disabled={selectedProjects.length === 0}
                  variant="build"
                >
                  Continue with {selectedProjects.length} Project{selectedProjects.length !== 1 ? 's' : ''}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Recent Activity Section */}
          <Card className="shadow-medium border-0 mt-8">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {portfolios.length > 0 && (
                  <>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        Last portfolio: <strong>{portfolios[0].name}</strong> on {new Date(portfolios[0].lastModified).toLocaleDateString()}
                      </span>
                    </div>
                  </>
                )}
                {projects.length > 0 && (
                  <div className="flex items-center text-sm">
                    <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      Latest project: <strong>{projects[0].title}</strong> on {new Date(projects[0].createdAt || '').toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Tags Section */}
          {userTags.length > 0 && (
            <Card className="shadow-medium border-0 mt-8">
              <CardHeader>
                <CardTitle>Your Portfolio Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {userTags.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pro Features Teaser - Only show for Free tier */}
          {tier === 'Free' && (
            <Card className="shadow-medium border-0 mt-8 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">Ready for More?</h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Upgrade to Pro for unlimited portfolios, advanced editing, custom domains, analytics, and priority AI generation.
                  </p>
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    onClick={() => navigate('/pro-waitlist')}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;