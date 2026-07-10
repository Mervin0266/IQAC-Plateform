import React from 'react';
import { AchievementCard } from './AchievementCard';

interface AchievementGridProps {
  activeTab: string;
  filters: {
    campus: string;
    department: string;
    year: string;
  };
  achievements: any[];
  onEdit: (achievement: any) => void;
  onDelete: (id: string) => void;
  onRequestEdit?: (achievement: any) => void;
  onStatusChange?: () => void;
}

export const getCategoryImageUrl = (category: string) => {
  const images: Record<string, string> = {
    research: 'https://images.unsplash.com/photo-1705727210721-961cc64a6895?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    awards: 'https://images.unsplash.com/photo-1602144404355-d2f1746fe8c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    rankings: 'https://images.unsplash.com/photo-1755053757912-a63da9d6e0e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    accreditations: 'https://images.unsplash.com/photo-1719659191863-78e0ebd19633?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    placements: 'https://images.unsplash.com/photo-1651112882818-86d17da92000?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    infrastructure: 'https://images.unsplash.com/photo-1562774053-701939374585?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    international: 'https://images.unsplash.com/photo-1711385532992-9d620284a943?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    other: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&fit=crop'
  };
  return images[category] || images.other;
};

export function AchievementGrid({
  activeTab,
  filters,
  achievements,
  onEdit,
  onDelete,
  onRequestEdit,
  onStatusChange
}: AchievementGridProps) {

  // Map backend categories/content to scholar/student/faculty tabs
  const getTabFilteredAchievements = () => {
    return achievements.filter(achievement => {
      const dbAchieverType = achievement.achieverType?.toLowerCase();
      
      // Strict matching if the database has the achieverType column populated
      if (dbAchieverType === 'student' || dbAchieverType === 'scholar' || dbAchieverType === 'faculty') {
        return activeTab === dbAchieverType;
      }

      // Legacy fallback keyword matching
      const title = achievement.title?.toLowerCase() || '';
      const desc = achievement.description?.toLowerCase() || '';
      const subcat = achievement.subcategory?.toLowerCase() || '';
      const part = achievement.participants?.toLowerCase() || '';
      const cat = achievement.category || '';

      if (activeTab === 'student') {
        return (
          cat === 'placements' ||
          title.includes('student') ||
          desc.includes('student') ||
          subcat.includes('student') ||
          part.includes('student')
        );
      }

      if (activeTab === 'faculty') {
        return (
          title.includes('faculty') ||
          title.includes('dr.') ||
          title.includes('prof') ||
          desc.includes('faculty') ||
          desc.includes('dr.') ||
          desc.includes('prof') ||
          part.includes('dr.') ||
          part.includes('prof')
        );
      }

      // Scholar: Legacy default
      return activeTab === 'scholar';
    });
  };

  // Apply filters (department, year)
  const applyFilters = (list: any[]) => {
    return list.filter(item => {
      // Filter by department (fuzzy match)
      if (filters.department && filters.department !== 'all') {
        const itemDept = (item.department || '').toLowerCase().replace(/\s+/g, '-');
        const filterDept = filters.department.toLowerCase().replace(/\s+/g, '-');
        if (!itemDept.includes(filterDept)) return false;
      }

      // Filter by year
      if (filters.year && filters.year !== 'all' && item.year !== filters.year) {
        return false;
      }

      return true;
    });
  };

  const tabFiltered = getTabFilteredAchievements();
  const filteredAchievements = applyFilters(tabFiltered);

  if (filteredAchievements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements found</h3>
        <p className="text-gray-500">
          {Object.values(filters).some(value => value) 
            ? 'Try adjusting your filters.'
            : `No ${activeTab} achievements have been added to the database yet.`
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-20">
      {filteredAchievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievement={{
            id: achievement.id,
            title: achievement.title,
            image: getCategoryImageUrl(achievement.category),
            category: achievement.category,
            description: achievement.description,
            subcategory: achievement.subcategory,
            achieverType: achievement.achieverType,
            department: achievement.department,
            date: achievement.date,
            year: achievement.year,
            rank: achievement.rank,
            score: achievement.score,
            organization: achievement.organization,
            location: achievement.location,
            participants: achievement.participants,
            impact: achievement.impact,
            status: achievement.status
          }}
          onEdit={() => onEdit(achievement)}
          onDelete={() => onDelete(achievement.id)}
          onRequestEdit={() => onRequestEdit?.(achievement)}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}