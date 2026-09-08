import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Sliders, Award, CheckCircle2, Clock, AlertCircle, Search, 
  Filter, Upload, ChevronRight, TrendingUp, BookOpen, Layers, 
  FileText, Download, Edit3, Eye, Plus, Sparkles, Check, 
  Building2, GraduationCap, BarChart3, LayoutGrid, Table as TableIcon,
  RotateCcw, ShieldCheck, X, FileSpreadsheet, Percent, Target
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';

interface DynamicParameterMasterProps {
  onNavigate: (page: string) => void;
  currentPage?: string;
  hideSidebar?: boolean;
}

export interface MetricDefinition {
  id: string;
  criterionNumber: string;
  criterionTitle: string;
  metricId: string;
  metricTitle: string;
  metricType: 'Quantitative' | 'Qualitative';
  weightage: number;
  benchmarkValue: number;
  unitOfMeasure: string;
  isDepartmentSpecific: boolean;
  actualValue?: number;
  qualitativeResponse?: string;
  calculatedScore?: number;
  status?: 'Approved' | 'Submitted' | 'UnderReview' | 'Draft';
  evidenceDoc?: string;
}

const NAAC_STATIC_PARAMETERS: MetricDefinition[] = [
  // Criterion 1: Curricular Aspects (150)
  { id: 'naac-1.1.1', criterionNumber: 'Criterion 1', criterionTitle: 'Curricular Aspects', metricId: '1.1.1', metricTitle: 'Curricula developed & implemented have relevance to local, national, regional and global developmental needs.', metricType: 'Qualitative', weightage: 20, benchmarkValue: 20, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 18.5, status: 'Approved', calculatedScore: 18.5 },
  { id: 'naac-1.1.2', criterionNumber: 'Criterion 1', criterionTitle: 'Curricular Aspects', metricId: '1.1.2', metricTitle: 'Percentage of Programs where syllabus revision was carried out during the last five years.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 100, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 92.5, status: 'Approved', calculatedScore: 18.5 },
  { id: 'naac-1.2.1', criterionNumber: 'Criterion 1', criterionTitle: 'Curricular Aspects', metricId: '1.2.1', metricTitle: 'Percentage of new courses introduced across all programs offered during the last five years.', metricType: 'Quantitative', weightage: 30, benchmarkValue: 40, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 36.0, status: 'Approved', calculatedScore: 27.0 },
  { id: 'naac-1.3.1', criterionNumber: 'Criterion 1', criterionTitle: 'Curricular Aspects', metricId: '1.3.1', metricTitle: 'Institution integrates cross-cutting issues relevant to Professional Ethics, Gender, Human Values, and Environment.', metricType: 'Qualitative', weightage: 15, benchmarkValue: 15, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 14.0, status: 'Approved', calculatedScore: 14.0 },
  { id: 'naac-1.3.2', criterionNumber: 'Criterion 1', criterionTitle: 'Curricular Aspects', metricId: '1.3.2', metricTitle: 'Percentage of students undertaking field projects / research projects / internships.', metricType: 'Quantitative', weightage: 25, benchmarkValue: 80, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 84.2, status: 'Approved', calculatedScore: 25.0 },
  { id: 'naac-1.4.1', criterionNumber: 'Criterion 1', criterionTitle: 'Curricular Aspects', metricId: '1.4.1', metricTitle: 'Structured feedback for design & review of syllabus obtained from Students, Teachers, Employers, Alumni.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 100, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 96.0, status: 'Approved', calculatedScore: 19.2 },
  { id: 'naac-1.4.2', criterionNumber: 'Criterion 1', criterionTitle: 'Curricular Aspects', metricId: '1.4.2', metricTitle: 'Feedback processes of the institution: Feedback collected, analyzed, and action taken report hosted on website.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 100, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 100, status: 'Approved', calculatedScore: 20.0 },

  // Criterion 2: Teaching-Learning and Evaluation (200)
  { id: 'naac-2.1.1', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.1.1', metricTitle: 'Enrolment percentage (Average across last 5 years against sanctioned intake).', metricType: 'Quantitative', weightage: 15, benchmarkValue: 100, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 98.4, status: 'Approved', calculatedScore: 14.8 },
  { id: 'naac-2.1.2', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.1.2', metricTitle: 'Percentage of seats filled against reserved categories (SC, ST, OBC, etc.) as per applicable reservation policy.', metricType: 'Quantitative', weightage: 15, benchmarkValue: 100, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 88.0, status: 'Approved', calculatedScore: 13.2 },
  { id: 'naac-2.2.1', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.2.1', metricTitle: 'Student-Full time Teacher Ratio (FSR) across all academic departments.', metricType: 'Quantitative', weightage: 30, benchmarkValue: 15, unitOfMeasure: 'Ratio', isDepartmentSpecific: true, actualValue: 14.2, status: 'Approved', calculatedScore: 30.0 },
  { id: 'naac-2.3.1', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.3.1', metricTitle: 'Student centric methods, such as experiential learning, participative learning and problem solving methodologies.', metricType: 'Qualitative', weightage: 20, benchmarkValue: 20, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 18.0, status: 'Approved', calculatedScore: 18.0 },
  { id: 'naac-2.4.1', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.4.1', metricTitle: 'Percentage of full-time teachers against sanctioned posts during the last five years.', metricType: 'Quantitative', weightage: 15, benchmarkValue: 100, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 100, status: 'Approved', calculatedScore: 15.0 },
  { id: 'naac-2.4.2', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.4.2', metricTitle: 'Percentage of full-time teachers with Ph.D. / D.M. / M.Ch. / D.N.B / Superspeciality.', metricType: 'Quantitative', weightage: 30, benchmarkValue: 80, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 72.5, status: 'Approved', calculatedScore: 27.2 },
  { id: 'naac-2.5.1', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.5.1', metricTitle: 'Mechanism of internal/continuous assessment is transparent, timely, and robust.', metricType: 'Qualitative', weightage: 20, benchmarkValue: 20, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 19.0, status: 'Approved', calculatedScore: 19.0 },
  { id: 'naac-2.6.1', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.6.1', metricTitle: 'Program Outcomes (POs) and Course Outcomes (COs) are clearly stated, published, and communicated.', metricType: 'Qualitative', weightage: 15, benchmarkValue: 15, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 14.5, status: 'Approved', calculatedScore: 14.5 },
  { id: 'naac-2.6.2', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.6.2', metricTitle: 'Attainment of POs and COs is evaluated through direct & indirect assessment methods.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 90, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 86.4, status: 'Approved', calculatedScore: 19.2 },
  { id: 'naac-2.7.1', criterionNumber: 'Criterion 2', criterionTitle: 'Teaching-Learning and Evaluation', metricId: '2.7.1', metricTitle: 'Online Student Satisfaction Survey (SSS) regarding institutional teaching-learning process.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 4.0, unitOfMeasure: 'Scale 0-4', isDepartmentSpecific: false, actualValue: 3.78, status: 'Approved', calculatedScore: 18.9 },

  // Criterion 3: Research, Innovations and Extension (250)
  { id: 'naac-3.1.1', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.1.1', metricTitle: 'The institution has a well-defined institutional policy for promotion of research & seed grants.', metricType: 'Qualitative', weightage: 15, benchmarkValue: 15, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 14.0, status: 'Approved', calculatedScore: 14.0 },
  { id: 'naac-3.2.1', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.2.1', metricTitle: 'Extramural funding for Research (Government & Non-Government Sponsored Grants in ₹ Lakhs).', metricType: 'Quantitative', weightage: 40, benchmarkValue: 500, unitOfMeasure: 'Lakhs (INR)', isDepartmentSpecific: true, actualValue: 420.5, status: 'Approved', calculatedScore: 33.6 },
  { id: 'naac-3.3.1', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.3.1', metricTitle: 'Institution has created an ecosystem for innovations including Incubation Centre, IPR Cell & Tech Transfer.', metricType: 'Qualitative', weightage: 20, benchmarkValue: 20, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 19.0, status: 'Approved', calculatedScore: 19.0 },
  { id: 'naac-3.4.2', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.4.2', metricTitle: 'Number of candidates registered for Ph.D. per recognized research supervisor.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 4.0, unitOfMeasure: 'Ratio', isDepartmentSpecific: true, actualValue: 3.8, status: 'Approved', calculatedScore: 19.0 },
  { id: 'naac-3.4.3', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.4.3', metricTitle: 'Number of research papers published per teacher in Scopus & Web of Science indexed journals.', metricType: 'Quantitative', weightage: 45, benchmarkValue: 2.5, unitOfMeasure: 'Count/Faculty', isDepartmentSpecific: true, actualValue: 2.1, status: 'Approved', calculatedScore: 37.8 },
  { id: 'naac-3.4.4', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.4.4', metricTitle: 'Number of books, chapters in edited volumes and papers published in conference proceedings per teacher.', metricType: 'Quantitative', weightage: 25, benchmarkValue: 1.5, unitOfMeasure: 'Count/Faculty', isDepartmentSpecific: true, actualValue: 1.3, status: 'Approved', calculatedScore: 21.7 },
  { id: 'naac-3.4.5', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.4.5', metricTitle: 'Bibliometrics of publications: Citations per paper and institutional h-index in Scopus / WoS.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 10, unitOfMeasure: 'Avg Citations', isDepartmentSpecific: true, actualValue: 8.4, status: 'Approved', calculatedScore: 16.8 },
  { id: 'naac-3.5.1', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.5.1', metricTitle: 'Revenue generated from consultancy and corporate training programs during the last five years.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 150, unitOfMeasure: 'Lakhs (INR)', isDepartmentSpecific: true, actualValue: 135.2, status: 'Approved', calculatedScore: 18.0 },
  { id: 'naac-3.6.1', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.6.1', metricTitle: 'Extension activities carried out in neighborhood community for holistic student social sensitization.', metricType: 'Qualitative', weightage: 15, benchmarkValue: 15, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 14.5, status: 'Approved', calculatedScore: 14.5 },
  { id: 'naac-3.7.1', criterionNumber: 'Criterion 3', criterionTitle: 'Research, Innovations and Extension', metricId: '3.7.1', metricTitle: 'Number of functional MoUs with corporate houses, universities, and international bodies.', metricType: 'Quantitative', weightage: 30, benchmarkValue: 50, unitOfMeasure: 'Count', isDepartmentSpecific: true, actualValue: 46, status: 'Approved', calculatedScore: 27.6 },

  // Criterion 4: Infrastructure and Learning Resources (100)
  { id: 'naac-4.1.1', criterionNumber: 'Criterion 4', criterionTitle: 'Infrastructure and Learning Resources', metricId: '4.1.1', metricTitle: 'Adequacy of infrastructure and physical facilities for teaching-learning, smart labs, and computing.', metricType: 'Qualitative', weightage: 20, benchmarkValue: 20, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 19.5, status: 'Approved', calculatedScore: 19.5 },
  { id: 'naac-4.2.1', criterionNumber: 'Criterion 4', criterionTitle: 'Infrastructure and Learning Resources', metricId: '4.2.1', metricTitle: 'Library automation using Integrated Library Management System (ILMS) with remote digital access.', metricType: 'Qualitative', weightage: 20, benchmarkValue: 20, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 19.0, status: 'Approved', calculatedScore: 19.0 },
  { id: 'naac-4.2.2', criterionNumber: 'Criterion 4', criterionTitle: 'Infrastructure and Learning Resources', metricId: '4.2.2', metricTitle: 'Percentage of annual expenditure for purchase of books, e-journals, IEEE/ACM databases.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 5.0, unitOfMeasure: 'Percentage', isDepartmentSpecific: false, actualValue: 4.8, status: 'Approved', calculatedScore: 19.2 },
  { id: 'naac-4.3.1', criterionNumber: 'Criterion 4', criterionTitle: 'Infrastructure and Learning Resources', metricId: '4.3.1', metricTitle: 'IT facilities including campus-wide 10 Gbps Wi-Fi, high performance computing clusters, and ERP.', metricType: 'Qualitative', weightage: 20, benchmarkValue: 20, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 19.0, status: 'Approved', calculatedScore: 19.0 },
  { id: 'naac-4.4.1', criterionNumber: 'Criterion 4', criterionTitle: 'Infrastructure and Learning Resources', metricId: '4.4.1', metricTitle: 'Percentage of expenditure incurred on maintenance of academic and physical support facilities.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 15.0, unitOfMeasure: 'Percentage', isDepartmentSpecific: false, actualValue: 14.2, status: 'Approved', calculatedScore: 18.9 },

  // Criterion 5: Student Support and Progression (100)
  { id: 'naac-5.1.1', criterionNumber: 'Criterion 5', criterionTitle: 'Student Support and Progression', metricId: '5.1.1', metricTitle: 'Percentage of students benefited by scholarships, fee concessions, and freeships provided by Institution/Govt.', metricType: 'Quantitative', weightage: 20, benchmarkValue: 35.0, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 32.5, status: 'Approved', calculatedScore: 18.6 },
  { id: 'naac-5.1.2', criterionNumber: 'Criterion 5', criterionTitle: 'Student Support and Progression', metricId: '5.1.2', metricTitle: 'Capacity building and skills enhancement initiatives (Soft skills, Language, Life skills, ICT/computing).', metricType: 'Quantitative', weightage: 15, benchmarkValue: 100, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 95.0, status: 'Approved', calculatedScore: 14.3 },
  { id: 'naac-5.2.1', criterionNumber: 'Criterion 5', criterionTitle: 'Student Support and Progression', metricId: '5.2.1', metricTitle: 'Percentage of placement of outgoing students and students progressing to higher education.', metricType: 'Quantitative', weightage: 30, benchmarkValue: 85.0, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 88.5, status: 'Approved', calculatedScore: 30.0 },
  { id: 'naac-5.2.2', criterionNumber: 'Criterion 5', criterionTitle: 'Student Support and Progression', metricId: '5.2.2', metricTitle: 'Percentage of students qualifying in state/national/international examinations (GATE, NET, GRE, CAT).', metricType: 'Quantitative', weightage: 15, benchmarkValue: 25.0, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 22.4, status: 'Approved', calculatedScore: 13.4 },
  { id: 'naac-5.3.1', criterionNumber: 'Criterion 5', criterionTitle: 'Student Support and Progression', metricId: '5.3.1', metricTitle: 'Awards/medals for outstanding performance in sports and cultural activities at national/international levels.', metricType: 'Quantitative', weightage: 10, benchmarkValue: 40, unitOfMeasure: 'Count', isDepartmentSpecific: true, actualValue: 44, status: 'Approved', calculatedScore: 10.0 },
  { id: 'naac-5.4.1', criterionNumber: 'Criterion 5', criterionTitle: 'Student Support and Progression', metricId: '5.4.1', metricTitle: 'Alumni Association contributes significantly to development through financial and professional mentorship.', metricType: 'Qualitative', weightage: 10, benchmarkValue: 10, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 9.5, status: 'Approved', calculatedScore: 9.5 },

  // Criterion 6: Governance, Leadership and Management (100)
  { id: 'naac-6.1.1', criterionNumber: 'Criterion 6', criterionTitle: 'Governance, Leadership and Management', metricId: '6.1.1', metricTitle: 'Institutional governance is reflective of participatory management, decentralization, and strategic vision.', metricType: 'Qualitative', weightage: 15, benchmarkValue: 15, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 14.5, status: 'Approved', calculatedScore: 14.5 },
  { id: 'naac-6.2.1', criterionNumber: 'Criterion 6', criterionTitle: 'Governance, Leadership and Management', metricId: '6.2.1', metricTitle: 'Perspective / Strategic plan is effectively deployed with visible institutional milestone tracking.', metricType: 'Qualitative', weightage: 15, benchmarkValue: 15, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 14.0, status: 'Approved', calculatedScore: 14.0 },
  { id: 'naac-6.3.2', criterionNumber: 'Criterion 6', criterionTitle: 'Governance, Leadership and Management', metricId: '6.3.2', metricTitle: 'Percentage of teachers provided with financial support to attend conferences/workshops/memberships.', metricType: 'Quantitative', weightage: 15, benchmarkValue: 60.0, unitOfMeasure: 'Percentage', isDepartmentSpecific: true, actualValue: 58.2, status: 'Approved', calculatedScore: 14.6 },
  { id: 'naac-6.4.1', criterionNumber: 'Criterion 6', criterionTitle: 'Governance, Leadership and Management', metricId: '6.4.1', metricTitle: 'Institutional strategies for mobilization of funds and conduct of internal/external financial audits.', metricType: 'Qualitative', weightage: 15, benchmarkValue: 15, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 14.5, status: 'Approved', calculatedScore: 14.5 },
  { id: 'naac-6.5.1', criterionNumber: 'Criterion 6', criterionTitle: 'Governance, Leadership and Management', metricId: '6.5.1', metricTitle: 'Internal Quality Assurance Cell (IQAC) contribution in institutionalizing quality reviews and green audits.', metricType: 'Qualitative', weightage: 40, benchmarkValue: 40, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 38.0, status: 'Approved', calculatedScore: 38.0 },

  // Criterion 7: Institutional Values and Best Practices (100)
  { id: 'naac-7.1.1', criterionNumber: 'Criterion 7', criterionTitle: 'Institutional Values and Best Practices', metricId: '7.1.1', metricTitle: 'Measures initiated by the institution for the promotion of gender equity and universal human values.', metricType: 'Qualitative', weightage: 25, benchmarkValue: 25, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 24.0, status: 'Approved', calculatedScore: 24.0 },
  { id: 'naac-7.1.2', criterionNumber: 'Criterion 7', criterionTitle: 'Institutional Values and Best Practices', metricId: '7.1.2', metricTitle: 'Facilities for alternate sources of energy (Solar, Biogas, Sensor-based conservation) & Waste recycling.', metricType: 'Quantitative', weightage: 25, benchmarkValue: 100, unitOfMeasure: 'Percentage', isDepartmentSpecific: false, actualValue: 92.0, status: 'Approved', calculatedScore: 23.0 },
  { id: 'naac-7.2.1', criterionNumber: 'Criterion 7', criterionTitle: 'Institutional Values and Best Practices', metricId: '7.2.1', metricTitle: 'Two institutional best practices successfully implemented (e.g. Holism in Tech & Community Living).', metricType: 'Qualitative', weightage: 30, benchmarkValue: 30, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 29.0, status: 'Approved', calculatedScore: 29.0 },
  { id: 'naac-7.3.1', criterionNumber: 'Criterion 7', criterionTitle: 'Institutional Values and Best Practices', metricId: '7.3.1', metricTitle: 'Performance of the Institution in one area distinctive to its priority and thrust.', metricType: 'Qualitative', weightage: 20, benchmarkValue: 20, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 19.0, status: 'Approved', calculatedScore: 19.0 },
];

const NBA_STATIC_PARAMETERS: MetricDefinition[] = [
  { id: 'nba-c1', criterionNumber: 'Criterion 1', criterionTitle: 'Vision, Mission & PEOs', metricId: 'C1.1', metricTitle: 'State the Vision and Mission of the Department and Institute with PEOs dissemination process.', metricType: 'Qualitative', weightage: 50, benchmarkValue: 50, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 46.0, status: 'Approved', calculatedScore: 46.0 },
  { id: 'nba-c2', criterionNumber: 'Criterion 2', criterionTitle: 'Program Curriculum & Teaching-Learning', metricId: 'C2.1', metricTitle: 'Program Curriculum structure, compliance with AICTE model, and Bloom’s taxonomy assessment.', metricType: 'Quantitative', weightage: 100, benchmarkValue: 100, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 91.0, status: 'Approved', calculatedScore: 91.0 },
  { id: 'nba-c3', criterionNumber: 'Criterion 3', criterionTitle: 'Course Outcomes & Program Outcomes', metricId: 'C3.1', metricTitle: 'Attainment of Course Outcomes (COs) and Program Outcomes (POs/PSOs) mapping matrix.', metricType: 'Quantitative', weightage: 175, benchmarkValue: 175, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 158.0, status: 'Approved', calculatedScore: 158.0 },
  { id: 'nba-c4', criterionNumber: 'Criterion 4', criterionTitle: 'Students’ Performance', metricId: 'C4.1', metricTitle: 'Enrolment ratio, success rate without backlogs, academic performance index, and placement index.', metricType: 'Quantitative', weightage: 100, benchmarkValue: 100, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 87.5, status: 'Approved', calculatedScore: 87.5 },
  { id: 'nba-c5', criterionNumber: 'Criterion 5', criterionTitle: 'Faculty Information & Contributions', metricId: 'C5.1', metricTitle: 'Student-Faculty Ratio (SFR <= 1:15), Faculty Cadre Ratio, Faculty with Ph.D., and Research Publications.', metricType: 'Quantitative', weightage: 200, benchmarkValue: 200, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 179.0, status: 'Approved', calculatedScore: 179.0 },
  { id: 'nba-c6', criterionNumber: 'Criterion 6', criterionTitle: 'Facilities & Technical Support', metricId: 'C6.1', metricTitle: 'Adequacy of modern laboratories, technical computing support, safety norms, and maintenance.', metricType: 'Quantitative', weightage: 80, benchmarkValue: 80, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 74.0, status: 'Approved', calculatedScore: 74.0 },
  { id: 'nba-c7', criterionNumber: 'Criterion 7', criterionTitle: 'Continuous Improvement', metricId: 'C7.1', metricTitle: 'Actions taken based on results of PO and PSO attainment and feedback implementation.', metricType: 'Qualitative', weightage: 75, benchmarkValue: 75, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 68.0, status: 'Approved', calculatedScore: 68.0 },
  { id: 'nba-c8', criterionNumber: 'Criterion 8', criterionTitle: 'First Year Academics', metricId: 'C8.1', metricTitle: 'First year Student-Faculty ratio, qualification of faculty, and academic performance in basic sciences.', metricType: 'Quantitative', weightage: 50, benchmarkValue: 50, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 45.0, status: 'Approved', calculatedScore: 45.0 },
  { id: 'nba-c9', criterionNumber: 'Criterion 9', criterionTitle: 'Student Support Systems', metricId: 'C9.1', metricTitle: 'Mentoring system, feedback analysis, career guidance, co-curricular initiatives, and entrepreneurship cell.', metricType: 'Qualitative', weightage: 50, benchmarkValue: 50, unitOfMeasure: 'Score', isDepartmentSpecific: true, actualValue: 46.5, status: 'Approved', calculatedScore: 46.5 },
  { id: 'nba-c10', criterionNumber: 'Criterion 10', criterionTitle: 'Governance & Financial Resources', metricId: 'C10.1', metricTitle: 'Organization governance, budget allocation & utilization, library resources, and internet infrastructure.', metricType: 'Quantitative', weightage: 120, benchmarkValue: 120, unitOfMeasure: 'Score', isDepartmentSpecific: false, actualValue: 112.0, status: 'Approved', calculatedScore: 112.0 },
];

export function DynamicParameterMaster({
  onNavigate,
  currentPage = 'naac-accreditation',
  hideSidebar = false
}: DynamicParameterMasterProps) {
  const { user } = useAuth();
  const effectiveRole = user?.role || 'faculty';
  const isAdminOrCoordinator = effectiveRole === 'admin' || effectiveRole === 'coordinator' || effectiveRole === 'hod';

  // Active framework tab: 'NAAC' | 'NBA' | 'AQAR'
  const initialFramework = currentPage === 'nba-tracking' ? 'NBA' : 'NAAC';
  const [activeFramework, setActiveFramework] = useState<'NAAC' | 'NBA' | 'AQAR'>(initialFramework);

  // Synchronize when parent currentPage prop changes
  useEffect(() => {
    if (currentPage === 'nba-tracking') {
      setActiveFramework('NBA');
    } else if (currentPage === 'naac-accreditation') {
      setActiveFramework('NAAC');
    }
  }, [currentPage]);

  const handleFrameworkChange = (frameworkKey: 'NAAC' | 'NBA' | 'AQAR') => {
    setActiveFramework(frameworkKey);
    if (frameworkKey === 'NBA') {
      onNavigate('nba-tracking');
    } else if (frameworkKey === 'NAAC') {
      onNavigate('naac-accreditation');
    }
  };

  const { departmentList: dbDepts } = useAcademicHierarchy();
  const departments = useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => { if (d) set.add(normalizeDepartmentName(d)); });
    if (set.size === 0) {
      return [
        'AI and Data Science Engineering',
        'Civil Engineering',
        'Computer Science and Engineering',
        'Electrical and Electronics Engineering',
        'Electronics and Communication Engineering',
        'Mechanical and Automobile Engineering',
        'School of Architecture',
        'Sciences and Humanities (Engineering)'
      ];
    }
    return Array.from(set).sort();
  }, [dbDepts]);

  const [selectedDept, setSelectedDept] = useState<string>(departments[0] || 'AI and Data Science Engineering');
  const [activeCriterion, setActiveCriterion] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Quantitative' | 'Qualitative'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'analytics'>('table');

  // Modals & Submission state
  const [activeParam, setActiveParam] = useState<MetricDefinition | null>(null);
  const [inspectingParam, setInspectingParam] = useState<MetricDefinition | null>(null);
  const [formActualValue, setFormActualValue] = useState<number>(0);
  const [formTextResponse, setFormTextResponse] = useState<string>('');
  const [formEvidenceUrl, setFormEvidenceUrl] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Active parameter list
  const baseParameters = activeFramework === 'NBA' ? NBA_STATIC_PARAMETERS : NAAC_STATIC_PARAMETERS;
  const [parameters, setParameters] = useState<MetricDefinition[]>(baseParameters);

  useEffect(() => {
    setParameters(activeFramework === 'NBA' ? NBA_STATIC_PARAMETERS : NAAC_STATIC_PARAMETERS);
    setActiveCriterion('All');
  }, [activeFramework]);

  // Distinct criteria list for tabs
  const criteriaList = useMemo(() => {
    const set = new Set(baseParameters.map(p => p.criterionNumber));
    return ['All', ...Array.from(set)];
  }, [baseParameters]);

  // Filtered parameters
  const filteredParameters = useMemo(() => {
    return parameters.filter(p => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = p.metricId.toLowerCase().includes(q);
        const matchesTitle = p.metricTitle.toLowerCase().includes(q);
        const matchesCrit = p.criterionTitle.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesCrit) return false;
      }

      // Criterion
      if (activeCriterion !== 'All' && p.criterionNumber !== activeCriterion) {
        return false;
      }

      // Metric Type
      if (typeFilter !== 'All' && p.metricType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [parameters, searchQuery, activeCriterion, typeFilter]);

  // KPI calculations
  const kpiStats = useMemo(() => {
    const totalMax = parameters.reduce((sum, p) => sum + p.weightage, 0);
    const earned = parameters.reduce((sum, p) => sum + (p.calculatedScore || 0), 0);
    const qnMCount = parameters.filter(p => p.metricType === 'Quantitative').length;
    const qlMCount = parameters.filter(p => p.metricType === 'Qualitative').length;
    const completedCount = parameters.filter(p => p.status === 'Approved').length;

    const attainmentPct = totalMax > 0 ? ((earned / totalMax) * 100).toFixed(1) : '0.0';
    const cgpaScore = ((earned / (totalMax || 1)) * 4.0).toFixed(2);

    let projectedGrade = 'A++';
    const cgpaNum = parseFloat(cgpaScore);
    if (cgpaNum >= 3.51) projectedGrade = 'A++ (Exemplary)';
    else if (cgpaNum >= 3.26) projectedGrade = 'A+';
    else if (cgpaNum >= 3.01) projectedGrade = 'A';
    else if (cgpaNum >= 2.76) projectedGrade = 'B++';
    else if (cgpaNum >= 2.51) projectedGrade = 'B+';
    else projectedGrade = 'B';

    return {
      totalWeight: totalMax,
      earnedScore: earned.toFixed(1),
      attainmentPct,
      cgpaScore,
      projectedGrade,
      qnMCount,
      qlMCount,
      completedCount,
      totalCount: parameters.length
    };
  }, [parameters]);

  // Criteria summary breakdown
  const criteriaBreakdown = useMemo(() => {
    const map: Record<string, { title: string; totalWeight: number; earned: number; count: number; qnM: number; qlM: number }> = {};

    parameters.forEach(p => {
      if (!map[p.criterionNumber]) {
        map[p.criterionNumber] = {
          title: p.criterionTitle,
          totalWeight: 0,
          earned: 0,
          count: 0,
          qnM: 0,
          qlM: 0
        };
      }
      map[p.criterionNumber].totalWeight += p.weightage;
      map[p.criterionNumber].earned += p.calculatedScore || 0;
      map[p.criterionNumber].count += 1;
      if (p.metricType === 'Quantitative') map[p.criterionNumber].qnM += 1;
      else map[p.criterionNumber].qlM += 1;
    });

    return Object.keys(map).map(crit => ({
      criterionNumber: crit,
      ...map[crit],
      progress: Math.min(100, Math.round((map[crit].earned / (map[crit].totalWeight || 1)) * 100))
    }));
  }, [parameters]);

  // Handle Open Submission Form
  const handleOpenSubmit = (param: MetricDefinition) => {
    setActiveParam(param);
    setFormActualValue(param.actualValue || 0);
    setFormTextResponse(param.qualitativeResponse || '');
    setFormEvidenceUrl(param.evidenceDoc || '');
  };

  // Handle Save Submission
  const handleSaveSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParam) return;

    // Calculate score based on weightage & benchmark
    let calcScore = 0;
    if (activeParam.metricType === 'Quantitative') {
      const ratio = Math.min(1.0, formActualValue / (activeParam.benchmarkValue || 1));
      calcScore = parseFloat((ratio * activeParam.weightage).toFixed(2));
    } else {
      calcScore = Math.min(activeParam.weightage, formActualValue || activeParam.weightage);
    }

    setParameters(prev =>
      prev.map(p =>
        p.id === activeParam.id
          ? {
              ...p,
              actualValue: formActualValue,
              qualitativeResponse: formTextResponse,
              calculatedScore: calcScore,
              status: 'Approved',
              evidenceDoc: formEvidenceUrl
            }
          : p
      )
    );

    setActiveParam(null);
    setSuccessToast(`Metric ${activeParam.metricId} verified and compliance score updated!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredParameters.map((p, i) => ({
      'Sl. No': i + 1,
      'Criterion': p.criterionNumber,
      'Criterion Title': p.criterionTitle,
      'Metric ID': p.metricId,
      'Metric Description': p.metricTitle,
      'Type': p.metricType === 'Quantitative' ? 'QnM (Quantitative)' : 'QlM (Qualitative)',
      'Weightage': p.weightage,
      'Benchmark Target': p.benchmarkValue,
      'Unit of Measure': p.unitOfMeasure,
      'Department Actual': p.actualValue || 0,
      'Earned Score': p.calculatedScore || 0,
      'Compliance Status': p.status || 'Draft'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${activeFramework}_Accreditation_SSR`);
    XLSX.writeFile(wb, `CHRIST_${activeFramework}_Accreditation_Matrix_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Metric ID', 'Criterion', 'Title', 'Type', 'Weightage', 'Benchmark', 'Actual Value', 'Earned Score', 'Status'];
    const rows = filteredParameters.map(p => [
      `"${p.metricId}"`,
      `"${p.criterionNumber}"`,
      `"${p.metricTitle.replace(/"/g, '""')}"`,
      `"${p.metricType}"`,
      `"${p.weightage}"`,
      `"${p.benchmarkValue}"`,
      `"${p.actualValue || 0}"`,
      `"${p.calculatedScore || 0}"`,
      `"${p.status || 'Draft'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CHRIST_${activeFramework}_Accreditation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {!hideSidebar && <Sidebar currentPage={currentPage} onNavigate={onNavigate} />}

      <main className={hideSidebar ? 'p-0' : 'ml-64 p-8 transition-all duration-300'}>
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* 1. MASTER HEADER & FRAMEWORK SWITCHER                                     */}
          {/* ========================================================================= */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                  Institutional Quality Engine
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">National & International Quality Accreditations</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Accreditation & Quality Assurance
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Configure accreditation benchmarks, compute weighted criteria metrics, submit department evidence data, and generate verified SSR/SAR reports.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Framework Switcher Navigation Pills */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => handleFrameworkChange('NAAC')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeFramework === 'NAAC'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>NAAC SSR (7 Criteria)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFrameworkChange('NBA')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeFramework === 'NBA'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>NBA SAR (10 Criteria)</span>
                </button>
              </div>

              {/* Department Hierarchy Selector */}
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="h-10 text-xs bg-white border-slate-200 rounded-xl min-w-[200px]">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Export Toolbar */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportExcel}
                  className="h-9 px-3 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5"
                  title="Export to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel</span>
                </Button>
                <div className="h-4 w-px bg-slate-200" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-9 px-3 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1.5"
                  title="Export to CSV (.csv)"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>CSV</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Success Notification */}
          {successToast && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{successToast}</span>
              </div>
              <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. KPI METRIC CARDS (5 KPI COMPLIANCE METRICS)                            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Weightage */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Benchmark Max</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.totalWeight} pts
                  </div>
                  <div className="text-[11px] text-indigo-700 font-medium mt-1">
                    {activeFramework} Framework Max
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Earned Score */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Earned Score</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                    {kpiStats.earnedScore} pts
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    {kpiStats.attainmentPct}% Attainment
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Projected CGPA / Grade */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projected Grade</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.cgpaScore} <span className="text-sm font-semibold text-amber-600">/ 4.00</span>
                  </div>
                  <div className="text-[11px] text-amber-700 font-bold mt-1">
                    Grade {kpiStats.projectedGrade}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Quantitative Metrics (QnM) */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantitative (QnM)</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.qnMCount} Metrics
                  </div>
                  <div className="text-[11px] text-blue-700 font-medium mt-1">
                    Data-driven KPI Indicators
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Qualitative Narratives (QlM) */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Qualitative (QlM)</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.qlMCount} Narratives
                  </div>
                  <div className="text-[11px] text-purple-700 font-medium mt-1">
                    SOP Compliance Descriptors
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 3. UNIFIED FILTER & VIEW TOOLBAR                                         */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Real-time Metric Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by Metric ID (e.g. 1.1.1, 3.2.1, C3.1), title or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-10 text-xs bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Switcher & Reset */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                {(searchQuery || activeCriterion !== 'All' || typeFilter !== 'All') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSearchQuery(''); setActiveCriterion('All'); setTypeFilter('All'); }}
                    className="h-9 px-3 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </Button>
                )}

                {/* Metric Type Selector */}
                <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl min-w-[140px]">
                    <SelectValue placeholder="Metric Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Metric Types</SelectItem>
                    <SelectItem value="Quantitative">Quantitative (QnM)</SelectItem>
                    <SelectItem value="Qualitative">Qualitative (QlM)</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Pills */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Matrix</span>
                  </button>

                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'cards'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Scorecards</span>
                  </button>

                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'analytics'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Attainment</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Criteria Filter Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {criteriaList.map((crit) => (
                <button
                  key={crit}
                  onClick={() => setActiveCriterion(crit)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                    activeCriterion === crit
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {crit}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. VIEW CONTENT (MATRIX / SCORECARDS / ATTAINMENT)                        */}
          {/* ========================================================================= */}
          {filteredParameters.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No accreditation metrics found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try clearing search filters or choosing 'All Criteria'.
              </p>
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setActiveCriterion('All'); setTypeFilter('All'); }} className="rounded-xl">
                Reset All Filters
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            /* ======================================================================= */
            /* VIEW 1: METRIC MATRIX (TABLE VIEW)                                      */
            /* ======================================================================= */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 font-semibold text-slate-900">
                      <th className="py-3.5 px-4 w-28">Metric ID</th>
                      <th className="py-3.5 px-4">Criterion & Description</th>
                      <th className="py-3.5 px-3">Type</th>
                      <th className="py-3.5 px-3 text-center">Weightage</th>
                      <th className="py-3.5 px-3 text-center">Benchmark</th>
                      <th className="py-3.5 px-3 text-center">Department Actual</th>
                      <th className="py-3.5 px-3 text-center">Earned Score</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParameters.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Metric ID */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-1 rounded-md border border-indigo-100">
                            {p.metricId}
                          </span>
                        </td>

                        {/* Title & Criterion */}
                        <td className="py-3.5 px-4 max-w-md">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                            {p.criterionNumber}: {p.criterionTitle}
                          </div>
                          <div className="font-medium text-slate-900 leading-snug">
                            {p.metricTitle}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-3">
                          {p.metricType === 'Quantitative' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-[10px]">
                              QnM
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[10px]">
                              QlM
                            </Badge>
                          )}
                        </td>

                        {/* Weightage */}
                        <td className="py-3.5 px-3 text-center font-bold text-slate-900 font-mono">
                          {p.weightage} pts
                        </td>

                        {/* Benchmark */}
                        <td className="py-3.5 px-3 text-center font-mono text-slate-600">
                          {p.benchmarkValue} <span className="text-[10px] text-slate-400">{p.unitOfMeasure}</span>
                        </td>

                        {/* Actual Value */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                          {p.actualValue !== undefined ? p.actualValue : '-'}
                        </td>

                        {/* Calculated Score */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700">
                          {p.calculatedScore !== undefined ? `${p.calculatedScore} pts` : '-'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {p.status === 'Approved' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Draft</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setInspectingParam(p)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                              title="Inspect Metric SOP"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {isAdminOrCoordinator && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenSubmit(p)}
                                className="h-8 px-2.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold flex items-center gap-1"
                                title="Enter Department Data"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Record</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            /* ======================================================================= */
            /* VIEW 2: CRITERIA SCORECARDS (CARDS VIEW)                                */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {criteriaBreakdown.map((crit, idx) => (
                <Card key={idx} className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                          {crit.criterionNumber}
                        </span>
                        <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
                          {crit.title}
                        </CardTitle>
                      </div>
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-mono">
                        {crit.totalWeight} pts
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 flex-1">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-600">Earned Attainment</span>
                        <span className="text-indigo-700 font-bold font-mono">
                          {crit.earned.toFixed(1)} / {crit.totalWeight} pts ({crit.progress}%)
                        </span>
                      </div>
                      <Progress value={crit.progress} className="h-2 bg-slate-100" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">QnM Metrics</span>
                        <span className="font-bold text-slate-800 text-xs">{crit.qnM} Quantitative</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">QlM Narratives</span>
                        <span className="font-bold text-slate-800 text-xs">{crit.qlM} Qualitative</span>
                      </div>
                    </div>
                  </CardContent>

                  <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      {crit.count} Total Metrics
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setActiveCriterion(crit.criterionNumber); setViewMode('table'); }}
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-800 p-0 font-semibold flex items-center gap-1"
                    >
                      <span>View Metrics</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* ======================================================================= */
            /* VIEW 3: DEPARTMENT COMPLIANCE HEATMAP / ATTAINMENT                     */
            /* ======================================================================= */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeFramework} Department Compliance Matrix
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comparative criteria attainment progress for {selectedDept} across verified metrics.
                  </p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                  Department Readiness: 91.4%
                </Badge>
              </div>

              <div className="space-y-3">
                {criteriaBreakdown.map((crit, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900">
                          {crit.criterionNumber}: {crit.title}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-bold text-indigo-700">
                        {crit.earned.toFixed(1)} / {crit.totalWeight} pts ({crit.progress}%)
                      </div>
                    </div>
                    <Progress value={crit.progress} className="h-2.5 bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. DATA ENTRY & VERIFICATION MODAL DIALOG                                 */}
      {/* ========================================================================= */}
      <Dialog open={!!activeParam} onOpenChange={() => setActiveParam(null)}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono">
                {activeParam?.metricId}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-slate-500">
                {activeParam?.criterionNumber}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Record Compliance Data for {activeParam?.metricId}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {activeParam?.metricTitle}
            </DialogDescription>
          </DialogHeader>

          {activeParam && (
            <form onSubmit={handleSaveSubmission} className="space-y-4 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Weightage</span>
                  <span className="font-bold text-slate-900">{activeParam.weightage} Points</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Benchmark Target</span>
                  <span className="font-bold text-indigo-700">{activeParam.benchmarkValue} ({activeParam.unitOfMeasure})</span>
                </div>
              </div>

              {activeParam.metricType === 'Quantitative' ? (
                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Actual Attainment Value ({activeParam.unitOfMeasure}) *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formActualValue}
                    onChange={(e) => setFormActualValue(parseFloat(e.target.value) || 0)}
                    className="h-10 text-xs rounded-xl font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Earned Score will be automatically normalized: (Actual / Benchmark) × Weightage
                  </span>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Qualitative Descriptive Narrative / SOP Statement *
                  </Label>
                  <textarea
                    rows={4}
                    value={formTextResponse}
                    onChange={(e) => setFormTextResponse(e.target.value)}
                    placeholder="Provide detailed description adhering to NAAC / NBA SOP guidelines (max 500 words)..."
                    className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Evidence Document URL / Portal Link
                </Label>
                <Input
                  type="text"
                  value={formEvidenceUrl}
                  onChange={(e) => setFormEvidenceUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or Document ID"
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveParam(null)}
                  className="h-9 px-4 text-xs rounded-xl border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 px-5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
                >
                  Save & Verify Metric
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. SLIDE-OVER METRIC INSPECTOR DRAWER                                     */}
      {/* ========================================================================= */}
      <Dialog open={!!inspectingParam} onOpenChange={() => setInspectingParam(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-[10px]">
                {inspectingParam?.metricId}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {inspectingParam?.criterionNumber}
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Metric SOP & Guidelines
            </DialogTitle>
          </DialogHeader>

          {inspectingParam && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Metric Statement</span>
                <p className="font-semibold text-slate-800 leading-relaxed">{inspectingParam.metricTitle}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-600 block">Weightage</span>
                  <span className="font-bold text-indigo-900 font-mono text-sm">{inspectingParam.weightage} pts</span>
                </div>
                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-600 block">Benchmark</span>
                  <span className="font-bold text-emerald-900 font-mono text-sm">{inspectingParam.benchmarkValue}</span>
                </div>
                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-600 block">Type</span>
                  <span className="font-bold text-blue-900 text-xs">{inspectingParam.metricType}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-900">Mandatory Data Templates & Evidences:</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
                  <li>Institutional BoS minutes of syllabus revisions approved by Academic Council.</li>
                  <li>List of certified courses mapped with Bloom's taxonomy course outcomes.</li>
                  <li>Geo-tagged photographs of department laboratories and learning spaces.</li>
                  <li>Audited income & expenditure statements reflecting extramural grants.</li>
                </ul>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setInspectingParam(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                >
                  Close Guidelines
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
