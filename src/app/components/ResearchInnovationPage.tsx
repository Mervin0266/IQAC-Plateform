import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BookOpen, FileText, Award, TrendingUp, Users, Calendar, Building, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';

interface ResearchInnovationPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function ResearchInnovationPage({ onNavigate, isPublicView = false }: ResearchInnovationPageProps) {
  const { user, logout } = useAuth();
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [patents, setPatents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPatents = async () => {
      if (!user?.token) return;
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/patents', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        
        if (response.status === 401) {
          logout();
          return;
        }

        const data = await response.json();
        if (data.success) {
          setPatents(data.data);
        }
      } catch (error) {
        console.error('Error fetching patents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatents();
  }, [user]);

  // Patents Mock Data (Fallback)
  const mockPatentsPublished = [
    { 
      id: 'PAT-001', 
      title: 'AI-based Medical Diagnosis System',
      inventors: ['Dr. Rajesh Kumar', 'Dr. Priya Sharma'],
      department: 'Computer Science',
      filed: '2024-01-15',
      status: 'Published',
      applicationNo: 'IN202411001234'
    },
    { 
      id: 'PAT-002', 
      title: 'Sustainable Water Purification Technology',
      inventors: ['Dr. Suresh Menon', 'Dr. Anita Rao'],
      department: 'Civil Engineering',
      filed: '2024-02-20',
      status: 'Published',
      applicationNo: 'IN202411002345'
    },
    { 
      id: 'PAT-003', 
      title: 'Smart Grid Energy Management System',
      inventors: ['Dr. Vikram Patel'],
      department: 'Electrical Engineering',
      filed: '2023-12-10',
      status: 'Published',
      applicationNo: 'IN202311003456'
    },
    { 
      id: 'PAT-004', 
      title: 'Biodegradable Polymer Composite Materials',
      inventors: ['Dr. Meera Nair', 'Dr. Karthik Iyer'],
      department: 'Mechanical Engineering',
      filed: '2024-03-05',
      status: 'Published',
      applicationNo: 'IN202411004567'
    },
  ];

  const mockPatentsGranted = [
    { 
      id: 'PAT-101', 
      title: 'Machine Learning Based Traffic Optimization',
      inventors: ['Dr. Arun Kumar', 'Dr. Deepa Singh'],
      department: 'Computer Science',
      filed: '2022-08-15',
      granted: '2024-01-20',
      patentNo: 'IN405678',
      status: 'Granted'
    },
    { 
      id: 'PAT-102', 
      title: 'Advanced Seismic Resistant Building Design',
      inventors: ['Dr. Ramesh Rao'],
      department: 'Civil Engineering',
      filed: '2022-09-25',
      granted: '2023-11-30',
      patentNo: 'IN406789',
      status: 'Granted'
    },
    { 
      id: 'PAT-103', 
      title: 'Novel Solar Panel Efficiency Enhancement',
      inventors: ['Dr. Lakshmi Prasad', 'Dr. Sunil Kumar'],
      department: 'Electrical Engineering',
      filed: '2022-07-10',
      granted: '2023-12-15',
      patentNo: 'IN407890',
      status: 'Granted'
    },
  ];

  const mockPatentsCommercialized = [
    { 
      id: 'PAT-201', 
      title: 'IoT-based Smart Home Automation',
      inventors: ['Dr. Prakash Sharma'],
      department: 'Electronics',
      patentNo: 'IN398765',
      partner: 'TechCorp Solutions Pvt. Ltd.',
      licenseDate: '2023-06-15',
      revenue: '₹15,00,000',
      status: 'Commercialized'
    },
    { 
      id: 'PAT-202', 
      title: 'Waste-to-Energy Conversion Technology',
      inventors: ['Dr. Sanjay Nair', 'Dr. Kavita Menon'],
      department: 'Mechanical Engineering',
      patentNo: 'IN399876',
      partner: 'Green Energy Innovations',
      licenseDate: '2023-08-20',
      revenue: '₹25,00,000',
      status: 'Commercialized'
    },
  ];

  const hasDbPatents = patents && patents.length > 0;

  const parsedDbPatents = hasDbPatents
    ? patents.map((p: any) => ({
        id: p.id,
        title: p.title,
        inventors: Array.isArray(p.inventors) ? p.inventors : [p.inventors],
        department: p.department || 'Computer Science and Engineering',
        filed: p.filedDate || '',
        granted: p.grantedDate || '',
        licenseDate: p.licenseDate || '',
        status: p.status === 'published' ? 'Published' : p.status === 'granted' ? 'Granted' : 'Commercialized',
        applicationNo: p.applicationNo || '',
        patentNo: p.patentNo || '',
        partner: p.partner || '',
        revenue: p.revenue ? `₹${Number(p.revenue).toLocaleString('en-IN')}` : ''
      }))
    : [];

  const useMocks = !user?.token || patents.length === 0;

  const finalPublished = useMocks ? mockPatentsPublished : parsedDbPatents.filter(p => p.status === 'Published');
  const finalGranted = useMocks ? mockPatentsGranted : parsedDbPatents.filter(p => p.status === 'Granted');
  const finalCommercialized = useMocks ? mockPatentsCommercialized : parsedDbPatents.filter(p => p.status === 'Commercialized');

  const filterPatents = (list: any[]) => {
    return list.filter(patent => {
      // 1. Year filter
      if (selectedYear !== 'all') {
        const dateStr = patent.filed || patent.granted || patent.licenseDate || '';
        if (dateStr) {
          const year = new Date(dateStr).getFullYear().toString();
          if (year !== selectedYear) return false;
        }
      }

      // 2. Department filter
      if (selectedDepartment && selectedDepartment !== 'all') {
        const normFilter = selectedDepartment.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normDept = patent.department.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normDept.includes(normFilter) && !normFilter.includes(normDept)) {
          return false;
        }
      }
      return true;
    });
  };

