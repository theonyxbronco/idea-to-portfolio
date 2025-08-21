import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Rocket, Eye, Edit3, Check, X, 
  Smartphone, Tablet, Monitor, Crown, Lock, Lightbulb,
  Type, Palette, Layout, Zap, AlertCircle, Save,
  Sparkles, ChevronRight, ExternalLink, Undo2, FileArchive,
  User, Target, Calendar, FolderOpen, Star, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Tier system configuration
const TIER_LIMITS = {
  Free: {
    maxDeployments: 0,
    maxProjects: 3,
    maxPortfolios: 1,
    features: ['Basic portfolio generation', 'Text editing', 'Save as draft'],
    restrictions: ['No deployment', 'Limited projects', 'No custom styling']
  },
  Student: {
    maxDeployments: 3,
    maxProjects: 20,
    maxPortfolios: 3,
    features: ['Portfolio deployment', 'AI editing', 'Multiple projects', 'Email support'],
    restrictions: ['Limited deployments', 'No custom CSS', 'No priority support']
  },
  Pro: {
    maxDeployments: Infinity,
    maxProjects: Infinity,
    maxPortfolios: Infinity,
    features: ['Unlimited deployments', 'Custom styling', 'Priority support', 'Advanced editing', 'Custom domains'],
    restrictions: []
  }
};

interface UserLimits {
  tier: 'Free' | 'Student' | 'Pro';
  usage: {
    deployments: number;
    projects: number;
    portfolios: number;
  };
  canDeploy: boolean;
  deploymentsRemaining: number;
}

