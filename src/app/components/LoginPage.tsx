import React, { useState } from 'react';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Shield, User, Users, AlertCircle, ArrowLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import christLogo from '../../assets/logo.png';

interface LoginPageProps {
  onBack?: () => void;
}

// ── Synthetic Test Account Fixtures (Development/Testing Only) ─────────────────
// In production builds, this entire fixture block is compiled away by dead-code elimination.
export interface TestAccountFixture {
  role: UserRole;
  label: string;
  shortTag: string;
  email: string;
  password: string;
  description: string;
}

const isLocalTestMode = Boolean(import.meta.env.DEV && !import.meta.env.PROD);

const TEST_ACCOUNT_FIXTURES: Record<UserRole, TestAccountFixture> | null = import.meta.env.DEV
  ? {
      admin: {
        role: 'admin',
        label: 'Administrator',
        shortTag: 'SYSTEM ADMIN',
        email: 'admin@christuniversity.in',
        password: 'Admin@123',
        description: 'Institutional management, user roles, security, and database controls',
      },
      authority: {
        role: 'authority',
        label: 'Dean / Director',
        shortTag: 'AUTHORITY',
        email: 'dean@christuniversity.in',
        password: 'Authority@123',
        description: 'Executive oversight, read-only institutional inspection, analytics, and audits',
      },
      hod: {
        role: 'hod',
        label: 'Head of Department',
        shortTag: 'HOD (CSE)',
        email: 'hod.cse@christuniversity.in',
        password: 'Hod@123',
        description: 'Departmental administration, academic reviews, faculty allocations, and approvals',
      },
      coordinator: {
        role: 'coordinator',
        label: 'IQAC Coordinator',
        shortTag: 'COORDINATOR (CSE)',
        email: 'coord.cse@christuniversity.in',
        password: 'Coordinator@123',
        description: 'Criterion verification, data validation, and departmental bulk uploads',
      },
      faculty: {
        role: 'faculty',
        label: 'Faculty Member',
        shortTag: 'FACULTY (CSE)',
        email: 'faculty.cse@christuniversity.in',
        password: 'Faculty@123',
        description: 'Profile management, publications, research grants, and student achievements',
      },
    }
  : null;

