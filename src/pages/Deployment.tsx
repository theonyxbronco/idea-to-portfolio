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
  AlertTriangle,
  Star,
  User,
  FolderOpen
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
    <div className="min-h-screen bg-[#FFFEEA] relative overflow-hidden">
      {/* Subtle noise effect */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />

      <div className="container mx-auto px-6 py-12 relative">
        <div className="max-w-6xl mx-auto">
          {/* Header with Action Buttons at the Top */}
          <div className="flex justify-between items-center mb-12">
            <div 
              className="group cursor-pointer"
              onClick={handleBackToPreview}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#06070A]/10 rounded-full transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span className="font-light text-sm">Back to Preview</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              {deploymentUrl && (
                <div 
                  className="group cursor-pointer"
                  onClick={() => window.open(deploymentUrl, '_blank')}
                >
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#06070A]/10 rounded-full transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
                    <ExternalLink className="h-4 w-4" />
                    <span className="font-light text-sm">View Live Site</span>
                  </div>
                </div>
              )}

              <div 
                className="group cursor-pointer"
                onClick={handleStartNew}
              >
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#06070A] text-[#FFFEEA] rounded-full transition-all duration-200 hover:bg-[#06070A]/80 group-hover:scale-105 shadow-sm">
                  <RefreshCw className="h-4 w-4" />
                  <span className="font-light text-sm">Create New Portfolio</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Restriction Notice for Free Users */}
          {userLimits && userLimits.tier === 'Free' && !deploymentUrl && (
            <div className="bg-white rounded-xl p-8 border border-[#06070A]/10 shadow-lg mb-12">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-red-400/10 to-[#06070A]/10 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="h-10 w-10 text-[#06070A]" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl xl:text-4xl font-light text-[#06070A] leading-tight">
                    Deployment<br />
                    Not Available
                  </h2>
                  <p className="text-lg font-light text-[#06070A]/70 max-w-2xl mx-auto leading-relaxed">
                    Free users can preview and edit portfolios, but deployment to live websites requires an upgrade.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="text-center p-4 bg-[#06070A]/5 rounded-lg border border-[#06070A]/10">
                    <div className="text-lg font-light text-green-600">Student Plan</div>
                    <div className="text-sm text-[#06070A]/60 font-light">3 Live Deployments</div>
                  </div>
                  <div className="text-center p-4 bg-[#06070A]/5 rounded-lg border border-[#06070A]/10">
                    <div className="text-lg font-light text-purple-600">Pro Plan</div>
                    <div className="text-sm text-[#06070A]/60 font-light">Unlimited Deployments</div>
                  </div>
                </div>
                
                <div 
                  className="group cursor-pointer inline-block"
                  onClick={() => navigate('/pro-waitlist')}
                >
                  <div className="inline-flex items-center space-x-3 px-8 py-4 bg-[#06070A] text-[#FFFEEA] rounded-full transition-all duration-200 hover:bg-[#06070A]/80 group-hover:scale-105 shadow-lg text-lg">
                    <Crown className="h-5 w-5" />
                    <span className="font-light">Upgrade to Deploy Your Portfolio</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Header - Only show if successfully deployed */}
          {deploymentUrl && (
            <>
              <div className="text-center mb-16 space-y-8">
                <div className="w-32 h-32 bg-gradient-to-br from-green-400/10 to-[#06070A]/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-16 w-16 text-[#06070A]" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-5xl xl:text-6xl font-light text-[#06070A] leading-tight">
                    Portfolio<br />
                    deployed! 🎉
                  </h1>
                  <p className="text-xl font-light text-[#06070A]/70 max-w-2xl mx-auto leading-relaxed">
                    Your AI-generated portfolio is now live and accessible worldwide
                  </p>
                </div>
              </div>

              {/* Main Content - Only show if deployed */}
              <div className="space-y-12">
                {/* Live URL Card */}
                <div className="bg-white rounded-xl p-8 border border-[#06070A]/10 shadow-lg">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-light text-[#06070A] flex items-center justify-center">
                      <Globe className="h-6 w-6 mr-3" />
                      Your Live Portfolio
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4 p-6 bg-[#06070A]/5 rounded-lg border border-[#06070A]/10">
                        <div className="flex-1">
                          <p className="text-sm text-[#06070A]/60 font-light mb-1">Live URL</p>
                          <p className="text-lg font-light text-[#06070A] break-all">
                            {deploymentUrl}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <div 
                            className="group cursor-pointer"
                            onClick={() => copyToClipboard(deploymentUrl)}
                          >
                            <div className="inline-flex items-center space-x-1 px-3 py-2 bg-white border border-[#06070A]/10 rounded-lg transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
                              {copied ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4 text-[#06070A]" />
                              )}
                            </div>
                          </div>
                          <div 
                            className="group cursor-pointer"
                            onClick={() => window.open(deploymentUrl, '_blank')}
                          >
                            <div className="inline-flex items-center space-x-2 px-3 py-2 bg-[#06070A] text-[#FFFEEA] rounded-lg transition-all duration-200 hover:bg-[#06070A]/80 group-hover:scale-105 shadow-sm">
                              <ExternalLink className="h-4 w-4" />
                              <span className="font-light text-sm">Visit Site</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {deploymentDetails.map((detail, index) => (
                          <div key={index} className="flex items-center space-x-3 p-4 bg-[#06070A]/5 rounded-lg border border-[#06070A]/10">
                            <detail.icon className={`h-5 w-5 ${detail.className || 'text-[#06070A]'}`} />
                            <div>
                              <p className="text-xs text-[#06070A]/60 font-light">{detail.label}</p>
                              <p className="text-sm font-light text-[#06070A]">{detail.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* SHOWROOM CTA - With Tier Restrictions */}
                <div className="bg-white rounded-xl p-8 border border-[#06070A]/10 shadow-lg">
                  <div className="text-center space-y-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-400/10 to-pink-400/10 rounded-full flex items-center justify-center mx-auto">
                      <TrendingUp className="h-10 w-10 text-[#06070A]" />
                    </div>
                    
                    <div className="space-y-4">
                      <h2 className="text-3xl xl:text-4xl font-light text-[#06070A] leading-tight">
                        Ready for More<br />
                        Opportunities?
                      </h2>
                      <p className="text-xl font-light text-[#06070A]/70 max-w-2xl mx-auto leading-relaxed">
                        Want recruiters, friends, and family to discover your amazing work?
                      </p>
                      <p className="text-lg font-light text-[#06070A]/60 max-w-2xl mx-auto leading-relaxed">
                        Showcase your portfolio in our <strong className="font-medium">public showroom</strong> where hiring managers, 
                        potential clients, and fellow creatives browse for talent daily!
                      </p>
                      
                      {userLimits && userLimits.tier === 'Free' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                          <div className="flex items-center justify-center space-x-2 text-red-700">
                            <Lock className="h-5 w-5" />
                            <span className="font-light">Showroom requires Student+ plan</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#06070A]/5 rounded-lg p-6 max-w-md mx-auto border border-[#06070A]/10">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-light text-orange-600">500+</div>
                          <div className="text-[#06070A]/60 font-light">Daily Visitors</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-light text-pink-600">Exclusive</div>
                          <div className="text-[#06070A]/60 font-light">Recruitment Partners</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      {canUseShowroom() ? (
                        <div 
                          className="group cursor-pointer"
                          onClick={handleShowroomRequest}
                        >
                          <div className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-full transition-all duration-200 hover:from-orange-600 hover:to-pink-700 group-hover:scale-105 shadow-lg text-lg font-light">
                            <Sparkles className="h-5 w-5" />
                            <span>Add to Showroom - Get Noticed!</span>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="group cursor-pointer"
                          onClick={() => {
                            setUpgradeReason('showroom');
                            setShowUpgradeModal(true);
                          }}
                        >
                          <div className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-full transition-all duration-200 hover:from-red-600 hover:to-orange-700 group-hover:scale-105 shadow-lg text-lg font-light">
                            <Crown className="h-5 w-5" />
                            <span>Upgrade to Access Showroom</span>
                          </div>
                        </div>
                      )}
                      
                      <div 
                        className="group cursor-pointer"
                        onClick={() => window.open('/showroom', '_blank')}
                      >
                        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-full transition-all duration-200 hover:bg-orange-50 group-hover:scale-105">
                          <ExternalLink className="h-4 w-4" />
                          <span className="font-light text-sm">Browse Showroom</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-[#06070A]/50 max-w-lg mx-auto font-light leading-relaxed">
                      {canUseShowroom() ? (
                        <>
                          <strong className="font-medium">Note:</strong> Only high-quality portfolios are accepted. 
                          Your portfolio will be reviewed within 24 hours before going live.
                        </>
                      ) : (
                        <>
                          <strong className="font-medium">Showroom Access:</strong> Student and Pro users can submit their portfolios 
                          to our public showroom for increased visibility and opportunities.
                        </>
                      )}
                    </div>
                  </div>
                </div>

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
                <div className="bg-white rounded-xl p-8 border border-[#06070A]/10 shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="space-y-3">
                      <div className="text-4xl font-light text-green-600">
                        {portfolioData.projects?.length || 0}
                      </div>
                      <p className="text-sm text-[#06070A]/60 font-light">Projects Showcased</p>
                    </div>
                    <div className="space-y-3">
                      <div className="text-4xl font-light text-blue-600">
                        ~5 min
                      </div>
                      <p className="text-sm text-[#06070A]/60 font-light">Time to Create</p>
                    </div>
                    <div className="space-y-3">
                      <div className="text-4xl font-light text-purple-600">
                        100%
                      </div>
                      <p className="text-sm text-[#06070A]/60 font-light">AI Generated</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Pro Features Teaser */}
          <div className="bg-white rounded-xl p-8 border border-[#06070A]/10 shadow-lg mt-12">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full flex items-center justify-center mx-auto">
                <Crown className="h-8 w-8 text-[#06070A]" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-light text-[#06070A]">
                  {userLimits?.tier === 'Free' ? 'Unlock Deployment & Showroom' : 'Want More Advanced Features?'}
                </h3>
                <p className="text-[#06070A]/60 max-w-md mx-auto font-light leading-relaxed">
                  {userLimits?.tier === 'Free' 
                    ? 'Student and Pro plans include live deployment, showroom access, and advanced portfolio features!'
                    : 'Advanced editing features including visual editor, custom styling, and real-time text editing are coming soon in our Pro plan!'
                  }
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 text-sm text-[#06070A]/50">
                {userLimits?.tier === 'Free' ? (
                  <>
                    <span className="flex items-center font-light"><Lock className="h-3 w-3 mr-1" />Live Deployment</span>
                    <span className="flex items-center font-light"><Lock className="h-3 w-3 mr-1" />Showroom Access</span>
                    <span className="flex items-center font-light"><Lock className="h-3 w-3 mr-1" />Custom Domains</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center font-light"><Lock className="h-3 w-3 mr-1" />Visual Editor</span>
                    <span className="flex items-center font-light"><Lock className="h-3 w-3 mr-1" />Custom Styling</span>
                    <span className="flex items-center font-light"><Lock className="h-3 w-3 mr-1" />Advanced Layouts</span>
                  </>
                )}
              </div>
              <div 
                className="group cursor-pointer inline-block"
                onClick={() => navigate('/pro-waitlist')}
              >
                <div className="inline-flex items-center space-x-2 px-6 py-3 bg-[#06070A] text-[#FFFEEA] rounded-full transition-all duration-200 hover:bg-[#06070A]/80 group-hover:scale-105">
                  <Crown className="h-4 w-4" />
                  <span className="font-light">{userLimits?.tier === 'Free' ? 'Upgrade to Deploy' : 'Learn More About Pro'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-xl p-8 border border-[#06070A]/10 shadow-lg mt-12">
            <h3 className="font-light text-[#06070A] mb-6 text-xl text-center">🚀 What's Next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-light text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="font-light text-[#06070A] text-base">Share Your Portfolio</p>
                    <p className="text-[#06070A]/60 font-light">Use the sharing tools above to spread the word about your new portfolio</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-light text-green-600">2</span>
                  </div>
                  <div>
                    <p className="font-light text-[#06070A] text-base">Download HTML</p>
                    <p className="text-[#06070A]/60 font-light">Get the source code to customize further or host on your own domain</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-light text-purple-600">3</span>
                  </div>
                  <div>
                    <p className="font-light text-[#06070A] text-base">Create More Portfolios</p>
                    <p className="text-[#06070A]/60 font-light">Build specialized portfolios for different audiences or projects</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-light text-orange-600">4</span>
                  </div>
                  <div>
                    <p className="font-light text-[#06070A] text-base">Help Others Discover Prism</p>
                    <p className="text-[#06070A]/60 font-light">Share your experience and help fellow creators find this tool</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade Modal */}
          <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
            <DialogContent className="max-w-md bg-[#FFFEEA] border border-[#06070A]/10">
              <DialogHeader>
                <DialogTitle className="flex items-center text-[#06070A] font-light">
                  <Crown className="h-6 w-6 mr-2 text-yellow-500" />
                  Upgrade Required
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-light text-red-800">
                      {upgradeReason === 'deployment' && 'Deployment Not Available'}
                      {upgradeReason === 'showroom' && 'Showroom Access Restricted'}
                    </h3>
                    <p className="text-sm text-red-600 font-light">
                      {upgradeReason === 'deployment' && 'Free users can preview portfolios but cannot deploy them live. Upgrade to Student or Pro for deployment access.'}
                      {upgradeReason === 'showroom' && 'Only Student and Pro users can submit portfolios to our public showroom for increased visibility.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-light text-[#06070A]">Available Plans:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border border-[#06070A]/10 rounded-lg bg-white">
                      <h5 className="font-light text-green-600 mb-2">Student</h5>
                      <ul className="text-xs text-[#06070A]/60 space-y-1 font-light">
                        <li>• 3 Live Deployments</li>
                        <li>• Showroom Access</li>
                        <li>• 20 Projects</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-[#06070A]/10 rounded-lg bg-white">
                      <h5 className="font-light text-purple-600 mb-2">Pro</h5>
                      <ul className="text-xs text-[#06070A]/60 space-y-1 font-light">
                        <li>• Unlimited Everything</li>
                        <li>• Custom Domains</li>
                        <li>• Priority Support</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <div 
                  className="group cursor-pointer"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#06070A]/10 rounded-lg transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105">
                    <span className="font-light text-sm">Cancel</span>
                  </div>
                </div>
                <div 
                  className="group cursor-pointer"
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate('/pro-waitlist');
                  }}
                >
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#06070A] text-[#FFFEEA] rounded-lg transition-all duration-200 hover:bg-[#06070A]/80 group-hover:scale-105">
                    <Crown className="h-4 w-4" />
                    <span className="font-light text-sm">Upgrade Now</span>
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Deployment;