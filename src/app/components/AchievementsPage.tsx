import React, { useState, useEffect, useMemo } from 'react';
import { AchievementFilters } from './AchievementFilters';
import { AchievementTabs } from './AchievementTabs';
import { AchievementGrid } from './AchievementGrid';
import { AddProjectButton } from './AddProjectButton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Award, Upload, RefreshCw, Trash2, AlertTriangle, Layers, GraduationCap, Users } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { AchievementDialog } from './AchievementDialog';
import { EditRequestDialog } from './EditRequestDialog';
import { BulkUploadDialog } from './BulkUploadDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { AppShell, PageHeader, StatCard, StatusBadge } from './design-system';

interface AchievementsPageProps {
  onNavigate: (page: string) => void;
  currentPage?: string;
  isPublicView?: boolean;
  hideSidebar?: boolean;
}

export function AchievementsPage({ onNavigate, currentPage = 'achievements', isPublicView = false, hideSidebar = false }: AchievementsPageProps) {
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
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const handleClearAll = async () => {
    try {
      setClearLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements/clear-all?confirmAll=true&confirmation=CONFIRM_UNIVERSITY_CLEAR`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user?.token || localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setAchievements([]);
        setIsClearOpen(false);
      } else {
        alert(data.message || 'Failed to clear achievements');
      }
    } catch (err) {
      console.error('Error clearing achievements:', err);
      alert('Network error while clearing achievements');
    } finally {
      setClearLoading(false);
    }
  };

  const facultyAchievementsCount = useMemo(() => {
    return achievements.filter(a => a.category === 'faculty' || a.category === 'scholar').length;
  }, [achievements]);

  const studentAchievementsCount = useMemo(() => {
    return achievements.filter(a => a.category === 'student').length;
  }, [achievements]);

  const activeDeptsCount = useMemo(() => {
    return new Set(achievements.map(a => a.department).filter(Boolean)).size;
  }, [achievements]);

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
      <div className="min-h-screen bg-slate-50">
        {/* Hero Banner */}
        <div className="bg-[#0B132B] text-white py-12 border-b border-slate-800 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-xl border border-white/15">
                <Award className="w-8 h-8 text-[#E8C84A]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#E8C84A] uppercase tracking-wider">CHRIST (Deemed to be University)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">University Achievements & Honors</h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-1">Celebrating faculty, scholar, and student excellence across all campuses.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {publicAchievements.map((achievement, index) => (
              <Card
                key={index}
                className="bg-white border border-slate-200 border-l-4 border-l-[#2F4692] hover:shadow-md transition-all rounded-xl shadow-xs"
              >
                <CardHeader className="p-5">
                  <div className="flex items-start space-x-3 mb-2">
                    <div className="p-2 bg-blue-50 text-[#2F4692] rounded-lg flex-shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 leading-snug">{achievement.title}</CardTitle>
                  </div>
                  <p className="text-xs text-slate-600">{achievement.description}</p>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {achievement.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-medium">{tag}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{achievement.meta}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pageContent = (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Institutional Excellence' },
          { label: 'Achievements & Honors', active: true }
        ]}
        title="University Achievements & Honors"
        description="Track national & international recognitions, research honors, and student awards across departments"
        badge="HONORS"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAchievements(filters.department, filters.year)}
              className="border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium"
              title="Refresh Achievements"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            {user && (user.role === 'admin' || user.role === 'coordinator' || user.role === 'hod') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearOpen(true)}
                  className="border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-medium"
                  title="Clear All Achievements Data"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                  <span>Clear Data</span>
                </Button>

                <Button
                  onClick={() => setIsBulkOpen(true)}
                  className="bg-[#2F4692] hover:bg-[#243A7A] text-white text-xs font-medium px-3.5 shadow-xs flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bulk Upload</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* 4 Standardized StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Achievements"
          value={achievements.length}
          icon={Award}
          subtitle="Institutional recognitions"
        />
        <StatCard
          title="Faculty Honors"
          value={facultyAchievementsCount}
          icon={Award}
          badge="Faculty & Scholars"
        />
        <StatCard
          title="Student Awards"
          value={studentAchievementsCount}
          icon={GraduationCap}
          badge="Students"
        />
        <StatCard
          title="Active Departments"
          value={activeDeptsCount}
          icon={Layers}
          subtitle="Departments represented"
        />
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

          {/* Clear Achievements Confirmation Dialog */}
          <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Clear All Achievements Data
                </DialogTitle>
                <DialogDescription className="py-2 text-slate-600">
                  Are you sure you want to delete all achievement records? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsClearOpen(false)}
                  disabled={clearLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClearAll}
                  disabled={clearLoading}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  {clearLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{clearLoading ? 'Clearing...' : 'Confirm Clear Data'}</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
  );

  if (hideSidebar) {
    return <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">{pageContent}</div>;
  }

  return (
    <AppShell currentPage={currentPage} onNavigate={onNavigate}>
      {pageContent}
    </AppShell>
  );
}
