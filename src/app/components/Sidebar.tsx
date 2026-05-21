import React from "react";
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
  Bell,
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

  const menuItems = [
    { icon: Home, label: "Dashboard", key: "dashboard" },
    { icon: Award, label: "Achievements", key: "achievements" },
    {
      icon: FileText,
      label: "Course files/Documentation",
      key: "course-files",
    },
    {
      icon: ClipboardCheck,
      label: "NAAC Accreditation",
      key: "naac-accreditation",
    },
    { icon: TrendingUp, label: "Ranking", key: "ranking" },
    {
      icon: BarChart3,
      label: "NBA Tracking",
      key: "nba-tracking",
    },
    {
      icon: Calendar,
      label: "Event Logs and Report",
      key: "event-logs",
    },
    { icon: Users, label: "User Roles", key: "user-roles" },
    {
      icon: BookOpen,
      label: "Research and Innovation",
      key: "research-innovation",
    },
    {
      icon: Lightbulb,
      label: "Incubations",
      key: "incubations",
    },
    {
      icon: Network,
      label: "Industry Connects",
      key: "industry-connects",
    },
    {
      icon: Briefcase,
      label: "Consultancy Projects",
      key: "consultancy-projects",
    },
    {
      icon: Globe,
      label: "International Interactions",
      key: "international-interactions",
    },
    {
      icon: Star,
      label: "Centre for Excellence",
      key: "centre-excellence",
    },
    {
      icon: Wrench,
      label: "Infrastructure & Facilities",
      key: "infrastructure-facilities",
    },
    {
      icon: GraduationCap,
      label: "Placements & Internships",
      key: "placements-internships",
    },
    {
      icon: Target,
      label: "Strategic Plan",
      key: "strategic-plan",
    },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) =>
    user ? hasPageAccess(user.role, item.key) : true,
  );

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
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
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
        </nav>

        {/* Bottom User Actions */}
        <div className="px-4 pt-4 border-t border-blue-700/30 mt-4">
          <div className="flex items-center justify-between">
            <button
              className="p-2 hover:bg-[#3d5bb0] rounded-md transition-colors text-blue-100"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
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