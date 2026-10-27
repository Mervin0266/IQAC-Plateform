import React, { useState } from 'react';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Shield, User, Users, AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { ImageWithFallback } from './figma/ImageWithFallback';
import christLogo from 'figma:asset/e4f652b12ffea64be11193ae1ce02c65502fc8ea.png';

interface LoginPageProps {
  onBack?: () => void;
}

export function LoginPage({ onBack }: LoginPageProps) {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
    'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=80',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80',
    'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1600&q=80',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80'
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
      setError('Please select a role');
      return;
    }

    const success = await login(username, password, selectedRole);
    
    if (!success) {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError('');
    // In production builds, credentials must never be embedded, exposed, or prefilled
    if (import.meta.env.DEV) {
      const devCredentials: Record<UserRole, { username: string; password?: string }> = {
        admin: { username: 'admin@christuniversity.in', password: 'Admin@123' },
        authority: { username: 'dean@christuniversity.in', password: 'Authority@123' },
        hod: { username: 'hod.cse@christuniversity.in', password: 'Hod@123' },
        coordinator: { username: 'coord.cse@christuniversity.in', password: 'Coordinator@123' },
        faculty: { username: 'faculty.cse@christuniversity.in', password: 'Faculty@123' },
      };
      setUsername(devCredentials[role]?.username || '');
      setPassword(devCredentials[role]?.password || '');
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
            <ImageWithFallback
              src={christLogo}
              alt="CHRIST (Deemed to be University) Logo"
              className="w-40 h-40 mx-auto mb-6 object-contain drop-shadow-md"
            />
            <div className="inline-block px-3 py-1 bg-white/10 border border-white/15 rounded-full mb-3">
              <span className="text-[11px] font-bold text-[#E8C84A] uppercase tracking-wider">
                Accreditation & Benchmarking
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">CHRIST</h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-widest uppercase mt-0.5">
              (Deemed to be University)
            </p>
            <div className="h-0.5 w-16 bg-[#E8C84A] mx-auto my-4" />
            <h2 className="text-lg sm:text-xl font-bold text-white/95">
              Internal Quality Assurance Cell
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
              Unified institutional platform for NAAC, NIRF, and academic quality auditing
            </p>
          </div>
        </div>

        {/* Right Half - Institutional Role Selection */}
        <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-6 sm:p-10 md:p-12 overflow-y-auto">
          <div className="w-full max-w-md my-auto py-6">
            {onBack && (
              <button
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
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In to IQAC</h2>
              <p className="text-xs text-slate-500 mt-1">Select your authorized role to access the workspace</p>
            </div>

            {/* Role Cards List */}
            <div className="space-y-3">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <div
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className="cursor-pointer p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-[#2F4692] hover:bg-slate-50/80 transition-all shadow-xs flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-[#2F4692] flex items-center justify-center transition-colors flex-shrink-0">
                        <Icon className="w-5 h-5" />
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

            {/* Dev-Only Synthetic Test Accounts Box (Completely removed in production builds) */}
            {import.meta.env.DEV && (
              <div className="mt-6 p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                      DEV ONLY
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Synthetic Test Accounts
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Local environment only</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="font-semibold text-slate-900 text-[11px]">Admin</p>
                    <p className="text-[10px] font-mono text-slate-500 truncate">admin@christuniversity.in</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="font-semibold text-slate-900 text-[11px]">Dean (Authority)</p>
                    <p className="text-[10px] font-mono text-slate-500 truncate">dean@christuniversity.in</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="font-semibold text-slate-900 text-[11px]">HOD (CSE)</p>
                    <p className="text-[10px] font-mono text-slate-500 truncate">hod.cse@christuniversity.in</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="font-semibold text-slate-900 text-[11px]">Coordinator (CSE)</p>
                    <p className="text-[10px] font-mono text-slate-500 truncate">coord.cse@christuniversity.in</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const selectedRoleData = roles.find(r => r.id === selectedRole)!;
  const Icon = selectedRoleData.icon;

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
          <ImageWithFallback
            src={christLogo}
            alt="CHRIST (Deemed to be University) Logo"
            className="w-40 h-40 mx-auto mb-6 object-contain drop-shadow-md"
          />
          <div className="inline-block px-3 py-1 bg-white/10 border border-white/15 rounded-full mb-3">
            <span className="text-[11px] font-bold text-[#E8C84A] uppercase tracking-wider">
              Accreditation & Benchmarking
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">CHRIST</h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-widest uppercase mt-0.5">
            (Deemed to be University)
          </p>
          <div className="h-0.5 w-16 bg-[#E8C84A] mx-auto my-4" />
          <h2 className="text-lg sm:text-xl font-bold text-white/95">
            Internal Quality Assurance Cell
          </h2>
        </div>
      </div>

      {/* Right Half - Login Form */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-6 sm:p-10 md:p-12">
        <div className="w-full max-w-md">
          {/* Back Arrow */}
          <button
            onClick={() => {
              setSelectedRole(null);
              setUsername('');
              setPassword('');
              setError('');
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to role selection</span>
          </button>

          {/* Role Header */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B132B] text-white flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#E8C84A]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{selectedRoleData.title}</h2>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white text-slate-700 rounded font-semibold border border-slate-200">
                    {selectedRoleData.roleTag}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{selectedRoleData.description}</p>
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
              <Label htmlFor="username" className="text-xs font-semibold text-slate-700">Email Address</Label>
              <Input
                id="username"
                type="email"
                placeholder="Enter official email address"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="border-slate-300 focus:border-[#2F4692] focus:ring-[#2F4692] text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-slate-300 focus:border-[#2F4692] focus:ring-[#2F4692] text-xs h-9"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-[#2F4692] hover:bg-[#243A7A] text-white font-semibold py-2.5 rounded-lg shadow-xs text-xs tracking-wider uppercase transition-colors"
              >
                Sign In to Workspace
              </Button>
            </div>
          </form>

          {/* Dev Info (Stripped in production builds) */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
              <p className="text-[11px] text-amber-800 text-center font-medium">
                [DEV MODE] Synthetic test credentials loaded for local role verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}