import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import WaitlistForm from "@/components/WaitlistForm";
import { ArrowRight, FolderOpen, Palette, Edit3, CheckCircle } from "lucide-react";
import { useParallax } from "@/hooks/use-parallax";

const Home = () => {
  const parallaxOffset = useParallax(0.6); // Slower scroll speed

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative py-32 px-4 bg-light parallax-hero z-[1]" 
        style={{ 
          transform: `translateY(${parallaxOffset}px)`,
          willChange: 'transform'
        }}
      >
        <div className="container mx-auto text-center">
          <h2 className="font-light text-xl text-primary opacity-50 mb-3">by creatives, for creatives.</h2>
          <h1 className="text-5xl md:text-7xl font-semibold mb-3 text-primary">
            Your Portfolio Builder
          </h1>
          <p className="text-xl md:text-2xl font-medium text-primary opacity-80 mb-8 max-w-3xl mx-auto">
            Never worry about a missing portfolio. We make yours in minutes.
          </p>
          {/* Social Proof */}
          <div className="flex justify-center items-center gap-6 mb-8 text-sm text-primary opacity-60">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>No templates</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Moodboard driven</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>5-minute deploy</span>
            </div>
          </div>
          <Button variant="default" size="lg" className="text-xl px-10 py-7">
            Try for free <ArrowRight className="ml-2" />
          </Button>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative bg-[#FAFAFA]/80 backdrop-blur-[10px] py-32 px-4 md:m-[60px] m-[5%] border border-gray-200 rounded-xl shadow-md z-[10]">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-regular mb-2">Here's How We Work For You</h2>
            <p className="text-lg font-regular text-primary opacity-50 max-w-2xl mx-auto">
              Experience seamless productivity with our innovative three-step approach
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 cursor-default">
            <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow transition-all duration-300">
              <CardContent className="p-8 text-left">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6">
                  <FolderOpen className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-regular mb-4">Store & Organize All of Your Creative Work In One Place</h3>
                <p className="font-light text-primary opacity-60">
                  We've created a space where you can safely and effortlessly keep your creative projects, assets, and materials accessible in one place across different devices.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow transition-all duration-300">
              <CardContent className="p-8 text-left">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6">
                  <Palette className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-regular mb-4">Generate Portfolios of Your Projects in Minutes</h3>
                <p className="font-light text-primary opacity-60">
                  Use our one-click builder to generate your portfolio websites by giving it moodboard inspirations, colours, styling guides, and have it published immediately.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow transition-all duration-300">
              <CardContent className="p-8 text-left">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6">
                  <Edit3 className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-regular mb-4">Edit, Modify, and Make your Portfolios Your Own</h3>
                <p className="font-light text-primary opacity-60">
                  Effortlesly chat with our AI editor to make fine-tuned edits to your portfolio websites and share it to your recruiter, the community, or friends.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section className="px-[60px] pt-24 pb-40">
        <div className="">
          <WaitlistForm />
        </div>
      </section>
    </div>
  );
};

export default Home;