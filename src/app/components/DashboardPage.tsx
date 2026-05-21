import React from 'react';
import { Sidebar } from './Sidebar';
import { StatsCards } from './StatsCards';
import { AddProjectButton } from './AddProjectButton';
import { RoleIndicator } from './RoleIndicator';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
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
  Legend,
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
  const departmentPerformanceData = [
    { department: 'Civil Eng', score: 85 },
    { department: 'CSE', score: 92 },
    { department: 'ECE', score: 78 },
    { department: 'Mech', score: 88 },
    { department: 'EEE', score: 81 },
    { department: 'AI & DS', score: 95 }
  ];

  // Data for Achievement Distribution Pie Chart
  const achievementDistributionData = [
    { name: 'Publications', value: 35, color: '#2f4692' },
    { name: 'Awards', value: 25, color: '#3d5bb0' },
    { name: 'Patents', value: 15, color: '#5a7bd4' },
    { name: 'Grants', value: 12, color: '#7a9be8' },
    { name: 'Projects', value: 13, color: '#a0bbf5' }
  ];

  const COLORS = ['#2f4692', '#3d5bb0', '#5a7bd4', '#7a9be8', '#a0bbf5'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-700 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
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
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-gray-900">Dashboard</h1>
          </div>

          {/* Role Indicator */}
          <RoleIndicator />

          {/* Stats Cards */}
          <StatsCards />

          {/* Achievements Overview Section */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-700 mb-4">Achievements Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Student & Faculty Achievements - Area Chart */}
              <Card className="p-6 bg-gradient-to-br from-white to-blue-50">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Student & Faculty Achievements</p>
                  <p className="text-3xl font-semibold text-gray-900">196</p>
                  <p className="text-sm text-green-600 mt-1">Last 8 Months +15%</p>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={studentFacultyData}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2f4692" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2f4692" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorFaculty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5a7bd4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#5a7bd4" stopOpacity={0.1}/>
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
                  <p className="text-3xl font-semibold text-gray-900">32</p>
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

              {/* Achievement Distribution Pie */}
              <Card className="p-6 bg-gradient-to-br from-white to-amber-50">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Achievement Distribution</p>
                  <p className="text-3xl font-semibold text-gray-900">100%</p>
                  <p className="text-sm text-blue-600 mt-1">All Categories</p>
                </div>
                <div className="flex items-center justify-between">
                  <ResponsiveContainer width="60%" height={280}>
                    <PieChart>
                      <Pie
                        data={achievementDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                        strokeWidth={2}
                        stroke="#fff"
                      >
                        {achievementDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-40 space-y-2">
                    {achievementDistributionData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-gray-700 text-xs">{item.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900 text-xs">{item.value}%</span>
                      </div>
                    ))}
                  </div>
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
          <AddProjectButton />
        </div>
      </main>
    </div>
  );
}