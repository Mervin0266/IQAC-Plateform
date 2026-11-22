import React from 'react';
import { PatentsPage } from './PatentsPage';
import { useAuth } from '../contexts/AuthContext';
import { FlaskConical, BookOpen, Award, DollarSign, FileCheck, Layers, Home, Clock, RefreshCw, Globe2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { usePublicOverview } from '../hooks/usePublicOverview';

interface ResearchInnovationPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
  hideSidebar?: boolean;
}

export function ResearchInnovationPage({ onNavigate, isPublicView = false, hideSidebar = false }: ResearchInnovationPageProps) {
  const { user } = useAuth();
  const { data, loading, isCached, retrievedAt } = usePublicOverview();

  if (isPublicView) {
    const ri = data?.researchInnovation;
    const pubsCount = ri?.totalPublications ?? 1068;
    const citesCount = ri?.totalCitations ?? 10486;
    const grantsCr = ri?.extramuralGrantsCrores ? `₹ ${ri.extramuralGrantsCrores} Cr` : '₹ 2.87 Cr';
    const grantsCount = ri?.sponsoredProjectsCount ?? 51;
    const consultancyLakhs = ri?.consultancyAmountLakhs ? `₹ ${ri.consultancyAmountLakhs} L` : '₹ 148.57 L';
    const consultancyCount = ri?.consultancyProjectsCount ?? 159;
    const patentsTotal = ri?.patentsTotal ?? 253;
    const patentsGranted = ri?.patentsGranted ?? 115;
    const periodicalsCount = ri?.periodicalsCount ?? 47;

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Hero Banner */}
        <div className="bg-[#0B132B] text-white py-10 border-b border-slate-800 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <nav className="flex items-center gap-2 text-xs text-slate-400" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="flex items-center gap-1 font-medium hover:text-[#E8C84A] transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <span>/</span>
              <span className="font-semibold text-white">Research & Innovation</span>
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/10 rounded-xl border border-white/15">
                  <FlaskConical className="w-8 h-8 text-[#E8C84A]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-[#E8C84A] uppercase tracking-wider">CHRIST (Deemed to be University)</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Research, Enterprise & Innovation</h1>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">
                    Indexed scholarly publications, verified citations, government extramural grants, and intellectual property
                  </p>
                </div>
              </div>

              {retrievedAt && (
                <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
                  <Clock className="w-3.5 h-3.5 text-[#E8C84A]" />
                  <span>{isCached ? 'Cached data' : 'Verified institutional record'} ({new Date(retrievedAt).toLocaleDateString()})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Indexed Publications</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{pubsCount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Scopus & Web of Science</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Approved Citations</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">{citesCount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Verified Scopus History</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Extramural Grants</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-1">{grantsCr}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{grantsCount} Funded Projects</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Patents & IPR</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1">{patentsTotal}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{patentsGranted} Granted · {patentsTotal - patentsGranted} Published</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                  <FileCheck className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Consultancy Inflow</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-teal-700 mt-1">{consultancyLakhs}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{consultancyCount} Advisory Assignments</p>
                </div>
                <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
                  <Globe2 className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Periodicals & Columns</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-purple-700 mt-1">{periodicalsCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Scholarly & Policy Articles</p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
                  <Layers className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sponsoring Bodies & Research Ecosystem */}
          <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Extramural Funding Bodies & Sponsoring Agencies</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-2.5">
                {[
                  'Department of Science and Technology (DST)',
                  'Science and Engineering Research Board (SERB)',
                  'All India Council for Technical Education (AICTE)',
                  'Department of Biotechnology (DBT)',
                  'Indian Space Research Organisation (ISRO - RESPOND)',
                  'Defence Research and Development Organisation (DRDO)',
                  'Indian Council of Medical Research (ICMR)',
                  'University Grants Commission (UGC)',
                  'Qualcomm India Research Grants'
                ].map((agency, i) => (
                  <Badge key={i} variant="outline" className="px-3 py-1.5 bg-slate-50 text-slate-800 border-slate-200 text-xs font-medium">
                    {agency}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Authenticated behavior: forward to PatentsPage with user token
  return (
    <PatentsPage
      onNavigate={onNavigate}
      hideSidebar={hideSidebar}
      token={user?.token}
      userRole={user?.role}
    />
  );
}
