import React from 'react';
import { Trophy, Users, FileText } from 'lucide-react';

export function StatsCards() {
  const stats = [
    {
      title: 'Total Achievements',
      value: '120',
      change: '+10%',
      icon: Trophy,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'Faculty Achievements',
      value: '85',
      change: '+8%',
      icon: Users,
      color: 'bg-green-50 text-green-600'
    },
    {
      title: 'Annual Reports',
      value: '15',
      change: '+8%',
      icon: FileText,
      color: 'bg-orange-50 text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
                  <span className="text-sm font-medium text-green-600">{stat.change}</span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}