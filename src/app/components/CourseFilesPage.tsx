import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { FilterBar } from './FilterBar';
import { DocumentTabs } from './DocumentTabs';
import { DocumentGrid } from './DocumentGrid';
import { UploadButton } from './UploadButton';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

interface CourseFilesPageProps {
  onNavigate: (page: string) => void;
}

export function CourseFilesPage({ onNavigate }: CourseFilesPageProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('syllabus');
  const [filters, setFilters] = useState({
    campus: '',
    department: '',
    semester: '',
    courseCode: ''
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const fetchDocuments = async () => {
    if (!user?.token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/documents`, {
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
        setDocuments(data.data);
      } else {
        setError(data.message || 'Failed to fetch documents');
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Connection error. Could not load documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setClearLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/documents/clear-all`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user?.token || localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setDocuments([]);
        setIsClearOpen(false);
      } else {
        alert(data.message || 'Failed to clear course documents');
      }
    } catch (err) {
      console.error('Error clearing documents:', err);
      alert('Network error while clearing course documents');
    } finally {
      setClearLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage="course-files" onNavigate={onNavigate} />
      <main className="ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Title */}
          <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-medium text-gray-900 mb-1">Course Files / Documentation</h1>
              <p className="text-sm text-gray-600">Manage and organize all course-related documents and materials</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDocuments}
                className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold h-9 rounded-lg flex items-center gap-1.5"
                title="Refresh Course Documents"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              {user && (user.role === 'admin' || user.role === 'coordinator' || user.role === 'hod') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearOpen(true)}
                  className="border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold h-9 rounded-lg flex items-center gap-1.5"
                  title="Clear All Course Files"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Data</span>
                </Button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <FilterBar filters={filters} setFilters={setFilters} />
          
          {/* Document Tabs */}
          <DocumentTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          
          {/* Document Grid */}
          <div className="relative">
            <DocumentGrid 
              activeTab={activeTab} 
              filters={filters} 
              documents={documents} 
              onRefresh={fetchDocuments}
            />
            
            {/* Upload Button */}
            <UploadButton activeTab={activeTab} onRefresh={fetchDocuments} />
          </div>

          {/* Clear Documents Confirmation Dialog */}
          <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Clear All Course Documents
                </DialogTitle>
                <DialogDescription className="py-2 text-slate-600">
                  Are you sure you want to permanently delete all uploaded course files and documentation for this section? This action cannot be undone.
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
      </main>
    </div>
  );
}