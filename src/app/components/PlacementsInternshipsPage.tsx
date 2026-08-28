import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UserCheck, Briefcase, TrendingUp, Building2, Award, DollarSign, Users, BarChart3, Upload, Filter, RotateCcw, Search } from 'lucide-react';
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

  const formatLPA = (val: number) => {
    if (!val) return '0 LPA';
    const lpa = val > 1000 ? val / 100000 : val;
    return `${lpa.toFixed(1).replace('\.0', '')} LPA`;
  };

  const formatStipend = (val: number) => {
    if (!val) return '0';
    return Math.round(val).toLocaleString('en-IN');
  };

  // Unique filter values
  const uniqueBatches = Array.from(new Set(placements.map((p: any) => p.batch))).filter(Boolean).sort();
  const uniqueCourses = Array.from(new Set(placements.map((p: any) => p.course))).filter(Boolean).sort();
  const uniqueDepartments = Array.from(new Set(placements.map((p: any) => p.department))).filter(Boolean).sort();

  // Dynamic Filtered Placements
  const filteredPlacements = placements.filter((p: any) => {
    if (p.placementType !== 'placement') return false;

    const matchesSearch = !search ||
      (p.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.studentId || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.course || '').toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === 'all' || p.department === deptFilter;
    const matchesCourse = courseFilter === 'all' || p.course === courseFilter;
    const matchesBatch = batchFilter === 'all' || p.batch === batchFilter;

    return matchesSearch && matchesDept && matchesCourse && matchesBatch;
  });

  // Dynamic Filtered Internships
  const filteredInternships = placements.filter((p: any) => {
    if (p.placementType !== 'internship') return false;

    const matchesSearch = !search ||
      (p.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.studentId || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.course || '').toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === 'all' || p.department === deptFilter;
    const matchesCourse = courseFilter === 'all' || p.course === courseFilter;
    const matchesBatch = batchFilter === 'all' || p.batch === batchFilter;

    return matchesSearch && matchesDept && matchesCourse && matchesBatch;
  });

  // Dynamic Placement Stats derived from filteredPlacements
  const totalPlaced = filteredPlacements.length;
  const totalOffers = filteredPlacements.length;

  const validPlacements = filteredPlacements.filter((p: any) => parseFloat(p.package || 0) > 0);

  const avgPkgVal = validPlacements.length > 0
    ? validPlacements.reduce((sum, p) => sum + parseFloat(p.package || 0), 0) / validPlacements.length
    : 0;

  const highestPkgVal = validPlacements.length > 0
    ? validPlacements.reduce((max, p) => Math.max(max, parseFloat(p.package || 0)), 0)
    : 0;

  const lowestPkgVal = validPlacements.length > 0
    ? validPlacements.reduce((min, p) => Math.min(min, parseFloat(p.package || 0)), Infinity)
    : 0;

  const placementStats = {
    totalPlaced,
    placementRate: totalPlaced > 0 ? 100 : 0,
    averagePackage: formatLPA(avgPkgVal),
    highestPackage: formatLPA(highestPkgVal),
    lowestPackage: formatLPA(lowestPkgVal === Infinity ? 0 : lowestPkgVal),
    companiesVisited: Array.from(new Set(filteredPlacements.map(p => p.company))).filter(Boolean).length,
    totalOffers
  };

  // Dynamic Internship Stats derived from filteredInternships
  const validStipends = filteredInternships.filter((p: any) => parseFloat(p.package || p.stipend || 0) > 0);
  const avgStipendVal = validStipends.length > 0
    ? validStipends.reduce((sum, p) => sum + parseFloat(p.package || p.stipend || 0), 0) / validStipends.length
    : 0;
  const maxStipendVal = validStipends.length > 0
    ? validStipends.reduce((max, p) => Math.max(max, parseFloat(p.package || p.stipend || 0)), 0)
    : 0;

  const internshipStats = {
    totalInterns: filteredInternships.length,
    averageStipend: formatStipend(avgStipendVal),
    highestStipend: formatStipend(maxStipendVal),
    companiesVisited: Array.from(new Set(filteredInternships.map(p => p.company))).filter(Boolean).length,
  };

  // Dynamic Department-wise Placements derived from filteredPlacements
  const deptPlacementsMap: Record<string, any[]> = {};
  filteredPlacements.forEach((p: any) => {
    const deptName = p.department || 'Other';
    if (!deptPlacementsMap[deptName]) deptPlacementsMap[deptName] = [];
    deptPlacementsMap[deptName].push(p);
  });

  const departmentPlacements = Object.keys(deptPlacementsMap).map(dept => {
    const dbItems = deptPlacementsMap[dept];
    const dbPlacedCount = dbItems.length;
    const validDeptPackages = dbItems.map(p => parseFloat(p.package || 0)).filter(pkg => pkg > 0);
    const dbAvg = validDeptPackages.length > 0 ? validDeptPackages.reduce((sum, val) => sum + val, 0) / validDeptPackages.length : 0;
    const dbMax = validDeptPackages.length > 0 ? Math.max(...validDeptPackages) : 0;
    const dbMin = validDeptPackages.length > 0 ? Math.min(...validDeptPackages) : 0;

    return {
      department: dept,
      totalStudents: dbPlacedCount,
      placed: dbPlacedCount,
      placementRate: 100,
      averagePackage: formatLPA(dbAvg),
      highestPackage: formatLPA(dbMax),
      lowestPackage: formatLPA(dbMin),
      topRecruiters: Array.from(new Set(dbItems.map(p => p.company))).filter(Boolean).slice(0, 5)
    };
  });

  // Dynamic Department-wise Internships derived from filteredInternships
  const deptInternshipsMap: Record<string, any[]> = {};
  filteredInternships.forEach((p: any) => {
    const deptName = p.department || 'Other';
    if (!deptInternshipsMap[deptName]) deptInternshipsMap[deptName] = [];
    deptInternshipsMap[deptName].push(p);
  });

  const departmentInternships = Object.keys(deptInternshipsMap).map(dept => {
    const dbItems = deptInternshipsMap[dept];
    const stipends = dbItems.map(p => parseFloat(p.package || p.stipend || 0)).filter(s => s > 0);
    const avgStipendVal = stipends.length > 0 ? stipends.reduce((sum, s) => sum + s, 0) / stipends.length : 0;

    return {
      department: dept,
      interns: dbItems.length,
      averageStipend: formatStipend(avgStipendVal),
      topCompanies: Array.from(new Set(dbItems.map(p => p.company))).filter(Boolean).slice(0, 5)
    };
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
                <span>Bulk Upload (CSV/Excel)</span>
              </Button>
            )}
          </div>

          {/* Global Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center space-x-2 text-gray-800 font-bold text-xs uppercase tracking-wider">
                <Filter className="w-4 h-4 text-teal-700" />
                <span>Filter Options</span>
                {(search !== '' || deptFilter !== 'all' || courseFilter !== 'all' || batchFilter !== 'all') && (
                  <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-extrabold rounded-full">
                    Active Filters
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setDeptFilter('all');
                    setCourseFilter('all');
                    setBatchFilter('all');
                    setCurrentPage(1);
                  }}
                  className="h-7 text-xs text-gray-600 hover:text-gray-900 border-gray-300"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset Filters
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search student, register no, company..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-700 bg-white"
                  />
                </div>
              </div>

              {/* Department Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Department</label>
                <select
                  value={deptFilter}
                  onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-700 font-medium"
                >
                  <option value="all">All Departments</option>
                  {uniqueDepartments.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Course Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Course</label>
                <select
                  value={courseFilter}
                  onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-700 font-medium"
                >
                  <option value="all">All Courses</option>
                  {uniqueCourses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Academic Year (AY) Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Academic Year (AY)</label>
                <select
                  value={batchFilter}
                  onChange={(e) => { setBatchFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-700 font-medium"
                >
                  <option value="all">All Academic Years</option>
                  {uniqueBatches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Tabs defaultValue="placements" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="placements" className="flex items-center gap-2 py-3">
                <UserCheck className="w-4 h-4" />
                <span>Placements ({filteredPlacements.length})</span>
              </TabsTrigger>
              <TabsTrigger value="internships" className="flex items-center gap-2 py-3">
                <Briefcase className="w-4 h-4" />
                <span>Internships ({filteredInternships.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Placements Tab */}
            <TabsContent value="placements" className="space-y-6">
              {/* Overall Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">Total Placed</CardDescription>
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-green-600">{placementStats.totalPlaced}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-[10px] text-gray-500">
                    Placement Rate: {placementStats.placementRate}%
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">Average Package</CardDescription>
                      <DollarSign className="w-4 h-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-blue-600">{placementStats.averagePackage}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-[10px] text-gray-500">
                    Across all departments
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-teal-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">Highest Package</CardDescription>
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-teal-600">{placementStats.highestPackage}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-[10px] text-gray-500">
                    Maximum offer secured
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">Lowest Package</CardDescription>
                      <Award className="w-4 h-4 text-orange-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-orange-600">{placementStats.lowestPackage}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-[10px] text-gray-500">
                    Minimum offer secured
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">Companies Visited</CardDescription>
                      <Building2 className="w-4 h-4 text-purple-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-purple-600">{placementStats.companiesVisited}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-[10px] text-gray-500">
                    Total Offers: {placementStats.totalOffers}
                  </CardContent>
                </Card>
              </div>

              {/* Department-wise Placement Performance Analytics */}
              <Card className="border border-gray-200">
                <CardHeader className="bg-gray-50 bg-opacity-50 border-b border-gray-150">
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-700" />
                    <span>Departmental Placement Performance</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Detailed analysis of package distributions (Highest, Lowest, Average) and placement rates across departments
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {departmentPlacements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs font-medium">
                      No placement records available to generate departmental analytics.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {departmentPlacements.map((dept, index) => (
                        <Card key={index} className="border border-gray-100 hover:shadow-sm transition-shadow">
                          <CardHeader className="pb-2 bg-gray-50 bg-opacity-30">
                            <CardTitle className="text-sm font-semibold text-gray-800">{dept.department}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-blue-50 bg-opacity-50 p-2 rounded-lg">
                                <p className="text-[10px] text-gray-500">Avg Package</p>
                                <p className="text-sm font-bold text-blue-700">{dept.averagePackage}</p>
                              </div>
                              <div className="bg-green-50 bg-opacity-50 p-2 rounded-lg">
                                <p className="text-[10px] text-gray-500">Highest</p>
                                <p className="text-sm font-bold text-green-700">{dept.highestPackage}</p>
                              </div>
                              <div className="bg-orange-50 bg-opacity-50 p-2 rounded-lg">
                                <p className="text-[10px] text-gray-500">Lowest</p>
                                <p className="text-sm font-bold text-orange-700">{dept.lowestPackage}</p>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-600 border-t border-b border-gray-100 py-2">
                              <div>
                                <span className="font-semibold text-gray-800">{dept.placed}</span> Placed
                              </div>
                              <div className="text-teal-700 font-semibold">
                                Rate: {dept.placementRate}%
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] text-gray-500 mb-1.5 font-medium">Top Employers:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {dept.topRecruiters.map((company, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[9px] px-2 py-0.5">{company}</Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

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
                      {uniqueDepartments.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
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
                    <CardTitle className="text-3xl font-bold text-orange-600">{internshipStats.totalInterns}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardDescription className="text-xs">Avg Stipend</CardDescription>
                    <CardTitle className="text-2xl font-bold text-orange-600">₹{internshipStats.averageStipend}/mo</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardDescription className="text-xs">Highest Stipend</CardDescription>
                    <CardTitle className="text-2xl font-bold text-orange-600">₹{internshipStats.highestStipend}/mo</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardDescription className="text-xs">Companies Visited</CardDescription>
                    <CardTitle className="text-3xl font-bold text-orange-600">{internshipStats.companiesVisited}</CardTitle>
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
