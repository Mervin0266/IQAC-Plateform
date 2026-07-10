import React from 'react';
import { Sidebar } from './Sidebar';
import { Construction, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface PlaceholderPageProps {
  title: string;
  description: string;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function PlaceholderPage({ title, description, onNavigate, currentPage }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </div>

          {/* Coming Soon Card */}
          <Card className="p-12 text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
              <Construction className="w-8 h-8 text-blue-600" />
            </div>
            
            <h2 className="text-xl font-medium text-gray-900 mb-4">Coming Soon</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              This page is currently under development. We're working hard to bring you 
              comprehensive {title.toLowerCase()} management features.
            </p>
            
            <div className="flex items-center justify-center space-x-4">
              <Button 
                onClick={() => onNavigate('dashboard')}
                variant="outline"
              >
                Back to Dashboard
              </Button>
              <Button 
                onClick={() => onNavigate('achievements')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                View Achievements
              </Button>
            </div>
          </Card>

          {/* Suggested Pages */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Explore Other Pages</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                key="dashboard"
                className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onNavigate('dashboard')}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Dashboard</h4>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <p className="text-sm text-gray-600">View system overview and key metrics</p>
              </Card>
              <Card 
                key="achievements"
                className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onNavigate('achievements')}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Achievements</h4>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <p className="text-sm text-gray-600">Browse faculty and student achievements</p>
              </Card>
              <Card 
                key="course-files"
                className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onNavigate('course-files')}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Course Files</h4>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <p className="text-sm text-gray-600">Manage course documentation and files</p>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}