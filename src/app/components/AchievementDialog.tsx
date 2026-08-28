import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';

interface AchievementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (achievement: any) => void;
  achievementToEdit?: any;
  token: string;
}

export function AchievementDialog({
  isOpen,
  onClose,
  onSave,
  achievementToEdit,
  token
}: AchievementDialogProps) {
  const isEditMode = !!achievementToEdit;
  const { logout, user } = useAuth();

  const { departmentList: dbDepartments } = useAcademicHierarchy();
  const departmentsList = React.useMemo(() => {
    const list = [...dbDepartments];
    if (user?.department && !list.includes(user.department)) {
      list.push(user.department);
    }
    return list;
  }, [dbDepartments, user?.department]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => {
    const startYear = currentYear + 2 - i;
    return {
      value: startYear.toString(),
      label: `${startYear}-${startYear + 1}`
    };
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'research',
    subcategory: '',
    achieverType: 'faculty',
    department: '',
    date: new Date().toISOString().split('T')[0],
    year: new Date().getFullYear().toString(),
    rank: '',
    score: '',
    organization: '',
    location: '',
    participants: '',
    impact: '',
    status: 'draft'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (achievementToEdit) {
        setFormData({
          title: achievementToEdit.title || '',
          description: achievementToEdit.description || '',
          category: achievementToEdit.category || 'research',
          subcategory: achievementToEdit.subcategory || '',
          achieverType: achievementToEdit.achieverType || 'faculty',
          department: achievementToEdit.department || '',
          date: achievementToEdit.date || new Date().toISOString().split('T')[0],
          year: achievementToEdit.year || new Date().getFullYear().toString(),
          rank: achievementToEdit.rank || '',
          score: achievementToEdit.score !== undefined && achievementToEdit.score !== null ? achievementToEdit.score.toString() : '',
          organization: achievementToEdit.organization || '',
          location: achievementToEdit.location || '',
          participants: achievementToEdit.participants || '',
          impact: achievementToEdit.impact || '',
          status: achievementToEdit.status || 'draft'
        });
      } else {
        setFormData({
          title: '',
          description: '',
          category: 'research',
          subcategory: '',
          achieverType: 'faculty',
          department: user?.department || '',
          date: new Date().toISOString().split('T')[0],
          year: new Date().getFullYear().toString(),
          rank: '',
          score: '',
          organization: '',
          location: '',
          participants: '',
          impact: '',
          status: user?.role === 'faculty' ? 'submitted' : 'draft'
        });
      }
      setError('');
    }
  }, [isOpen, achievementToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category || !formData.date || !formData.year) {
      setError('Please fill in all required fields (Title, Category, Date, Year)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditMode
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements/${achievementToEdit.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements`;
      
      const method = isEditMode ? 'PUT' : 'POST';

      const bodyData: any = {
        ...formData,
        score: formData.score ? parseFloat(formData.score) : null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (response.status === 401) {
        logout();
        onClose();
        return;
      }

      const data = await response.json();

      if (data.success) {
        onSave(data.data);
        onClose();
      } else {
        setError(data.message || 'Failed to save achievement');
      }
    } catch (err) {
      console.error('Error saving achievement:', err);
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-white p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Achievement/Project' : 'Add New Achievement/Project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter achievement or project title"
                required
                className="w-full"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter details about this achievement"
                rows={3}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Category */}
              <div className="space-y-1">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </Label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="research">Research & Publication</option>
                  <option value="awards">Awards & Achievements</option>
                  <option value="rankings">Rankings</option>
                  <option value="accreditations">Accreditations (NAAC/NBA)</option>
                  <option value="placements">Placements</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="international">International Relations</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Achiever Type */}
              <div className="space-y-1">
                <Label htmlFor="achieverType" className="text-sm font-medium text-gray-700">
                  Achiever Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="achieverType"
                  name="achieverType"
                  value={formData.achieverType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="faculty">Faculty</option>
                  <option value="scholar">Scholar</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {/* Subcategory */}
              <div className="space-y-1">
                <Label htmlFor="subcategory" className="text-sm font-medium text-gray-700">
                  Subcategory
                </Label>
                <Input
                  id="subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  placeholder="e.g. NIRF, IEEE"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-1">
                <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                  Department
                </Label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Department</option>
                  {departmentsList.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Organization */}
              <div className="space-y-1">
                <Label htmlFor="organization" className="text-sm font-medium text-gray-700">
                  Organization / Body
                </Label>
                <Input
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder="e.g. UGC, IEEE, NAAC"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1">
                <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Year */}
              <div className="space-y-1">
                <Label htmlFor="year" className="text-sm font-medium text-gray-700">
                  Academic Year <span className="text-red-500">*</span>
                </Label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  {yearOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Rank */}
              <div className="space-y-1">
                <Label htmlFor="rank" className="text-sm font-medium text-gray-700">
                  Rank / Position
                </Label>
                <Input
                  id="rank"
                  name="rank"
                  value={formData.rank}
                  onChange={handleChange}
                  placeholder="e.g. 1st, Gold"
                />
              </div>

              {/* Score */}
              <div className="space-y-1">
                <Label htmlFor="score" className="text-sm font-medium text-gray-700">
                  Score / CGPA
                </Label>
                <Input
                  id="score"
                  name="score"
                  type="number"
                  step="any"
                  value={formData.score}
                  onChange={handleChange}
                  placeholder="e.g. 3.65, 92.5"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                  Status
                </Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {user?.role === 'faculty' && (
                    <>
                      <option value="submitted">Submit for Review</option>
                      {formData.status === 'record_reopened' && (
                        <option value="record_reopened">Reopened</option>
                      )}
                      {formData.status === 'returned_for_correction' && (
                        <option value="returned_for_correction">Action Needed</option>
                      )}
                      {formData.status === 'draft' && (
                        <option value="draft">Draft</option>
                      )}
                    </>
                  )}
                  {user?.role === 'coordinator' && (
                    <>
                      <option value="submitted">Submitted</option>
                      <option value="under_coordinator_review">Under Coordinator Review</option>
                      <option value="approved">Approve (Send to HOD)</option>
                      <option value="returned_for_correction">Return for Correction</option>
                      <option value="rejected">Reject</option>
                    </>
                  )}
                  {user?.role === 'hod' && (
                    <>
                      <option value="approved">Coordinator Approved</option>
                      <option value="under_hod_review">Under HOD Review</option>
                      <option value="finalized">Final HOD Approval (Finalized)</option>
                      <option value="returned_for_correction">Return for Correction</option>
                      <option value="rejected">Reject</option>
                    </>
                  )}
                  {user?.role === 'admin' && (
                    <>
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="under_coordinator_review">Under Coordinator Review</option>
                      <option value="approved">Coordinator Approved</option>
                      <option value="under_hod_review">Under HOD Review</option>
                      <option value="finalized">Finalized</option>
                      <option value="returned_for_correction">Returned for Correction</option>
                      <option value="rejected">Rejected</option>
                    </>
                  )}
                  {user?.role === 'authority' && (
                    <option value={formData.status}>{formData.status}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Location */}
              <div className="space-y-1">
                <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                  Location
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Bangalore, India"
                />
              </div>

              {/* Impact */}
              <div className="space-y-1">
                <Label htmlFor="impact" className="text-sm font-medium text-gray-700">
                  Impact / Scope
                </Label>
                <Input
                  id="impact"
                  name="impact"
                  value={formData.impact}
                  onChange={handleChange}
                  placeholder="e.g. International"
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-1">
              <Label htmlFor="participants" className="text-sm font-medium text-gray-700">
                Participants / Contributors
              </Label>
              <Input
                id="participants"
                name="participants"
                value={formData.participants}
                onChange={handleChange}
                placeholder="e.g. Dr. Rajesh Kumar, Dr. Priya Sharma"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
