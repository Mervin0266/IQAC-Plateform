/**
 * Placement mock data — extracted from DashboardPage.tsx.
 *
 * ~130 lines of hardcoded mock data that were previously inline in the component.
 * Used as fallback when no live database data is available.
 */

import type { SingleBatchStats, DepartmentPlacementData, BatchOverallData } from '../types/dashboard';

/** Fallback department-wise placement data */
export const FALLBACK_DEPT_DATA: DepartmentPlacementData[] = [
  { department: 'CSE', placed: 172, total: 180, rate: 95.6, avgPackage: 12.5 },
  { department: 'ECE', placed: 142, total: 150, rate: 94.7, avgPackage: 9.8 },
  { department: 'EEE', placed: 110, total: 120, rate: 91.7, avgPackage: 8.5 },
  { department: 'Mech', placed: 125, total: 140, rate: 89.3, avgPackage: 7.8 },
  { department: 'Civil Eng', placed: 98, total: 110, rate: 89.1, avgPackage: 6.5 },
  { department: 'AI & DS', placed: 87, total: 90, rate: 96.7, avgPackage: 13.2 },
];

/** Fallback overall batch trend data */
export const FALLBACK_OVERALL_DATA: BatchOverallData[] = [
  { batch: '2020-21', placed: 980, offers: 1120, avgPackage: 6.8 },
  { batch: '2021-22', placed: 1050, offers: 1210, avgPackage: 7.4 },
  { batch: '2022-23', placed: 1140, offers: 1320, avgPackage: 7.9 },
  { batch: '2023-24', placed: 1210, offers: 1410, avgPackage: 8.2 },
  { batch: '2024-25', placed: 1245, offers: 1456, avgPackage: 8.5 },
];

