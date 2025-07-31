import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut } from '@clerk/clerk-react';

// Auth Components
import { 
  SignInPage, 
  SignUpPage, 
  ProtectedRoute,
  AuthStatus 
} from '@/components/auth/AuthComponents';

// Existing Pages
import Index from "@/pages/Index";
import Preview from "@/pages/Preview";
import Deployment from "@/pages/Deployment";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import ProWaitlist from "@/pages/ProWaitlist";
import Support from "@/pages/support";

// New Modular Pages
import UserPage from "@/pages/User";
import ProjectsPage from "@/pages/projects";

// Updated Components
import ProjectDetailsForm from "@/components/ProjectDetailsForm";

function App() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* Top Navigation Bar */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" className="font-bold text-xl">
              Moodi
            </a>
          </div>
          <AuthStatus />
        </div>
      </nav>

      <Routes>
        {/* Public Routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        
        {/* Pro Waitlist - Accessible to both signed in and out users */}
        <Route path="/pro-waitlist" element={<ProWaitlist />} />
        
        {/* Support - Accessible to both signed in and out users */}
        <Route path="/support" element={<Support />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <>
            <SignedIn>
              <Dashboard />
            </SignedIn>
            <SignedOut>
              <Index />
            </SignedOut>
          </>
        } />
        
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
    </div>
  );
}

export default App;