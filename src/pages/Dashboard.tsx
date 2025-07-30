import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Zap
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for now - replace with actual API call
  useEffect(() => {
    const mockPortfolios: Portfolio[] = [
      {
        id: '1',
        name: 'Creative Portfolio 2024',
        createdAt: '2024-01-15',
        status: 'deployed',
        deployUrl: 'https://amazing-portfolio.netlify.app',
        lastModified: '2024-01-20'
      },
      {
        id: '2',
        name: 'Photography Portfolio',
        createdAt: '2024-01-10',
        status: 'generated',
        lastModified: '2024-01-18'
      },
      {
        id: '3',
        name: 'UX Design Portfolio',
        createdAt: '2024-01-05',
        status: 'draft',
        lastModified: '2024-01-15'
      }
    ];

    // Simulate loading
    setTimeout(() => {
      setPortfolios(mockPortfolios);
      setIsLoading(false);
    }, 1000);
  }, []);

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

  const handleCreateNew = () => {
    navigate('/create');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <DashboardWelcome />

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
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">AI</p>
                    <p className="text-sm text-muted-foreground">Generated</p>
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
                    <p className="text-2xl font-bold">Pro</p>
                    <p className="text-sm text-muted-foreground">Features</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Portfolios</h2>
            <Button onClick={handleCreateNew} variant="build" className="shadow-medium">
              <Plus className="h-4 w-4 mr-2" />
              Create New Portfolio
            </Button>
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
                <Button onClick={handleCreateNew} variant="build" size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Portfolio
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

          {/* Pro Features Teaser */}
          <Card className="shadow-medium border-0 mt-8 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Ready for More?</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Upgrade to Pro for unlimited portfolios, advanced editing, custom domains, analytics, and priority AI generation.
                </p>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;