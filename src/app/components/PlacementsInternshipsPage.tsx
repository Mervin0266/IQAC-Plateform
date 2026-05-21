import React from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UserCheck, Briefcase, TrendingUp, Building2, Award, DollarSign, Users, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';

interface PlacementsInternshipsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function PlacementsInternshipsPage({ onNavigate, isPublicView = false }: PlacementsInternshipsPageProps) {
  // Overall Stats
  const placementStats = {
    totalPlaced: 1245,
    placementRate: 92.5,
    averagePackage: '8.5 LPA',
    highestPackage: '45 LPA',
    companiesVisited: 186,
    totalOffers: 1456,
  };

  // Department-wise Placement Data
  const departmentPlacements = [
    {
      department: 'Computer Science and Engineering',
      totalStudents: 180,
      placed: 172,
      placementRate: 95.6,
      averagePackage: '12.5 LPA',
      highestPackage: '45 LPA',
      topRecruiters: ['Google', 'Microsoft', 'Amazon', 'Infosys', 'TCS'],
    },
    {
      department: 'Electronics and Communication Engineering',
      totalStudents: 150,
      placed: 142,
      placementRate: 94.7,
      averagePackage: '9.8 LPA',
      highestPackage: '32 LPA',
      topRecruiters: ['Intel', 'Qualcomm', 'Samsung', 'Bosch', 'Wipro'],
    },
    {
      department: 'Electrical and Electronics Engineering',
      totalStudents: 120,
      placed: 110,
      placementRate: 91.7,
      averagePackage: '8.5 LPA',
      highestPackage: '28 LPA',
      topRecruiters: ['Siemens', 'ABB', 'L&T', 'Schneider', 'Honeywell'],
    },
    {
      department: 'Mechanical and Automobile Engineering',
      totalStudents: 140,
      placed: 125,
      placementRate: 89.3,
      averagePackage: '7.8 LPA',
      highestPackage: '25 LPA',
      topRecruiters: ['Tata Motors', 'Mahindra', 'Bosch', 'Ashok Leyland', 'Cummins'],
    },
    {
      department: 'Civil Engineering',
      totalStudents: 110,
      placed: 98,
      placementRate: 89.1,
      averagePackage: '6.5 LPA',
      highestPackage: '18 LPA',
      topRecruiters: ['L&T', 'Shapoorji Pallonji', 'Gammon India', 'NCC', 'AFCONS'],
    },
    {
      department: 'Artificial Intelligence and Data Science',
      totalStudents: 90,
      placed: 87,
      placementRate: 96.7,
      averagePackage: '13.2 LPA',
      highestPackage: '42 LPA',
      topRecruiters: ['Google', 'Amazon', 'Flipkart', 'Oracle', 'SAP'],
    },
  ];

