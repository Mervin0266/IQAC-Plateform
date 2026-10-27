import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import christLogo from "figma:asset/e4f652b12ffea64be11193ae1ce02c65502fc8ea.png";

interface PublicNavBarProps {
  currentSection: string;
  onNavigate: (section: string) => void;
  onLoginClick?: () => void;
}

export function PublicNavBar({
  currentSection,
  onNavigate,
  onLoginClick,
}: PublicNavBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll);
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { key: "home", label: "Home" },
    { key: "achievements", label: "Achievements" },
    {
      key: "research-innovation",
      label: "Research & Innovation",
    },
    { key: "rankings", label: "Rankings" },
    { key: "placements-internships", label: "Placements" },
    { key: "infrastructure", label: "Infrastructure" },
    {
      key: "international-interactions",
      label: "International",
    },
    { key: "centre-excellence", label: "CoE" },
    { key: "incubations", label: "Incubations" },
    { key: "industry-connects", label: "Industry" },
    { key: "consultancy-projects", label: "Consultancy" },
  ];

  const handleNavClick = (key: string) => {
    onNavigate(key);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0B132B] border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and University Name */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleNavClick("home")}
          >
            <ImageWithFallback
              src={christLogo}
              alt="CHRIST (Deemed to be University) Logo"
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            <div>
              <h1 className="font-bold text-white text-sm sm:text-base leading-tight">
                CHRIST
              </h1>
              <p className="text-[10px] text-[#E8C84A] font-semibold tracking-wider uppercase">
                IQAC Platform
              </p>
            </div>
          </div>

          {/* Desktop Navigation - hidden on screens under 960px */}
          <div className="hidden min-[960px]:flex items-center space-x-1">
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => handleNavClick(link.key)}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                  currentSection === link.key
                    ? "text-[#E8C84A] bg-white/10 font-bold shadow-2xs"
                    : "text-slate-300 hover:bg-white/10 hover:text-white font-medium"
                }`}
              >
                {link.label}
              </button>
            ))}

            {onLoginClick && (
              <button
                onClick={onLoginClick}
                className="ml-3 px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#0B132B] bg-[#E8C84A] hover:bg-[#F3D768] transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>Staff Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="min-[960px]:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md hover:bg-white/10 text-white transition-all"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="min-[960px]:hidden bg-[#0B132B] border-t border-slate-800 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.key}
              onClick={() => handleNavClick(link.key)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                currentSection === link.key
                  ? "bg-white/10 text-[#E8C84A] font-bold"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </button>
          ))}
          {onLoginClick && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLoginClick();
              }}
              className="w-full mt-2 text-center py-2 px-3 rounded-lg text-xs font-bold text-[#0B132B] bg-[#E8C84A] hover:bg-[#F3D768] transition-all"
            >
              Staff Sign In
            </button>
          )}
        </div>
      )}
    </nav>
  );
}