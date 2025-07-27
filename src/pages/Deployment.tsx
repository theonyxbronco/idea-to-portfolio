import React, { useState, useEffect } from 'react';
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
  Key,
  RefreshCw
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Deployment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const deploymentData = location.state || {
    projectData: { title: 'Sample Project' },
    deploymentUrl: 'https://amazing-portfolio-xyz.netlify.app',
    platform: 'Netlify',
    deployedAt: new Date().toISOString()
  };

  const { projectData, deploymentUrl, platform, deployedAt } = deploymentData;

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
    navigate('/preview', { state: { projectData } });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center shadow-large">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              🎉 Deployment Successful!
            </h1>
            <p className="text-xl text-muted-foreground">
              Your portfolio is now live and accessible to the world
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
                        Visit
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

            {/* Deployment Information */}
            <Card className="shadow-medium border-0">
              <CardHeader>
                <CardTitle className="text-xl">Deployment Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Project Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Project Name:</span>
                          <span className="font-medium">{projectData.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform:</span>
                          <Badge variant="secondary">{platform}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Access Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SSL Certificate:</span>
                          <Badge variant="secondary" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Custom Domain:</span>
                          <span className="text-xs text-muted-foreground">Available with upgrade</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                variant="outline"
                onClick={handleBackToPreview}
                className="shadow-soft"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
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

            {/* Next Steps */}
            <Card className="shadow-medium border-0 bg-gradient-subtle">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">What's Next?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start space-x-3">
                    <Key className="h-4 w-4 text-accent mt-0.5" />
                    <div>
                      <p className="font-medium">Share Your Portfolio</p>
                      <p className="text-muted-foreground">Copy the URL and share it with potential clients or employers</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Download className="h-4 w-4 text-accent mt-0.5" />
                    <div>
                      <p className="font-medium">Download Source Code</p>
                      <p className="text-muted-foreground">Get the source code to customize further or host elsewhere</p>
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