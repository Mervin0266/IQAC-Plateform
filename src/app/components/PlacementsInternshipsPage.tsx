import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UserCheck, Briefcase, TrendingUp, Building2, Award, DollarSign, Users, BarChart3, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { BulkUploadDialog } from './BulkUploadDialog';

interface PlacementsInternshipsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function PlacementsInternshipsPage({ onNavigate, isPublicView = false }: PlacementsInternshipsPageProps) {
  const { user, logout } = useAuth();
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Search & Filter & Sort States
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchPlacements = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/placements`, {
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
        setPlacements(data.data);
      }
    } catch (error) {
      console.error('Error fetching placements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacements();
  }, [user]);

  // Overall Stats (Mock Base)
  const mockPlacementStats = {
    totalPlaced: 1245,
    placementRate: 92.5,
    averagePackage: '8.5 LPA',
    highestPackage: '45 LPA',
    companiesVisited: 186,
    totalOffers: 1456,
  };

  // Department-wise Placement Data (Mock Base)
  const mockDepartmentPlacements = [
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

  // Department-wise Internships (Mock Base)
  const mockDepartmentInternships = [
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

  const hasDbPlacements = placements && placements.length > 0;
  
  let placementStats = mockPlacementStats;
  let departmentPlacements = mockDepartmentPlacements;
  let departmentInternships = mockDepartmentInternships;

  if (hasDbPlacements) {
    const dbPlacementsOnly = placements.filter((p: any) => p.placementType === 'placement');
    const dbInternshipsOnly = placements.filter((p: any) => p.placementType === 'internship');
    
    const dbTotalPlaced = dbPlacementsOnly.length;
    const dbTotalOffers = placements.length;
    
    const dbAvgPkgVal = dbTotalPlaced > 0 
      ? dbPlacementsOnly.reduce((sum, p) => sum + parseFloat(p.package || 0), 0) / dbTotalPlaced 
      : 0;
    
    const dbHighestPkgVal = dbTotalPlaced > 0 
      ? dbPlacementsOnly.reduce((max, p) => Math.max(max, parseFloat(p.package || 0)), 0) 
      : 0;

    const formatLPA = (rupees: number) => {
      if (!rupees) return '0 LPA';
      return `${(rupees / 100000).toFixed(1).replace('\.0', '')} LPA`;
    };

    placementStats = {
      totalPlaced: dbTotalPlaced || mockPlacementStats.totalPlaced,
      placementRate: dbTotalPlaced > 0 ? Math.round((dbTotalPlaced / (dbTotalPlaced + 10)) * 1000) / 10 : mockPlacementStats.placementRate,
      averagePackage: dbTotalPlaced > 0 ? formatLPA(dbAvgPkgVal) : mockPlacementStats.averagePackage,
      highestPackage: dbTotalPlaced > 0 ? formatLPA(dbHighestPkgVal) : mockPlacementStats.highestPackage,
      companiesVisited: Array.from(new Set(placements.map(p => p.company))).length || mockPlacementStats.companiesVisited,
      totalOffers: dbTotalOffers || mockPlacementStats.totalOffers
    };

    // Group database records by normalized department name
    const deptPlacementsMap: Record<string, any[]> = {};
    const deptInternshipsMap: Record<string, any[]> = {};

    placements.forEach((p: any) => {
      const deptName = p.department;
      if (p.placementType === 'placement') {
        if (!deptPlacementsMap[deptName]) deptPlacementsMap[deptName] = [];
        deptPlacementsMap[deptName].push(p);
      } else {
        if (!deptInternshipsMap[deptName]) deptInternshipsMap[deptName] = [];
        deptInternshipsMap[deptName].push(p);
      }
    });

    // Merge database results with defaults
    departmentPlacements = mockDepartmentPlacements.map(orig => {
      const matchKey = Object.keys(deptPlacementsMap).find(k => 
        k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(orig.department.toLowerCase().replace(/[^a-z0-9]/g, '')) || 
        orig.department.toLowerCase().replace(/[^a-z0-9]/g, '').includes(k.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );
      
      if (matchKey) {
        const dbItems = deptPlacementsMap[matchKey];
        const dbPlacedCount = dbItems.length;
        const dbAvg = dbItems.reduce((sum, p) => sum + parseFloat(p.package || 0), 0) / dbPlacedCount;
        const dbMax = dbItems.reduce((max, p) => Math.max(max, parseFloat(p.package || 0)), 0);
        
        const combinedRecruiters = Array.from(new Set([...dbItems.map(p => p.company), ...orig.topRecruiters]));

        return {
          ...orig,
          placed: orig.placed + dbPlacedCount,
          totalStudents: orig.totalStudents + dbPlacedCount,
          placementRate: Math.round(((orig.placed + dbPlacedCount) / (orig.totalStudents + dbPlacedCount)) * 1000) / 10,
          averagePackage: formatLPA(dbAvg),
          highestPackage: formatLPA(dbMax),
          topRecruiters: combinedRecruiters.slice(0, 5)
        };
      }
      return orig;
    });

    departmentInternships = mockDepartmentInternships.map(orig => {
      const matchKey = Object.keys(deptInternshipsMap).find(k => 
        k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(orig.department.toLowerCase().replace(/[^a-z0-9]/g, '')) || 
        orig.department.toLowerCase().replace(/[^a-z0-9]/g, '').includes(k.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );
      
      if (matchKey) {
        const dbItems = deptInternshipsMap[matchKey];
        return {
          ...orig,
          interns: orig.interns + dbItems.length,
          topCompanies: Array.from(new Set([...dbItems.map(p => p.company), ...orig.topCompanies])).slice(0, 5)
        };
      }
      return orig;
    });
  }

  // Get all unique batches and courses from placements data to populate filters
  const uniqueBatches = Array.from(new Set(placements.map((p: any) => p.batch))).filter(Boolean).sort();
  const uniqueCourses = Array.from(new Set(placements.map((p: any) => p.course))).filter(Boolean).sort();

  // Filter placements
  const filteredPlacements = placements.filter((p: any) => {
    if (p.placementType !== 'placement') return false;

    const matchesSearch = 
      (p.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.studentId || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.course || '').toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === 'all' || p.department === deptFilter;
    const matchesCourse = courseFilter === 'all' || p.course === courseFilter;
    const matchesBatch = batchFilter === 'all' || p.batch === batchFilter;

    return matchesSearch && matchesDept && matchesCourse && matchesBatch;
  });

  // Sort placements
  const sortedPlacements = [...filteredPlacements].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'name-asc':
        return (a.studentName || '').localeCompare(b.studentName || '');
      case 'name-desc':
        return (b.studentName || '').localeCompare(a.studentName || '');
      case 'company-asc':
        return (a.company || '').localeCompare(b.company || '');
      case 'company-desc':
        return (b.company || '').localeCompare(a.company || '');
      case 'package-desc':
        return parseFloat(b.package || 0) - parseFloat(a.package || 0);
      case 'package-asc':
        return parseFloat(a.package || 0) - parseFloat(b.package || 0);
      case 'date-desc':
      default:
        return new Date(b.placementDate || b.createdAt || 0).getTime() - new Date(a.placementDate || a.createdAt || 0).getTime();
      case 'date-asc':
        return new Date(a.placementDate || a.createdAt || 0).getTime() - new Date(b.placementDate || b.createdAt || 0).getTime();
    }
  });

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = sortedPlacements.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedPlacements.length / recordsPerPage);

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
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-medium text-gray-900 mb-2">Placements & Internships</h1>
              <p className="text-gray-600">
                Track placement statistics, internship programs, and campus recruitment data
              </p>
            </div>
            {user && (user.role === 'admin' || user.role === 'coordinator') && (
              <Button
                onClick={() => setIsBulkOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2 flex items-center space-x-2 shadow-sm rounded-lg"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Upload (CSV)</span>
              </Button>
            )}
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

              {/* Placement Records Table with Filters, Sort & Pagination */}
              <Card className="border border-gray-200">
                <CardHeader className="pb-3 border-b border-gray-150 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 bg-opacity-50">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900">Placement Records</CardTitle>
                    <CardDescription className="text-[11px] text-gray-500">View, search, filter and sort student campus placements</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <input
                      type="text"
                      placeholder="Search name, register no, company..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                      className="px-3 py-1.5 text-[11px] border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-700 w-44 bg-white"
                    />

                    {/* Department Dropdown */}
                    <select
                      value={deptFilter}
                      onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                      className="px-2 py-1.5 text-[11px] border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                    >
                      <option value="all">All Departments</option>
                      <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                      <option value="Electronics and Communication Engineering">Electronics and Communication Engineering</option>
                      <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering</option>
                      <option value="Mechanical and Automobile Engineering">Mechanical and Automobile Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Artificial Intelligence and Data Science">Artificial Intelligence and Data Science</option>
                      <option value="School of Architecture">School of Architecture</option>
                      <option value="Science and Humanities (Engg.)">Science and Humanities (Engg.)</option>
                    </select>

                    {/* Course Dropdown */}
                    <select
                      value={courseFilter}
                      onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
                      className="px-2 py-1.5 text-[11px] border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                    >
                      <option value="all">All Courses</option>
                      {uniqueCourses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* Academic Year (AY) Dropdown */}
                    <select
                      value={batchFilter}
                      onChange={(e) => { setBatchFilter(e.target.value); setCurrentPage(1); }}
                      className="px-2 py-1.5 text-[11px] border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                    >
                      <option value="all">All AY</option>
                      {uniqueBatches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>

                    {/* Sort By Dropdown */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-2 py-1.5 text-[11px] border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                    >
                      <option value="date-desc">Newest First</option>
                      <option value="date-asc">Oldest First</option>
                      <option value="package-desc">Package: High to Low</option>
                      <option value="package-asc">Package: Low to High</option>
                      <option value="name-asc">Name: A to Z</option>
                      <option value="name-desc">Name: Z to A</option>
                      <option value="company-asc">Company: A to Z</option>
                      <option value="company-desc">Company: Z to A</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px] text-gray-700">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200 font-semibold text-gray-900">
                          <th className="py-2.5 px-4">Register Number</th>
                          <th className="py-2.5 px-4">Name</th>
                          <th className="py-2.5 px-4">AY (Academic Year)</th>
                          <th className="py-2.5 px-4">Department</th>
                          <th className="py-2.5 px-4">Course</th>
                          <th className="py-2.5 px-4">Company</th>
                          <th className="py-2.5 px-4">Package</th>
                          <th className="py-2.5 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {currentRecords.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-gray-500 font-medium">
                              No records found matching current filter choices
                            </td>
                          </tr>
                        ) : (
                          currentRecords.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="py-2.5 px-4 font-mono font-medium text-gray-800">{p.studentId}</td>
                              <td className="py-2.5 px-4 font-semibold text-gray-900">{p.studentName}</td>
                              <td className="py-2.5 px-4 font-mono">{p.batch}</td>
                              <td className="py-2.5 px-4 text-gray-600">{p.department}</td>
                              <td className="py-2.5 px-4">{p.course || '-'}</td>
                              <td className="py-2.5 px-4 font-medium text-gray-800">{p.company}</td>
                              <td className="py-2.5 px-4 font-semibold text-teal-700 font-mono">{p.package} LPA</td>
                              <td className="py-2.5 px-4 text-gray-500 font-mono">{p.placementDate || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-150 bg-gray-50 bg-opacity-50">
                      <div className="text-[10px] text-gray-500">
                        Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, sortedPlacements.length)} of {sortedPlacements.length} entries
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-2.5 py-1 text-[10px] h-7 bg-white"
                        >
                          Previous
                        </Button>
                        <span className="text-[10px] text-gray-700 px-2 font-medium">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-2.5 py-1 text-[10px] h-7 bg-white"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
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
      {user && (
        <BulkUploadDialog
          isOpen={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
          token={user.token || ''}
          onSuccess={fetchPlacements}
          uploadType="placements"
        />
      )}
    </div>
  );
}