export function LoginPage({ onBack }: LoginPageProps) {
  const { login } = useAuth();

  // In development test mode, automatically default to 'admin' test role. In production, default to null.
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(() => {
    return isLocalTestMode ? 'admin' : null;
  });

  // Prefill default admin test credentials in local dev mode; empty string in production
  const [username, setUsername] = useState<string>(() => {
    return isLocalTestMode && TEST_ACCOUNT_FIXTURES ? TEST_ACCOUNT_FIXTURES.admin.email : '';
  });
  const [password, setPassword] = useState<string>(() => {
    return isLocalTestMode && TEST_ACCOUNT_FIXTURES ? TEST_ACCOUNT_FIXTURES.admin.password : '';
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
    'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=80',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80',
    'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1600&q=80',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80',
  ];

  // Hero slideshow
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedRole) {
      setError('Please select an authorized institutional role.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(username, password, selectedRole);
      if (!success) {
        setError('Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setError('A connection error occurred while communicating with the authentication service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch role and update both fields atomically
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError('');

    if (isLocalTestMode && TEST_ACCOUNT_FIXTURES && TEST_ACCOUNT_FIXTURES[role]) {
      const fixture = TEST_ACCOUNT_FIXTURES[role];
      setUsername(fixture.email);
      setPassword(fixture.password);
    } else {
      setUsername('');
      setPassword('');
    }
  };

  const roles = [
    {
      id: 'admin' as UserRole,
      title: 'Administrator',
      roleTag: 'SYSTEM ADMIN',
      description: 'Institutional management, user roles, security, and database controls',
      icon: Shield,
    },
    {
      id: 'authority' as UserRole,
      title: 'Dean / Director',
      roleTag: 'AUTHORITY',
      description: 'Executive oversight, read-only institutional inspection, analytics, and audits',
      icon: Shield,
    },
    {
      id: 'hod' as UserRole,
      title: 'Head of Department',
      roleTag: 'HOD',
      description: 'Departmental administration, academic reviews, faculty allocations, and approvals',
      icon: Users,
    },
    {
      id: 'coordinator' as UserRole,
      title: 'IQAC Coordinator',
      roleTag: 'COORDINATOR',
      description: 'Criterion verification, data validation, and departmental bulk uploads',
      icon: Users,
    },
    {
      id: 'faculty' as UserRole,
      title: 'Faculty Member',
      roleTag: 'FACULTY',
      description: 'Profile management, publications, research grants, and student achievements',
      icon: User,
    },
  ];

  // ── VIEW 1: Role Selection Cards (When no role is selected) ────────────────
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
        {/* Left Half - Christ Identity Showcase */}
        <div
          className="relative w-full md:w-1/2 min-h-[320px] md:min-h-screen flex items-center justify-center overflow-hidden bg-[#0B132B]"
          style={{ borderLeft: '6px solid #E8C84A' }}
        >
          {/* Background Slideshow with overlay */}
          <div className="absolute inset-0">
            {heroImages.map((image, index) => (
              <div
                key={image}
                className="absolute inset-0 transition-opacity duration-1000"
                style={{
                  opacity: currentImageIndex === index ? 0.25 : 0,
                  backgroundImage: `url(${image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B132B]/80 via-[#0B132B]/90 to-[#0B132B]" />
          </div>

          {/* Institutional Emblem & Typography */}
          <div className="relative z-10 text-center px-8 py-10 max-w-md mx-auto">
            <img
              src={christLogo}
              alt="CHRIST (Deemed to be University)"
              className="w-48 h-20 mx-auto mb-5 object-contain drop-shadow-md"
            />
            <div className="inline-block px-3 py-1 bg-white/10 border border-white/15 rounded-full mb-3">
              <span className="text-[11px] font-bold text-[#E8C84A] uppercase tracking-wider">
                Internal Quality Assurance Cell
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">CHRIST</h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-widest uppercase mt-0.5">
              (Deemed to be University)
            </p>
            <div className="h-0.5 w-16 bg-[#E8C84A] mx-auto my-4" />
            <h2 className="text-base sm:text-lg font-bold text-white/95">
              IQAC Institutional Quality Platform
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
              Unified institutional intelligence for NAAC, NIRF, and academic quality auditing
            </p>
          </div>
        </div>

        {/* Right Half - Institutional Role Selection */}
        <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-6 sm:p-10 md:p-12 overflow-y-auto">
          <div className="w-full max-w-md my-auto py-6">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Public Portal</span>
              </button>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F4692] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  INSTITUTIONAL PORTAL
                </span>
                {isLocalTestMode && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Local Test Mode
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In to IQAC</h2>
              <p className="text-xs text-slate-500 mt-1">Select your authorized role to access the workspace</p>
            </div>

            {/* Role Cards List */}
            <div className="space-y-3">
              {roles.map((role) => {
                const RoleIcon = role.icon;
                return (
                  <div
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className="cursor-pointer p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-[#2F4692] hover:bg-slate-50/80 transition-all shadow-xs flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-[#2F4692] flex items-center justify-center transition-colors flex-shrink-0">
                        <RoleIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#2F4692] transition-colors">
                            {role.title}
                          </h3>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-semibold border border-slate-200">
                            {role.roleTag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {role.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2F4692] group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VIEW 2: Login Form (Role Selected) ─────────────────────────────────────
  const selectedRoleData = roles.find((r) => r.id === selectedRole)!;
  const RoleIcon = selectedRoleData.icon;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Left Half - Christ Identity Showcase */}
      <div
        className="relative w-full md:w-1/2 min-h-[320px] md:min-h-screen flex items-center justify-center overflow-hidden bg-[#0B132B]"
        style={{ borderLeft: '6px solid #E8C84A' }}
      >
        {/* Background Slideshow with overlay */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={image}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{
                opacity: currentImageIndex === index ? 0.25 : 0,
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B132B]/80 via-[#0B132B]/90 to-[#0B132B]" />
        </div>

        {/* Institutional Emblem & Typography */}
        <div className="relative z-10 text-center px-8 py-10 max-w-md mx-auto">
          <img
            src={christLogo}
            alt="CHRIST (Deemed to be University)"
            className="w-48 h-20 mx-auto mb-5 object-contain drop-shadow-md"
          />
          <div className="inline-block px-3 py-1 bg-white/10 border border-white/15 rounded-full mb-3">
            <span className="text-[11px] font-bold text-[#E8C84A] uppercase tracking-wider">
              Internal Quality Assurance Cell
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">CHRIST</h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-widest uppercase mt-0.5">
            (Deemed to be University)
          </p>
          <div className="h-0.5 w-16 bg-[#E8C84A] mx-auto my-4" />
          <h2 className="text-base sm:text-lg font-bold text-white/95">
            IQAC Institutional Quality Platform
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Unified institutional intelligence for NAAC, NIRF, and academic quality auditing
          </p>
        </div>
      </div>

      {/* Right Half - Login Form */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-6 sm:p-10 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md my-auto py-6">
          {/* Navigation & Return */}
          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                setSelectedRole(null);
                setUsername('');
                setPassword('');
                setError('');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{onBack ? 'Return to Public Portal' : 'Back to role selection'}</span>
          </button>

          {/* Development Test Mode Subtle Indicator */}
          {isLocalTestMode && (
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-amber-50/80 border border-amber-200/80 rounded-full mb-4 mx-auto w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-amber-900 tracking-wide">
                Local Test Mode — Synthetic Credentials
              </span>
            </div>
          )}

          {/* 5-Role Fast Test Switcher (Development Only) */}
          {isLocalTestMode && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Select Test Role
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Auto-fills credentials
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                {(['admin', 'authority', 'hod', 'coordinator', 'faculty'] as UserRole[]).map((r) => {
                  const isActive = selectedRole === r;
                  const labelMap: Record<UserRole, string> = {
                    admin: 'Admin',
                    authority: 'Authority',
                    hod: 'HOD',
                    coordinator: 'Coord',
                    faculty: 'Faculty',
                  };
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSelect(r)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all text-center truncate ${
                        isActive
                          ? 'bg-[#2F4692] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                      title={`Switch to ${labelMap[r]}`}
                    >
                      {labelMap[r]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Role Header Banner */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-white flex items-center justify-center flex-shrink-0">
                <RoleIcon className="w-5 h-5 text-[#E8C84A]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">{selectedRoleData.title}</h2>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white text-slate-700 rounded font-semibold border border-slate-200">
                    {selectedRoleData.roleTag}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{selectedRoleData.description}</p>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-slate-700">
                Email Address
              </Label>
              <Input
                id="username"
                type="email"
                placeholder="Enter official email address"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-slate-300 focus:border-[#2F4692] focus:ring-[#2F4692] text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-slate-300 focus:border-[#2F4692] focus:ring-[#2F4692] text-xs h-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#2F4692] hover:bg-[#243A7A] text-white font-semibold py-2.5 rounded-lg shadow-xs text-xs tracking-wider uppercase transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In to Workspace</span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}