const sections = require('../../public-report-sections.json');

function cleanText(input, maximum, required = false) {
  if (typeof input !== 'string' || input.trim().length > maximum || (required && !input.trim())) {
    throw new Error('A required field is missing or exceeds its length limit.');
  }
  return input.trim();
}

function sourceUrl(input) {
  const value = cleanText(input, 500);
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use a public HTTPS source link.');
  return url.href;
}

function validateReport(section, input) {
  const { source, url, metrics, records } = input ?? {};
  if (!metrics || Array.isArray(metrics) || typeof metrics !== 'object' || !Array.isArray(records) || records.length > 100) {
    throw new Error('Use valid metrics and at most 100 public records per period.');
  }

  const cleanedMetrics = {};
  for (const [key, value] of Object.entries(metrics)) {
    const fields = sections[section].metrics;
    if (!Object.hasOwn(fields, key)) throw new Error('Unknown metric.');
    if (value === '') continue;
    const type = fields[key];
    if (type === 'text' || type === 'date') {
      const text = cleanText(value, 30, true);
      if (type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(text) || new Date(text).toISOString().slice(0, 10) !== text)) {
        throw new Error('Use a valid date.');
      }
      cleanedMetrics[key] = text;
    } else {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
          (type === 'count' && !Number.isSafeInteger(value)) || (key === 'NAAC CGPA' && value > 4)) {
        throw new Error('Use a valid nonnegative number for each metric.');
      }
      cleanedMetrics[key] = value;
    }
  }
  if (!Object.keys(cleanedMetrics).length && !records.length) throw new Error('Enter at least one metric or public record.');

  return {
    source: cleanText(source, 160, true),
    url: sourceUrl(url),
    metrics: cleanedMetrics,
    records: records.map(record => ({
      title: cleanText(record?.title, 160, true),
      category: cleanText(record?.category, 80),
      detail: cleanText(record?.detail, 600),
      url: sourceUrl(record?.url),
    })),
  };
}

function placementSummary(rows) {
  const offers = rows.filter(row => row.placementType === 'placement');
  const packages = offers.map(row => Number(row.package)).filter(value => value > 0 && Number.isFinite(value)).sort((a, b) => a - b);
  const midpoint = Math.floor(packages.length / 2);
  const metrics = {
    'Students with full-time offers': new Set(offers.map(row => row.studentId)).size,
    'Recruiters': new Set(offers.map(row => row.company.trim().toLowerCase())).size,
  };
  if (packages.length) {
    metrics['Average package'] = packages.reduce((sum, value) => sum + value, 0) / packages.length;
    metrics['Median package'] = packages.length % 2 ? packages[midpoint] : (packages[midpoint - 1] + packages[midpoint]) / 2;
    metrics['Highest package'] = packages[packages.length - 1];
  }
  return metrics;
}

module.exports = { validateReport, placementSummary };
