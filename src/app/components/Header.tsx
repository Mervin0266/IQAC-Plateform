import React from 'react';
import { Search, Bell, Settings, User } from 'lucide-react';

interface HeaderProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export function Header({ currentPage = 'dashboard', onNavigate }: HeaderProps) {
  const navigationItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'departmental-activities', label: 'Departmental Activities' },
    { key: 'course-files', label: 'Course files/Documentation' },
    { key: 'naac-accreditation', label: 'NAAC Accreditation' },
    { key: 'nba-tracking', label: 'NBA Tracking' },
    { key: 'event-logs', label: 'Event Logs and Report' },
    { key: 'user-roles', label: 'User Roles' },
    { key: 'research-innovation', label: 'Research and Innovation' },
    { key: 'strategic-plan', label: 'Strategic Plan' }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#0B132B] border-b border-slate-800 text-white shadow-xs z-50">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center p-1 border border-slate-700">
              <span className="text-[#E8C84A] text-xs font-bold">CU</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">CHRIST</h1>
              <p className="text-slate-400 text-xs font-medium tracking-wider uppercase">DEEMED TO BE UNIVERSITY</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate?.(item.key)}
                className={`transition-colors text-xs font-medium whitespace-nowrap ${
                  currentPage === item.key
                    ? 'text-white border-b-2 border-blue-500 pb-1 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-slate-900/80 border border-slate-700 text-white placeholder-slate-400 rounded-lg pl-8 pr-3 py-1.5 w-44 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            {/* Icons */}
            <button className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors">
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
