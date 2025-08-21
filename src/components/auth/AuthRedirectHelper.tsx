// src/components/auth/AuthRedirectHelper.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { API_BASE_URL } from '@/services/api';

interface AuthRedirectHelperProps {
  children: React.ReactNode;
}

export const AuthRedirectHelper: React.FC<AuthRedirectHelperProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load

    // If user is not signed in, redirect to sign-in (except for public routes)
    const publicRoutes = ['/', '/home', '/features', '/pricing', '/showroom', '/sign-in', '/sign-up', '/pro-waitlist', '/support'];
    const isPublicRoute = publicRoutes.includes(location.pathname) || location.pathname.startsWith('/sign-');
    
    if (!isSignedIn && !isPublicRoute) {
      navigate('/sign-in');
      return;
    }

    // If user just signed up or signed in, check if they need onboarding
    if (isSignedIn && user) {
      checkUserOnboardingStatus();
    }
  }, [isLoaded, isSignedIn, user, navigate, location.pathname]);

  const checkUserOnboardingStatus = async () => {
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress;
      if (!userEmail) return;

      // Don't redirect if user is already in the middle of a flow
      const protectedFlowRoutes = ['/onboarding', '/user', '/projects', '/portfolio-builder', '/preview', '/deployment'];
      if (protectedFlowRoutes.includes(location.pathname)) {
        return; // Let them continue their current flow
      }

      // Check if user has completed onboarding
      const response = await fetch(`${import.meta.env.VITE_API_URL || API_BASE_URL}/api/check-user-status?email=${encodeURIComponent(userEmail)}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          const { hasPersonalInfo, hasProjects, needsOnboarding } = result.data;
          
          // Determine where to redirect based on user's progress
          if (needsOnboarding || !hasPersonalInfo) {
            // New user - needs onboarding
            console.log('Redirecting to onboarding - new user');
            navigate('/onboarding');
          } else if (!hasProjects) {
            // Has personal info but no projects
            console.log('Redirecting to projects - needs first project');
            navigate('/projects');
          } else {
            // Has everything - can go to dashboard
            // Only redirect if they're on a public page or root
            const publicOrRoot = ['/', '/home', '/features', '/pricing', '/showroom'].includes(location.pathname);
            if (publicOrRoot) {
              console.log('Redirecting to dashboard - user has everything');
              navigate('/dashboard');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      // On error, let them continue with their current flow
    }
  };

  return <>{children}</>;
};