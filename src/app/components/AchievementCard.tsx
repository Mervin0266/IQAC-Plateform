import React from 'react';
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/permissions';

interface AchievementCardProps {
  achievement: {
    id: string;
    title: string;
    image: string;
    category: string;
  };
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const { user } = useAuth();
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-48 bg-gray-100">
        <img
          src={achievement.image}
          alt={achievement.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop';
          }}
        />
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user && hasFeatureAccess(user.role, 'canEdit') && (
                <DropdownMenuItem>Edit</DropdownMenuItem>
              )}
              <DropdownMenuItem>Share</DropdownMenuItem>
              {user && hasFeatureAccess(user.role, 'canDelete') && (
                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 leading-tight">
          {achievement.title}
        </h3>
        <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium">
          {achievement.category}
        </span>
      </div>
    </div>
  );
}