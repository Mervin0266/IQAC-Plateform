import React from 'react';
import { Search, Bell, Settings, User } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HeaderProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export function Header({ currentPage = 'dashboard', onNavigate }: HeaderProps) {
  const navigationItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'achievements', label: 'Achievements' },
    { key: 'course-files', label: 'Course files/Documentation' },
    { key: 'naac-accreditation', label: 'NAAC Accreditation' },
    { key: 'nba-tracking', label: 'NBA Tracking' },
    { key: 'event-logs', label: 'Event Logs and Report' },
    { key: 'user-roles', label: 'User Roles' },
    { key: 'research-innovation', label: 'Research and Innovation' },
    { key: 'strategic-plan', label: 'Strategic Plan' }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg z-50">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            {/* Replace the placeholder logo below with your college logo */}
            {/* To add your logo: import christLogo from 'figma:asset/YOUR_LOGO_HASH.png'; */}
            {/* Then replace the div below with: <ImageWithFallback src={christLogo} alt="Christ University Logo" className="w-12 h-12 rounded-full object-cover" /> */}
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1">
              <div className="w-full h-full bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">CU</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold">CHRIST</h1>
              <p className="text-blue-200 text-sm">DEEMED TO BE UNIVERSITY</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate?.(item.key)}
                className={`transition-colors text-sm whitespace-nowrap ${
                  currentPage === item.key
                    ? 'text-blue-200 border-b-2 border-blue-200 pb-1'
                    : 'hover:text-blue-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300" />
              <input
                type="text"
                placeholder="Search"
                className="bg-blue-800 text-white placeholder-blue-300 rounded-md pl-9 pr-4 py-2 w-48 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            
            {/* Icons */}
            <button className="p-2 hover:bg-blue-700 rounded-md transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-blue-700 rounded-md transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-blue-700 rounded-md transition-colors">
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}