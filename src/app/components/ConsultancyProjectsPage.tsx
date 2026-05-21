import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Building, DollarSign, Calendar, Users, TrendingUp, CheckCircle, Clock, AlertCircle, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ConsultancyProjectsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function ConsultancyProjectsPage({ onNavigate, isPublicView = false }: ConsultancyProjectsPageProps) {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Consultancy Projects Data
  const consultancyProjects = [
    {
      id: 'CONS-001',
      title: 'Smart City Infrastructure Planning',
      client: 'Bangalore Smart City Corporation',
      department: 'Civil Engineering',
      principalInvestigator: 'Dr. Rajesh Kumar',
      teamMembers: ['Dr. Priya Sharma', 'Dr. Arun Menon'],
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      value: '₹25,00,000',
      status: 'Ongoing',
      progress: 65,
      deliverables: ['Feasibility Study', 'Design Plans', 'Implementation Strategy'],
    },
    {
      id: 'CONS-002',
      title: 'AI-Powered Customer Analytics Platform',
      client: 'RetailMax Solutions Pvt. Ltd.',
      department: 'Computer Science',
      principalInvestigator: 'Dr. Deepa Singh',
      teamMembers: ['Dr. Vikram Patel', 'Dr. Meera Nair'],
      startDate: '2023-11-01',
      endDate: '2024-04-30',
      value: '₹18,50,000',
      status: 'Completed',
      progress: 100,
      deliverables: ['Software Solution', 'Documentation', 'Training Sessions'],
    },
    {
      id: 'CONS-003',
      title: 'Energy Audit and Optimization Study',
      client: 'Karnataka Power Corporation',
      department: 'Electrical Engineering',
      principalInvestigator: 'Dr. Suresh Rao',
      teamMembers: ['Dr. Lakshmi Prasad'],
      startDate: '2024-02-01',
      endDate: '2024-08-31',
      value: '₹32,00,000',
      status: 'Ongoing',
      progress: 45,
      deliverables: ['Energy Audit Report', 'Optimization Strategy', 'Cost-Benefit Analysis'],
    },
    {
      id: 'CONS-004',
      title: 'Advanced Manufacturing Process Optimization',
      client: 'AutoTech Industries Ltd.',
      department: 'Mechanical Engineering',
      principalInvestigator: 'Dr. Karthik Iyer',
      teamMembers: ['Dr. Ramesh Rao', 'Dr. Anita Kumar'],
      startDate: '2023-09-15',
      endDate: '2024-03-15',
      value: '₹28,75,000',
      status: 'Completed',
      progress: 100,
      deliverables: ['Process Analysis', 'Optimization Solutions', 'Implementation Guide'],
    },
    {
      id: 'CONS-005',
      title: 'IoT-Based Environmental Monitoring System',
      client: 'Karnataka Pollution Control Board',
      department: 'Electronics',
      principalInvestigator: 'Dr. Prakash Sharma',
      teamMembers: ['Dr. Sunil Kumar', 'Dr. Nisha Reddy'],
      startDate: '2024-03-01',
      endDate: '2024-09-30',
      value: '₹22,00,000',
      status: 'Ongoing',
      progress: 30,
      deliverables: ['Sensor Network Design', 'Data Analytics Platform', 'Mobile Application'],
    },
    {
      id: 'CONS-006',
      title: 'Blockchain-Based Supply Chain Management',
      client: 'LogiChain Global Services',
      department: 'Computer Science',
      principalInvestigator: 'Dr. Arun Kumar',
      teamMembers: ['Dr. Deepa Singh'],
      startDate: '2024-01-10',
      endDate: '2024-07-10',
      value: '₹35,00,000',
      status: 'Ongoing',
      progress: 55,
      deliverables: ['Blockchain Architecture', 'Smart Contracts', 'Integration Platform'],
    },
  ];

  // Filter projects
  const filteredProjects = consultancyProjects.filter(project => {
    const yearMatch = selectedYear === 'all' || project.startDate.startsWith(selectedYear);
    const deptMatch = selectedDepartment === 'all' || project.department === selectedDepartment;
    return yearMatch && deptMatch;
  });

  // Statistics
  const stats = {
    totalProjects: consultancyProjects.length,
    ongoingProjects: consultancyProjects.filter(p => p.status === 'Ongoing').length,
    completedProjects: consultancyProjects.filter(p => p.status === 'Completed').length,
    totalRevenue: consultancyProjects.reduce((sum, p) => {
      const value = parseInt(p.value.replace(/[₹,]/g, ''));
      return sum + value;
    }, 0),
  };

  // Department-wise breakdown
  const departmentStats = consultancyProjects.reduce((acc, project) => {
    const dept = project.department;
    if (!acc[dept]) {
      acc[dept] = { count: 0, revenue: 0 };
    }
    acc[dept].count++;
    acc[dept].revenue += parseInt(project.value.replace(/[₹,]/g, ''));
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Ongoing':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-4">
              <Briefcase className="w-12 h-12" />
              <div>
                <h1 className="text-4xl font-bold">Consultancy Projects</h1>
                <p className="text-teal-100 mt-2">Bridging academia and industry through innovative solutions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader>
                <CardDescription className="text-xs">Total Projects</CardDescription>
                <CardTitle className="text-3xl font-bold text-teal-600">{stats.totalProjects}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader>
                <CardDescription className="text-xs">Ongoing</CardDescription>
                <CardTitle className="text-3xl font-bold text-teal-600">{stats.ongoingProjects}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader>
                <CardDescription className="text-xs">Completed</CardDescription>
                <CardTitle className="text-3xl font-bold text-teal-600">{stats.completedProjects}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader>
                <CardDescription className="text-xs">Revenue</CardDescription>
                <CardTitle className="text-2xl font-bold text-teal-600">₹{(stats.totalRevenue / 10000000).toFixed(2)}Cr</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Projects - Summary Cards */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Consultancy Projects</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {consultancyProjects.map((project) => (
                <Card
                  key={project.id}
                  className="border-l-4 border-l-teal-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <Briefcase className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{project.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">Industry collaboration delivering real-world impact</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">{project.status}</Badge>
                      <Badge variant="secondary" className="text-xs">{project.value}</Badge>
                      <Badge variant="secondary" className="text-xs">{project.progress}%</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{project.client} • {project.department}</p>
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
      <Sidebar currentPage="consultancy-projects" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Consultancy Projects</h1>
            <p className="text-gray-600">
              Track consultancy projects, industry partnerships, and collaborative research
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Projects</CardDescription>
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalProjects}</div>
                <p className="text-xs text-gray-500 mt-1">All time projects</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Completed</CardDescription>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.completedProjects}</div>
                <p className="text-xs text-gray-500 mt-1">Successfully delivered</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Ongoing</CardDescription>
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.ongoingProjects}</div>
                <p className="text-xs text-gray-500 mt-1">Active projects</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Revenue</CardDescription>
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">₹{(stats.totalRevenue / 10000000).toFixed(2)}Cr</div>
                <p className="text-xs text-gray-500 mt-1">Consultancy income</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2022">2022</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                      <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="projects" className="space-y-6">
            <TabsList>
              <TabsTrigger value="projects">All Projects</TabsTrigger>
              <TabsTrigger value="department">Department-wise</TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="space-y-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{project.title}</CardTitle>
                          <Badge className={`${getStatusColor(project.status)} flex items-center gap-1`}>
                            {getStatusIcon(project.status)}
                            {project.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-base">
                          <Building className="w-4 h-4 inline mr-1" />
                          {project.client}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{project.value}</div>
                        <p className="text-xs text-gray-500">Project Value</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Department</p>
                        <p className="font-medium">{project.department}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Principal Investigator</p>
                        <p className="font-medium">{project.principalInvestigator}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Start Date</p>
                        <p className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(project.startDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">End Date</p>
                        <p className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(project.endDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Team Members</p>
                      <div className="flex flex-wrap gap-2">
                        {project.teamMembers.map((member, idx) => (
                          <Badge key={idx} variant="outline" className="bg-blue-50">
                            <Users className="w-3 h-3 mr-1" />
                            {member}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Progress</p>
                        <p className="text-sm font-medium">{project.progress}%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Deliverables</p>
                      <div className="flex flex-wrap gap-2">
                        {project.deliverables.map((deliverable, idx) => (
                          <Badge key={idx} variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {deliverable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="department" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(departmentStats).map(([dept, stats]) => (
                  <Card key={dept}>
                    <CardHeader>
                      <CardTitle className="text-lg">{dept}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Total Projects</span>
                          <span className="text-2xl font-bold text-blue-600">{stats.count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Total Revenue</span>
                          <span className="text-2xl font-bold text-green-600">
                            ₹{(stats.revenue / 100000).toFixed(2)}L
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}