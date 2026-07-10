import React from 'react';
import { FileText, Download, Eye, MoreVertical, CheckCircle, Clock, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/permissions';

interface DocumentCardProps {
  document: {
    id: string;
    name: string;
    uploadedBy: string;
    uploadDate: string;
    status: 'approved' | 'pending' | 'rejected';
    size: string;
    courseCode: string;
    semester: string;
  };
  onRefresh?: () => void;
}

export function DocumentCard({ document, onRefresh }: DocumentCardProps) {
  const { user, logout } = useAuth();
  
  const handleDelete = async () => {
    if (!user?.token) return;
    
    // Safety guard for mock documents
    if (document.id.startsWith('mock-')) {
      alert('Mock documents cannot be deleted from the database. Try uploading a new document and deleting that instead.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${document.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/documents/${document.id}`, {
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
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || 'Failed to delete document');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Connection error. Could not delete document.');
    }
  };
  
  const getStatusIcon = () => {
    switch (document.status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (document.status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="capitalize">{document.status}</span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            {user && hasFeatureAccess(user.role, 'canDelete') && (
              <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Document Name */}
      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 leading-tight">
        {document.name}
      </h3>

      {/* Course Info */}
      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
        <span className="bg-gray-100 px-2 py-1 rounded-md font-medium">
          {document.courseCode}
        </span>
        <span>Sem {document.semester}</span>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            <p className="font-medium text-gray-700">{document.uploadedBy}</p>
            <p className="text-xs">{formatDate(document.uploadDate)}</p>
          </div>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">
            {document.size}
          </span>
        </div>
      </div>
    </div>
  );
}