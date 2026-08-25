/**
 * Department name mappings — single source of truth.
 *
 * Previously duplicated 4× across DashboardPage.tsx.
 * All components should import from here instead of maintaining local copies.
 */

/** Full department name → short abbreviation for chart labels */
const DEPARTMENT_SHORT_NAMES: Record<string, string> = {
  'Computer Science and Engineering': 'CSE',
  'Civil Engineering': 'Civil Eng',
  'Electrical Engineering': 'EEE',
  'Electronics and Communication Engineering': 'ECE',
  'Mechanical Engineering': 'Mech',
  'Artificial Intelligence and Data Science': 'AI & DS',
  'Electronics': 'ECE',
  'Other': 'Other',
};

/**
 * Convert a full department name to its short chart-friendly abbreviation.
 * If no mapping exists, truncates to `maxLen` characters.
 */
export function getDepartmentShortName(fullName: string, maxLen: number = 10): string {
  return DEPARTMENT_SHORT_NAMES[fullName] || (
    fullName.length > maxLen ? fullName.substring(0, maxLen) + '...' : fullName
  );
}

/** Standard department list used for fallback radar chart data */
export const STANDARD_DEPARTMENTS: { department: string; score: number }[] = [
  { department: 'Civil Eng', score: 85 },
  { department: 'CSE', score: 92 },
  { department: 'ECE', score: 78 },
  { department: 'Mech', score: 88 },
  { department: 'EEE', score: 81 },
  { department: 'AI & DS', score: 95 },
];

/** Fallback department list for dropdowns when no DB data is available */
export const FALLBACK_DEPARTMENTS: string[] = [
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence and Data Science',
];

/** Fallback batch list for dropdowns when no DB data is available */
export const FALLBACK_BATCHES: string[] = [
  '2020-21',
  '2021-22',
  '2022-23',
  '2023-24',
  '2024-25',
];
