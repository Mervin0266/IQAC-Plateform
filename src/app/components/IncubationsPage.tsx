import React from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Lightbulb, Users, TrendingUp, Award, Building, Calendar, DollarSign, Rocket } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface IncubationsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function IncubationsPage({ onNavigate, isPublicView = false }: IncubationsPageProps) {
  const incubationStats = {
    activeStartups: 28,
    graduatedStartups: 45,
    totalFunding: '₹12.5 Cr',
    mentors: 35,
  };

  const activeStartups = [
    {
      id: 1,
      name: 'EduTech Solutions',
      founder: 'Rahul Sharma (CSE 2022)',
      sector: 'Education Technology',
      stage: 'Seed Funding',
      funding: '₹50 Lakhs',
      incubatedSince: '2023-06-15',
      employees: 8,
      description: 'AI-powered personalized learning platform for K-12 students',
    },
    {
      id: 2,
      name: 'GreenEnergy Innovations',
      founder: 'Priya Menon (EEE 2021)',
      sector: 'Clean Energy',
      stage: 'Series A',
      funding: '₹2.5 Crores',
      incubatedSince: '2022-09-20',
      employees: 15,
      description: 'Sustainable solar panel recycling and energy management solutions',
    },
    {
      id: 3,
      name: 'HealthCare AI',
      founder: 'Dr. Arjun Kumar (AI&DS 2020)',
      sector: 'HealthTech',
      stage: 'Pre-Series A',
      funding: '₹1.2 Crores',
      incubatedSince: '2023-01-10',
      employees: 12,
      description: 'ML-based diagnostic assistance for early disease detection',
    },
    {
      id: 4,
      name: 'AgriTech Connect',
      founder: 'Suresh Patil (ECE 2022)',
      sector: 'AgriTech',
      stage: 'Seed Funding',
      funding: '₹75 Lakhs',
      incubatedSince: '2023-03-25',
      employees: 10,
      description: 'IoT-based precision farming and crop monitoring platform',
    },
  ];

  const graduatedStartups = [
    {
      name: 'TechVenture Labs',
      founder: 'Alumni 2018',
      sector: 'Software Development',
      currentValuation: '₹25 Crores',
      employees: 45,
      achievement: 'Secured Series B funding',
    },
    {
      name: 'Smart Mobility Solutions',
      founder: 'Alumni 2019',
      sector: 'Transportation',
      currentValuation: '₹18 Crores',
      employees: 32,
      achievement: 'Partnership with major auto manufacturer',
    },
    {
      name: 'FinTech Innovations',
      founder: 'Alumni 2020',
      sector: 'Financial Technology',
      currentValuation: '₹30 Crores',
      employees: 50,
      achievement: 'Acquired by major bank',
    },
  ];

  const incubationPrograms = [
    {
      name: 'Christ University Incubation Center',
      focus: 'Technology & Innovation',
      duration: '12-18 months',
      support: ['Seed funding up to ₹50 lakhs', 'Mentorship', 'Infrastructure', 'Legal & Financial advisory'],
    },
    {
      name: 'Pre-incubation Program',
      focus: 'Idea to Prototype',
      duration: '6 months',
      support: ['Workspace', 'Mentorship', 'Prototype development support', 'Networking events'],
    },
  ];

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-4">
              <Lightbulb className="w-12 h-12" />
              <div>
                <h1 className="text-4xl font-bold">Incubations</h1>
                <p className="text-purple-100 mt-2">Nurturing entrepreneurial innovation and startups</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardDescription className="text-xs">Active Startups</CardDescription>
                <CardTitle className="text-3xl font-bold text-purple-600">{incubationStats.activeStartups}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardDescription className="text-xs">Graduated</CardDescription>
                <CardTitle className="text-3xl font-bold text-purple-600">{incubationStats.graduatedStartups}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardDescription className="text-xs">Total Funding</CardDescription>
                <CardTitle className="text-2xl font-bold text-purple-600">{incubationStats.totalFunding}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardDescription className="text-xs">Mentors</CardDescription>
                <CardTitle className="text-3xl font-bold text-purple-600">{incubationStats.mentors}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Active Startups - Summary Cards */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Startups</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeStartups.map((startup) => (
                <Card
                  key={startup.id}
                  className="border-l-4 border-l-purple-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <Rocket className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{startup.name}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">{startup.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">{startup.sector}</Badge>
                      <Badge variant="secondary" className="text-xs">{startup.stage}</Badge>
                      <Badge variant="secondary" className="text-xs">{startup.funding}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{startup.founder}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Graduated Startups - Summary Cards */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Graduated Startups</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {graduatedStartups.map((startup, idx) => (
                <Card
                  key={idx}
                  className="border-l-4 border-l-purple-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <Award className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{startup.name}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">Successfully graduated startup venture</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">{startup.sector}</Badge>
                      <Badge variant="secondary" className="text-xs">{startup.currentValuation}</Badge>
                      <Badge variant="secondary" className="text-xs">{startup.employees} employees</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{startup.achievement}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="incubations" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Incubations</h1>
            <p className="text-gray-600">
              Track startup incubation programs, ventures, and entrepreneurship initiatives
            </p>
          </div>
        
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Active Startups</CardDescription>
                  <Rocket className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-blue-600">{incubationStats.activeStartups}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Currently Incubating</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Graduated Startups</CardDescription>
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-green-600">{incubationStats.graduatedStartups}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Successfully Graduated</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Total Funding</CardDescription>
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-purple-600">{incubationStats.totalFunding}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Raised by Startups</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Mentors</CardDescription>
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-orange-600">{incubationStats.mentors}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Industry Experts</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="active" className="py-3">Active Startups</TabsTrigger>
              <TabsTrigger value="graduated" className="py-3">Graduated Startups</TabsTrigger>
              <TabsTrigger value="programs" className="py-3">Incubation Programs</TabsTrigger>
            </TabsList>

            {/* Active Startups */}
            <TabsContent value="active" className="space-y-4">
              {activeStartups.map((startup) => (
                <Card key={startup.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">{startup.name}</CardTitle>
                          <Badge className="bg-blue-600 text-white">{startup.stage}</Badge>
                        </div>
                        <div className="mb-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4" />
                            <span>{startup.founder}</span>
                          </div>
                          <p className="mt-2">{startup.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">Sector</p>
                            <Badge variant="outline" className="mt-1">{startup.sector}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Funding Raised</p>
                            <p className="font-semibold text-purple-600">{startup.funding}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Team Size</p>
                            <p className="font-semibold">{startup.employees} members</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Incubated Since</p>
                            <p className="font-semibold text-sm">{new Date(startup.incubatedSince).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                      <Lightbulb className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>

            {/* Graduated Startups */}
            <TabsContent value="graduated" className="space-y-4">
              {graduatedStartups.map((startup, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">{startup.name}</CardTitle>
                          <Badge className="bg-green-600 text-white">Graduated</Badge>
                        </div>
                        <div className="mb-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{startup.founder}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">Sector</p>
                            <Badge variant="outline" className="mt-1">{startup.sector}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Current Valuation</p>
                            <p className="font-semibold text-green-600">{startup.currentValuation}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Employees</p>
                            <p className="font-semibold">{startup.employees}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Achievement</p>
                            <p className="font-semibold text-sm">{startup.achievement}</p>
                          </div>
                        </div>
                      </div>
                      <Award className="w-6 h-6 text-green-600 flex-shrink-0" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>

            {/* Incubation Programs */}
            <TabsContent value="programs" className="space-y-4">
              {incubationPrograms.map((program, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Building className="w-5 h-5 text-blue-600" />
                      {program.name}
                    </CardTitle>
                    <div className="text-sm text-gray-600">
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-gray-500">Focus Area</p>
                          <p className="font-semibold text-gray-900">{program.focus}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="font-semibold text-gray-900">{program.duration}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold mb-3">Support Provided:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {program.support.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}