import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Crown, 
  Check, 
  Sparkles, 
  Loader2,
  Mail
} from 'lucide-react';

const ProWaitlist: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const proFeatures = [
    'Unlimited portfolios',
    'Advanced AI editing',
    'Custom domains',
    'Analytics dashboard',
    'White-label options',
    'Priority support'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/join-waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          source: 'pro-waitlist',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer || 'direct'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to join waitlist');
      }

      setHasJoined(true);
      setEmail('');
      
      toast({
        title: "🎉 You're on the list!",
        description: "We'll notify you when Pro features launch with your exclusive 50% discount.",
      });

      // Track analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'waitlist_signup', {
          'event_category': 'engagement',
          'event_label': 'pro_waitlist'
        });
      }

    } catch (error) {
      console.error('Error joining waitlist:', error);
      toast({
        title: "Oops! Something went wrong",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-8 hover:bg-white/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Moodi
          </Button>

          {/* Main Card */}
          <Card className="shadow-large border-0 overflow-hidden">
            <CardContent className="p-0">
              {/* Header Section */}
              <div className="bg-gradient-primary text-primary-foreground text-center p-8">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <Crown className="h-8 w-8" />
                  </div>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center">
                  <span className="text-2xl mr-2">🔥</span>
                  Pro Features Coming Soon!
                </h1>
                
                <p className="text-xl text-primary-foreground/80">
                  Supercharge your portfolio creation with advanced AI features
                </p>
              </div>

              {/* Content Section */}
              <div className="p-8 space-y-8">
                {/* Features List */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
                    What's included in Pro:
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {proFeatures.map((feature, index) => (
                      <div 
                        key={index}
                        className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="font-medium text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Section */}
                <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                  <CardContent className="p-6 text-center">
                    <Badge className="bg-green-500 text-white mb-4">
                      <Sparkles className="h-3 w-3 mr-1" />
                      50% Off Launch Price
                    </Badge>
                    
                    <p className="text-muted-foreground mb-4">
                      Join waitlist for exclusive early bird pricing
                    </p>
                    
                    <div className="flex justify-center items-center space-x-8 mb-6">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">Normal</div>
                        <div className="text-2xl font-bold text-muted-foreground line-through">
                          €39<span className="text-sm font-normal">/month</span>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">Early Bird</div>
                        <div className="text-3xl font-bold text-green-600">
                          €19<span className="text-lg font-normal">/month</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Waitlist Form */}
                <div className="space-y-4">
                  {hasJoined ? (
                    <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-green-800 mb-2">
                        🎉 You're on the list!
                      </h3>
                      <p className="text-green-700">
                        We'll notify you when Pro features launch with your exclusive 50% discount.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12 text-base shadow-soft border-0 focus:ring-2 focus:ring-accent"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      
                      <Button
                        type="submit"
                        variant="build"
                        size="lg"
                        className="w-full h-12 text-lg"
                        disabled={isSubmitting || !email.trim()}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Joining Waitlist...
                          </>
                        ) : (
                          <>
                            <Mail className="h-5 w-5 mr-2" />
                            Join Waitlist - Get 50% Off
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                  
                  <p className="text-center text-sm text-muted-foreground">
                    <span className="font-medium text-accent">Expected launch:</span> September 2025 • Limited early bird spots
                  </p>
                </div>

                {/* Additional Info */}
                <div className="bg-muted/30 rounded-lg p-6 text-center">
                  <h3 className="font-semibold text-foreground mb-2">
                    Why join the waitlist?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl mb-1">⚡</span>
                      <span>Be first to access</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl mb-1">💰</span>
                      <span>50% discount guaranteed</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl mb-1">🎯</span>
                      <span>Shape the features</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProWaitlist;