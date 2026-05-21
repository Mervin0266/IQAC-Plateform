import React from 'react';
import { AchievementCard } from './AchievementCard';

interface AchievementGridProps {
  activeTab: string;
  filters: {
    campus: string;
    department: string;
    year: string;
  };
}

export function AchievementGrid({ activeTab, filters }: AchievementGridProps) {
  // Mock data for achievements with real Unsplash images
  const mockAchievements = {
    scholar: [
      {
        id: '1',
        title: 'Dr. Evelyn Reed Awarded Prestigious Research Grant',
        image: 'https://images.unsplash.com/photo-1705727210721-961cc64a6895?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY2FkZW1pYyUyMGFjaGlldmVtZW50JTIwcmVzZWFyY2glMjBsYWJvcmF0b3J5fGVufDF8fHx8MTc1NjEwODI2NXww&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Research Grant'
      },
      {
        id: '2',
        title: 'Student Team Wins National Robotics Competition',
        image: 'https://images.unsplash.com/photo-1755053757912-a63da9d6e0e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMGNvbXBldGl0aW9uJTIwcm9ib3RpY3MlMjB0ZWFtfGVufDF8fHx8MTc1NjEwODI3MHww&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Competition'
      },
      {
        id: '3',
        title: 'Professor Green Honored with Career Development Lifetime Achievement Award',
        image: 'https://images.unsplash.com/photo-1602144404355-d2f1746fe8c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjB1bml2ZXJzaXR5JTIwYXdhcmQlMjBjZXJlbW9ueXxlbnwxfHx8fDE3NTYxMDgyNzR8MA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Achievement Award'
      },
      {
        id: '4',
        title: 'Award Sophia Reid Named Young Entrepreneur of the Year',
        image: 'https://images.unsplash.com/photo-1651112882818-86d17da92000?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGVudHJlcHJlbmV1ciUyMGJ1c2luZXNzJTIwYXdhcmR8ZW58MXx8fHwxNzU2MTA4Mjc3fDA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Entrepreneur Award'
      },
      {
        id: '5',
        title: 'Campus Sustainability Initiative Recognized with National Award',
        image: 'https://images.unsplash.com/photo-1719659191863-78e0ebd19633?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXN0YWluYWJpbGl0eSUyMGdyZWVuJTIwY2FtcHVzJTIwZW52aXJvbm1lbnR8ZW58MXx8fHwxNzU2MTA4MjgyfDA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'DOCU-MENTAL PROJECT'
      },
      {
        id: '6',
        title: 'Student Research Publication in Top Academic Journal',
        image: 'https://images.unsplash.com/photo-1719898803192-61d43c8e86a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwYWNhZGVtaWMlMjBqb3VybmFsJTIwcHVibGljYXRpb258ZW58MXx8fHwxNzU2MTA4Mjg1fDA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Academic Journal'
      },
      {
        id: '7',
        title: 'Faculty Member Dr. Aswita Career Elected to National Academy',
        image: 'https://images.unsplash.com/photo-1707109463060-01639811f833?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYWN1bHR5JTIwbmF0aW9uYWwlMjBhY2FkZW15JTIwc2NpZW5jZXxlbnwxfHx8fDE3NTYxMDgyODh8MA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'National Academy'
      },
      {
        id: '8',
        title: 'University Debate Team Secures International Championship Title',
        image: 'https://images.unsplash.com/photo-1711385532992-9d620284a943?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwZGViYXRlJTIwdGVhbSUyMGNoYW1waW9uc2hpcHxlbnwxfHx8fDE3NTYxMDgyOTF8MA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Championship'
      },
      {
        id: '9',
        title: 'Dr. Oliver Stone Receives International Science Award',
        image: 'https://images.unsplash.com/photo-1602144404355-d2f1746fe8c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjB1bml2ZXJzaXR5JTIwYXdhcmQlMjBjZXJlbW9ueXxlbnwxfHx8fDE3NTYxMDgyNzR8MA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Science Award'
      },
      {
        id: '10',
        title: 'Engineering Students Win International Water Innovation Design Competition',
        image: 'https://images.unsplash.com/photo-1755053757912-a63da9d6e0e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbmdpbmVlcmluZyUyMGlubm92YXRpb24lMjBkZXNpZ24lMjBjb250ZXN0fGVufDF8fHx8MTc1NjEwODI5NXww&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Water Innovation System'
      },
      {
        id: '11',
        title: 'Professor Newton Grant Hammond for Contributions to Literature',
        image: 'https://images.unsplash.com/photo-1719898803192-61d43c8e86a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwYWNhZGVtaWMlMjBqb3VybmFsJTIwcHVibGljYXRpb258ZW58MXx8fHwxNzU2MTA4Mjg1fDA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Literature'
      },
      {
        id: '12',
        title: 'Sociology Present Research at International Conference',
        image: 'https://images.unsplash.com/photo-1707109463060-01639811f833?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYWN1bHR5JTIwbmF0aW9uYWwlMjBhY2FkZW15JTIwc2NpZW5jZXxlbnwxfHx8fDE3NTYxMDgyODh8MA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'International Conference'
      },
      {
        id: '13',
        title: 'Faculty Dr. Lucas Clark Appointed to National Advisory Board',
        image: 'https://images.unsplash.com/photo-1651112882818-86d17da92000?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGVudHJlcHJlbmV1ciUyMGJ1c2luZXNzJTIwYXdhcmR8ZW58MXx8fHwxNzU2MTA4Mjc3fDA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Advisory Board'
      },
      {
        id: '14',
        title: 'University Chess Team Wins National Championship',
        image: 'https://images.unsplash.com/photo-1719659191863-78e0ebd19633?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXN0YWluYWJpbGl0eSUyMGdyZWVuJTIwY2FtcHVzJTIwZW52aXJvbm1lbnR8ZW58MXx8fHwxNzU2MTA4MjgyfDA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'National Championship'
      }
    ],
    student: [
      {
        id: '1',
        title: 'Student Research Publication in Top Academic Journal',
        image: 'https://images.unsplash.com/photo-1719898803192-61d43c8e86a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwYWNhZGVtaWMlMjBqb3VybmFsJTIwcHVibGljYXRpb258ZW58MXx8fHwxNzU2MTA4Mjg1fDA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Academic Journal'
      },
      {
        id: '2',
        title: 'Student Team Wins National Robotics Competition',
        image: 'https://images.unsplash.com/photo-1755053757912-a63da9d6e0e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMGNvbXBldGl0aW9uJTIwcm9ib3RpY3MlMjB0ZWFtfGVufDF8fHx8MTc1NjEwODI3MHww&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Competition'
      },
      {
        id: '3',
        title: 'University Debate Team Secures International Championship Title',
        image: 'https://images.unsplash.com/photo-1711385532992-9d620284a943?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwZGViYXRlJTIwdGVhbSUyMGNoYW1waW9uc2hpcHxlbnwxfHx8fDE3NTYxMDgyOTF8MA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Championship'
      },
      {
        id: '4',
        title: 'Engineering Students Win International Design Competition',
        image: 'https://images.unsplash.com/photo-1755053757912-a63da9d6e0e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbmdpbmVlcmluZyUyMGlubm92YXRpb24lMjBkZXNpZ24lMjBjb250ZXN0fGVufDF8fHx8MTc1NjEwODI5NXww&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Water Innovation System'
      }
    ],
    faculty: [
      {
        id: '1',
        title: 'Dr. Oliver Stone Receives International Science Award',
        image: 'https://images.unsplash.com/photo-1602144404355-d2f1746fe8c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjB1bml2ZXJzaXR5JTIwYXdhcmQlMjBjZXJlbW9ueXxlbnwxfHx8fDE3NTYxMDgyNzR8MA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Science Award'
      },
      {
        id: '2',
        title: 'Faculty Member Dr. Aswita Career Elected to National Academy',
        image: 'https://images.unsplash.com/photo-1707109463060-01639811f833?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYWN1bHR5JTIwbmF0aW9uYWwlMjBhY2FkZW15JTIwc2NpZW5jZXxlbnwxfHx8fDE3NTYxMDgyODh8MA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'National Academy'
      },
      {
        id: '3',
        title: 'Professor Newton Grant Hammond for Contributions to Literature',
        image: 'https://images.unsplash.com/photo-1719898803192-61d43c8e86a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwYWNhZGVtaWMlMjBqb3VybmFsJTIwcHVibGljYXRpb258ZW58MXx8fHwxNzU2MTA4Mjg1fDA&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Literature'
      },
      {
        id: '4',
        title: 'Dr. Evelyn Reed Awarded Prestigious Research Grant',
        image: 'https://images.unsplash.com/photo-1705727210721-961cc64a6895?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY2FkZW1pYyUyMGFjaGlldmVtZW50JTIwcmVzZWFyY2glMjBsYWJvcmF0b3J5fGVufDF8fHx8MTc1NjEwODI2NXww&ixlib=rb-4.1.0&q=80&w=400',
        category: 'Research Grant'
      }
    ]
  };

  const achievements = mockAchievements[activeTab] || [];

  // Filter achievements if needed
  const filteredAchievements = achievements.filter(achievement => {
    // Add filtering logic here based on filters
    return true;
  });

  if (filteredAchievements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements found</h3>
        <p className="text-gray-500">
          {Object.keys(filters).some(key => filters[key]) 
            ? 'Try adjusting your filters.'
            : `No ${activeTab} achievements have been added yet.`
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-20">
      {filteredAchievements.map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} />
      ))}
    </div>
  );
}