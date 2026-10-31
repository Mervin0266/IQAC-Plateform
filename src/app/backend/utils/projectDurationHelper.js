'use strict';

/**
 * Calendar-aware project duration calculation helper.
 * Computes exact difference in years, months, and days between Start Date and End Date.
 */
function calculateProjectDuration(startDateStr, endDateStr) {
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
    // Get last day of previous month
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

  // Build human-friendly readable duration label
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
 * Validates and derives 4-digit Sanction Year from Sanction Date.
 * If both are provided, ensures they match.
 */
function deriveAndValidateSanctionYear(sanctionDateStr, manualSanctionYear) {
  let derivedYear = null;

  if (sanctionDateStr && String(sanctionDateStr).trim()) {
    const cleanDate = String(sanctionDateStr).trim().split('T')[0];
    const parsedDate = new Date(cleanDate);
    if (!isNaN(parsedDate.getTime())) {
      derivedYear = parsedDate.getFullYear();
    }
  }

  let finalYear = null;
  if (derivedYear) {
    finalYear = derivedYear;
    // If manual sanction year is also provided, validate match
    if (manualSanctionYear !== undefined && manualSanctionYear !== null && String(manualSanctionYear).trim() !== '') {
      const parsedManual = parseInt(String(manualSanctionYear).trim(), 10);
      if (!isNaN(parsedManual) && parsedManual !== derivedYear) {
        return {
          valid: false,
          error: `Sanction Year (${parsedManual}) does not match Sanction Date year (${derivedYear}).`,
          sanctionYear: null
        };
      }
    }
  } else if (manualSanctionYear !== undefined && manualSanctionYear !== null && String(manualSanctionYear).trim() !== '') {
    const str = String(manualSanctionYear).trim();
    if (!/^\d{4}$/.test(str)) {
      return {
        valid: false,
        error: 'Sanction Year must be a valid 4-digit calendar year (e.g. 2024).',
        sanctionYear: null
      };
    }
    const y = parseInt(str, 10);
    if (y < 1950 || y > 2100) {
      return {
        valid: false,
        error: 'Sanction Year must be between 1950 and 2100.',
        sanctionYear: null
      };
    }
    finalYear = y;
  }

  return {
    valid: true,
    sanctionYear: finalYear,
    academicYear: finalYear ? `${finalYear - 1}-${finalYear}` : 'Pending Sanction'
  };
}

module.exports = {
  calculateProjectDuration,
  deriveAndValidateSanctionYear
};