/** Mock single-batch stats keyed by batch year */
export const MOCK_SINGLE_BATCH_DATA: Record<string, SingleBatchStats> = {
  '2020-21': {
    totalPlaced: 980,
    totalInterns: 820,
    highestPackage: 24.5,
    lowestPackage: 3.5,
    avgPackage: 6.8,
    topEmployers: [
      { name: 'TCS', count: 180 },
      { name: 'Wipro', count: 140 },
      { name: 'Infosys', count: 160 },
      { name: 'Cognizant', count: 110 },
      { name: 'Accenture', count: 95 },
    ],
    salaryDistribution: [
      { name: '< 5 LPA', value: 380, fill: '#ef4444' },
      { name: '5-10 LPA', value: 450, fill: '#3b82f6' },
      { name: '10-15 LPA', value: 110, fill: '#10b981' },
      { name: '> 15 LPA', value: 40, fill: '#8b5cf6' },
    ],
    departmentBreakdown: [
      { department: 'CSE', placed: 150, total: 160, rate: 94, avgPackage: 6.8 },
      { department: 'ECE', placed: 130, total: 145, rate: 90, avgPackage: 6.8 },
      { department: 'EEE', placed: 95, total: 115, rate: 83, avgPackage: 6.8 },
      { department: 'Mech', placed: 110, total: 130, rate: 85, avgPackage: 6.8 },
      { department: 'Civil Eng', placed: 85, total: 105, rate: 81, avgPackage: 6.8 },
      { department: 'AI & DS', placed: 0, total: 0, rate: 0, avgPackage: 0 },
    ],
  },
  '2021-22': {
    totalPlaced: 1050,
    totalInterns: 890,
    highestPackage: 28.0,
    lowestPackage: 3.8,
    avgPackage: 7.4,
    topEmployers: [
      { name: 'TCS', count: 195 },
      { name: 'Wipro', count: 155 },
      { name: 'Infosys', count: 175 },
      { name: 'Cognizant', count: 125 },
      { name: 'Accenture', count: 105 },
    ],
    salaryDistribution: [
      { name: '< 5 LPA', value: 340, fill: '#ef4444' },
      { name: '5-10 LPA', value: 510, fill: '#3b82f6' },
      { name: '10-15 LPA', value: 140, fill: '#10b981' },
      { name: '> 15 LPA', value: 60, fill: '#8b5cf6' },
    ],
    departmentBreakdown: [
      { department: 'CSE', placed: 160, total: 170, rate: 94, avgPackage: 7.4 },
      { department: 'ECE', placed: 135, total: 145, rate: 93, avgPackage: 7.4 },
      { department: 'EEE', placed: 100, total: 120, rate: 83, avgPackage: 7.4 },
      { department: 'Mech', placed: 115, total: 135, rate: 85, avgPackage: 7.4 },
      { department: 'Civil Eng', placed: 90, total: 110, rate: 82, avgPackage: 7.4 },
      { department: 'AI & DS', placed: 50, total: 55, rate: 91, avgPackage: 7.4 },
    ],
  },
  '2022-23': {
    totalPlaced: 1140,
    totalInterns: 950,
    highestPackage: 32.0,
    lowestPackage: 4.0,
    avgPackage: 7.9,
    topEmployers: [
      { name: 'TCS', count: 210 },
      { name: 'Amazon', count: 45 },
      { name: 'Infosys', count: 190 },
      { name: 'Cognizant', count: 135 },
      { name: 'Microsoft', count: 18 },
    ],
    salaryDistribution: [
      { name: '< 5 LPA', value: 290, fill: '#ef4444' },
      { name: '5-10 LPA', value: 580, fill: '#3b82f6' },
      { name: '10-15 LPA', value: 185, fill: '#10b981' },
      { name: '> 15 LPA', value: 85, fill: '#8b5cf6' },
    ],
    departmentBreakdown: [
      { department: 'CSE', placed: 168, total: 175, rate: 96, avgPackage: 7.9 },
      { department: 'ECE', placed: 138, total: 148, rate: 93, avgPackage: 7.9 },
      { department: 'EEE', placed: 105, total: 118, rate: 89, avgPackage: 7.9 },
      { department: 'Mech', placed: 120, total: 138, rate: 87, avgPackage: 7.9 },
      { department: 'Civil Eng', placed: 95, total: 108, rate: 88, avgPackage: 7.9 },
      { department: 'AI & DS', placed: 75, total: 80, rate: 94, avgPackage: 7.9 },
    ],
  },
  '2023-24': {
    totalPlaced: 1210,
    totalInterns: 1020,
    highestPackage: 38.5,
    lowestPackage: 4.2,
    avgPackage: 8.2,
    topEmployers: [
      { name: 'Google', count: 15 },
      { name: 'Amazon', count: 55 },
      { name: 'TCS', count: 220 },
      { name: 'Wipro', count: 180 },
      { name: 'Accenture', count: 140 },
    ],
    salaryDistribution: [
      { name: '< 5 LPA', value: 250, fill: '#ef4444' },
      { name: '5-10 LPA', value: 620, fill: '#3b82f6' },
      { name: '10-15 LPA', value: 220, fill: '#10b981' },
      { name: '> 15 LPA', value: 120, fill: '#8b5cf6' },
    ],
    departmentBreakdown: [
      { department: 'CSE', placed: 170, total: 178, rate: 96, avgPackage: 8.2 },
      { department: 'ECE', placed: 140, total: 148, rate: 95, avgPackage: 8.2 },
      { department: 'EEE', placed: 108, total: 118, rate: 92, avgPackage: 8.2 },
      { department: 'Mech', placed: 122, total: 138, rate: 88, avgPackage: 8.2 },
      { department: 'Civil Eng', placed: 96, total: 108, rate: 89, avgPackage: 8.2 },
      { department: 'AI & DS', placed: 85, total: 88, rate: 97, avgPackage: 8.2 },
    ],
  },
  '2024-25': {
    totalPlaced: 1245,
    totalInterns: 1080,
    highestPackage: 42.0,
    lowestPackage: 4.5,
    avgPackage: 8.5,
    topEmployers: [
      { name: 'Google', count: 22 },
      { name: 'Microsoft', count: 18 },
      { name: 'Amazon', count: 65 },
      { name: 'TCS', count: 235 },
      { name: 'Wipro', count: 190 },
    ],
    salaryDistribution: [
      { name: '< 5 LPA', value: 210, fill: '#ef4444' },
      { name: '5-10 LPA', value: 650, fill: '#3b82f6' },
      { name: '10-15 LPA', value: 245, fill: '#10b981' },
      { name: '> 15 LPA', value: 140, fill: '#8b5cf6' },
    ],
    departmentBreakdown: [
      { department: 'CSE', placed: 172, total: 180, rate: 96, avgPackage: 8.5 },
      { department: 'ECE', placed: 142, total: 150, rate: 95, avgPackage: 8.5 },
      { department: 'EEE', placed: 110, total: 120, rate: 92, avgPackage: 8.5 },
      { department: 'Mech', placed: 125, total: 140, rate: 89, avgPackage: 8.5 },
      { department: 'Civil Eng', placed: 98, total: 110, rate: 89, avgPackage: 8.5 },
      { department: 'AI & DS', placed: 87, total: 90, rate: 97, avgPackage: 8.5 },
    ],
  },
};

