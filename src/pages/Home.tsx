import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent } from "@/components/ui/card";
import WaitlistForm from "@/components/WaitlistForm";
import { ArrowRight, FolderOpen, Palette, Edit3, CheckCircle, Play, Eye } from "lucide-react";
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
<div className="min-h-screen bg-background pt-16">
{/* Hero Section */}
     <section 
       className="relative py-32 px-4 bg-light parallax-hero z-[1]" 
       style={{ 
         transform: `translateY(${parallaxOffset}px)`,
         willChange: 'transform'
       }}
     >
       <div className="container mx-auto text-center">
         <h2 className="font-light text-xl text-primary opacity-50 mb-3">for creatives, by creatives</h2>
         <h1 className="text-5xl md:text-7xl font-semibold mb-6 text-primary">
           Your Work, Reimagined
         </h1>
         <p className="text-xl md:text-2xl font-medium text-primary opacity-80 mb-4 max-w-3xl mx-auto">
           Upload your projects. Choose your vibe. Get a portfolio in minutes.
         </p>
         <p className="text-lg text-primary opacity-60 mb-8 max-w-2xl mx-auto">
           One portfolio. Every opportunity. Customize it for every application.
         </p>
         
         {/* Social Proof */}
         <div className="flex justify-center items-center gap-6 mb-8 text-sm text-primary opacity-60">
           <div className="flex items-center gap-2">
             <CheckCircle className="w-4 h-4 text-green-600" />
             <span>AI-powered</span>
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
         
         <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
           <Button onClick={handleStartProject} variant="default" size="lg" className="text-xl px-10 py-7">
             Start With Your Best Project <ArrowRight className="ml-2" />
           </Button>
           <Button 
             variant="outline" 
             size="lg" 
             className="text-lg px-8 py-7 border-2"
             onClick={() => navigate('/showroom')}
           >
             <Eye className="mr-2 w-5 h-5" />
             Browse Portfolio Showroom
           </Button>
         </div>
       </div>
     </section>

     {/* Demo Video Section - Prime real estate after hero */}
     <section className="relative bg-white py-20 px-4 z-[5]">
       <div className="container mx-auto text-center">
         <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-primary">
           See Prism in Action
         </h2>
         <p className="text-lg text-primary opacity-60 mb-8 max-w-2xl mx-auto">
           Watch how we transform scattered projects into stunning portfolios in minutes
         </p>
         
         {/* Video Container - Placeholder for now */}
         <div className="max-w-4xl mx-auto">
           <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-2xl border border-gray-200">
             {/* Placeholder for video */}
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="text-center">
                 <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform cursor-pointer">
                   <Play className="w-10 h-10 text-white ml-1" />
                 </div>
                 <p className="text-lg font-medium text-gray-700 mb-2">Watch Prism Demo</p>
                 <p className="text-sm text-gray-500">See how Sarah created her portfolio in 3 minutes</p>
               </div>
             </div>
             
             {/* Video overlay elements for visual appeal */}
             <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
               <span className="text-sm font-medium text-gray-700">3:24</span>
             </div>
             <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
               LIVE
             </div>
           </div>
           
           {/* Video stats below */}
           <div className="flex justify-center items-center gap-8 mt-6 text-sm text-gray-600">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
               <span>Average generation time: 3.2 minutes</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
               <span>50+ portfolios created</span>
             </div>
           </div>
         </div>
       </div>
     </section>

     {/* How It Works Section */}
     <section className="relative bg-[#FAFAFA]/80 backdrop-blur-[10px] py-32 px-4 md:m-[60px] m-[5%] border border-gray-200 rounded-xl shadow-md z-[10]">
       <div className="container mx-auto">
         <div className="text-center mb-16">
           <h2 className="text-4xl font-regular mb-2">From Scattered Work to Stunning Stories</h2>
           <p className="text-lg font-regular text-primary opacity-50 max-w-2xl mx-auto">
             Transform your creative projects into professional portfolios with our AI-powered platform
           </p>
         </div>
         
         <div className="grid md:grid-cols-3 gap-8 cursor-default">
           <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow transition-all duration-300">
             <CardContent className="p-8 text-left">
               <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6">
                 <FolderOpen className="w-8 h-8 text-primary-foreground" />
               </div>
               <h3 className="text-2xl font-regular mb-4">Upload Your Best Work</h3>
               <p className="font-light text-primary opacity-60">
                 Drop your projects, add context, and upload process images. Our AI understands your creative workflow and the story behind each piece.
               </p>
             </CardContent>
           </Card>
           
           <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow transition-all duration-300">
             <CardContent className="p-8 text-left">
               <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6">
                 <Palette className="w-8 h-8 text-primary-foreground" />
               </div>
               <h3 className="text-2xl font-regular mb-4">Show Us Your Style</h3>
               <p className="font-light text-primary opacity-60">
                 Upload moodboard images of designs you love. Our computer vision AI analyzes colors, layouts, and aesthetics to match your taste perfectly.
               </p>
             </CardContent>
           </Card>
           
           <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow transition-all duration-300">
             <CardContent className="p-8 text-left">
               <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6">
                 <Edit3 className="w-8 h-8 text-primary-foreground" />
               </div>
               <h3 className="text-2xl font-regular mb-4">Get Multiple Versions</h3>
               <p className="font-light text-primary opacity-60">
                 Receive a stunning portfolio in minutes, then customize it for different opportunities. Same work, infinite presentations.
               </p>
             </CardContent>
           </Card>
         </div>
       </div>
     </section>

     {/* Social Proof / Showroom Teaser */}
     <section className="py-20 px-4 bg-gradient-to-br from-purple-50 to-blue-50">
       <div className="container mx-auto text-center">
         <h2 className="text-3xl font-semibold mb-4 text-gray-900">
           Join Creatives Showcasing Their Work
         </h2>
         <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
           Discover amazing portfolios created with Prism and get inspired by fellow creatives from around the world.
         </p>
         <Button 
           variant="outline" 
           size="lg" 
           className="border-2 border-purple-300 text-purple-700 hover:bg-purple-100"
           onClick={() => navigate('/showroom')}
         >
           <Eye className="mr-2 w-5 h-5" />
           Explore Portfolio Showroom
         </Button>
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