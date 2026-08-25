const { 
  AccreditationFramework, 
  AccreditationParameter, 
  ParameterDataSubmission, 
  User, 
  Document 
} = require('../models');

/**
 * @desc Get all accreditation frameworks with optional filters
 * @route GET /api/parameter-master/frameworks
 */
exports.getFrameworks = async (req, res) => {
  try {
    const { category, academicYear, status } = req.query;
    const where = {};
    if (category) where.category = category;
    if (academicYear) where.academicYear = academicYear;
    if (status) where.status = status;

    let frameworks = await AccreditationFramework.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: AccreditationParameter, as: 'parameters', attributes: ['id', 'metricId', 'weightage'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Default Seed Fallback if table is empty
    if (frameworks.length === 0) {
      const defaultFramework = await AccreditationFramework.create({
        code: 'NAAC_SSR_UNIV_2025',
        name: 'NAAC Institutional SSR (University)',
        category: 'NAAC',
        academicYear: '2024-2025',
        totalWeightage: 1000,
        status: 'Active',
        description: 'Standard NAAC 7-Criteria Assessment Manual for Deemed Universities.',
        createdBy: req.user.id
      });

      const nirfFramework = await AccreditationFramework.create({
        code: 'NIRF_ENGG_2025',
        name: 'NIRF National Ranking (Engineering)',
        category: 'NIRF',
        academicYear: '2024-2025',
        totalWeightage: 100,
        status: 'Active',
        description: 'NIRF 5 Pillar Evaluation (TLR, RPC, GO, OI, PR).',
        createdBy: req.user.id
      });

      // Seed core parameters
      const sampleParams = [
        {
          frameworkId: defaultFramework.id,
          criterionNumber: 'Criterion 1',
          criterionTitle: 'Curricular Aspects',
          metricId: '1.1.1',
          metricTitle: 'Curricula developed and implemented have relevance to local, national, regional and global developmental needs.',
          metricType: 'Qualitative',
          weightage: 20.0,
          unitOfMeasure: 'Score',
          benchmarkValue: 20
        },
        {
          frameworkId: defaultFramework.id,
          criterionNumber: 'Criterion 2',
          criterionTitle: 'Teaching-Learning and Evaluation',
          metricId: '2.1.2',
          metricTitle: 'Percentage of seats filled against reserved categories during the last five years.',
          metricType: 'Quantitative',
          weightage: 25.0,
          unitOfMeasure: 'Percentage',
          benchmarkValue: 100
        },
        {
          frameworkId: defaultFramework.id,
          criterionNumber: 'Criterion 3',
          criterionTitle: 'Research, Innovations and Extension',
          metricId: '3.2.1',
          metricTitle: 'Extramural funding for Research (Grants sponsored by the non-government sources).',
          metricType: 'Quantitative',
          weightage: 35.0,
          unitOfMeasure: 'Lakhs (INR)',
          benchmarkValue: 50
        },
        {
          frameworkId: defaultFramework.id,
          criterionNumber: 'Criterion 5',
          criterionTitle: 'Student Support and Progression',
          metricId: '5.2.1',
          metricTitle: 'Percentage of placement of outgoing students and students progressing to higher education.',
          metricType: 'Quantitative',
          weightage: 40.0,
          unitOfMeasure: 'Percentage',
          benchmarkValue: 90
        },
        {
          frameworkId: nirfFramework.id,
          criterionNumber: 'Pillar 1',
          criterionTitle: 'Teaching, Learning & Resources (TLR)',
          metricId: 'TLR-SS',
          metricTitle: 'Student Strength including Doctoral Students (Approved Intake vs Enrolled).',
          metricType: 'Quantitative',
          weightage: 20.0,
          unitOfMeasure: 'Ratio',
          benchmarkValue: 1.0
        },
        {
          frameworkId: nirfFramework.id,
          criterionNumber: 'Pillar 2',
          criterionTitle: 'Research and Professional Practice (RPC)',
          metricId: 'RPC-PU',
          metricTitle: 'Combined metric for Publications in Scopus & Web of Science indexed journals.',
          metricType: 'Quantitative',
          weightage: 35.0,
          unitOfMeasure: 'Count',
          benchmarkValue: 200
        }
      ];

      await AccreditationParameter.bulkCreate(sampleParams);

      frameworks = await AccreditationFramework.findAll({
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          { model: AccreditationParameter, as: 'parameters', attributes: ['id', 'metricId', 'weightage'] }
        ]
      });
    }

    res.status(200).json({ success: true, count: frameworks.length, data: frameworks });
  } catch (error) {
    console.error('Error fetching frameworks:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving frameworks.' });
  }
};

/**
 * @desc Create new accreditation framework
 * @route POST /api/parameter-master/frameworks
 */
