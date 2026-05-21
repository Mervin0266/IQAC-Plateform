import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { FilterBar } from './FilterBar';
import { DocumentTabs } from './DocumentTabs';
import { DocumentGrid } from './DocumentGrid';
import { UploadButton } from './UploadButton';

interface CourseFilesPageProps {
  onNavigate: (page: string) => void;
}

export function CourseFilesPage({ onNavigate }: CourseFilesPageProps) {
  const [activeTab, setActiveTab] = useState('syllabus');
  const [filters, setFilters] = useState({
    campus: '',
    department: '',
    semester: '',
    courseCode: ''
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="course-files" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Course Files / Documentation</h1>
            <p className="text-gray-600">Manage and organize all course-related documents and materials</p>
          </div>

          {/* Filter Bar */}
          <FilterBar filters={filters} setFilters={setFilters} />
          
          {/* Document Tabs */}
          <DocumentTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          
          {/* Document Grid */}
          <div className="relative">
            <DocumentGrid activeTab={activeTab} filters={filters} />
            
            {/* Upload Button */}
            <UploadButton activeTab={activeTab} />
          </div>
        </div>
      </main>
    </div>
  );
}