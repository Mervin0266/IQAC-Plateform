/**
 * Calendar-aware project duration calculation helper for frontend display and inputs.
 * Computes exact difference in years, months, and days between Start Date and End Date.
 */
export interface DurationResult {
  formatted: string;
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalDays: number;
  isValid: boolean;
  error?: string;
}

export function calculateProjectDuration(startDateStr?: string | null, endDateStr?: string | null): DurationResult {
  if (!startDateStr || !endDateStr) {
    return {
      formatted: 'Not Available',
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      totalDays: 0,
      isValid: false
    };
  }

  const startStr = String(startDateStr).trim().split('T')[0];
  const endStr = String(endDateStr).trim().split('T')[0];

  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      formatted: 'Not Available',
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      totalDays: 0,
      isValid: false,
      error: 'Invalid date format'
    };
  }

  if (end < start) {
    return {
      formatted: 'Invalid (End before Start)',
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      totalDays: 0,
      isValid: false,
      error: 'End Date cannot be earlier than Start Date'
    };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = (years * 12) + months;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let formatted = '';
  if (years > 0 && months === 0 && days === 0) {
    formatted = `${years} ${years === 1 ? 'Year' : 'Years'} (${totalMonths} Months)`;
  } else if (years > 0 && months > 0) {
    formatted = `${years} ${years === 1 ? 'Year' : 'Years'} ${months} ${months === 1 ? 'Month' : 'Months'} (${totalMonths} Months)`;
  } else if (years > 0) {
    formatted = `${years} ${years === 1 ? 'Year' : 'Years'} (${totalMonths} Months)`;
  } else if (months > 0) {
    formatted = `${months} ${months === 1 ? 'Month' : 'Months'}`;
    if (days > 0) {
      formatted += ` ${days} ${days === 1 ? 'Day' : 'Days'}`;
    }
  } else {
    formatted = `${totalDays} ${totalDays === 1 ? 'Day' : 'Days'}`;
  }

  return {
    formatted,
    years,
    months,
    days,
    totalMonths,
    totalDays,
    isValid: true
  };
}

/**
 * Derives 4-digit Sanction Year from Sanction Date string.
 */
export function deriveSanctionYear(sanctionDateStr?: string | null): number | null {
  if (!sanctionDateStr || !String(sanctionDateStr).trim()) return null;
  const cleanDate = String(sanctionDateStr).trim().split('T')[0];
  const d = new Date(cleanDate);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear();
}

/**
 * Derives 4-digit Consultancy Start Year from Start Date string.
 */
export function deriveConsultancyStartYear(startDateStr?: string | null): number | null {
  if (!startDateStr || !String(startDateStr).trim()) return null;
  const cleanDate = String(startDateStr).trim().split('T')[0];
  const d = new Date(cleanDate);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear();
}

export const VALID_CONSULTANCY_PROJECT_STATUSES = ['Sanctioned', 'On Going', 'Completed'] as const;
export type ConsultancyProjectStatusType = typeof VALID_CONSULTANCY_PROJECT_STATUSES[number];