/** Mock single-department stats for when no DB data is available */
export function getMockSingleDeptStats(batchScale: number): SingleBatchStats {
  return {
    totalPlaced: Math.round(172 * batchScale),
    totalInterns: Math.round(145 * batchScale),
    highestPackage: parseFloat((32.5 * batchScale).toFixed(1)),
    lowestPackage: parseFloat((4.5 * batchScale).toFixed(1)),
    avgPackage: parseFloat((12.5 * batchScale).toFixed(1)),
    topEmployers: [
      { name: 'Google', count: Math.round(18 * batchScale) },
      { name: 'Microsoft', count: Math.round(12 * batchScale) },
      { name: 'Amazon', count: Math.round(15 * batchScale) },
      { name: 'TCS', count: Math.round(45 * batchScale) },
      { name: 'Wipro', count: Math.round(32 * batchScale) },
    ],
    salaryDistribution: [
      { name: '< 5 LPA', value: Math.round(20 * batchScale), fill: '#ef4444' },
      { name: '5-10 LPA', value: Math.round(85 * batchScale), fill: '#3b82f6' },
      { name: '10-15 LPA', value: Math.round(45 * batchScale), fill: '#10b981' },
      { name: '> 15 LPA', value: Math.round(22 * batchScale), fill: '#8b5cf6' },
    ],
  };
}

/** Static chart data — Student & Faculty achievements */
export const STUDENT_FACULTY_DATA = [
  { month: 'Jan', students: 12, faculty: 6 },
  { month: 'Feb', students: 15, faculty: 7 },
  { month: 'Mar', students: 11, faculty: 8 },
  { month: 'Apr', students: 17, faculty: 7 },
  { month: 'May', students: 13, faculty: 8 },
  { month: 'Jun', students: 18, faculty: 8 },
  { month: 'Jul', students: 16, faculty: 9 },
  { month: 'Aug', students: 20, faculty: 10 },
];

/** Static chart data — University Highlights */
export const UNIVERSITY_HIGHLIGHTS_DATA = [
  { month: 'Jan', publications: 12, events: 8, awards: 5 },
  { month: 'Feb', publications: 15, events: 10, awards: 7 },
  { month: 'Mar', publications: 11, events: 9, awards: 4 },
  { month: 'Apr', publications: 14, events: 12, awards: 8 },
  { month: 'May', publications: 9, events: 7, awards: 6 },
  { month: 'Jun', publications: 17, events: 14, awards: 9 },
  { month: 'Jul', publications: 19, events: 11, awards: 7 },
  { month: 'Aug', publications: 22, events: 15, awards: 10 },
];

/** Static chart data — Annual Reports */
export const ANNUAL_REPORTS_DATA = [
  { month: 'Jan', completed: 2, pending: 1 },
  { month: 'Feb', completed: 2, pending: 1 },
  { month: 'Mar', completed: 3, pending: 2 },
  { month: 'Apr', completed: 2, pending: 1 },
  { month: 'May', completed: 3, pending: 1 },
  { month: 'Jun', completed: 3, pending: 2 },
  { month: 'Jul', completed: 4, pending: 1 },
  { month: 'Aug', completed: 3, pending: 2 },
];
