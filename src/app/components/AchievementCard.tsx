import React from 'react';
import { MoreVertical, ShieldAlert } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/permissions';

interface AchievementCardProps {
  achievement: {
    id: string;
    title: string;
    image: string;
    category: string;
    description?: string;
    subcategory?: string;
    achieverType?: string;
    department?: string;
    date?: string;
    year?: string;
    rank?: string;
    score?: any;
    organization?: string;
    location?: string;
    participants?: string;
    impact?: string;
    status?: string;
  };
  onEdit: () => void;
  onDelete: () => void;
  onRequestEdit?: () => void;
  onStatusChange?: () => void;
}

export function AchievementCard({ achievement, onEdit, onDelete, onRequestEdit, onStatusChange }: AchievementCardProps) {
  const { user } = useAuth();

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/achievements/${achievement.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert(`Link for "${achievement.title}" has been copied to your clipboard!`);
      })
      .catch((err) => {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link to clipboard.');
      });
  };

  const getStatusBadge = () => {
    const status = achievement.status || 'draft';
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 border-gray-200',
      submitted: 'bg-amber-50 text-amber-700 border-amber-200',
      under_coordinator_review: 'bg-amber-50 text-amber-700 border-amber-200',
      under_hod_review: 'bg-amber-50 text-amber-700 border-amber-200',
      returned_for_correction: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      finalized: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      edit_requested: 'bg-blue-50 text-blue-700 border-blue-200',
      edit_request_approved: 'bg-blue-50 text-blue-700 border-blue-200',
      record_reopened: 'bg-teal-50 text-teal-700 border-teal-200'
    };

    const labels: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      under_coordinator_review: 'Reviewing',
      under_hod_review: 'HOD Check',
      returned_for_correction: 'Correction Needed',
      rejected: 'Rejected',
      approved: 'Coordinator Approved',
      finalized: 'Finalized',
      edit_requested: 'Edit Requested',
      edit_request_approved: 'Edit Approved',
      record_reopened: 'Reopened'
    };

    return (
      <span className={`inline-block border px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Determine user-specific permissions for achievements
  const canUserEdit = () => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator') return true;
    if (user.role === 'faculty') {
      const editableStatuses = ['draft', 'returned_for_correction', 'record_reopened'];
      return editableStatuses.includes(achievement.status || 'draft');
    }
    return false;
  };

  const canUserDelete = () => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator';
  };

  const showEditRequestOption = () => {
    if (!user || user.role !== 'faculty') return false;
    // Faculty can only request edit for locked statuses (not draft, returned, or reopened)
    const editableStatuses = ['draft', 'returned_for_correction', 'record_reopened', 'edit_requested'];
    return !editableStatuses.includes(achievement.status || 'draft');
  };

  const isCoordinatorApprovalPending = user?.role === 'coordinator' && achievement.status === 'submitted';
  const isHodApprovalPending = user?.role === 'hod' && achievement.status === 'approved';

  const handleUpdateStatus = async (newStatus: string) => {
    if (!user?.token) return;

    let remarks = '';
    if (newStatus === 'returned_for_correction') {
      const promptVal = prompt('Enter remarks / correction comments for the faculty:');
      if (promptVal === null) return; // User cancelled
      remarks = promptVal;
    } else {
      if (!window.confirm('Are you sure you want to approve this achievement?')) {
        return;
      }
    }

    try {
      const response = await fetch(`http://localhost:5000/api/achievements/${achievement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          status: newStatus,
          remarks: remarks || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(newStatus === 'returned_for_correction' ? 'Returned for correction successfully.' : 'Achievement approved successfully!');
        if (onStatusChange) {
          onStatusChange();
        }
      } else {
        alert(data.message || 'Failed to update status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Image */}
        <div className="relative h-44 bg-gray-100">
          <img
            src={achievement.image}
            alt={achievement.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop';
            }}
          />
          <div className="absolute top-2 right-2 flex items-center space-x-1.5">
            {getStatusBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canUserEdit() && (
                  <DropdownMenuItem onClick={onEdit} className="cursor-pointer">Edit</DropdownMenuItem>
                )}
                {showEditRequestOption() && (
                  <DropdownMenuItem onClick={onRequestEdit} className="cursor-pointer font-medium text-blue-900">
                    Request Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer">Share</DropdownMenuItem>
                {canUserDelete() && (
                  <DropdownMenuItem onClick={onDelete} className="text-red-600 cursor-pointer">Delete</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1.5 line-clamp-2 leading-tight min-h-[2.5rem]">
            {achievement.title}
          </h3>
          {achievement.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">
              {achievement.description}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide">
              {achievement.category}
            </span>
            {achievement.department && (
              <span className="inline-block bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded text-[9px] font-medium max-w-[120px] truncate" title={achievement.department}>
                {achievement.department}
              </span>
            )}
          </div>
          {achievement.year && (
            <span className="text-[10px] text-gray-400 font-semibold">
              AY {achievement.year}
            </span>
          )}
        </div>
      </div>
      {(isCoordinatorApprovalPending || isHodApprovalPending) && (
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => handleUpdateStatus(isCoordinatorApprovalPending ? 'approved' : 'finalized')}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm cursor-pointer text-center"
          >
            Approve
          </button>
          <button
            onClick={() => handleUpdateStatus('returned_for_correction')}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition-colors shadow-sm cursor-pointer text-center"
          >
            Return
          </button>
        </div>
      )}
    </div>
  );
}