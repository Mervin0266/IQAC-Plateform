import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import christLogo from "figma:asset/e4f652b12ffea64be11193ae1ce02c65502fc8ea.png";

interface PublicNavBarProps {
  currentSection: string;
  onNavigate: (section: string) => void;
}

export function PublicNavBar({
  currentSection,
  onNavigate,
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
    <nav
      className={`sticky top-0 z-50 transition-all duration-[350ms] ease-in-out ${
        isScrolled
          ? "bg-[rgba(15,23,70,0.97)] backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and University Name */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleNavClick("home")}
          >
            <ImageWithFallback
              src={christLogo}
              alt="Christ University Logo"
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            <div>
              <h1 className="font-bold text-white leading-tight">
                Christ University
              </h1>
              <p className="text-xs text-[#e8c84a] uppercase tracking-wide">
                IQAC Portal
              </p>
            </div>
          </div>

          {/* Desktop Navigation - hidden on screens under 900px */}
          <div className="hidden min-[900px]:flex items-center space-x-1">
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => handleNavClick(link.key)}
                className={`px-3 py-2 rounded-md text-sm transition-all ${
                  currentSection === link.key
                    ? "text-[#e8c84a] bg-white/10 font-semibold"
                    : isScrolled
                      ? "text-white/85 hover:bg-white/10 hover:text-white font-medium"
                      : "text-[#0f1746] hover:bg-white/10 hover:text-[#0f1746] font-semibold"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Mobile menu button - shown on screens under 900px */}
          <div className="min-[900px]:hidden">
            <button
              onClick={() =>
                setIsMobileMenuOpen(!isMobileMenuOpen)
              }
              className={`p-2 rounded-md hover:bg-white/10 transition-all ${
                isScrolled ? "text-white" : "text-[#0f1746]"
              }`}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="min-[900px]:hidden bg-[#0f1746]/95 backdrop-blur-md border-t border-blue-700/30">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => handleNavClick(link.key)}
                className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  currentSection === link.key
                    ? "bg-white/20 text-[#e8c84a]"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}