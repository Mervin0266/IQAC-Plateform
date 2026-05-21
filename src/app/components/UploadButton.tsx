import React, { useState } from 'react';
import { Plus, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/permissions';

interface UploadButtonProps {
  activeTab: string;
}

export function UploadButton({ activeTab }: UploadButtonProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    courseCode: '',
    semester: '',
    department: '',
    description: ''
  });

  // Only show upload button if user has upload permission
  if (!user || !hasFeatureAccess(user.role, 'canUpload')) {
    return null;
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle file upload here
    console.log('Uploading file:', selectedFile, formData);
    setIsDialogOpen(false);
    setSelectedFile(null);
    setFormData({
      courseCode: '',
      semester: '',
      department: '',
      description: ''
    });
  };

  const getDocumentTypeLabel = () => {
    const labels = {
      'syllabus': 'Syllabus',
      'lesson-plan': 'Lesson Plan',
      'teaching-notes': 'Teaching Notes',
      'assessments': 'Assessment',
      'attendance': 'Attendance',
      'co-po-mapping': 'CO-PO Mapping'
    };
    return labels[activeTab] || 'Document';
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
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  <SelectItem value="computer-science">Computer Science</SelectItem>
                  <SelectItem value="electronics">Electronics & Communication</SelectItem>
                  <SelectItem value="mechanical">Mechanical Engineering</SelectItem>
                  <SelectItem value="business">Business Administration</SelectItem>
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
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedFile || !formData.courseCode || !formData.semester}
              >
                Upload Document
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}