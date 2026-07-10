import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

interface PublicFooterProps {
  onLoginClick: () => void;
}

export function PublicFooter({ onLoginClick }: PublicFooterProps) {
  return (
    <footer className="bg-gradient-to-r from-[#2f4692] to-[#243a7a] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About IQAC */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Internal Quality Assurance Cell</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Committed to maintaining and enhancing the quality of education at Christ University through systematic planning, implementation, and monitoring.
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3 text-sm text-blue-100">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Christ University, Hosur Road, Bangalore - 560029, Karnataka, India</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>+91 80 4012 9000</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>iqac@christuniversity.in</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li>
                <a href="https://christuniversity.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Christ University Website
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  NAAC Accreditation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  NBA Tracking
                </a>
              </li>
              <li>
                <button 
                  onClick={onLoginClick}
                  className="hover:text-white transition-colors text-left"
                >
                  Staff Login
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-blue-700/30 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <p className="text-sm text-blue-100">
            © {new Date().getFullYear()} Christ University IQAC. All rights reserved.
          </p>
          <button 
            onClick={onLoginClick}
            className="text-sm text-blue-200 hover:text-white transition-colors underline"
          >
            Staff Login
          </button>
        </div>
      </div>
    </footer>
  );
}