exports.createFramework = async (req, res) => {
  try {
    const { code, name, category, academicYear, totalWeightage, description } = req.body;
    const framework = await AccreditationFramework.create({
      code,
      name,
      category,
      academicYear,
      totalWeightage: totalWeightage || 1000,
      description,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: framework });
  } catch (error) {
    console.error('Error creating framework:', error);
    res.status(400).json({ success: false, message: error.message || 'Invalid framework payload.' });
  }
};

/**
 * @desc Get parameters by framework with departmental submission data
 * @route GET /api/parameter-master/parameters
 */
exports.getParameters = async (req, res) => {
  try {
    const { frameworkId, criterionNumber, metricType, department, academicYear } = req.query;
    const where = {};
    if (frameworkId) where.frameworkId = frameworkId;
    if (criterionNumber) where.criterionNumber = criterionNumber;
    if (metricType) where.metricType = metricType;

    const submissionWhere = {};
    if (department && department !== 'all') {
      submissionWhere.department = department;
    }
    if (academicYear) {
      submissionWhere.academicYear = academicYear;
    }

    const parameters = await AccreditationParameter.findAll({
      where,
      include: [
        { model: AccreditationFramework, as: 'framework', attributes: ['id', 'name', 'category', 'academicYear'] },
        {
          model: ParameterDataSubmission,
          as: 'submissions',
          where: Object.keys(submissionWhere).length > 0 ? submissionWhere : undefined,
          required: false,
          include: [
            { model: User, as: 'submitter', attributes: ['id', 'name'] },
            { model: Document, as: 'evidenceDocument', attributes: ['id', 'title', 'fileUrl'] }
          ]
        }
      ],
      order: [['criterionNumber', 'ASC'], ['metricId', 'ASC']]
    });

    res.status(200).json({ success: true, count: parameters.length, data: parameters });
  } catch (error) {
    console.error('Error fetching parameters:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving parameters.' });
  }
};

/**
 * @desc Create an accreditation parameter under a framework
 * @route POST /api/parameter-master/parameters
 */
exports.createParameter = async (req, res) => {
  try {
    const parameter = await AccreditationParameter.create(req.body);
    res.status(201).json({ success: true, data: parameter });
  } catch (error) {
    console.error('Error creating parameter:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc Submit or update departmental actual data for a metric
 * @route POST /api/parameter-master/submissions
 */
exports.submitParameterData = async (req, res) => {
  try {
    const { parameterId, department, academicYear, actualValue, qualitativeResponse, evidenceDocumentId } = req.body;

    // RBAC department check
    if (!['admin', 'authority'].includes(req.user.role)) {
      const userDept = (req.user.department || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const reqDept = (department || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (userDept && reqDept && userDept !== reqDept) {
        return res.status(403).json({ success: false, message: 'Forbidden: Department mismatch.' });
      }
    }

    const parameter = await AccreditationParameter.findByPk(parameterId);
    if (!parameter) {
      return res.status(404).json({ success: false, message: 'Accreditation parameter not found.' });
    }

    // Dynamic Score Calculation based on benchmark
    let calculatedScore = 0;
    if (parameter.metricType === 'Quantitative' && parameter.benchmarkValue && Number(parameter.benchmarkValue) > 0) {
      const achievementRatio = Math.min(Number(actualValue) / Number(parameter.benchmarkValue), 1.0);
      calculatedScore = parseFloat((achievementRatio * Number(parameter.weightage)).toFixed(2));
    } else {
      calculatedScore = Number(parameter.weightage); // Default provisional
    }

    // Upsert submission
    const [submission, created] = await ParameterDataSubmission.findOrCreate({
      where: { parameterId, department, academicYear: academicYear || '2024-2025' },
      defaults: {
        actualValue,
        qualitativeResponse,
        calculatedScore,
        evidenceDocumentId,
        submittedBy: req.user.id,
        status: 'Submitted'
      }
    });

    if (!created) {
      await submission.update({
        actualValue,
        qualitativeResponse,
        calculatedScore,
        evidenceDocumentId,
        submittedBy: req.user.id,
        status: 'Submitted'
      });
    }

    res.status(200).json({ success: true, data: submission, isNew: created });
  } catch (error) {
    console.error('Error submitting parameter data:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc Verify / Approve submission (HOD, Coordinator, Admin)
 * @route PUT /api/parameter-master/submissions/:id/verify
 */
exports.verifySubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewerComments, adjustedScore } = req.body;

    const submission = await ParameterDataSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    await submission.update({
      status,
      reviewerComments,
      calculatedScore: adjustedScore !== undefined ? adjustedScore : submission.calculatedScore,
      verifiedBy: req.user.id
    });

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    console.error('Error verifying submission:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};
