import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { StatsCards } from './StatsCards';
import { AddProjectButton } from './AddProjectButton';
import { RoleIndicator } from './RoleIndicator';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { useAuth } from '../contexts/AuthContext';
import { AchievementDialog } from './AchievementDialog';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, logout } = useAuth();
  
  // Dashboard Live Stats State
  const [liveStats, setLiveStats] = useState({
    totalAchievements: 120,
    facultyAchievements: 85,
    annualReports: 15
  });
  const [placementView, setPlacementView] = useState<'departmentwise' | 'overall'>('departmentwise');
  const [placementDeptData, setPlacementDeptData] = useState<any[]>([
    { department: 'CSE', placed: 172, total: 180, rate: 95.6, avgPackage: 12.5 },
    { department: 'ECE', placed: 142, total: 150, rate: 94.7, avgPackage: 9.8 },
    { department: 'EEE', placed: 110, total: 120, rate: 91.7, avgPackage: 8.5 },
    { department: 'Mech', placed: 125, total: 140, rate: 89.3, avgPackage: 7.8 },
    { department: 'Civil Eng', placed: 98, total: 110, rate: 89.1, avgPackage: 6.5 },
    { department: 'AI & DS', placed: 87, total: 90, rate: 96.7, avgPackage: 13.2 }
  ]);
  const [placementOverallData, setPlacementOverallData] = useState<any[]>([
    { batch: '2020-21', placed: 980, offers: 1120, avgPackage: 6.8 },
    { batch: '2021-22', placed: 1050, offers: 1210, avgPackage: 7.4 },
    { batch: '2022-23', placed: 1140, offers: 1320, avgPackage: 7.9 },
    { batch: '2023-24', placed: 1210, offers: 1410, avgPackage: 8.2 },
    { batch: '2024-25', placed: 1245, offers: 1456, avgPackage: 8.5 }
  ]);
  const [deptPerformance, setDeptPerformance] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      // 1. Fetch achievements
      const resAchievements = await fetch('http://localhost:5000/api/achievements', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (resAchievements.status === 401) {
        logout();
        return;
      }
      const achievementsData = await resAchievements.json();

      // 2. Fetch documents (annual reports)
      const resDocs = await fetch('http://localhost:5000/api/documents', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (resDocs.status === 401) {
        logout();
        return;
      }
      const docsData = await resDocs.json();

      // 3. Fetch strategic plans
      const resPlans = await fetch('http://localhost:5000/api/strategic-plans', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (resPlans.status === 401) {
        logout();
        return;
      }
      const plansData = await resPlans.json();

      let liveAchievements = [];
      let liveDocs = [];
      let livePlans = [];

      if (achievementsData.success) liveAchievements = achievementsData.data;
      if (docsData.success) liveDocs = docsData.data;
      if (plansData.success) livePlans = plansData.data;

      // Calculate dynamic counts
      const total = liveAchievements.length || 120;
      
      const facultyCount = liveAchievements.filter((a: any) => 
        a.category === 'research' || a.category === 'awards'
      ).length || 85;

      const reportsCount = liveDocs.length || 15;

      setLiveStats({
        totalAchievements: total,
        facultyAchievements: facultyCount,
        annualReports: reportsCount
      });

      // 4. Fetch placements
      try {
        const resPlacements = await fetch('http://localhost:5000/api/placements', {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (resPlacements.ok) {
          const placementsData = await resPlacements.json();
          if (placementsData.success && placementsData.data && placementsData.data.length > 0) {
            const dbItems = placementsData.data;
            const deptMap: Record<string, { placed: number, total: number, sumPkg: number }> = {};
            dbItems.forEach((p: any) => {
              const d = p.department || 'Other';
              if (!deptMap[d]) deptMap[d] = { placed: 0, total: 0, sumPkg: 0 };
              deptMap[d].total += 1;
              if (p.placementType === 'placement') {
                deptMap[d].placed += 1;
                deptMap[d].sumPkg += parseFloat(p.package || 0);
              }
            });

            const shortNames: Record<string, string> = {
              'Computer Science and Engineering': 'CSE',
              'Civil Engineering': 'Civil Eng',
              'Electrical Engineering': 'EEE',
              'Electronics and Communication Engineering': 'ECE',
              'Mechanical Engineering': 'Mech',
              'Artificial Intelligence and Data Science': 'AI & DS'
            };

            const liveDeptList = Object.entries(deptMap).map(([dept, val]) => ({
              department: shortNames[dept] || dept.substring(0, 10),
              placed: val.placed,
              total: Math.max(val.total, val.placed),
              rate: Math.round((val.placed / Math.max(val.total, 1)) * 100),
              avgPackage: val.placed > 0 ? parseFloat((val.sumPkg / val.placed).toFixed(1)) : 0
            }));

            if (liveDeptList.length > 0) {
              setPlacementDeptData(liveDeptList);
            }
          }
        }
      } catch (pErr) {
        console.error('Error fetching placements:', pErr);
      }

      // Compute Radar Chart data
      if (livePlans.length > 0) {
        const deptProgress: Record<string, { sum: number, count: number }> = {};
        livePlans.forEach((plan: any) => {
          const dept = plan.department || 'Other';
          if (!deptProgress[dept]) {
            deptProgress[dept] = { sum: 0, count: 0 };
          }
          deptProgress[dept].sum += plan.progress || 0;
          deptProgress[dept].count += 1;
        });

        const shortNames: Record<string, string> = {
          'Computer Science and Engineering': 'CSE',
          'Civil Engineering': 'Civil Eng',
          'Electrical Engineering': 'EEE',
          'Electronics and Communication Engineering': 'ECE',
          'Mechanical Engineering': 'Mech',
          'Electronics': 'ECE',
          'Other': 'Other'
        };

        const radarData = Object.entries(deptProgress).map(([dept, data]) => {
          const avg = Math.round(data.sum / data.count);
          return {
            department: shortNames[dept] || dept.substring(0, 10),
            score: avg
          };
        });

        const standardDepts = [
          { department: 'Civil Eng', score: 85 },
          { department: 'CSE', score: 92 },
          { department: 'ECE', score: 78 },
          { department: 'Mech', score: 88 },
          { department: 'EEE', score: 81 },
          { department: 'AI & DS', score: 95 }
        ];

        const mergedDepts = [...radarData];
        standardDepts.forEach(std => {
          if (!mergedDepts.some(d => d.department === std.department)) {
            mergedDepts.push(std);
          }
        });

        setDeptPerformance(mergedDepts.slice(0, 6));
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleSaveAchievement = () => {
    // Re-fetch dashboard calculations
    fetchDashboardData();
  };

  // Data for Student & Faculty Achievements area chart
  const studentFacultyData = [
    { month: 'Jan', students: 12, faculty: 6 },
    { month: 'Feb', students: 15, faculty: 7 },
    { month: 'Mar', students: 11, faculty: 8 },
    { month: 'Apr', students: 17, faculty: 7 },
    { month: 'May', students: 13, faculty: 8 },
    { month: 'Jun', students: 18, faculty: 8 },
    { month: 'Jul', students: 16, faculty: 9 },
    { month: 'Aug', students: 20, faculty: 10 }
  ];

  // Data for University Highlights multi-line chart
  const universityHighlightsData = [
    { month: 'Jan', publications: 12, events: 8, awards: 5 },
    { month: 'Feb', publications: 15, events: 10, awards: 7 },
    { month: 'Mar', publications: 11, events: 9, awards: 4 },
    { month: 'Apr', publications: 14, events: 12, awards: 8 },
    { month: 'May', publications: 9, events: 7, awards: 6 },
    { month: 'Jun', publications: 17, events: 14, awards: 9 },
    { month: 'Jul', publications: 19, events: 11, awards: 7 },
    { month: 'Aug', publications: 22, events: 15, awards: 10 }
  ];

  // Data for Annual Reports stacked bar chart
  const annualReportsData = [
    { month: 'Jan', completed: 2, pending: 1 },
    { month: 'Feb', completed: 2, pending: 1 },
    { month: 'Mar', completed: 3, pending: 2 },
    { month: 'Apr', completed: 2, pending: 1 },
    { month: 'May', completed: 3, pending: 1 },
    { month: 'Jun', completed: 3, pending: 2 },
    { month: 'Jul', completed: 4, pending: 1 },
    { month: 'Aug', completed: 3, pending: 2 }
  ];

  // Data for Department Performance Radar Chart
  const departmentPerformanceData = deptPerformance.length > 0
    ? deptPerformance
    : [
        { department: 'Civil Eng', score: 85 },
        { department: 'CSE', score: 92 },
        { department: 'ECE', score: 78 },
        { department: 'Mech', score: 88 },
        { department: 'EEE', score: 81 },
        { department: 'AI & DS', score: 95 }
      ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-700 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color || entry.stroke || entry.fill }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PlacementTooltip = ({ active, payload, label, view }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-medium my-0.5" style={{ color: entry.color || entry.stroke || entry.fill }}>
              {entry.name}: <span className="font-semibold">{entry.value}</span>
            </p>
          ))}
          {view === 'departmentwise' && payload[0]?.payload?.avgPackage && (
            <p className="text-xs text-gray-500 mt-1 border-t pt-1">
              Avg Package: <span className="font-medium text-gray-700">{payload[0].payload.avgPackage} LPA</span>
            </p>
          )}
          {view === 'overall' && payload[0]?.payload?.avgPackage && (
            <p className="text-xs text-gray-500 mt-1 border-t pt-1">
              Avg Package: <span className="font-medium text-gray-700">{payload[0].payload.avgPackage} LPA</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="dashboard" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-medium text-gray-900">Dashboard</h1>
            {loading && <span className="text-xs text-gray-500">Syncing with database...</span>}
          </div>

          {/* Role Indicator */}
          <RoleIndicator />

          {/* Stats Cards */}
          <StatsCards 
            totalAchievements={liveStats.totalAchievements}
            facultyAchievements={liveStats.facultyAchievements}
            annualReports={liveStats.annualReports}
          />

          {/* Achievements Overview Section */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-700 mb-4">Achievements Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Student & Faculty Achievements - Area Chart */}
              <Card className="p-6 bg-gradient-to-br from-white to-blue-50">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Student & Faculty Achievements</p>
                  <p className="text-3xl font-semibold text-gray-900">{liveStats.totalAchievements}</p>
                  <p className="text-sm text-green-600 mt-1">Last 8 Months +15%</p>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={studentFacultyData}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2f4692" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#2f4692" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorFaculty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5a7bd4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#5a7bd4" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="students"
                      stroke="#2f4692"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorStudents)"
                      name="Students"
                    />
                    <Area
                      type="monotone"
                      dataKey="faculty"
                      stroke="#5a7bd4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorFaculty)"
                      name="Faculty"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* University Highlights - Multi-line Chart */}
              <Card className="p-6 bg-gradient-to-br from-white to-purple-50">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">University Highlights</p>
                  <p className="text-3xl font-semibold text-gray-900">238</p>
                  <p className="text-sm text-green-600 mt-1">Last 8 Months +12%</p>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={universityHighlightsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="publications"
                      stroke="#2f4692"
                      strokeWidth={2.5}
                      dot={{ fill: '#2f4692', r: 3 }}
                      name="Publications"
                    />
                    <Line
                      type="monotone"
                      dataKey="events"
                      stroke="#5a7bd4"
                      strokeWidth={2.5}
                      dot={{ fill: '#5a7bd4', r: 3 }}
                      name="Events"
                    />
                    <Line
                      type="monotone"
                      dataKey="awards"
                      stroke="#a0bbf5"
                      strokeWidth={2.5}
                      dot={{ fill: '#a0bbf5', r: 3 }}
                      name="Awards"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Annual Reports - Stacked Bar Chart */}
              <Card className="p-6 bg-gradient-to-br from-white to-green-50">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Annual Reports</p>
                  <p className="text-3xl font-semibold text-gray-900">{liveStats.annualReports}</p>
                  <p className="text-sm text-green-600 mt-1">Last 8 Months +8%</p>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={annualReportsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="completed" stackId="a" fill="#2f4692" radius={[0, 0, 4, 4]} name="Completed" />
                    <Bar dataKey="pending" stackId="a" fill="#a0bbf5" radius={[4, 4, 0, 0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Additional Complex Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Performance Radar */}
              <Card className="p-6 bg-gradient-to-br from-white to-indigo-50">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Department Performance Score</p>
                  <p className="text-3xl font-semibold text-gray-900">86.5</p>
                  <p className="text-sm text-green-600 mt-1">Average Performance</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={departmentPerformanceData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="department" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Performance"
                      dataKey="score"
                      stroke="#2f4692"
                      fill="#2f4692"
                      fillOpacity={0.6}
                      strokeWidth={2}
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              {/* Placement Analytics Graph */}
              <Card className="p-6 bg-gradient-to-br from-white to-amber-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Placement Statistics</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {placementView === 'departmentwise' ? 'Departmentwise View' : '1,245 Total Placed'}
                    </p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">
                      {placementView === 'departmentwise' ? '93.5% Overall Placement Rate' : '+8.2% Growth vs Last Batch'}
                    </p>
                  </div>

                  {/* Options Toggle for Viewing Departmentwise and Overall */}
                  <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setPlacementView('departmentwise')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        placementView === 'departmentwise'
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                    >
                      Departmentwise
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlacementView('overall')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        placementView === 'overall'
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                    >
                      Overall
                    </button>
                  </div>
                </div>

                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {placementView === 'departmentwise' ? (
                      <BarChart data={placementDeptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#4B5563' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} />
                        <Tooltip content={<PlacementTooltip view="departmentwise" />} />
                        <Bar dataKey="placed" name="Placed Students" fill="#2f4692" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total" name="Total Students" fill="#a0bbf5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : (
                      <AreaChart data={placementOverallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPlacedBatch" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2f4692" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#2f4692" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="colorOffersBatch" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5a7bd4" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#5a7bd4" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="batch" tick={{ fontSize: 11, fill: '#4B5563' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} />
                        <Tooltip content={<PlacementTooltip view="overall" />} />
                        <Area type="monotone" dataKey="placed" name="Placed Students" stroke="#2f4692" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPlacedBatch)" />
                        <Area type="monotone" dataKey="offers" name="Total Offers" stroke="#5a7bd4" strokeWidth={2} fillOpacity={1} fill="url(#colorOffersBatch)" />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* Legend summary below chart */}
                <div className="flex items-center justify-center space-x-6 mt-3 pt-3 border-t border-gray-100 text-xs">
                  {placementView === 'departmentwise' ? (
                    <>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded bg-[#2f4692] mr-2" />
                        <span className="text-gray-600">Placed Students</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded bg-[#a0bbf5] mr-2" />
                        <span className="text-gray-600">Total Students</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded bg-[#2f4692] mr-2" />
                        <span className="text-gray-600">Placed Students</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded bg-[#5a7bd4] mr-2" />
                        <span className="text-gray-600">Total Offers</span>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* PhD Thesis Status */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-700 mb-4">PhD Thesis Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Thesis Submissions</p>
                  <p className="text-lg font-semibold text-gray-900">75%</p>
                </div>
                <Progress value={75} className="h-2" />
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Thesis Defenses</p>
                  <p className="text-lg font-semibold text-gray-900">50%</p>
                </div>
                <Progress value={50} className="h-2" />
              </Card>
            </div>
          </div>

          {/* NAAC Accreditation */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-700 mb-4">NAAC Accreditation</h2>
            <Card className="p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">NAAC Accreditation</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-4xl font-semibold text-gray-900">A+</p>
                  <p className="text-sm text-green-600">Current +1 Grade</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">A+</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">A</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">B</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full" style={{ width: '55%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">C</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Add Project Button */}
          <AddProjectButton onClick={() => setIsDialogOpen(true)} />

          {/* Add Project Dialog */}
          {user && (
            <AchievementDialog
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              onSave={handleSaveAchievement}
              token={user.token}
            />
          )}
        </div>
      </main>
    </div>
  );
}