import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, 
  Twitter, 
  Linkedin, 
  Facebook, 
  Instagram, 
  Copy, 
  Check,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ViralSharingProps {
  portfolioData?: {
    personalInfo?: {
      name?: string;
      title?: string;
    };
    projects?: Array<{ title?: string }>;
  };
  deploymentUrl?: string;
  isDeployed?: boolean;
  variant?: 'preview' | 'deployed';
}

type SocialMessage = {
  text: string;
  hashtags?: string;
};

type EmailMessage = {
  subject: string;
  body: string;
};

type PlatformMessages = {
  twitter: SocialMessage;
  linkedin: SocialMessage;
  facebook: SocialMessage;
  instagram: SocialMessage;
  email: EmailMessage;
};

const ViralSharing: React.FC<ViralSharingProps> = ({ 
  portfolioData, 
  deploymentUrl, 
  isDeployed = false,
  variant = 'preview' 
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [shareCount, setShareCount] = useState(0);

  // Check if native sharing is available (mobile)
  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Generate sharing content
  const generateShareContent = (platform: keyof PlatformMessages) => {
    const name = portfolioData?.personalInfo?.name || 'My';
    const title = portfolioData?.personalInfo?.title || 'portfolio';
    const projectCount = portfolioData?.projects?.length || 0;
    const url = deploymentUrl || 'https://moodi.ai';

    const messages: PlatformMessages = {
      twitter: {
        text: `Just built my ${title.toLowerCase()} portfolio in minutes with AI! 🚀\n\n${projectCount} projects, zero design skills needed. Moodi made it incredibly easy.\n\n${url}`,
        hashtags: 'Portfolio,AI,Design,WebDev,Moodi'
      },
      linkedin: {
        text: `I just created my professional ${title.toLowerCase()} portfolio using Moodi's AI-powered platform! \n\nWhat used to take weeks now took just minutes. The AI analyzed my ${projectCount} projects and created a stunning, responsive portfolio that perfectly represents my work.\n\nIf you're looking to showcase your work professionally, I highly recommend checking it out: ${url}\n\n#Portfolio #AI #ProfessionalDevelopment #Design #Technology`,
      },
      facebook: {
        text: `Wow! Just created an amazing portfolio for my ${title.toLowerCase()} work using Moodi. \n\nThe AI took my ${projectCount} projects and turned them into something that looks professionally designed. Took me literally 5 minutes!\n\nCheck it out: ${url}`,
      },
      instagram: {
        text: `New portfolio drop! 💫\n\nUsed Moodi AI to create this in minutes (yes, minutes!). AI-powered design is incredible.\n\nSwipe to see the process ➡️\n\nLink in bio: ${url}\n\n#portfolio #ai #design #creative #tech #moodi`,
      },
      email: {
        subject: `Check out my new ${title} portfolio!`,
        body: `Hi!\n\nI just created a new portfolio using Moodi - an AI-powered portfolio builder. It turned my ${projectCount} projects into a professional showcase in just a few minutes.\n\nTake a look: ${url}\n\nIf you need to create a portfolio, I'd definitely recommend trying Moodi. It's incredibly easy to use!\n\nBest regards,\n${name}`
      }
    };

    return messages[platform];
  };

  // Handle native sharing (mobile)
  const handleNativeShare = async () => {
    if (!hasNativeShare) return;

    try {
      const content = generateShareContent('twitter');
      await navigator.share({
        title: `${portfolioData?.personalInfo?.name || 'My'} Portfolio`,
        text: content.text,
        url: deploymentUrl || window.location.href,
      });
      
      setShareCount(prev => prev + 1);
      toast({
        title: "Thanks for sharing! 🎉",
        description: "Your share will help others discover Moodi!",
      });
    } catch (err) {
      // User cancelled or error occurred
      if ((err as Error).name !== 'AbortError') {
        toast({
          title: "Share failed",
          description: "Please try a specific platform instead",
          variant: "destructive",
        });
      }
    }
  };

  // Handle social sharing
  const handleShare = async (platform: keyof PlatformMessages) => {
    const content = generateShareContent(platform);
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content.text)}&hashtags=${encodeURIComponent(content.hashtags || '')}`;
        break;
        
      case 'linkedin':
        // Modern LinkedIn sharing - include URL in text since summary parameter is deprecated
        const linkedinText = content.text + '\n\n' + (deploymentUrl || 'https://moodi.ai');
        shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(linkedinText)}`;
        break;
        
      case 'facebook':
        // Facebook will show the quote parameter in some cases
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deploymentUrl || 'https://moodi.ai')}&quote=${encodeURIComponent(content.text)}`;
        break;
        
      case 'instagram':
        // Instagram workaround: copy text first, then open Instagram
        try {
          await navigator.clipboard.writeText(content.text);
          toast({
            title: "Text copied! 📋",
            description: "Paste this into your Instagram post. Opening Instagram...",
          });
          // Open Instagram web after short delay
          setTimeout(() => {
            window.open('https://www.instagram.com/', '_blank');
          }, 1500);
          setShareCount(prev => prev + 1);
          return; // Don't continue with normal flow
        } catch (err) {
          toast({
            title: "Manual copy needed",
            description: "Copy the text from the pre-made posts section below",
            variant: "destructive",
          });
          return;
        }
        
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(content.body)}`;
        break;
        
      default:
        return;
    }

    // Track share
    setShareCount(prev => prev + 1);
    
    // Open share window
    if (platform === 'email') {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    // Show success message
    const platformMessages = {
      twitter: "Your tweet is ready to post!",
      linkedin: "Your LinkedIn post is ready!",
      facebook: "Your Facebook post is ready!",
      email: "Email client opened with your message!"
    };

    toast({
      title: "Thanks for sharing! 🎉",
      description: platformMessages[platform as keyof typeof platformMessages] || `Your ${platform} post will help others discover Moodi!`,
    });
  };

  // Copy portfolio link
  const copyPortfolioLink = async () => {
    const linkToCopy = deploymentUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link Copied!",
        description: "Portfolio link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  // Copy pre-made post
  const copyPreMadePost = async (platform: keyof PlatformMessages) => {
    const content = generateShareContent(platform);
    const textToCopy = platform === 'email' ? content.body : (content as SocialMessage).text;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Post Copied!",
        description: `${platform} post copied to clipboard - just paste and share!`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the text manually",
        variant: "destructive",
      });
    }
  };

  const shareButtons = [
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-blue-500 hover:bg-blue-600',
      platform: 'twitter' as const,
      preloadWorks: true
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800',
      platform: 'linkedin' as const,
      preloadWorks: true
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      platform: 'facebook' as const,
      preloadWorks: false
    }
  ];

  return (
    <Card className="shadow-large border-0 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <Share2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {variant === 'deployed' ? 'Share Your Success! 🎉' : 'Love Your Portfolio?'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {variant === 'deployed' 
                ? "Show the world what you built with Moodi! Help others discover how easy it is to create stunning portfolios."
                : "Help others discover Moodi by sharing how quickly you created your portfolio!"
              }
            </p>
            
            {shareCount > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                {shareCount} share{shareCount !== 1 ? 's' : ''} - You're awesome!
              </Badge>
            )}
          </div>

          {/* Native Mobile Share */}
          {hasNativeShare && isMobile && (
            <div className="space-y-3">
              <Button
                onClick={handleNativeShare}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-medium hover:shadow-large transition-all duration-200 hover:transform hover:scale-105"
                size="lg"
              >
                <Smartphone className="h-5 w-5 mr-2" />
                Quick Share
              </Button>
              <div className="text-center">
                <span className="text-xs text-gray-500">or choose a specific platform:</span>
              </div>
            </div>
          )}

          {/* Quick Share Buttons */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 text-center">
              One-Click Sharing
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {shareButtons.map((button) => (
                <div key={button.platform} className="relative">
                  <Button
                    onClick={() => handleShare(button.platform)}
                    className={`${button.color} text-white border-0 shadow-medium hover:shadow-large transition-all duration-200 hover:transform hover:scale-105 w-full`}
                    size="sm"
                  >
                    <button.icon className="h-4 w-4 mr-2" />
                    {button.name}
                  </Button>
                  {button.preloadWorks && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" title="Text preloads automatically" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Instagram and Email buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleShare('instagram')}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0 shadow-medium hover:shadow-large transition-all duration-200"
                size="sm"
              >
                <Instagram className="h-4 w-4 mr-2" />
                Instagram
              </Button>
              <Button
                onClick={() => handleShare('email')}
                variant="outline"
                className="shadow-soft hover:shadow-medium transition-all duration-200"
                size="sm"
              >
                📧 Email
              </Button>
            </div>
          </div>

          {/* Copy Link */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 text-center">
              Share Direct Link
            </h4>
            <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 truncate">
                  {deploymentUrl || (typeof window !== 'undefined' ? window.location.href : 'https://moodi.ai')}
                </p>
              </div>
              <Button
                onClick={copyPortfolioLink}
                variant="outline"
                size="sm"
                className="shadow-soft"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Pre-made Posts */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 text-center">
              Copy Pre-Made Posts
            </h4>
            <div className="space-y-2">
              {[...shareButtons, { name: 'Instagram', icon: Instagram, platform: 'instagram' as const }].map((button) => {
                const content = generateShareContent(button.platform);
                return (
                  <div key={`copy-${button.platform}`} className="p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <button.icon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">{button.name} Post</span>
                        {button.platform === 'instagram' && (
                          <Badge variant="secondary" className="text-xs">
                            Copy Required
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={() => copyPreMadePost(button.platform)}
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                      >
                        Copy Text
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {(content as SocialMessage).text.substring(0, 120)}...
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3">
              Every share helps more creators discover Moodi! 
            </p>
          </div>

          {/* Incentive for sharing */}
          {variant === 'deployed' && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-3">
                <Sparkles className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Sharing Bonus! 
                  </p>
                  <p className="text-xs text-yellow-700">
                    Share on 2+ platforms and get early access to Pro features when they launch!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ViralSharing;