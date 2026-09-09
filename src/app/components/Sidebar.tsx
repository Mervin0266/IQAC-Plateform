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
  ChevronDown,
  Sparkles,
  Layers,
  FlaskConical,
  Building2,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  hasPageAccess,
  getRoleDisplayName,
} from "../config/permissions";
import { SearchBar } from "./SearchBar";
import { NotificationDropdown } from "./NotificationDropdown";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export function Sidebar({
  currentPage = "dashboard",
  onNavigate,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const coreNavSections = useMemo(() => [
    {
      groupTitle: "OVERVIEW",
      items: [
        { icon: Home, label: "Dashboard", key: "dashboard" },
      ],
    },
    {
      groupTitle: "ACADEMICS & RESEARCH",
      items: [
        {
          icon: GraduationCap,
          label: "Academics",
          key: "academics",
          children: [
            { label: "Faculty Details", key: "faculty-details", icon: Users },
            { label: "Student Details", key: "student-details", icon: BookOpen },
            { label: "Department Details", key: "department-details", icon: Building2 },
            { label: "Departmental Activities", key: "departmental-activities", icon: Calendar },
            {
              label: "Research & Innovation",
              key: "research",
              icon: FlaskConical,
              children: [
                { label: "Research Metrics Grid", key: "research-metrics" },
                { label: "Publications", key: "publications" },
                { label: "Patents & IP", key: "research-innovation" },
                { label: "Sponsored Research", key: "sponsored-research" },
                { label: "Consultancy Projects", key: "consultancy-projects" },
              ],
            },
            { label: "Placement & Internships", key: "placements-internships", icon: Briefcase },
          ],
        },
      ],
    },
    {
      groupTitle: "QUALITY & RECOGNITION",
      items: [
        {
          icon: ClipboardCheck,
          label: "Accreditation",
          key: "accreditation",
          children: [
            { label: "NAAC Accreditation", key: "naac-accreditation" },
            { label: "NBA Tracking", key: "nba-tracking" },
          ],
        },
        {
          icon: TrendingUp,
          label: "Rankings",
          key: "ranking",
          children: [
            { label: "NIRF Ranking", key: "nirf-ranking" },
            { label: "India Today MDRA", key: "india-today-ranking" },
            { label: "THE World Ranking", key: "the-world-ranking" },
            { label: "QS India Rank", key: "qs-india-ranking" },
          ],
        },
        {
          icon: Star,
          label: "Centre of Excellence",
          key: "centre-excellence",
        },
        {
          icon: Target,
          label: "Strategic Plan",
          key: "strategic-plan",
        },
      ],
    },
  ], []);

  const adminSystemItems = useMemo(() => [
    { icon: Users, label: "User Roles & Permissions", key: "user-roles" },
    { icon: Shield, label: "User Management", key: "user-management" },
  ], []);

  const [openSubmenus, setOpenSubmenus] = React.useState<Record<string, boolean>>({});

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isKeyActive = (item: any): boolean => {
    if (currentPage === item.key) return true;
    if (item.children) {
      return item.children.some((c: any) => isKeyActive(c));
    }
    return false;
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "admin":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "hod":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "coordinator":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }
  };

  const renderSubItems = (items: any[], depth = 1) => {
    return items.map((sub) => {
      if (sub.children && sub.children.length > 0) {
        const isSubChildActive = isKeyActive(sub);
        const isSubOpen = openSubmenus[sub.key] ?? isSubChildActive;
        const SubIcon = sub.icon;

        return (
          <div key={sub.key} className="relative w-full my-1">
            <button
              type="button"
              onClick={() => toggleSubmenu(sub.key)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 text-left ${
                isSubChildActive || isSubOpen
                  ? "bg-white/10 text-white font-semibold shadow-sm backdrop-blur-sm border border-white/10"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                {SubIcon && <SubIcon className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />}
                <span className="truncate">{sub.label}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ease-in-out flex-shrink-0 ${
                  isSubOpen ? "rotate-180 text-blue-300" : ""
                }`}
              />
            </button>

            {/* Nested Submenu Dropdown */}
            <div
              className={`w-full overflow-hidden transition-all duration-200 ease-in-out ${
                isSubOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
              }`}
            >
              <div className="pl-2.5 pr-1 py-1 space-y-0.5 border-l-2 border-indigo-400/30 ml-2.5 bg-black/15 rounded-r-lg">
                {renderSubItems(sub.children, depth + 1)}
              </div>
            </div>
          </div>
        );
      }

      const isSubActive = currentPage === sub.key;
      const SubIcon = sub.icon;

      return (
        <button
          key={sub.key}
          type="button"
          onClick={() => onNavigate?.(sub.key)}
          className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all duration-150 ${
            isSubActive
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-900/40 border border-blue-400/30"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          {SubIcon ? (
            <SubIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? "text-white" : "text-blue-300/80"}`} />
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                isSubActive ? "bg-blue-300" : "bg-slate-500"
              }`}
            />
          )}
          <span className="truncate">{sub.label}</span>
        </button>
      );
    });
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-[#0b132b] via-[#12204d] to-[#0c1638] text-slate-100 shadow-2xl z-40 flex flex-col border-r border-white/10 select-none">
      {/* 1. University Branding Header */}
      <div className="p-3 bg-white border-b border-blue-950/20 shadow-md">
        <div className="w-full flex items-center justify-center">
          <ImageWithFallback
            src="https://christuniversity.in/images/logo.png"
            alt="Christ University Logo"
            className="w-full h-12 object-contain"
          />
        </div>
      </div>

      {/* 2. User Profile Card */}
      {user && (
        <div className="px-3.5 pt-3 pb-1">
          <div className="bg-white/[0.05] hover:bg-white/[0.08] transition-colors duration-150 rounded-xl p-2.5 border border-white/10 shadow-inner">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-md border border-white/20 flex-shrink-0">
                {(user.name || user.username || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {user.name || user.username || "Authenticated User"}
                  </p>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="Active" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${getRoleBadgeStyle(
                      user.role
                    )}`}
                  >
                    {getRoleDisplayName(user.role)}
                  </span>
                  {user.department && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[90px]" title={user.department}>
                      • {user.department}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Search Bar */}
      <div className="px-3.5 py-2">
        <SearchBar onNavigate={onNavigate} />
      </div>

      {/* 4. Scrollable Navigation Menu */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 py-1">
        {coreNavSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-2.5 text-[9px] font-bold text-blue-300/70 uppercase tracking-widest">
              {section.groupTitle}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;

                // Expandable items with children
                if ("children" in item && item.children) {
                  const isChildActive = isKeyActive(item);
                  const isOpen = openSubmenus[item.key] ?? isChildActive;

                  return (
                    <div key={item.key} className="relative w-full">
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.key)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 text-left ${
                          isChildActive || isOpen
                            ? "bg-white/[0.08] text-white font-medium shadow-sm border border-white/10"
                            : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <div
                            className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                              isChildActive || isOpen
                                ? "bg-blue-600/40 text-blue-200"
                                : "bg-white/5 text-slate-400"
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                          </div>
                          <span className="text-xs font-medium truncate">
                            {item.label}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ease-in-out flex-shrink-0 ${
                            isOpen ? "rotate-180 text-blue-300" : ""
                          }`}
                        />
                      </button>

                      {/* Submenu container */}
                      <div
                        className={`w-full overflow-hidden transition-all duration-200 ease-in-out ${
                          isOpen ? "max-h-[600px] opacity-100 mt-1" : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-blue-400/30 ml-3.5 my-0.5 bg-black/10 rounded-r-xl">
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
                    type="button"
                    onClick={() => onNavigate?.(item.key)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all duration-150 text-left group ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-900/40 border border-blue-400/30"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-slate-400 group-hover:text-blue-300 group-hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                    </div>
                    <span className="text-xs font-medium truncate">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* 5. System Controls (Admins only) */}
        {user?.role === "admin" && (
          <div className="space-y-1 pt-1 border-t border-white/10">
            <p className="px-2.5 text-[9px] font-bold text-amber-300/80 uppercase tracking-widest">
              SYSTEM CONTROLS
            </p>
            <div className="space-y-0.5">
              {adminSystemItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate?.(item.key)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all duration-150 text-left group ${
                      isActive
                        ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold shadow-md border border-amber-400/30"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-slate-400 group-hover:text-amber-300 group-hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                    </div>
                    <span className="text-xs font-medium truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 6. Refined Bottom Controls */}
      <div className="p-3 bg-white/[0.03] border-t border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between bg-black/20 rounded-xl p-1.5 border border-white/5">
          <NotificationDropdown />

          <button
            type="button"
            onClick={() => onNavigate?.("dashboard")}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
            title="Dashboard Overview"
          >
            <Home className="w-4 h-4" />
          </button>

          {user?.role === "admin" && (
            <button
              type="button"
              onClick={() => onNavigate?.("user-management")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
              title="System Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-slate-300 hover:text-red-300"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-center">
          <p className="text-[9px] text-slate-400/70 font-medium">
            IQAC Quality Platform • Christ University
          </p>
        </div>
      </div>
    </aside>
  );
}