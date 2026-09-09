const { Op } = require('sequelize');
const { ResearchMetric } = require('../models');

const normalizePeriodType = (type) => {
  if (!type) return 'academic_year';
  const t = String(type).trim().toLowerCase();
  if (t === 'yearly' || t === 'academic_year' || t === 'year') return 'academic_year';
  if (t === 'monthly' || t === 'month') return 'month';
  return t;
};

// @desc    Get research metrics
// @route   GET /api/research-metrics
exports.getMetrics = async (req, res) => {
  try {
    const { academicYear, periodType, department } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (periodType) {
      const norm = normalizePeriodType(periodType);
      if (norm === 'academic_year') {
        filter.periodType = { [Op.in]: ['academic_year', 'yearly'] };
      } else if (norm === 'month') {
        filter.periodType = { [Op.in]: ['month', 'monthly'] };
      } else {
        filter.periodType = periodType;
      }
    }
    if (department) filter.department = department;

    const data = await ResearchMetric.findAll({
      where: filter,
      order: [
        ['periodValue', 'ASC'],
        ['department', 'ASC']
      ]
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get research metrics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error retrieving metrics.'
    });
  }
};

// @desc    Bulk upsert research metrics
// @route   POST /api/research-metrics/bulk
exports.bulkUpsertMetrics = async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!Array.isArray(metrics)) {
      return res.status(400).json({
        success: false,
        message: 'Metrics array is required.'
      });
    }

    const savedRecords = [];
    for (const item of metrics) {
      const { academicYear, periodValue, department } = item;
      const rawPeriodType = item.periodType;
      
      if (!academicYear || !rawPeriodType || !periodValue || !department) {
        continue; // skip invalid entries
      }

      const normPeriodType = normalizePeriodType(rawPeriodType);

      // Find existing (check both normalized and raw)
      let record = await ResearchMetric.findOne({
        where: {
          academicYear,
          periodType: {
            [Op.in]: [
              normPeriodType,
              rawPeriodType,
              normPeriodType === 'academic_year' ? 'yearly' : 'monthly'
            ]
          },
          periodValue,
          department
        }
      });

      const fieldValues = {
        books: parseInt(item.books, 10) || 0,
        chapters: parseInt(item.chapters, 10) || 0,
        scopusJournals: parseInt(item.scopusJournals, 10) || 0,
        nationalJournals: parseInt(item.nationalJournals, 10) || 0,
        internationalJournals: parseInt(item.internationalJournals, 10) || 0,
        citations: parseInt(item.citations, 10) || 0,
        patentsIndian: parseInt(item.patentsIndian, 10) || 0,
        patentsInternational: parseInt(item.patentsInternational, 10) || 0,
        conferencesNational: parseInt(item.conferencesNational, 10) || 0,
        conferencesInternational: parseInt(item.conferencesInternational, 10) || 0,
        consultancyCount: parseInt(item.consultancyCount, 10) || 0,
        consultancyAmount: parseFloat(item.consultancyAmount) || 0.00,
        seedMoneyCount: parseInt(item.seedMoneyCount, 10) || 0,
        seedMoneyAmount: parseFloat(item.seedMoneyAmount) || 0.00,
        externalProjectsCount: parseInt(item.externalProjectsCount, 10) || 0,
        externalProjectsAmount: parseFloat(item.externalProjectsAmount) || 0.00
      };

      if (record) {
        // Update
        await record.update({
          periodType: normPeriodType,
          ...fieldValues
        });
      } else {
        // Create
        record = await ResearchMetric.create({
          academicYear,
          periodType: normPeriodType,
          periodValue,
          department,
          ...fieldValues
        });
      }
      savedRecords.push(record);
    }

    res.json({
      success: true,
      message: `Successfully saved ${savedRecords.length} records.`,
      data: savedRecords
    });
  } catch (error) {
    console.error('Bulk upsert research metrics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error saving metrics.'
    });
  }
};

// @desc    Clear all research metrics
// @route   DELETE /api/research-metrics/clear-all
// @access  Private (Admin/Coordinator/HOD)
exports.clearAllMetrics = async (req, res) => {
  try {
    const deletedCount = await ResearchMetric.destroy({ where: {} });
    res.json({
      success: true,
      message: `All research metrics (${deletedCount}) cleared successfully`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all research metrics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

