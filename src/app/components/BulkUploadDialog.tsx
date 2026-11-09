import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { FileSpreadsheet, AlertTriangle, CheckCircle, UploadCloud, Info, Download, RefreshCw, Edit2, X, AlertCircle, ExternalLink, FolderOpen, FolderPlus, FolderUp, FilePlus, Eye, Award, FileText } from 'lucide-react';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName, normalizeDesignationName } from './FacultyDetailsPage';
import { CitationsBulkUploadFlow } from './CitationsBulkUploadFlow';

const formatDateToISO = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed.toLowerCase() === 'nil' || trimmed.toLowerCase() === 'n/a') return null;

  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];

    // If day is 4 digits (e.g. YYYY/MM/DD)
    if (day.length === 4) {
      const temp = day;
      day = year;
      year = temp;
    }

    // Pad day and month
    if (day.length === 1) day = '0' + day;
    if (month.length === 1) month = '0' + month;
    if (year.length === 2) {
      year = '20' + year; // Assume 20xx
    }

    if (day.length === 2 && month.length === 2 && year.length === 4) {
      const m = parseInt(month);
      const d = parseInt(day);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  return trimmed;
};

/**
 * Extracts Employee ID from the beginning of a filename (e.g. 2043_Adarsh_S_V.xlsx -> '2043')
 * Preserves leading zeros and string format.
 */
const extractEmployeeIdFromFilename = (filename: string): string | null => {
  if (!filename) return null;
  const base = filename.replace(/\.[^/.]+$/, '').trim();
  // Standard format: EmpID_Faculty_Name
  // 1. Prefixed format e.g. CU-991_Dr_Smith, F_5432_Paper
  const matchPrefixed = base.match(/^([A-Za-z]{1,4}[-_]\d+)(?:[_\-\s]|$)/);
  if (matchPrefixed) {
    return matchPrefixed[1];
  }
  // 2. Alphanumeric or numeric e.g. EMP001_Rajesh, 2043_Adarsh, 00123_Name, 2043-Adarsh
  const matchAlphaNum = base.match(/^([A-Za-z]*\d+)(?:[_\-\s]|$)/);
  if (matchAlphaNum) {
    const token = matchAlphaNum[1].trim();
    if (!['publications', 'publication', 'scopus', 'wos', 'template', 'data', 'export', 'file', 'iqac'].includes(token.toLowerCase())) {
      return token;
    }
  }
  // 3. Fallback: first token delimited by _ or space or -
  const matchFirst = base.match(/^([A-Za-z0-9]+)(?:[_\-\s]|$)/);
  if (matchFirst) {
    const token = matchFirst[1].trim();
    if (!['publications', 'publication', 'scopus', 'wos', 'template', 'data', 'export', 'file', 'iqac'].includes(token.toLowerCase())) {
      return token;
    }
  }
  return null;
};

const normalizeGender = (val: string): 'Male' | 'Female' | 'Other' | null => {
  if (!val) return null;
  const cleaned = val.trim().toLowerCase();
  if (cleaned === 'male' || cleaned === 'm') return 'Male';
  if (cleaned === 'female' || cleaned === 'f') return 'Female';
  if (cleaned === 'other' || cleaned === 'o') return 'Other';
  return null;
};

// RFC 4180-compliant CSV Tokenizer
const tokenizeCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
        i++;
      } else if (ch === '\r' && input[i + 1] === '\n') {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
        i += 2;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
};

export interface PublicationFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  employeeId: string | null;
  facultyName: string | null;
  department: string | null;
  indexing: string;
  status: 'ready' | 'needs_review' | 'error';
  errorMessage?: string;
  records: any[];
}

export interface FacultyDirectoryMember {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation?: string;
  academicYear?: string;
  hasConflict?: boolean;
}

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => void;
  uploadType?: 'achievements' | 'placements' | 'faculty' | 'students' | 'departments' | 'consultancy' | 'departmental-activities' | 'publications' | 'patents' | 'sponsored-projects' | 'sponsored-research';
}

const SPONSORED_RESEARCH_HEADERS = [
  'Project Title',
  'Principal Investigator',
  'Co-Investigators',
  'Funding Agency',
  'Scheme / Program',
  'Agency Type',
  'Sanction Order No',
  'Sanction Date',
  'Sanction Year',
  'Start Date',
  'End Date',
  'Project Duration',
  'Sanctioned Amount (INR)',
  'Amount Received (INR)',
  'Status',
  'Progress (%)',
  'Department',
  'Sanction Letter',
  'Fund Receipt / Utilization Certificate (UC)',
  'Project URL',
  'Description'
];

const SPONSORED_RESEARCH_REQUIRED = [
  'Project Title',
  'Principal Investigator',
  'Funding Agency'
];

const PATENTS_HEADERS = [
  'Title',
  'Inventors',
  'Application No',
  'Patent No',
  'Status',
  'Patent Type',
  'Department',
  'Year',
  'Filing Date',
  'Publication Date',
  'Grant Date',
  'License Date',
  'Commercial Partner',
  'Revenue Generated (INR)',
  'Patent URL',
  'Proof',
  'Abstract'
];

const PATENTS_REQUIRED = [
  'Title',
  'Inventors'
];

const PUBLICATIONS_HEADERS = [
  'Authors',
  'Author full names',
  'Title',
  'Year',
  'Source title',
  'Cited by',
  'DOI',
  'Link',
  'Publisher',
  'ISSN',
  'ISBN',
  'CODEN'
];

const PUBLICATIONS_REQUIRED = [
  'Title',
  'Authors',
  'Source title'
];

const CONSULTANCY_HEADERS = [
  'Name of Teacher Consultant',
  'Name of Consultancy Project',
  'Agency Name',
  'Agency Contact Email',
  'Agency Contact Number',
  'Consultancy Start Year',
  'Start Date',
  'Expected End Date',
  'Actual Completion Date',
  'Project Status',
  'Contract Value (INR in Lakhs)',
  'Revenue Generated (INR in Lakhs)',
  'Amount Received (INR in Lakhs)',
  'Department',
  'Scope of Work / Deliverables Summary',
  'Agreement / Work Order',
  'Invoice',
  'Payment Receipt'
];

const CONSULTANCY_REQUIRED = [
  'Name of Teacher Consultant',
  'Name of Consultancy Project',
  'Agency Name',
  'Consultancy Start Year'
];

const DEPARTMENT_HEADERS = [
  'Code',
  'Name',
  'HOD Name',
  'HOD Email',
  'Established Year',
  'Phone',
  'Description'
];

const DEPARTMENT_REQUIRED = [
  'Code',
  'Name'
];

const STUDENT_HEADERS = [
  'Register No',
  'Student Name',
  'Class Name',
  'Application No',
  'Gender',
  'Date Of Birth',
  'Mobile No',
  'Nationality',
  'Caste',
  'Current City',
  'Current State',
  'Permanent City',
  'Permanent State',
  'Parent Mobile No',
  'Handicapped',
  'Handicapped Description',
  'Campus',
  'Disability: (YES/NO)',
  'Department',
  'Program Level'
];

const STUDENT_REQUIRED = [
  'Register No',
  'Student Name'
];

const DEPARTMENTAL_ACTIVITY_HEADERS = [
  'Academic Year',
  'Campus',
  'School',
  'Department',
  'Activity Category',
  'Title',
  'Report Details',
  'Event Date',
  'Status',
  'Pending Notes'
];

const DEPARTMENTAL_ACTIVITY_REQUIRED = [
  'Department',
  'Activity Category',
  'Title'
];

const DEPARTMENTAL_ACTIVITY_MATRIX_HEADERS = [
  'No. of Departments',
  'Faculty Development Activities',
  'Seminar / Talks/ Training Programs',
  'Club Association',
  'Seminar/ Conference/ Guest Talks',
  'Awards and Recognitions',
  'Workshops and Skill Development',
  'Student Development Programme',
  'Industrial Visit',
  'Social Outreach Program',
  'Guest Lectures',
  'Memorandum of Understanding',
  'Extension Activity',
  'Student Publications',
  'Best Practices',
  'SDG Related Events',
  'Departmental Events',
  'Pending'
];

const normalizeDeptName = (raw: string): string => {
  const str = raw.trim().toLowerCase();
  if (str.includes('architecture') || str.includes('soa') || str.includes('arch')) return 'School of Architecture';
  if (str.includes('ai') || str.includes('data science')) return 'AI and Data Science Engineering';
  if (str.includes('civil')) return 'Civil Engineering';
  if (str.includes('computer science') || str.includes('cse')) return 'Computer Science and Engineering';
  if (str.includes('electrical')) return 'Electrical and Electronics Engineering';
  if (str.includes('electronics') || str.includes('ece')) return 'Electronics and Communication Engineering';
  if (str.includes('mechanical') || str.includes('auto')) return 'Mechanical and Automobile Engineering';
  if (str.includes('science') || str.includes('humanities')) return 'Science and Humanities (Engineering)';
  return raw.trim();
};

const normalizeCategoryHeader = (header: string): string => {
  const h = header.toLowerCase().trim();
  if (h.includes('faculty dev')) return 'Faculty Development Activities';
  if (h.includes('seminar') && h.includes('talks')) return 'Seminar / Talks / Training Program';
  if (h.includes('club') || h.includes('cash association')) return 'Club Association';
  if (h.includes('seminar') || h.includes('conference')) return 'Seminar / Conference / Guest Talks';
  if (h.includes('award') || h.includes('recognition')) return 'Awards and Recognitions';
  if (h.includes('workshop') || h.includes('skill')) return 'Workshops and Skill Development';
  if (h.includes('student dev')) return 'Student Development Program';
  if (h.includes('industrial visit') || h.includes('inndustrial')) return 'Industrial Visit';
  if (h.includes('social outreach')) return 'Social Outreach Program';
  if (h.includes('guest lecture')) return 'Guest Lectures';
  if (h.includes('memorandum') || h.includes('mou') || h.includes('understanding')) return 'Memorandum of Understanding';
  if (h.includes('extension')) return 'Extension Activity';
  if (h.includes('publication')) return 'Student Publications';
  if (h.includes('best practice')) return 'Best Practices';
  if (h.includes('sdg')) return 'SDG Related Events';
  return header.trim();
};

// ---- Faculty CSV column definitions ----
const FACULTY_HEADERS = [
  'EmpId',
  'Name',
  'Designation',
  'Department',
  'Gender',
  'Date of birth',
  'PanCard No',
  'Date Of Joining',
  'Previous Teaching Experince Years',
  'Previous Teaching Experince Months',
  'Previous Industry Experince Years',
  'Previous Industry Experince Months',
  'Qualification Level',
  'Highest Qualification',
  'Experience in CU - Years',
  'Experience in CU - Months',
];

const FACULTY_REQUIRED = ['EmpId', 'Name', 'Designation', 'Department'];

export type UploadStage = 'upload' | 'validation' | 'preview' | 'confirm' | 'summary';

const UPLOAD_STAGES: { id: UploadStage; label: string; number: number }[] = [
  { id: 'upload', label: '1. Upload', number: 1 },
  { id: 'validation', label: '2. Validation', number: 2 },
  { id: 'preview', label: '3. Preview', number: 3 },
  { id: 'confirm', label: '4. Confirmation', number: 4 },
  { id: 'summary', label: '5. Summary', number: 5 },
];

