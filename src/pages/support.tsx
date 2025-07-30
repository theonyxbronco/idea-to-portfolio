import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MessageCircle, 
  Clock, 
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Send,
  CheckCircle,
  ExternalLink,
  Sparkles,
  CreditCard,
  Shield,
  Download,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Support = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How does the AI portfolio generation work?",
      answer: "Our AI analyzes your personal information, projects, and style preferences to create a custom portfolio website. It uses advanced language models to write compelling copy and generate responsive HTML/CSS that showcases your work professionally.",
      category: "AI & Generation"
    },
    {
      question: "Can I edit my portfolio after it's generated?",
      answer: "Yes! You can make quick text edits in our preview mode, apply AI suggestions, and use our AI Edit Assistant for a limited time. Pro users get advanced visual editing, custom styling, unlimited modifications, and unlimited AI Edit Assistance.",
      category: "Editing"
    },
    {
      question: "What file formats can I upload for my projects?",
      answer: "You can upload JPEG, PNG, GIF, and WebP images up to 5MB each. We support process images to show your workflow and final product images to showcase results.",
      category: "Files & Images"
    },
    {
      question: "Is my portfolio mobile-responsive?",
      answer: "Absolutely! All generated portfolios are fully responsive and optimized for mobile, tablet, and desktop viewing. You can preview different device sizes in our editor.",
      category: "Technical"
    },
    {
      question: "How do I deploy my portfolio to the web?",
      answer: "Click the 'Deploy to Web' button and we'll automatically publish your portfolio to Netlify with a free subdomain. You can also download the HTML files to host anywhere.",
      category: "Deployment"
    },
    {
      question: "What's included in the Pro plan?",
      answer: "Pro includes unlimited portfolios, advanced AI editing, custom domains, analytics dashboard, white-label options, priority support, and advanced customization tools.",
      category: "Pro Features"
    },
    {
      question: "Can I use my own domain name?",
      answer: "Custom domains are available with Pro plans. You can connect your existing domain or register a new one through our platform.",
      category: "Pro Features"
    },
    {
      question: "How secure is my data?",
      answer: "We use enterprise-grade security with encrypted data transmission and storage. Your personal information and projects are never shared with third parties.",
      category: "Security & Privacy"
    },
    {
      question: "Can I download my portfolio files?",
      answer: "Yes! You can download your complete portfolio as a ZIP file containing HTML, CSS, and all images. This gives you full ownership and portability.",
      category: "Files & Images"
    },
    {
      question: "What if I need help with my portfolio?",
      answer: "We offer multiple support channels: this help center, email support, and priority support for Pro users. Check our FAQ first, then contact us directly, we are MORE than willing to help.",
      category: "Support"
    },
    {
      question: "How long does portfolio generation take?",
      answer: "Most portfolios generate in 2-5 minutes. Complex portfolios with many projects or images may take up to 10 minutes. Our AI will auto-complete if generation is interrupted.",
      category: "AI & Generation"
    },
    {
      question: "Can I create multiple portfolios?",
      answer: "Free users can create only a single portfolio. Pro users get access to unlimited portfolios (I'm talking to the creatives with needs for portfolios in different niches), additional features like portfolio templates, faster generation, and advanced customization options.",
      category: "Plans & Billing"
    }
  ];

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      contact: "hello@moodi.ai",
      action: "mailto:jason@interractagency.com",
      response: "Usually within 24 hours"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Talk to us directly",
      contact: "+358 50 123 4567",
      action: "tel:+358501234567",
      response: "Mon-Sun, 10AM-10PM EET"
    }
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Message Sent! 🎉",
        description: "We'll get back to you within 24 hours.",
      });
      
      setContactForm({
        name: '',
        email: '',
        subject: '',
        message: '',
        priority: 'normal'
      });
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Support Center
              </h1>
              <p className="text-muted-foreground">
                Get help with Moodi and find answers to common questions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Help Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-medium border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900">AI Generation</h3>
                        <p className="text-sm text-blue-700">How AI creates portfolios</p>
                      </div>
                    </div>
                    <p className="text-sm text-blue-800 mb-4">
                      Learn about our AI technology and generation process
                    </p>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-200">
                      Learn More
                    </Button>
                  </CardContent>
                </Card>

                <Card className="shadow-medium border-0 bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-900">Quick Start</h3>
                        <p className="text-sm text-green-700">Get up and running fast</p>
                      </div>
                    </div>
                    <p className="text-sm text-green-800 mb-4">
                      Step-by-step guide to creating your first portfolio
                    </p>
                    <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-200">
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* FAQ Section */}
              <Card className="shadow-large border-0">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center">
                    <HelpCircle className="h-6 w-6 mr-3" />
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categories.map(category => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-lg text-foreground border-b border-border pb-2">
                        {category}
                      </h3>
                      {faqs
                        .filter(faq => faq.category === category)
                        .map((faq, index) => {
                          const globalIndex = faqs.indexOf(faq);
                          const isExpanded = expandedFaq === globalIndex;
                          
                          return (
                            <div
                              key={globalIndex}
                              className="border border-border rounded-lg transition-all hover:shadow-soft"
                            >
                              <button
                                onClick={() => toggleFaq(globalIndex)}
                                className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
                              >
                                <span className="font-medium text-foreground pr-4">
                                  {faq.question}
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                )}
                              </button>
                              
                              {isExpanded && (
                                <div className="px-4 pb-4">
                                  <p className="text-muted-foreground leading-relaxed">
                                    {faq.answer}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Methods */}
              <Card className="shadow-medium border-0">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Contact Us
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contactMethods.map((method, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg hover:shadow-soft transition-shadow">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <method.icon className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground mb-1">
                            {method.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {method.description}
                          </p>
                          <a
                            href={method.action}
                            className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                          >
                            {method.contact}
                          </a>
                          <div className="flex items-center text-xs text-muted-foreground mt-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {method.response}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Contact Form */}
              <Card className="shadow-medium border-0">
                <CardHeader>
                  <CardTitle className="text-xl">Send us a Message</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Can't find what you're looking for? Send us a direct message.
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        placeholder="Your Name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                        disabled={isSubmitting}
                      />
                      <Input
                        type="email"
                        placeholder="Your Email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <select
                        value={contactForm.priority}
                        onChange={(e) => setContactForm(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        disabled={isSubmitting}
                      >
                        <option value="low">General Question</option>
                        <option value="normal">Support Request</option>
                        <option value="high">Technical Issue</option>
                        <option value="urgent">Urgent Problem</option>
                      </select>
                    </div>
                    
                    <Input
                      placeholder="Subject"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                      required
                      disabled={isSubmitting}
                    />
                    
                    <Textarea
                      placeholder="Describe your question or issue in detail..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                      className="min-h-[120px] resize-none"
                      required
                      disabled={isSubmitting}
                    />
                    
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Status & Info */}
              <Card className="shadow-medium border-0 bg-gradient-to-br from-green-50 to-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">All Systems Operational</span>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    Moodi is running smoothly. Average response time: Same day!
                  </p>
                  <Button size="sm" variant="outline" className="w-full border-green-300 text-green-700">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Status Page
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Support Upgrade */}
              <Card className="shadow-medium border-0 bg-gradient-to-br from-purple-50 to-blue-50">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Priority Support</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Get faster response times and dedicated support with Pro
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    onClick={() => navigate('/pro-waitlist')}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Upgrade to Pro
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;