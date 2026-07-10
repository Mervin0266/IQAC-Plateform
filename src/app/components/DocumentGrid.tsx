import React from 'react';
import { FileText } from 'lucide-react';
import { DocumentCard } from './DocumentCard';

interface DocumentGridProps {
  activeTab: string;
  filters: {
    campus: string;
    department: string;
    semester: string;
    courseCode: string;
  };
  documents?: any[];
  onRefresh?: () => void;
}

export function DocumentGrid({ activeTab, filters, documents = [], onRefresh }: DocumentGridProps) {
  // Mock data for different document types (fallback)
  const mockDocuments: Record<string, Array<{
    id: string;
    name: string;
    uploadedBy: string;
    uploadDate: string;
    status: 'pending' | 'approved' | 'rejected';
    size: string;
    courseCode: string;
    semester: string;
    subcategory: string;
    department: string;
  }>> = {
    syllabus: [
      {
        id: 'mock-1',
        name: 'Data Structures and Algorithms - Syllabus.pdf',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-15',
        status: 'approved',
        size: '2.4 MB',
        courseCode: 'CSE201',
        semester: '3',
        subcategory: 'syllabus',
        department: 'Computer Science and Engineering'
      },
      {
        id: 'mock-2',
        name: 'Database Management Systems - Syllabus.pdf',
        uploadedBy: 'Prof. Rajesh Kumar',
        uploadDate: '2024-01-14',
        status: 'pending',
        size: '1.8 MB',
        courseCode: 'CSE301',
        semester: '5',
        subcategory: 'syllabus',
        department: 'Computer Science and Engineering'
      },
      {
        id: 'mock-3',
        name: 'Object Oriented Programming - Syllabus.pdf',
        uploadedBy: 'Dr. Anita Menon',
        uploadDate: '2024-01-13',
        status: 'approved',
        size: '3.1 MB',
        courseCode: 'CSE102',
        semester: '2',
        subcategory: 'syllabus',
        department: 'Computer Science and Engineering'
      },
      {
        id: 'mock-4',
        name: 'Computer Networks - Syllabus.pdf',
        uploadedBy: 'Prof. Vikram Singh',
        uploadDate: '2024-01-12',
        status: 'approved',
        size: '2.7 MB',
        courseCode: 'CSE401',
        semester: '7',
        subcategory: 'syllabus',
        department: 'Electronics and Communication Engineering'
      }
    ],
    'lesson-plan': [
      {
        id: 'mock-5',
        name: 'Week 1-4 Lesson Plan - Data Structures.pdf',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-16',
        status: 'approved',
        size: '1.2 MB',
        courseCode: 'CSE201',
        semester: '3',
        subcategory: 'lesson-plan',
        department: 'Computer Science and Engineering'
      },
      {
        id: 'mock-6',
        name: 'Monthly Lesson Plan - DBMS.pdf',
        uploadedBy: 'Prof. Rajesh Kumar',
        uploadDate: '2024-01-15',
        status: 'pending',
        size: '980 KB',
        courseCode: 'CSE301',
        semester: '5',
        subcategory: 'lesson-plan',
        department: 'Computer Science and Engineering'
      }
    ],
    'teaching-notes': [
      {
        id: 'mock-7',
        name: 'Linked Lists - Teaching Notes.pdf',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-17',
        status: 'approved',
        size: '4.2 MB',
        courseCode: 'CSE201',
        semester: '3',
        subcategory: 'teaching-notes',
        department: 'Computer Science and Engineering'
      },
      {
        id: 'mock-8',
        name: 'SQL Queries - Lecture Notes.pdf',
        uploadedBy: 'Prof. Rajesh Kumar',
        uploadDate: '2024-01-16',
        status: 'approved',
        size: '2.8 MB',
        courseCode: 'CSE301',
        semester: '5',
        subcategory: 'teaching-notes',
        department: 'Computer Science and Engineering'
      }
    ],
    assessments: [
      {
        id: 'mock-9',
        name: 'Mid-Term Exam - Data Structures.pdf',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-18',
        status: 'approved',
        size: '856 KB',
        courseCode: 'CSE201',
        semester: '3',
        subcategory: 'assessments',
        department: 'Computer Science and Engineering'
      }
    ],
    attendance: [
      {
        id: 'mock-10',
        name: 'January 2024 - Attendance Sheet.xlsx',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-31',
        status: 'approved',
        size: '124 KB',
        courseCode: 'CSE201',
        semester: '3',
        subcategory: 'attendance',
        department: 'Computer Science and Engineering'
      }
    ],
    'co-po-mapping': [
      {
        id: 'mock-11',
        name: 'CO-PO Mapping Matrix - CSE201.xlsx',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-10',
        status: 'approved',
        size: '67 KB',
        courseCode: 'CSE201',
        semester: '3',
        subcategory: 'co-po-mapping',
        department: 'Computer Science and Engineering'
      }
    ]
  };

  const hasDbDocs = documents && documents.length > 0;

  // Format database documents to match the card requirements
  const parsedDbDocs = hasDbDocs
    ? documents.map((doc: any) => ({
        id: doc.id,
        name: doc.fileName || doc.title,
        uploadedBy: doc.uploader?.name || 'Faculty',
        uploadDate: doc.createdAt ? doc.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        status: doc.status || 'approved',
        size: doc.fileSize
          ? doc.fileSize >= 1024 * 1024
            ? `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`
            : `${(doc.fileSize / 1024).toFixed(0)} KB`
          : '0 KB',
        courseCode: doc.courseCode || '',
        semester: doc.semester || '',
        subcategory: doc.subcategory,
        department: doc.department
      }))
    : [];

  // Filter documents based on active tab & filters
  const docsToFilter = hasDbDocs ? parsedDbDocs : (mockDocuments[activeTab] || []);

  const filteredDocuments = docsToFilter.filter(doc => {
    // 1. Filter by subcategory (activeTab)
    if (doc.subcategory !== activeTab) {
      return false;
    }
    
    // 2. Filter by department
    if (filters.department && doc.department) {
      const normFilter = filters.department.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normDoc = doc.department.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normDoc.includes(normFilter) && !normFilter.includes(normDoc)) {
        return false;
      }
    }

    // 3. Filter by courseCode
    if (filters.courseCode && !doc.courseCode.toLowerCase().includes(filters.courseCode.toLowerCase())) {
      return false;
    }

    // 4. Filter by semester
    if (filters.semester && doc.semester !== filters.semester) {
      return false;
    }

    return true;
  });

  if (filteredDocuments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
        <p className="text-gray-500 mb-6">
          {Object.values(filters).some(value => value) 
            ? 'Try adjusting your filters or upload a new document.'
            : `No ${activeTab.replace('-', ' ')} documents have been uploaded yet.`
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-20">
      {filteredDocuments.map((document) => (
        <DocumentCard 
          key={document.id} 
          document={document as any} 
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}