import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Globe, Users, BookOpen, Award, Calendar, MapPin, GraduationCap, Plane, Building } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface InternationalInteractionsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function InternationalInteractionsPage({ onNavigate, isPublicView = false }: InternationalInteractionsPageProps) {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // MoUs and Partnerships
  const partnerships = [
    {
      id: 'MOU-001',
      institution: 'University of Oxford',
      country: 'United Kingdom',
      type: 'Research Collaboration',
      signedDate: '2023-09-15',
      duration: '5 years',
      focusAreas: ['AI Research', 'Data Science', 'Machine Learning'],
      status: 'Active',
    },
    {
      id: 'MOU-002',
      institution: 'Massachusetts Institute of Technology (MIT)',
      country: 'United States',
      type: 'Student Exchange',
      signedDate: '2023-07-20',
      duration: '3 years',
      focusAreas: ['Engineering', 'Innovation', 'Entrepreneurship'],
      status: 'Active',
    },
    {
      id: 'MOU-003',
      institution: 'National University of Singapore',
      country: 'Singapore',
      type: 'Joint Research',
      signedDate: '2024-01-10',
      duration: '4 years',
      focusAreas: ['Sustainability', 'Urban Planning', 'Smart Cities'],
      status: 'Active',
    },
    {
      id: 'MOU-004',
      institution: 'Technical University of Munich',
      country: 'Germany',
      type: 'Faculty Exchange',
      signedDate: '2023-11-05',
      duration: '5 years',
      focusAreas: ['Automotive Engineering', 'Robotics', 'Manufacturing'],
      status: 'Active',
    },
  ];

  // International Conferences
  const conferences = [
    {
      id: 'CONF-001',
      name: 'IEEE International Conference on AI and ML',
      location: 'San Francisco, USA',
      date: '2024-06-15',
      participants: ['Dr. Rajesh Kumar', 'Dr. Priya Sharma', 'Dr. Arun Menon'],
      papers: 3,
      type: 'Paper Presentation',
    },
    {
      id: 'CONF-002',
      name: 'World Engineering Summit',
      location: 'Tokyo, Japan',
      date: '2024-08-20',
      participants: ['Dr. Suresh Rao', 'Dr. Lakshmi Prasad'],
      papers: 2,
      type: 'Keynote Speaker',
    },
    {
      id: 'CONF-003',
      name: 'International Conference on Sustainable Development',
      location: 'Paris, France',
      date: '2024-09-10',
      participants: ['Dr. Meera Nair', 'Dr. Karthik Iyer'],
      papers: 1,
      type: 'Panel Discussion',
    },
  ];

  // Student Exchange Programs
  const studentExchanges = [
    {
      id: 'EX-001',
      studentName: 'Arjun Sharma',
      department: 'Computer Science',
      destinationUniversity: 'University of Melbourne',
      country: 'Australia',
      duration: '1 Semester',
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      program: 'Research Internship',
    },
    {
      id: 'EX-002',
      studentName: 'Priya Reddy',
      department: 'Civil Engineering',
      destinationUniversity: 'ETH Zurich',
      country: 'Switzerland',
      duration: '6 Months',
      startDate: '2024-02-01',
      endDate: '2024-07-31',
      program: 'Student Exchange',
    },
    {
      id: 'EX-003',
      studentName: 'Vikram Patel',
      department: 'Electrical Engineering',
      destinationUniversity: 'TU Delft',
      country: 'Netherlands',
      duration: '1 Year',
      startDate: '2023-09-01',
      endDate: '2024-08-31',
      program: 'Dual Degree',
    },
  ];

  // Visiting Faculty
  const visitingFaculty = [
    {
      id: 'VF-001',
      name: 'Prof. John Smith',
      designation: 'Professor of AI',
      institution: 'Stanford University',
      country: 'USA',
      visitDate: '2024-03-15',
      duration: '2 Weeks',
      activities: ['Guest Lectures', 'Workshop on Deep Learning', 'Research Collaboration'],
    },
    {
      id: 'VF-002',
      name: 'Dr. Maria Garcia',
      designation: 'Associate Professor',
      institution: 'University of Barcelona',
      country: 'Spain',
      visitDate: '2024-04-10',
      duration: '1 Week',
      activities: ['Seminar on Renewable Energy', 'Student Mentoring'],
    },
  ];

  // Statistics
  const stats = {
    totalPartnerships: partnerships.length,
    activeCountries: new Set(partnerships.map(p => p.country)).size,
    studentExchanges: studentExchanges.length,
    internationalConferences: conferences.length,
  };

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-4">
              <Globe className="w-12 h-12" />
              <div>
                <h1 className="text-4xl font-bold">International Interactions</h1>
                <p className="text-cyan-100 mt-2">Global partnerships fostering academic excellence</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-l-4 border-l-cyan-500">
              <CardHeader>
                <CardDescription className="text-xs">Partnerships</CardDescription>
                <CardTitle className="text-3xl font-bold text-cyan-600">{stats.totalPartnerships}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-cyan-500">
              <CardHeader>
                <CardDescription className="text-xs">Countries</CardDescription>
                <CardTitle className="text-3xl font-bold text-cyan-600">{stats.activeCountries}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-cyan-500">
              <CardHeader>
                <CardDescription className="text-xs">Student Exchanges</CardDescription>
                <CardTitle className="text-3xl font-bold text-cyan-600">{stats.studentExchanges}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-cyan-500">
              <CardHeader>
                <CardDescription className="text-xs">Conferences</CardDescription>
                <CardTitle className="text-3xl font-bold text-cyan-600">{stats.internationalConferences}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* MoUs - Summary Cards */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">International Partnerships</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partnerships.map((mou) => (
                <Card
                  key={mou.id}
                  className="border-l-4 border-l-cyan-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <Building className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{mou.institution}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">Collaboration promoting global academic exchange</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">{mou.type}</Badge>
                      <Badge variant="secondary" className="text-xs">{mou.duration}</Badge>
                      <Badge variant="secondary" className="text-xs">{mou.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{mou.country}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Student Exchanges - Summary Cards */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Exchange Programs</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentExchanges.map((exchange) => (
                <Card
                  key={exchange.id}
                  className="border-l-4 border-l-cyan-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <GraduationCap className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{exchange.studentName}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">International academic experience abroad</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">{exchange.program}</Badge>
                      <Badge variant="secondary" className="text-xs">{exchange.duration}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{exchange.destinationUniversity}, {exchange.country}</p>
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
      <Sidebar currentPage="international-interactions" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">International Interactions</h1>
            <p className="text-gray-600">
              Track international collaborations, exchange programs, and global partnerships
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>MoUs & Partnerships</CardDescription>
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalPartnerships}</div>
                <p className="text-xs text-gray-500 mt-1">Active collaborations</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Countries</CardDescription>
                  <Globe className="w-5 h-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.activeCountries}</div>
                <p className="text-xs text-gray-500 mt-1">Global presence</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Student Exchanges</CardDescription>
                  <GraduationCap className="w-5 h-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.studentExchanges}</div>
                <p className="text-xs text-gray-500 mt-1">Current academic year</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Int'l Conferences</CardDescription>
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.internationalConferences}</div>
                <p className="text-xs text-gray-500 mt-1">Faculty participation</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="partnerships" className="space-y-6">
            <TabsList>
              <TabsTrigger value="partnerships">MoUs & Partnerships</TabsTrigger>
              <TabsTrigger value="conferences">International Conferences</TabsTrigger>
              <TabsTrigger value="students">Student Exchange</TabsTrigger>
              <TabsTrigger value="faculty">Visiting Faculty</TabsTrigger>
            </TabsList>

            <TabsContent value="partnerships" className="space-y-4">
              {partnerships.map((mou) => (
                <Card key={mou.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{mou.institution}</CardTitle>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            {mou.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-base flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {mou.country}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-blue-50">
                        {mou.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Signed Date</p>
                        <p className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(mou.signedDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Duration</p>
                        <p className="font-medium">{mou.duration}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Focus Areas</p>
                      <div className="flex flex-wrap gap-2">
                        {mou.focusAreas.map((area, idx) => (
                          <Badge key={idx} variant="outline" className="bg-purple-50">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="conferences" className="space-y-4">
              {conferences.map((conf) => (
                <Card key={conf.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{conf.name}</CardTitle>
                        <CardDescription className="text-base flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {conf.location}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-orange-50">
                        {conf.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Conference Date</p>
                        <p className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(conf.date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Papers Presented</p>
                        <p className="font-medium flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          {conf.papers}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Participants</p>
                      <div className="flex flex-wrap gap-2">
                        {conf.participants.map((participant, idx) => (
                          <Badge key={idx} variant="outline" className="bg-blue-50">
                            <Users className="w-3 h-3 mr-1" />
                            {participant}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              {studentExchanges.map((exchange) => (
                <Card key={exchange.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{exchange.studentName}</CardTitle>
                        <CardDescription className="text-base">
                          {exchange.department}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-green-50">
                        {exchange.program}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Destination</p>
                        <p className="font-medium">{exchange.destinationUniversity}</p>
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {exchange.country}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Duration</p>
                        <p className="font-medium">{exchange.duration}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Start Date</p>
                        <p className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(exchange.startDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">End Date</p>
                        <p className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(exchange.endDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="faculty" className="space-y-4">
              {visitingFaculty.map((faculty) => (
                <Card key={faculty.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{faculty.name}</CardTitle>
                        <CardDescription className="text-base">
                          {faculty.designation} - {faculty.institution}
                        </CardDescription>
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {faculty.country}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Visit Date</p>
                        <p className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(faculty.visitDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Duration</p>
                        <p className="font-medium">{faculty.duration}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Activities</p>
                      <div className="flex flex-wrap gap-2">
                        {faculty.activities.map((activity, idx) => (
                          <Badge key={idx} variant="outline" className="bg-purple-50">
                            {activity}
                          </Badge>
                        ))}
                      </div>
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