import { useState, useEffect, useCallback } from 'react';

export interface PublicOverviewData {
  retrievedAt: string;
  isCached?: boolean;
  executive: {
    totalStudents?: number;
    totalFaculty?: number;
    studentFacultyRatio?: string;
    totalPublications?: number;
    totalCitations?: number;
    uniquePlacedStudents?: number;
    placementRate?: string;
    avgSalaryLpa?: string;
    highestSalaryLpa?: string;
    totalGrantsCrores?: string;
    totalGrantsAmountLakhs?: number;
    consultancyAmountLakhs?: number;
    totalIprs?: number;
    patentsCount?: number;
    yearlyOverview?: Array<{
      academicYear: string;
      students: number;
      faculty: number;
      publications: number;
      citations: number;
      placed: number;
      avgLpa: string | null;
      grantsLakhs: number;
    }>;
  };
  academicFaculty: {
    totalFaculty: number;
    phdFacultyCount: number;
    phdPercentage: string;
    seniorFacultyCount: number;
    assistantProfCount: number;
    genderBreakdown: { male: number; female: number };
    cadreBreakdown: Array<{ cadre: string; count: number }>;
  };
  researchInnovation: {
    totalPublications: number;
    totalCitations: number;
    extramuralGrantsCrores: string;
    extramuralGrantsLakhs: number;
    sponsoredProjectsCount: number;
    consultancyAmountLakhs: number;
    consultancyProjectsCount: number;
    patentsTotal: number;
    patentsPublished: number;
    patentsGranted: number;
    periodicalsCount: number;
  };
  placementsInternships: {
    eligibleStudents: number;
    uniquePlaced: number;
    totalOffers: number;
    placementRate: string;
    avgPackageLpa: string;
    highestPackageLpa: string;
    medianPackageLpa: string;
    distinctRecruitersCount: number;
    compensationBands: Array<{ range: string; count: number }>;
    topRecruiters: Array<{ company: string; count: number }>;
    departmentOffers: Array<{ department: string; students: number; offers: number; avgPkg: string }>;
    internships: {
      totalInternships: number;
      summerParticipants: number;
      fastTrackParticipants: number;
      avgStipend: string;
    };
  };
  accreditationRankings: {
    naacGrade: string;
    naacCgpa: string;
    cycle: string;
    nirfOverall: string;
    nirfEngg: string;
    nirfMgmt: string;
    nirfLaw: string;
    criteriaBreakdown: Array<{
      criterion: string;
      weight: number;
      score: number;
      target: number;
      status: string;
    }>;
  };
  achievements: {
    total: number;
    facultyCount: number;
    studentCount: number;
    departmentsCount: number;
    recent: Array<{
      id: string;
      title: string;
      description: string;
      agency: string;
      level: string;
      department: string;
      year: string;
      tags: string[];
    }>;
  };
  infrastructure: {
    campusesCount: number;
    campuses: string[];
    smartClassrooms: number;
    researchLabs: number;
    libraries: number;
    auditoriums: number;
    sportsComplexes: number;
    totalAreaAcres: string;
  };
  centresOfExcellence: Array<{ name: string; focus: string }>;
  incubations: {
    activeCohorts: number;
    startupsIncubated: number;
    studentVentures: number;
    patentsFiledByStartups: number;
    seedFundsDisbursed: string;
  };
  industryConnects: {
    activeCorporateMoUs: number;
    industryRdLabs: number;
    placementPartners: number;
    collaborativeTestingAgreements: number;
  };
  internationalEngagement: {
    globalPartnerUniversities: number;
    activeDualDegrees: number;
    studentExchangeParticipants: number;
    visitingInternationalFaculty: number;
  };
  alumni: {
    activeMentorsCount: number;
    careerGuidanceSessions: number;
    industryTalksDelivered: number;
    distinguishedAlumniAwards: number;
  };
}

const LOCAL_STORAGE_KEY = 'iqac_public_overview_cache_v1';

export function usePublicOverview() {
  const [data, setData] = useState<PublicOverviewData | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore localStorage parse errors
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!data);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [retrievedAt, setRetrievedAt] = useState<string>(() => data?.retrievedAt || new Date().toISOString());
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/public/overview`);

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        const payload: PublicOverviewData = {
          ...json.data,
          retrievedAt: json.retrievedAt || new Date().toISOString(),
          isCached: Boolean(json.isCached)
        };
        setData(payload);
        setIsCached(Boolean(json.isCached));
        setRetrievedAt(payload.retrievedAt);

        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // Ignore localStorage storage quotas
        }
      } else {
        throw new Error(json.message || 'Failed to load public metrics');
      }
    } catch (err: any) {
      console.warn('Public overview fetch failed, utilizing cached fallback if available:', err.message);
      setError(err.message || 'Unable to retrieve real-time institutional metrics');
      setIsCached(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return {
    data,
    loading,
    error,
    isCached,
    retrievedAt,
    refetch: fetchOverview
  };
}
