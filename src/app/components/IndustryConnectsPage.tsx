import React from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Briefcase, Users, Calendar, Award, TrendingUp, Building2 } from 'lucide-react';
import { Badge } from './ui/badge';

interface IndustryConnectsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function IndustryConnectsPage({ onNavigate, isPublicView = false }: IndustryConnectsPageProps) {
  const iiicStats = {
    totalPartners: 45,
    activeMous: 32,
    studentsBenefited: 1250,
    eventsOrganized: 28,
  };

  const activities = [
    {
      id: 1,
      title: 'Industry Expert Lecture Series',
      date: '2024-02-15',
      type: 'Guest Lecture',
      partner: 'Microsoft India',
      participants: 180,
      description: 'Cloud Computing and Azure ecosystem workshop',
    },
    {
      id: 2,
      title: 'Hackathon 2024',
      date: '2024-03-10',
      type: 'Competition',
      partner: 'Google Developer Groups',
      participants: 250,
      description: '24-hour coding marathon focused on AI/ML solutions',
    },
    {
      id: 3,
      title: 'Industry Visit - Manufacturing Plant',
      date: '2024-01-20',
      type: 'Industry Visit',
      partner: 'Bosch India',
      participants: 60,
      description: 'Exposure to Industry 4.0 and automation technologies',
    },
    {
      id: 4,
      title: 'Skill Development Workshop',
      date: '2024-02-28',
      type: 'Workshop',
      partner: 'TCS iON',
      participants: 120,
      description: 'Professional skills and corporate readiness training',
    },
  ];

  const industryPartners = [
    { name: 'Microsoft', category: 'Technology', mous: 2, projects: 5 },
    { name: 'Google', category: 'Technology', mous: 1, projects: 3 },
    { name: 'Bosch', category: 'Engineering', mous: 3, projects: 7 },
    { name: 'Siemens', category: 'Engineering', mous: 2, projects: 4 },
    { name: 'TCS', category: 'IT Services', mous: 2, projects: 6 },
    { name: 'Infosys', category: 'IT Services', mous: 2, projects: 5 },
  ];

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-4">
              <Building2 className="w-12 h-12" />
              <div>
                <h1 className="text-4xl font-bold">Industry Connects</h1>
                <p className="text-emerald-100 mt-2">Building strong partnerships with leading industries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader>
                <CardDescription className="text-xs">Industry Partners</CardDescription>
                <CardTitle className="text-3xl font-bold text-emerald-600">{iiicStats.totalPartners}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader>
                <CardDescription className="text-xs">Active MoUs</CardDescription>
                <CardTitle className="text-3xl font-bold text-emerald-600">{iiicStats.activeMous}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader>
                <CardDescription className="text-xs">Students Benefited</CardDescription>
                <CardTitle className="text-3xl font-bold text-emerald-600">{iiicStats.studentsBenefited}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader>
                <CardDescription className="text-xs">Events</CardDescription>
                <CardTitle className="text-3xl font-bold text-emerald-600">{iiicStats.eventsOrganized}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Activities - Summary Cards */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activities</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity) => (
                <Card
                  key={activity.id}
                  className="border-l-4 border-l-emerald-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{activity.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">{activity.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">{activity.type}</Badge>
                      <Badge variant="secondary" className="text-xs">{activity.participants} participants</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{activity.partner}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Partners - Summary Cards */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Industry Partners</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {industryPartners.map((partner, idx) => (
                <Card
                  key={idx}
                  className="border-l-4 border-l-emerald-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <Briefcase className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{partner.name}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">Strategic industry collaboration partner</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">{partner.category}</Badge>
                      <Badge variant="secondary" className="text-xs">{partner.mous} MoUs</Badge>
                      <Badge variant="secondary" className="text-xs">{partner.projects} projects</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Active partnership</p>
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
      <Sidebar currentPage="industry-connects" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Industry Connects</h1>
            <p className="text-gray-600">
              Track industry partnerships, collaborations, and engagement activities
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Industry Partners</CardDescription>
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-blue-600">{iiicStats.totalPartners}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Active partnerships</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Active MoUs</CardDescription>
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-green-600">{iiicStats.activeMous}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Memoranda of Understanding</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Students Benefited</CardDescription>
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-purple-600">{iiicStats.studentsBenefited}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">This academic year</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Events Organized</CardDescription>
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-orange-600">{iiicStats.eventsOrganized}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">In 2024</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Recent IIIC Activities
              </CardTitle>
              <CardDescription>Industry interaction events and initiatives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{activity.title}</h4>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {activity.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            <span>{activity.partner}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span>{activity.participants} participants</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>{new Date(activity.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Industry Partners */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Industry Partners
              </CardTitle>
              <CardDescription>Active industry collaborations and partnerships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {industryPartners.map((partner, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100">
                    <h4 className="font-semibold text-lg mb-2">{partner.name}</h4>
                    <Badge variant="outline" className="mb-3">{partner.category}</Badge>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Active MoUs:</span>
                        <span className="font-semibold">{partner.mous}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Collaborative Projects:</span>
                        <span className="font-semibold">{partner.projects}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}