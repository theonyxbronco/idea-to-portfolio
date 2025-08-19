import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  CheckCircle, 
  ExternalLink, 
  Copy, 
  Download, 
  ArrowLeft,
  Globe,
  Calendar,
  Server,
  RefreshCw,
  Eye,
  Crown,
  Lock,
  Sparkles,
  CreditCard,
  Shield,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/clerk-react';
import ViralSharing from '@/components/ViralSharing';
import { API_BASE_URL } from '@/services/api';

interface UserLimits {
  tier: 'Free' | 'Student' | 'Pro';
  limits: {
    maxProjects: number;
    maxPortfolios: number;
    maxDrafts: number;
    maxDeployments: number;
  };
  usage: {
    projects: number;
    portfolios: number;
    drafts: number;
    deployments: number;
  };
  canCreate: {
    projects: boolean;
    portfolios: boolean;
    drafts: boolean;
    deployments: boolean;
  };
}

const TIER_LIMITS = {
  Free: {
    maxDeployments: 0 // Free users cannot deploy
  },
  Student: {
    maxDeployments: 3
  },
  Pro: {
    maxDeployments: Infinity
  }
};

const Deployment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'deployment' | 'showroom'>('deployment');

  // Get deployment data from location state
  const { 
    portfolioData = {
      personalInfo: { name: '', title: '' },
      projects: []
    }, 
    deploymentUrl = '', 
    platform = '', 
    deployedAt = new Date().toISOString(),
    generatedPortfolio = '',
    metadata = {}
  } = location.state || {};

  // Load user limits on component mount
  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      loadUserLimits();
    }
  }, [user]);

  const loadUserLimits = async () => {
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress;
      if (!userEmail) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/check-user-limits?email=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Add deployment limits to the existing limits
          const enhancedLimits = {
            ...result.data,
            limits: {
              ...result.data.limits,
              maxDeployments: TIER_LIMITS[result.data.tier as keyof typeof TIER_LIMITS]?.maxDeployments || 0
            },
            usage: {
              ...result.data.usage,
              deployments: 0 // This would need to be tracked separately
            },
            canCreate: {
              ...result.data.canCreate,
              deployments: result.data.tier !== 'Free'
            }
          };
          setUserLimits(enhancedLimits);
        }
      }
    } catch (error) {
      console.error('Error loading user limits:', error);
    }
  };

  const canDeploy = () => {
    if (!userLimits) return false;
    return userLimits.tier !== 'Free';
  };

  const canUseShowroom = () => {
    if (!userLimits) return false;
    return userLimits.tier !== 'Free';
  };

  // Optional: Add validation before rendering ViralSharing
  const canRenderViralSharing = portfolioData?.personalInfo?.name && portfolioData?.personalInfo?.title;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  const deploymentDetails = [
    {
      label: 'Platform',
      value: platform,
      icon: Server,
    },
    {
      label: 'Deployed At',
      value: new Date(deployedAt).toLocaleString(),
      icon: Calendar,
    },
    {
      label: 'Status',
      value: 'Live',
      icon: CheckCircle,
      className: 'text-green-600',
    },
  ];

  const handleStartNew = () => {
    navigate('/');
  };

  const handleBackToPreview = () => {
    navigate('/preview', { 
      state: { 
        portfolioData, 
        generatedPortfolio,
        metadata 
      } 
    });
  };

  const handleShowroomRequest = () => {
    if (!canUseShowroom()) {
      setUpgradeReason('showroom');
      setShowUpgradeModal(true);
      return;
    }

    // For now, just navigate to showroom - you'll implement submission logic later
    window.open('/showroom', '_blank');
    toast({
      title: "🎉 Portfolio Submitted!",
      description: "Your portfolio will appear in our showroom within 24 hours after review.",
    });
  };

  // Show upgrade modal if user is Free tier and trying to access deployment
  useEffect(() => {
    if (userLimits && userLimits.tier === 'Free' && !deploymentUrl) {
      // If this is a deployment page but user is Free tier and no deploymentUrl, show upgrade
      setUpgradeReason('deployment');
      setShowUpgradeModal(true);
    }
  }, [userLimits, deploymentUrl]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header with Action Buttons at the Top */}
          <div className="flex justify-between items-center mb-8">
            <Button
              variant="outline"
              onClick={handleBackToPreview}
              className="shadow-soft"
            >
              <Eye className="h-4 w-4 mr-2" />
              Back to Preview
            </Button>
            
            <div className="flex gap-4">
              {deploymentUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(deploymentUrl, '_blank')}
                  className="shadow-soft"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Live Site
                </Button>
              )}

              <Button
                variant="build"
                onClick={handleStartNew}
                className="shadow-medium"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Create New Portfolio
              </Button>
            </div>
          </div>

          {/* Tier Restriction Notice for Free Users */}
          {userLimits && userLimits.tier === 'Free' && !deploymentUrl && (
            <Card className="shadow-large border-0 mb-8 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <Lock className="h-10 w-10 text-red-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-red-800 mb-4">
                  Deployment Not Available
                </h2>
                <p className="text-red-700 text-lg mb-6 max-w-2xl mx-auto">
                  Free users can preview and edit portfolios, but deployment to live websites requires an upgrade.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                  <div className="text-center p-4 bg-white/60 rounded-lg">
                    <div className="text-lg font-bold text-green-600">Student Plan</div>
                    <div className="text-sm text-gray-600">3 Live Deployments</div>
                  </div>
                  <div className="text-center p-4 bg-white/60 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">Pro Plan</div>
                    <div className="text-sm text-gray-600">Unlimited Deployments</div>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/pro-waitlist')}
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-lg px-8 py-4"
                  size="lg"
                >
                  <Crown className="h-5 w-5 mr-2" />
                  Upgrade to Deploy Your Portfolio
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Success Header - Only show if successfully deployed */}
          {deploymentUrl && (
            <>
              <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center shadow-large">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-4">
                  🎉 Portfolio Deployed Successfully!
                </h1>
                <p className="text-xl text-muted-foreground">
                  Your AI-generated portfolio is now live and accessible worldwide
                </p>
              </div>

              {/* Main Content - Only show if deployed */}
              <div className="space-y-8">
                {/* Live URL Card */}
                <Card className="shadow-large border-0">
                  <CardHeader className="bg-gradient-primary text-primary-foreground">
                    <CardTitle className="text-2xl font-semibold flex items-center">
                      <Globe className="h-6 w-6 mr-3" />
                      Your Live Portfolio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1">Live URL</p>
                          <p className="text-lg font-mono text-foreground break-all">
                            {deploymentUrl}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(deploymentUrl)}
                            className="shadow-soft"
                          >
                            {copied ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => window.open(deploymentUrl, '_blank')}
                            className="shadow-soft"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit Site
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {deploymentDetails.map((detail, index) => (
                          <div key={index} className="flex items-center space-x-3 p-4 bg-card rounded-lg border border-border shadow-soft">
                            <detail.icon className={`h-5 w-5 ${detail.className || 'text-muted-foreground'}`} />
                            <div>
                              <p className="text-xs text-muted-foreground">{detail.label}</p>
                              <p className="text-sm font-medium">{detail.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* SHOWROOM CTA - With Tier Restrictions */}
                <Card className="shadow-large border-0 bg-gradient-to-r from-orange-50 via-red-50 to-pink-50">
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      <div className="flex justify-center">
                        <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full flex items-center justify-center animate-pulse">
                          <TrendingUp className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
                          🚀 Ready for More Opportunities?
                        </h2>
                        <p className="text-xl text-gray-700 font-medium">
                          Want recruiters, friends, and family to discover your amazing work?
                        </p>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                          Showcase your portfolio in our <strong>public showroom</strong> where hiring managers, 
                          potential clients, and fellow creatives browse for talent daily!
                        </p>
                        
                        {userLimits && userLimits.tier === 'Free' && (
                          <div className="bg-red-100 border border-red-300 rounded-lg p-4 max-w-md mx-auto">
                            <div className="flex items-center justify-center space-x-2 text-red-700">
                              <Lock className="h-5 w-5" />
                              <span className="font-medium">Showroom requires Student+ plan</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white/60 rounded-lg p-6 max-w-md mx-auto">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">500+</div>
                            <div className="text-gray-600">Daily Visitors</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-pink-600">Exclusive</div>
                            <div className="text-gray-600">Recruitment Partners</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        {canUseShowroom() ? (
                          <Button
                            onClick={handleShowroomRequest}
                            className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                            size="lg"
                          >
                            <Sparkles className="h-5 w-5 mr-2" />
                            Add to Showroom - Get Noticed! 
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              setUpgradeReason('showroom');
                              setShowUpgradeModal(true);
                            }}
                            className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                            size="lg"
                          >
                            <Crown className="h-5 w-5 mr-2" />
                            Upgrade to Access Showroom
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          onClick={() => window.open('/showroom', '_blank')}
                          className="border-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Browse Showroom
                        </Button>
                      </div>

                      <div className="text-xs text-gray-500 max-w-lg mx-auto">
                        {canUseShowroom() ? (
                          <>
                            <strong>Note:</strong> Only high-quality portfolios are accepted. 
                            Your portfolio will be reviewed within 24 hours before going live.
                          </>
                        ) : (
                          <>
                            <strong>Showroom Access:</strong> Student and Pro users can submit their portfolios 
                            to our public showroom for increased visibility and opportunities.
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* VIRAL SHARING SECTION - Always show this for deployed portfolios! */}
                {canRenderViralSharing && (
                  <ViralSharing 
                    portfolioData={portfolioData}
                    deploymentUrl={deploymentUrl}
                    isDeployed={true}
                    variant="deployed"
                  />
                )}

                {/* Success Stats */}
                <Card className="shadow-medium border-0 bg-gradient-to-r from-green-50 to-blue-50">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-green-600">
                          {portfolioData.projects?.length || 0}
                        </div>
                        <p className="text-sm text-gray-600">Projects Showcased</p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-blue-600">
                          ~5 min
                        </div>
                        <p className="text-sm text-gray-600">Time to Create</p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-purple-600">
                          100%
                        </div>
                        <p className="text-sm text-gray-600">AI Generated</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Pro Features Teaser */}
          <Card className="shadow-medium border-0 mt-8 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <Crown className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {userLimits?.tier === 'Free' ? 'Unlock Deployment & Showroom' : 'Want More Advanced Features?'}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {userLimits?.tier === 'Free' 
                    ? 'Student and Pro plans include live deployment, showroom access, and advanced portfolio features!'
                    : 'Advanced editing features including visual editor, custom styling, and real-time text editing are coming soon in our Pro plan!'
                  }
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
                  {userLimits?.tier === 'Free' ? (
                    <>
                      <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Live Deployment</span>
                      <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Showroom Access</span>
                      <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Custom Domains</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Visual Editor</span>
                      <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Custom Styling</span>
                      <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Advanced Layouts</span>
                    </>
                  )}
                </div>
                <Button 
                  onClick={() => navigate('/pro-waitlist')}
                  variant="default"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {userLimits?.tier === 'Free' ? 'Upgrade to Deploy' : 'Learn More About Pro'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="shadow-medium border-0 bg-gradient-subtle mt-8">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">🚀 What's Next?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Share Your Portfolio</p>
                      <p className="text-muted-foreground">Use the sharing tools above to spread the word about your new portfolio</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Download HTML</p>
                      <p className="text-muted-foreground">Get the source code to customize further or host on your own domain</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-purple-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Create More Portfolios</p>
                      <p className="text-muted-foreground">Build specialized portfolios for different audiences or projects</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-orange-600">4</span>
                    </div>
                    <div>
                      <p className="font-medium">Help Others Discover Prism</p>
                      <p className="text-muted-foreground">Share your experience and help fellow creators find this tool</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Modal */}
          <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Crown className="h-6 w-6 mr-2 text-yellow-500" />
                  Upgrade Required
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-800">
                      {upgradeReason === 'deployment' && 'Deployment Not Available'}
                      {upgradeReason === 'showroom' && 'Showroom Access Restricted'}
                    </h3>
                    <p className="text-sm text-red-600">
                      {upgradeReason === 'deployment' && 'Free users can preview portfolios but cannot deploy them live. Upgrade to Student or Pro for deployment access.'}
                      {upgradeReason === 'showroom' && 'Only Student and Pro users can submit portfolios to our public showroom for increased visibility.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Available Plans:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-green-600">Student</h5>
                      <ul className="text-xs text-gray-600 mt-1">
                        <li>• 3 Live Deployments</li>
                        <li>• Showroom Access</li>
                        <li>• 20 Projects</li>
                      </ul>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-purple-600">Pro</h5>
                      <ul className="text-xs text-gray-600 mt-1">
                        <li>• Unlimited Everything</li>
                        <li>• Custom Domains</li>
                        <li>• Priority Support</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate('/pro-waitlist');
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Deployment;