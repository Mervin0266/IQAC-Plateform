import { useState, useEffect, useCallback, useMemo } from 'react';

export interface ExchangeRateMeta {
  rate: number;
  effectiveDate: string;
  source: string;
  isManualOverride: boolean;
  formattedNote: string;
}

export interface ResearchKpis {
  indexedPublications: number;
  approvedCitations: number;
  extramuralGrants: {
    projectsCount: number;
    sanctionedInr: string;
    sanctionedUsd: string;
    croresInr: number;
    lakhsInr: number;
  };
  patentsAndIpr: {
    totalIprs: number;
    patentsTotal: number;
    patentsGranted: number;
    patentsPublished: number;
    copyrightsTotal: number;
  };
  consultancyInflow: {
    assignmentsCount: number;
    revenueInr: string;
    revenueUsd: string;
    lakhsInr: number;
  };
  periodicalsAndColumns: number;
}

export interface PublicationAnalytics {
  total: number;
  indexingBreakdown: Array<{ name: string; count: number }>;
  quartiles: Array<{ quartile: string; count: number; percentage: number }>;
  yearlyTrends: Array<{ year: string; total: number; scopus: number; wos: number; other: number }>;
  departmentDistribution: Array<{ department: string; shortName: string; count: number; percentage: number }>;
  departmentQuartiles: Array<{
    name: string;
    shortName: string;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    unclassified: number;
    total: number;
  }>;
  avgPubsPerFaculty: number;
}

export interface CitationAnalytics {
  total: number;
  avgPerPublication: number;
  coverage: {
    citedCount: number;
    uncitedCount: number;
    coveragePercentage: number;
  };
  yearlyTrends: Array<{ year: string; citations: number }>;
  brackets: Array<{ bracket: string; range: string; count: number }>;
  departmentDistribution: Array<{
    department: string;
    shortName: string;
    totalCitations: number;
    avgCitationsPerPub: number;
  }>;
}

export interface SponsoredResearchAnalytics {
  externalProjects: {
    count: number;
    sanctionedInr: string;
    sanctionedUsd: string;
    rawSanctionedInr: number;
    rawSanctionedUsd: number;
    receivedInr: string;
    receivedUsd: string;
  };
  internalProjects: {
    count: number;
    sanctionedInr: string;
    sanctionedUsd: string;
    rawSanctionedInr: number;
    rawSanctionedUsd: number;
  };
  combinedFunding: {
    totalInr: string;
    totalUsd: string;
  };
  yearlyTrends: Array<{
    year: string;
    count: number;
    sanctionedInr: number;
    sanctionedInrLakhs: number;
    sanctionedUsd: number;
    receivedInr: number;
    receivedInrLakhs: number;
    receivedUsd: number;
  }>;
  agencyDistribution: Array<{
    agency: string;
    count: number;
    amountInr: number;
    amountInrLakhs: number;
    amountUsd: number;
    percentage: number;
  }>;
  departmentDistribution: Array<{
    department: string;
    shortName: string;
    projectCount: number;
    amountInr: number;
    amountInrLakhs: number;
    amountUsd: number;
  }>;
}

export interface IprAnalytics {
  patents: {
    total: number;
    granted: number;
    published: number;
    filed: number;
    licensed: number;
  };
  copyrights: {
    total: number;
  };
  patentStatusBreakdown: Array<{ status: string; count: number }>;
  yearlyTrends: Array<{ year: string; granted: number; published: number; total: number }>;
  iprComparison: Array<{ type: string; count: number }>;
  departmentDistribution: Array<{
    name: string;
    shortName: string;
    patents: number;
    copyrights: number;
    total: number;
  }>;
}

export interface ConsultancyAnalytics {
  totalAssignments: number;
  financials: {
    revenueInr: string;
    revenueUsd: string;
    lakhsInr: number;
    rawRevenueInr: number;
    rawRevenueUsd: number;
  };
  yearlyTrends: Array<{
    year: string;
    assignments: number;
    revenueInrLakhs: number;
    revenueUsd: number;
  }>;
  projectTypeDistribution: Array<{
    type: string;
    count: number;
    revenueInrLakhs: number;
    revenueUsd: number;
    percentage: number;
  }>;
  departmentDistribution: Array<{
    department: string;
    shortName: string;
    assignments: number;
    revenueInrLakhs: number;
    revenueUsd: number;
  }>;
}

export interface PublicResearchAnalyticsPayload {
  meta: {
    retrievedAt: string;
    exchangeRate: ExchangeRateMeta;
    filtersApplied: {
      academicYears: string;
      department: string;
      campus: string;
      school: string;
    };
    availableAcademicYears: string[];
    availableDepartments: Array<{ id: string; name: string; shortName: string }>;
  };
  kpis: ResearchKpis;
  publications: PublicationAnalytics;
  citations: CitationAnalytics;
  sponsoredResearch: SponsoredResearchAnalytics;
  intellectualProperty: IprAnalytics;
  consultancy: ConsultancyAnalytics;
}

export interface AnalyticsFilterParams {
  academicYears?: string[];
  department?: string;
  campus?: string;
  school?: string;
}

export function usePublicResearchAnalytics(filters?: AnalyticsFilterParams) {
  const [data, setData] = useState<PublicResearchAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [retrievedAt, setRetrievedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const academicYearParam = useMemo(() => {
    if (!filters?.academicYears || filters.academicYears.length === 0 || filters.academicYears.includes('all')) {
      return 'all';
    }
    return filters.academicYears.join(',');
  }, [filters?.academicYears]);

  const departmentParam = filters?.department || 'all';
  const campusParam = filters?.campus || 'all';
  const schoolParam = filters?.school || 'all';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
      const isProductionHost =
        typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';
      const baseUrl = rawApiUrl || (isProductionHost ? '' : 'http://localhost:5000');

      const params = new URLSearchParams();
      params.set('academicYears', academicYearParam);
      if (departmentParam !== 'all') params.set('department', departmentParam);
      if (campusParam !== 'all') params.set('campus', campusParam);
      if (schoolParam !== 'all') params.set('school', schoolParam);

      const res = await fetch(`${baseUrl}/api/public/research-analytics?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load research analytics (${res.status})`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setIsCached(!!json.isCached);
        setRetrievedAt(json.retrievedAt || json.data?.meta?.retrievedAt || new Date().toISOString());
      } else {
        throw new Error(json.error || 'Failed to parse analytics response');
      }
    } catch (err: any) {
      console.error('Error fetching public research analytics:', err);
      setError(err.message || 'Error fetching analytics');
    } finally {
      setLoading(false);
    }
  }, [academicYearParam, departmentParam, campusParam, schoolParam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    isCached,
    retrievedAt,
    error,
    refetch: fetchData
  };
}
