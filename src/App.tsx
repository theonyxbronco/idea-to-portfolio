import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route, useLocation } from "react-router-dom";
import { SignedIn, SignedOut } from '@clerk/clerk-react';

// Auth Components
import { 
  SignInPage, 
  SignUpPage, 
  ProtectedRoute,
} from '@/components/auth/AuthComponents';

// Existing Pages
import Index from "@/pages/Index";
import Preview from "@/pages/Preview";
import Deployment from "@/pages/Deployment";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import ProWaitlist from "@/pages/ProWaitlist";
import Support from "@/pages/support";
import Navigation from "./components/Navigation";

// New Landing Pages
import Home from "@/pages/Home";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";

// New Modular Pages
import UserPage from "@/pages/user";
import ProjectsPage from "@/pages/projects";

// Updated Components
import ProjectDetailsForm from "@/components/ProjectDetailsForm";

import Lenis from "@studio-freight/lenis";

// Smooth Scroll Wrapper Component
const SmoothScrollWrapper = ({ children }) => {
  const lenisRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    // Initialize Lenis
    lenisRef.current = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    // Animation frame loop
    function raf(time) {
      lenisRef.current?.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenisRef.current?.destroy();
    };
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [location.pathname]);

  return <>{children}</>;
};

function App() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <SmoothScrollWrapper>
        {/* Top Navigation Bar */}
        <Navigation />

        <Routes>
          {/* Public Landing Pages */}
          <Route path="/home" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          
          {/* Public Routes */}
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          
          {/* Pro Waitlist - Accessible to both signed in and out users */}
          <Route path="/pro-waitlist" element={<ProWaitlist />} />
          
          {/* Support - Accessible to both signed in and out users */}
          <Route path="/support" element={<Support />} />
          
          {/* Main Route - Dashboard for logged in, Landing for logged out */}
          <Route path="/" element={
            <>
              <SignedIn>
                <Dashboard />
              </SignedIn>
              <SignedOut>
                <Home />
              </SignedOut>
            </>
          } />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/create" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          
          {/* New Modular Routes */}
          <Route path="/user" element={
            <ProtectedRoute>
              <UserPage />
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/portfolio-builder" element={
            <ProtectedRoute>
              <ProjectDetailsForm />
            </ProtectedRoute>
          } />
          
          {/* Existing Portfolio Routes */}
          <Route path="/preview" element={
            <ProtectedRoute>
              <Preview />
            </ProtectedRoute>
          } />
          
          <Route path="/deployment" element={
            <ProtectedRoute>
              <Deployment />
            </ProtectedRoute>
          } />
          
          {/* Legacy route - redirect to new modular flow */}
          <Route path="/create-portfolio" element={
            <ProtectedRoute>
              <UserPage />
            </ProtectedRoute>
          } />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        <Toaster />
      </SmoothScrollWrapper>
    </div>
  );
}

export default App;