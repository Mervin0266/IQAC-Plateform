import React, { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown, ExternalLink } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import christLogo from "../../assets/logo.png";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const mainNavLinks = [
    { key: "home", label: "Home" },
    { key: "achievements", label: "Achievements" },
    {
      key: "research-innovation",
      label: "Research",
      children: [
        { key: "research-innovation", label: "Research & Innovation" },
        { key: "incubations", label: "Incubations" },
        { key: "consultancy-projects", label: "Consultancy Projects" },
      ],
    },
    { key: "rankings", label: "Rankings" },
    { key: "placements-internships", label: "Placements" },
    { key: "infrastructure", label: "Infrastructure" },
    {
      key: "international-interactions",
      label: "International",
      children: [
        { key: "international-interactions", label: "International Interactions" },
        { key: "industry-connects", label: "Industry Connects" },
      ],
    },
    { key: "centre-excellence", label: "Centre of Excellence" },
  ];

  const handleNavClick = (key: string) => {
    onNavigate(key);
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDropdownEnter = (key: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(key);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const isActive = (key: string, children?: { key: string }[]) => {
    if (currentSection === key) return true;
    if (children) return children.some((c) => c.key === currentSection);
    return false;
  };

  return (
    <>
      {/* Top utility bar */}
      <div className={`bg-[#080e21] text-white/60 text-[11px] transition-all duration-300 overflow-hidden ${
        isScrolled ? 'h-0 opacity-0' : 'h-8 opacity-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <span>CHRIST (Deemed to be University) — Internal Quality Assurance Cell</span>
          <div className="hidden sm:flex items-center gap-4">
            <a
              href="https://christuniversity.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/90 transition-colors inline-flex items-center gap-1"
            >
              University Website <ExternalLink className="w-3 h-3" />
            </a>
            <span className="w-px h-3 bg-white/20" />
            <span>iqac@christuniversity.in</span>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#0B132B]/95 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/5"
            : "bg-[#0B132B] border-b border-white/5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and University Name */}
            <div
              className="flex items-center space-x-3 cursor-pointer group shrink-0"
              onClick={() => handleNavClick("home")}
            >
              <div className="relative">
                <ImageWithFallback
                  src={christLogo}
                  alt="CHRIST (Deemed to be University) Logo"
                  className="w-10 h-10 object-contain flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
                />
                {/* Subtle ring on hover */}
                <div className="absolute inset-0 rounded-full ring-2 ring-[#e8c84a]/0 group-hover:ring-[#e8c84a]/30 transition-all duration-300" />
              </div>
              <div>
                <h1 className="font-bold text-white text-sm sm:text-base leading-tight tracking-wide">
                  CHRIST
                </h1>
                <p className="text-[10px] text-[#E8C84A] font-semibold tracking-[0.2em] uppercase">
                  IQAC Portal
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-0.5">
              {mainNavLinks.map((link) => {
                const hasChildren = 'children' in link && link.children;
                const active = isActive(link.key, link.children as { key: string }[] | undefined);

                return (
                  <div
                    key={link.key}
                    className="relative"
                    onMouseEnter={() => hasChildren ? handleDropdownEnter(link.key) : undefined}
                    onMouseLeave={() => hasChildren ? handleDropdownLeave() : undefined}
                  >
                    <button
                      onClick={() => !hasChildren ? handleNavClick(link.key) : handleNavClick(link.key)}
                      className={`relative px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 inline-flex items-center gap-1 ${
                        active
                          ? "text-[#E8C84A]"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {link.label}
                      {hasChildren && (
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                          activeDropdown === link.key ? 'rotate-180' : ''
                        }`} />
                      )}
                      {/* Active indicator line */}
                      {active && (
                        <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#E8C84A] rounded-full" />
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    {hasChildren && activeDropdown === link.key && (
                      <div
                        className="absolute top-full left-0 mt-1 w-56 bg-[#0f1a3a] border border-white/10 rounded-xl shadow-2xl shadow-black/30 p-2 z-50"
                        style={{ animation: 'dropdownIn 0.2s ease-out both' }}
                        onMouseEnter={() => handleDropdownEnter(link.key)}
                        onMouseLeave={handleDropdownLeave}
                      >
                        {(link.children as { key: string; label: string }[]).map((child) => (
                          <button
                            key={child.key}
                            onClick={() => handleNavClick(child.key)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                              currentSection === child.key
                                ? "bg-white/10 text-[#E8C84A]"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Divider */}
              <span className="w-px h-6 bg-white/10 mx-2" />

              {/* Login Button */}
              {onLoginClick && (
                <button
                  onClick={onLoginClick}
                  className="ml-1 px-4 py-2 rounded-lg text-[13px] font-bold text-[#0B132B] bg-[#E8C84A] hover:bg-[#F3D768] transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-[#E8C84A]/10 hover:-translate-y-px flex items-center gap-1.5"
                >
                  Staff Sign In
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 rounded-xl hover:bg-white/10 text-white transition-all"
                aria-label="Toggle menu"
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
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-[#0B132B] border-t border-white/5 px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
            {mainNavLinks.map((link) => (
              <React.Fragment key={link.key}>
                <button
                  onClick={() => handleNavClick(link.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(link.key, link.children as { key: string }[] | undefined)
                      ? "bg-white/10 text-[#E8C84A] font-bold"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                </button>
                {'children' in link && link.children && (
                  <div className="ml-4 space-y-0.5 mb-1">
                    {(link.children as { key: string; label: string }[]).map((child) => (
                      <button
                        key={child.key}
                        onClick={() => handleNavClick(child.key)}
                        className={`w-full text-left px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                          currentSection === child.key
                            ? "text-[#E8C84A]"
                            : "text-white/50 hover:text-white/80"
                        }`}
                      >
                        ↳ {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
            {onLoginClick && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLoginClick();
                }}
                className="w-full mt-3 text-center py-3 px-4 rounded-xl text-sm font-bold text-[#0B132B] bg-[#E8C84A] hover:bg-[#F3D768] transition-all"
              >
                Staff Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Inline keyframes */}
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
