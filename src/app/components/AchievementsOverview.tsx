import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';

export function AchievementsOverview() {
  const studentFacultyData = [
    { month: 'Jan', value: 45 },
    { month: 'Feb', value: 52 },
    { month: 'Mar', value: 48 },
    { month: 'Apr', value: 61 },
    { month: 'May', value: 55 },
    { month: 'Jun', value: 67 }
  ];

  const universityHighlightsData = [
    { month: 'Jan', value: 30 },
    { month: 'Feb', value: 45 },
    { month: 'Mar', value: 35 },
    { month: 'Apr', value: 50 },
    { month: 'May', value: 65 },
    { month: 'Jun', value: 85 }
  ];

  const annualReportsData = [
    { month: 'Jan', value: 8 },
    { month: 'Feb', value: 12 },
    { month: 'Mar', value: 10 },
    { month: 'Apr', value: 15 },
    { month: 'May', value: 13 },
    { month: 'Jun', value: 15 }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Achievements Overview</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student & Faculty Achievements */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Student & Faculty Achievements</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-semibold text-gray-900">120</span>
              <span className="text-sm text-gray-500">Last 12 Months +10%</span>
            </div>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentFacultyData}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis hide />
                <Bar dataKey="value" fill="#3B82F6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* University Highlights */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">University Highlights</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-semibold text-gray-900">85</span>
              <span className="text-sm text-gray-500">Last 12 Months +8%</span>
            </div>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={universityHighlightsData}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis hide />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 0, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Annual Reports */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Annual Reports</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-semibold text-gray-900">15</span>
              <span className="text-sm text-gray-500">Last 12 Months +8%</span>
            </div>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualReportsData}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis hide />
                <Bar dataKey="value" fill="#F59E0B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}