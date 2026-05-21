import React from 'react';
import { DocumentCard } from './DocumentCard';

interface DocumentGridProps {
  activeTab: string;
  filters: {
    campus: string;
    department: string;
    semester: string;
    courseCode: string;
  };
}

export function DocumentGrid({ activeTab, filters }: DocumentGridProps) {
  // Mock data for different document types
  const mockDocuments = {
    syllabus: [
      {
        id: '1',
        name: 'Data Structures and Algorithms - Syllabus.pdf',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-15',
        status: 'approved',
        size: '2.4 MB',
        courseCode: 'CSE201',
        semester: '3'
      },
      {
        id: '2',
        name: 'Database Management Systems - Syllabus.pdf',
        uploadedBy: 'Prof. Rajesh Kumar',
        uploadDate: '2024-01-14',
        status: 'pending',
        size: '1.8 MB',
        courseCode: 'CSE301',
        semester: '5'
      },
      {
        id: '3',
        name: 'Object Oriented Programming - Syllabus.pdf',
        uploadedBy: 'Dr. Anita Menon',
        uploadDate: '2024-01-13',
        status: 'approved',
        size: '3.1 MB',
        courseCode: 'CSE102',
        semester: '2'
      },
      {
        id: '4',
        name: 'Computer Networks - Syllabus.pdf',
        uploadedBy: 'Prof. Vikram Singh',
        uploadDate: '2024-01-12',
        status: 'approved',
        size: '2.7 MB',
        courseCode: 'CSE401',
        semester: '7'
      }
    ],
    'lesson-plan': [
      {
        id: '5',
        name: 'Week 1-4 Lesson Plan - Data Structures.pdf',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-16',
        status: 'approved',
        size: '1.2 MB',
        courseCode: 'CSE201',
        semester: '3'
      },
      {
        id: '6',
        name: 'Monthly Lesson Plan - DBMS.pdf',
        uploadedBy: 'Prof. Rajesh Kumar',
        uploadDate: '2024-01-15',
        status: 'pending',
        size: '980 KB',
        courseCode: 'CSE301',
        semester: '5'
      }
    ],
    'teaching-notes': [
      {
        id: '7',
        name: 'Linked Lists - Teaching Notes.pdf',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-17',
        status: 'approved',
        size: '4.2 MB',
        courseCode: 'CSE201',
        semester: '3'
      },
      {
        id: '8',
        name: 'SQL Queries - Lecture Notes.pdf',
        uploadedBy: 'Prof. Rajesh Kumar',
        uploadDate: '2024-01-16',
        status: 'approved',
        size: '2.8 MB',
        courseCode: 'CSE301',
        semester: '5'
      }
    ],
    assessments: [
      {
        id: '9',
        name: 'Mid-Term Exam - Data Structures.pdf',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-18',
        status: 'approved',
        size: '856 KB',
        courseCode: 'CSE201',
        semester: '3'
      }
    ],
    attendance: [
      {
        id: '10',
        name: 'January 2024 - Attendance Sheet.xlsx',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-31',
        status: 'approved',
        size: '124 KB',
        courseCode: 'CSE201',
        semester: '3'
      }
    ],
    'co-po-mapping': [
      {
        id: '11',
        name: 'CO-PO Mapping Matrix - CSE201.xlsx',
        uploadedBy: 'Dr. Priya Sharma',
        uploadDate: '2024-01-10',
        status: 'approved',
        size: '67 KB',
        courseCode: 'CSE201',
        semester: '3'
      }
    ]
  };

  const documents = mockDocuments[activeTab] || [];

  // Filter documents based on active filters
  const filteredDocuments = documents.filter(doc => {
    if (filters.courseCode && !doc.courseCode.toLowerCase().includes(filters.courseCode.toLowerCase())) {
      return false;
    }
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
          {Object.keys(filters).some(key => filters[key]) 
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
        <DocumentCard key={document.id} document={document} />
      ))}
    </div>
  );
}