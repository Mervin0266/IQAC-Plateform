import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Filter } from 'lucide-react';

interface FilterBarProps {
  filters: {
    campus: string;
    department: string;
    semester: string;
    courseCode: string;
  };
  setFilters: (filters: any) => void;
}

export function FilterBar({ filters, setFilters }: FilterBarProps) {
  const updateFilter = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filters</h3>
        </div>
        <button
          onClick={() => setFilters({ campus: '', department: '', semester: '', courseCode: '' })}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Campus Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
          <Select value={filters.campus} onValueChange={(value) => updateFilter('campus', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Campus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bangalore-central">Bangalore Central</SelectItem>
              <SelectItem value="bangalore-yeshwanthpur">Bangalore Yeshwanthpur</SelectItem>
              <SelectItem value="delhi-ncr">Delhi NCR</SelectItem>
              <SelectItem value="pune-lavasa">Pune Lavasa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Department Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <Select value={filters.department} onValueChange={(value) => updateFilter('department', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="computer-science">Computer Science</SelectItem>
              <SelectItem value="electronics">Electronics & Communication</SelectItem>
              <SelectItem value="mechanical">Mechanical Engineering</SelectItem>
              <SelectItem value="business">Business Administration</SelectItem>
              <SelectItem value="psychology">Psychology</SelectItem>
              <SelectItem value="literature">English Literature</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Semester Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
          <Select value={filters.semester} onValueChange={(value) => updateFilter('semester', value)}>
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

        {/* Course Code Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="e.g., CSE101"
              value={filters.courseCode}
              onChange={(e) => updateFilter('courseCode', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}