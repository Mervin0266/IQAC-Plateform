const { ResearchMetric } = require('../models');

// @desc    Get research metrics
// @route   GET /api/research-metrics
exports.getMetrics = async (req, res) => {
  try {
    const { academicYear, periodType, department } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (periodType) filter.periodType = periodType;
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
      message: 'Server error retrieving metrics.'
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
      const { academicYear, periodType, periodValue, department } = item;
      
      if (!academicYear || !periodType || !periodValue || !department) {
        continue; // skip invalid entries
      }

      // Find existing
      let record = await ResearchMetric.findOne({
        where: {
          academicYear,
          periodType,
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
        await record.update(fieldValues);
      } else {
        // Create
        record = await ResearchMetric.create({
          academicYear,
          periodType,
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
      message: 'Server error saving metrics.'
    });
  }
};
