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

/**
 * Validates and derives 4-digit Consultancy Start Year from Start Date.
 * If both are provided, ensures they match.
 */
function deriveAndValidateConsultancyStartYear(startDateStr, manualStartYear) {
  let derivedYear = null;

  if (startDateStr && String(startDateStr).trim()) {
    const cleanDate = String(startDateStr).trim().split('T')[0];
    const parsedDate = new Date(cleanDate);
    if (!isNaN(parsedDate.getTime())) {
      derivedYear = parsedDate.getFullYear();
    }
  }

  let finalYear = null;
  if (derivedYear) {
    finalYear = derivedYear;
    if (manualStartYear !== undefined && manualStartYear !== null && String(manualStartYear).trim() !== '') {
      const parsedManual = parseInt(String(manualStartYear).trim(), 10);
      if (!isNaN(parsedManual) && parsedManual !== derivedYear) {
        return {
          valid: false,
          error: `Consultancy Start Year (${parsedManual}) does not match Start Date year (${derivedYear}).`,
          startYear: null
        };
      }
    }
  } else if (manualStartYear !== undefined && manualStartYear !== null && String(manualStartYear).trim() !== '') {
    const str = String(manualStartYear).trim();
    if (!/^\d{4}$/.test(str)) {
      return {
        valid: false,
        error: 'Consultancy Start Year must be a valid 4-digit calendar year (e.g. 2024).',
        startYear: null
      };
    }
    const y = parseInt(str, 10);
    if (y < 1950 || y > 2100) {
      return {
        valid: false,
        error: 'Consultancy Start Year must be between 1950 and 2100.',
        startYear: null
      };
    }
    finalYear = y;
  }

  return {
    valid: true,
    startYear: finalYear,
    legacyYear: finalYear ? `${finalYear - 1}-${finalYear}` : (manualStartYear ? String(manualStartYear) : '2024-2025')
  };
}

const VALID_CONSULTANCY_PROJECT_STATUSES = ['Sanctioned', 'On Going', 'Completed'];

/**
 * Normalizes and validates Consultancy Project Status.
 * Allowed values are strictly: 'Sanctioned', 'On Going', 'Completed'.
 */
function normalizeConsultancyProjectStatus(status) {
  if (!status) return null;
  const s = String(status).trim();
  if (VALID_CONSULTANCY_PROJECT_STATUSES.includes(s)) return s;
  const lower = s.toLowerCase();
  if (lower === 'ongoing' || lower === 'on going' || lower === 'on-going') return 'On Going';
  if (lower === 'sanctioned') return 'Sanctioned';
  if (lower === 'completed') return 'Completed';
  return null;
}

/**
 * Safely extracts Agency Name, Email and Phone number from combined legacy agency string.
 */
function parseAgencyDetails(rawAgencyText) {
  if (!rawAgencyText || typeof rawAgencyText !== 'string') {
    return { agencyName: '', email: null, phone: null };
  }
  const text = rawAgencyText.trim();
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1] : null;

  const phoneMatch = text.match(/(?:ph(?:one)?|tel|mob(?:ile)?|contact)?[:\s-]*(\+?[0-9]{1,4}[\s-]?[0-9]{2,5}[\s-]?[0-9]{4,8})/i);
  const phone = phoneMatch ? phoneMatch[1].trim() : null;

  let agencyName = text;
  if (email) {
    agencyName = agencyName.replace(email, '');
  }
  if (phone) {
    agencyName = agencyName.replace(phone, '');
  }
  agencyName = agencyName
    .replace(/(?:contact|ph|phone|tel|email|mobile)[\s:]*/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/^[\s,;-]+|[\s,;-]+$/g, '')
    .trim();

  return {
    agencyName: agencyName || text,
    email,
    phone
  };
}

module.exports = {
  calculateProjectDuration,
  deriveAndValidateSanctionYear,
  deriveAndValidateConsultancyStartYear,
  normalizeConsultancyProjectStatus,
  parseAgencyDetails,
  VALID_CONSULTANCY_PROJECT_STATUSES
};

