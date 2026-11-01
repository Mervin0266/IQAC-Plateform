import React, { useMemo } from 'react';
import {
  Home,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  Calendar,
  Shield,
  Target,
  LogOut,
  TrendingUp,
  Briefcase,
  Star,
  ChevronDown,
  FlaskConical,
  Building2,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleDisplayName } from '../config/permissions';
import { SearchBar } from './SearchBar';
import { NotificationDropdown } from './NotificationDropdown';
import christLogo from '../../assets/logo.png';
import { useSidebarWidth, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH } from '../hooks/useSidebarWidth';

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

/**
 * Sidebar — Minimal Enterprise SaaS Navigation
 * - Dark-navy canvas (#0B132B / #0F172A)
 * - Refined 1px border dividers
 * - Inter typography
 * - Clean active states without garish gradients or decorative bars
 */
export function Sidebar({
  currentPage = 'dashboard',
  onNavigate,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const {
    sidebarWidth,
    isResizing,
    startResizing,
    handleKeyDown,
    resetSidebarWidth,
  } = useSidebarWidth();

  const coreNavSections = useMemo(
    () => [
      {
        groupTitle: 'OVERVIEW',
        items: [{ icon: Home, label: 'Dashboard', key: 'dashboard' }],
      },
      {
        groupTitle: 'ACADEMICS & RESEARCH',
        items: [
          {
            icon: GraduationCap,
            label: 'Academics',
            key: 'academics',
            children: [
              { label: 'Faculty Management', key: 'faculty-details', icon: Users },
              { label: 'Student Details', key: 'student-details', icon: BookOpen },
              { label: 'Department Details', key: 'department-details', icon: Building2 },
              { label: 'Departmental Activities', key: 'departmental-activities', icon: Calendar },
              {
                label: 'Research & Innovation',
                key: 'research',
                icon: FlaskConical,
                children: [
                  { label: 'Research Metrics Grid', key: 'research-metrics' },
                  { label: 'Publications', key: 'publications' },
                  { label: 'Patents & IP', key: 'research-innovation' },
                  { label: 'Sponsored Research', key: 'sponsored-research' },
                  { label: 'Consultancy Projects', key: 'consultancy-projects' },
                ],
              },
              { label: 'Placements & Internships', key: 'placements-internships', icon: Briefcase },
            ],
          },
        ],
      },
      {
        groupTitle: 'QUALITY & ACCREDITATION',
        items: [
          {
            icon: ClipboardCheck,
            label: 'Accreditation',
            key: 'accreditation',
            children: [
              { label: 'NAAC Accreditation', key: 'naac-accreditation' },
              { label: 'NBA Tracking', key: 'nba-tracking' },
            ],
          },
          {
            icon: TrendingUp,
            label: 'Rankings',
            key: 'ranking',
            children: [
              { label: 'NIRF Ranking', key: 'nirf-ranking' },
              { label: 'India Today MDRA', key: 'india-today-ranking' },
              { label: 'THE World Ranking', key: 'the-world-ranking' },
              { label: 'QS India Rank', key: 'qs-india-ranking' },
            ],
          },
          {
            icon: Star,
            label: 'Centre of Excellence',
            key: 'centre-excellence',
          },
          {
            icon: Target,
            label: 'Strategic Plan',
            key: 'strategic-plan',
          },
        ],
      },
    ],
    []
  );

  const adminSystemItems = useMemo(
    () => [
      { icon: Users, label: 'User Roles & Permissions', key: 'user-roles' },
      { icon: Shield, label: 'User Management', key: 'user-management' },
    ],
    []
  );

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

  const renderSubItems = (items: any[], depth = 1) => {
    return items.map((sub) => {
      if (sub.children && sub.children.length > 0) {
        const isSubChildActive = isKeyActive(sub);
        const isSubOpen = openSubmenus[sub.key] ?? isSubChildActive;
        const SubIcon = sub.icon;

        return (
          <div key={sub.key} className="relative w-full my-0.5">
            <button
              type="button"
              onClick={() => toggleSubmenu(sub.key)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                isSubChildActive || isSubOpen
                  ? 'bg-[#294768] text-white font-medium'
                  : 'text-slate-200 hover:bg-[#294768] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {SubIcon && <SubIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                <span className="truncate">{sub.label}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 shrink-0 ${
                  isSubOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* Nested Submenu Dropdown */}
            <div
              className={`w-full overflow-hidden transition-all duration-200 ease-in-out ${
                isSubOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pl-2 pr-1 py-0.5 space-y-0.5 border-l border-white/15 ml-2">
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
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors relative ${
            isSubActive
              ? 'bg-[#2855B9] text-white font-medium shadow-xs'
              : 'text-slate-200 hover:bg-[#294768] hover:text-white'
          }`}
        >
          {SubIcon ? (
            <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-white' : 'text-slate-300'}`} />
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                isSubActive ? 'bg-white' : 'bg-slate-400'
              }`}
            />
          )}
          <span className="truncate">{sub.label}</span>
        </button>
      );
    });
  };

  return (
    <aside
      style={{
        width: `${sidebarWidth}px`,
        transition: isResizing ? 'none' : 'width 0.15s ease-out',
      }}
      className="fixed left-0 top-0 h-screen bg-[#1C355B] text-slate-100 z-40 flex flex-col border-r border-white/10 select-none group/sidebar shadow-sm"
    >
      {/* Interactive Desktop Drag Resize Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar width"
        aria-valuenow={sidebarWidth}
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        tabIndex={0}
        onPointerDown={startResizing}
        onDoubleClick={resetSidebarWidth}
        onKeyDown={handleKeyDown}
        title="Drag to resize sidebar (Double click to reset to 256px)"
        className={`hidden lg:block absolute top-0 right-0 w-2 h-full cursor-col-resize z-50 hover:bg-[#2855B9]/60 focus:bg-[#2855B9] focus:outline-none transition-all ${
          isResizing ? 'bg-[#2855B9] w-2' : ''
        }`}
      >
        <div className="absolute top-1/2 -translate-y-1/2 right-0.5 w-1 h-8 rounded-full bg-slate-600 group-hover/sidebar:bg-slate-300 transition-colors" />
      </div>

      {/* 1. Official Institutional Brand Header */}
      <div className="p-3.5 border-b border-white/10 bg-[#1C355B]">
        <div className="bg-white rounded-lg p-2 flex items-center justify-center border border-slate-200/20 shadow-xs">
          <img
            src={christLogo}
            alt="CHRIST (Deemed to be University)"
            className="w-full h-11 sm:h-12 object-contain object-center transition-all"
            loading="eager"
          />
        </div>
        <div className="mt-2 text-center">
          <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider leading-tight">
            Internal Quality Assurance Cell
          </p>
        </div>
      </div>

      {/* 2. User Profile Card */}
      {user && (
        <div className="px-3.5 pt-3 pb-1">
          <div className="bg-[#294768]/80 hover:bg-[#294768] transition-colors border border-white/10 rounded-lg p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2855B9] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {(user.name || user.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold text-white truncate leading-tight"
                title={user.name || user.username || 'System Administrator'}
              >
                {user.name || user.username || 'System Administrator'}
              </p>
              <p className="text-[11px] text-slate-300 font-normal truncate flex items-center gap-1.5 mt-0.5">
                <span>{getRoleDisplayName(user.role)}</span>
                {user.department ? (
                  <span className="text-slate-300 truncate" title={user.department}>
                    • {user.department}
                  </span>
                ) : (
                  <span className="text-slate-300">• University-wide</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Search Bar */}
      <div className="px-3.5 py-2">
        <SearchBar onNavigate={onNavigate} />
      </div>

      {/* 4. Scrollable Navigation Menu */}
      <nav className="flex-1 px-3 space-y-3.5 overflow-y-auto overflow-x-hidden py-1 scrollbar-thin scrollbar-thumb-slate-700">
        {coreNavSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-2.5 text-[10px] font-semibold text-slate-300/80 uppercase tracking-wider">
              {section.groupTitle}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;

                // Expandable items with children
                if ('children' in item && item.children) {
                  const isChildActive = isKeyActive(item);
                  const isOpen = openSubmenus[item.key] ?? isChildActive;

                  return (
                    <div key={item.key} className="relative w-full">
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.key)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left ${
                          isChildActive || isOpen
                            ? 'bg-[#294768] text-white font-medium'
                            : 'text-slate-200 hover:bg-[#294768] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className="w-4 h-4 text-slate-300 shrink-0" />
                          <span className="text-xs font-medium truncate">{item.label}</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 shrink-0 ${
                            isOpen ? 'rotate-180 text-white' : ''
                          }`}
                        />
                      </button>

                      {/* Submenu container */}
                      <div
                        className={`w-full overflow-hidden transition-all duration-200 ease-in-out ${
                          isOpen ? 'max-h-[600px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="pl-2.5 pr-1 py-1 space-y-0.5 border-l border-white/15 ml-4 my-0.5">
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left relative ${
                      isActive
                        ? 'bg-[#2855B9] text-white font-medium shadow-xs'
                        : 'text-slate-200 hover:bg-[#294768] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                    <span className="text-xs font-medium truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* 5. System Controls (Admins only) */}
        {user?.role === 'admin' && (
          <div className="space-y-1 pt-1.5 border-t border-white/10">
            <p className="px-2.5 text-[10px] font-semibold text-slate-300/80 uppercase tracking-wider">
              ADMINISTRATION
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left relative ${
                      isActive
                        ? 'bg-[#2855B9] text-white font-medium shadow-xs'
                        : 'text-slate-200 hover:bg-[#294768] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                    <span className="text-xs font-medium truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 6. Refined Institutional Bottom Bar */}
      <div className="p-3 border-t border-white/10 bg-[#1C355B]">
        <div className="flex items-center justify-between bg-[#294768]/60 rounded-lg p-1 border border-white/10">
          <NotificationDropdown />

          <button
            type="button"
            onClick={() => onNavigate?.('dashboard')}
            className="p-1.5 hover:bg-[#294768] rounded-md transition-colors text-slate-300 hover:text-white"
            title="Dashboard Overview"
          >
            <Home className="w-4 h-4" />
          </button>

          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigate?.('user-management')}
              className="p-1.5 hover:bg-[#294768] rounded-md transition-colors text-slate-300 hover:text-white"
              title="User Management"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="p-1.5 hover:bg-rose-500/20 rounded-md transition-colors text-slate-300 hover:text-rose-300"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-center">
          <p className="text-[10px] text-slate-400 font-normal">
            CHRIST (Deemed to be University)
          </p>
        </div>
      </div>
    </aside>
  );
}