interface EditableRegion {
  id: string;
  type: 'heading' | 'paragraph' | 'list-item' | 'button';
  content: string;
  selector: string;
  bounds: { top: number; left: number; width: number; height: number };
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const Preview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [isDeploying, setIsDeploying] = useState(false);
  const [editableRegions, setEditableRegions] = useState<EditableRegion[]>([]);
  const [activeEdit, setActiveEdit] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null);
  const [isLoadingLimits, setIsLoadingLimits] = useState(true);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  const { portfolioData, generatedPortfolio, metadata, isIncomplete, isDraft, draftHtml } = location.state || {}; 
  const [aiRequest, setAiRequest] = useState('');
  const [isProcessingAiRequest, setIsProcessingAiRequest] = useState(false);
  const originalHtml = isDraft ? draftHtml : 
    (typeof generatedPortfolio === 'string' ? generatedPortfolio : generatedPortfolio?.html || '');

  if (!portfolioData || !generatedPortfolio) {
    React.useEffect(() => {
      navigate('/');
    }, [navigate]);
    return null;
  }

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedDraft, setLastSavedDraft] = useState<string | null>(null);

  // Load user limits on component mount
  useEffect(() => {
    const loadUserLimits = async () => {
      if (!portfolioData?.personalInfo?.email) {
        setIsLoadingLimits(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/check-user-limits?email=${encodeURIComponent(portfolioData.personalInfo.email)}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const tier = data.data.tier as 'Free' | 'Student' | 'Pro';
            const limits = TIER_LIMITS[tier];
            const deploymentsRemaining = limits.maxDeployments === Infinity ? 
              Infinity : Math.max(0, limits.maxDeployments - data.data.usage.portfolios);

            setUserLimits({
              tier,
              usage: data.data.usage,
              canDeploy: tier !== 'Free' && deploymentsRemaining > 0,
              deploymentsRemaining
            });
          }
        }
      } catch (error) {
        console.error('Failed to load user limits:', error);
        // Default to Free tier if we can't load limits
        setUserLimits({
          tier: 'Free',
          usage: { deployments: 0, projects: 0, portfolios: 0 },
          canDeploy: false,
          deploymentsRemaining: 0
        });
      } finally {
        setIsLoadingLimits(false);
      }
    };

    loadUserLimits();
  }, [portfolioData?.personalInfo?.email]);

  // Initialize HTML content
  useEffect(() => {
    setHtmlContent(originalHtml);
  }, [originalHtml]);

  // Paywall Modal Component
  const PaywallModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FFFEEA] rounded-xl p-8 w-full max-w-lg border border-[#06070A]/10 shadow-xl">
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <Crown className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-light text-[#06070A]">Upgrade Required</h2>
          </div>
          
          {userLimits?.tier === 'Free' ? (
            <>
              <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
                <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-light text-red-900 text-lg mb-2">Deployment Locked</h3>
                <p className="text-sm text-red-700 font-light leading-relaxed">
                  Free users cannot deploy portfolios. Upgrade to Student or Pro to make your portfolio live!
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-light text-blue-900 mb-3">Student Plan</h4>
                  <div className="text-sm text-blue-700 space-y-2 font-light">
                    <p>✓ 3 deployments</p>
                    <p>✓ 20 projects</p>
                    <p>✓ AI editing</p>
                    <p>✓ Email support</p>
                  </div>
                  <div 
                    className="group cursor-pointer mt-4"
                    onClick={() => navigate('/pro-waitlist')}
                  >
                    <div className="w-full text-center bg-blue-600 text-white py-2 rounded-lg transition-all duration-200 hover:bg-blue-700 group-hover:scale-105 text-sm font-light">
                      Upgrade to Student
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-light text-purple-900 mb-3">Pro Plan</h4>
                  <div className="text-sm text-purple-700 space-y-2 font-light">
                    <p>✓ Unlimited deployments</p>
                    <p>✓ Unlimited projects</p>
                    <p>✓ Custom styling</p>
                    <p>✓ Priority support</p>
                  </div>
                  <div 
                    className="group cursor-pointer mt-4"
                    onClick={() => navigate('/pro-waitlist')}
                  >
                    <div className="w-full text-center bg-purple-600 text-white py-2 rounded-lg transition-all duration-200 hover:bg-purple-700 group-hover:scale-105 text-sm font-light">
                      Upgrade to Pro
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
                <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="font-light text-orange-900 text-lg mb-2">Deployment Limit Reached</h3>
                <p className="text-sm text-orange-700 font-light leading-relaxed">
                  You've used all {TIER_LIMITS[userLimits.tier].maxDeployments} deployments for {userLimits.tier} tier. 
                  Upgrade to Pro for unlimited deployments!
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-light text-purple-900 mb-3">Pro Plan</h4>
                <div className="text-sm text-purple-700 space-y-2 font-light">
                  <p>✓ Unlimited deployments</p>
                  <p>✓ Unlimited projects</p>
                  <p>✓ Custom styling</p>
                  <p>✓ Priority support</p>
                  <p>✓ Custom domains</p>
                </div>
                <div 
                  className="group cursor-pointer mt-4"
                  onClick={() => navigate('/pro-waitlist')}
                >
                  <div className="w-full text-center bg-purple-600 text-white py-2 rounded-lg transition-all duration-200 hover:bg-purple-700 group-hover:scale-105 font-light">
                    Upgrade to Pro
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="flex space-x-3 pt-4">
            <div 
              className="group cursor-pointer flex-1"
              onClick={() => setShowPaywallModal(false)}
            >
              <div className="text-center py-2 border border-[#06070A]/10 rounded-lg transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 font-light">
                Cancel
              </div>
            </div>
            <div 
              className="group cursor-pointer flex-1"
              onClick={() => navigate('/pro-waitlist')}
            >
              <div className="text-center py-2 bg-[#06070A] text-[#FFFEEA] rounded-lg transition-all duration-200 hover:bg-[#06070A]/80 group-hover:scale-105 font-light">
                Learn More
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Tier Badge Component
  const TierBadge = ({ tier }: { tier: string }) => {
    const colors = {
      Free: 'bg-gray-100 text-gray-800 border-gray-200',
      Student: 'bg-blue-100 text-blue-800 border-blue-200',
      Pro: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    
    return (
      <div className={`px-3 py-1 rounded-full border text-xs font-light ${colors[tier]}`}>
        {tier} Tier
      </div>
    );
  };

  // Usage Stats Component
  const UsageStats = () => {
    if (!userLimits) return null;
    
    const limits = TIER_LIMITS[userLimits.tier];
    
    return (
      <div className="bg-white rounded-xl p-6 border border-[#06070A]/10 shadow-lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-[#06070A]" />
              <span className="font-light text-lg text-[#06070A]">Your Plan</span>
            </div>
            <TierBadge tier={userLimits.tier} />
          </div>
          
          {/* Deployment Status */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-light text-[#06070A]">Deployments</span>
              <span className="font-light text-[#06070A]">
                {userLimits.usage.portfolios} / {limits.maxDeployments === Infinity ? '∞' : limits.maxDeployments}
              </span>
            </div>
            <div className="w-full bg-[#06070A]/10 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  userLimits.canDeploy ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ 
                  width: limits.maxDeployments === Infinity ? '100%' : 
                    `${Math.min(100, (userLimits.usage.portfolios / limits.maxDeployments) * 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Projects Status */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-light text-[#06070A]">Projects</span>
              <span className="font-light text-[#06070A]">
                {userLimits.usage.projects} / {limits.maxProjects === Infinity ? '∞' : limits.maxProjects}
              </span>
            </div>
            <div className="w-full bg-[#06070A]/10 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full"
                style={{ 
                  width: limits.maxProjects === Infinity ? '100%' : 
                    `${Math.min(100, (userLimits.usage.projects / limits.maxProjects) * 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Upgrade CTA */}
          {userLimits.tier !== 'Pro' && (
            <div className="pt-3 border-t border-[#06070A]/10">
              <div 
                className="group cursor-pointer"
                onClick={() => navigate('/pro-waitlist')}
              >
                <div className="text-center py-2 bg-[#06070A] text-[#FFFEEA] rounded-lg transition-all duration-200 hover:bg-[#06070A]/80 group-hover:scale-105 text-sm font-light flex items-center justify-center space-x-1">
                  <Crown className="h-3 w-3" />
                  <span>Upgrade to {userLimits.tier === 'Free' ? 'Student or ' : ''}Pro</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Enhanced Deploy Handler with Paywall Check
  const handleDeploy = async () => {
    if (isIncomplete) {
      toast({
        title: "Cannot Deploy Incomplete Portfolio",
        description: "Please complete the generation first",
        variant: "destructive",
      });
      return;
    }

    // Check user limits before attempting deployment
    if (!userLimits) {
      toast({
        title: "Unable to Check Limits",
        description: "Please refresh and try again",
        variant: "destructive",
      });
      return;
    }

    // Show paywall if user cannot deploy
    if (!userLimits.canDeploy) {
      setShowPaywallModal(true);
      return;
    }

    // Proceed with original deployment logic
    try {
      setIsDeploying(true);
      
      // Add tracking call here
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/track-deployment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: portfolioData.personalInfo.name,
            email: portfolioData.personalInfo.email,
            title: portfolioData.personalInfo.title,
            userAgent: navigator.userAgent,
            projectCount: portfolioData.projects.length,
            tier: userLimits.tier
          }),
        });
      } catch (trackingError) {
        console.warn('Tracking failed:', trackingError);
      }

      let netlifyToken = import.meta.env.VITE_NETLIFY_TOKEN || 
                        localStorage.getItem('netlifyToken');

      if (!netlifyToken) {
        netlifyToken = prompt(
          "Please enter your Netlify Personal Access Token:\n\n" +
          "1. Go to netlify.com → User Settings → Applications\n" +
          "2. Click 'New access token'\n" +
          "3. Give it a descriptive name (e.g., 'Portfolio Generator')\n" +
          "4. Set expiration (recommended: 1 year)\n" +
          "5. Copy and paste the token here"
        );
      }

      if (!netlifyToken?.trim()) {
        toast({
          title: "Netlify Token Required",
          description: "You need a Netlify Personal Access Token to deploy",
          variant: "destructive",
        });
        return;
      }

      if (!netlifyToken.trim().match(/^[a-zA-Z0-9_-]+$/)) {
        toast({
          title: "Invalid Token Format",
          description: "The token appears to be invalid. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem('netlifyToken', netlifyToken.trim());
      
      toast({ 
        title: "Starting Deployment...",
        description: "Preparing your portfolio for deployment",
      });

      const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || htmlContent;
      const cleanedHtml = cleanHtmlForExport(currentHtml);

      if (!cleanedHtml || cleanedHtml.length < 100) {
        throw new Error('Invalid HTML content - portfolio appears to be empty');
      }

      if (!cleanedHtml.includes('<html') && !cleanedHtml.includes('<!DOCTYPE')) {
        throw new Error('Invalid HTML structure - missing HTML document structure');
      }

      const projectIds = portfolioData.projects ? 
        portfolioData.projects.map(project => project.id || `project_${Math.random().toString(36).substr(2, 9)}`) : 
        [];

      console.log('📋 Deploying with project IDs:', projectIds);
      console.log('👤 Deploying for user:', portfolioData.personalInfo.email);

      const deployStartTime = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/deploy-folder-to-netlify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: cleanedHtml,
          netlifyToken: netlifyToken.trim(),
          personName: portfolioData.personalInfo.name || 'Portfolio',
          userEmail: portfolioData.personalInfo.email,
          projectIds: projectIds,
          metadata: {
            generatedAt: new Date().toISOString(),
            projectCount: (portfolioData.projects || []).length,
            hasCustomizations: hasChanges,
            tier: userLimits.tier
          }
        }),
      });

      if (!response.ok) {
        let errorMessage = `Deployment failed with status ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
          
          if (response.status === 401) {
            localStorage.removeItem('netlifyToken');
            errorMessage = 'Invalid Netlify token. Please check your token and try again.';
          } else if (response.status === 403) {
            errorMessage = 'Insufficient permissions. Your Netlify token may not have site creation permissions.';
          } else if (response.status === 429) {
            errorMessage = 'Rate limit exceeded. Please wait a few minutes before trying again.';
          } else if (response.status === 422) {
            errorMessage = 'Invalid request data. Please try regenerating your portfolio.';
          }
          
          console.error('Deployment API Error:', errorData);
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.details || 'Deployment failed for unknown reason');
      }

      if (result.success) {
        const { deployment } = result;
        const deployTime = Math.round((Date.now() - deployStartTime) / 1000);

        // Update tracking with the deployment URL
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/update-deployment-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: portfolioData.personalInfo.email,
              url: deployment.url
            }),
          });
        } catch (updateError) {
          console.warn('Failed to update deployment URL:', updateError);
        }

        // Update user limits after successful deployment
        setUserLimits(prev => prev ? {
          ...prev,
          usage: {
            ...prev.usage,
            portfolios: prev.usage.portfolios + 1
          },
          canDeploy: prev.tier === 'Pro' || (prev.usage.portfolios + 1 < TIER_LIMITS[prev.tier].maxDeployments),
          deploymentsRemaining: prev.tier === 'Pro' ? Infinity : Math.max(0, TIER_LIMITS[prev.tier].maxDeployments - (prev.usage.portfolios + 1))
        } : null);

        navigate('/deployment', {
          state: {
            portfolioData,
            generatedPortfolio: cleanedHtml,
            metadata: {
              generatedAt: new Date().toISOString(),
              projectCount: (portfolioData.projects || []).length,
              hasCustomizations: hasChanges,
              deployTime,
              deployedAt: new Date().toISOString(),
              projectIds: projectIds,
              tier: userLimits.tier
            },
            deploymentUrl: deployment.url,
            platform: 'Netlify',
            isDeployed: true,
          },
        });

        return;
      }

    } catch (error) {
      console.error('Deployment error:', error);
      
      let userFriendlyMessage = 'An unexpected error occurred during deployment.';
      let suggestions = 'Please try again in a few moments.';

      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          userFriendlyMessage = 'Network connection error during deployment.';
          suggestions = 'Please check your internet connection and try again.';
        } else if (errorMessage.includes('token') || errorMessage.includes('auth')) {
          userFriendlyMessage = 'Authentication failed with Netlify.';
          suggestions = 'Please check your Netlify token and try again.';
          localStorage.removeItem('netlifyToken');
        } else if (errorMessage.includes('rate limit')) {
          userFriendlyMessage = 'Too many deployment requests.';
          suggestions = 'Please wait a few minutes before trying again.';
        } else if (errorMessage.includes('html') || errorMessage.includes('content')) {
          userFriendlyMessage = 'Invalid portfolio content detected.';
          suggestions = 'Try regenerating your portfolio and then deploy again.';
        } else if (errorMessage.includes('permission')) {
          userFriendlyMessage = 'Insufficient permissions for deployment.';
          suggestions = 'Make sure your Netlify token has site creation permissions.';
        } else {
          userFriendlyMessage = error.message;
        }
      }

      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: `${userFriendlyMessage} ${suggestions}`,
        duration: 10000,
      });

    } finally {
      setIsDeploying(false);
    }
  };

  // Rest of your existing methods (parseEditableRegions, handleIframeLoad, etc.)
  const parseEditableRegions = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return;
    
    const doc = iframeRef.current.contentDocument;
    const regions: EditableRegion[] = [];
    
    const selectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', '.bio', '.about', '.description',
      '.project-title', '.project-description',
      'button', '.btn', '.button'
    ];    
    selectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const text = element.textContent?.trim() || '';
        
        if (text.length > 3 && rect.width > 0 && rect.height > 0) {
          regions.push({
            id: `${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${index}`,
            type: selector.startsWith('h') ? 'heading' : 
                  selector === 'p' || selector.includes('description') || selector.includes('bio') ? 'paragraph' :
                  selector.includes('button') || selector.includes('btn') ? 'button' : 'paragraph',
            content: text,
            selector: `${selector}:nth-of-type(${index + 1})`,
            bounds: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            }
          });
        }
      });
    });
    
    setEditableRegions(regions);
  }, []);

  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return;
    
    const style = iframeRef.current.contentDocument.createElement('style');
    style.textContent = `
      .freemium-editable {
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .freemium-editable:hover {
        background-color: rgba(59, 130, 246, 0.1) !important;
        outline: 2px dashed rgba(59, 130, 246, 0.4);
        outline-offset: 2px;
      }
      .freemium-edit-indicator {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #3b82f6;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        z-index: 1000;
      }
      .freemium-editable:hover .freemium-edit-indicator {
        opacity: 1;
      }
    `;
    iframeRef.current.contentDocument.head.appendChild(style);
    
    const addEditableHandlers = () => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      
      const editableSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', '.btn'];
      
      editableSelectors.forEach(selector => {
        const elements = doc.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const textContent = element.textContent?.trim();
          if (textContent && textContent.length > 3) {
            element.classList.add('freemium-editable');
            
            const indicator = doc.createElement('div');
            indicator.className = 'freemium-edit-indicator';
            indicator.innerHTML = '✎';
            element.appendChild(indicator);
            
            element.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              const regionId = `${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${index}`;
              setActiveEdit(regionId);
              setEditingText(textContent);
            });
          }
        });
      });
    };
    
    setTimeout(addEditableHandlers, 100);
    setTimeout(parseEditableRegions, 200);
  }, [parseEditableRegions]);

  const cleanHtmlForExport = (html: string): string => {
    if (!html) return '';
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Remove existing editable classes
      const editableElements = doc.querySelectorAll('.freemium-editable');
      editableElements.forEach(el => {
        el.classList.remove('freemium-editable');
      });
      
      const indicators = doc.querySelectorAll('.freemium-edit-indicator');
      indicators.forEach(el => el.remove());
      
      const styleTags = doc.querySelectorAll('style');
      styleTags.forEach(styleTag => {
        if (styleTag.textContent?.includes('freemium-editable') || 
            styleTag.textContent?.includes('edit-indicator')) {
          styleTag.remove();
        }
      });
      
      let cleanedHtml = doc.documentElement.outerHTML;
      
      // Fix problematic navigation links
      const navigationFixes = [
        { pattern: /href=["']\/dashboard["']/gi, replacement: 'href="#about"' },
        { pattern: /href=["']\/works["']/gi, replacement: 'href="#projects"' },
        { pattern: /href=["']\/projects["']/gi, replacement: 'href="#projects"' },
        { pattern: /href=["']\/portfolio["']/gi, replacement: 'href="#projects"' },
        { pattern: /href=["']\#dashboard["']/gi, replacement: 'href="#about"' },
        { pattern: /href=["']\#works["']/gi, replacement: 'href="#projects"' }
      ];
      
      navigationFixes.forEach(({ pattern, replacement }) => {
        cleanedHtml = cleanedHtml.replace(pattern, replacement);
      });
      
      // Remove floating emoji animations
      const emojiPatterns = [
        /@keyframes\s+[^{]*emoji[^}]*\{[^}]+\}/gi,
        /animation[^;]*emoji[^;]*;/gi,
        /\.floating-emoji[^}]*\{[^}]+\}/gi,
        /\.emoji-rain[^}]*\{[^}]+\}/gi,
        /<div[^>]*class="[^"]*floating[^"]*emoji[^"]*"[^>]*>.*?<\/div>/gi
      ];
      
      emojiPatterns.forEach(pattern => {
        cleanedHtml = cleanedHtml.replace(pattern, '');
      });
      
      // Remove problematic JavaScript
      cleanedHtml = cleanedHtml.replace(
        /window\.location\s*=\s*["'][^"']*["']/gi, 
        '// navigation disabled for deployment'
      );
      
      cleanedHtml = cleanedHtml.replace(
        /location\.href\s*=\s*["'][^"']*["']/gi, 
        '// navigation disabled for deployment'
      );
      
      // Ensure proper DOCTYPE
      if (!cleanedHtml.includes('<!DOCTYPE')) {
        cleanedHtml = '<!DOCTYPE html>\n' + cleanedHtml;
      }
      
      return cleanedHtml;
    } catch (error) {
      console.warn('HTML cleaning failed, using original:', error);
      return html;
    }
  };

  // Apply text edit
  const applyTextEdit = useCallback((regionId: string, newText: string) => {
    if (!iframeRef.current?.contentDocument) return;
    
    const region = editableRegions.find(r => r.id === regionId);
    if (!region) return;
    
    try {
      const element = iframeRef.current.contentDocument.querySelector(region.selector);
      if (element) {
        element.textContent = newText;
        
        const newHtml = iframeRef.current.contentDocument.documentElement.outerHTML;
        setHtmlContent(newHtml);
        setHasChanges(true);
        
        setEditableRegions(prev => 
          prev.map(r => r.id === regionId ? { ...r, content: newText } : r)
        );
        
        toast({
          title: "Text Updated",
          description: "Your changes have been applied",
        });
      }
    } catch (error) {
      console.error('Failed to apply text edit:', error);
      toast({
        title: "Update Failed",
        description: "Could not apply the text change",
        variant: "destructive",
      });
    }
  }, [editableRegions, toast]);

  const handleSaveEdit = () => {
    if (activeEdit && editingText.trim()) {
      applyTextEdit(activeEdit, editingText.trim());
    }
    setActiveEdit(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setActiveEdit(null);
    setEditingText('');
  };

  const handleResetChanges = useCallback(() => {
    setHtmlContent(originalHtml);
    setHasChanges(false);
    setActiveEdit(null);
    setEditingText('');
    toast({
      title: "Changes Reset",
      description: "All edits have been reverted to original content",
    });
  }, [originalHtml, toast]);

  const handleSaveDraft = async () => {
    if (!portfolioData?.personalInfo?.email) {
      toast({
        title: "Cannot Save Draft",
        description: "No user email found in portfolio data",
        variant: "destructive",
      });
      return;
    }
  
    setIsSavingDraft(true);
  
    try {
      const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || htmlContent;
      const cleanedHtml = cleanHtmlForExport(currentHtml);
  
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/save-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: portfolioData.personalInfo.email,
          htmlContent: cleanedHtml
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.success) {
        setLastSavedDraft(new Date().toISOString());
        toast({
          title: "Draft Saved",
          description: "Your portfolio has been saved as a draft",
        });
      } else {
        throw new Error(data.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Draft Save Error:', error);
      toast({
        variant: "destructive",
        title: "Failed to Save Draft",
        description: error.message || 'Could not save your draft',
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleAiEditRequest = async () => {
    if (!aiRequest.trim()) return;
    
    setIsProcessingAiRequest(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai-edit-portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent,
          editRequest: aiRequest
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.success) {
        setHtmlContent(data.modifiedHtml);
        setHasChanges(true);
        
        toast({
          title: "AI Edit Applied",
          description: "Your changes have been processed",
        });
      } else {
        throw new Error(data.error || 'Failed to process AI edit');
      }
    } catch (error) {
      console.error('AI Edit Error:', error);
      toast({
        variant: "destructive",
        title: "AI Edit Failed",
        description: error.message || 'Could not process your request',
      });
    } finally {
      setIsProcessingAiRequest(false);
      setAiRequest('');
    }
  };

  const getViewportClasses = () => {
    switch (viewportSize) {
      case 'mobile':
        return 'w-[375px] h-[667px]';
      case 'tablet':
        return 'w-[768px] h-[1024px]';
      case 'desktop':
        return 'w-full h-[700px]';
      default:
        return 'w-full h-[700px]';
    }
  };

  // Loading state
  if (isLoadingLimits) {
    return (
      <div className="min-h-screen bg-[#FFFEEA] flex items-center justify-center">
        {/* Subtle noise effect */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }} />
        
        <div className="bg-white rounded-xl p-8 border border-[#06070A]/10 shadow-lg relative">
          <div className="flex items-center space-x-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#06070A]" />
            <span className="text-[#06070A] font-light text-lg">Loading user information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFEEA] relative overflow-hidden">
      {/* Subtle noise effect */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />

      {/* Paywall Modal */}
      {showPaywallModal && <PaywallModal />}
      
      <div className="container mx-auto px-6 py-8 relative">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-6">
              <div 
                className="group cursor-pointer"
                onClick={() => navigate('/', { state: location.state })}
              >
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#06070A]/10 rounded-full transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span className="font-light text-sm">Back to Dashboard</span>
                </div>
              </div>
              <div>
                <h1 className="text-3xl xl:text-4xl font-light text-[#06070A] leading-tight flex items-center space-x-3">
                  <Edit3 className="h-6 w-6" />
                  <span>Quick Edit</span>
                  {userLimits && <TierBadge tier={userLimits.tier} />}
                </h1>
                <p className="text-[#06070A]/60 text-sm font-light mt-1">
                  Click on any text to edit • {hasChanges ? 'Unsaved changes' : 'No changes'}
                  {userLimits && userLimits.tier !== 'Pro' && userLimits.deploymentsRemaining !== Infinity && (
                    <span className="ml-2 text-orange-600 font-medium">
                      {userLimits.deploymentsRemaining} deployment{userLimits.deploymentsRemaining !== 1 ? 's' : ''} remaining
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Status and Actions */}
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <div 
                  className="group cursor-pointer"
                  onClick={handleResetChanges}
                >
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#06070A]/10 rounded-lg transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
                    <Undo2 className="h-4 w-4" />
                    <span className="font-light text-sm">Reset Changes</span>
                  </div>
                </div>
              )}
              <div 
                className="group cursor-pointer"
                onClick={handleSaveDraft}
              >
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#06070A]/10 rounded-lg transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
                  {isSavingDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-light text-sm">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span className="font-light text-sm">Save as Draft</span>
                    </>
                  )}
                </div>
              </div>
              <div 
                className="group cursor-pointer"
                onClick={handleDeploy}
              >
                <div className={cn(
                  "inline-flex items-center space-x-2 px-6 py-2 rounded-lg transition-all duration-200 group-hover:scale-105 shadow-sm font-light",
                  userLimits?.canDeploy 
                    ? "bg-[#06070A] text-[#FFFEEA] hover:bg-[#06070A]/80" 
                    : "bg-white border border-[#06070A]/10 text-[#06070A] opacity-60 cursor-not-allowed"
                )}>
                  {!userLimits?.canDeploy && <Lock className="h-4 w-4" />}
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deploying...</span>
                    </>
                  ) : (
                    <>
                      {userLimits?.canDeploy && <Rocket className="h-4 w-4" />}
                      <span>{userLimits?.canDeploy ? 'Deploy to Web' : 'Upgrade to Deploy'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Preview Area */}
            <div className="lg:col-span-3">
              {/* Viewport Controls */}
              <div className="flex items-center justify-between mb-6 p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-[#06070A]/10 shadow-sm">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-light text-[#06070A]">Device Preview:</span>
                  <div 
                    className={cn(
                      "group cursor-pointer px-3 py-1 rounded-lg transition-all duration-200 text-sm font-light",
                      viewportSize === 'desktop' 
                        ? "bg-[#06070A] text-[#FFFEEA]" 
                        : "bg-white border border-[#06070A]/10 text-[#06070A] hover:bg-[#06070A]/5"
                    )}
                    onClick={() => setViewportSize('desktop')}
                  >
                    <div className="flex items-center space-x-1">
                      <Monitor className="h-4 w-4" />
                      <span>Desktop</span>
                    </div>
                  </div>
                  <div 
                    className={cn(
                      "group cursor-pointer px-3 py-1 rounded-lg transition-all duration-200 text-sm font-light",
                      viewportSize === 'tablet' 
                        ? "bg-[#06070A] text-[#FFFEEA]" 
                        : "bg-white border border-[#06070A]/10 text-[#06070A] hover:bg-[#06070A]/5"
                    )}
                    onClick={() => setViewportSize('tablet')}
                  >
                    <div className="flex items-center space-x-1">
                      <Tablet className="h-4 w-4" />
                      <span>Tablet</span>
                    </div>
                  </div>
                  <div 
                    className={cn(
                      "group cursor-pointer px-3 py-1 rounded-lg transition-all duration-200 text-sm font-light",
                      viewportSize === 'mobile' 
                        ? "bg-[#06070A] text-[#FFFEEA]" 
                        : "bg-white border border-[#06070A]/10 text-[#06070A] hover:bg-[#06070A]/5"
                    )}
                    onClick={() => setViewportSize('mobile')}
                  >
                    <div className="flex items-center space-x-1">
                      <Smartphone className="h-4 w-4" />
                      <span>Mobile</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-[#06070A]/60 flex items-center font-light">
                  <Edit3 className="h-3 w-3 mr-1" />
                  Click text to edit
                </div>
              </div>

              {/* Preview Container */}
              <div className="bg-white rounded-xl p-8 border border-[#06070A]/10 shadow-lg">
                <div className="flex justify-center">
                  <div className={`${getViewportClasses()} transition-all duration-300 bg-white rounded-lg shadow-lg overflow-hidden border border-[#06070A]/10 relative`}>
                    <iframe
                      ref={iframeRef}
                      srcDoc={htmlContent}
                      className="w-full h-full border-0"
                      title="Portfolio Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                      onLoad={handleIframeLoad}
                    />
                    
                    {/* Edit Overlay */}
                    {activeEdit && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
                        <div className="bg-[#FFFEEA] rounded-xl p-6 w-96 max-w-[90%] border border-[#06070A]/10 shadow-xl">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Edit3 className="h-5 w-5 text-[#06070A]" />
                              <h3 className="text-lg font-light text-[#06070A]">Edit Text</h3>
                            </div>
                            
                            <div>
                              <label className="text-sm font-light text-[#06070A]/60">
                                New text content:
                              </label>
                              {editingText.length > 50 ? (
                                <Textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="mt-2 border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded-lg font-light"
                                  rows={3}
                                  autoFocus
                                />
                              ) : (
                                <Input
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="mt-2 border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded-lg font-light"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                />
                              )}
                            </div>
                            
                            <div className="flex space-x-3">
                              <div 
                                className="group cursor-pointer flex-1"
                                onClick={handleSaveEdit}
                              >
                                <div className="text-center py-2 bg-[#06070A] text-[#FFFEEA] rounded-lg transition-all duration-200 hover:bg-[#06070A]/80 group-hover:scale-105 font-light flex items-center justify-center space-x-1">
                                  <Check className="h-4 w-4" />
                                  <span>Save</span>
                                </div>
                              </div>
                              <div 
                                className="group cursor-pointer flex-1"
                                onClick={handleCancelEdit}
                              >
                                <div className="text-center py-2 border border-[#06070A]/10 text-[#06070A] rounded-lg transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 font-light flex items-center justify-center space-x-1">
                                  <X className="h-4 w-4" />
                                  <span>Cancel</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Processing Overlay */}
                    {isProcessingAiRequest && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-3 border border-[#06070A]/10">
                          <Loader2 className="h-8 w-8 animate-spin text-[#06070A]" />
                          <span className="font-light text-[#06070A]">Applying AI changes...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Usage Stats */}
              <UsageStats />

              {/* AI Assistant */}
              <div className="bg-white rounded-xl p-6 border border-[#06070A]/10 shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-[#06070A]" />
                    <h3 className="text-lg font-light text-[#06070A]">AI Edit Assistant</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <Textarea
                      value={aiRequest}
                      onChange={(e) => setAiRequest(e.target.value)}
                      placeholder="Describe changes you'd like to make..."
                      className="min-h-[100px] border border-[#06070A]/20 focus:border-[#06070A] focus:ring-0 rounded-lg font-light"
                      disabled={isProcessingAiRequest}
                    />
                    <div 
                      className="group cursor-pointer"
                      onClick={handleAiEditRequest}
                    >
                      <div className={cn(
                        "text-center py-2 rounded-lg transition-all duration-200 group-hover:scale-105 font-light flex items-center justify-center space-x-2",
                        isProcessingAiRequest || !aiRequest.trim()
                          ? "bg-[#06070A]/20 text-[#06070A]/50 cursor-not-allowed"
                          : "bg-[#06070A] text-[#FFFEEA] hover:bg-[#06070A]/80"
                      )}>
                      {isProcessingAiRequest ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Apply AI Changes</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-[#06070A]/50 flex items-center font-light">
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Example: "Make the header smaller and use blue colors"
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Upgrade (only show if not Pro) */}
            {userLimits && userLimits.tier !== 'Pro' && (
              <div className="bg-white rounded-xl p-6 border border-[#06070A]/10 shadow-lg">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full flex items-center justify-center mx-auto">
                    <Crown className="h-8 w-8 text-[#06070A]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-light text-[#06070A] text-lg">
                      {userLimits.tier === 'Free' ? 'Unlock Deployment' : 'Unlock Unlimited'}
                    </h3>
                    <p className="text-xs text-[#06070A]/60 font-light leading-relaxed">
                      {userLimits.tier === 'Free' 
                        ? 'Upgrade to Student or Pro to deploy your portfolio and make it live on the web'
                        : 'Upgrade to Pro for unlimited deployments, custom styling, and priority support'
                      }
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-[#06070A]/50">
                    {userLimits.tier === 'Free' ? (
                      <>
                        <span className="flex items-center font-light"><Lock className="h-2 w-2 mr-1" />Portfolio Deployment</span>
                        <span className="flex items-center font-light"><Lock className="h-2 w-2 mr-1" />Live Web Hosting</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center font-light"><Lock className="h-2 w-2 mr-1" />Unlimited Deployments</span>
                        <span className="flex items-center font-light"><Lock className="h-2 w-2 mr-1" />Custom Domains</span>
                        <span className="flex items-center font-light"><Lock className="h-2 w-2 mr-1" />Priority Support</span>
                      </>
                    )}
                  </div>
                  <div 
                    className="group cursor-pointer"
                    onClick={() => navigate('/pro-waitlist')}
                  >
                    <div className="text-center py-2 bg-[#06070A] text-[#FFFEEA] rounded-lg transition-all duration-200 hover:bg-[#06070A]/80 group-hover:scale-105 text-xs font-light flex items-center justify-center space-x-1">
                      <Crown className="h-3 w-3" />
                      <span>Upgrade {userLimits.tier === 'Free' ? 'Now' : 'to Pro'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Editing Instructions */}
            <div className="bg-white rounded-xl p-6 border border-[#06070A]/10 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-[#06070A]" />
                  <h3 className="text-lg font-light text-[#06070A]">How to Edit</h3>
                </div>
                
                <div className="space-y-4 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-light text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="font-light text-[#06070A]">Click on Text</p>
                      <p className="text-[#06070A]/60 text-xs font-light">
                        Hover over any text and click to edit
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-light text-green-600">2</span>
                    </div>
                    <div>
                      <p className="font-light text-[#06070A]">Use AI Assistant</p>
                      <p className="text-[#06070A]/60 text-xs font-light">
                        Describe changes you want to make
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-light text-purple-600">3</span>
                    </div>
                    <div>
                      <p className="font-light text-[#06070A]">
                        {userLimits?.canDeploy ? 'Deploy When Ready' : 'Upgrade to Deploy'}
                      </p>
                      <p className="text-[#06070A]/60 text-xs font-light">
                        {userLimits?.canDeploy 
                          ? 'Click deploy to make your portfolio live'
                          : 'Upgrade your plan to deploy your portfolio'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-12 mt-12 border-t border-[#06070A]/10">
          <div 
            className="group cursor-pointer"
            onClick={() => navigate('/', { state: location.state })}
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#06070A]/10 rounded-lg transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
              <Eye className="h-4 w-4" />
              <span className="font-light text-sm">Back to Dashboard</span>
            </div>
          </div>
          
          {userLimits && userLimits.tier !== 'Pro' && (
            <div 
              className="group cursor-pointer"
              onClick={() => navigate('/pro-waitlist')}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#06070A]/10 rounded-lg transition-all duration-200 hover:bg-[#06070A]/5 group-hover:scale-105 shadow-sm">
                <Crown className="h-4 w-4" />
                <span className="font-light text-sm">{userLimits.tier === 'Free' ? 'Upgrade to Deploy' : 'Upgrade to Pro'}</span>
              </div>
            </div>
          )}

          <div 
            className="group cursor-pointer"
            onClick={handleDeploy}
          >
            <div className={cn(
              "inline-flex items-center space-x-2 px-8 py-3 rounded-lg transition-all duration-200 group-hover:scale-105 shadow-lg font-light",
              userLimits?.canDeploy 
                ? "bg-[#06070A] text-[#FFFEEA] hover:bg-[#06070A]/80" 
                : "bg-white border border-[#06070A]/10 text-[#06070A] opacity-60 cursor-not-allowed"
            )}>
              {!userLimits?.canDeploy && <Lock className="h-4 w-4" />}
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deploying...</span>
                </>
              ) : (
                <>
                  {userLimits?.canDeploy && <Rocket className="h-4 w-4" />}
                  <span>{userLimits?.canDeploy ? 'Deploy Portfolio' : 'Upgrade to Deploy'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="bg-white rounded-xl p-8 border border-[#06070A]/10 shadow-lg mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Edit3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-light text-[#06070A] text-base mb-1">Quick Text Edits</p>
                <p className="text-[#06070A]/60 text-xs font-light leading-relaxed">
                  Click any text to make instant changes to your content
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-light text-[#06070A] text-base mb-1">AI Assistant</p>
                <p className="text-[#06070A]/60 text-xs font-light leading-relaxed">
                  Describe changes you want to make to your portfolio
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                {userLimits?.canDeploy ? (
                  <Rocket className="h-6 w-6 text-purple-600" />
                ) : (
                  <Lock className="h-6 w-6 text-purple-600" />
                )}
              </div>
              <div>
                <p className="font-light text-[#06070A] text-base mb-1">
                  {userLimits?.canDeploy ? 'One-Click Deploy' : 'Deployment Available'}
                </p>
                <p className="text-[#06070A]/60 text-xs font-light leading-relaxed">
                  {userLimits?.canDeploy 
                    ? 'Make your portfolio live on the web instantly'
                    : 'Upgrade to deploy your portfolio to the web'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default Preview;