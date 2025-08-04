import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Toaster } from "@/components/ui/toaster";
// Auth Components
import { 
  SignInPage, 
  SignUpPage, 
  ProtectedRoute,
  AuthStatus 
} from '@/components/auth/AuthComponents';

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-[#FAFAFA]/80 backdrop-blur-[10px] shadow-md rounded-lg sticky top-[20px] z-50 w-auto m-[20px] py-5 px-10 border border-gray-200">
      <div className=" flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold bg-primary bg-clip-text text-transparent">
          Prism
        </Link>
        
        <div className="hidden md:flex items-center space-x-20">
          <Link 
            to="/"
            className={`text-md font-light transition-colors hover:text-primary ${
              isActive('/') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            About
          </Link>
          <Link 
            to="/features" 
            className={`text-md font-light transition-colors hover:text-primary ${
              isActive('/features') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Features
          </Link>
          <Link 
            to="/pricing" 
            className={`text-md font-light transition-colors hover:text-primary ${
              isActive('/pricing') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Pricing
          </Link>
        </div>
        
        <div className="hidden md:block">
          <AuthStatus />
        </div>
        
        <button
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col space-y-4">
            <Link 
              to="/"
              className={`text-md font-light transition-colors hover:text-primary ${
                isActive('/') ? 'text-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/features" 
              className={`text-md font-light transition-colors hover:text-primary ${
                isActive('/features') ? 'text-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              to="/pricing" 
              className={`text-md font-light transition-colors hover:text-primary ${
                isActive('/pricing') ? 'text-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <AuthStatus />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;