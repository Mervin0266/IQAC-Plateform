/**
 * AchievementTrendsChart — Student & Faculty achievements area chart.
 *
 * Extracted from DashboardPage to keep the main page slim.
 */

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/card';
import { CustomTooltip } from './CustomTooltip';
import type { StudentFacultyDataPoint } from '../../types/dashboard';

interface AchievementTrendsChartProps {
  data: StudentFacultyDataPoint[];
}

export function AchievementTrendsChart({ data }: AchievementTrendsChartProps) {
  return (
    <Card className="p-6 bg-white shadow-sm border animate-in fade-in duration-500">
      <p className="text-sm font-medium text-gray-600 mb-4">Student & Faculty Achievements</p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2f4692" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2f4692" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorFaculty" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4B5563' }} />
            <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="students"
              name="Students"
              stroke="#2f4692"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorStudents)"
            />
            <Area
              type="monotone"
              dataKey="faculty"
              name="Faculty"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFaculty)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
