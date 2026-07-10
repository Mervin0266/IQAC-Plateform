import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { AchievementFilters } from './AchievementFilters';
import { AchievementTabs } from './AchievementTabs';
import { AchievementGrid } from './AchievementGrid';
import { AddProjectButton } from './AddProjectButton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Award, Upload } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { AchievementDialog } from './AchievementDialog';
import { EditRequestDialog } from './EditRequestDialog';
import { BulkUploadDialog } from './BulkUploadDialog';

interface AchievementsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function AchievementsPage({ onNavigate, isPublicView = false }: AchievementsPageProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('scholar');
  const [filters, setFilters] = useState({
    campus: '',
    department: 'all',
    year: 'all'
  });
  const [appliedFilters, setAppliedFilters] = useState({
    campus: '',
    department: 'all',
    year: 'all'
  });

  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [achievementToEdit, setAchievementToEdit] = useState<any>(null);
  
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [achievementForRequestEdit, setAchievementForRequestEdit] = useState<any>(null);

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Set default department filter for HODs and Coordinators
  useEffect(() => {
    if (user && (user.role === 'hod' || user.role === 'coordinator') && user.department) {
      setFilters(prev => ({
        ...prev,
        department: user.department || 'all'
      }));
      setAppliedFilters(prev => ({
        ...prev,
        department: user.department || 'all'
      }));
    }
  }, [user]);

  // Load achievements from DB
  const fetchAchievements = async (dept = 'all', yr = 'all') => {
    if (isPublicView || !user?.token) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (dept && dept !== 'all') {
        queryParams.append('department', dept);
      }
      if (yr && yr !== 'all') {
        queryParams.append('year', yr);
      }
      const queryString = queryParams.toString();
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
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
        setAchievements(data.data);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements(filters.department, filters.year);
  }, [user, isPublicView]);

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    fetchAchievements(filters.department, filters.year);
  };

  const handleSave = (savedItem: any) => {
    if (achievementToEdit) {
      setAchievements((prev) => prev.map((a) => (a.id === savedItem.id ? savedItem : a)));
    } else {
      setAchievements((prev) => [savedItem, ...prev]);
    }
  };

  const handleEditClick = (achievement: any) => {
    setAchievementToEdit(achievement);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user?.token) return;
    if (!window.confirm('Are you sure you want to delete this achievement/project?')) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements/${id}`, {
        method: 'DELETE',
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
        setAchievements((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert(data.message || 'Failed to delete achievement');
      }
    } catch (error) {
      console.error('Error deleting achievement:', error);
      alert('Server connection error');
    }
  };

  const handleAddClick = () => {
    setAchievementToEdit(null);
    setIsDialogOpen(true);
  };

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
      <Sidebar currentPage="achievements" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title & Action Buttons */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-medium text-gray-900 mb-1">ACHIEVEMENTS</h1>
              <p className="text-sm text-gray-500">View all achievements of our faculty, students & school.</p>
            </div>
            {user && (user.role === 'admin' || user.role === 'coordinator' || user.role === 'hod') && (
              <Button
                onClick={() => setIsBulkOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2 flex items-center space-x-2 shadow-sm rounded-lg"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Upload (CSV)</span>
              </Button>
            )}
          </div>

          {/* Filters */}
          <AchievementFilters 
            filters={filters} 
            setFilters={setFilters} 
            onApply={handleApplyFilters} 
          />

          {/* Category Tabs */}
          <AchievementTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Achievement Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading achievements...</p>
            </div>
          ) : (
            <AchievementGrid
              activeTab={activeTab}
              filters={appliedFilters}
              achievements={achievements}
              onEdit={handleEditClick}
              onDelete={handleDelete}
              onRequestEdit={(achievement) => {
                setAchievementForRequestEdit(achievement);
                setIsEditRequestOpen(true);
              }}
              onStatusChange={() => fetchAchievements(filters.department, filters.year)}
            />
          )}

          {/* Add Project Button */}
          <AddProjectButton onClick={handleAddClick} />

          {/* Add/Edit Dialog */}
          {user && (
            <AchievementDialog
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              onSave={handleSave}
              achievementToEdit={achievementToEdit}
              token={user.token}
            />
          )}

          {/* Edit Request Dialog */}
          {user && achievementForRequestEdit && (
            <EditRequestDialog
              isOpen={isEditRequestOpen}
              onClose={() => {
                setIsEditRequestOpen(false);
                setAchievementForRequestEdit(null);
              }}
              achievementId={achievementForRequestEdit.id}
              achievementTitle={achievementForRequestEdit.title}
              token={user.token}
              onSuccess={() => {
                alert('Your edit request has been submitted for approval!');
                fetchAchievements(filters.department, filters.year);
              }}
            />
          )}

          {/* Bulk Upload Dialog */}
          {user && (
            <BulkUploadDialog
              isOpen={isBulkOpen}
              onClose={() => setIsBulkOpen(false)}
              token={user.token}
              onSuccess={() => {
                fetchAchievements(filters.department, filters.year);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