export function BulkUploadDialog({ isOpen, onClose, token, onSuccess, uploadType = 'achievements' }: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [parseError, setParseError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadErrorsList, setUploadErrorsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [currentStage, setCurrentStage] = useState<UploadStage>('upload');
  const [importResult, setImportResult] = useState<{
    count?: number;
    createdCount?: number;
    linkedCount?: number;
    duplicatesCount?: number;
    errorsCount?: number;
    offerLettersCount?: number;
    message?: string;
    success?: boolean;
    data?: any[];
    duplicates?: any[];
    errors?: any[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { campusList, schoolList, departmentList } = useAcademicHierarchy();
  const FIXED_DEPARTMENTS = React.useMemo(() => {
    const set = new Set<string>();
    departmentList.forEach(d => {
      if (d) set.add(normalizeDepartmentName(d));
    });
    if (set.size === 0) {
      return [
        'Civil Engineering',
        'Computer Science and Engineering',
        'Electronics and Communication Engineering',
        'Electrical and Electronics Engineering',
        'Mechanical and Automobile Engineering',
        'Sciences and Humanities (Engineering)',
        'AI and Data Science Engineering',
        'School of Architecture'
      ];
    }
    return Array.from(set).filter(Boolean).sort();
  }, [departmentList]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2024-2025');
  const [selectedCampus, setSelectedCampus] = useState<string>('Kengeri Campus');
  const [selectedSchool, setSelectedSchool] = useState<string>('School of Engineering and Technology');
  const [selectedPublicationIndexing, setSelectedPublicationIndexing] = useState<string>('Scopus');
  const [selectedPublicationYear, setSelectedPublicationYear] = useState<string>('2024');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'ready' | 'needs_review' | 'duplicate' | 'invalid'>('all');
  const [editingPublicationRow, setEditingPublicationRow] = useState<{ index: number; data: any } | null>(null);
  const [viewingPublicationRow, setViewingPublicationRow] = useState<{ index: number; data: any } | null>(null);
  const [publicationUploadMode, setPublicationUploadMode] = useState<'publications' | 'citations'>('publications');

  // Placements & Internships V2.1 state
  const [selectedPlacementType, setSelectedPlacementType] = useState<'placement' | 'internship'>('placement');
  const [placementOfferLetterFiles, setPlacementOfferLetterFiles] = useState<Record<string, File>>({});
  const [activePlacementTempId, setActivePlacementTempId] = useState<string | null>(null);
  const [isVerifyingPlacements, setIsVerifyingPlacements] = useState<boolean>(false);
  const [placementVerificationSummary, setPlacementVerificationSummary] = useState<any>(null);
  const placementFileInputRef = useRef<HTMLInputElement>(null);

  // Publications Multi-File & Folder upload state
  const [publicationFiles, setPublicationFiles] = useState<PublicationFileItem[]>([]);
  const [facultyLookup, setFacultyLookup] = useState<Record<string, FacultyDirectoryMember>>({});
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isPlacement = uploadType === 'placements';
  const isFaculty = uploadType === 'faculty';
  const isStudent = uploadType === 'students';
  const isDepartment = uploadType === 'departments';
  const isConsultancy = uploadType === 'consultancy';
  const isDepartmentalActivity = uploadType === 'departmental-activities';
  const isPublication = uploadType === 'publications';
  const isPatent = uploadType === 'patents';
  const isSponsored = uploadType === 'sponsored-projects' || uploadType === 'sponsored-research';

  // Load verified faculty lookup directory on open for publications upload
  useEffect(() => {
    if (isOpen && isPublication && token) {
      const fetchFacultyDirectory = async () => {
        try {
          const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const baseUrl = rawApi.replace(/\/+$/, '');
          const res = await fetch(`${baseUrl}/api/publications/faculty-directory`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success && data.data) {
            setFacultyLookup(data.data);
          }
        } catch (err) {
          console.error('Failed to load faculty directory for publications upload:', err);
        }
      };
      fetchFacultyDirectory();
    }
  }, [isOpen, isPublication, token]);

  const resetState = () => {
    setFile(null);
    setPublicationFiles([]);
    setPublicationUploadMode('publications');
    setPreviewData([]);
    setParseError('');
    setUploadError('');
    setUploadErrorsList([]);
    setSuccessMsg('');
    setCurrentStage('upload');
    setImportResult(null);
    setSelectedDepartment('');
    setSelectedAcademicYear('2024-2025');
    setSelectedCampus('Kengeri Campus');
    setSelectedSchool('School of Engineering and Technology');
    setSelectedPlacementType('placement');
    setPlacementOfferLetterFiles({});
    setActivePlacementTempId(null);
    setIsVerifyingPlacements(false);
    setPlacementVerificationSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (placementFileInputRef.current) {
      placementFileInputRef.current.value = '';
    }
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    let csvContent = '';
    let fileName = 'bulk_template.csv';

    if (isSponsored) {
      csvContent =
        SPONSORED_RESEARCH_HEADERS.join(',') + '\n' +
        `"Autonomous Aerial Edge Computing Swarm for Precision Agriculture","Dr. Rajesh Kumar","Dr. Priya Sharma, Dr. Deepa Singh","Department of Science and Technology (DST) - SERB","CRG (Core Research Grant)","Government (National)","DST/SERB/2024/CRG-0891","2024-03-15",2024,"2024-04-01","2027-03-31","3 Years (36 Months)",4850000,2425000,"Ongoing",45,"Computer Science and Engineering","https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view","https://drive.google.com/file/d/1CyjNWt1YSB6oGNeLwCeCakhnVvrqueet8/view","https://serb.gov.in","Multi-UAV cooperative reinforcement learning framework."\n` +
        `"Low-Cost Nanostructured Photocatalytic Wastewater Remediation","Dr. Suresh Menon","Dr. Anita Rao","AICTE - Research Promotion Scheme (RPS)","RPS Grant-in-Aid","Government (National)","AICTE/RPS/8-45/2023-24","2023-11-20",2023,"2024-01-01","2026-12-31","3 Years (36 Months)",2200000,2200000,"Ongoing",60,"Civil Engineering","https://drive.google.com/file/d/1DzkOXu2ZTC7pHOfMxDfDbliowwsrvvfu9/view","","https://aicte-india.org","Visible light responsive titanium dioxide membrane filtration."`;
      fileName = 'sponsored_projects_bulk_template.csv';
    } else if (isPatent) {
      csvContent =
        PATENTS_HEADERS.join(',') + '\n' +
        `"AI-Driven Smart Grid Energy Optimization & Load Forecasting","Dr. Rajesh Kumar, Dr. Priya Sharma","202441012345","IN-PAT-456789","Granted","National (Indian)","Computer Science and Engineering",2024,"2023-08-15","2024-02-10","2024-11-20","2025-01-15","Schneider Electric India",1500000,"https://ipindiaonline.gov.in/patentsearch","https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view","Novel AI algorithm minimizing line loss in microgrids."\n` +
        `"Biodegradable Chitosan-Silica Nanocomposite Membrane for Effluent Treatment","Dr. Suresh Menon, Dr. Anita Rao","PCT/IN2023/050123","","Published","International (PCT)","Civil Engineering","","2023-11-05","2024-05-12","","","",0,"https://patentscope.wipo.int","","Eco-friendly membrane technology for industrial dye and heavy metal removal."`;
      fileName = 'patents_bulk_template.csv';
    } else if (isConsultancy) {
      csvContent =
        CONSULTANCY_HEADERS.join(',') + '\n' +
        `"Dr. Rajesh Kumar","AI-Powered Smart City Infrastructure Planning","Bangalore Smart City Corporation","contact@bscc.gov.in","+91 9876543210",2024,"2024-04-01","2026-03-31","","On Going",35.00,25.00,15.00,"Computer Science and Engineering","Technical advisory for smart traffic control and AI sensor grid","https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view","https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds8/view","https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds9/view"\n` +
        `"Dr. Deepa Singh","Automated Retail Analytics Platform","RetailMax Solutions Pvt. Ltd.","projects@retailmax.in","+91 9876543211",2023,"2023-01-15","2023-12-15","2023-12-20","Completed",20.00,18.50,18.50,"AI and Data Science Engineering","Predictive customer footfall analytics and inventory advisory","","",""`;
      fileName = 'consultancy_bulk_template.csv';
    } else if (isFaculty) {
      csvContent =
        FACULTY_HEADERS.join(',') + '\n' +
        `EMP001,"Dr. Rajesh Kumar",Professor,"Computer Science and Engineering",Male,1980-05-15,ABCPK1234D,2010-07-01,5,6,3,0,PhD,"Ph.D. in Computer Science",13,6\n` +
        `EMP002,"Ms. Priya Sharma","Assistant Professor","Electronics and Communication Engineering",Female,1990-03-22,XYZPS5678E,2018-08-01,2,0,0,0,PG,"M.Tech in VLSI",5,11`;
      fileName = 'faculty_bulk_template.csv';
    } else if (isStudent) {
      csvContent =
        STUDENT_HEADERS.join(',') + '\n' +
        `"2460301","Aarav Sharma","3A B.Tech CSE","APP12345","Male","2002-04-12","9876543210","Indian","General","Bengaluru","Karnataka","Bengaluru","Karnataka","9876543211","NO","NIL","Kengeri Campus","NO","Computer Science and Engineering","UG"\n` +
        `"2460302","Ananya Rao","3B B.Tech ADSE","APP12346","Female","2003-09-25","9876543212","Indian","General","Bengaluru","Karnataka","Mysuru","Karnataka","9876543213","NO","NIL","Kengeri Campus","NO","AI and Data Science Engineering","UG"\n` +
        `"2560301","Diya Patel","Research Scholar","APP12347","Female","1998-11-15","9876543214","Indian","General","Bengaluru","Karnataka","Hubballi","Karnataka","9876543215","NO","NIL","Kengeri Campus","NO","Civil Engineering","PhD"`;
      fileName = 'students_bulk_template.csv';
    } else if (isDepartment) {
      csvContent =
        DEPARTMENT_HEADERS.join(',') + '\n' +
        `CSE,"Computer Science and Engineering","Dr. Rajesh Kumar","hod.cse@christuniversity.in",2005,"080-1234567","Focus on Software Development, AI, and Cloud Computing."\n` +
        `ECE,"Electronics and Communication Engineering","Dr. Priya Sharma","hod.ece@christuniversity.in",2006,"080-1234568","Focus on Signal Processing, VLSI Design, and Embedded Systems."`;
      fileName = 'departments_bulk_template.csv';
    } else if (isPlacement) {
      const isIntern = selectedPlacementType === 'internship';
      csvContent =
        "Register Number,Name,Department,Program,Designation/Role,Company,Package\n" +
        (isIntern
          ? "\"2447002\",\"Jane Smith\",\"Computer Science and Engineering\",\"B.Tech Computer Science and Engineering\",\"Frontend Developer Intern\",\"Microsoft India\",45000\n\"2447003\",\"Arun Kumar\",\"Electronics and Communication Engineering\",\"B.Tech Electronics and Communication Engineering\",\"Hardware Intern\",\"Texas Instruments\",0"
          : "\"2447001\",\"John Doe\",\"Computer Science and Engineering\",\"B.Tech Computer Science and Engineering\",\"Software Development Engineer\",\"Google India\",14.50\n\"2447004\",\"Priya Sharma\",\"AI and Data Science Engineering\",\"B.Tech (Artificial Intelligence and Machine Learning)\",\"Data Engineer\",\"Samsung R&D\",8.50"
        );
      fileName = isIntern ? 'internships_bulk_template.csv' : 'placements_bulk_template.csv';
    } else if (isDepartmentalActivity) {
      csvContent =
        DEPARTMENTAL_ACTIVITY_MATRIX_HEADERS.map(h => `"${h}"`).join(',') + '\n' +
        `"AI and Data Science Engineering","Reports 2025","Reports 2025","-","-","-","-","Reports 2025","Reports 2025","-","-","2 MoUs 2025","Reports 2025-2026","Reports 2025-26","-","-","No Events found","Extension Activity - Reports 2026\nStudent Publications - 2026"\n` +
        `"Civil Engineering","-","-","-","Reports 2017 to Reports 2020","-","Reports 2015 to Reports 2024","-","Reports 2010, Reports 2019","-","-","-","-","-","-","-","No Events found","Workshops and Skill Development - Reports 2020\nIndustrial Visit - Reports 2017, Reports 2020"\n` +
        `"Computer Science and Engineering","Reports 2015 to Reports 2025","Reports 2015 to Reports 2025","-","-","Reports 2021-2022, Reports 2022-2023","-","Reports 2015 to Reports 2025","Reports 2015-18, Reports 2025","-","-","Compiled MoUs","Reports 2025-2026","Reports 2025-2026","-","-","No Events found","Student Development Programme - Reports 2017, Reports 2018"\n` +
        `"Electrical and Electronics Engineering","Reports 2017, Reports 2020","Reports 2016, Reports 2026","-","-","-","-","Reports 2010, Reports 2026","Reports 2018, Reports 2025","-","-","-","-","-","Reports 2025","Reports 2024, Reports 2025","Updated","Faculty Development Activities - Reports 2018\nSeminar/Talks/Training Programs - Reports 2017"\n` +
        `"Electronics and Communication Engineering","Reports 2015 to Reports 2025","Reports 2018 to Reports 2025","-","-","-","-","Reports 2016 to Reports 2025","2022-2025","-","-","-","-","-","-","-","No Events found","Faculty Development Activities - Reports 2022\nStudent Development Programme - Reports 2021"\n` +
        `"Mechanical and Automobile Engineering","Reports 2015 to Reports 2025","Reports 2018 to Reports 2025","-","-","-","-","Reports 2018 to Reports 2025","Reports 2023, Reports 2025","-","-","-","-","-","-","-","Updated","Faculty Development Activities - Reports 2026"\n` +
        `"Science and Humanities (Engineering)","Reports 2024 to Reports 2026","Reports 2023 to Reports 2026","Reports 2024-25","-","-","-","-","Reports 2024-25","Reports 2025-26","Reports 2025","-","-","-","-","-","No Events found",""`;
      fileName = 'departmental_activities_matrix_template.csv';
    } else if (isPublication) {
      csvContent =
        PUBLICATIONS_HEADERS.map(h => `"${h}"`).join(',') + '\n' +
        `"Kumar R., Sharma P.","Rajesh Kumar, Priya Sharma","Deep Learning Framework for Edge IoT Healthcare Sensors","2024","IEEE Transactions on Industrial Informatics","18","10.1109/TII.2024.1234567","https://ieeexplore.ieee.org","IEEE","1551-3203","",""\n` +
        `"Singh D., Menon S.","Deepa Singh, Suresh Menon","Sustainable High-Volume Fly Ash Concrete Under High Temperatures","2024","Journal of Cleaner Production","12","10.1016/j.jclepro.2024.140890","https://sciencedirect.com","Elsevier","0959-6526","",""`;
      fileName = 'publications_bulk_template.csv';
    } else {
      csvContent =
        "title,category,date,year,description,subcategory,achieverType,rank,score,organization,location,participants,impact,status\n" +
        "\"Deep Learning CSE Journal Paper\",research,2024-05-15,2024-2025,\"Published paper in IEEE Access\",Journal,faculty,,,\"IEEE\",\"Online\",\"Dr. Rajesh Kumar, Dr. Priya Sharma\",\"International\",submitted\n" +
        "\"National Tech Fest 1st Place\",awards,2024-02-10,2023-2024,\"Won gold medal in smart hackathon\",Hackathon,student,1st,10.00,\"SRM University\",\"Chennai\",\"Rahul Kumar, Sneha Patel\",\"National\",approved";
      fileName = 'achievements_bulk_template.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcelTemplate = () => {
    let headers: string[] = [];
    let sampleRows: any[][] = [];
    let fileName = 'bulk_template.xlsx';

    if (isSponsored) {
      headers = SPONSORED_RESEARCH_HEADERS;
      sampleRows = [
        ['Autonomous Aerial Edge Computing Swarm for Precision Agriculture', 'Dr. Rajesh Kumar', 'Dr. Priya Sharma, Dr. Deepa Singh', 'Department of Science and Technology (DST) - SERB', 'CRG (Core Research Grant)', 'Government (National)', 'DST/SERB/2024/CRG-0891', '2024-03-15', 2024, '2024-04-01', '2027-03-31', '3 Years (36 Months)', 4850000, 2425000, 'Ongoing', 45, 'Computer Science and Engineering', 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view', 'https://drive.google.com/file/d/1CyjNWt1YSB6oGNeLwCeCakhnVvrqueet8/view', 'https://serb.gov.in', 'Multi-UAV cooperative reinforcement learning framework.'],
        ['Low-Cost Nanostructured Photocatalytic Wastewater Remediation', 'Dr. Suresh Menon', 'Dr. Anita Rao', 'AICTE - Research Promotion Scheme (RPS)', 'RPS Grant-in-Aid', 'Government (National)', 'AICTE/RPS/8-45/2023-24', '2023-11-20', 2023, '2024-01-01', '2026-12-31', '3 Years (36 Months)', 2200000, 2200000, 'Ongoing', 60, 'Civil Engineering', 'https://drive.google.com/file/d/1DzkOXu2ZTC7pHOfMxDfDbliowwsrvvfu9/view', '', 'https://aicte-india.org', 'Visible light responsive titanium dioxide membrane filtration.']
      ];
      fileName = 'sponsored_projects_bulk_template.xlsx';
    } else if (isPatent) {
      headers = PATENTS_HEADERS;
      sampleRows = [
        ['AI-Driven Smart Grid Energy Optimization & Load Forecasting', 'Dr. Rajesh Kumar, Dr. Priya Sharma', '202441012345', 'IN-PAT-456789', 'Granted', 'National (Indian)', 'Computer Science and Engineering', 2024, '2023-08-15', '2024-02-10', '2024-11-20', '2025-01-15', 'Schneider Electric India', 1500000, 'https://ipindiaonline.gov.in/patentsearch', 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view', 'Novel AI algorithm minimizing line loss in microgrids.'],
        ['Biodegradable Chitosan-Silica Nanocomposite Membrane for Effluent Treatment', 'Dr. Suresh Menon, Dr. Anita Rao', 'PCT/IN2023/050123', '', 'Published', 'International (PCT)', 'Civil Engineering', '', '2023-11-05', '2024-05-12', '', '', '', 0, 'https://patentscope.wipo.int', '', 'Eco-friendly membrane technology for industrial dye and heavy metal removal.']
      ];
      fileName = 'patents_bulk_template.xlsx';
    } else if (isConsultancy) {
      headers = CONSULTANCY_HEADERS;
      sampleRows = [
        ['Dr. Rajesh Kumar', 'AI-Powered Smart City Infrastructure Planning', 'Bangalore Smart City Corporation', 'contact@bscc.gov.in', '+91 9876543210', 2024, '2024-04-01', '2026-03-31', '', 'On Going', 35.00, 25.00, 15.00, 'Computer Science and Engineering', 'Technical advisory for smart traffic control and AI sensor grid', 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view', 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds8/view', 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds9/view'],
        ['Dr. Deepa Singh', 'Automated Retail Analytics Platform', 'RetailMax Solutions Pvt. Ltd.', 'projects@retailmax.in', '+91 9876543211', 2023, '2023-01-15', '2023-12-15', '2023-12-20', 'Completed', 20.00, 18.50, 18.50, 'AI and Data Science Engineering', 'Predictive customer footfall analytics and inventory advisory', '', '', '']
      ];
      fileName = 'consultancy_bulk_template.xlsx';
    } else if (isFaculty) {
      headers = FACULTY_HEADERS;
      sampleRows = [
        ['EMP001', 'Dr. Rajesh Kumar', 'Professor', 'Computer Science and Engineering', 'Male', '1980-05-15', 'ABCPK1234D', '2010-07-01', '5', '6', '3', '0', 'PhD', 'Ph.D. in Computer Science', '13', '6'],
        ['EMP002', 'Ms. Priya Sharma', 'Assistant Professor', 'Electronics and Communication Engineering', 'Female', '1990-03-22', 'XYZPS5678E', '2018-08-01', '2', '0', '0', '0', 'PG', 'M.Tech in VLSI', '5', '11']
      ];
      fileName = 'faculty_bulk_template.xlsx';
    } else if (isStudent) {
      headers = STUDENT_HEADERS;
      sampleRows = [
        ['2460301', 'Aarav Sharma', '3A B.Tech CSE', 'APP12345', 'Male', '2002-04-12', '9876543210', 'Indian', 'General', 'Bengaluru', 'Karnataka', 'Bengaluru', 'Karnataka', '9876543211', 'NO', 'NIL', 'Kengeri Campus', 'NO', 'Computer Science and Engineering', 'UG'],
        ['2460302', 'Ananya Rao', '3B B.Tech ADSE', 'APP12346', 'Female', '2003-09-25', '9876543212', 'Indian', 'General', 'Bengaluru', 'Karnataka', 'Mysuru', 'Karnataka', '9876543213', 'NO', 'NIL', 'Kengeri Campus', 'NO', 'AI and Data Science Engineering', 'UG'],
        ['2560301', 'Diya Patel', 'Research Scholar', 'APP12347', 'Female', '1998-11-15', '9876543214', 'Indian', 'General', 'Bengaluru', 'Karnataka', 'Hubballi', 'Karnataka', '9876543215', 'NO', 'NIL', 'Kengeri Campus', 'NO', 'Civil Engineering', 'PhD']
      ];
      fileName = 'students_bulk_template.xlsx';
    } else if (isDepartment) {
      headers = DEPARTMENT_HEADERS;
      sampleRows = [
        ['CSE', 'Computer Science and Engineering', 'Dr. Rajesh Kumar', 'hod.cse@christuniversity.in', 2005, '080-1234567', 'Focus on Software Development, AI, and Cloud Computing.'],
        ['ECE', 'Electronics and Communication Engineering', 'Dr. Priya Sharma', 'hod.ece@christuniversity.in', 2006, '080-1234568', 'Focus on Signal Processing, VLSI Design, and Embedded Systems.']
      ];
      fileName = 'departments_bulk_template.xlsx';
    } else if (isPlacement) {
      const isIntern = selectedPlacementType === 'internship';
      headers = ['Register Number', 'Name', 'Department', 'Program', 'Designation/Role', 'Company', 'Package'];
      sampleRows = isIntern ? [
        ['2447002', 'Jane Smith', 'Computer Science and Engineering', 'B.Tech Computer Science and Engineering', 'Frontend Developer Intern', 'Microsoft India', 45000],
        ['2447003', 'Arun Kumar', 'Electronics and Communication Engineering', 'B.Tech Electronics and Communication Engineering', 'Hardware Intern', 'Texas Instruments', 0]
      ] : [
        ['2447001', 'John Doe', 'Computer Science and Engineering', 'B.Tech Computer Science and Engineering', 'Software Development Engineer', 'Google India', 14.50],
        ['2447004', 'Priya Sharma', 'AI and Data Science Engineering', 'B.Tech (Artificial Intelligence and Machine Learning)', 'Data Engineer', 'Samsung R&D', 8.50]
      ];
      fileName = isIntern ? 'internships_bulk_template.xlsx' : 'placements_bulk_template.xlsx';
    } else if (isDepartmentalActivity) {
      headers = DEPARTMENTAL_ACTIVITY_MATRIX_HEADERS;
      sampleRows = [
        ['AI and Data Science Engineering', 'Reports 2025', 'Reports 2025', '-', '-', '-', '-', 'Reports 2025', 'Reports 2025', '-', '-', '2 MoUs 2025', 'Reports 2025-2026', 'Reports 2025-26', '-', '-', 'No Events found', 'Extension Activity - Reports 2026\nStudent Publications - 2026'],
        ['Civil Engineering', '-', '-', '-', 'Reports 2017 to Reports 2020', '-', 'Reports 2015 to Reports 2024', '-', 'Reports 2010, Reports 2019', '-', '-', '-', '-', '-', '-', '-', 'No Events found', 'Workshops and Skill Development - Reports 2020\nIndustrial Visit - Reports 2017, Reports 2020'],
        ['Computer Science and Engineering', 'Reports 2015 to Reports 2025', 'Reports 2015 to Reports 2025', '-', '-', 'Reports 2021-2022, Reports 2022-2023', '-', 'Reports 2015 to Reports 2025', 'Reports 2015-18, Reports 2025', '-', '-', 'Compiled MoUs', 'Reports 2025-2026', 'Reports 2025-2026', '-', '-', 'No Events found', 'Student Development Programme - Reports 2017, Reports 2018'],
        ['Electrical and Electronics Engineering', 'Reports 2017, Reports 2020', 'Reports 2016, Reports 2026', '-', '-', '-', '-', 'Reports 2010, Reports 2026', 'Reports 2018, Reports 2025', '-', '-', '-', '-', '-', 'Reports 2025', 'Reports 2024, Reports 2025', 'Updated', 'Faculty Development Activities - Reports 2018\nSeminar/Talks/Training Programs - Reports 2017'],
        ['Electronics and Communication Engineering', 'Reports 2015 to Reports 2025', 'Reports 2018 to Reports 2025', '-', '-', '-', '-', 'Reports 2016 to Reports 2025', '2022-2025', '-', '-', '-', '-', '-', '-', '-', 'No Events found', 'Faculty Development Activities - Reports 2022\nStudent Development Programme - Reports 2021'],
        ['Mechanical and Automobile Engineering', 'Reports 2015 to Reports 2025', 'Reports 2018 to Reports 2025', '-', '-', '-', '-', 'Reports 2018 to Reports 2025', 'Reports 2023, Reports 2025', '-', '-', '-', '-', '-', '-', '-', 'Updated', 'Faculty Development Activities - Reports 2026'],
        ['Science and Humanities (Engineering)', 'Reports 2024 to Reports 2026', 'Reports 2023 to Reports 2026', 'Reports 2024-25', '-', '-', '-', '-', 'Reports 2024-25', 'Reports 2025-26', 'Reports 2025', '-', '-', '-', '-', '-', 'No Events found', '']
      ];
      fileName = 'departmental_activities_matrix_template.xlsx';
    } else if (isPublication) {
      headers = PUBLICATIONS_HEADERS;
      sampleRows = [
        ['Kumar R., Sharma P.', 'Rajesh Kumar, Priya Sharma', 'Deep Learning Framework for Edge IoT Healthcare Sensors', 2024, 'IEEE Transactions on Industrial Informatics', 18, '10.1109/TII.2024.1234567', 'https://ieeexplore.ieee.org', 'IEEE', '1551-3203', '', ''],
        ['Singh D., Menon S.', 'Deepa Singh, Suresh Menon', 'Sustainable High-Volume Fly Ash Concrete Under High Temperatures', 2024, 'Journal of Cleaner Production', 12, '10.1016/j.jclepro.2024.140890', 'https://sciencedirect.com', 'Elsevier', '0959-6526', '', '']
      ];
      fileName = 'publications_bulk_template.xlsx';
    } else {
      headers = ['title', 'category', 'date', 'year', 'description', 'subcategory', 'achieverType', 'rank', 'score', 'organization', 'location', 'participants', 'impact', 'status'];
      sampleRows = [
        ['Deep Learning CSE Journal Paper', 'research', '2024-05-15', '2024-2025', 'Published paper in IEEE Access', 'Journal', 'faculty', '', '', 'IEEE', 'Online', 'Dr. Rajesh Kumar, Dr. Priya Sharma', 'International', 'submitted'],
        ['National Tech Fest 1st Place', 'awards', '2024-02-10', '2023-2024', 'Won gold medal in smart hackathon', 'Hackathon', 'student', '1st', 10.00, 'SRM University', 'Chennai', 'Rahul Kumar, Sneha Patel', 'National', 'approved']
      ];
      fileName = 'achievements_bulk_template.xlsx';
    }

    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadPreviewReport = () => {
    if (previewData.length === 0) return;
    const headers = ['Row Number', 'Source File', 'Faculty Name', 'Employee ID', 'Department', 'Status', 'Title', 'Authors', 'Journal Name', 'Year', 'DOI', 'Citations', 'Issues / Duplicate Reason'];
    const rows = previewData.map((r, idx) => [
      idx + 1,
      r.sourceFile || '',
      r.facultyName || '',
      r.employeeId || '',
      r.department || '',
      r._rowStatus || 'ready',
      r.title || '',
      r.authorFullNames || r.authorName || '',
      r.journalName || '',
      r.publicationYear || r.year || '',
      r.doi || '',
      r.citationCount !== null && r.citationCount !== undefined ? r.citationCount : 'N/A',
      (r._issues ? r._issues.join('; ') : '') || r._duplicateReason || ''
    ]);
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publications_preview_validation_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleDownloadSummaryReport = () => {
    if (!importResult) return;
    const headers = ['Row Number', 'Source File', 'Faculty Name', 'Employee ID', 'Title', 'Status', 'Message'];
    const rows: any[] = [];
    const resAny = importResult as any;
    if (resAny.data && Array.isArray(resAny.data)) {
      resAny.data.forEach((r: any, idx: number) => {
        rows.push([
          idx + 1,
          r.sourceFile || '-',
          r.facultyName || '-',
          r.employeeId || '-',
          r.title || '-',
          'Created / Imported',
          'Successfully created in database'
        ]);
      });
    }
    if (resAny.duplicates && Array.isArray(resAny.duplicates)) {
      resAny.duplicates.forEach((d: any, idx: number) => {
        rows.push([
          d.row || idx + 1,
          d.sourceFile || '-',
          d.facultyName || '-',
          d.employeeId || '-',
          d.title || '-',
          'Duplicate Skipped',
          d.reason || 'Duplicate publication or association'
        ]);
      });
    }
    if (resAny.errors && Array.isArray(resAny.errors)) {
      resAny.errors.forEach((e: any, idx: number) => {
        rows.push([
          e.row || idx + 1,
          e.sourceFile || '-',
          e.facultyName || '-',
          e.employeeId || '-',
          e.title || '-',
          'Needs Review / Excluded',
          e.issues ? (Array.isArray(e.issues) ? e.issues.join('; ') : e.issues) : 'Incomplete mandatory fields'
        ]);
      });
    }
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(row => row.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publications_bulk_import_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleSaveRowCorrection = (updatedRow: any) => {
    if (!editingPublicationRow) return;
    const idx = editingPublicationRow.index;
    const updated = [...previewData];

    const auth = (updatedRow.authorName || updatedRow.authorFullNames || '').trim();
    const tit = (updatedRow.title || '').trim();
    const jrn = (updatedRow.journalName || '').trim();
    const yr = updatedRow.publicationYear || updatedRow.year || '';
    const matchYear = String(yr).match(/\b(19\d\d|20\d\d)\b/);
    const validYear = matchYear ? matchYear[1] : null;

    let targetEmpId = updatedRow.employeeId ? String(updatedRow.employeeId).trim() : null;
    let targetFacultyName = updatedRow.facultyName;
    let targetDept = updatedRow.department;

    if (targetEmpId && facultyLookup[targetEmpId]) {
      targetFacultyName = facultyLookup[targetEmpId].name;
      targetDept = facultyLookup[targetEmpId].department;
    }

    const issues: string[] = [];
    if (!auth) issues.push('Authors or Author full names required');
    if (!tit) issues.push('Publication Title required');
    if (!jrn) issues.push('Source title (Journal Name) required');
    if (!validYear) issues.push('Valid 4-digit Publication Year required');
    if (!targetEmpId) issues.push('Faculty Employee ID required');
    else if (!facultyLookup[targetEmpId]) issues.push(`Employee ID "${targetEmpId}" not found in Faculty Directory`);

    updated[idx] = {
      ...updated[idx],
      ...updatedRow,
      employeeId: targetEmpId,
      facultyName: targetFacultyName,
      department: targetDept,
      authorName: auth,
      title: tit,
      journalName: jrn,
      publicationYear: validYear || yr,
      year: validYear || yr,
      _issues: issues,
      _rowStatus: issues.length > 0 ? 'needs_review' : 'ready'
    };

    setPreviewData(updated);
    setEditingPublicationRow(null);
  };

  const parseSingleSpreadsheetForPublication = async (
    file: File,
    targetEmployeeId: string | null,
    targetFacultyName: string | null,
    targetDepartment: string | null,
    targetIndexing: string
  ): Promise<any[]> => {
    return new Promise((resolve) => {
      const fileName = file.name.toLowerCase();
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          let csvText = '';
          if (fileName.endsWith('.csv')) {
            csvText = e.target?.result as string;
          } else {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
              resolve([]);
              return;
            }
            csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
          }

          if (!csvText || !csvText.trim()) {
            resolve([]);
            return;
          }

          const allRows = tokenizeCsv(csvText);
          if (allRows.length < 2) {
            resolve([]);
            return;
          }

          const headers = allRows[0].map(h => h.trim());
          const records: any[] = [];

          for (let i = 1; i < allRows.length; i++) {
            const rowValues = allRows[i];
            if (rowValues.every(v => v === '')) continue;

            const rowObj: Record<string, string> = {};
            headers.forEach((h, colIdx) => {
              if (rowValues[colIdx] !== undefined) {
                rowObj[h] = rowValues[colIdx].trim();
              }
            });

            // Scopus + WoS + IQAC Synonyms
            const rawAuthors = rowObj['Authors'] ?? rowObj['AU'] ?? rowObj['Author Name'] ?? rowObj['Author'] ?? rowObj['authorName'] ?? '';
            const rawFullNames = rowObj['Author full names'] ?? rowObj['AF'] ?? rowObj['Author Full Names'] ?? rowObj['authorFullNames'] ?? '';
            const rawTitle = rowObj['Title'] ?? rowObj['Article Title'] ?? rowObj['TI'] ?? rowObj['Publication Title'] ?? rowObj['Paper Title'] ?? rowObj['title'] ?? '';
            const rawYear = rowObj['Year'] ?? rowObj['Publication Year'] ?? rowObj['PY'] ?? rowObj['publicationYear'] ?? rowObj['academicYear'] ?? '';
            const rawJournal = rowObj['Source title'] ?? rowObj['Source Title'] ?? rowObj['SO'] ?? rowObj['Journal Name'] ?? rowObj['Journal'] ?? rowObj['journalName'] ?? '';
            const rawCitations = rowObj['Cited by'] ?? rowObj['Times Cited, WoS Core'] ?? rowObj['Times Cited, All Databases'] ?? rowObj['TC'] ?? rowObj['citationCount'] ?? rowObj['Citations'] ?? null;
            const rawDoi = rowObj['DOI'] ?? rowObj['DI'] ?? rowObj['doi'] ?? rowObj['DOI Number'] ?? '';
            const rawLink = rowObj['Link'] ?? rowObj['URL'] ?? rowObj['paperUrl'] ?? rowObj['Publication Link'] ?? '';
            const rawPublisher = rowObj['Publisher'] ?? rowObj['PU'] ?? rowObj['publisher'] ?? '';
            const rawIssn = rowObj['ISSN'] ?? rowObj['SN'] ?? rowObj['issn'] ?? '';
            const rawIsbn = rowObj['ISBN'] ?? rowObj['BN'] ?? rowObj['isbn'] ?? '';
            const rawCoden = rowObj['CODEN'] ?? rowObj['CA'] ?? rowObj['coden'] ?? '';

            const cleanAuthors = String(rawAuthors || '').trim();
            const cleanFullNames = rawFullNames ? String(rawFullNames).trim() : '';
            const cleanTitle = String(rawTitle || '').trim();
            const cleanJournal = String(rawJournal || '').trim();

            const yearMatch = String(rawYear || '').match(/\b(19\d\d|20\d\d)\b/);
            const cleanYear = yearMatch ? yearMatch[1] : null;

            let cleanCitations: number | null = null;
            if (rawCitations !== null && rawCitations !== undefined && String(rawCitations).trim() !== '') {
              const s = String(rawCitations).trim();
              if (!['n/a', 'na', 'nil', 'null', '-', '--', 'none', 'undefined'].includes(s.toLowerCase())) {
                const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
                cleanCitations = isNaN(num) ? null : num;
              }
            }

            const issues: string[] = [];
            if (!cleanAuthors && !cleanFullNames) issues.push('Authors or Full Names required');
            if (!cleanTitle) issues.push('Publication Title required');
            if (!cleanJournal) issues.push('Source title (Journal Name) required');
            if (!cleanYear) issues.push('Valid 4-digit Publication Year required');
            if (!targetEmployeeId) issues.push('Employee ID missing from filename');

            const cleanDoi = rawDoi ? String(rawDoi).replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '').trim() : '';

            records.push({
              sourceFile: file.name,
              employeeId: targetEmployeeId,
              facultyName: targetFacultyName,
              department: targetDepartment,
              indexing: targetIndexing,
              journalType: targetIndexing,
              authorName: cleanAuthors || cleanFullNames,
              authorFullNames: cleanFullNames,
              title: cleanTitle,
              journalName: cleanJournal,
              publicationYear: cleanYear || rawYear,
              year: cleanYear || rawYear,
              citationCount: cleanCitations,
              doi: cleanDoi,
              paperUrl: rawLink ? String(rawLink).trim() : '',
              publisher: rawPublisher ? String(rawPublisher).trim() : '',
              issn: rawIssn ? String(rawIssn).trim() : '',
              isbn: rawIsbn ? String(rawIsbn).trim() : '',
              coden: rawCoden ? String(rawCoden).trim() : '',
              _issues: issues,
              _rowStatus: issues.length > 0 ? 'needs_review' : 'ready'
            });
          }

          resolve(records);
        } catch (err) {
          console.error(`Error parsing publication spreadsheet ${file.name}:`, err);
          resolve([]);
        }
      };

      if (fileName.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleProcessPublicationFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const validSpreadsheetFiles = rawFiles.filter(f => {
      const n = f.name.toLowerCase();
      return (n.endsWith('.csv') || n.endsWith('.xlsx') || n.endsWith('.xls')) && !n.startsWith('~$') && !n.startsWith('.');
    });

    if (validSpreadsheetFiles.length === 0) {
      setParseError('No supported CSV or Excel spreadsheets (.csv, .xlsx, .xls) found in the selection.');
      return;
    }

    setLoading(true);
    setParseError('');
    setUploadError('');

    const newPublicationFiles: PublicationFileItem[] = [];
    const newRecordsBatch: any[] = [];

    for (const file of validSpreadsheetFiles) {
      const empId = extractEmployeeIdFromFilename(file.name);
      let matchedFaculty = empId && facultyLookup[empId] ? facultyLookup[empId] : null;
      let facultyName = matchedFaculty ? matchedFaculty.name : null;
      let department = matchedFaculty ? matchedFaculty.department : null;
      let status: 'ready' | 'needs_review' | 'error' = 'ready';
      let errorMessage: string | undefined = undefined;

      if (!empId) {
        status = 'needs_review';
        errorMessage = 'Filename missing Employee ID prefix (e.g. 2043_Name.xlsx)';
      } else if (!matchedFaculty) {
        status = 'needs_review';
        errorMessage = `Employee ID "${empId}" not found in Faculty Directory`;
      } else if (matchedFaculty.hasConflict) {
        status = 'needs_review';
        errorMessage = `Employee ID "${empId}" has conflicting identities in Faculty Directory`;
      }

      const defaultIndexing = 'Scopus';
      const parsedRows = await parseSingleSpreadsheetForPublication(
        file,
        empId,
        facultyName,
        department,
        defaultIndexing
      );

      newRecordsBatch.push(...parsedRows);

      newPublicationFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        file,
        name: file.name,
        size: file.size,
        employeeId: empId,
        facultyName,
        department,
        indexing: defaultIndexing,
        status,
        errorMessage,
        records: parsedRows
      });
    }

    setFile(validSpreadsheetFiles[0]);

    setPublicationFiles(prev => {
      const map = new Map<string, PublicationFileItem>();
      prev.forEach(f => map.set(f.name, f));
      newPublicationFiles.forEach(f => map.set(f.name, f));
      return Array.from(map.values());
    });

    setPreviewData(prev => {
      const fileNamesToRemove = new Set(newPublicationFiles.map(f => f.name));
      const kept = prev.filter(r => !fileNamesToRemove.has(r.sourceFile));
      return [...kept, ...newRecordsBatch];
    });

    setLoading(false);
  };

  const handleFileIndexingChange = (fileName: string, newIndexing: string) => {
    setPublicationFiles(prev => prev.map(f => {
      if (f.name === fileName) {
        return { ...f, indexing: newIndexing };
      }
      return f;
    }));

    setPreviewData(prev => prev.map(r => {
      if (r.sourceFile === fileName) {
        return {
          ...r,
          indexing: newIndexing,
          journalType: newIndexing
        };
      }
      return r;
    }));
  };

  const handleRemovePublicationFile = (fileName: string) => {
    setPublicationFiles(prev => {
      const remaining = prev.filter(f => f.name !== fileName);
      if (remaining.length === 0) {
        setFile(null);
      } else {
        setFile(remaining[0].file);
      }
      return remaining;
    });

    setPreviewData(prev => prev.filter(r => r.sourceFile !== fileName));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setParseError('Please upload a valid CSV or Excel file (.csv, .xls, .xlsx).');
      return;
    }

    setFile(selectedFile);
    setParseError('');
    setUploadError('');
    setUploadErrorsList([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (!result) {
        setParseError('Unable to read the selected file.');
        return;
      }

      if (fileName.endsWith('.csv')) {
        parseCSV(result as string);
      } else {
        parseExcel(result as ArrayBuffer);
      }
    };

    if (fileName.endsWith('.csv')) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const parseExcel = (data: ArrayBuffer) => {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setParseError('Excel file contains no sheets.');
        return;
      }

      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
      if (!csv || csv.trim().length === 0) {
        setParseError('The selected Excel sheet is empty.');
        return;
      }

      parseCSV(csv);
    } catch (error) {
      console.error('Excel parse error:', error);
      setParseError('Unable to parse the Excel file. Please ensure it is a valid .xls or .xlsx spreadsheet.');
    }
  };

  const parseCSV = (text: string) => {
    // RFC 4180-compliant parser: handles quoted fields with embedded commas and newlines
    const tokenize = (input: string): string[][] => {
      const rows: string[][] = [];
      let row: string[] = [];
      let field = '';
      let inQuotes = false;
      let i = 0;

      while (i < input.length) {
        const ch = input[i];

        if (inQuotes) {
          if (ch === '"') {
            // Peek ahead for escaped quote ("")
            if (input[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              inQuotes = false;
              i++;
            }
          } else {
            field += ch;
            i++;
          }
        } else {
          if (ch === '"') {
            inQuotes = true;
            i++;
          } else if (ch === ',') {
            row.push(field.trim());
            field = '';
            i++;
          } else if (ch === '\r' && input[i + 1] === '\n') {
            row.push(field.trim());
            rows.push(row);
            row = [];
            field = '';
            i += 2;
          } else if (ch === '\n') {
            row.push(field.trim());
            rows.push(row);
            row = [];
            field = '';
            i++;
          } else {
            field += ch;
            i++;
          }
        }
      }
      // Push last field/row if any
      if (field || row.length > 0) {
        row.push(field.trim());
        if (row.some(v => v !== '')) rows.push(row);
      }
      return rows;
    };

    const allRows = tokenize(text);
    if (allRows.length < 2) {
      setParseError('The CSV file is empty or lacks headers.');
      return;
    }

    const headers = allRows[0].map(h => h.replace(/^["']|["']$/g, '').trim());

    // Required fields check
    let missing: string[] = [];
    if (isConsultancy) {
      const lowerHeaders = headers.map(h => h.toLowerCase().trim());
      const hasConsultant = lowerHeaders.some(lh => lh.includes('teacher consultant') || lh.includes('consultant'));
      const hasProject = lowerHeaders.some(lh => lh.includes('consultancy project') || lh.includes('project name') || lh === 'title');
      const hasAgency = lowerHeaders.some(lh => lh.includes('agency') || lh.includes('sponsoring') || lh.includes('client'));
      const hasYear = lowerHeaders.some(lh => lh.includes('year') || lh.includes('start year'));

      const missingFields = [];
      if (!hasConsultant) missingFields.push('Name of Teacher Consultant');
      if (!hasProject) missingFields.push('Name of Consultancy Project');
      if (!hasAgency) missingFields.push('Agency Name');
      if (!hasYear) missingFields.push('Consultancy Start Year');
      missing = missingFields;
    } else if (isFaculty) {
      missing = FACULTY_REQUIRED.filter(field => !headers.includes(field));
    } else if (isStudent) {
      missing = STUDENT_REQUIRED.filter(field => !headers.includes(field));
    } else if (isDepartment) {
      missing = DEPARTMENT_REQUIRED.filter(field => !headers.includes(field));
    } else if (isPlacement) {
      const hasAY = headers.some(h => ['AY (Academic Year)', 'AY( Academic Year)', 'AY (Academic Year)', 'AY', 'Batch', 'batch'].includes(h));
      const reqOthers = ['Register Number', 'Name', 'Department', 'Company', 'Package'];
      const missingOthers = reqOthers.filter(field => !headers.includes(field));
      if (!hasAY) missingOthers.push('AY (Academic Year)');
      missing = missingOthers;
    } else if (isDepartmentalActivity) {
      const isMatrixFormat = headers.some(h => {
        const lh = h.toLowerCase().trim();
        return (
          lh.includes('department') ||
          lh.includes('faculty dev') ||
          lh.includes('seminar') ||
          lh.includes('workshop') ||
          lh.includes('industrial') ||
          lh.includes('pending')
        );
      }) && !headers.includes('Title') && !headers.includes('title');

      if (isMatrixFormat) {
        const records: any[] = [];

        for (let i = 1; i < allRows.length; i++) {
          const rowValues = allRows[i];
          if (rowValues.every(v => v === '')) continue;

          const rawDept = (rowValues[0] || '').trim();
          if (!rawDept) continue;
          const department = normalizeDeptName(rawDept);

          headers.forEach((header, colIdx) => {
            if (colIdx === 0) return;
            const cellVal = (rowValues[colIdx] || '').trim();
            if (!cellVal || cellVal === '-' || cellVal.toLowerCase() === 'nil') return;

            const lowerHeader = header.toLowerCase().trim();

            if (lowerHeader.includes('pending')) {
              const notes = cellVal.split(/\r?\n|;/).map(n => n.trim()).filter(n => n && n !== '-');
              notes.forEach(note => {
                let cat = 'Extension Activity';
                if (note.toLowerCase().includes('faculty')) cat = 'Faculty Development Activities';
                else if (note.toLowerCase().includes('seminar') || note.toLowerCase().includes('talks')) cat = 'Seminar / Talks / Training Program';
                else if (note.toLowerCase().includes('workshop')) cat = 'Workshops and Skill Development';
                else if (note.toLowerCase().includes('student dev')) cat = 'Student Development Program';
                else if (note.toLowerCase().includes('industrial') || note.toLowerCase().includes('visit')) cat = 'Industrial Visit';
                else if (note.toLowerCase().includes('publication')) cat = 'Student Publications';

                records.push({
                  academicYear: selectedAcademicYear,
                  campus: selectedCampus,
                  school: selectedSchool,
                  department,
                  activityCategory: cat,
                  title: note,
                  reportDetails: note,
                  status: 'Pending',
                  pendingNotes: note
                });
              });
            } else if (lowerHeader.includes('departmental events')) {
              // Status column, ignore
            } else {
              const cat = normalizeCategoryHeader(header);
              records.push({
                academicYear: selectedAcademicYear,
                campus: selectedCampus,
                school: selectedSchool,
                department,
                activityCategory: cat,
                title: `${cat} - ${cellVal}`,
                reportDetails: cellVal,
                status: 'Completed'
              });
            }
          });
        }

        if (records.length === 0) {
          setParseError('No activity records or pending reports detected in the uploaded matrix spreadsheet.');
          return;
        }

        setPreviewData(records);
        return;
      }

      missing = DEPARTMENTAL_ACTIVITY_REQUIRED.filter(field => !headers.includes(field));
    } else if (isSponsored) {
      missing = SPONSORED_RESEARCH_REQUIRED.filter(field => !headers.some(h => {
        const lh = h.toLowerCase().trim();
        const flh = field.toLowerCase().trim();
        return (
          lh === flh ||
          (field === 'Project Title' && (lh.includes('title') || lh.includes('project'))) ||
          (field === 'Principal Investigator' && (lh.includes('principal') || lh.includes('investigator') || lh.includes('pi') || lh.includes('author'))) ||
          (field === 'Funding Agency' && (lh.includes('agency') || lh.includes('funding') || lh.includes('sponsor')))
        );
      }));
    } else if (isPatent) {
      missing = PATENTS_REQUIRED.filter(field => !headers.some(h => {
        const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (field === 'Title') {
          return cleanH.includes('title') || cleanH.includes('invention') || cleanH.includes('patent') || cleanH.includes('project');
        }
        if (field === 'Inventors') {
          return cleanH.includes('inventor') || cleanH.includes('author') || cleanH.includes('faculty') || cleanH.includes('investigator') || cleanH.includes('applicant');
        }
        return cleanH === field.toLowerCase().replace(/[^a-z0-9]/g, '');
      }));
    } else if (isPublication) {
      const hasTitle = headers.some(h => {
        const lh = h.toLowerCase().trim();
        return lh === 'title' || lh === 'publication title' || lh === 'paper title' || lh === 'article title';
      });
      const hasAuthor = headers.some(h => {
        const lh = h.toLowerCase().trim();
        return lh === 'authors' || lh === 'author full names' || lh === 'author name' || lh === 'author' || lh.includes('author');
      });
      const hasJournal = headers.some(h => {
        const lh = h.toLowerCase().trim();
        return lh === 'source title' || lh === 'journal name' || lh === 'journal';
      });
      missing = [];
      if (!hasTitle) missing.push('Title');
      if (!hasAuthor) missing.push('Authors / Author full names');
      if (!hasJournal) missing.push('Source title (Journal Name)');
    } else if (isPlacement) {
      const lowerHeaders = headers.map(h => h.toLowerCase().trim());
      const hasReg = lowerHeaders.some(h => h === 'register number' || h === 'reg no' || h === 'register no' || h === 'studentid');
      const hasName = lowerHeaders.some(h => h === 'name' || h === 'student name' || h === 'studentname');
      const hasDept = lowerHeaders.some(h => h === 'department' || h === 'dept');
      const hasProgram = lowerHeaders.some(h => h === 'program' || h === 'course' || h === 'degree');
      const hasRole = lowerHeaders.some(h => h === 'designation/role' || h === 'designation' || h === 'role' || h === 'job title');
      const hasCompany = lowerHeaders.some(h => h === 'company' || h === 'recruiter' || h === 'organization');
      const hasPackage = lowerHeaders.some(h => h === 'package' || h === 'stipend' || h === 'ctc' || h === 'salary');

      missing = [];
      if (!hasReg) missing.push('Register Number');
      if (!hasName) missing.push('Name');
      if (!hasDept) missing.push('Department');
      if (!hasProgram) missing.push('Program');
      if (!hasRole) missing.push('Designation/Role');
      if (!hasCompany) missing.push('Company');
      if (selectedPlacementType === 'placement' && !hasPackage) missing.push('Package');
    } else {
      const required = ['title', 'category', 'date', 'year'];
      missing = required.filter(field => !headers.includes(field));
    }

    if (missing.length > 0) {
      setParseError(`CSV missing required column headers: ${missing.join(', ')}`);
      return;
    }

    const records: any[] = [];

    for (let i = 1; i < allRows.length; i++) {
      const rowValues = allRows[i];
      // Skip entirely empty rows
      if (rowValues.every(v => v === '')) continue;

      const record: any = {};
      headers.forEach((header, index) => {
        if (rowValues[index] !== undefined) {
          const val = rowValues[index];
          if (isConsultancy) {
            const lowerHeader = header.toLowerCase().trim();
            if (lowerHeader.includes('s. no') || lowerHeader.includes('s.no')) {
              // Ignore serial number column
            } else if (lowerHeader.includes('teacher consultant') || lowerHeader.includes('consultant')) {
              record['teacherConsultant'] = val || '';
            } else if (lowerHeader.includes('consultancy project') || lowerHeader.includes('project name') || lowerHeader === 'title') {
              record['projectName'] = val || '';
            } else if (lowerHeader === 'agency name' || lowerHeader.includes('client name')) {
              record['agencyName'] = val || '';
            } else if (lowerHeader.includes('agency contact email') || lowerHeader.includes('contact email') || lowerHeader.includes('client email')) {
              record['agencyContactEmail'] = val || '';
            } else if (lowerHeader.includes('agency contact number') || lowerHeader.includes('contact number') || lowerHeader.includes('phone') || lowerHeader.includes('mobile')) {
              record['agencyContactNumber'] = val || '';
            } else if (lowerHeader.includes('sponsoring agency') || lowerHeader.includes('consulting/sponsoring')) {
              record['sponsoringAgency'] = val || '';
            } else if (lowerHeader.includes('start year') || lowerHeader === 'year' || lowerHeader.includes('academic year')) {
              record['consultancyStartYear'] = val || '';
              record['year'] = val || '';
            } else if (lowerHeader.includes('start date') || lowerHeader === 'startdate') {
              record['startDate'] = val || '';
            } else if (lowerHeader.includes('expected end date') || lowerHeader.includes('expected end') || lowerHeader === 'end date') {
              record['expectedEndDate'] = val || '';
            } else if (lowerHeader.includes('actual completion date') || lowerHeader.includes('completion date') || lowerHeader.includes('actual completion')) {
              record['actualCompletionDate'] = val || '';
            } else if (lowerHeader.includes('project status') || lowerHeader === 'status') {
              record['projectStatus'] = val || '';
            } else if (lowerHeader.includes('contract value')) {
              record['contractValueInLakhs'] = val ? parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0 : null;
            } else if (lowerHeader.includes('revenue')) {
              record['revenueInLakhs'] = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
            } else if (lowerHeader.includes('amount received')) {
              record['amountReceivedInLakhs'] = val ? parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0 : null;
            } else if (lowerHeader === 'department') {
              record['department'] = val || '';
            } else if (lowerHeader.includes('scope') || lowerHeader.includes('deliverable') || lowerHeader.includes('description') || lowerHeader.includes('summary')) {
              record['description'] = val || '';
            } else if (lowerHeader.includes('agreement') || lowerHeader.includes('work order')) {
              record['agreementLinks'] = val || '';
            } else if (lowerHeader.includes('invoice')) {
              record['invoiceLinks'] = val || '';
            } else if (lowerHeader.includes('receipt')) {
              record['receiptLinks'] = val || '';
            } else {
              record[header] = val;
            }
          } else if (isFaculty) {
            // Map CSV headers to backend field names
            switch (header) {
              case 'EmpId':            record['employeeId'] = val || 'NIL'; break;
              case 'Name':             record['name'] = val || 'NIL'; break;
              case 'Designation':      record['designation'] = normalizeDesignationName(val) || 'NIL'; break;
              case 'Department':       record['department'] = normalizeDepartmentName(val) || 'NIL'; break;
              case 'Gender':           record['gender'] = normalizeGender(val); break;
              case 'Date of birth':    record['dateOfBirth'] = formatDateToISO(val); break;
              case 'PanCard No':       record['panCardNo'] = val || 'NIL'; break;
              case 'Date Of Joining':  record['dateOfJoining'] = formatDateToISO(val); break;
              case 'Previous Teaching Experince Years':   record['prevTeachingExpYears'] = val || 'NIL'; break;
              case 'Previous Teaching Experince Months':  record['prevTeachingExpMonths'] = val || 'NIL'; break;
              case 'Previous Industry Experince Years':   record['prevIndustryExpYears'] = val || 'NIL'; break;
              case 'Previous Industry Experince Months':  record['prevIndustryExpMonths'] = val || 'NIL'; break;
              case 'Qualification Level':     record['qualificationLevel'] = val || 'NIL'; break;
              case 'Highest Qualification':   record['highestQualification'] = val || 'NIL'; break;
              case 'Experience in CU - Years':  record['cuExpYears'] = val || 'NIL'; break;
              case 'Experience in CU - Months': record['cuExpMonths'] = val || 'NIL'; break;
              case 'Academic Year':            record['academicYear'] = val || selectedAcademicYear || '2024-2025'; break;
              default: record[header] = val;
            }
            if (!record['academicYear']) {
              record['academicYear'] = selectedAcademicYear || '2024-2025';
            }
          } else if (isStudent) {
            // Map CSV headers to student backend field names
            switch (header) {
              case 'Register No':              record['registerNumber'] = val; break;
              case 'Student Name':             record['name'] = val; break;
              case 'Academic Year':            record['academicYear'] = val || '2024-2025'; break;
              case 'School':                   record['school'] = val || 'School of Engineering and Technology'; break;
              case 'Program Level':            record['programLevel'] = val || 'UG'; break;
              case 'Course':                   record['course'] = val || 'NIL'; break;
              case 'Class Name':               record['className'] = val || 'NIL'; break;
              case 'Application No':           record['applicationNo'] = val || 'NIL'; break;
              case 'Gender':                   record['gender'] = normalizeGender(val) || 'Male'; break;
              case 'Date Of Birth':            record['dob'] = formatDateToISO(val); break;
              case 'Mobile No':                record['mobileNo'] = val || 'NIL'; record['phone'] = val || 'NIL'; break;
              case 'Nationality':              record['nationality'] = val || 'NIL'; break;
              case 'Caste':                    record['caste'] = val || 'NIL'; break;
              case 'Current City':             record['currentCity'] = val || 'NIL'; break;
              case 'Current State':            record['currentState'] = val || 'NIL'; break;
              case 'Permanent City':           record['permanentCity'] = val || 'NIL'; break;
              case 'Permanent State':          record['permanentState'] = val || 'NIL'; break;
              case 'Parent Mobile No':         record['parentMobileNo'] = val || 'NIL'; record['guardianPhone'] = val || 'NIL'; break;
              case 'Handicapped':              record['handicapped'] = val || 'NIL'; break;
              case 'Handicapped Description':  record['handicappedDescription'] = val || 'NIL'; break;
              case 'Campus':                   record['campus'] = val || 'NIL'; break;
              case 'Disability: (YES/NO)':     record['disability'] = val || 'NIL'; break;
              case 'Department':               record['department'] = val || 'NIL'; break;
              case 'Batch':                    record['batch'] = val || 'NIL'; break;
              case 'S. No.':
              case 'S.No':
              case 'S.No.':
                break; // Ignore serial number column
              default: record[header] = val;
            }
          } else if (isDepartment) {
            // Map CSV headers to department backend field names
            switch (header) {
              case 'Code':             record['code'] = val || 'NIL'; break;
              case 'Name':             record['name'] = val || 'NIL'; break;
              case 'HOD Name':         record['hodName'] = val || 'NIL'; break;
              case 'HOD Email':        record['hodEmail'] = val || 'NIL'; break;
              case 'Established Year': record['establishedYear'] = parseInt(val) || null; break;
              case 'Phone':            record['phone'] = val || 'NIL'; break;
              case 'Description':      record['description'] = val || 'NIL'; break;
              default: record[header] = val;
            }
          } else if (isPlacement) {
            const lh = header.toLowerCase().trim();
            if (lh === 'register number' || lh === 'reg no' || lh === 'register no' || lh === 'studentid') {
              record['studentId'] = val ? String(val).trim() : '';
            } else if (lh === 'name' || lh === 'student name' || lh === 'studentname') {
              record['studentName'] = val ? String(val).trim() : '';
            } else if (['ay (academic year)', 'ay( academic year)', 'ay', 'batch'].includes(lh)) {
              record['batch'] = val ? String(val).trim() : selectedAcademicYear;
            } else if (lh === 'department' || lh === 'dept') {
              record['department'] = val ? String(val).trim() : '';
            } else if (lh === 'program' || lh === 'course' || lh === 'degree') {
              record['course'] = val ? String(val).trim() : '';
            } else if (lh === 'designation/role' || lh === 'designation' || lh === 'role' || lh === 'job title') {
              record['role'] = val ? String(val).trim() : '';
            } else if (lh === 'company' || lh === 'recruiter' || lh === 'organization') {
              record['company'] = val ? String(val).trim() : '';
            } else if (lh === 'package' || lh === 'stipend' || lh === 'ctc' || lh === 'salary') {
              record['rawPackage'] = val;
              if (selectedPlacementType === 'placement') {
                const cleanStr = String(val !== undefined && val !== null ? val : '').trim();
                const num = parseFloat(cleanStr.replace(/[^0-9.]/g, ''));
                record['package'] = isNaN(num) ? 0 : num;
              } else {
                const cleanStr = String(val !== undefined && val !== null ? val : '').trim();
                if (!cleanStr) {
                  record['package'] = null;
                } else {
                  const num = parseFloat(cleanStr.replace(/[^0-9.]/g, ''));
                  record['package'] = isNaN(num) ? null : num;
                }
              }
            } else {
              record[header] = val;
            }
          } else if (isDepartmentalActivity) {
            switch (header) {
              case 'Academic Year':     record['academicYear'] = val; break;
              case 'Campus':            record['campus'] = val; break;
              case 'School':            record['school'] = val; break;
              case 'Department':        record['department'] = val; break;
              case 'Activity Category': record['activityCategory'] = val; break;
              case 'Title':             record['title'] = val; break;
              case 'Report Details':    record['reportDetails'] = val; break;
              case 'Event Date':        record['eventDate'] = val; break;
              case 'Status':            record['status'] = val || 'Completed'; break;
              case 'Pending Notes':     record['pendingNotes'] = val; break;
              default: record[header] = val;
            }
          } else if (isPublication) {
            const cleanH = header.trim();
            const lh = cleanH.toLowerCase();
            const cleanVal = val !== undefined && val !== null ? String(val).trim() : '';

            if (lh === 'authors' || lh === 'author name' || lh === 'author' || lh === 'authorname') {
              record['authorName'] = cleanVal;
            } else if (lh === 'author full names' || lh === 'author full name' || lh === 'author_full_names' || lh === 'full names') {
              record['authorFullNames'] = cleanVal;
            } else if (lh === 'title' || lh === 'publication title' || lh === 'paper title' || lh === 'article title') {
              record['title'] = cleanVal;
            } else if (lh === 'year' || lh === 'publication year' || lh === 'academic year' || lh === 'academicyear') {
              record['publicationYear'] = cleanVal;
              record['year'] = cleanVal;
              record['academicYear'] = cleanVal;
            } else if (lh === 'source title' || lh === 'journal name' || lh === 'journal' || lh === 'journalname') {
              record['journalName'] = cleanVal;
            } else if (lh === 'cited by' || lh === 'citations' || lh === 'citation count' || lh === 'citationcount') {
              if (['', 'n/a', 'na', 'nil', 'null', '-', '--', 'undefined'].includes(cleanVal.toLowerCase())) {
                record['citationCount'] = null;
              } else {
                const num = parseInt(cleanVal.replace(/[^0-9]/g, ''), 10);
                record['citationCount'] = isNaN(num) ? null : num;
              }
            } else if (lh === 'doi' || lh === 'doi number') {
              record['doi'] = cleanVal;
            } else if (lh === 'link' || lh === 'publication link' || lh === 'paper link' || lh === 'url' || lh === 'paperurl') {
              record['paperUrl'] = cleanVal;
            } else if (lh === 'publisher') {
              record['publisher'] = cleanVal;
            } else if (lh === 'issn') {
              record['issn'] = cleanVal;
            } else if (lh === 'isbn') {
              record['isbn'] = cleanVal;
            } else if (lh === 'coden') {
              record['coden'] = cleanVal;
            } else if (lh === 'journal type' || lh === 'indexing' || lh === 'type' || lh === 'journaltype') {
              record['journalType'] = cleanVal;
            } else if (lh === 'department') {
              record['department'] = cleanVal;
            } else if (lh === 'publication date' || lh === 'date' || lh === 'publicationdate') {
              record['publicationDate'] = formatDateToISO(cleanVal);
            } else if (lh === 'volume') {
              record['volume'] = cleanVal;
            } else if (lh === 'issue') {
              record['issue'] = cleanVal;
            } else if (lh === 'page number' || lh === 'pages' || lh === 'pagenumber') {
              record['pageNumber'] = cleanVal;
            } else if (lh === 'impact factor' || lh === 'impactfactor') {
              record['impactFactor'] = parseFloat(cleanVal) || null;
            } else if (lh === 'abstract') {
              record['abstract'] = cleanVal;
            }
            // Explicitly ignore any unapproved Scopus columns (Art No, EID, Affiliations, etc.)
          } else if (isPatent) {
            const lh = header.toLowerCase().trim();
            const clh = lh.replace(/[^a-z0-9]/g, '');
            if (clh.includes('title') || clh.includes('invention') || clh.includes('patentname')) {
              record['title'] = val;
            } else if (clh.includes('inventor') || clh.includes('author') || clh.includes('faculty') || clh.includes('investigator') || clh.includes('applicant')) {
              record['inventors'] = val;
            } else if (clh.includes('application') || clh.includes('appno') || clh.includes('applno') || clh.includes('filingno')) {
              record['applicationNo'] = val;
            } else if (clh.includes('patentno') || clh.includes('grantno') || clh.includes('awardno') || clh.includes('patentnumber')) {
              record['patentNo'] = val;
            } else if (clh.includes('status') || clh.includes('stage')) {
              const sl = (val || '').toLowerCase().trim();
              if (sl.includes('grant')) record['status'] = 'granted';
              else if (sl.includes('publish')) record['status'] = 'published';
              else if (sl.includes('commercial') || sl.includes('licens')) record['status'] = 'commercialized';
              else if (sl.includes('exam')) record['status'] = 'under_examination';
              else if (sl.includes('file') || sl.includes('submit')) record['status'] = 'filed';
              else record['status'] = val || 'published';
            } else if (clh.includes('type') || clh.includes('jurisdiction') || clh.includes('category')) {
              record['patentType'] = val || 'National (Indian)';
            } else if (clh.includes('dept') || clh.includes('department') || clh.includes('school')) {
              record['department'] = val;
            } else if (clh.includes('proof') || clh.includes('driveurl') || clh.includes('drivelink') || clh.includes('document')) {
              record['proof'] = val;
              record['proofUrls'] = val;
            } else if (clh.includes('year') || clh.includes('ay') || clh.includes('period') || clh.includes('session') || clh.includes('grantyear')) {
              record['year'] = val;
              record['grantYear'] = val;
              record['academicYear'] = val;
            } else if (clh.includes('filing') || clh.includes('filedate') || clh.includes('dateoffiling') || clh.includes('applicationdate')) {
              record['filedDate'] = formatDateToISO(val);
            } else if (clh.includes('publish') || clh.includes('publication') || clh.includes('dateofpub')) {
              record['publishedDate'] = formatDateToISO(val);
            } else if (clh.includes('grant') || clh.includes('dateofgrant') || clh.includes('awarddate')) {
              record['grantedDate'] = formatDateToISO(val);
            } else if (clh.includes('licens') || clh.includes('commercial')) {
              record['licenseDate'] = formatDateToISO(val);
            } else if (clh.includes('partner') || clh.includes('licensee') || clh.includes('industry') || clh.includes('collaborat')) {
              record['partner'] = val;
            } else if (clh.includes('revenue') || clh.includes('royalt') || clh.includes('amount') || clh.includes('earning')) {
              record['revenue'] = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
            } else if (clh.includes('url') || clh.includes('link') || clh.includes('gazette')) {
              record['patentUrl'] = val;
            } else if (clh.includes('abstract') || clh.includes('desc') || clh.includes('summary') || clh.includes('claim')) {
              record['description'] = val;
            } else {
              record[header] = val;
            }
          } else if (isSponsored) {
            const lh = header.toLowerCase().trim();
            if (lh.includes('title') || lh.includes('project name')) {
              record['title'] = val;
            } else if (lh.includes('principal') || lh.includes('investigator') || lh === 'pi' || lh === 'lead investigator') {
              record['principalInvestigator'] = val;
            } else if (lh.includes('co-investigator') || lh.includes('coinvestigator') || lh.includes('co pi') || lh.includes('co-pi')) {
              record['coInvestigators'] = val;
            } else if (lh.includes('agency') || lh.includes('sponsor') || lh.includes('funding source')) {
              record['fundingAgency'] = val;
            } else if (lh.includes('scheme') || lh.includes('program') || lh.includes('grant name')) {
              record['scheme'] = val;
            } else if (lh.includes('agency type') || lh.includes('funding type') || lh.includes('category')) {
              record['agencyType'] = val || 'Government (National)';
            } else if (lh.includes('sanction order') || lh.includes('order no') || lh.includes('sanction no') || lh.includes('grant no') || lh.includes('project id') || lh.includes('reference no')) {
              record['sanctionOrderNo'] = val;
            } else if (lh.includes('sanction date') || lh.includes('order date') || lh.includes('approval date')) {
              record['sanctionDate'] = formatDateToISO(val);
            } else if (lh.includes('start date') || lh.includes('commencement') || lh.includes('from date')) {
              record['startDate'] = formatDateToISO(val);
            } else if (lh.includes('end date') || lh.includes('completion date') || lh.includes('to date')) {
              record['endDate'] = formatDateToISO(val);
            } else if (lh.includes('sanctioned amount') || lh.includes('grant amount') || lh.includes('total amount') || lh.includes('budget') || lh.includes('outlay') || lh === 'amount') {
              record['sanctionedAmount'] = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
            } else if (lh.includes('received') || lh.includes('released') || lh.includes('disbursed') || lh.includes('funds received')) {
              record['amountReceived'] = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
            } else if (lh === 'status' || lh.includes('project status')) {
              const sl = (val || '').toLowerCase().trim();
              if (sl.includes('ongoing') || sl.includes('active') || sl.includes('progress')) record['status'] = 'Ongoing';
              else if (sl.includes('complete') || sl.includes('closed') || sl.includes('finished')) record['status'] = 'Completed';
              else if (sl.includes('sanction') || sl.includes('approved')) record['status'] = 'Sanctioned';
              else if (sl.includes('propos') || sl.includes('submit')) record['status'] = 'Proposal Submitted';
              else if (sl.includes('terminat') || sl.includes('cancel')) record['status'] = 'Terminated';
              else record['status'] = val || 'Ongoing';
            } else if (lh.includes('progress') || lh.includes('completion %') || lh.includes('percentage')) {
              record['progressPercentage'] = parseInt(val.replace(/[^0-9]/g, '')) || 0;
            } else if (lh.includes('department') || lh === 'dept') {
              record['department'] = val;
            } else if (lh.includes('sanction year') || lh.includes('academic year') || lh === 'year') {
              record['sanctionYear'] = val;
              record['academicYear'] = val;
            } else if (lh.includes('agreement') || lh.includes('sanction letter') || lh.includes('award letter')) {
              if (val && !record['agreementLetter']) {
                record['agreementLetter'] = val;
              } else if (val && record['agreementLetter'] && record['agreementLetter'] !== val) {
                record['agreementLetter'] = `${record['agreementLetter']}, ${val}`;
              }
            } else if (lh.includes('receipt') || lh.includes('payment') || lh.includes('fund receipt') || lh.includes('utilization certificate') || lh.includes('uc') || lh.includes('installment doc')) {
              if (val && !record['paymentReceipt']) {
                record['paymentReceipt'] = val;
              } else if (val && record['paymentReceipt'] && record['paymentReceipt'] !== val) {
                record['paymentReceipt'] = `${record['paymentReceipt']}, ${val}`;
              }
            } else if (lh.includes('duration')) {
              record['projectDuration'] = val;
            } else if (lh.includes('url') || lh.includes('link') || lh.includes('portal')) {
              record['projectUrl'] = val;
            } else if (lh.includes('description') || lh.includes('abstract') || lh.includes('summary') || lh.includes('objectives')) {
              record['description'] = val;
            } else {
              record[header] = val;
            }
          } else {
            record[header] = val;
          }
        }
      });

      if (isPlacement) {
        if (!record._tempId) record._tempId = crypto.randomUUID();
        record.batch = selectedAcademicYear;
        record.academicYear = selectedAcademicYear;
        record.placementType = selectedPlacementType;
        record.campus = selectedCampus;
        record.school = selectedSchool;
        if (!record.placementDate) record.placementDate = new Date().toISOString().split('T')[0];
        if (!record.role) record.role = '';
      }

      // Default any missing, null, or empty string values to 'NIL' (except for publications/patents/sponsored/placements where optional fields can remain empty/null)
      if (!isPublication && !isPatent && !isSponsored && !isPlacement) {
        Object.keys(record).forEach(k => {
          if (record[k] === undefined || record[k] === null || record[k] === '' || String(record[k]).trim() === '') {
            record[k] = 'NIL';
          }
        });
      }

      records.push(record);
    }

    if (isPublication) {
      const seenDoi = new Map<string, number>();
      const seenTitleYear = new Map<string, number>();

      records.forEach((rec, idx) => {
        const auth = (rec.authorName || rec.authorFullNames || '').trim();
        const tit = (rec.title || '').trim();
        const jrn = (rec.journalName || '').trim();
        const yr = rec.publicationYear || rec.year || rec.academicYear || selectedPublicationYear || '';
        const matchYear = String(yr).match(/\b(19\d\d|20\d\d)\b/);
        const validYear = matchYear ? matchYear[1] : null;

        const issues: string[] = [];
        if (!auth) issues.push('Authors or Author full names required');
        if (!tit) issues.push('Publication Title required');
        if (!jrn) issues.push('Source title (Journal Name) required');
        if (!validYear) issues.push('Valid 4-digit Year required');

        rec.publicationYear = validYear || yr;
        rec.year = validYear || yr;
        rec.authorName = rec.authorName || rec.authorFullNames || '';
        rec.journalType = rec.journalType || selectedPublicationIndexing || 'Scopus';
        rec.department = rec.department || selectedDepartment || '';

        const cleanDoi = rec.doi ? rec.doi.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '').trim().toLowerCase() : '';
        const normTitle = tit.toLowerCase().replace(/[\r\n\t]+/g, ' ').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        const titleYearKey = validYear ? `${normTitle}::${validYear}` : '';

        let isDup = false;
        let dupReason = '';

        if (cleanDoi) {
          if (seenDoi.has(cleanDoi)) {
            isDup = true;
            dupReason = `Duplicate DOI: matches row #${seenDoi.get(cleanDoi)! + 1} in this file`;
          } else {
            seenDoi.set(cleanDoi, idx);
          }
        }

        if (!isDup && titleYearKey) {
          if (seenTitleYear.has(titleYearKey)) {
            isDup = true;
            dupReason = `Duplicate Title + Year: matches row #${seenTitleYear.get(titleYearKey)! + 1} in this file`;
          } else {
            seenTitleYear.set(titleYearKey, idx);
          }
        }

        rec._cleanDoi = cleanDoi;
        rec._normTitleYear = titleYearKey;

        if (isDup) {
          rec._rowStatus = 'duplicate';
          rec._duplicateReason = dupReason;
        } else if (issues.length > 0) {
          rec._rowStatus = 'needs_review';
          rec._issues = issues;
        } else {
          rec._rowStatus = 'ready';
        }
      });
    }

    if (records.length === 0) {
      setParseError(
        isSponsored ? 'No sponsored research grant rows detected in the CSV file.'
        : isPatent ? 'No patent rows detected in the CSV file.'
        : isPublication ? 'No publication rows detected in the CSV file.'
        : isConsultancy ? 'No consultancy project rows detected in the CSV file.'
        : isFaculty ? 'No faculty rows detected in the CSV file.'
        : isStudent ? 'No student rows detected in the CSV file.'
        : isDepartment ? 'No department rows detected in the CSV file.'
        : isPlacement ? 'No placement rows detected in the CSV file.'
        : 'No achievement rows detected in the CSV file.'
      );
      return;
    }

    setPreviewData(records);
    if (isPlacement && token) {
      verifyPlacementsBatch(records, {
        ay: selectedAcademicYear,
        type: selectedPlacementType,
        campus: selectedCampus,
        school: selectedSchool
      });
    }
  };

  const verifyPlacementsBatch = async (
    itemsToVerify: any[],
    options?: { ay?: string; type?: 'placement' | 'internship'; campus?: string; school?: string }
  ) => {
    if (!token || itemsToVerify.length === 0) return;
    setIsVerifyingPlacements(true);
    try {
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/placements/verify-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          placements: itemsToVerify,
          academicYear: options?.ay || selectedAcademicYear,
          placementType: options?.type || selectedPlacementType,
          campus: options?.campus || selectedCampus,
          school: options?.school || selectedSchool
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlacementVerificationSummary(data.summary);
        setPreviewData(prev => {
          const verifiedMap = new Map<string, any>((data.records || []).map((r: any) => [r._tempId || String(r.rowIndex), r]));
          return prev.map((row: any, idx: number) => {
            const key = row._tempId || String(idx + 1);
            const matched: any = verifiedMap.get(key);
            if (matched) {
              return {
                ...row,
                ...matched,
                _tempId: row._tempId || matched._tempId,
                _rowStatus: matched._rowStatus || matched.status,
                _issues: matched._issues || matched.issues
              };
            }
            return row;
          });
        });
      }
    } catch (vErr) {
      console.error('Failed to verify placements batch:', vErr);
    } finally {
      setIsVerifyingPlacements(false);
    }
  };

  const handleOfferLetterFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activePlacementTempId) return;
    const file = files[0];

    const validExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lowerName = file.name.toLowerCase();
    const isValidExt = validExts.some(ext => lowerName.endsWith(ext));
    if (!isValidExt) {
      alert('Invalid offer letter file format. Accepted formats: PDF, JPG, JPEG, PNG.');
      if (placementFileInputRef.current) placementFileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Offer letter file exceeds 10MB size limit.');
      if (placementFileInputRef.current) placementFileInputRef.current.value = '';
      return;
    }

    setPlacementOfferLetterFiles(prev => ({
      ...prev,
      [activePlacementTempId]: file
    }));
    setActivePlacementTempId(null);
    if (placementFileInputRef.current) placementFileInputRef.current.value = '';
  };

  const handleUploadSubmit = async () => {
    if (previewData.length === 0) return;

    // For consultancy, ensure department is selected
    if (isConsultancy && !selectedDepartment) {
      setUploadError('Please select a department before uploading.');
      return;
    }

    setLoading(true);
    setUploadError('');
    setUploadErrorsList([]);

    const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = rawApi.replace(/\/+$/, '');
    const endpoint = isDepartmentalActivity
      ? `${baseUrl}/api/departmental-activities/bulk`
      : isPublication
        ? `${baseUrl}/api/publications/bulk`
        : isPatent
          ? `${baseUrl}/api/patents/bulk`
          : isSponsored
            ? `${baseUrl}/api/sponsored-projects/bulk`
            : isConsultancy
              ? `${baseUrl}/api/consultancy-projects/bulk`
              : isFaculty
                ? `${baseUrl}/api/faculty/bulk`
                : isPlacement
                  ? `${baseUrl}/api/placements/bulk`
                  : isStudent
                    ? `${baseUrl}/api/students/bulk`
                    : isDepartment
                      ? `${baseUrl}/api/departments/bulk`
                      : `${baseUrl}/api/achievements/bulk`;

    // Enrich preview records with common batch metadata selected in the upload dialog
    const dataWithCommonFields = previewData.map(record => {
      const item: Record<string, any> = {
        academicYear: selectedAcademicYear,
        campus: selectedCampus,
        school: selectedSchool,
        ...record,
        ...(record.academicYear ? {} : { academicYear: selectedAcademicYear }),
        ...(record.campus ? {} : { campus: selectedCampus }),
        ...(record.school ? {} : { school: selectedSchool }),
        ...(isConsultancy || isPublication || isPatent || isSponsored ? { department: record.department || selectedDepartment } : {})
      };

      if (isPatent) {
        if (record.grantYear || record.year) {
          item.grantYear = record.grantYear || record.year;
          item.year = record.grantYear || record.year;
        }
        if (record.proof || record.proofUrls) {
          item.proof = record.proof || record.proofUrls;
          item.proofUrls = record.proof || record.proofUrls;
        }
      }

      if (isConsultancy) {
        if (record.consultancyStartYear || record.year) {
          item.consultancyStartYear = record.consultancyStartYear || record.year;
        }
      }

      const dateKeys = ['dateOfBirth', 'dateOfJoining', 'dob', 'admissionDate', 'eventDate', 'placementDate', 'date', 'publicationDate', 'filedDate', 'publishedDate', 'grantedDate', 'licenseDate', 'sanctionDate', 'startDate', 'endDate', 'expectedEndDate', 'actualCompletionDate'];
      Object.keys(item).forEach(k => {
        if (dateKeys.includes(k)) {
          if (!item[k] || String(item[k]).toLowerCase() === 'nil' || String(item[k]).toLowerCase() === 'n/a' || String(item[k]).toLowerCase() === 'invalid date' || String(item[k]).trim() === '') {
            item[k] = null;
          }
        } else if (!isPublication && !isPatent && !isSponsored && !isConsultancy && !isPlacement) {
          if (item[k] === undefined || item[k] === null || item[k] === '' || String(item[k]).trim() === '') {
            item[k] = 'NIL';
          }
        }
      });

      return item;
    });

    const readyRecords = isPublication
      ? dataWithCommonFields.filter(r => r._rowStatus === 'ready')
      : isPlacement
        ? dataWithCommonFields.filter(r => (r._rowStatus === 'ready' || r.status === 'ready'))
        : dataWithCommonFields;

    if ((isPublication || isPlacement) && readyRecords.length === 0) {
      setLoading(false);
      setUploadError(isPlacement
        ? 'No valid "Ready" placement records found to import. Unregistered students and duplicate records cannot be imported.'
        : 'No valid "Ready" publication records found to import. Please review and resolve flagged rows before importing.'
      );
      return;
    }

    const bodyPayload = isDepartmentalActivity
      ? { activities: dataWithCommonFields }
      : isPublication
        ? {
            items: readyRecords,
            isFacultyWiseBatch: publicationFiles.length > 0,
            defaultDepartment: selectedDepartment || undefined,
            defaultIndexing: selectedPublicationIndexing
          }
        : isPatent
          ? { items: dataWithCommonFields, defaultDepartment: selectedDepartment, defaultYear: selectedAcademicYear }
          : isSponsored
            ? { items: dataWithCommonFields, defaultDepartment: selectedDepartment, defaultYear: selectedAcademicYear }
            : isConsultancy
              ? { consultancyProjects: dataWithCommonFields }
              : isFaculty
                ? { faculty: dataWithCommonFields }
                : isPlacement
                  ? {
                      placements: readyRecords,
                      academicYear: selectedAcademicYear,
                      placementType: selectedPlacementType,
                      campus: selectedCampus,
                      school: selectedSchool
                    }
                  : isStudent
                    ? { students: dataWithCommonFields }
                    : isDepartment
                      ? { departments: dataWithCommonFields }
                      : { achievements: dataWithCommonFields };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();

      if (data.success) {
        let offerLettersUploaded = 0;
        if (isPlacement && data.data && Array.isArray(data.data)) {
          for (const created of data.data) {
            const file = created._tempId ? placementOfferLetterFiles[created._tempId] : null;
            if (file && created.id) {
              try {
                const formData = new FormData();
                formData.append('offerLetter', file);
                const uploadRes = await fetch(`${baseUrl}/api/placements/${created.id}/offer-letter`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` },
                  body: formData
                });
                const uploadJson = await uploadRes.json();
                if (uploadJson.success) offerLettersUploaded++;
              } catch (flErr) {
                console.error('Failed to upload offer letter for', created.id, flErr);
              }
            }
          }
        }

        setImportResult({
          count: data.count,
          createdCount: data.createdCount,
          linkedCount: data.linkedCount,
          duplicatesCount: data.duplicatesCount,
          errorsCount: data.errorsCount,
          offerLettersCount: offerLettersUploaded,
          message: data.message || 'Bulk upload completed successfully.',
          success: true,
          data: data.data,
          duplicates: data.duplicates,
          errors: data.errors
        });
        if (data.errors && data.errors.length > 0) {
          setUploadError(`${data.count} record(s) loaded successfully, but ${data.errors.length} failed.`);
          setUploadErrorsList(data.errors.map((e: any) => typeof e === 'string' ? e : `${e.title || 'Row'}: ${Array.isArray(e.issues) ? e.issues.join(', ') : (e.issues || 'Review required')}`));
        } else {
          setSuccessMsg(data.message || 'Records imported successfully.');
        }
        onSuccess();
        setCurrentStage('summary');
      } else {
        const errorDetail = data.detail || data.error;
        const failureMessage = errorDetail && !data.message?.includes(errorDetail)
          ? `${data.message || 'Bulk upload failed.'} (${errorDetail})`
          : (data.message || 'Bulk upload failed.');
        setUploadError(failureMessage);
        setImportResult({
          message: failureMessage,
          success: false,
          errors: data.errors
        });
        if (data.errors) {
          setUploadErrorsList(data.errors.map((e: any) => typeof e === 'string' ? e : `${e.title || 'Row'}: ${Array.isArray(e.issues) ? e.issues.join(', ') : (e.issues || 'Error')}`));
        }
        setCurrentStage('summary');
      }
    } catch (err) {
      console.error(err);
      setUploadError('Connection to backend failed. Please check network connectivity and try again.');
      setImportResult({ message: 'Connection to backend failed. Please verify server status and try again.', success: false });
      setCurrentStage('summary');
    } finally {
      setLoading(false);
    }
  };

  const uploadTypeLabel = isSponsored ? 'Sponsored Research & Grants' : isPatent ? 'Patents & Intellectual Property' : isPublication ? 'Publications (Scopus / WoS)' : isConsultancy ? 'Consultancy Projects (NIRF)' : isFaculty ? 'Faculty Details' : isStudent ? 'Student Details' : isDepartment ? 'Department Details' : isPlacement ? 'Placements & Internships' : 'Achievements';

  const requiredHeaders = React.useMemo(() => {
    if (isSponsored) return SPONSORED_RESEARCH_REQUIRED;
    if (isPatent) return PATENTS_REQUIRED;
    if (isPublication) return PUBLICATIONS_REQUIRED;
    if (isConsultancy) return CONSULTANCY_REQUIRED;
    if (isFaculty) return FACULTY_REQUIRED;
    if (isStudent) return ['Register No', 'Student Name'];
    if (isDepartment) return ['Code', 'Name'];
    if (isPlacement) return ['Register Number', 'Name', 'Department', 'Program', 'Designation/Role', 'Company', 'Package'];
    if (isDepartmentalActivity) return ['Department'];
    return ['title', 'category', 'date', 'year'];
  }, [isSponsored, isPatent, isPublication, isConsultancy, isFaculty, isStudent, isDepartment, isPlacement, isDepartmentalActivity]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={isPublication ? "w-full sm:max-w-[750px] md:max-w-[800px] lg:max-w-[850px] max-h-[88vh] h-[88vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-2xl" : "sm:max-w-[750px] max-h-[85vh] overflow-y-auto bg-white p-6 rounded-xl"}>
        {isPublication && publicationUploadMode === 'citations' ? (
          <div className="flex flex-col h-full min-h-0">
            <div className="px-6 pt-5 pb-0 shrink-0">
              <DialogHeader className="pr-10">
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#2855B9]" />
                  <span>Bulk Upload Citations (CSV / Excel)</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Import official Scopus citation overview reports (.csv / .xlsx) to link verified annual citation history to existing IQAC publications.
                </DialogDescription>
              </DialogHeader>

              {/* Mode Toggle Pills */}
              <div className="flex items-center gap-2 mt-3 pb-1 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setPublicationUploadMode('publications');
                    setCurrentStage('upload');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Publications</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPublicationUploadMode('citations');
                    setCurrentStage('upload');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 bg-[#2855B9] text-white shadow-xs"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Citations</span>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <CitationsBulkUploadFlow
                token={token}
                onSuccess={onSuccess}
                onClose={handleClose}
              />
            </div>
          </div>
        ) : (
          <>
        {/* Region 1: Fixed Header */}
        <div className={isPublication ? "px-6 pt-5 pb-0 shrink-0" : ""}>
          <DialogHeader className={isPublication ? "pr-10" : ""}>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#2F4692]" />
              <span>Bulk Upload {uploadTypeLabel} (CSV / Excel)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Upload and batch-validate {uploadTypeLabel} records in bulk via standard spreadsheet templates.
            </DialogDescription>
          </DialogHeader>

          {isPublication && (
            <div className="flex items-center gap-2 mt-3 pb-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPublicationUploadMode('publications');
                  setCurrentStage('upload');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 bg-[#2855B9] text-white shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Publications</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPublicationUploadMode('citations');
                  setCurrentStage('upload');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Citations</span>
              </button>
            </div>
          )}

          {/* 5-Stage Stepper Progress Bar */}
          <div className={isPublication ? "bg-slate-50 border-y border-slate-200/80 -mx-6 px-6 py-2.5 mt-3 flex items-center justify-between gap-1 overflow-x-auto shrink-0" : "bg-slate-50 border-y border-slate-200/80 -mx-6 px-6 py-2.5 flex items-center justify-between gap-1 overflow-x-auto"}>
            {UPLOAD_STAGES.map((s, idx) => {
              const isCurrent = currentStage === s.id;
              const isPassed = UPLOAD_STAGES.findIndex(item => item.id === currentStage) > idx;
              return (
                <div key={s.id} className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-[#2F4692] text-white shadow-xs ring-2 ring-[#2F4692]/20'
                        : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPassed ? '✓' : s.number}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent ? 'text-slate-900 font-bold' : isPassed ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {s.label.replace(/^\d+\.\s*/, '')}
                  </span>
                  {idx < UPLOAD_STAGES.length - 1 && (
                    <div className="w-4 sm:w-8 h-0.5 bg-slate-200 mx-1 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Region 2: Scrollable Content Body */}
        <div className={isPublication ? "flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4 text-xs" : "space-y-4 py-3 text-xs"}>
          {/* STAGE 1: UPLOAD */}
          {currentStage === 'upload' && (
            <div className="space-y-4">
              {/* Instructions */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
            <Info className="w-5 h-5 text-[#2F4692] shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div>
                <p className="font-bold text-slate-900 text-xs">Spreadsheet Column Requirements</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Your uploaded file columns must map to the standardized headers below. Mandatory fields are marked with **:
                </p>
              </div>

              {isSponsored ? (
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 select-all break-all text-[11px] leading-relaxed">
                  Project Title**, Principal Investigator**, Co-Investigators, Funding Agency**, Scheme / Program, Agency Type, Sanction Order No, Sanction Date, Sanction Year, Start Date, End Date, Project Duration, Sanctioned Amount (INR), Amount Received (INR), Status, Progress (%), Department, Sanction Letter, Fund Receipt / Utilization Certificate (UC), Project URL, Description
                </p>
              ) : isPatent ? (
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 select-all break-all text-[11px] leading-relaxed">
                  Title**, Inventors**, Application No, Patent No, Status, Patent Type, Department, Academic Year, Filing Date, Publication Date, Grant Date, License Date, Commercial Partner, Revenue Generated (INR), Patent URL, Abstract
                </p>
              ) : isPublication ? (
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 select-all break-all text-[11px] leading-relaxed">
                  Author Name**, Title**, Journal Name**, Journal Type, Department, Academic Year, Publication Date, DOI, ISSN, Volume, Issue, Page Number, Impact Factor, Citations, URL, Abstract
                </p>
              ) : isConsultancy ? (
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 select-all break-all text-[11px] leading-relaxed">
                  Name of Teacher Consultant**, Name of Consultancy Project**, Agency Name**, Agency Contact Email, Agency Contact Number, Consultancy Start Year**, Start Date, Expected End Date, Actual Completion Date, Project Status, Contract Value (INR in Lakhs), Revenue Generated (INR in Lakhs), Amount Received (INR in Lakhs), Department, Scope of Work / Deliverables Summary, Agreement / Work Order, Invoice, Payment Receipt
                </p>
              ) : isFaculty ? (
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 select-all break-all text-[11px] leading-relaxed">
                  EmpId**, Name**, Designation**, Department**, Gender, Date of birth, PanCard No, Date Of Joining, Previous Teaching Experince Years, Previous Teaching Experince Months, Previous Industry Experince Years, Previous Industry Experince Months, Qualification Level, Highest Qualification, Experience in CU - Years, Experience in CU - Months
                </p>
              ) : isStudent ? (
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 select-all break-all text-[10px] leading-relaxed">
                  Register No**, Student Name**, Class Name, Application No, Gender, Date Of Birth, Mobile No, Nationality, Caste, Current City, Current State, Permanent City, Permanent State, Parent Mobile No, Handicapped, Handicapped Description, Campus, Disability: (YES/NO), Department, Program Level
                </p>
              ) : isDepartment ? (
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 select-all break-all text-[11px] leading-relaxed">
                  Code**, Name**, HOD Name, HOD Email, Established Year, Phone, Description
                </p>
              ) : isPlacement ? (
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 select-all break-all text-[11px] leading-relaxed">
                  Register Number**, Name**, AY (Academic Year)**, Department**, Course, Company**, Package**
                </p>
              ) : (
                <p className="font-mono bg-white p-2 rounded-lg border border-slate-200 text-slate-700 select-all break-all text-[11px] leading-relaxed">
                  title**, category**, date**, year**, description, subcategory, achieverType, rank, score, organization, location, participants, impact, status
                </p>
              )}

              <div className="flex gap-4 pt-1 flex-wrap items-center">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs font-semibold text-[#2F4692] hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV Template</span>
                </button>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="text-xs font-semibold text-[#2F4692] hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          {/* STAGE 1: UPLOAD SETTINGS & DROPZONE */}
          {isPublication ? (
            <div className="space-y-4">
              {/* Publications Faculty-Wise Multi-File / Folder Upload Toolbar */}
              <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border border-blue-200/80 p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-[#2855B9] uppercase tracking-wider flex items-center gap-1.5">
                      <FolderUp className="w-4 h-4 text-[#2855B9]" />
                      Faculty-Wise Multi-File & Folder Bulk Upload
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Select multiple publication files or an entire folder. Filename must start with Employee ID (e.g., <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-900">2043_Adarsh_S_V.xlsx</code>).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="file"
                      ref={multiFileInputRef}
                      multiple
                      accept=".csv,.xls,.xlsx"
                      onChange={(e) => e.target.files && handleProcessPublicationFiles(e.target.files)}
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={folderInputRef}
                      multiple
                      accept=".csv,.xls,.xlsx"
                      {...({ webkitdirectory: '', directory: '' } as any)}
                      onChange={(e) => e.target.files && handleProcessPublicationFiles(e.target.files)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => multiFileInputRef.current?.click()}
                      disabled={loading}
                      className="bg-white border-blue-300 text-[#2855B9] hover:bg-blue-50 text-xs font-semibold h-8 px-3 shadow-2xs"
                    >
                      <FilePlus className="w-3.5 h-3.5 mr-1.5" />
                      Select File
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => folderInputRef.current?.click()}
                      disabled={loading}
                      className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-8 px-3 shadow-2xs"
                    >
                      <FolderUp className="w-3.5 h-3.5 mr-1.5" />
                      Select Folder
                    </Button>
                  </div>
                </div>

                {/* Drag and Drop Zone for publications */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      await handleProcessPublicationFiles(e.dataTransfer.files);
                    }
                  }}
                  className="border-2 border-dashed border-blue-200 hover:border-[#2855B9] rounded-xl p-5 bg-white/70 hover:bg-blue-50/50 transition-all text-center cursor-pointer"
                  onClick={() => multiFileInputRef.current?.click()}
                >
                  <UploadCloud className="w-8 h-8 text-[#2855B9] mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-800">
                    Drag and drop faculty publication files or folder here, or click to browse
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Supports Scopus and Web of Science exports (.csv, .xlsx, .xls)
                  </p>
                </div>
              </div>

              {/* Selected Files Card List */}
              {publicationFiles.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
                    <span>Selected Faculty Files ({publicationFiles.length} file{publicationFiles.length > 1 ? 's' : ''}, {previewData.length} records parsed)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPublicationFiles([]);
                        setPreviewData([]);
                        setFile(null);
                      }}
                      className="text-red-600 hover:text-red-800 text-[11px] font-medium"
                    >
                      Clear All Files
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {publicationFiles.map((item) => {
                      const isReady = item.status === 'ready';
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                            isReady
                              ? 'bg-white border-slate-200 hover:border-blue-300'
                              : 'bg-amber-50/60 border-amber-200'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <FileSpreadsheet className={`w-4 h-4 mt-0.5 shrink-0 ${isReady ? 'text-[#2855B9]' : 'text-amber-600'}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 truncate max-w-[200px]" title={item.name}>
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({(item.size / 1024).toFixed(1)} KB)
                                </span>
                                {item.records && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-[#2855B9] border border-blue-200">
                                    {item.records.length} records
                                  </span>
                                )}
                              </div>

                              {/* Faculty verification badge */}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {isReady && item.facultyName ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                                      {item.facultyName} <span className="text-emerald-600 font-mono text-[10px]">(Emp ID: {item.employeeId})</span>
                                    </span>
                                    {item.department && (
                                      <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                        {item.department}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-300">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    {item.errorMessage || 'Needs Review: Unknown Faculty'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Per-File Indexing classification dropdown */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">Indexing:</span>
                              <select
                                value={item.indexing}
                                onChange={(e) => handleFileIndexingChange(item.name, e.target.value)}
                                className="h-7 px-2 border border-slate-300 rounded-md bg-white text-[11px] font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="Scopus">Scopus</option>
                                <option value="WoS (Web of Science)">WoS (Web of Science)</option>
                                <option value="Scopus & WoS">Scopus & WoS</option>
                                <option value="UGC-CARE">UGC-CARE</option>
                                <option value="Peer-Reviewed / Other">Peer-Reviewed / Other</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemovePublicationFile(item.name)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                              title="Remove file"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Info className="w-4 h-4 text-[#2855B9]" />
                    <span>Faculty-Wise Publication File Naming Protocol</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
                    <li>Each file represents publications belonging to one faculty member (e.g. <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">2043_Adarsh_S_V.xlsx</code> or <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">00123_Faculty_Name.csv</code>).</li>
                    <li>The Employee ID at the start of the filename is verified against the Faculty Directory, and the department is automatically assigned from their profile.</li>
                    <li>If a paper is co-authored by multiple faculty across files, exactly one unique publication record is created and all co-authors are linked.</li>
                  </ul>
                </div>
              )}

              {parseError && (
                <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg flex gap-2 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <h4 className="font-semibold text-xs text-[#2f4692] uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#2f4692]" />
                  Common Upload Metadata (Applied to all records in this file)
                </h4>

                {isPlacement && (
                  <div className="pt-1 pb-2 border-b border-slate-200">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Upload Record Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                        <input
                          type="radio"
                          name="placementType"
                          value="placement"
                          checked={selectedPlacementType === 'placement'}
                          onChange={() => {
                            setSelectedPlacementType('placement');
                            if (previewData.length > 0) {
                              verifyPlacementsBatch(previewData, { type: 'placement' });
                            }
                          }}
                          className="text-[#2F4692] focus:ring-[#2F4692]"
                        />
                        <span className="font-semibold text-slate-900">Placement</span>
                        <span className="text-slate-500 text-[11px]">(Full-time offer, Package = LPA)</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                        <input
                          type="radio"
                          name="placementType"
                          value="internship"
                          checked={selectedPlacementType === 'internship'}
                          onChange={() => {
                            setSelectedPlacementType('internship');
                            if (previewData.length > 0) {
                              verifyPlacementsBatch(previewData, { type: 'internship' });
                            }
                          }}
                          className="text-[#2F4692] focus:ring-[#2F4692]"
                        />
                        <span className="font-semibold text-slate-900">Internship</span>
                        <span className="text-slate-500 text-[11px]">(Monthly stipend in INR, Optional)</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Academic Year <span className="text-red-500">*</span></label>
                    <select
                      value={selectedAcademicYear}
                      onChange={(e) => {
                        const newAy = e.target.value;
                        setSelectedAcademicYear(newAy);
                        if (isPlacement && previewData.length > 0) {
                          verifyPlacementsBatch(previewData, { ay: newAy });
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs bg-white text-gray-800 font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="2020-2021">2020-2021</option>
                      <option value="2021-2022">2021-2022</option>
                      <option value="2022-2023">2022-2023</option>
                      <option value="2023-2024">2023-2024</option>
                      <option value="2024-2025">2024-2025</option>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                      <option value="2027-2028">2027-2028</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Campus <span className="text-red-500">*</span></label>
                    <select
                      value={selectedCampus}
                      onChange={(e) => {
                        const newC = e.target.value;
                        setSelectedCampus(newC);
                        if (isPlacement && previewData.length > 0) {
                          verifyPlacementsBatch(previewData, { campus: newC });
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {campusList.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">School <span className="text-red-500">*</span></label>
                    <select
                      value={selectedSchool}
                      onChange={(e) => {
                        const newS = e.target.value;
                        setSelectedSchool(newS);
                        if (isPlacement && previewData.length > 0) {
                          verifyPlacementsBatch(previewData, { school: newS });
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {schoolList.map((s, i) => (
                        <option key={i} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  All records in this bulk file will automatically inherit these Academic Year, Campus, and School selections.
                </p>
              </div>

              {/* Placement V2.1 Specifications Guide */}
              {isPlacement && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1 text-slate-700">
                  <div className="flex items-center gap-1.5 font-bold text-[#2855B9]">
                    <Info className="w-4 h-4 text-[#2855B9]" />
                    <span>Placements & Internships Bulk Upload V2.1 Guide</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-slate-600">
                    <li>Requires exactly seven columns: <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono text-blue-900">Register Number, Name, Department, Program, Designation/Role, Company, Package</code>.</li>
                    <li><strong>Student Verification:</strong> Every student Register Number is verified against <em>Student Details</em>.</li>
                    <li><strong>Compensation:</strong> {selectedPlacementType === 'placement' ? 'Annual salary in LPA (mandatory, positive number).' : 'Monthly stipend in INR (optional; blank = "Not Provided", 0 = "₹0 — Unpaid Internship").'}</li>
                    <li><strong>Offer Letters:</strong> Optional. You can attach offer letters per offer record in the preview stage.</li>
                  </ul>
                </div>
              )}

              {/* Department Selection for Consultancy */}
              {isConsultancy && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <Label className="text-sm font-semibold text-amber-900 mb-2 block">
                    Select Department <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Choose a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIXED_DEPARTMENTS.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-amber-700 mt-1.5">
                    All uploaded consultancy records will be assigned to the selected department.
                  </p>
                </div>
              )}

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 hover:border-[#2F4692] hover:bg-slate-50/70 transition-all text-center relative cursor-pointer group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xls,.xlsx"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={loading}
                />
                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-50 text-slate-500 group-hover:text-[#2F4692] flex items-center justify-center mx-auto mb-3 transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>
                {file ? (
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB — Click to replace file</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-800 text-sm">Drag & drop your CSV or Excel file here, or <span className="text-[#2F4692] font-semibold underline underline-offset-2">browse files</span></p>
                    <p className="text-xs text-slate-500 mt-1">Supports standardized .csv, .xls, and .xlsx formats up to 10MB</p>
                  </div>
                )}
              </div>

              {isPlacement && (
                <input
                  type="file"
                  ref={placementFileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleOfferLetterFileSelected}
                />
              )}

              {file && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-900">{file.name}</span>
                    <span className="text-slate-500 text-[11px]">({previewData.length} records parsed)</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#2F4692] bg-white px-2.5 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                    Ready for Validation
                  </span>
                </div>
              )}

              {parseError && (
                <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg flex gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: VALIDATION */}
      {currentStage === 'validation' && (
        <div className="space-y-4">
          {isPublication ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Publications Multi-File & Faculty Mapping Summary</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {publicationFiles.length} file{publicationFiles.length > 1 ? 's' : ''} loaded
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Files</span>
                  <span className="text-base font-bold text-slate-900 font-mono">{publicationFiles.length}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Matched Faculty</span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {publicationFiles.filter(f => f.status === 'ready').length}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Records</span>
                  <span className="text-base font-bold text-[#2855B9] font-mono">{previewData.length}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Department Scope</span>
                  <span className="text-xs font-semibold text-slate-800 truncate block">Auto-Derived</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">Approved Scopus / WoS Fields Extracted:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Authors', 'Author full names', 'Title', 'Year', 'Source title (Journal)', 'Cited by', 'DOI', 'Link', 'Publisher', 'ISSN', 'ISBN', 'CODEN'].map((hdr, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span>✓</span> {hdr}
                    </span>
                  ))}
                </div>
              </div>

              {publicationFiles.some(f => f.status !== 'ready') && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Files Requiring Attention:
                  </span>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                    {publicationFiles.filter(f => f.status !== 'ready').map((f, i) => (
                      <li key={i}>
                        <strong>{f.name}:</strong> {f.errorMessage}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-xs">
                  Spreadsheet parsing completed. Proceed to preview to inspect records and co-authorship.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Spreadsheet Schema & Column Structure Validation</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">{file?.name}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Records</span>
                  <span className="text-base font-bold text-slate-900 font-mono">{previewData.length}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Academic Year</span>
                  <span className="text-xs font-bold text-[#2F4692]">{selectedAcademicYear}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Campus Scope</span>
                  <span className="text-xs font-semibold text-slate-800 truncate block">{selectedCampus}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Department Scope</span>
                  <span className="text-xs font-semibold text-slate-800 truncate block">{selectedDepartment || 'Row-Assigned'}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">Required Headers Validated:</span>
                <div className="flex flex-wrap gap-1.5">
                  {requiredHeaders.map((hdr, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span>✓</span> {hdr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {parseError ? (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg flex gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          ) : !isPublication ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-xs">
                All mandatory columns matched successfully. No fatal syntax or structure anomalies found.
              </span>
            </div>
          ) : null}
        </div>
      )}

          {/* STAGE 3: PREVIEW */}
          {currentStage === 'preview' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="font-semibold text-gray-700 text-xs">
                  <span>Records Preview ({previewData.length} records detected)</span>
                </p>
                {isPublication && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-medium">
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('all')}
                        className={`px-2.5 py-1 rounded-md transition-all ${previewFilter === 'all' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        All ({previewData.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('ready')}
                        className={`px-2.5 py-1 rounded-md transition-all ${previewFilter === 'ready' ? 'bg-white shadow-xs font-bold text-emerald-700' : 'text-emerald-700 hover:bg-emerald-50/50'}`}
                      >
                        Ready ({previewData.filter(r => r._rowStatus === 'ready').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('needs_review')}
                        className={`px-2.5 py-1 rounded-md transition-all ${previewFilter === 'needs_review' ? 'bg-white shadow-xs font-bold text-amber-700' : 'text-amber-700 hover:bg-amber-50/50'}`}
                      >
                        Needs Review ({previewData.filter(r => r._rowStatus === 'needs_review').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('duplicate')}
                        className={`px-2.5 py-1 rounded-md transition-all ${previewFilter === 'duplicate' ? 'bg-white shadow-xs font-bold text-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        Duplicates ({previewData.filter(r => r._rowStatus === 'duplicate').length})
                      </button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadPreviewReport}
                      className="h-7 text-[11px] px-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                    >
                      <Download className="w-3 h-3 mr-1" /> Export Preview CSV
                    </Button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px] text-gray-700">
                  {isFaculty ? (
                    <>
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
                          <th className="py-2 px-3 whitespace-nowrap">Preview No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Emp ID</th>
                          <th className="py-2 px-3 whitespace-nowrap">Name</th>
                          <th className="py-2 px-3 whitespace-nowrap">Designation</th>
                          <th className="py-2 px-3 whitespace-nowrap">Department</th>
                          <th className="py-2 px-3 whitespace-nowrap">Gender</th>
                          <th className="py-2 px-3 whitespace-nowrap">Date of Birth</th>
                          <th className="py-2 px-3 whitespace-nowrap">PAN Card</th>
                          <th className="py-2 px-3 whitespace-nowrap">Date of Joining</th>
                          <th className="py-2 px-3 whitespace-nowrap">Prev. Teaching Exp</th>
                          <th className="py-2 px-3 whitespace-nowrap">Prev. Industry Exp</th>
                          <th className="py-2 px-3 whitespace-nowrap">Qualification Level</th>
                          <th className="py-2 px-3 whitespace-nowrap">Highest Qualification</th>
                          <th className="py-2 px-3 whitespace-nowrap">CU Experience</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-semibold">{row.employeeId}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[130px]" title={row.name}>{row.name}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{row.designation}</td>
                            <td className="py-2 px-3 truncate max-w-[120px]" title={row.department}>{row.department}</td>
                            <td className="py-2 px-3">{row.gender || '-'}</td>
                            <td className="py-2 px-3 font-mono whitespace-nowrap">{row.dateOfBirth || '-'}</td>
                            <td className="py-2 px-3 font-mono">{row.panCardNo || '-'}</td>
                            <td className="py-2 px-3 font-mono whitespace-nowrap">{row.dateOfJoining || '-'}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{row.prevTeachingExpYears}Y {row.prevTeachingExpMonths}M</td>
                            <td className="py-2 px-3 whitespace-nowrap">{row.prevIndustryExpYears}Y {row.prevIndustryExpMonths}M</td>
                            <td className="py-2 px-3">{row.qualificationLevel || '-'}</td>
                            <td className="py-2 px-3 truncate max-w-[120px]" title={row.highestQualification}>{row.highestQualification || '-'}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{row.cuExpYears}Y {row.cuExpMonths}M</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : isStudent ? (
                    <>
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
                          <th className="py-2 px-3 whitespace-nowrap">Preview No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Reg No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Student Name</th>
                          <th className="py-2 px-3 whitespace-nowrap">Class Name</th>
                          <th className="py-2 px-3 whitespace-nowrap">Application No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Gender</th>
                          <th className="py-2 px-3 whitespace-nowrap">Date of Birth</th>
                          <th className="py-2 px-3 whitespace-nowrap">Mobile No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Disability</th>
                          <th className="py-2 px-3 whitespace-nowrap">Campus</th>
                          <th className="py-2 px-3 whitespace-nowrap">Department</th>
                          <th className="py-2 px-3 whitespace-nowrap">Batch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-semibold">{row.registerNumber}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[130px]" title={row.name}>{row.name}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{row.className || '-'}</td>
                            <td className="py-2 px-3 font-mono">{row.applicationNo || '-'}</td>
                            <td className="py-2 px-3">{row.gender || '-'}</td>
                            <td className="py-2 px-3 font-mono whitespace-nowrap">{row.dob || '-'}</td>
                            <td className="py-2 px-3 font-mono">{row.mobileNo || '-'}</td>
                            <td className="py-2 px-3">{row.disability || '-'}</td>
                            <td className="py-2 px-3 truncate max-w-[120px]" title={row.campus}>{row.campus || '-'}</td>
                            <td className="py-2 px-3 truncate max-w-[120px]" title={row.department}>{row.department || '-'}</td>
                            <td className="py-2 px-3 font-mono">{row.batch || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : isDepartment ? (
                    <>
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
                          <th className="py-2 px-3 whitespace-nowrap text-left">Preview No</th>
                          <th className="py-2 px-3 whitespace-nowrap text-left">Code</th>
                          <th className="py-2 px-3 whitespace-nowrap text-left">Name</th>
                          <th className="py-2 px-3 whitespace-nowrap text-left">HOD Name</th>
                          <th className="py-2 px-3 whitespace-nowrap text-left">HOD Email</th>
                          <th className="py-2 px-3 whitespace-nowrap text-center">Established Year</th>
                          <th className="py-2 px-3 whitespace-nowrap text-center">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 text-sm">
                            <td className="py-2 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-semibold text-blue-600">{row.code}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[135px]" title={row.name}>{row.name}</td>
                            <td className="py-2 px-3">{row.hodName || '-'}</td>
                            <td className="py-2 px-3 text-gray-600 truncate max-w-[150px]" title={row.hodEmail}>{row.hodEmail || '-'}</td>
                            <td className="py-2 px-3 font-mono text-center">{row.establishedYear || '-'}</td>
                            <td className="py-2 px-3 font-mono text-center">{row.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : isConsultancy ? (
                    <>
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
                          <th className="py-2 px-3 whitespace-nowrap">S. No.</th>
                          <th className="py-2 px-3 whitespace-nowrap">Teacher Consultant</th>
                          <th className="py-2 px-3 whitespace-nowrap">Project Name</th>
                          <th className="py-2 px-3 whitespace-nowrap">Agency Name</th>
                          <th className="py-2 px-3 whitespace-nowrap">Start Year</th>
                          <th className="py-2 px-3 whitespace-nowrap">Project Status</th>
                          <th className="py-2 px-3 whitespace-nowrap">Revenue (₹ Lakhs)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[150px]" title={row.teacherConsultant}>{row.teacherConsultant}</td>
                            <td className="py-2 px-3 truncate max-w-[150px]" title={row.projectName}>{row.projectName}</td>
                            <td className="py-2 px-3 truncate max-w-[150px]" title={row.agencyName || row.sponsoringAgency}>{row.agencyName || row.sponsoringAgency}</td>
                            <td className="py-2 px-3 font-mono">{row.consultancyStartYear || row.year}</td>
                            <td className="py-2 px-3 font-mono">{row.projectStatus || 'On Going'}</td>
                            <td className="py-2 px-3 font-mono font-semibold text-green-700">{row.revenueInLakhs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : isSponsored ? (
                    <>
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
                          <th className="py-2 px-3 whitespace-nowrap">Preview No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Project Title</th>
                          <th className="py-2 px-3 whitespace-nowrap">Principal Investigator</th>
                          <th className="py-2 px-3 whitespace-nowrap">Funding Agency</th>
                          <th className="py-2 px-3 whitespace-nowrap">Category</th>
                          <th className="py-2 px-3 whitespace-nowrap">Sanction Order</th>
                          <th className="py-2 px-3 whitespace-nowrap text-right">Sanctioned (₹)</th>
                          <th className="py-2 px-3 whitespace-nowrap">Status</th>
                          <th className="py-2 px-3 whitespace-nowrap">Department</th>
                          <th className="py-2 px-3 whitespace-nowrap">Sanction Year</th>
                          <th className="py-2 px-3 whitespace-nowrap">Duration</th>
                          <th className="py-2 px-3 whitespace-nowrap" title="Sanction Letter">Sanction Letter</th>
                          <th className="py-2 px-3 whitespace-nowrap" title="Fund Receipt / Utilization Certificate (UC)">Fund Receipt / UC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[160px]" title={row.title}>{row.title}</td>
                            <td className="py-2 px-3 truncate max-w-[130px]" title={row.principalInvestigator}>{row.principalInvestigator}</td>
                            <td className="py-2 px-3 truncate max-w-[140px]" title={row.fundingAgency}>{row.fundingAgency}</td>
                            <td className="py-2 px-3 whitespace-nowrap text-[10px] text-gray-600">{row.agencyType || 'Government'}</td>
                            <td className="py-2 px-3 font-mono text-[10px]">{row.sanctionOrderNo || '-'}</td>
                            <td className="py-2 px-3 font-mono font-semibold text-emerald-700 text-right">
                              ₹{Number(row.sanctionedAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                                {row.status || 'Ongoing'}
                              </span>
                            </td>
                            <td className="py-2 px-3 truncate max-w-[110px]" title={row.department}>{row.department || '-'}</td>
                            <td className="py-2 px-3 font-mono">{row.sanctionYear || row.academicYear || '-'}</td>
                            <td className="py-2 px-3 whitespace-nowrap text-[11px] font-mono">{row.projectDuration || '-'}</td>
                            <td className="py-2 px-3">{row.agreementLetter ? <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">Drive Link</span> : <span className="text-gray-400 text-xs">-</span>}</td>
                            <td className="py-2 px-3">{row.paymentReceipt ? <span className="inline-block px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-200">Drive Link</span> : <span className="text-gray-400 text-xs">-</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : isPatent ? (
                    <>
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
                          <th className="py-2 px-3 whitespace-nowrap">Preview No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Title</th>
                          <th className="py-2 px-3 whitespace-nowrap">Inventors</th>
                          <th className="py-2 px-3 whitespace-nowrap">Application No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Patent No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Status</th>
                          <th className="py-2 px-3 whitespace-nowrap">Type</th>
                          <th className="py-2 px-3 whitespace-nowrap">Department</th>
                          <th className="py-2 px-3 whitespace-nowrap">Year</th>
                          <th className="py-2 px-3 whitespace-nowrap">Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[160px]" title={row.title}>{row.title}</td>
                            <td className="py-2 px-3 truncate max-w-[130px]" title={row.inventors}>{row.inventors}</td>
                            <td className="py-2 px-3 font-mono">{row.applicationNo || '-'}</td>
                            <td className="py-2 px-3 font-mono">{row.patentNo || '-'}</td>
                            <td className="py-2 px-3 capitalize">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200">
                                {row.status || 'published'}
                              </span>
                            </td>
                            <td className="py-2 px-3">{row.patentType || 'National (Indian)'}</td>
                            <td className="py-2 px-3 truncate max-w-[120px]" title={row.department}>{row.department || '-'}</td>
                            <td className="py-2 px-3 font-mono">{row.grantYear || row.year || '-'}</td>
                            <td className="py-2 px-3">
                              {row.proof || row.proofUrls ? (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200 truncate max-w-[100px]" title={row.proof || row.proofUrls}>
                                  Drive Link
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">Missing</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : isPublication ? (
                    <>
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 font-semibold text-slate-700 text-xs">
                          <th className="py-2.5 px-3 whitespace-nowrap text-center w-12">#</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Validation Status</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[170px]">Faculty / Emp ID</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Source File</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[260px]">Publication Title / Year</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[90px]">Indexing</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right pr-4 min-w-[140px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {previewData
                          .filter(r => {
                            if (previewFilter === 'ready') return r._rowStatus === 'ready';
                            if (previewFilter === 'needs_review') return r._rowStatus === 'needs_review';
                            if (previewFilter === 'duplicate') return r._rowStatus === 'duplicate';
                            return true;
                          })
                          .slice(0, 100)
                          .map((row, idx) => {
                            const originalIdx = previewData.indexOf(row);
                            const isReady = row._rowStatus === 'ready';
                            const isReview = row._rowStatus === 'needs_review';
                            const isDup = row._rowStatus === 'duplicate';

                            return (
                              <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${isReview ? 'bg-amber-50/20' : isDup ? 'bg-slate-50/60' : ''}`}>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 text-center">{originalIdx + 1}</td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {isReady && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Ready
                                    </span>
                                  )}
                                  {isReview && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Needs Review
                                    </span>
                                  )}
                                  {isDup && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-300" title={row._duplicateReason || 'Existing publication'}>
                                      <AlertCircle className="w-3 h-3 text-slate-500" /> Duplicate
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-800">
                                  {row.facultyName ? (
                                    <div>
                                      <span className="font-semibold text-slate-900 block truncate max-w-[170px]" title={row.facultyName}>{row.facultyName}</span>
                                      <span className="text-[10px] text-slate-500 font-mono block">Emp ID: {row.employeeId || 'N/A'}</span>
                                    </div>
                                  ) : (
                                    <span className="text-amber-600 font-mono text-[10px] font-semibold">
                                      {row.employeeId ? `Emp ID: ${row.employeeId}` : 'Unassigned'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">
                                  <span className="truncate max-w-[130px] block" title={row.sourceFile}>{row.sourceFile || '—'}</span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-900">
                                  <div className="font-semibold text-slate-900 line-clamp-2 max-w-[280px] leading-snug" title={row.title}>
                                    {row.title || <span className="text-red-500 italic">Missing Title</span>}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                    <span>Year: <strong className="font-mono text-slate-700">{row.publicationYear || row.year || '—'}</strong></span>
                                    {row.journalName && (
                                      <span className="truncate max-w-[160px] text-slate-400" title={row.journalName}>• {row.journalName}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium">
                                    {row.indexing || row.journalType || 'Scopus'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right pr-4 whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setViewingPublicationRow({ index: originalIdx, data: row })}
                                      className="h-7 text-[10px] px-2 py-0 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                                      title="View full row bibliographic metadata"
                                    >
                                      <Eye className="w-3 h-3 mr-1 text-slate-500" /> Details
                                    </Button>
                                    {isReview && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingPublicationRow({ index: originalIdx, data: { ...row } })}
                                        className="h-7 text-[10px] px-2 py-0 border-amber-300 text-amber-800 bg-amber-50/60 hover:bg-amber-100 font-semibold"
                                      >
                                        <Edit2 className="w-2.5 h-2.5 mr-1" /> Fix Row
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </>
                  ) : isPlacement ? (
                    <>
                      <thead>
                        <tr className="bg-gray-150 border-b border-gray-200 font-semibold">
                          <th className="py-2 px-3">Register Number</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">AY (Academic Year)</th>
                          <th className="py-2 px-3">Department</th>
                          <th className="py-2 px-3">Course</th>
                          <th className="py-2 px-3">Company</th>
                          <th className="py-2 px-3">Package (LPA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono">{row.studentId}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[150px]" title={row.studentName}>{row.studentName}</td>
                            <td className="py-2 px-3">{row.batch}</td>
                            <td className="py-2 px-3">{row.department}</td>
                            <td className="py-2 px-3">{row.course || '-'}</td>
                            <td className="py-2 px-3">{row.company}</td>
                            <td className="py-2 px-3 font-mono">{row.package}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead>
                        <tr className="bg-gray-150 border-b border-gray-200 font-semibold">
                          <th className="py-2 px-3">Title</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Year</th>
                          <th className="py-2 px-3">Achiever</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[200px]" title={row.title}>{row.title}</td>
                            <td className="py-2 px-3">{row.category}</td>
                            <td className="py-2 px-3">{row.date}</td>
                            <td className="py-2 px-3 font-mono">{row.year}</td>
                            <td className="py-2 px-3 font-medium capitalize">{row.achieverType || 'faculty'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* STAGE 4: CONFIRMATION */}
          {currentStage === 'confirm' && (
            <div className="space-y-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#2F4692] flex items-center justify-center shrink-0 shadow-2xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Review & Confirm Batch Upload</h3>
                    <p className="text-xs text-slate-500">Verify upload details before initiating backend database commit</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Entity</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{uploadTypeLabel}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Source Spreadsheet</span>
                    <span className="font-mono text-slate-800 mt-0.5 block truncate">{file?.name}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Records to Commit</span>
                    {isPublication ? (
                      <div>
                        <span className="font-bold text-emerald-700 text-base font-mono mt-0.5 block">
                          {previewData.filter(r => r._rowStatus === 'ready').length} Ready Records
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          ({publicationFiles.length} file{publicationFiles.length > 1 ? 's' : ''}, {publicationFiles.filter(f => f.status === 'ready').length} faculty matched)
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          ({previewData.filter(r => r._rowStatus === 'needs_review').length} incomplete, {previewData.filter(r => r._rowStatus === 'duplicate').length} duplicates will be excluded)
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-emerald-700 text-base font-mono mt-0.5 block">{previewData.length} records</span>
                    )}
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      {isPublication ? 'Department & Scope' : 'Academic Year'}
                    </span>
                    <span className="font-bold text-[#2F4692] mt-0.5 block">
                      {isPublication ? 'Derived from Verified Faculty Profiles' : selectedAcademicYear}
                    </span>
                  </div>
                </div>

                {isPublication ? (
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-[#2855B9] shrink-0" />
                      <span>Scholarly Deduplication & Additive Co-Author Associations</span>
                    </p>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Cross-file deduplication is active: If multiple faculty files contain the same scholarly paper (matched by DOI or Title + Year), exactly 1 unique publication record is created, and all verified co-authoring faculty are linked. Repeated uploads skip existing associations without creating duplicate records.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Statutory Data & Department Isolation Rules</span>
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      By clicking Confirm, these records will be committed to the CHRIST University IQAC database. Existing records with identical primary identifiers will be updated or deduplicated per schema rules.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 5: SUMMARY */}
          {currentStage === 'summary' && (
            <div className="space-y-4">
              {importResult?.success ? (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                    <h3 className="font-bold text-sm">Bulk Import Succeeded</h3>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    {importResult.message || `Successfully processed records into the IQAC platform.`}
                  </p>

                  {isPublication && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">New Publications</span>
                        <span className="text-base font-bold text-emerald-700 font-mono">
                          {importResult.createdCount ?? importResult.count ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Faculty Linked</span>
                        <span className="text-base font-bold text-[#2855B9] font-mono">
                          {importResult.linkedCount ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Duplicates Skipped</span>
                        <span className="text-base font-bold text-slate-700 font-mono">
                          {importResult.duplicatesCount ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Needs Review</span>
                        <span className="text-base font-bold text-amber-700 font-mono">
                          {importResult.errorsCount ?? 0}
                        </span>
                      </div>
                    </div>
                  )}

                  {isPublication && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadSummaryReport}
                        className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold h-8"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download Final Import Report (CSV)
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <h3 className="font-bold text-sm">Import Failed</h3>
                  </div>
                  <p className="text-xs text-red-700">
                    {importResult?.message || uploadError || 'An error occurred while communicating with the backend.'}
                  </p>
                </div>
              )}

              {uploadErrorsList.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <span className="font-bold text-amber-900 text-xs block">
                    Row-Level Warnings / Issues ({uploadErrorsList.length}):
                  </span>
                  <ul className="list-disc pl-5 text-[10px] space-y-1 font-mono max-h-[140px] overflow-y-auto bg-white p-2.5 rounded-lg border border-amber-200 text-red-600">
                    {uploadErrorsList.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Region 3: Fixed Footer */}
        <DialogFooter className={isPublication ? "px-6 py-3.5 border-t border-slate-200 bg-white shrink-0 flex justify-between items-center sm:justify-between m-0" : "pt-4 border-t border-slate-200 flex justify-between items-center sm:justify-between"}>
          {currentStage === 'upload' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStage('validation')}
                className="bg-[#2F4692] hover:bg-[#243A7A] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs transition-colors"
                disabled={isPublication ? (publicationFiles.length === 0 || previewData.length === 0) : (!file || previewData.length === 0 || !!parseError)}
              >
                Analyze & Validate File{isPublication && publicationFiles.length > 1 ? 's' : ''} →
              </Button>
            </>
          )}

          {currentStage === 'validation' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStage('upload')}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 px-4 rounded-xl"
              >
                ← Back to Upload
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStage('preview')}
                className="bg-[#2F4692] hover:bg-[#243A7A] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs transition-colors"
                disabled={!!parseError}
              >
                Inspect Records Preview →
              </Button>
            </>
          )}

          {currentStage === 'preview' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStage('validation')}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 px-4 rounded-xl"
              >
                ← Back to Validation
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStage('confirm')}
                className="bg-[#2F4692] hover:bg-[#243A7A] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs transition-colors"
              >
                Proceed to Confirmation →
              </Button>
            </>
          )}

          {currentStage === 'confirm' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStage('preview')}
                disabled={loading}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 px-4 rounded-xl"
              >
                ← Back to Preview
              </Button>
              <Button
                type="button"
                onClick={handleUploadSubmit}
                disabled={loading}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold h-9 px-5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{loading ? 'Processing Upload...' : 'Confirm & Execute Import'}</span>
              </Button>
            </>
          )}

          {currentStage === 'summary' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={resetState}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 px-4 rounded-xl"
              >
                Upload Another File
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onSuccess();
                  handleClose();
                }}
                className="bg-[#2F4692] hover:bg-[#243A7A] text-white text-xs font-bold h-9 px-5 rounded-xl shadow-xs transition-colors"
              >
                Done
              </Button>
            </>
          )}
        </DialogFooter>

        {/* Publications Row Correction Sub-Modal */}
        {editingPublicationRow && (
          <Dialog open={!!editingPublicationRow} onOpenChange={(open) => !open && setEditingPublicationRow(null)}>
            <DialogContent className="max-w-md bg-white p-5 rounded-2xl">
              <DialogHeader className="border-b border-gray-100 pb-2">
                <DialogTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#2855B9]" />
                  <span>Correct Row #{editingPublicationRow.index + 1} Metadata</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Fill in missing mandatory fields to mark this row Ready for import.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div>
                  <Label className="font-semibold text-gray-700">Faculty Employee ID *</Label>
                  <input
                    type="text"
                    placeholder="e.g. 2043 or 00123"
                    value={editingPublicationRow.data.employeeId || ''}
                    onChange={(e) => setEditingPublicationRow({
                      ...editingPublicationRow,
                      data: { ...editingPublicationRow.data, employeeId: e.target.value }
                    })}
                    className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-xs mt-1 font-mono"
                  />
                  {editingPublicationRow.data.employeeId && facultyLookup[editingPublicationRow.data.employeeId] ? (
                    <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">
                      ✓ Matched: {facultyLookup[editingPublicationRow.data.employeeId].name} ({facultyLookup[editingPublicationRow.data.employeeId].department})
                    </span>
                  ) : editingPublicationRow.data.employeeId ? (
                    <span className="text-[11px] text-amber-600 mt-0.5 block font-medium">
                      ⚠ Employee ID not found in Faculty Directory
                    </span>
                  ) : null}
                </div>

                <div>
                  <Label className="font-semibold text-gray-700">Publication Title *</Label>
                  <input
                    type="text"
                    value={editingPublicationRow.data.title || ''}
                    onChange={(e) => setEditingPublicationRow({
                      ...editingPublicationRow,
                      data: { ...editingPublicationRow.data, title: e.target.value }
                    })}
                    className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="font-semibold text-gray-700">Authors *</Label>
                  <input
                    type="text"
                    placeholder="e.g. Kumar R., Sharma P."
                    value={editingPublicationRow.data.authorName || ''}
                    onChange={(e) => setEditingPublicationRow({
                      ...editingPublicationRow,
                      data: { ...editingPublicationRow.data, authorName: e.target.value }
                    })}
                    className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="font-semibold text-gray-700">Author Full Names (Optional)</Label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar, Priya Sharma"
                    value={editingPublicationRow.data.authorFullNames || ''}
                    onChange={(e) => setEditingPublicationRow({
                      ...editingPublicationRow,
                      data: { ...editingPublicationRow.data, authorFullNames: e.target.value }
                    })}
                    className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="font-semibold text-gray-700">Source Title (Journal Name) *</Label>
                  <input
                    type="text"
                    value={editingPublicationRow.data.journalName || ''}
                    onChange={(e) => setEditingPublicationRow({
                      ...editingPublicationRow,
                      data: { ...editingPublicationRow.data, journalName: e.target.value }
                    })}
                    className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-xs mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="font-semibold text-gray-700">Year (4-digit) *</Label>
                    <input
                      type="text"
                      value={editingPublicationRow.data.publicationYear || editingPublicationRow.data.year || ''}
                      onChange={(e) => setEditingPublicationRow({
                        ...editingPublicationRow,
                        data: { ...editingPublicationRow.data, publicationYear: e.target.value, year: e.target.value }
                      })}
                      className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-xs mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-gray-700">Citation Count</Label>
                    <input
                      type="number"
                      value={editingPublicationRow.data.citationCount ?? ''}
                      onChange={(e) => setEditingPublicationRow({
                        ...editingPublicationRow,
                        data: { ...editingPublicationRow.data, citationCount: e.target.value === '' ? null : parseInt(e.target.value) }
                      })}
                      className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-xs mt-1 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label className="font-semibold text-gray-700">DOI</Label>
                  <input
                    type="text"
                    value={editingPublicationRow.data.doi || ''}
                    onChange={(e) => setEditingPublicationRow({
                      ...editingPublicationRow,
                      data: { ...editingPublicationRow.data, doi: e.target.value }
                    })}
                    className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-xs mt-1 font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingPublicationRow(null)} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={() => handleSaveRowCorrection(editingPublicationRow.data)} className="bg-[#2855B9] text-white hover:bg-[#1C355B] text-xs font-semibold px-4">
                  Save & Revalidate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Publications View Row Details Dialog */}
        {viewingPublicationRow && (
          <Dialog open={!!viewingPublicationRow} onOpenChange={(open) => !open && setViewingPublicationRow(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl">
              <DialogHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                    Row #{viewingPublicationRow.index + 1}
                  </Badge>
                  {viewingPublicationRow.data.sourceFile && (
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-600">
                      {viewingPublicationRow.data.sourceFile}
                    </Badge>
                  )}
                  {viewingPublicationRow.data._rowStatus === 'ready' && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Ready</Badge>
                  )}
                  {viewingPublicationRow.data._rowStatus === 'needs_review' && (
                    <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">Needs Review</Badge>
                  )}
                  {viewingPublicationRow.data._rowStatus === 'duplicate' && (
                    <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]">Duplicate</Badge>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                  {viewingPublicationRow.data.title || 'Untitled Publication'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Full bibliographic metadata extracted from uploaded spreadsheet.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs text-slate-700">
                {/* Faculty & Department */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-[#2855B9] uppercase tracking-wider block">Faculty Association</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Faculty Name:</span>
                      <strong className="text-slate-900">{viewingPublicationRow.data.facultyName || 'Unassigned / Needs Review'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Employee ID:</span>
                      <strong className="font-mono text-slate-900">{viewingPublicationRow.data.employeeId || '—'}</strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 text-[10px] block">Department:</span>
                      <span className="text-slate-800 font-medium">{viewingPublicationRow.data.department || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Authors */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-[#2855B9] uppercase tracking-wider block">Authors</span>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Author Full Names:</span>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5 leading-relaxed">
                      {viewingPublicationRow.data.authorFullNames || viewingPublicationRow.data.authorName || '—'}
                    </p>
                  </div>
                  {viewingPublicationRow.data.authorFullNames && viewingPublicationRow.data.authorName && viewingPublicationRow.data.authorFullNames !== viewingPublicationRow.data.authorName && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 text-[10px] block">Abbreviated Authors:</span>
                      <p className="text-xs text-slate-700 mt-0.5 font-mono">{viewingPublicationRow.data.authorName}</p>
                    </div>
                  )}
                </div>

                {/* Source & Publication Details */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Publication Details</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Journal / Source Title:</span>
                      <strong className="text-slate-800">{viewingPublicationRow.data.journalName || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Publisher:</span>
                      <span className="text-slate-700">{viewingPublicationRow.data.publisher || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Year:</span>
                      <strong className="font-mono text-slate-800">{viewingPublicationRow.data.publicationYear || viewingPublicationRow.data.year || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Indexing:</span>
                      <span className="font-medium text-[#2855B9]">{viewingPublicationRow.data.indexing || viewingPublicationRow.data.journalType || 'Scopus'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Volume & Issue:</span>
                      <span className="text-slate-700">{viewingPublicationRow.data.volume ? `Vol. ${viewingPublicationRow.data.volume}` : '—'} {viewingPublicationRow.data.issue ? `(Issue ${viewingPublicationRow.data.issue})` : ''}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Pages:</span>
                      <span className="text-slate-700">{viewingPublicationRow.data.pageNumber || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Identifiers & Citations */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Bibliographic Identifiers</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded border border-slate-150">
                      <span className="text-slate-400 text-[10px] block">DOI:</span>
                      <span className="font-mono text-[11px] font-semibold text-[#2855B9] break-all">{viewingPublicationRow.data.doi || '—'}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-150">
                      <span className="text-slate-400 text-[10px] block">ISSN:</span>
                      <span className="font-mono text-[11px] text-slate-700">{viewingPublicationRow.data.issn || '—'}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-150">
                      <span className="text-slate-400 text-[10px] block">ISBN:</span>
                      <span className="font-mono text-[11px] text-slate-700">{viewingPublicationRow.data.isbn || '—'}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-150">
                      <span className="text-slate-400 text-[10px] block">Citations:</span>
                      <strong className="text-emerald-700 font-bold">{viewingPublicationRow.data.citationCount !== null && viewingPublicationRow.data.citationCount !== undefined ? String(viewingPublicationRow.data.citationCount) : '—'}</strong>
                    </div>
                  </div>
                </div>

                {/* Validation Status & Issues */}
                {(viewingPublicationRow.data._issues?.length > 0 || viewingPublicationRow.data._duplicateReason) && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Validation Issues / Remarks</span>
                    {viewingPublicationRow.data._duplicateReason && (
                      <p className="text-slate-700 font-medium">Duplicate note: {viewingPublicationRow.data._duplicateReason}</p>
                    )}
                    {viewingPublicationRow.data._issues?.map((iss: string, i: number) => (
                      <p key={i} className="text-amber-800 font-medium flex items-center gap-1">• {iss}</p>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end">
                <Button size="sm" onClick={() => setViewingPublicationRow(null)} className="bg-[#2855B9] text-white hover:bg-[#1C355B] text-xs px-4">
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
