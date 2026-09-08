import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileSpreadsheet, AlertTriangle, CheckCircle, UploadCloud, Info } from 'lucide-react';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName, normalizeDesignationName } from './FacultyDetailsPage';

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

const normalizeGender = (val: string): 'Male' | 'Female' | 'Other' | null => {
  if (!val) return null;
  const cleaned = val.trim().toLowerCase();
  if (cleaned === 'male' || cleaned === 'm') return 'Male';
  if (cleaned === 'female' || cleaned === 'f') return 'Female';
  if (cleaned === 'other' || cleaned === 'o') return 'Other';
  return null;
};

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
  'Start Date',
  'End Date',
  'Sanctioned Amount (INR)',
  'Amount Received (INR)',
  'Status',
  'Progress (%)',
  'Department',
  'Academic Year',
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
  'Academic Year',
  'Filing Date',
  'Publication Date',
  'Grant Date',
  'License Date',
  'Commercial Partner',
  'Revenue Generated (INR)',
  'Patent URL',
  'Abstract'
];

const PATENTS_REQUIRED = [
  'Title',
  'Inventors'
];

const PUBLICATIONS_HEADERS = [
  'Author Name',
  'Title',
  'Journal Name',
  'Journal Type',
  'Department',
  'Academic Year',
  'Publication Date',
  'DOI',
  'ISSN',
  'Volume',
  'Issue',
  'Page Number',
  'Impact Factor',
  'Citations',
  'URL',
  'Abstract'
];

const PUBLICATIONS_REQUIRED = [
  'Author Name',
  'Title',
  'Journal Name'
];

const CONSULTANCY_HEADERS = [
  'S. No.',
  'Name of the Teacher Consultant',
  'Name of Consultancy Project',
  'Consulting/Sponsoring Agency with Contact Details',
  'Year',
  'Revenue Generated (INR in Lakhs)'
];

