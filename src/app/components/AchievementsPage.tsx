import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { PublicNavBar } from './PublicNavBar';
import { AchievementFilters } from './AchievementFilters';
import { AchievementTabs } from './AchievementTabs';
import { AchievementGrid } from './AchievementGrid';
import { AddProjectButton } from './AddProjectButton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Award } from 'lucide-react';
import { Badge } from './ui/badge';

interface AchievementsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function AchievementsPage({ onNavigate, isPublicView = false }: AchievementsPageProps) {
  const [activeTab, setActiveTab] = useState('scholar');
  const [filters, setFilters] = useState({
    campus: '',
    department: '',
    year: ''
  });

  // Mock achievements data for public view
  const publicAchievements = [
    {
      title: 'Dr. Evelyn Reed Awarded Research Grant',
      description: 'Prestigious national grant for AI research',
      tags: ['Research', 'AI', '2024'],
      meta: 'Computer Science Department'
    },
    {
      title: 'National Robotics Competition Win',
      description: 'Student team secures first place nationwide',
      tags: ['Competition', 'Robotics', '2024'],
      meta: 'March 15, 2024'
    },
    {
      title: 'Lifetime Achievement Award',
      description: 'Professor Green honored for career contributions',
      tags: ['Faculty', 'Achievement', '2024'],
      meta: 'Engineering Department'
    },
    {
      title: 'Young Entrepreneur of the Year',
      description: 'Sophia Reid recognized for startup success',
      tags: ['Entrepreneurship', 'Award', '2024'],
      meta: 'Business School'
    },
    {
      title: 'Campus Sustainability Award',
      description: 'National recognition for green initiatives',
      tags: ['Sustainability', 'National', '2024'],
      meta: 'Environmental Sciences'
    },
    {
      title: 'Top Journal Publication',
      description: 'Student research published in leading academic journal',
      tags: ['Publication', 'Research', '2024'],
      meta: 'February 20, 2024'
    },
    {
      title: 'National Academy Election',
      description: 'Dr. Aswita elected to prestigious academy',
      tags: ['Faculty', 'National', '2024'],
      meta: 'Science Department'
    },
    {
      title: 'International Debate Championship',
      description: 'University team wins global competition',
      tags: ['Championship', 'International', '2024'],
      meta: 'January 10, 2024'
    },
    {
      title: 'International Science Award',
      description: 'Dr. Oliver Stone honored globally',
      tags: ['Award', 'Science', '2024'],
      meta: 'Physics Department'
    },
    {
      title: 'Water Innovation Competition',
      description: 'Engineering students win international design award',
      tags: ['Innovation', 'International', '2024'],
      meta: 'Civil Engineering'
    },
    {
      title: 'Literature Contribution Award',
      description: 'Professor Newton recognized for literary work',
      tags: ['Literature', 'Award', '2024'],
      meta: 'Arts & Humanities'
    },
    {
      title: 'International Conference Presentation',
      description: 'Sociology research presented at global forum',
      tags: ['Conference', 'International', '2024'],
      meta: 'Sociology Department'
    }
  ];

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-[#0f1746] text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-4">
              <Award className="w-12 h-12 text-[#e8c84a]" />
              <div>
                <h1 className="text-4xl font-bold">Achievements</h1>
                <p className="text-blue-200 mt-2">Celebrating faculty, student and institutional excellence.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {publicAchievements.map((achievement, index) => (
              <Card
                key={index}
                className="border-l-4 border-l-[#0f1746] hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
              >
                <CardHeader>
                  <div className="flex items-start space-x-2 mb-2">
                    <Award className="w-5 h-5 text-[#0f1746] flex-shrink-0 mt-0.5" />
                    <CardTitle className="text-lg leading-tight">{achievement.title}</CardTitle>
                  </div>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {achievement.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">{achievement.meta}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isPublicView && <Sidebar currentPage="achievements" onNavigate={onNavigate} />}
      <main className={isPublicView ? 'p-8' : 'ml-64 p-8'}>
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">ACHIEVEMENTS</h1>
            <p className="text-gray-600">View all achievements of our faculty, students & school.</p>
          </div>

          {/* Filters */}
          <AchievementFilters filters={filters} setFilters={setFilters} />

          {/* Category Tabs */}
          <AchievementTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Achievement Grid */}
          <AchievementGrid activeTab={activeTab} filters={filters} />

          {/* Add Project Button */}
          {!isPublicView && <AddProjectButton />}
        </div>
      </main>
    </div>
  );
}
