import React, { useMemo } from "react";
import {
  Home,
  Award,
  FileText,
  Users,
  BarChart3,
  Settings,
  BookOpen,
  GraduationCap,
  Building,
  Search,
  ClipboardCheck,
  Calendar,
  Shield,
  Target,
  User,
  LogOut,
  TrendingUp,
  Lightbulb,
  Globe,
  Briefcase,
  Network,
  Star,
  Wrench,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  hasPageAccess,
  getRoleDisplayName,
} from "../config/permissions";
import { SearchBar } from "./SearchBar";
import { NotificationDropdown } from "./NotificationDropdown";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import christLogo from "figma:asset/e4f652b12ffea64be11193ae1ce02c65502fc8ea.png";

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export function Sidebar({
  currentPage = "dashboard",
  onNavigate,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const menuItems = useMemo(() => [
    { icon: Home, label: "Dashboard", key: "dashboard" },
    {
      icon: GraduationCap,
      label: "Academics",
      key: "academics",
      children: [
        { label: "Faculty Details", key: "faculty-details" },
        { label: "Student Details", key: "student-details" },
        { label: "Department Details", key: "department-details" },
        {
          label: "Research",
          key: "research",
          children: [
            { label: "Research Metrics Grid", key: "research-metrics" },
            { label: "Publications", key: "publications" },
            { label: "Patents", key: "research-innovation" },
            { label: "Sponsored Research", key: "sponsored-research" },
            { label: "Consultancy", key: "consultancy-projects" },
          ],
        },
        { label: "Placement", key: "placements-internships" },
      ],
    },
    {
      icon: ClipboardCheck,
      label: "Accreditation",
      key: "accreditation",
      children: [
        { label: "NAAC", key: "naac-accreditation" },
        { label: "NBA", key: "nba-tracking" },
      ],
    },
    {
      icon: TrendingUp,
      label: "Ranking",
      key: "ranking",
      children: [
        { label: "NIRF", key: "nirf-ranking" },
        { label: "India Today MDRA", key: "india-today-ranking" },
        { label: "THE World Ranking", key: "the-world-ranking" },
        { label: "QS India Rank", key: "qs-india-ranking" },
      ],
    },
    {
      icon: Globe,
      label: "International Interactions",
      key: "international-interactions",
    },
    {
      icon: Star,
      label: "Centre of Excellence",
      key: "centre-excellence",
    },
    {
      icon: Wrench,
      label: "Infrastructure",
      key: "infrastructure-facilities",
    },
    {
      icon: Target,
      label: "Strategic Plan",
      key: "strategic-plan",
    },
  ], []);

  const adminSystemItems = useMemo(() => [
    { icon: Users, label: "User Roles", key: "user-roles" },
    { icon: Shield, label: "User Management", key: "user-management" },
  ], []);

  const [openSubmenus, setOpenSubmenus] = React.useState<Record<string, boolean>>({});

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isKeyActive = (item: any): boolean => {
    if (currentPage === item.key) return true;
    if (item.children) {
      return item.children.some((c: any) => isKeyActive(c));
    }
    return false;
  };

  const renderSubItems = (items: any[], depth = 1) => {
    return items.map((sub) => {
      if (sub.children && sub.children.length > 0) {
        const isSubChildActive = isKeyActive(sub);
        const isSubOpen = openSubmenus[sub.key] || isSubChildActive;

        return (
          <div key={sub.key} className="relative group/sub w-full my-0.5">
            <button
              type="button"
              onClick={() => toggleSubmenu(sub.key)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-all duration-200 text-left ${
                isSubChildActive || isSubOpen
                  ? "bg-[#3d5bb0]/50 text-white font-semibold shadow-sm"
                  : "text-blue-100 hover:bg-[#3d5bb0]/60 hover:text-white"
              }`}
            >
              <span className="truncate">{sub.label}</span>
              <svg 
                className={`w-3.5 h-3.5 text-blue-200 transition-transform duration-300 ease-in-out ${
                  isSubOpen ? 'rotate-180' : 'group-hover/sub:rotate-180'
                }`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Nested Submenu Dropdown */}
            <div 
              className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${
                isSubOpen
                  ? 'max-h-96 opacity-100' 
                  : 'max-h-0 opacity-0 group-hover/sub:max-h-96 group-hover/sub:opacity-100'
              }`}
            >
              <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-blue-400/40 ml-3 my-0.5 bg-[#1e3066]/30 rounded-r-md">
                {renderSubItems(sub.children, depth + 1)}
              </div>
            </div>
          </div>
        );
      }

      const isSubActive = currentPage === sub.key;
      return (
        <button
          key={sub.key}
          type="button"
          onClick={() => onNavigate?.(sub.key)}
          className={`w-full block px-3 py-1.5 rounded-md text-xs text-left transition-colors duration-150 ${
            isSubActive
              ? "bg-[#3d5bb0] text-white font-semibold shadow-sm"
              : "text-blue-200 hover:bg-[#3d5bb0]/60 hover:text-white"
          }`}
        >
          {sub.label}
        </button>
      );
    });
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-[#2f4692] to-[#243a7a] shadow-lg z-40 overflow-y-auto">
      <div className="h-full pb-6 flex flex-col">
        {/* University Branding Header */}
        <div className="bg-white px-4 py-4 border-b border-[#2f4692]/30">
          <div className="flex items-center space-x-3 mb-3">
            <ImageWithFallback
              src={
                "https://christuniversity.in/images/logo.png"
              }
              alt="Christ University Logo"
              className="w-12 h-12 object-contain flex-shrink-0"
            />
            <div>
              <h1 className="font-bold text-[#2f4692]">
                CHRIST
              </h1>
              <p className="text-xs text-[#2f4692]/70">
                DEEMED TO BE UNIVERSITY
              </p>
            </div>
          </div>
        </div>

        {/* IQAC Section */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-[#2f4692] font-semibold text-sm">
                IQ
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white">IQAC</h3>
              <p className="text-xs text-blue-200">
                Quality Assurance
              </p>
            </div>
          </div>

          {/* User Role Badge */}
          {user && (
            <div className="mt-3 px-3 py-2 bg-[#243a7a] rounded-md border border-blue-700/30">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-300 truncate">
                    Logged in as
                  </p>
                  <p className="text-sm font-semibold text-white truncate">
                    {getRoleDisplayName(user.role)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-4 mb-6">
          <SearchBar onNavigate={onNavigate} />
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1 px-4 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            // Handle items with nested children
            if ('children' in item && item.children) {
              const isChildActive = isKeyActive(item);
              const isOpen = openSubmenus[item.key] || isChildActive;

              return (
                <div key={item.key} className="relative group/main w-full">
                  <button
                    type="button"
                    onClick={() => toggleSubmenu(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 text-left ${
                      isChildActive || isOpen
                        ? "bg-[#3d5bb0]/40 text-white font-medium shadow-sm"
                        : "text-blue-100 hover:bg-[#3d5bb0]/70 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm truncate">
                        {item.label}
                      </span>
                    </div>
                    {/* Minimal indicator chevron */}
                    <svg 
                      className={`w-4 h-4 text-blue-200 transition-transform duration-300 ease-in-out ${
                        isOpen ? 'rotate-180' : 'group-hover/main:rotate-180'
                      }`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Submenu items list */}
                  <div 
                    className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen
                        ? 'max-h-[600px] opacity-100' 
                        : 'max-h-0 opacity-0 group-hover/main:max-h-[600px] group-hover/main:opacity-100'
                    }`}
                  >
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-blue-400/40 ml-4 my-1">
                      {renderSubItems(item.children)}
                    </div>
                  </div>
                </div>
              );
            }

            const isActive = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate?.(item.key)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-left ${
                  isActive
                    ? "bg-[#3d5bb0] text-white"
                    : "text-blue-100 hover:bg-[#3d5bb0]/70 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm truncate">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* System & Admin Controls (for Admin/Authority) */}
          {user?.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-blue-700/30">
              <p className="px-3 text-[10px] font-semibold text-blue-300 uppercase tracking-wider mb-2">
                System Controls
              </p>
              {adminSystemItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onNavigate?.(item.key)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-left ${
                      isActive
                        ? "bg-[#3d5bb0] text-white font-medium"
                        : "text-blue-200 hover:bg-[#3d5bb0]/70 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Bottom User Actions */}
        <div className="px-4 pt-4 border-t border-blue-700/30 mt-4">
          <div className="flex items-center justify-between">
            <NotificationDropdown />
            <button
              className="p-2 hover:bg-[#3d5bb0] rounded-md transition-colors text-blue-100"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              className="p-2 hover:bg-[#3d5bb0] rounded-md transition-colors text-blue-100"
              title="Profile"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-red-600 rounded-md transition-colors text-blue-100 hover:text-white"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}