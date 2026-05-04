import { useState } from "react";
import { Brain, Search, User, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import SearchModal from "@/components/SearchModal";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogin = () => {
    setAuthModalTab("login");
    setIsAuthModalOpen(true);
  };

  const handleSignUp = () => {
    setAuthModalTab("signup");
    setIsAuthModalOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchModalOpen(true);
  };

  const handleSearchIconClick = () => {
    setIsSearchModalOpen(true);
  };

  const getInitials = (username: string): string => {
    return username.charAt(0).toUpperCase();
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate("/");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-gradient-to-r from-[#1B1F3B]/95 to-[#2C2F4A]/95 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-accent" />
            <span className="text-xl font-bold text-white">AI Personality</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`hover:text-accent transition-colors ${
                isActive("/") ? "text-accent" : "text-white"
              }`}
            >
              Home
            </Link>
            <Link
              to="/test"
              className={`hover:text-accent transition-colors ${
                isActive("/test") ? "text-accent" : "text-white"
              }`}
            >
              Take Test
            </Link>
            <Link
              to="/results"
              className={`hover:text-accent transition-colors ${
                isActive("/results") ? "text-accent" : "text-white"
              }`}
            >
              Results
            </Link>
            <Link
              to="/about"
              className={`hover:text-accent transition-colors ${
                isActive("/about") ? "text-accent" : "text-white"
              }`}
            >
              About
            </Link>
            <Link
              to="/contact"
              className={`hover:text-accent transition-colors ${
                isActive("/contact") ? "text-accent" : "text-white"
              }`}
            >
              Contact
            </Link>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              onClick={handleSearchIconClick}
              variant="ghost"
              size="icon"
              className="text-white hover:text-accent"
            >
              <Search className="h-5 w-5" />
            </Button>

            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-[#1B1F3B] font-bold text-lg hover:bg-accent/90 transition-colors"
                  title={user.username}
                >
                  {getInitials(user.username)}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#2C2F4A] border border-accent/30 rounded-lg shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-accent/20">
                      <p className="text-white font-semibold">{user.username}</p>
                      <p className="text-white/70 text-sm">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-white hover:bg-accent/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button
                  onClick={handleLogin}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-[#1B1F3B]"
                >
                  Login
                </Button>
                <Button
                  onClick={handleSignUp}
                  className="bg-accent text-[#1B1F3B] hover:bg-accent/90"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col space-y-4">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className={`hover:text-accent transition-colors text-left ${
                  isActive("/") ? "text-accent" : "text-white"
                }`}
              >
                Home
              </Link>
              <Link
                to="/test"
                onClick={() => setIsMenuOpen(false)}
                className={`hover:text-accent transition-colors text-left ${
                  isActive("/test") ? "text-accent" : "text-white"
                }`}
              >
                Take Test
              </Link>
              <Link
                to="/results"
                onClick={() => setIsMenuOpen(false)}
                className={`hover:text-accent transition-colors text-left ${
                  isActive("/results") ? "text-accent" : "text-white"
                }`}
              >
                Results
              </Link>
              <Link
                to="/about"
                onClick={() => setIsMenuOpen(false)}
                className={`hover:text-accent transition-colors text-left ${
                  isActive("/about") ? "text-accent" : "text-white"
                }`}
              >
                About
              </Link>
              <Link
                to="/contact"
                onClick={() => setIsMenuOpen(false)}
                className={`hover:text-accent transition-colors text-left ${
                  isActive("/contact") ? "text-accent" : "text-white"
                }`}
              >
                Contact
              </Link>
              <div className="pt-4 border-t border-white/10">
                {isAuthenticated && user ? (
                  <div>
                    <div className="px-2 py-3 mb-3">
                      <p className="text-white font-semibold">{user.username}</p>
                      <p className="text-white/70 text-sm">{user.email}</p>
                    </div>
                    <Button
                      onClick={handleLogout}
                      className="w-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleLogin}
                      variant="outline"
                      className="border-accent text-accent hover:bg-accent hover:text-[#1B1F3B]"
                    >
                      Login
                    </Button>
                    <Button
                      onClick={handleSignUp}
                      className="bg-accent text-[#1B1F3B] hover:bg-accent/90"
                    >
                      Sign Up
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        initialSearch={searchTerm}
      />
    </nav>
  );
};

export default Navigation;
