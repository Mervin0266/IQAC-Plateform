import React from 'react';
import { Sidebar } from './Sidebar';
import { Card } from './ui/card';
import { ArrowRight, Target, TrendingUp } from 'lucide-react';
import { Progress } from './ui/progress';

interface StrategicPlanPageProps {
  onNavigate: (page: string) => void;
}

export function StrategicPlanPage({ onNavigate }: StrategicPlanPageProps) {
  const departments = [
    {
      id: 'civil-engineering',
      name: 'Civil Engineering',
      description: 'Infrastructure Development, Construction Management, Structural Design',
      progress: 82,
      goals: 14,
      achieved: 11,
      color: 'bg-blue-500'
    },
    {
      id: 'electronics-communication-engineering',
      name: 'Electronics and Communication Engineering',
      description: 'Communication Systems, Signal Processing, VLSI Design',
      progress: 78,
      goals: 16,
      achieved: 12,
      color: 'bg-green-500'
    },
    {
      id: 'electrical-electronics-engineering',
      name: 'Electrical and Electronics Engineering',
      description: 'Power Systems, Control Systems, Renewable Energy',
      progress: 85,
      goals: 15,
      achieved: 13,
      color: 'bg-purple-500'
    },
    {
      id: 'mechanical-automobile-engineering',
      name: 'Mechanical and Automobile Engineering',
      description: 'Automotive Design, Manufacturing, Thermal Engineering',
      progress: 88,
      goals: 13,
      achieved: 11,
      color: 'bg-orange-500'
    },
    {
      id: 'computer-science-engineering',
      name: 'Computer Science and Engineering',
      description: 'Software Development, Database Systems, Cloud Computing',
      progress: 90,
      goals: 18,
      achieved: 16,
      color: 'bg-indigo-500'
    },
    {
      id: 'science-humanities-engineering',
      name: 'Science and Humanities (Engg.)',
      description: 'Applied Sciences, Mathematics, Communication Skills',
      progress: 75,
      goals: 12,
      achieved: 9,
      color: 'bg-pink-500'
    },
    {
      id: 'school-architecture',
      name: 'School of Architecture',
      description: 'Architectural Design, Urban Planning, Sustainable Design',
      progress: 80,
      goals: 11,
      achieved: 9,
      color: 'bg-teal-500'
    },
    {
      id: 'ai-data-science',
      name: 'Artificial Intelligence and Data Science',
      description: 'Machine Learning, Deep Learning, Big Data Analytics',
      progress: 92,
      goals: 17,
      achieved: 15,
      color: 'bg-cyan-500'
    }
  ];

  const overallProgress = Math.round(departments.reduce((acc, dept) => acc + dept.progress, 0) / departments.length);
  const totalGoals = departments.reduce((acc, dept) => acc + dept.goals, 0);
  const totalAchieved = departments.reduce((acc, dept) => acc + dept.achieved, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="strategic-plan" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-gray-900 mb-2">Strategic Plan Tracking</h1>
          <p className="text-gray-600">Monitor and track strategic objectives across all departments</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                <p className="text-3xl font-semibold text-gray-900">{overallProgress}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Goals</p>
                <p className="text-3xl font-semibold text-gray-900">{totalGoals}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Across {departments.length} departments</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Goals Achieved</p>
                <p className="text-3xl font-semibold text-gray-900">{totalAchieved}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">{Math.round((totalAchieved / totalGoals) * 100)}% completion rate</p>
          </Card>
        </div>

        {/* Department Cards */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Departments</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {departments.map((dept) => (
              <Card
                key={dept.id}
                className="p-6 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => onNavigate(`strategic-plan-${dept.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${dept.color}`}></div>
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {dept.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{dept.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">{dept.progress}%</span>
                  </div>
                  <Progress value={dept.progress} className="h-2" />
                  
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-xs text-gray-500">Goals Achieved</p>
                      <p className="text-sm font-medium text-gray-900">
                        {dept.achieved} / {dept.goals}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Pending</p>
                      <p className="text-sm font-medium text-orange-600">
                        {dept.goals - dept.achieved}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}