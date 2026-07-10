import React, { useState } from 'react';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Shield, User, Users, AlertCircle, ArrowLeft } from 'lucide-react';
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
    // Pre-fill credentials for easy demo
    const credentials = {
      admin: { username: 'admin@christuniversity.in', password: 'Admin@123' },
      authority: { username: 'dean@christuniversity.in', password: 'Authority@123' },
      hod: { username: 'hod.cse@christuniversity.in', password: 'Hod@123' },
      coordinator: { username: 'coord.cse@christuniversity.in', password: 'Coordinator@123' },
      faculty: { username: 'faculty.cse@christuniversity.in', password: 'Faculty@123' },
    };
    setUsername(credentials[role]?.username || '');
    setPassword(credentials[role]?.password || '');
  };

  const roles = [
    {
      id: 'admin' as UserRole,
      title: 'Admin Login',
      description: 'Full system access and management',
      icon: Shield,
      bgColor: '#0f1746',
      iconColor: '#e8c84a',
      borderColor: 'rgba(232,200,74,0.4)',
      hoverShadow: 'rgba(232,200,74,0.25) 0px 8px 32px',
      selectedBorder: '#e8c84a',
    },
    {
      id: 'authority' as UserRole,
      title: 'Institutional Authority Login',
      description: 'Read-only access to browse records and reports',
      icon: Shield,
      bgColor: 'linear-gradient(135deg, #312e81, #3730a3)',
      iconColor: '#ffffff',
      borderColor: 'rgba(255,255,255,0.2)',
      hoverShadow: 'rgba(79,70,229,0.4) 0px 8px 32px',
      selectedBorder: '#6366f1',
    },
    {
      id: 'hod' as UserRole,
      title: 'HOD Login',
      description: 'Departmental administrator access',
      icon: Users,
      bgColor: 'linear-gradient(135deg, #854d0e, #a16207)',
      iconColor: '#ffffff',
      borderColor: 'rgba(255,255,255,0.2)',
      hoverShadow: 'rgba(234,179,8,0.4) 0px 8px 32px',
      selectedBorder: '#eab308',
    },
    {
      id: 'coordinator' as UserRole,
      title: 'Coordinator Login',
      description: 'Department verification and bulk upload',
      icon: Users,
      bgColor: 'linear-gradient(135deg, #0f766e, #0d9488)',
      iconColor: '#ffffff',
      borderColor: 'rgba(255,255,255,0.15)',
      hoverShadow: 'rgba(20,184,166,0.4) 0px 8px 32px',
      selectedBorder: '#14b8a6',
    },
    {
      id: 'faculty' as UserRole,
      title: 'Faculty Login',
      description: 'Submit achievement records and request edits',
      icon: User,
      bgColor: 'linear-gradient(135deg, #1e40af, #1d4ed8)',
      iconColor: '#ffffff',
      borderColor: 'rgba(255,255,255,0.2)',
      hoverShadow: 'rgba(59,130,246,0.4) 0px 8px 32px',
      selectedBorder: '#3b82f6',
    },
  ];

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        {/* Left Half - Rotating Background */}
        <div
          className="relative w-full md:w-1/2 min-h-[300px] md:min-h-screen flex items-center justify-center overflow-hidden"
          style={{ borderLeft: '5px solid #e8c84a' }}
        >
          {/* Background Image with Rotation */}
          <div className="absolute inset-0">
            {heroImages.map((image, index) => (
              <div
                key={image}
                className="absolute inset-0 transition-opacity duration-1000"
                style={{
                  opacity: currentImageIndex === index ? 1 : 0,
                  backgroundImage: `url(${image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
            <div className="absolute inset-0 bg-[#0f1746] opacity-80" />
          </div>

          {/* Logo and Text */}
          <div className="relative z-10 text-center px-8">
            <ImageWithFallback
              src={christLogo}
              alt="Christ University Logo"
              className="w-48 h-48 mx-auto mb-6 object-contain"
            />
            <h1 className="text-4xl font-bold text-white mb-2">Christ University</h1>
            <h2 className="text-2xl font-semibold text-white/90">IQAC Portal</h2>
          </div>
        </div>

        {/* Right Half - Role Cards */}
        <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 md:p-12 overflow-y-auto">
          <div className="w-full max-w-md my-auto py-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Welcome Back</h2>
            <p className="text-gray-600 mb-8 text-center">Select your role to continue</p>

            {/* Role Cards */}
            <div className="space-y-4">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <div
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className="cursor-pointer transition-all duration-300"
                    style={{
                      background: role.bgColor,
                      borderRadius: '16px',
                      padding: '18px 24px',
                      border: `1px solid ${role.borderColor}`,
                      transform: 'scale(1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = role.hoverShadow;
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Icon className="w-6 h-6 flex-shrink-0" style={{ color: role.iconColor }} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white mb-0.5">{role.title}</h3>
                        <p className="text-xs text-white/70 truncate">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 font-semibold mb-2">Demo Credentials:</p>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <p className="font-medium text-[#0f1746]">Admin</p>
                  <p className="truncate">admin@christuniversity.in</p>
                  <p className="text-gray-400">Admin@123</p>
                </div>
                <div>
                  <p className="font-medium text-indigo-700">Dean (Authority)</p>
                  <p className="truncate">dean@christuniversity.in</p>
                  <p className="text-gray-400">Authority@123</p>
                </div>
                <div>
                  <p className="font-medium text-yellow-700">HOD (CSE)</p>
                  <p className="truncate">hod.cse@christuniversity.in</p>
                  <p className="text-gray-400">Hod@123</p>
                </div>
                <div>
                  <p className="font-medium text-teal-700">Coordinator (CSE)</p>
                  <p className="truncate">coord.cse@christuniversity.in</p>
                  <p className="text-gray-400">Coordinator@123</p>
                </div>
                <div className="col-span-2">
                  <p className="font-medium text-blue-700">Faculty (CSE)</p>
                  <p className="truncate">faculty.cse@christuniversity.in</p>
                  <p className="text-gray-400">Faculty@123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedRoleData = roles.find(r => r.id === selectedRole)!;
  const Icon = selectedRoleData.icon;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Half - Rotating Background */}
      <div
        className="relative w-full md:w-1/2 min-h-[300px] md:min-h-screen flex items-center justify-center overflow-hidden"
        style={{ borderLeft: '5px solid #e8c84a' }}
      >
        {/* Background Image with Rotation */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={image}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{
                opacity: currentImageIndex === index ? 1 : 0,
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
          <div className="absolute inset-0 bg-[#0f1746] opacity-80" />
        </div>

        {/* Logo and Text */}
        <div className="relative z-10 text-center px-8">
          <ImageWithFallback
            src={christLogo}
            alt="Christ University Logo"
            className="w-48 h-48 mx-auto mb-6 object-contain"
          />
          <h1 className="text-4xl font-bold text-white mb-2">Christ University</h1>
          <h2 className="text-2xl font-semibold text-white/90">IQAC Portal</h2>
        </div>
      </div>

      {/* Right Half - Login Form */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          {/* Back Arrow */}
          <button
            onClick={() => {
              setSelectedRole(null);
              setUsername('');
              setPassword('');
              setError('');
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to role selection</span>
          </button>

          {/* Role Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: selectedRoleData.bgColor }}
              >
                <Icon className="w-6 h-6" style={{ color: selectedRoleData.iconColor }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedRoleData.title}</h2>
                <p className="text-sm text-gray-600">{selectedRoleData.description}</p>
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

            <div className="space-y-2">
              <Label htmlFor="username">Email Address</Label>
              <Input
                id="username"
                type="email"
                placeholder="Enter email address"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full text-white transition-all"
                style={{
                  background: selectedRoleData.bgColor,
                  borderColor: selectedRoleData.selectedBorder,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = selectedRoleData.hoverShadow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              <span className="font-semibold">Demo Mode:</span> Credentials are pre-filled for testing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}