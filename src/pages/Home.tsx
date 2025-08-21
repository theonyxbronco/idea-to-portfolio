import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent } from "@/components/ui/card";
import WaitlistForm from "@/components/WaitlistForm";
import { ArrowRight, FolderOpen, Palette, Edit3, CheckCircle, Play, Eye, Sparkles, User, Target, Camera, Lightbulb, Calendar } from "lucide-react";
import { useParallax } from "@/hooks/use-parallax";

const Home = () => {
 const parallaxOffset = useParallax(0.6); // Slower scroll speed
 const navigate = useNavigate();
 const { isSignedIn } = useUser();

 const handleStartProject = () => {
   if (isSignedIn) {
     navigate('/create'); // or '/portfolio-builder' depending on your preference
   } else {
     navigate('/sign-in');
   }
 };

 return (
<div className="min-h-screen bg-[#FFFEEA] relative overflow-hidden">
  {/* Subtle noise effect */}
  <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  }} />

{/* Hero Section */}
     <section 
       className="relative py-32 px-4 bg-[#FFFEEA] parallax-hero z-[1]" 
       style={{ 
         transform: `translateY(${parallaxOffset}px)`,
         willChange: 'transform'
       }}
     >
       <div className="container mx-auto text-center">
         <h2 className="font-light text-xl text-[#06070A] opacity-50 mb-3">for creatives, by creatives</h2>
         <h1 className="text-5xl md:text-7xl font-light mb-6 text-[#06070A] leading-tight">
           Your Work,<br />Reimagined
         </h1>
         <p className="text-xl md:text-2xl font-medium text-[#06070A] opacity-80 mb-4 max-w-3xl mx-auto">
           Upload your projects. Choose your vibe. Get a portfolio in minutes.
         </p>
         <p className="text-lg text-[#06070A] opacity-60 mb-8 max-w-2xl mx-auto font-light">
           One portfolio. Every opportunity. Customize it for every application.
         </p>
         
         {/* Social Proof */}
         <div className="flex justify-center items-center gap-6 mb-8 text-sm text-[#06070A] opacity-60 font-light">
           <div className="flex items-center gap-2">
             <Sparkles className="w-4 h-4 text-[#06070A]" />
             <span>AI-powered</span>
           </div>
           <div className="flex items-center gap-2">
             <Palette className="w-4 h-4 text-[#06070A]" />
             <span>Moodboard driven</span>
           </div>
           <div className="flex items-center gap-2">
             <CheckCircle className="w-4 h-4 text-[#06070A]" />
             <span>5-minute deploy</span>
           </div>
         </div>
         
         <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
           <Button 
             onClick={handleStartProject} 
             className="text-xl px-10 py-7 bg-[#06070A] hover:bg-[#06070A]/90 text-[#FFFEEA] border-0 rounded-full transition-all duration-200 hover:scale-105"
           >
             Start With Your Best Project <ArrowRight className="ml-2" />
           </Button>
           <Button 
             variant="outline" 
             className="text-lg px-8 py-7 border-2 border-[#06070A]/20 text-[#06070A] hover:bg-[#06070A] hover:text-[#FFFEEA] rounded-full transition-all duration-200 hover:scale-105"
             onClick={() => navigate('/showroom')}
           >
             <Eye className="mr-2 w-5 h-5" />
             Browse Portfolio Showroom
           </Button>
         </div>
       </div>
     </section>

     {/* Demo Video Section - Prime real estate after hero */}
     <section className="relative bg-[#FFFEEA] py-20 px-4 z-[5]">
       <div className="container mx-auto text-center">
         <h2 className="text-3xl md:text-4xl font-light mb-4 text-[#06070A] leading-tight">
           See Prism<br />in Action
         </h2>
         <p className="text-lg text-[#06070A] opacity-60 mb-8 max-w-2xl mx-auto font-light">
           Watch how we transform scattered projects into stunning portfolios in minutes
         </p>
         
         {/* Video Container - Placeholder for now */}
         <div className="max-w-4xl mx-auto">
           <div className="relative aspect-video bg-gradient-to-br from-[#06070A]/5 to-[#06070A]/10 rounded-xl overflow-hidden shadow-lg border border-[#06070A]/10">
             {/* Placeholder for video */}
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="text-center">
                 <div className="w-20 h-20 bg-[#06070A] rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform cursor-pointer">
                   <Play className="w-10 h-10 text-[#FFFEEA] ml-1" />
                 </div>
                 <p className="text-lg font-light text-[#06070A] mb-2">Watch Prism Demo</p>
                 <p className="text-sm text-[#06070A]/60 font-light">See how Sarah created her portfolio in 3 minutes</p>
               </div>
             </div>
             
             {/* Video overlay elements for visual appeal */}
             <div className="absolute top-4 left-4 bg-[#FFFEEA]/90 backdrop-blur-sm rounded-lg px-3 py-2">
               <span className="text-sm font-light text-[#06070A]">3:24</span>
             </div>
             <div className="absolute top-4 right-4 bg-[#06070A] text-[#FFFEEA] text-xs font-light px-2 py-1 rounded">
               LIVE
             </div>
           </div>
           
           {/* Video stats below */}
           <div className="flex justify-center items-center gap-8 mt-6 text-sm text-[#06070A]/60 font-light">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-[#06070A] rounded-full"></div>
               <span>Average generation time: 3.2 minutes</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-[#06070A] rounded-full"></div>
               <span>50+ portfolios created</span>
             </div>
           </div>
         </div>
       </div>
     </section>

     {/* How It Works Section */}
     <section className="relative bg-[#FFFEEA]/80 backdrop-blur-[10px] py-32 px-4 md:m-[60px] m-[5%] border border-[#06070A]/10 rounded-xl shadow-sm z-[10]">
       <div className="container mx-auto">
         <div className="text-center mb-16">
           <h2 className="text-4xl font-light mb-2 text-[#06070A] leading-tight">From Scattered Work<br />to Stunning Stories</h2>
           <p className="text-lg font-light text-[#06070A]/60 max-w-2xl mx-auto">
             Transform your creative projects into professional portfolios with our AI-powered platform
           </p>
         </div>
         
         <div className="grid md:grid-cols-3 gap-8 cursor-default">
           <Card className="bg-[#FFFEEA] border border-[#06070A]/10 shadow-sm hover:shadow-md transition-all duration-300">
             <CardContent className="p-8 text-left">
               <div className="w-16 h-16 bg-[#06070A]/10 rounded-full flex items-center justify-center mb-6">
                 <FolderOpen className="w-8 h-8 text-[#06070A]" />
               </div>
               <h3 className="text-2xl font-light mb-4 text-[#06070A]">Upload Your Best Work</h3>
               <p className="font-light text-[#06070A]/60 leading-relaxed">
                 Drop your projects, add context, and upload process images. Our AI understands your creative workflow and the story behind each piece.
               </p>
             </CardContent>
           </Card>
           
           <Card className="bg-[#FFFEEA] border border-[#06070A]/10 shadow-sm hover:shadow-md transition-all duration-300">
             <CardContent className="p-8 text-left">
               <div className="w-16 h-16 bg-[#06070A]/10 rounded-full flex items-center justify-center mb-6">
                 <Palette className="w-8 h-8 text-[#06070A]" />
               </div>
               <h3 className="text-2xl font-light mb-4 text-[#06070A]">Show Us Your Style</h3>
               <p className="font-light text-[#06070A]/60 leading-relaxed">
                 Upload moodboard images of designs you love. Our computer vision AI analyzes colors, layouts, and aesthetics to match your taste perfectly.
               </p>
             </CardContent>
           </Card>
           
           <Card className="bg-[#FFFEEA] border border-[#06070A]/10 shadow-sm hover:shadow-md transition-all duration-300">
             <CardContent className="p-8 text-left">
               <div className="w-16 h-16 bg-[#06070A]/10 rounded-full flex items-center justify-center mb-6">
                 <Edit3 className="w-8 h-8 text-[#06070A]" />
               </div>
               <h3 className="text-2xl font-light mb-4 text-[#06070A]">Get Multiple Versions</h3>
               <p className="font-light text-[#06070A]/60 leading-relaxed">
                 Receive a stunning portfolio in minutes, then customize it for different opportunities. Same work, infinite presentations.
               </p>
             </CardContent>
           </Card>
         </div>
       </div>
     </section>

     {/* Social Proof / Showroom Teaser */}
     <section className="py-20 px-4 bg-gradient-to-br from-[#06070A]/5 to-[#06070A]/10">
       <div className="container mx-auto text-center">
         <h2 className="text-3xl font-light mb-4 text-[#06070A] leading-tight">
           Join Creatives<br />Showcasing Their Work
         </h2>
         <p className="text-lg text-[#06070A]/60 mb-8 max-w-2xl mx-auto font-light">
           Discover amazing portfolios created with Prism and get inspired by fellow creatives from around the world.
         </p>
         <Button 
           className="border-2 border-[#06070A]/20 text-[#FFFEEA] hover:bg-[#FFFFFF] hover:text-[#06070A] rounded-full transition-all duration-200 hover:scale-105"
           onClick={() => navigate('/showroom')}
         >
           <Eye className="mr-2 w-5 h-5" />
           Explore Portfolio Showroom
         </Button>
       </div>
     </section>

     {/* Waitlist Section */}
     <section className="px-[60px] pt-24 pb-40 bg-[#FFFEEA]">
       <div className="">
         <WaitlistForm />
       </div>
     </section>
   </div>
 );
};

export default Home;