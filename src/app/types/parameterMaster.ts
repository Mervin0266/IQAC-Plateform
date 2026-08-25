export type FrameworkCategory = 'NAAC' | 'NIRF' | 'NBA' | 'QS_RANKING' | 'THE_WORLD' | 'INTERNAL_IQAC';
export type MetricType = 'Quantitative' | 'Qualitative';
export type SubmissionStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected';

export interface AccreditationFramework {
  id: string;
  code: string;
  name: string;
  category: FrameworkCategory;
  academicYear: string;
  totalWeightage: number;
  status: 'Active' | 'Draft' | 'Archived';
  description?: string;
}

export interface ParameterDataSubmission {
  id: string;
  parameterId: string;
  department: string;
  academicYear: string;
  actualValue: number;
  qualitativeResponse?: string;
  calculatedScore: number;
  status: SubmissionStatus;
  reviewerComments?: string;
  evidenceDocument?: {
    id: string;
    title: string;
    fileUrl: string;
  };
  submitter?: {
    id: string;
    name: string;
  };
}

export interface AccreditationParameter {
  id: string;
  frameworkId: string;
  criterionNumber: string;
  criterionTitle: string;
  metricId: string;
  metricTitle: string;
  metricType: MetricType;
  weightage: number;
  benchmarkValue?: number;
  unitOfMeasure?: string;
  isDepartmentSpecific: boolean;
  status: 'Active' | 'Inactive';
  submissions?: ParameterDataSubmission[];
  framework?: AccreditationFramework;
}