const CONSULTANCY_REQUIRED = [
  'Name of the Teacher Consultant',
  'Name of Consultancy Project',
  'Consulting/Sponsoring Agency with Contact Details',
  'Year'
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

export function BulkUploadDialog({ isOpen, onClose, token, onSuccess, uploadType = 'achievements' }: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [parseError, setParseError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadErrorsList, setUploadErrorsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { campusList, schoolList, departmentList } = useAcademicHierarchy();
  const FIXED_DEPARTMENTS = React.useMemo(() => {
    const set = new Set<string>();
    departmentList.forEach(d => {
      if (d) set.add(normalizeDepartmentName(d));
    });
    if (set.size === 0) {
      return [
        'AI and Data Science Engineering',
        'Civil Engineering',
        'Computer Science and Engineering',
        'Electrical and Electronics Engineering',
        'Electronics and Communication Engineering',
        'Mechanical and Automobile Engineering',
        'Sciences and Humanities (Engineering)'
      ];
    }
    return Array.from(set).sort();
  }, [departmentList]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2024-2025');
  const [selectedCampus, setSelectedCampus] = useState<string>('Kengeri Campus');
  const [selectedSchool, setSelectedSchool] = useState<string>('School of Engineering and Technology');

  const isPlacement = uploadType === 'placements';
  const isFaculty = uploadType === 'faculty';
  const isStudent = uploadType === 'students';
  const isDepartment = uploadType === 'departments';
  const isConsultancy = uploadType === 'consultancy';
  const isDepartmentalActivity = uploadType === 'departmental-activities';
  const isPublication = uploadType === 'publications';
  const isPatent = uploadType === 'patents';
  const isSponsored = uploadType === 'sponsored-projects' || uploadType === 'sponsored-research';

  const resetState = () => {
    setFile(null);
    setPreviewData([]);
    setParseError('');
    setUploadError('');
    setUploadErrorsList([]);
    setSuccessMsg('');
    setSelectedDepartment('');
    setSelectedAcademicYear('2024-2025');
    setSelectedCampus('Kengeri Campus');
    setSelectedSchool('School of Engineering and Technology');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        `"Autonomous Aerial Edge Computing Swarm for Precision Agriculture","Dr. Rajesh Kumar","Dr. Priya Sharma, Dr. Deepa Singh","Department of Science and Technology (DST) - SERB","CRG (Core Research Grant)","Government (National)","DST/SERB/2024/CRG-0891","2024-03-15","2024-04-01","2027-03-31",4850000,2425000,"Ongoing",45,"Computer Science and Engineering","2024-2025","https://serb.gov.in","Multi-UAV cooperative reinforcement learning framework."\n` +
        `"Low-Cost Nanostructured Photocatalytic Wastewater Remediation","Dr. Suresh Menon","Dr. Anita Rao","AICTE - Research Promotion Scheme (RPS)","RPS Grant-in-Aid","Government (National)","AICTE/RPS/8-45/2023-24","2023-11-20","2024-01-01","2026-12-31",2200000,2200000,"Ongoing",60,"Civil Engineering","2023-2024","https://aicte-india.org","Visible light responsive titanium dioxide membrane filtration."`;
      fileName = 'sponsored_projects_bulk_template.csv';
    } else if (isPatent) {
      csvContent =
        PATENTS_HEADERS.join(',') + '\n' +
        `"AI-Driven Smart Grid Energy Optimization & Load Forecasting","Dr. Rajesh Kumar, Dr. Priya Sharma","202441012345","IN-PAT-456789","Granted","National (Indian)","Computer Science and Engineering","2024-2025","2023-08-15","2024-02-10","2024-11-20","2025-01-15","Schneider Electric India",1500000,"https://ipindiaonline.gov.in/patentsearch","Novel AI algorithm minimizing line loss in microgrids."\n` +
        `"Biodegradable Chitosan-Silica Nanocomposite Membrane for Effluent Treatment","Dr. Suresh Menon, Dr. Anita Rao","PCT/IN2023/050123","","Published","International (PCT)","Civil Engineering","2023-2024","2023-11-05","2024-05-12","","","",0,"https://patentscope.wipo.int","Eco-friendly membrane technology for industrial dye and heavy metal removal."`;
      fileName = 'patents_bulk_template.csv';
    } else if (isConsultancy) {
      csvContent =
        CONSULTANCY_HEADERS.join(',') + '\n' +
        `1,"Dr. Rajesh Kumar","Smart City Infrastructure Planning","Bangalore Smart City Corporation, Contact: info@bscc.gov.in, Ph: 080-12345678","2024-25",25.00\n` +
        `2,"Dr. Deepa Singh","AI-Powered Customer Analytics Platform","RetailMax Solutions Pvt. Ltd., Contact: projects@retailmax.in, Ph: 080-87654321","2023-24",18.50`;
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
      csvContent =
        "Register Number,Name,AY (Academic Year),Department,Course,Company,Package\n" +
        "\"2460301\",\"Aarav Sharma\",\"2024-2025\",\"Computer Science and Engineering\",\"BTech in Computer Science and Engineering\",\"Google\",12.50\n" +
        "\"2460302\",\"Ananya Rao\",\"2024-2025\",\"AI and Data Science Engineering\",\"BTech (Artificial Intelligence and Machine Learning)\",\"Samsung\",8.50";
      fileName = 'placements_bulk_template.csv';
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
        PUBLICATIONS_HEADERS.join(',') + '\n' +
        `"Dr. Rajesh Kumar, Dr. Priya Sharma","Deep Learning Framework for Edge IoT Healthcare Sensors","IEEE Transactions on Industrial Informatics","Scopus","Computer Science and Engineering","2024-2025","2024-04-10","10.1109/TII.2024.1234567","1551-3203","20","4","2890-2902",11.7,18,"https://ieeexplore.ieee.org","A comprehensive study on lightweight neural networks for wearable heart monitoring."\n` +
        `"Dr. Deepa Singh, Dr. Suresh Menon","Sustainable High-Volume Fly Ash Concrete Under High Temperatures","Journal of Cleaner Production (Elsevier)","WoS (Web of Science)","Civil Engineering","2024-2025","2024-02-18","10.1016/j.jclepro.2024.140890","0959-6526","435","1","140-155",11.1,12,"https://sciencedirect.com","Investigation into structural fire resistance and carbonation depth of alkali-activated slag binders."`;
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
        ['Autonomous Aerial Edge Computing Swarm for Precision Agriculture', 'Dr. Rajesh Kumar', 'Dr. Priya Sharma, Dr. Deepa Singh', 'Department of Science and Technology (DST) - SERB', 'CRG (Core Research Grant)', 'Government (National)', 'DST/SERB/2024/CRG-0891', '2024-03-15', '2024-04-01', '2027-03-31', 4850000, 2425000, 'Ongoing', 45, 'Computer Science and Engineering', '2024-2025', 'https://serb.gov.in', 'Multi-UAV cooperative reinforcement learning framework.'],
        ['Low-Cost Nanostructured Photocatalytic Wastewater Remediation', 'Dr. Suresh Menon', 'Dr. Anita Rao', 'AICTE - Research Promotion Scheme (RPS)', 'RPS Grant-in-Aid', 'Government (National)', 'AICTE/RPS/8-45/2023-24', '2023-11-20', '2024-01-01', '2026-12-31', 2200000, 2200000, 'Ongoing', 60, 'Civil Engineering', '2023-2024', 'https://aicte-india.org', 'Visible light responsive titanium dioxide membrane filtration.']
      ];
      fileName = 'sponsored_projects_bulk_template.xlsx';
    } else if (isPatent) {
      headers = PATENTS_HEADERS;
      sampleRows = [
        ['AI-Driven Smart Grid Energy Optimization & Load Forecasting', 'Dr. Rajesh Kumar, Dr. Priya Sharma', '202441012345', 'IN-PAT-456789', 'Granted', 'National (Indian)', 'Computer Science and Engineering', '2024-2025', '2023-08-15', '2024-02-10', '2024-11-20', '2025-01-15', 'Schneider Electric India', 1500000, 'https://ipindiaonline.gov.in/patentsearch', 'Novel AI algorithm minimizing line loss in microgrids.'],
        ['Biodegradable Chitosan-Silica Nanocomposite Membrane for Effluent Treatment', 'Dr. Suresh Menon, Dr. Anita Rao', 'PCT/IN2023/050123', '', 'Published', 'International (PCT)', 'Civil Engineering', '2023-2024', '2023-11-05', '2024-05-12', '', '', '', 0, 'https://patentscope.wipo.int', 'Eco-friendly membrane technology for industrial dye and heavy metal removal.']
      ];
      fileName = 'patents_bulk_template.xlsx';
    } else if (isConsultancy) {
      headers = CONSULTANCY_HEADERS;
      sampleRows = [
        ['1', 'Dr. Rajesh Kumar', 'Smart City Infrastructure Planning', 'Bangalore Smart City Corporation, Contact: info@bscc.gov.in, Ph: 080-12345678', '2024-25', 25.00],
        ['2', 'Dr. Deepa Singh', 'AI-Powered Customer Analytics Platform', 'RetailMax Solutions Pvt. Ltd., Contact: projects@retailmax.in, Ph: 080-87654321', '2023-24', 18.50]
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
      headers = ['Register Number', 'Name', 'AY (Academic Year)', 'Department', 'Course', 'Company', 'Package'];
      sampleRows = [
        ['2460301', 'Aarav Sharma', '2024-2025', 'Computer Science and Engineering', 'BTech in Computer Science and Engineering', 'Google', 12.50],
        ['2460302', 'Ananya Rao', '2024-2025', 'AI and Data Science Engineering', 'BTech (Artificial Intelligence and Machine Learning)', 'Samsung', 8.50]
      ];
      fileName = 'placements_bulk_template.xlsx';
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
        ['Dr. Rajesh Kumar, Dr. Priya Sharma', 'Deep Learning Framework for Edge IoT Healthcare Sensors', 'IEEE Transactions on Industrial Informatics', 'Scopus', 'Computer Science and Engineering', '2024-2025', '2024-04-10', '10.1109/TII.2024.1234567', '1551-3203', '20', '4', '2890-2902', 11.7, 18, 'https://ieeexplore.ieee.org', 'A comprehensive study on lightweight neural networks for wearable heart monitoring.'],
        ['Dr. Deepa Singh, Dr. Suresh Menon', 'Sustainable High-Volume Fly Ash Concrete Under High Temperatures', 'Journal of Cleaner Production (Elsevier)', 'WoS (Web of Science)', 'Civil Engineering', '2024-2025', '2024-02-18', '10.1016/j.jclepro.2024.140890', '0959-6526', '435', '1', '140-155', 11.1, 12, 'https://sciencedirect.com', 'Investigation into structural fire resistance and carbonation depth of alkali-activated slag binders.']
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
      const reqConsultancy = [
        { name: 'Name of the Teacher Consultant', match: 'teacher consultant' },
        { name: 'Name of Consultancy Project', match: 'consultancy project' },
        { name: 'Consulting/Sponsoring Agency with Contact Details', match: 'sponsoring agency' },
        { name: 'Year', match: 'year' }
      ];
      missing = reqConsultancy
        .filter(req => !lowerHeaders.some(lh => lh.includes(req.match)))
        .map(req => req.name);
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
      missing = PATENTS_REQUIRED.filter(field => !headers.some(h => h.toLowerCase().trim() === field.toLowerCase().trim() || (field === 'Title' && h.toLowerCase().includes('title')) || (field === 'Inventors' && (h.toLowerCase().includes('inventor') || h.toLowerCase().includes('author')))));
    } else if (isPublication) {
      missing = PUBLICATIONS_REQUIRED.filter(field => !headers.some(h => h.toLowerCase().trim() === field.toLowerCase().trim() || (field === 'Title' && h.toLowerCase().includes('title')) || (field === 'Author Name' && (h.toLowerCase().includes('author') || h.toLowerCase().includes('participants'))) || (field === 'Journal Name' && (h.toLowerCase().includes('journal') || h.toLowerCase().includes('organization') || h.toLowerCase().includes('publisher')))));
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
            } else if (lowerHeader.includes('teacher consultant')) {
              record['teacherConsultant'] = val || '';
            } else if (lowerHeader.includes('consultancy project')) {
              record['projectName'] = val || '';
            } else if (lowerHeader.includes('sponsoring agency') || lowerHeader.includes('consulting/sponsoring')) {
              record['sponsoringAgency'] = val || '';
            } else if (lowerHeader === 'year') {
              record['year'] = val || '';
            } else if (lowerHeader.includes('revenue')) {
              record['revenueInLakhs'] = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
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
            if (header === 'Name' || header === 'studentName') {
              record['studentName'] = val;
            } else if (header === 'Register Number' || header === 'studentId') {
              record['studentId'] = val;
            } else if (['AY (Academic Year)', 'AY( Academic Year)', 'AY (Academic Year)', 'AY', 'Batch', 'batch'].includes(header)) {
              record['batch'] = val;
            } else if (header === 'Department' || header === 'department') {
              record['department'] = val;
            } else if (header === 'Course' || header === 'course') {
              record['course'] = val;
            } else if (header === 'Company' || header === 'company') {
              record['company'] = val;
            } else if (header === 'Package' || header === 'package') {
              let rawPkg = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
              if (rawPkg > 1000) rawPkg = rawPkg / 100000;
              record['package'] = rawPkg;
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
            switch (header) {
              case 'Author Name':
              case 'Author':
              case 'Authors':
              case 'authorName':
                record['authorName'] = val; break;
              case 'Title':
              case 'Publication Title':
              case 'Paper Title':
              case 'title':
                record['title'] = val; break;
              case 'Journal Name':
              case 'Journal':
              case 'Publisher':
              case 'journalName':
                record['journalName'] = val; break;
              case 'Journal Type':
              case 'Indexing':
              case 'Type':
              case 'journalType':
                record['journalType'] = val; break;
              case 'Department':
              case 'department':
                record['department'] = val; break;
              case 'Academic Year':
              case 'Year':
              case 'academicYear':
                record['academicYear'] = val; break;
              case 'Publication Date':
              case 'Date':
              case 'publicationDate':
                record['publicationDate'] = val; break;
              case 'DOI':
              case 'DOI Number':
              case 'doi':
                record['doi'] = val; break;
              case 'ISSN':
              case 'ISBN':
              case 'issn':
                record['issn'] = val; break;
              case 'Volume':
              case 'volume':
                record['volume'] = val; break;
              case 'Issue':
              case 'issue':
                record['issue'] = val; break;
              case 'Page Number':
              case 'Pages':
              case 'pageNumber':
                record['pageNumber'] = val; break;
              case 'Impact Factor':
              case 'impactFactor':
                record['impactFactor'] = parseFloat(val) || null; break;
              case 'Citations':
              case 'citationCount':
                record['citationCount'] = parseInt(val) || 0; break;
              case 'URL':
              case 'Paper Link':
              case 'paperUrl':
                record['paperUrl'] = val; break;
              case 'Abstract':
              case 'abstract':
                record['abstract'] = val; break;
              default: record[header] = val;
            }
          } else if (isPatent) {
            const lh = header.toLowerCase().trim();
            if (lh.includes('title')) {
              record['title'] = val;
            } else if (lh.includes('inventor') || lh.includes('author')) {
              record['inventors'] = val;
            } else if (lh.includes('application') || lh === 'app no' || lh === 'appno' || lh === 'applicationno') {
              record['applicationNo'] = val;
            } else if (lh.includes('patent no') || lh === 'patentno' || lh === 'grant no' || lh === 'patent number') {
              record['patentNo'] = val;
            } else if (lh === 'status' || lh === 'stage' || lh.includes('patent status')) {
              const sl = (val || '').toLowerCase().trim();
              if (sl.includes('grant')) record['status'] = 'granted';
              else if (sl.includes('publish')) record['status'] = 'published';
              else if (sl.includes('commercial') || sl.includes('licens')) record['status'] = 'commercialized';
              else if (sl.includes('exam')) record['status'] = 'under_examination';
              else if (sl.includes('file') || sl.includes('submit')) record['status'] = 'filed';
              else record['status'] = val || 'published';
            } else if (lh.includes('type') || lh.includes('jurisdiction')) {
              record['patentType'] = val || 'National (Indian)';
            } else if (lh.includes('department')) {
              record['department'] = val;
            } else if (lh.includes('academic year') || lh === 'year') {
              record['academicYear'] = val;
            } else if (lh.includes('file') || lh.includes('filing')) {
              record['filedDate'] = formatDateToISO(val);
            } else if (lh.includes('publish') || lh.includes('publication')) {
              record['publishedDate'] = formatDateToISO(val);
            } else if (lh.includes('grant')) {
              record['grantedDate'] = formatDateToISO(val);
            } else if (lh.includes('licens')) {
              record['licenseDate'] = formatDateToISO(val);
            } else if (lh.includes('partner') || lh.includes('commercial partner') || lh.includes('industry')) {
              record['partner'] = val;
            } else if (lh.includes('revenue') || lh.includes('royalt') || lh.includes('amount') || lh.includes('earning')) {
              record['revenue'] = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
            } else if (lh.includes('url') || lh.includes('link')) {
              record['patentUrl'] = val;
            } else if (lh.includes('abstract') || lh.includes('description') || lh.includes('summary')) {
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
            } else if (lh.includes('academic year') || lh === 'year') {
              record['academicYear'] = val;
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
        if (!record.role) record.role = 'NIL';
        if (!record.placementType) record.placementType = 'placement';
        if (!record.placementDate) record.placementDate = new Date().toISOString().split('T')[0];
      }

      // Default any missing, null, or empty string values to 'NIL' (except for publications/patents/sponsored where optional fields can remain empty/null)
      if (!isPublication && !isPatent && !isSponsored) {
        Object.keys(record).forEach(k => {
          if (record[k] === undefined || record[k] === null || record[k] === '' || String(record[k]).trim() === '') {
            record[k] = 'NIL';
          }
        });
      }

      records.push(record);
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

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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

      const dateKeys = ['dateOfBirth', 'dateOfJoining', 'dob', 'admissionDate', 'eventDate', 'placementDate', 'date', 'publicationDate', 'filedDate', 'publishedDate', 'grantedDate', 'licenseDate', 'sanctionDate', 'startDate', 'endDate'];
      Object.keys(item).forEach(k => {
        if (dateKeys.includes(k)) {
          if (!item[k] || String(item[k]).toLowerCase() === 'nil' || String(item[k]).toLowerCase() === 'n/a' || String(item[k]).toLowerCase() === 'invalid date' || String(item[k]).trim() === '') {
            item[k] = null;
          }
        } else if (!isPublication && !isPatent && !isSponsored) {
          if (item[k] === undefined || item[k] === null || item[k] === '' || String(item[k]).trim() === '') {
            item[k] = 'NIL';
          }
        }
      });

      return item;
    });

    const bodyPayload = isDepartmentalActivity
      ? { activities: dataWithCommonFields }
      : isPublication
        ? { items: dataWithCommonFields, defaultDepartment: selectedDepartment, defaultYear: selectedAcademicYear }
        : isPatent
          ? { items: dataWithCommonFields, defaultDepartment: selectedDepartment, defaultYear: selectedAcademicYear }
          : isSponsored
            ? { items: dataWithCommonFields, defaultDepartment: selectedDepartment, defaultYear: selectedAcademicYear }
            : isConsultancy
              ? { consultancyProjects: dataWithCommonFields }
              : isFaculty
                ? { faculty: dataWithCommonFields }
                : isPlacement
                  ? { placements: dataWithCommonFields }
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
        if (data.errors && data.errors.length > 0) {
          setUploadError(`${data.count} record(s) loaded successfully, but ${data.errors.length} failed. See errors below.`);
          setUploadErrorsList(data.errors);
          onSuccess(); // Refresh parent to display successfully uploaded ones
        } else {
          setSuccessMsg(data.message);
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 1500);
        }
      } else {
        setUploadError(data.message || 'Bulk upload failed.');
        if (data.errors) {
          setUploadErrorsList(data.errors);
        }
      }
    } catch (err) {
      console.error(err);
      setUploadError('Connection to backend failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const uploadTypeLabel = isSponsored ? 'Sponsored Research & Grants' : isPatent ? 'Patents & Intellectual Property' : isPublication ? 'Publications (Scopus / WoS)' : isConsultancy ? 'Consultancy Projects (NIRF)' : isFaculty ? 'Faculty Details' : isStudent ? 'Student Details' : isDepartment ? 'Department Details' : isPlacement ? 'Placements & Internships' : 'Achievements';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto bg-white p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-700" />
            <span>Bulk Upload {uploadTypeLabel} (CSV / Excel)</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Upload {uploadTypeLabel} records in bulk via a CSV or Excel file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex gap-3 leading-normal">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">CSV / Excel Formatting Guidelines:</p>
               <p>Your CSV or Excel file columns must map to the headers list below. The required fields are marked with **.</p>
               {isSponsored ? (
                 <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all break-all text-[11px]">
                    Project Title**, Principal Investigator**, Co-Investigators, Funding Agency**, Scheme / Program, Agency Type, Sanction Order No, Sanction Date, Start Date, End Date, Sanctioned Amount (INR), Amount Received (INR), Status, Progress (%), Department, Academic Year, Project URL, Description
                 </p>
               ) : isPatent ? (
                 <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all break-all text-[11px]">
                    Title**, Inventors**, Application No, Patent No, Status, Patent Type, Department, Academic Year, Filing Date, Publication Date, Grant Date, License Date, Commercial Partner, Revenue Generated (INR), Patent URL, Abstract
                 </p>
               ) : isPublication ? (
                 <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all break-all text-[11px]">
                    Author Name**, Title**, Journal Name**, Journal Type, Department, Academic Year, Publication Date, DOI, ISSN, Volume, Issue, Page Number, Impact Factor, Citations, URL, Abstract
                 </p>
               ) : isConsultancy ? (
                 <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all break-all text-[11px]">
                    S. No., Name of the Teacher Consultant**, Name of Consultancy Project**, Consulting/Sponsoring Agency with Contact Details**, Year**, Revenue Generated (INR in Lakhs)
                 </p>
               ) : isFaculty ? (
                 <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all break-all">
                    EmpId**, Name**, Designation**, Department**, Gender, Date of birth, PanCard No, Date Of Joining, Previous Teaching Experince Years, Previous Teaching Experince Months, Previous Industry Experince Years, Previous Industry Experince Months, Qualification Level, Highest Qualification, Experience in CU - Years, Experience in CU - Months
                 </p>
               ) : isStudent ? (
                  <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all break-all text-[10px]">
                    Register No**, Student Name**, Class Name, Application No, Gender, Date Of Birth, Mobile No, Nationality, Caste, Current City, Current State, Permanent City, Permanent State, Parent Mobile No, Handicapped, Handicapped Description, Campus, Disability: (YES/NO), Department, Program Level
                  </p>
               ) : isDepartment ? (
                 <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all break-all text-[11px]">
                    Code**, Name**, HOD Name, HOD Email, Established Year, Phone, Description
                 </p>
               ) : isPlacement ? (
                <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all">
                   Register Number**, Name**, AY (Academic Year)**, Department**, Course, Company**, Package**
                </p>
              ) : (
                <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all">
                   title**, category**, date**, year**, description, subcategory, achieverType, rank, score, organization, location, participants, impact, status
                </p>
              )}
              <div className="flex gap-4 mt-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-blue-700 hover:text-blue-900 font-semibold underline block"
                >
                  Download Sample CSV Template
                </button>
                <span className="text-gray-400 hidden sm:inline">|</span>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="text-blue-700 hover:text-blue-900 font-semibold underline block"
                >
                  Download Sample Excel (.xlsx) Template
                </button>
              </div>
            </div>
          </div>

          {/* Common Upload Metadata (Academic Year, Campus, School) */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <h4 className="font-semibold text-xs text-[#2f4692] uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#2f4692]" />
              Common Upload Metadata (Applied to all records in this file)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Academic Year <span className="text-red-500">*</span></label>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
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
                  onChange={(e) => setSelectedCampus(e.target.value)}
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
                  onChange={(e) => setSelectedSchool(e.target.value)}
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors text-center relative cursor-pointer">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.xls,.xlsx"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={loading}
              />
            <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            {file ? (
              <div>
                <p className="font-bold text-gray-800">{file.name}</p>
                <p className="text-[10px] text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB - Click to replace</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-gray-700">Drag & drop your CSV or Excel file here, or click to browse</p>
                <p className="text-[10px] text-gray-400 mt-1">Upload files ending with .csv, .xls, or .xlsx format</p>
              </div>
            )}
          </div>

          {/* Messages */}
          {parseError && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg flex gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {uploadError && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg space-y-2">
              <div className="flex gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
              {uploadErrorsList.length > 0 && (
                <ul className="list-disc pl-5 text-[10px] space-y-1 font-mono max-h-[120px] overflow-y-auto bg-white p-2 rounded border border-red-150">
                  {uploadErrorsList.map((err, idx) => (
                    <li key={idx} className="text-red-600">{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded-lg flex gap-2 font-semibold">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* CSV Preview */}
          {previewData.length > 0 && !parseError && (
            <div className="space-y-1.5">
              <p className="font-semibold text-gray-700 flex items-center justify-between">
                <span>Records Preview ({previewData.length} records detected)</span>
                <span className="text-[10px] text-gray-400 font-normal">Previewing up to 5 records</span>
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded">
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
                          <th className="py-2 px-3 whitespace-nowrap">Agency</th>
                          <th className="py-2 px-3 whitespace-nowrap">Year</th>
                          <th className="py-2 px-3 whitespace-nowrap">Revenue (₹ Lakhs)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[150px]" title={row.teacherConsultant}>{row.teacherConsultant}</td>
                            <td className="py-2 px-3 truncate max-w-[150px]" title={row.projectName}>{row.projectName}</td>
                            <td className="py-2 px-3 truncate max-w-[150px]" title={row.sponsoringAgency}>{row.sponsoringAgency}</td>
                            <td className="py-2 px-3 font-mono">{row.year}</td>
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
                          <th className="py-2 px-3 whitespace-nowrap">Year</th>
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
                            <td className="py-2 px-3 font-mono">{row.academicYear || '-'}</td>
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
                            <td className="py-2 px-3 font-mono">{row.academicYear || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : isPublication ? (
                    <>
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-semibold">
                          <th className="py-2 px-3 whitespace-nowrap">Preview No</th>
                          <th className="py-2 px-3 whitespace-nowrap">Title</th>
                          <th className="py-2 px-3 whitespace-nowrap">Author(s)</th>
                          <th className="py-2 px-3 whitespace-nowrap">Journal Name</th>
                          <th className="py-2 px-3 whitespace-nowrap">Indexing</th>
                          <th className="py-2 px-3 whitespace-nowrap">Department</th>
                          <th className="py-2 px-3 whitespace-nowrap">Year</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-gray-900 truncate max-w-[180px]" title={row.title}>{row.title}</td>
                            <td className="py-2 px-3 truncate max-w-[140px]" title={row.authorName}>{row.authorName}</td>
                            <td className="py-2 px-3 truncate max-w-[140px]" title={row.journalName}>{row.journalName}</td>
                            <td className="py-2 px-3">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">
                                {row.journalType || 'Scopus'}
                              </span>
                            </td>
                            <td className="py-2 px-3 truncate max-w-[120px]" title={row.department}>{row.department || '-'}</td>
                            <td className="py-2 px-3 font-mono">{row.academicYear || '-'}</td>
                          </tr>
                        ))}
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
        </div>

        <DialogFooter className="pt-4 border-t border-gray-150 flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="text-xs"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUploadSubmit}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
            disabled={loading || previewData.length === 0 || !!parseError}
          >
            {loading ? 'Processing...' : 'Upload & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
