import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { FileSpreadsheet, AlertTriangle, CheckCircle, UploadCloud, Info } from 'lucide-react';

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
  uploadType?: 'achievements' | 'placements' | 'faculty' | 'students' | 'departments';
}

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
  'Batch'
];

const STUDENT_REQUIRED = [
  'Register No',
  'Student Name'
];

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

  const isPlacement = uploadType === 'placements';
  const isFaculty = uploadType === 'faculty';
  const isStudent = uploadType === 'students';
  const isDepartment = uploadType === 'departments';

  const resetState = () => {
    setFile(null);
    setPreviewData([]);
    setParseError('');
    setUploadError('');
    setUploadErrorsList([]);
    setSuccessMsg('');
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

    if (isFaculty) {
      csvContent =
        FACULTY_HEADERS.join(',') + '\n' +
        `EMP001,"Dr. Rajesh Kumar",Professor,"Computer Science and Engineering",Male,1980-05-15,ABCPK1234D,2010-07-01,5,6,3,0,PhD,"Ph.D. in Computer Science",13,6\n` +
        `EMP002,"Ms. Priya Sharma","Assistant Professor","Electronics and Communication Engineering",Female,1990-03-22,XYZPS5678E,2018-08-01,2,0,0,0,PG,"M.Tech in VLSI",5,11`;
    } else if (isStudent) {
      csvContent =
        STUDENT_HEADERS.join(',') + '\n' +
        `"2310101","John Doe","3A B.Tech CSE","APP12345","Male",2002-04-12,"9876543210","Indian","General","Bengaluru","Karnataka","Bengaluru","Karnataka","9876543211","NO","NIL","Kengeri Campus","NO","Computer Science and Engineering","2022 - 2026"\n` +
        `"2310102","Jane Smith","5C B.Tech ECE","APP12346","Female",2003-09-25,"9876543212","Indian","General","Bengaluru","Karnataka","Mysuru","Karnataka","9876543213","NO","NIL","Kengeri Campus","NO","Electronics and Communication Engineering","2022 - 2026"`;
    } else if (isDepartment) {
      csvContent =
        DEPARTMENT_HEADERS.join(',') + '\n' +
        `CSE,"Computer Science and Engineering","Dr. Rajesh Kumar","hod.cse@christuniversity.in",2005,"080-1234567","Focus on Software Development, AI, and Cloud Computing."\n` +
        `ECE,"Electronics and Communication Engineering","Dr. Priya Sharma","hod.ece@christuniversity.in",2006,"080-1234568","Focus on Signal Processing, VLSI Design, and Embedded Systems."`;
    } else if (isPlacement) {
      csvContent =
        "Register Number,Name,AY (Academic Year),Department,Course,Company,Package\n" +
        "\"2310101\",\"Amit Sharma\",\"2023-24\",\"Computer Science and Engineering\",\"B.Tech CSE\",\"Google\",12.50\n" +
        "\"2310102\",\"Neha Gupta\",\"2023-24\",\"Electronics and Communication Engineering\",\"B.Tech ECE\",\"Samsung\",800000";
    } else {
      csvContent =
        "title,category,date,year,description,subcategory,achieverType,rank,score,organization,location,participants,impact,status\n" +
        "\"Deep Learning CSE Journal Paper\",research,2024-05-15,2024-2025,\"Published paper in IEEE Access\",Journal,faculty,,,\"IEEE\",\"Online\",\"Dr. Rajesh Kumar, Dr. Priya Sharma\",\"International\",submitted\n" +
        "\"National Tech Fest 1st Place\",awards,2024-02-10,2023-2024,\"Won gold medal in smart hackathon\",Hackathon,student,1st,10.00,\"SRM University\",\"Chennai\",\"Rahul Kumar, Sneha Patel\",\"National\",approved";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', isFaculty ? 'faculty_bulk_template.csv' : isPlacement ? 'placements_bulk_template.csv' : 'students_bulk_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setParseError('Please upload a valid CSV file.');
      return;
    }

    setFile(selectedFile);
    setParseError('');
    setUploadError('');
    setUploadErrorsList([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(selectedFile);
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
    if (isFaculty) {
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
          if (isFaculty) {
            // Map CSV headers to backend field names
            switch (header) {
              case 'EmpId':            record['employeeId'] = val || 'NIL'; break;
              case 'Name':             record['name'] = val || 'NIL'; break;
              case 'Designation':      record['designation'] = val || 'NIL'; break;
              case 'Department':       record['department'] = val || 'NIL'; break;
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
              default: record[header] = val;
            }
          } else if (isStudent) {
            // Map CSV headers to student backend field names
            switch (header) {
              case 'Register No':              record['registerNumber'] = val || 'NIL'; break;
              case 'Student Name':             record['name'] = val || 'NIL'; break;
              case 'Class Name':               record['className'] = val || 'NIL'; record['course'] = val || 'NIL'; break;
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
          } else {
            record[header] = val;
          }
        }
      });

      if (isPlacement) {
        if (!record.role) record.role = 'Not Specified';
        if (!record.placementType) record.placementType = 'placement';
        if (!record.placementDate) record.placementDate = new Date().toISOString().split('T')[0];
      }

      records.push(record);
    }

    if (records.length === 0) {
      setParseError(
        isFaculty ? 'No faculty rows detected in the CSV file.'
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

    setLoading(true);
    setUploadError('');
    setUploadErrorsList([]);

    const endpoint = isFaculty
      ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/faculty/bulk`
      : isPlacement
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/placements/bulk`
        : isStudent
          ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/students/bulk`
          : isDepartment
            ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/departments/bulk`
            : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements/bulk`;

    const bodyPayload = isFaculty
      ? { faculty: previewData }
      : isPlacement
        ? { placements: previewData }
        : isStudent
          ? { students: previewData }
          : isDepartment
            ? { departments: previewData }
            : { achievements: previewData };

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

  const uploadTypeLabel = isFaculty ? 'Faculty Details' : isStudent ? 'Student Details' : isDepartment ? 'Department Details' : isPlacement ? 'Placements & Internships' : 'Achievements';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto bg-white p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-700" />
            <span>Bulk Upload {uploadTypeLabel} (CSV)</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Upload {uploadTypeLabel} records in bulk via a CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex gap-3 leading-normal">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">CSV Formatting Guidelines:</p>
              <p>Your CSV file columns must map to the headers list below. The required fields are marked with **.</p>
               {isFaculty ? (
                 <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all break-all">
                   EmpId**, Name**, Designation**, Department**, Gender, Date of birth, PanCard No, Date Of Joining, Previous Teaching Experince Years, Previous Teaching Experince Months, Previous Industry Experince Years, Previous Industry Experince Months, Qualification Level, Highest Qualification, Experience in CU - Years, Experience in CU - Months
                 </p>
               ) : isStudent ? (
                  <p className="font-mono bg-white bg-opacity-70 p-1.5 rounded border border-blue-150 mt-1 select-all break-all text-[10px]">
                    Register No**, Student Name**, Class Name, Application No, Gender, Date Of Birth, Mobile No, Nationality, Caste, Current City, Current State, Permanent City, Permanent State, Parent Mobile No, Handicapped, Handicapped Description, Campus, Disability: (YES/NO), Department, Batch
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
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-blue-700 hover:text-blue-900 font-semibold underline mt-2 block"
              >
                Download Sample Template CSV
              </button>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors text-center relative cursor-pointer">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
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
                <p className="font-semibold text-gray-700">Drag & drop your CSV file here, or click to browse</p>
                <p className="text-[10px] text-gray-400 mt-1">Upload files ending with .csv format only</p>
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
                <span>CSV Records Preview ({previewData.length} records detected)</span>
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