  // Department-wise Internships
  const departmentInternships = [
    {
      department: 'Computer Science and Engineering',
      interns: 165,
      averageStipend: '22,000',
      topCompanies: ['Microsoft', 'Google', 'Amazon', 'Adobe'],
    },
    {
      department: 'Electronics and Communication Engineering',
      interns: 138,
      averageStipend: '18,000',
      topCompanies: ['Texas Instruments', 'Intel', 'Qualcomm', 'Samsung'],
    },
    {
      department: 'Electrical and Electronics Engineering',
      interns: 112,
      averageStipend: '16,000',
      topCompanies: ['Siemens', 'ABB', 'Schneider', 'GE'],
    },
    {
      department: 'Mechanical and Automobile Engineering',
      interns: 128,
      averageStipend: '15,000',
      topCompanies: ['Tata Motors', 'Mahindra', 'Bosch', 'Cummins'],
    },
    {
      department: 'Artificial Intelligence and Data Science',
      interns: 82,
      averageStipend: '25,000',
      topCompanies: ['Google', 'Amazon', 'Flipkart', 'Oracle'],
    },
  ];

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-4">
              <Users className="w-12 h-12" />
              <div>
                <h1 className="text-4xl font-bold">Placements & Internships</h1>
                <p className="text-orange-100 mt-2">Building successful careers through industry partnerships</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardDescription className="text-xs">Placement Rate</CardDescription>
                <CardTitle className="text-3xl font-bold text-orange-600">{placementStats.placementRate}%</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardDescription className="text-xs">Total Placed</CardDescription>
                <CardTitle className="text-3xl font-bold text-orange-600">{placementStats.totalPlaced}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardDescription className="text-xs">Avg Package</CardDescription>
                <CardTitle className="text-2xl font-bold text-orange-600">{placementStats.averagePackage}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardDescription className="text-xs">Highest Package</CardDescription>
                <CardTitle className="text-2xl font-bold text-orange-600">{placementStats.highestPackage}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Department Placements - Summary Cards */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Department-wise Placements</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departmentPlacements.map((dept, index) => (
                <Card
                  key={index}
                  className="border-l-4 border-l-orange-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <Building2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{dept.department}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">{dept.placementRate}% placement rate with top industry partners</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">Avg: {dept.averagePackage}</Badge>
                      <Badge variant="secondary" className="text-xs">High: {dept.highestPackage}</Badge>
                      <Badge variant="secondary" className="text-xs">{dept.placed}/{dept.totalStudents} placed</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{dept.topRecruiters.slice(0, 3).join(', ')}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Department Internships - Summary Cards */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Department-wise Internships</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departmentInternships.map((dept, index) => (
                <Card
                  key={index}
                  className="border-l-4 border-l-orange-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <Briefcase className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{dept.department}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">Industry internships with leading organizations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">{dept.interns} interns</Badge>
                      <Badge variant="secondary" className="text-xs">₹{dept.averageStipend}/mo avg</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{dept.topCompanies.slice(0, 3).join(', ')}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Internal view remains unchanged
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="placements-internships" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Placements & Internships</h1>
            <p className="text-gray-600">
              Track placement statistics, internship programs, and campus recruitment data
            </p>
          </div>

          <Tabs defaultValue="placements" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="placements" className="flex items-center gap-2 py-3">
                <UserCheck className="w-4 h-4" />
                <span>Placements</span>
              </TabsTrigger>
              <TabsTrigger value="internships" className="flex items-center gap-2 py-3">
                <Briefcase className="w-4 h-4" />
                <span>Internships</span>
              </TabsTrigger>
            </TabsList>

            {/* Placements Tab */}
            <TabsContent value="placements" className="space-y-6">
              {/* Overall Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">Total Placed</CardDescription>
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-green-600">{placementStats.totalPlaced}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Placement Rate: {placementStats.placementRate}%</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">Average Package</CardDescription>
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-blue-600">{placementStats.averagePackage}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Highest: {placementStats.highestPackage}</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">Companies Visited</CardDescription>
                      <Building2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-purple-600">{placementStats.companiesVisited}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Total Offers: {placementStats.totalOffers}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Department-wise Data */}
              <Card>
                <CardHeader>
                  <CardTitle>Department-wise Placement Statistics</CardTitle>
                  <CardDescription>Comprehensive placement data across all engineering departments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {departmentPlacements.map((dept, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <CardTitle className="text-lg">{dept.department}</CardTitle>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-gray-600">Placement Rate</p>
                              <p className="text-lg font-bold text-green-600">{dept.placementRate}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Students Placed</p>
                              <p className="text-lg font-bold">{dept.placed}/{dept.totalStudents}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Avg Package</p>
                              <p className="text-lg font-bold text-blue-600">{dept.averagePackage}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Highest Package</p>
                              <p className="text-lg font-bold text-purple-600">{dept.highestPackage}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Top Recruiters:</p>
                            <div className="flex flex-wrap gap-2">
                              {dept.topRecruiters.map((company, idx) => (
                                <Badge key={idx} variant="secondary">{company}</Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Internships Tab */}
            <TabsContent value="internships" className="space-y-6">
              {/* Internship Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardDescription className="text-xs">Total Interns</CardDescription>
                    <CardTitle className="text-3xl font-bold text-orange-600">856</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardDescription className="text-xs">Avg Stipend</CardDescription>
                    <CardTitle className="text-2xl font-bold text-orange-600">₹15k/mo</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardDescription className="text-xs">Highest Stipend</CardDescription>
                    <CardTitle className="text-2xl font-bold text-orange-600">₹1L/mo</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardDescription className="text-xs">Companies</CardDescription>
                    <CardTitle className="text-3xl font-bold text-orange-600">142</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Department-wise Internships */}
              <Card>
                <CardHeader>
                  <CardTitle>Department-wise Internship Programs</CardTitle>
                  <CardDescription>Internship opportunities and industry engagement across departments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {departmentInternships.map((dept, index) => (
                      <Card key={index} className="border-l-4 border-l-orange-500">
                        <CardHeader>
                          <CardTitle className="text-lg">{dept.department}</CardTitle>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-gray-600">Total Interns</p>
                              <p className="text-lg font-bold text-orange-600">{dept.interns}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Avg Stipend</p>
                              <p className="text-lg font-bold text-blue-600">₹{dept.averageStipend}/month</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Top Companies:</p>
                            <div className="flex flex-wrap gap-2">
                              {dept.topCompanies.map((company, idx) => (
                                <Badge key={idx} variant="secondary">{company}</Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
