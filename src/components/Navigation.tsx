import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthStatus } from '@/components/auth/AuthComponents';
import { useUser } from '@clerk/clerk-react';

const Navigation = () => {
  const location = useLocation();
  const { isSignedIn } = useUser();

  // Define which pages should show the navigation
  const pagesWithNav = ['/', '/home', '/features', '/pricing', '/showroom', '/dashboard'];
  
  // Check if current page should show navigation
  const shouldShowNav = pagesWithNav.includes(location.pathname);

  // Don't show navigation on other pages
  if (!shouldShowNav) {
    return null;
  }

  // Define which pages should show the full navigation (landing pages)
  const publicLandingPages = ['/', '/home', '/features', '/pricing', '/showroom'];
  const shouldShowFullNav = publicLandingPages.includes(location.pathname);

  // For dashboard, show minimal navigation
  if (!shouldShowFullNav) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFEEA]/80 backdrop-blur-md border-b border-[#06070A]/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Prism text */}
            <div className="flex-1">
              <Link to="/" className="text-2xl font-light text-[#06070A] hover:opacity-80 transition-opacity">
                Prism
              </Link>
            </div>

            {/* Right side - User menu */}
            <div className="flex items-center space-x-4">
              <AuthStatus />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Full navigation for landing pages
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFEEA]/80 backdrop-blur-md border-b border-[#06070A]/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 relative">
          {/* Left side - Prism text */}
          <div className="flex-1 md:flex-none">
            <Link to="/" className="text-2xl font-light text-[#06070A] hover:opacity-80 transition-opacity">
              Prism
            </Link>
          </div>

          {/* Navigation Links - Centered */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
            <Link 
              to="/features" 
              className={`text-sm font-light transition-colors hover:text-[#06070A] ${
                location.pathname === '/features' ? 'text-[#06070A]' : 'text-[#06070A]/60'
              }`}
            >
              Features
            </Link>
            <Link 
              to="/pricing" 
              className={`text-sm font-light transition-colors hover:text-[#06070A] ${
                location.pathname === '/pricing' ? 'text-[#06070A]' : 'text-[#06070A]/60'
              }`}
            >
              Pricing
            </Link>
            <Link 
              to="/showroom" 
              className={`text-sm font-light transition-colors hover:text-[#06070A] ${
                location.pathname === '/showroom' ? 'text-[#06070A]' : 'text-[#06070A]/60'
              }`}
            >
              Showroom
            </Link>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4 flex-1 justify-end">
            {/* Auth Status */}
            <AuthStatus />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;