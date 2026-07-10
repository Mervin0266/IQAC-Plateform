// Search index for all pages and content in the IQAC platform
export interface SearchItem {
  id: string;
  title: string;
  keywords: string[];
  page: string;
  category: string;
  description?: string;
}

export const searchIndex: SearchItem[] = [
  // Dashboard
  {
    id: 'dashboard',
    title: 'Dashboard',
    keywords: ['home', 'overview', 'main', 'summary', 'dashboard'],
    page: 'dashboard',
    category: 'Main',
    description: 'Main dashboard with overview and statistics'
  },
  
  // Achievements
  {
    id: 'achievements',
    title: 'Achievements',
    keywords: ['achievements', 'awards', 'recognition', 'accomplishments'],
    page: 'achievements',
    category: 'Records',
    description: 'Track institutional achievements and awards'
  },
  
  // Course Files / Documentation
  {
    id: 'course-files',
    title: 'Course Files',
    keywords: ['course', 'files', 'documentation', 'documents', 'syllabus', 'materials'],
    page: 'course-files',
    category: 'Academic',
    description: 'Course files and documentation repository'
  },
  
  // NAAC
  {
    id: 'naac',
    title: 'NAAC Accreditation',
    keywords: ['naac', 'accreditation', 'assessment', 'quality'],
    page: 'naac',
    category: 'Accreditation',
    description: 'NAAC accreditation and assessment'
  },
  
  // NBA
  {
    id: 'nba',
    title: 'NBA Tracking',
    keywords: ['nba', 'tracking', 'board', 'national'],
    page: 'nba',
    category: 'Accreditation',
    description: 'NBA tracking and compliance'
  },
  
  // Event Logs
  {
    id: 'event-logs',
    title: 'Event Logs and Report',
    keywords: ['event', 'logs', 'report', 'activities', 'calendar'],
    page: 'event-logs',
    category: 'Management',
    description: 'Event logs and reporting system'
  },
  
  // User Roles
  {
    id: 'user-roles',
    title: 'User Roles',
    keywords: ['user', 'roles', 'permissions', 'access', 'users', 'management'],
    page: 'user-roles',
    category: 'Administration',
    description: 'User roles and permissions management'
  },
  
  // Research and Innovation - Main
  {
    id: 'research-innovation',
    title: 'Research and Innovation',
    keywords: ['research', 'innovation', 'projects', 'publications', 'patents'],
    page: 'research-innovation',
    category: 'Research',
    description: 'Research projects, publications, and innovation'
  },
  
  // Strategic Plan
  {
    id: 'strategic-plan',
    title: 'Strategic Plan',
    keywords: ['strategic', 'plan', 'planning', 'goals', 'objectives'],
    page: 'strategic-plan',
    category: 'Planning',
    description: 'Strategic planning and objectives'
  },
  
  // Rankings - Main
  {
    id: 'ranking',
    title: 'Rankings',
    keywords: ['ranking', 'rankings', 'nirf', 'the', 'qs', 'india today'],
    page: 'ranking',
    category: 'Rankings',
    description: 'University rankings and scores'
  },
  
  // Rankings - NIRF
  {
    id: 'ranking-nirf',
    title: 'NIRF Ranking',
    keywords: ['nirf', 'national', 'institutional', 'framework', 'ranking'],
    page: 'ranking',
    category: 'Rankings',
    description: 'NIRF ranking details and scores'
  },
  
  // Rankings - India Today MDRA
  {
    id: 'ranking-india-today',
    title: 'India Today MDRA Ranking',
    keywords: ['india today', 'mdra', 'magazine', 'ranking', 'engineering', 'colleges'],
    page: 'ranking',
    category: 'Rankings',
    description: 'India Today-MDRA engineering college rankings'
  },
  
  // Rankings - THE
  {
    id: 'ranking-the',
    title: 'THE World University Rankings',
    keywords: ['the', 'times', 'higher', 'education', 'world', 'ranking'],
    page: 'ranking',
    category: 'Rankings',
    description: 'Times Higher Education world rankings'
  },
  
  // Rankings - QS
  {
    id: 'ranking-qs',
    title: 'QS World University Rankings',
    keywords: ['qs', 'quacquarelli', 'symonds', 'world', 'ranking'],
    page: 'ranking',
    category: 'Rankings',
    description: 'QS world university rankings'
  },
  
  // Research sub-pages
  {
    id: 'patents',
    title: 'Patents',
    keywords: ['patents', 'intellectual property', 'innovations', 'filing'],
    page: 'patents',
    category: 'Research',
    description: 'Patent management and tracking'
  },
  
  {
    id: 'publications',
    title: 'Publications',
    keywords: ['publications', 'papers', 'journals', 'articles', 'research papers'],
    page: 'publications',
    category: 'Research',
    description: 'Research publications and papers'
  },
  
  {
    id: 'placements',
    title: 'Placements',
    keywords: ['placements', 'jobs', 'internships', 'recruitment', 'careers'],
    page: 'placements',
    category: 'Research',
    description: 'Placement and internship records'
  },
  
  {
    id: 'incubations',
    title: 'Incubations',
    keywords: ['incubations', 'startups', 'entrepreneurship', 'business'],
    page: 'incubations',
    category: 'Research',
    description: 'Incubation center and startup support'
  },
  
  {
    id: 'industry-connects',
    title: 'Industry Connects',
    keywords: ['industry', 'connects', 'partnerships', 'collaboration', 'corporate'],
    page: 'industry-connects',
    category: 'Research',
    description: 'Industry partnerships and collaborations'
  },
  
  {
    id: 'consultancy-projects',
    title: 'Consultancy Projects',
    keywords: ['consultancy', 'projects', 'consulting', 'services'],
    page: 'consultancy-projects',
    category: 'Research',
    description: 'Consultancy projects and services'
  },
  
  {
    id: 'international-interactions',
    title: 'International Interactions',
    keywords: ['international', 'interactions', 'global', 'mou', 'collaboration'],
    page: 'international-interactions',
    category: 'Research',
    description: 'International collaborations and MOUs'
  },
  
  {
    id: 'centre-excellence',
    title: 'Centre of Excellence',
    keywords: ['centre', 'excellence', 'coe', 'specialized', 'research'],
    page: 'centre-excellence',
    category: 'Research',
    description: 'Centers of excellence and specialized research'
  },
  
  // Department-specific
  {
    id: 'cse-department',
    title: 'Computer Science and Engineering',
    keywords: ['cse', 'computer science', 'engineering', 'department'],
    page: 'ranking',
    category: 'Department',
    description: 'CSE Department information'
  },
  
  // Specific features
  {
    id: 'faculty',
    title: 'Faculty',
    keywords: ['faculty', 'professors', 'teachers', 'staff'],
    page: 'user-roles',
    category: 'People',
    description: 'Faculty and staff information'
  },
  
  {
    id: 'students',
    title: 'Students',
    keywords: ['students', 'scholars', 'undergraduate', 'postgraduate'],
    page: 'user-roles',
    category: 'People',
    description: 'Student information and management'
  }
];

// Search function
export function searchItems(query: string): (SearchItem & { score: number })[] {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const lowerQuery = query.toLowerCase().trim();
  const words = lowerQuery.split(' ').filter(w => w.length > 0);
  
  return searchIndex
    .map(item => {
      let score = 0;
      
      // Exact title match (highest priority)
      if (item.title.toLowerCase() === lowerQuery) {
        score += 100;
      }
      
      // Title starts with query
      if (item.title.toLowerCase().startsWith(lowerQuery)) {
        score += 50;
      }
      
      // Title contains query
      if (item.title.toLowerCase().includes(lowerQuery)) {
        score += 25;
      }
      
      // Keywords match
      item.keywords.forEach(keyword => {
        if (keyword === lowerQuery) {
          score += 40;
        } else if (keyword.startsWith(lowerQuery)) {
          score += 20;
        } else if (keyword.includes(lowerQuery)) {
          score += 10;
        }
      });
      
      // Multi-word search
      words.forEach(word => {
        if (item.title.toLowerCase().includes(word)) {
          score += 5;
        }
        item.keywords.forEach(keyword => {
          if (keyword.includes(word)) {
            score += 3;
          }
        });
      });
      
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8); // Return top 8 results
}
