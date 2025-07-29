// src/pages/Deployment.tsx - Simplified deployment success page
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Lock
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Deployment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const deploymentData = location.state || {
    portfolioData: { personalInfo: { name: 'Sample Project' } },
    deploymentUrl: 'https://amazing-portfolio-xyz.netlify.app',
    platform: 'Netlify',
    deployedAt: new Date().toISOString()
  };

  const { portfolioData, deploymentUrl, platform, deployedAt, generatedPortfolio } = deploymentData;

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
        metadata: location.state?.metadata 
      } 
    });
  };

  const handleProFeature = () => {
    toast({
      title: "Pro Feature",
      description: "Advanced editing is available in our Pro plan. Coming soon!",
      variant: "default",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header with Flow Progress */}
          <div className="text-center mb-12">
            {/* Flow Progress Indicator */}
            <div className="flex justify-center items-center space-x-2 text-sm mb-6">
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>Generated</span>
              </div>
              <div className="w-8 h-px bg-green-600"></div>
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>Previewed</span>
              </div>
              <div className="w-8 h-px bg-green-600"></div>
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>Deployed</span>
              </div>
            </div>

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

          {/* Main Content */}
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

            {/* Navigation Options */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                variant="outline"
                onClick={handleBackToPreview}
                className="shadow-soft"
              >
                <Eye className="h-4 w-4 mr-2" />
                Back to Preview
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open(deploymentUrl, '_blank')}
                className="shadow-soft"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Live Site
              </Button>

              <Button
                variant="build"
                onClick={handleStartNew}
                className="shadow-medium"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Create New Portfolio
              </Button>
            </div>

            {/* Pro Features Teaser */}
            <Card className="shadow-medium border-0 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                      <Crown className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Want to Edit Your Portfolio?</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Advanced editing features including visual editor, custom styling, and real-time text editing are coming soon in our Pro plan!
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
                    <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Visual Editor</span>
                    <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Custom Styling</span>
                    <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Real-time Editing</span>
                    <span className="flex items-center"><Lock className="h-3 w-3 mr-1" />Advanced Layouts</span>
                  </div>
                  <Button 
                    onClick={handleProFeature}
                    variant="default"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Learn More About Pro
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="shadow-medium border-0 bg-gradient-subtle">
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
                        <p className="text-muted-foreground">Copy the URL and share it with potential clients, employers, or on social media</p>
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
                        <p className="font-medium">Upgrade for Editing</p>
                        <p className="text-muted-foreground">Get access to advanced editing tools when Pro launches</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Deployment;