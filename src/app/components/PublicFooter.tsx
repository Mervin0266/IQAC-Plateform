import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

interface PublicFooterProps {
  onLoginClick: () => void;
}

export function PublicFooter({ onLoginClick }: PublicFooterProps) {
  return (
    <footer className="bg-[#0B132B] text-white border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About IQAC */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-[#E8C84A] uppercase tracking-wider">CHRIST (Deemed to be University)</span>
            </div>
            <h3 className="text-base font-bold mb-3 text-white">Internal Quality Assurance Cell</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Committed to maintaining and enhancing the quality of academic programs and institutional governance through systematic quality auditing, benchmarking, and accreditation.
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#E8C84A]">Contact Information</h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-[#E8C84A] flex-shrink-0" />
                <span>Christ University, Hosur Road, Bangalore - 560029, Karnataka, India</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Phone className="w-4 h-4 text-[#E8C84A] flex-shrink-0" />
                <span>+91 80 4012 9000</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-[#E8C84A] flex-shrink-0" />
                <span>iqac@christuniversity.in</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#E8C84A]">Institutional Links</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <a href="https://christuniversity.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Official Christ University Website
                </a>
              </li>
              <li>
                <span className="text-slate-400">NAAC A++ Accreditation Portal</span>
              </li>
              <li>
                <span className="text-slate-400">NIRF & QS Rankings Dashboard</span>
              </li>
              <li>
                <button 
                  onClick={onLoginClick}
                  className="text-[#E8C84A] hover:underline font-semibold text-left transition-colors"
                >
                  Authorized Staff Sign In →
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} Internal Quality Assurance Cell, CHRIST (Deemed to be University). All rights reserved.
          </p>
          <button 
            onClick={onLoginClick}
            className="text-slate-300 hover:text-white transition-colors underline"
          >
            Staff Portal Sign In
          </button>
        </div>
      </div>
    </footer>
  );
}