  const patentsPublished = filterPatents(finalPublished);
  const patentsGranted = filterPatents(finalGranted);
  const patentsCommercialized = filterPatents(finalCommercialized);

  const departments = [
    'Civil Engineering',
    'Computer Science',
    'Electrical Engineering',
    'Electronics',
    'Mechanical Engineering',
  ];

  const totalRevenueNumber = patentsCommercialized.reduce((sum, p) => {
    if (!p.revenue) return sum;
    const val = parseInt(p.revenue.replace(/[^0-9]/g, ''), 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const statsData = {
    published: patentsPublished.length,
    granted: patentsGranted.length,
    commercialized: patentsCommercialized.length,
    totalRevenue: totalRevenueNumber > 0 ? `₹${totalRevenueNumber.toLocaleString('en-IN')}` : '₹40,00,000',
  };

  // Combine all patents for public view
  const allPatents = [...patentsPublished, ...patentsGranted].slice(0, 6);

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-[#1e3a5f] text-white py-16">
          <div className="max-w-[1280px] mx-auto px-8">
            <div className="flex items-center gap-4 mb-4">
              <BookOpen className="w-12 h-12" />
              <h1 className="text-4xl font-bold">Research & Innovation</h1>
            </div>
            <p className="text-lg text-white/90">Driving knowledge creation across all disciplines.</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-[1280px] mx-auto px-8 py-12">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card className="bg-white shadow hover:shadow-md transition-shadow">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Total Publications</p>
                <p className="text-4xl font-bold text-[#1e3a5f]">312</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow hover:shadow-md transition-shadow">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Patents Filed</p>
                <p className="text-4xl font-bold text-[#1e3a5f]">48</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow hover:shadow-md transition-shadow">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Patents Granted</p>
                <p className="text-4xl font-bold text-[#1e3a5f]">12</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow hover:shadow-md transition-shadow">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">PhD Scholars</p>
                <p className="text-4xl font-bold text-[#1e3a5f]">89</p>
              </CardContent>
            </Card>
          </div>

          {/* Summary Cards */}
          <div className="space-y-6">
            {allPatents.map((patent) => {
              const isGranted = 'patentNo' in patent;
              return (
                <Card
                  key={patent.id}
                  className="bg-white shadow hover:shadow-lg transition-all hover:-translate-y-1 border-l-4 border-l-[#1e3a5f]"
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      {isGranted ? (
                        <Award className="w-6 h-6 text-[#1e3a5f] flex-shrink-0 mt-1" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-[#1e3a5f] flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{patent.title}</CardTitle>
                        <p className="text-sm text-gray-600 mb-3">
                          {patent.inventors.join(', ')} — {patent.department}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline" className="bg-[#1e3a5f] text-white border-[#1e3a5f]">
                            {patent.status}
                          </Badge>
                          <Badge variant="outline">{patent.department}</Badge>
                          <Badge variant="outline">
                            {new Date(patent.filed).getFullYear()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {isGranted
                            ? `Patent No: ${(patent as any).patentNo}`
                            : `Filed: ${new Date(patent.filed).toLocaleDateString()}`
                          }
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isPublicView && <Sidebar currentPage="research-innovation" onNavigate={onNavigate} />}
      <main className={isPublicView ? 'p-8' : 'ml-64 p-8'}>
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Research and Innovation</h1>
            <p className="text-gray-600">
              Track research projects, publications, patents, and innovation initiatives
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Published Patents</CardDescription>
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-blue-600">{statsData.published}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Filed & Published</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Granted Patents</CardDescription>
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-green-600">{statsData.granted}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Successfully Granted</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Commercialized</CardDescription>
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-purple-600">{statsData.commercialized}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Licensed & Deployed</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Revenue Generated</CardDescription>
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-orange-600">{statsData.totalRevenue}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">From Commercialization</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Academic Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {Array.from(
                        { length: new Date().getFullYear() - 2020 + 1 },
                        (_, i) => {
                          const y = (new Date().getFullYear() - i).toString();
                          return (
                            <SelectItem key={y} value={y}>
                              {y}-{parseInt(y, 10) + 1}
                            </SelectItem>
                          );
                        }
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept.toLowerCase().replace(/\s+/g, '-')}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patents Tabs */}
          <Tabs defaultValue="published" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="published" className="flex items-center gap-2 py-3">
                <FileText className="w-4 h-4" />
                <span>Published</span>
                <Badge variant="secondary">{patentsPublished.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="granted" className="flex items-center gap-2 py-3">
                <Award className="w-4 h-4" />
                <span>Granted</span>
                <Badge variant="secondary">{patentsGranted.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="commercialized" className="flex items-center gap-2 py-3">
                <TrendingUp className="w-4 h-4" />
                <span>Commercialized</span>
                <Badge variant="secondary">{patentsCommercialized.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Published Patents */}
            <TabsContent value="published" className="space-y-4">
              {patentsPublished.map((patent) => (
                <Card key={patent.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {patent.status}
                          </Badge>
                          <Badge variant="outline">{patent.applicationNo}</Badge>
                        </div>
                        <CardTitle className="text-xl mb-2">{patent.title}</CardTitle>
                        <div className="text-sm text-gray-600">
                          <div className="flex flex-wrap gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>{patent.inventors.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              <span>{patent.department}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>

            {/* Granted Patents */}
            <TabsContent value="granted" className="space-y-4">
              {patentsGranted.map((patent) => (
                <Card key={patent.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-600 text-white">
                            {patent.status}
                          </Badge>
                          <Badge variant="outline">{patent.patentNo}</Badge>
                        </div>
                        <CardTitle className="text-xl mb-2">{patent.title}</CardTitle>
                        <div className="text-sm text-gray-600">
                          <div className="flex flex-wrap gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>{patent.inventors.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              <span>{patent.department}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>

            {/* Commercialized Patents */}
            <TabsContent value="commercialized" className="space-y-4">
              {patentsCommercialized.map((patent) => (
                <Card key={patent.id} className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-purple-600 text-white">
                            {patent.status}
                          </Badge>
                          <Badge variant="outline">{patent.patentNo}</Badge>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {patent.revenue}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl mb-2">{patent.title}</CardTitle>
                        <div className="text-sm text-gray-600">
                          <div className="flex flex-wrap gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>{patent.inventors.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              <span>{patent.department}</span>
                            </div>
                          </div>
                          <div className="mt-3 p-3 bg-purple-50 rounded-md border border-purple-100">
                            <p className="text-sm font-medium text-purple-900">Licensed to: {patent.partner}</p>
                            <p className="text-xs text-purple-700 mt-1">License Date: {new Date(patent.licenseDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}