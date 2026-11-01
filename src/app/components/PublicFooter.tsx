import React from 'react';
import { Mail, Phone, MapPin, ExternalLink, ArrowUp, Globe, Clock, ChevronRight } from 'lucide-react';

interface PublicFooterProps {
  onLoginClick: () => void;
}

export function PublicFooter({ onLoginClick }: PublicFooterProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0B132B] text-white border-t border-white/5 relative">
      {/* Top gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e8c84a] to-transparent" />

      {/* Scroll to top button */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
        <button
          onClick={scrollToTop}
          className="w-10 h-10 bg-[#e8c84a] hover:bg-[#d4a830] text-[#0B132B] rounded-full flex items-center justify-center shadow-lg shadow-[#e8c84a]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* About IQAC */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#e8c84a]/10 rounded-lg flex items-center justify-center">
                <span className="text-[#e8c84a] font-black text-sm">C</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">CHRIST</h3>
                <p className="text-[9px] text-[#E8C84A] font-semibold tracking-[0.2em] uppercase">IQAC Portal</p>
              </div>
            </div>
            <p className="text-white/50 text-xs leading-relaxed mb-5">
              The Internal Quality Assurance Cell is committed to maintaining and enhancing the quality of academic programs
              and institutional governance through systematic quality auditing, benchmarking, and accreditation at
              CHRIST (Deemed to be University).
            </p>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-fit">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-300 font-medium">NAAC A++ Accredited</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-5 text-[#E8C84A] flex items-center gap-2">
              <span className="w-5 h-px bg-[#E8C84A]/30" />
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Achievements', key: 'achievements' },
                { label: 'Research & Innovation', key: 'research-innovation' },
                { label: 'Rankings', key: 'rankings' },
                { label: 'Placements', key: 'placements-internships' },
                { label: 'Infrastructure', key: 'infrastructure' },
                { label: 'International', key: 'international-interactions' },
              ].map((link) => (
                <li key={link.key}>
                  <button
                    className="text-white/50 hover:text-white text-xs transition-colors duration-200 inline-flex items-center gap-1.5 group"
                  >
                    <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-[#e8c84a] transition-colors" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Institutional Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-5 text-[#E8C84A] flex items-center gap-2">
              <span className="w-5 h-px bg-[#E8C84A]/30" />
              Institutional Links
            </h3>
            <ul className="space-y-2.5 text-xs text-white/50">
              <li>
                <a
                  href="https://christuniversity.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1.5 group"
                >
                  <Globe className="w-3 h-3 text-white/20 group-hover:text-[#e8c84a] transition-colors" />
                  Christ University Website
                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-white/30">
                  <Globe className="w-3 h-3" />
                  NAAC Portal
                </span>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-white/30">
                  <Globe className="w-3 h-3" />
                  NIRF & QS Rankings Dashboard
                </span>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-white/30">
                  <Globe className="w-3 h-3" />
                  AQAR Reports Archive
                </span>
              </li>
              <li className="pt-1">
                <button
                  onClick={onLoginClick}
                  className="text-[#E8C84A] hover:text-[#F3D768] font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  Authorized Staff Sign In →
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-5 text-[#E8C84A] flex items-center gap-2">
              <span className="w-5 h-px bg-[#E8C84A]/30" />
              Contact IQAC
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#e8c84a]/10 transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-[#E8C84A]" />
                </div>
                <div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Christ University, Hosur Road,<br />
                    Bangalore — 560029,<br />
                    Karnataka, India
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#e8c84a]/10 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-[#E8C84A]" />
                </div>
                <span className="text-xs text-white/50">+91 80 4012 9000</span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#e8c84a]/10 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-[#E8C84A]" />
                </div>
                <span className="text-xs text-white/50">iqac@christuniversity.in</span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#e8c84a]/10 transition-colors">
                  <Clock className="w-3.5 h-3.5 text-[#E8C84A]" />
                </div>
                <span className="text-xs text-white/50">Mon - Sat: 9:00 AM - 5:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[11px] text-white/30 text-center md:text-left">
              © {new Date().getFullYear()} Internal Quality Assurance Cell, CHRIST (Deemed to be University). All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={onLoginClick}
                className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
              >
                Staff Portal
              </button>
              <span className="w-px h-3 bg-white/10" />
              <span className="text-[11px] text-white/20">
                Designed with ❤ for Excellence & Service
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
