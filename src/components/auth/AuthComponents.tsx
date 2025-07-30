import React from 'react';
import { 
  SignIn, 
  SignUp, 
  UserButton, 
  useUser, 
  SignedIn, 
  SignedOut,
  RedirectToSignIn 
} from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, LogIn, UserPlus } from 'lucide-react';

// Sign In Page Component
export const SignInPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-large border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <p className="text-muted-foreground">Sign in to your portfolio builder</p>
          </CardHeader>
          <CardContent>
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                  card: 'shadow-none border-0',
                }
              }}
              redirectUrl="/dashboard"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Sign Up Page Component
export const SignUpPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-large border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Get Started</CardTitle>
            <p className="text-muted-foreground">Create your account to build amazing portfolios</p>
          </CardHeader>
          <CardContent>
            <SignUp 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                  card: 'shadow-none border-0',
                }
              }}
              redirectUrl="/dashboard"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Protected Route Wrapper
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

// Auth Status Component for Navbar
export const AuthStatus = () => {
  const { user } = useUser();

  return (
    <div className="flex items-center space-x-4">
      <SignedIn>
        <div className="hidden sm:flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">
            {user?.firstName || user?.emailAddresses[0]?.emailAddress}
          </span>
        </div>
        <UserButton 
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
            }
          }}
          showName={false}
        />
      </SignedIn>
      <SignedOut>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/sign-in">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </a>
          </Button>
          <Button variant="default" size="sm" asChild>
            <a href="/sign-up">
              <UserPlus className="h-4 w-4 mr-2" />
              Sign Up
            </a>
          </Button>
        </div>
      </SignedOut>
    </div>
  );
};

// Dashboard Welcome Component
export const DashboardWelcome = () => {
  const { user } = useUser();

  return (
    <div className="bg-gradient-primary text-primary-foreground p-6 rounded-lg mb-8">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.firstName || 'Creator'}!
          </h1>
          <p className="text-primary-foreground/80">
            Ready to build your next amazing portfolio?
          </p>
        </div>
      </div>
    </div>
  );
};