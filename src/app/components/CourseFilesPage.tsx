import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { FilterBar } from './FilterBar';
import { DocumentTabs } from './DocumentTabs';
import { DocumentGrid } from './DocumentGrid';
import { UploadButton } from './UploadButton';
import { useAuth } from '../contexts/AuthContext';

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

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="course-files" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-6 flex justify-between items-baseline">
            <div>
              <h1 className="text-2xl font-medium text-gray-900 mb-2">Course Files / Documentation</h1>
              <p className="text-gray-600">Manage and organize all course-related documents and materials</p>
            </div>
            {loading && <span className="text-xs text-gray-500">Syncing...</span>}
            {error && <span className="text-xs text-red-500">{error}</span>}
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
        </div>
      </main>
    </div>
  );
}