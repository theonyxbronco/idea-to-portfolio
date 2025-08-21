import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { 
  Palette,          // Portfolio Builder
  Eye,              // Vision Analysis
  RefreshCw,        // AI Editor
  Briefcase,        // Deployment
  FolderKanban,     // Project Management
  Cloud,            // Storage
  ScanLine,         // Auto-organization
  Sparkles,         // General AI feature
  Layout,           // Layout analysis
  MessageCircle,    // Chat editor
  Globe             // Deployment
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Palette,
      title: "AI Portfolio Builder",
      description: "With one click of a button, you can generate custom portfolio websites for projects you have selected to showcase. Each portfolio is uniquely created to your taste and vision.",
      badge: "TAKES < 5 MINUTES"
    },
    {
      icon: Eye,
      title: "Computer Vision Analysis",
      description: "Our AI analyzes your moodboard images to extract colors, typography, layouts, and design patterns that perfectly match your aesthetic vision.",
      badge: null
    },
    {
      icon: Layout,
      title: "Moodboard Intelligence",
      description: "Upload inspiration images and watch AI understand your style preferences. No more choosing from generic templates - show us what you love.",
      badge: null
    },
    {
      icon: Sparkles,
      title: "Smart Showcase",
      description: "Upload multiple projects with process and final images. AI understands your creative workflow and showcases it professionally with compelling case studies.",
      badge: null
    },
    {
      icon: MessageCircle,
      title: "AI Chat Editor",
      description: "Use our built-in AI chat to tweak and edit your portfolio website. Whether it's colours, icons, structure, or visuals, we love to see you make it your own.",
      badge: null
    },
    {
      icon: Globe,
      title: "One-Click Web Deployment",
      description: "Deploy instantly to Netlify with a custom subdomain. Your portfolio goes live in seconds with professional hosting and SSL certificates included.",
      badge: null
    },
    {
      icon: FolderKanban,
      title: "Projects Management",
      description: "Our PRM system allows you to input and control your projects, their images, details, and assets all in one organized place.",
      badge: null
    },
    {
      icon: Cloud,
      title: "Project Assets Storage",
      description: "Safely store your projects, assets, and materials in our cloud servers and access them anywhere, anytime, on any device.",
      badge: null
    },
    {
      icon: ScanLine,
      title: "Asset Auto-Organization",
      description: "Our platform automatically understands your files, sifts through them, and organizes them in a coherent and logical fashion.",
      badge: "COMING SOON"
    },
  ];

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFFEEA] dark:bg-[#06070A] py-20 pt-36 transition-colors duration-500">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-light mb-3 text-[#06070A] dark:text-[#FFFEEA]" style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
            Powerful Features
          </h1>
          <p className="text-xl text-[#06070A]/60 dark:text-[#FFFEEA]/60 max-w-2xl mx-auto font-light">
            Our comprehensive suite of AI-powered tools helps you manage projects and create professional, unique portfolio websites in minutes.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-white dark:bg-[#FFFEEA]/5 border-[#06070A]/10 dark:border-[#FFFEEA]/20 rounded-xl hover:shadow-lg transition-all duration-300 group hover:scale-[1.02]"
            >
              <CardContent className="p-6 cursor-default">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#06070A] dark:bg-[#FFFEEA] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-5 h-5 text-[#FFFEEA] dark:text-[#06070A]" />
                  </div>
                  {feature.badge && (
                    <Badge className="bg-[#06070A]/10 dark:bg-[#FFFEEA]/10 text-[#06070A] dark:text-[#FFFEEA] border-[#06070A]/20 dark:border-[#FFFEEA]/20 text-xs font-light">
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-light mb-2 text-[#06070A] dark:text-[#FFFEEA]">{feature.title}</h3>
                <p className="text-[#06070A]/60 dark:text-[#FFFEEA]/60 font-light leading-relaxed text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-[#06070A] dark:bg-[#FFFEEA] p-12 rounded-2xl">
          <h2 className="text-3xl font-light mb-3 text-[#FFFEEA] dark:text-[#06070A]" style={{ fontFamily: 'Waldenburg, system-ui, sans-serif' }}>
            Ready to Experience These Features?
          </h2>
          <p className="text-lg text-[#FFFEEA]/60 dark:text-[#06070A]/60 mb-8 max-w-2xl mx-auto font-light">
            Join thousands of professionals who have already transformed their creative workflow
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/sign-in')} 
              className="bg-[#FFFEEA] text-[#06070A] dark:bg-[#06070A] dark:text-[#FFFEEA] px-8 py-3 rounded-full font-light hover:scale-105 transition-all duration-300 shadow-lg"
            >
              Start Free Trial
            </button>
            <button className="border border-[#FFFEEA] dark:border-[#06070A] text-[#FFFEEA] dark:text-[#06070A] px-8 py-3 rounded-full font-light hover:bg-[#FFFEEA] hover:text-[#06070A] dark:hover:bg-[#06070A] dark:hover:text-[#FFFEEA] transition-all duration-300">
              <Link to="/pricing">
                View Pricing
              </Link>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;