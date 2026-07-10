import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";

interface AchievementFiltersProps {
  filters: {
    campus: string;
    department: string;
    year: string;
  };
  setFilters: (filters: any) => void;
  onApply: () => void;
}

export function AchievementFilters({
  filters,
  setFilters,
  onApply,
}: AchievementFiltersProps) {
  const updateFilter = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = () => {
    onApply();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* Select Campus 
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Campus
          </label>
          <Select
            value={filters.campus}
            onValueChange={(value) =>
              updateFilter("campus", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Campus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bangalore-central">
                Bangalore Kengeri
              </SelectItem>
              <SelectItem value="bangalore-yeshwanthpur">
                Bangalore Central
              </SelectItem>
              <SelectItem value="delhi-ncr">
                Bangalore BRC
              </SelectItem>
              <SelectItem value="pune-lavasa">
                Bangalore BYC
              </SelectItem>
              <SelectItem value="pune-lavasa">
                Delhi NCR
              </SelectItem>
              <SelectItem value="pune-lavasa">
                Pune Lavasa
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        */}

        {/* Select Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Department
          </label>
          <Select
            value={filters.department}
            onValueChange={(value) =>
              updateFilter("department", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="computer-science">
                Computer Science
              </SelectItem>
              <SelectItem value="electronics">
                Electronics & Communication
              </SelectItem>
              <SelectItem value="mechanical">
                Mechanical Engineering
              </SelectItem>
              <SelectItem value="business">
                Business Administration
              </SelectItem>
              <SelectItem value="psychology">
                Psychology
              </SelectItem>
              <SelectItem value="literature">
                English Literature
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Select Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Year
          </label>
          <Select
            value={filters.year}
            onValueChange={(value) =>
              updateFilter("year", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {Array.from(
                { length: new Date().getFullYear() - 2020 + 1 },
                (_, i) => {
                  const y = (new Date().getFullYear() - i).toString();
                  return (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  );
                }
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Apply Filters Button */}
        <div>
          <Button
            onClick={handleApplyFilters}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            APPLY FILTERS
          </Button>
        </div>
      </div>
    </div>
  );
}