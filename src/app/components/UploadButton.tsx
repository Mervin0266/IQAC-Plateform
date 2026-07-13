import React, { useEffect, useState } from 'react';
import { Plus, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/permissions';

interface UploadButtonProps {
  activeTab: string;
  onRefresh?: () => void;
}

export function UploadButton({ activeTab, onRefresh }: UploadButtonProps) {
  const { user, logout } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    courseCode: '',
    semester: '',
    department: '',
    description: ''
  });

  const DEPARTMENTS = [
    'Computer Science and Engineering',
    'Electronics and Communication Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical and Automobile Engineering',
    'Civil Engineering',
    'Science and Humanities (Engg.)',
    'School of Architecture',
    'Artificial Intelligence and Data Science'
  ];

  const departmentsList = [...DEPARTMENTS];
  if (user?.department && !departmentsList.includes(user.department)) {
    departmentsList.push(user.department);
  }

  // Pre-fill user department when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      setFormData(prev => ({
        ...prev,
        department: user?.department || ''
      }));
      setError('');
    }
  }, [isDialogOpen, user]);

  // Only show upload button if user has upload permission
  if (!user || !hasFeatureAccess(user.role, 'canUpload')) {
    return null;
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const getDocumentTypeLabel = () => {
    const labels: Record<string, string> = {
      'syllabus': 'Syllabus',
      'lesson-plan': 'Lesson Plan',
      'teaching-notes': 'Teaching Notes',
      'assessments': 'Assessment',
      'attendance': 'Attendance',
      'co-po-mapping': 'CO-PO Mapping'
    };
    return labels[activeTab] || 'Document';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user?.token) return;

    setLoading(true);
    setError('');

    // Generate dynamic course name for the title based on the active tab and course code
    const documentType = getDocumentTypeLabel();
    const payload = {
      title: `${formData.courseCode} - ${documentType}`,
      description: formData.description || `Uploaded ${documentType} for ${formData.courseCode}`,
      category: 'course-files',
      subcategory: activeTab,
      department: formData.department || user.department,
      semester: formData.semester,
      courseCode: formData.courseCode,
      courseName: `${documentType} Documentation`,
      fileName: selectedFile.name,
      filePath: `/uploads/${selectedFile.name}`,
      fileSize: selectedFile.size,
      fileType: selectedFile.type || 'application/pdf',
      status: 'approved' // Default to approved
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setIsDialogOpen(false);
        setSelectedFile(null);
        setFormData({
          courseCode: '',
          semester: '',
          department: '',
          description: ''
        });
        if (onRefresh) onRefresh();
      } else {
        setError(data.message || 'Failed to upload document record');
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Connection error. Could not upload document to database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Fixed Upload Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <button className="fixed bottom-6 left-80 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors z-50">
            <Plus className="w-6 h-6" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload New {getDocumentTypeLabel()}</DialogTitle>
            <DialogDescription className="sr-only">
              Upload a new {getDocumentTypeLabel()} document to the system.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* File Upload */}
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <div className="mt-1">
                <label
                  htmlFor="file-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {selectedFile ? (
                      <>
                        <Upload className="w-8 h-8 text-blue-500 mb-2" />
                        <p className="text-sm font-medium text-blue-600">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX (max. 10MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            </div>

            {/* Course Code */}
            <div>
              <Label htmlFor="course-code">Course Code</Label>
              <Input
                id="course-code"
                placeholder="e.g., CSE201"
                value={formData.courseCode}
                onChange={(e) => setFormData({...formData, courseCode: e.target.value})}
                required
              />
            </div>

            {/* Semester */}
            <div>
              <Label>Semester</Label>
              <Select value={formData.semester} onValueChange={(value) => setFormData({...formData, semester: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                  <SelectItem value="3">Semester 3</SelectItem>
                  <SelectItem value="4">Semester 4</SelectItem>
                  <SelectItem value="5">Semester 5</SelectItem>
                  <SelectItem value="6">Semester 6</SelectItem>
                  <SelectItem value="7">Semester 7</SelectItem>
                  <SelectItem value="8">Semester 8</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div>
              <Label>Department</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentsList.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of the document"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedFile || !formData.courseCode || !formData.semester || loading}
              >
                {loading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}