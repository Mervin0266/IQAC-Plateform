import React, { useState, useMemo, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  TrendingUp,
  Award,
  Globe,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
  Trophy,
  FileText,
  CheckCircle,
  XCircle,
  BarChart3,
  Download,
  Search,
  ExternalLink,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building,
  Target,
  FileSpreadsheet,
  BookOpen
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface RankingPageProps {
  onNavigate: (page: string) => void;
  currentPage?: string;
  isPublicView?: boolean;
}

export function RankingPage({
  onNavigate,
  currentPage = "nirf-ranking",
  isPublicView = false
}: RankingPageProps) {
  // Sync tab with currentPage
  const getTabFromCurrentPage = (page: string) => {
    switch (page) {
      case "nirf-ranking":
        return "nirf";
      case "india-today-ranking":
        return "india-today";
      case "the-world-ranking":
        return "the";
      case "qs-india-ranking":
        return "qs";
      default:
        return "nirf";
    }
  };

  const activeTab = getTabFromCurrentPage(currentPage);

  const handleTabChange = (val: string) => {
    switch (val) {
      case "nirf":
        onNavigate("nirf-ranking");
        break;
      case "india-today":
        onNavigate("india-today-ranking");
        break;
      case "the":
        onNavigate("the-world-ranking");
        break;
      case "qs":
        onNavigate("qs-india-ranking");
        break;
      default:
        onNavigate("nirf-ranking");
        break;
    }
  };

  // State for Document Checklist Filter in India Today tab
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState<"all" | "submitted" | "pending">("all");

  // NIRF Ranking Data
  const nirfRankings = {
    overall: {
      rank: 96,
      previousRank: 100,
      year: 2024,
      category: "Overall (India)",
      score: 48.65,
    },
    engineering: {
      rank: 76,
      previousRank: 123,
      year: 2024,
      category: "Engineering",
      score: 52.40,
    },
    university: {
      rank: 63,
      previousRank: 67,
      year: 2024,
      category: "University Category",
      score: 51.12,
    },
    management: {
      rank: 32,
      previousRank: 35,
      year: 2024,
      category: "Management Studies",
      score: 58.75,
    },
    law: {
      rank: 16,
      previousRank: 19,
      year: 2024,
      category: "Law School",
      score: 62.30,
    }
  };

  const nirfHistoricalData = [
    { year: 2024, overall: 96, engineering: 76, university: 63, management: 32, law: 16 },
    { year: 2023, overall: 100, engineering: 123, university: 67, management: 35, law: 19 },
    { year: 2022, overall: 101, engineering: 145, university: 71, management: 38, law: 22 },
    { year: 2021, overall: 110, engineering: 160, university: 80, management: 42, law: 25 },
    { year: 2020, overall: 125, engineering: 175, university: 88, management: 45, law: 28 },
  ];

  const nirfParameters = [
    {
      name: "Teaching, Learning & Resources (TLR)",
      score: 82.5,
      maxScore: 100,
      weight: "30%",
      submetrics: "Student Strength, Faculty-Student Ratio (FSR), Faculty with Ph.D., Financial Resources and Utilization"
    },
    {
      name: "Research and Professional Practice (RPC)",
      score: 75.8,
      maxScore: 100,
      weight: "30%",
      submetrics: "Publications (Scopus/WoS), Quality of Publications (Citations/h-index), IPR and Patents, Sponsored Research & Consultancy"
    },
    {
      name: "Graduation Outcomes (GO)",
      score: 88.2,
      maxScore: 100,
      weight: "20%",
      submetrics: "Metric for University Examinations, Placement and Higher Studies, Median Salary, PhD Graduates"
    },
    {
      name: "Outreach and Inclusivity (OI)",
      score: 91.5,
      maxScore: 100,
      weight: "10%",
      submetrics: "Percentage of Students from Other States/Countries, Women Diversity, Economically & Socially Challenged Students, Facilities for PwD"
    },
    {
      name: "Perception (PR)",
      score: 78.9,
      maxScore: 100,
      weight: "10%",
      submetrics: "Academic Peer Perception, Employers Perception, Public Brand Reputation"
    },
  ];

  // India Today - MDRA Rankings
  const indiaTodayRankings = [
    {
      year: 2024,
      rank: 4,
      category: "Best Private Universities (General)",
      score: 865.4,
      benchmark: "Top 5 National Band",
    },
    {
      year: 2023,
      rank: 4,
      category: "Best Private Universities (General)",
      score: 845.2,
      benchmark: "Top 5 National Band",
    },
    {
      year: 2022,
      rank: 4,
      category: "Best Private Universities (General)",
      score: 825.8,
      benchmark: "Top 5 National Band",
    },
  ];

  const mdraParameters = [
    { name: "Academic Excellence", score: 92, maxScore: 100, desc: "Curriculum rigor, pedagogic innovation, examination standards" },
    { name: "Infrastructure & Living Experience", score: 88, maxScore: 100, desc: "Campus labs, smart classrooms, hostels, sports, green campus" },
    { name: "Faculty Quality & Research Output", score: 85, maxScore: 100, desc: "Ph.D. qualified faculty, research papers, patents, monographs" },
    { name: "Placements & Industry Interface", score: 90, maxScore: 100, desc: "Median compensation, top recruiters, internships, MoUs" },
    { name: "Governance & Future Orientation", score: 86, maxScore: 100, desc: "Accreditation, international partnerships, alumni engagement" },
  ];

  // India Today - MDRA Supporting Documents Checklist (2026)
  const mdraSupportingDocuments = [
    {
      document: "List of full-time and visiting faculty along with qualification, courses taught and teaching experience",
      incharge: "Departments & HR Office",
      fileName: "g_IndiaToday_2026_D1_Details of Faculties.pdf",
      submitted: true,
      category: "Faculty & Academics"
    },
    {
      document: "List of Guest Speakers in last one academic year with session details and attendee logs",
      incharge: "Academic Departments",
      fileName: "j_IndiaToday_2026_D1_Guest Speakers.pdf",
      submitted: true,
      category: "Industry Interaction"
    },
    {
      document: "List of registered student societies, clubs, chapters and annual activity logs",
      incharge: "Student Affairs Office",
      fileName: "k_IndiaToday_2026_D1_Students Societies_Clubs.pdf",
      submitted: true,
      category: "Student Life"
    },
    {
      document: "List of national & international conferences/seminars/FDPs/workshops attended by permanent faculties",
      incharge: "IQAC & Research Cell",
      fileName: "l_IndiaToday_2026_D1_National_International Conferences_Seminars_Workshops.pdf",
      submitted: true,
      category: "Faculty Development"
    },
    {
      document: "List of research papers published by existing permanent faculty in Scopus/WoS indexed journals (Last 2 Years)",
      incharge: "Centre for Research",
      fileName: "m_IndiaToday_2026_D1_Publications.pdf",
      submitted: true,
      category: "Research"
    },
    {
      document: "Offer Letters of Top 10 placed students in India (Domestic placement with verifiable CTC break-up)",
      incharge: "Placement & Career Guidance Cell",
      fileName: "q_IndiaToday_2026_D1_Domestic Offer Letters.pdf",
      submitted: true,
      category: "Placements"
    },
    {
      document: "Offer Letters of students with overseas/international placements (Verifiable international CTC)",
      incharge: "Placement & International Office",
      fileName: "r_IndiaToday_2026_D1_International Offer Letters.pdf",
      submitted: true,
      category: "Placements"
    },
    {
      document: "Recent published copies of peer-reviewed journals, university magazines & newsletters",
      incharge: "University Publications Office",
      fileName: "s_IndiaToday_2026_D1_Journals.pdf, s_IndiaToday_2026_D2_Magazines.pdf, s_IndiaToday_2026_D3_Newsletters.pdf",
      submitted: true,
      category: "Publications"
    },
    {
      document: "List of institutional voluntary, community outreach and extension service programs (CSA)",
      incharge: "Centre for Social Action (CSA)",
      fileName: "v_IndiaToday_2026_D1_Voluntary or Charity Programs.pdf",
      submitted: true,
      category: "Social Outreach"
    },
    {
      document: "List of corporate companies offering verified student internships in 2024-25",
      incharge: "Academic Departments & Placements",
      fileName: "w_IndiaToday_2026_D1_Internship.pdf",
      submitted: true,
      category: "Placements"
    },
  ];

  // THE World University Rankings
  const theRankings = {
    overall: "801-1000",
    year: 2024,
    impactRank: "301-400",
    asiaRank: "251-300",
    youngUniversityRank: "201-250",
  };

  const theScores = [
    { category: "Teaching (Learning Environment)", score: 35.2, maxScore: 100, weight: "29.5%", desc: "Staff-to-student ratio, doctorate-to-bachelor's ratio, institutional income" },
    { category: "Research Environment", score: 28.5, maxScore: 100, weight: "29%", desc: "Research reputation, research income, research productivity" },
    { category: "Research Quality (Citations & Impact)", score: 45.8, maxScore: 100, weight: "30%", desc: "Field-Weighted Citation Impact (FWCI), research strength, research excellence" },
    { category: "International Outlook", score: 55.7, maxScore: 100, weight: "7.5%", desc: "International students proportion, international co-authorship, international staff" },
    { category: "Industry (Knowledge Transfer)", score: 62.3, maxScore: 100, weight: "4%", desc: "Industry research income per academic staff, patent citations" },
  ];

  const theSdgHighlights = [
    { sdg: "SDG 4: Quality Education", rank: "Top 100 Global Band", score: 76.4 },
    { sdg: "SDG 5: Gender Equality", rank: "101-200 Global Band", score: 68.2 },
    { sdg: "SDG 8: Decent Work & Economic Growth", rank: "101-200 Global Band", score: 71.5 },
    { sdg: "SDG 9: Industry, Innovation & Infrastructure", rank: "201-300 Global Band", score: 62.8 },
    { sdg: "SDG 17: Partnerships for the Goals", rank: "201-300 Global Band", score: 65.0 },
  ];

  // QS World University Rankings
  const qsRankings = {
    overall: "801-850",
    year: 2024,
    asiaRank: 228,
    indiaRank: 18,
    sustainabilityRank: "650-700",
  };

  const qsScores = [
    {
      indicator: "Academic Reputation",
      score: 38.5,
      maxScore: 100,
      weight: "30%",
      desc: "Global academic survey responses evaluating university teaching and research"
    },
    {
      indicator: "Employer Reputation",
      score: 55.2,
      maxScore: 100,
      weight: "15%",
      desc: "Feedback from global employers on graduate competency and work-readiness"
    },
    {
      indicator: "Faculty Student Ratio",
      score: 72.8,
      maxScore: 100,
      weight: "10%",
      desc: "Measure of classroom engagement and personalized mentorship capacity"
    },
    {
      indicator: "Citations per Faculty",
      score: 32.1,
      maxScore: 100,
      weight: "20%",
      desc: "Total normalized Scopus citations divided by full-time academic staff"
    },
    {
      indicator: "International Faculty Ratio",
      score: 68.9,
      maxScore: 100,
      weight: "5%",
      desc: "Proportion of foreign faculty members contributing to global diversity"
    },
    {
      indicator: "International Students Ratio",
      score: 45.3,
      maxScore: 100,
      weight: "5%",
      desc: "International student diversity across undergraduate and postgraduate programs"
    },
    {
      indicator: "Employment Outcomes",
      score: 64.0,
      maxScore: 100,
      weight: "5%",
      desc: "Graduate employment rate and alumni impact index"
    },
    {
      indicator: "Sustainability",
      score: 58.6,
      maxScore: 100,
      weight: "5%",
      desc: "Social and environmental impact metrics aligned with sustainable development"
    },
  ];

  const getRankTrend = (current: number, previous: number) => {
    if (current < previous)
      return {
        icon: ArrowUp,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        label: `Improved from #${previous}`
      };
    if (current > previous)
      return {
        icon: ArrowDown,
        color: "text-red-600",
        bg: "bg-red-50",
        label: `Moved from #${previous}`
      };
    return {
      icon: Minus,
      color: "text-gray-600",
      bg: "bg-gray-50",
      label: `Maintained at #${previous}`
    };
  };

  // Filtered Supporting Documents for India Today
  const filteredDocuments = useMemo(() => {
    return mdraSupportingDocuments.filter(doc => {
      if (docStatusFilter === "submitted" && !doc.submitted) return false;
      if (docStatusFilter === "pending" && doc.submitted) return false;
      if (docSearchQuery.trim()) {
        const q = docSearchQuery.toLowerCase();
        const docMatch = doc.document.toLowerCase().includes(q);
        const inchargeMatch = doc.incharge.toLowerCase().includes(q);
        const fileMatch = doc.fileName.toLowerCase().includes(q);
        const catMatch = doc.category.toLowerCase().includes(q);
        if (!docMatch && !inchargeMatch && !fileMatch && !catMatch) return false;
      }
      return true;
    });
  }, [docSearchQuery, docStatusFilter]);

  const submittedDocsCount = mdraSupportingDocuments.filter(d => d.submitted).length;
  const docCompletionPercentage = Math.round((submittedDocsCount / mdraSupportingDocuments.length) * 100);

  // Summary Rankings for Public View
  const summaryRankings = [
    {
      id: 'nirf-overall',
      title: 'NIRF Overall Ranking — #96',
      body: 'National Institutional Ranking Framework, Ministry of Education, Govt. of India',
      category: 'Overall (India)',
      framework: 'NIRF',
      year: 2024,
      previousRank: 100,
    },
    {
      id: 'nirf-engineering',
      title: 'NIRF Engineering Ranking — #76',
      body: 'National Institutional Ranking Framework',
      category: 'Engineering',
      framework: 'NIRF',
      year: 2024,
      previousRank: 123,
    },
    {
      id: 'india-today',
      title: 'India Today Best Private Universities — #4',
      body: 'India Today - MDRA National Survey',
      category: 'Best Private Universities',
      framework: 'India Today',
      year: 2024,
      previousRank: 4,
    },
    {
      id: 'the-world',
      title: 'THE World University Rankings — 801-1000 Band',
      body: 'Times Higher Education World University Rankings',
      category: 'Global & Asia Band (#251-300)',
      framework: 'THE',
      year: 2024,
      previousRank: null,
    },
    {
      id: 'qs-india',
      title: 'QS India Ranking — #18',
      body: 'Quacquarelli Symonds Asia & World Rankings (#228 Asia)',
      category: 'India Rankings',
      framework: 'QS',
      year: 2024,
      previousRank: 20,
    },
  ];

  // ─── PUBLIC VIEW ────────────────────────────────────────────────────────────
  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2f4692] text-white py-14 shadow-md">
          <div className="max-w-[1280px] mx-auto px-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <Trophy className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Institutional Rankings & Accreditations</h1>
                <p className="text-blue-100 text-sm mt-1">
                  National and international benchmarks of academic rigor, research excellence, and institutional reputation
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-8 py-10">
          <div className="space-y-5">
            {summaryRankings.map((ranking) => {
              const improved = ranking.previousRank && ranking.previousRank > parseInt(ranking.title.match(/#(\d+)/)?.[1] || '0');
              return (
                <Card
                  key={ranking.id}
                  className="bg-white shadow-sm hover:shadow-md transition-all border border-gray-200 border-l-4 border-l-[#2f4692] rounded-xl"
                >
                  <CardHeader className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-blue-50 text-[#2f4692] rounded-xl flex-shrink-0">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-bold text-gray-900">{ranking.title}</CardTitle>
                          <Badge className="bg-[#2f4692] text-white text-xs">{ranking.framework}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 mb-3">
                          {ranking.body} — <strong>{ranking.category}</strong>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-slate-50 text-xs">{ranking.category}</Badge>
                          <Badge variant="outline" className="bg-slate-50 text-xs">Year {ranking.year}</Badge>
                          {ranking.previousRank && (
                            <Badge variant="outline" className={improved ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs" : "bg-blue-50 text-blue-700 border-blue-200 text-xs"}>
                              {improved ? `Improved from #${ranking.previousRank}` : `Previous: #${ranking.previousRank}`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── INTERNAL WORKSPACE VIEW ────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      <main className="ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Page Banner */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-md">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">University Rankings & Benchmarks</h1>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      National & Global
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Track Christ University's performance across NIRF, India Today MDRA, Times Higher Education (THE), and QS World Rankings
                  </p>
                </div>
              </div>
            </div>

            {/* Framework Sub-Section Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="bg-slate-100 p-1.5 rounded-xl w-full flex flex-wrap justify-start gap-1 border border-slate-200 shadow-inner h-auto">
                <TabsTrigger
                  value="nirf"
                  className="py-2.5 px-4 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm"
                >
                  <Trophy className="w-4 h-4 text-orange-600" />
                  <span>NIRF Ranking</span>
                </TabsTrigger>

                <TabsTrigger
                  value="india-today"
                  className="py-2.5 px-4 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>India Today - MDRA</span>
                </TabsTrigger>

                <TabsTrigger
                  value="the"
                  className="py-2.5 px-4 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
                >
                  <Globe className="w-4 h-4 text-purple-600" />
                  <span>THE World Ranking</span>
                </TabsTrigger>

                <TabsTrigger
                  value="qs"
                  className="py-2.5 px-4 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                >
                  <Star className="w-4 h-4 text-emerald-600" />
                  <span>QS India & World</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Institutional Highlights Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              onClick={() => handleTabChange('nirf')}
              className={`border transition-all cursor-pointer hover:shadow-md rounded-xl ${
                activeTab === 'nirf' ? 'border-orange-300 ring-2 ring-orange-200 bg-gradient-to-br from-orange-50/80 to-white' : 'border-gray-200 bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">NIRF Overall 2024</span>
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-orange-600">#{nirfRankings.overall.rank}</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    <ArrowUp className="w-3 h-3 mr-0.5" />
                    +4 Ranks
                  </Badge>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Engineering: #{nirfRankings.engineering.rank} (Up +47 ranks)</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => handleTabChange('india-today')}
              className={`border transition-all cursor-pointer hover:shadow-md rounded-xl ${
                activeTab === 'india-today' ? 'border-blue-300 ring-2 ring-blue-200 bg-gradient-to-br from-blue-50/80 to-white' : 'border-gray-200 bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">India Today MDRA</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-blue-600">#{indiaTodayRankings[0].rank}</span>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                    Score: 865.4
                  </Badge>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Best Private Universities in India</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => handleTabChange('the')}
              className={`border transition-all cursor-pointer hover:shadow-md rounded-xl ${
                activeTab === 'the' ? 'border-purple-300 ring-2 ring-purple-200 bg-gradient-to-br from-purple-50/80 to-white' : 'border-gray-200 bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">THE World Ranking</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-purple-600">{theRankings.overall}</span>
                  <span className="text-[10px] text-purple-700 font-medium">Band</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Asia: #{theRankings.asiaRank} | Impact: #{theRankings.impactRank}</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => handleTabChange('qs')}
              className={`border transition-all cursor-pointer hover:shadow-md rounded-xl ${
                activeTab === 'qs' ? 'border-emerald-300 ring-2 ring-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white' : 'border-gray-200 bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">QS Rankings</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Star className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600">#{qsRankings.indiaRank}</span>
                  <span className="text-[10px] text-emerald-700 font-medium">in India</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">QS Asia Rank: #{qsRankings.asiaRank}</p>
              </CardContent>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SUB-SECTION 1: NIRF RANKING                                        */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "nirf" && (
            <div className="space-y-6">
              {/* Category Standings */}
              <Card className="border border-gray-200 shadow-sm rounded-xl bg-white overflow-hidden">
                <CardHeader className="bg-orange-50/60 border-b border-orange-100 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-orange-600" />
                        <span>NIRF 2024 Category Performance</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 mt-0.5">
                        National Institutional Ranking Framework — Ministry of Education, Government of India
                      </CardDescription>
                    </div>
                    <Badge className="bg-orange-600 text-white font-mono text-xs">AY 2024</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Object.values(nirfRankings).map((item, idx) => {
                      const trend = getRankTrend(item.rank, item.previousRank);
                      const TrendIcon = trend.icon;
                      return (
                        <div key={idx} className="p-4 rounded-xl bg-gradient-to-br from-orange-50/50 to-white border border-orange-100 shadow-sm">
                          <p className="text-xs font-semibold text-gray-600 truncate">{item.category}</p>
                          <div className="mt-2 mb-2 flex items-baseline justify-between">
                            <span className="text-3xl font-extrabold text-orange-600">#{item.rank}</span>
                            <span className="text-xs font-mono font-bold text-gray-700">{item.score} / 100</span>
                          </div>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${trend.bg} ${trend.color}`}>
                            <TrendIcon className="w-3 h-3" />
                            <span>{trend.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Parameter Breakdown */}
              <Card className="border border-gray-200 shadow-sm rounded-xl bg-white">
                <CardHeader className="p-5 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                    <span>NIRF Parameter Score Breakdown</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Institutional evaluation across 5 core parameters and 18 sub-metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  {nirfParameters.map((param, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <p className="text-xs font-bold text-gray-800 flex items-center gap-2">
                            <span>{param.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono text-orange-700 bg-orange-50 border-orange-200">
                              Weight: {param.weight}
                            </Badge>
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{param.submetrics}</p>
                        </div>
                        <div className="text-right flex-shrink-0 font-mono">
                          <span className="text-sm font-extrabold text-orange-600">{param.score}</span>
                          <span className="text-xs text-gray-400"> / {param.maxScore}</span>
                          <span className="text-xs font-bold text-gray-700 ml-2">({((param.score / param.maxScore) * 100).toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-amber-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${(param.score / param.maxScore) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Historical Trend Table */}
              <Card className="border border-gray-200 shadow-sm rounded-xl bg-white overflow-hidden">
                <CardHeader className="p-5 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span>5-Year NIRF Historical Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-gray-200 font-semibold text-gray-700">
                      <tr>
                        <th className="py-3 px-4">Academic Year</th>
                        <th className="py-3 px-4 text-center">Overall Rank</th>
                        <th className="py-3 px-4 text-center">Engineering</th>
                        <th className="py-3 px-4 text-center">University Category</th>
                        <th className="py-3 px-4 text-center">Management</th>
                        <th className="py-3 px-4 text-center">Law</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {nirfHistoricalData.map((row) => (
                        <tr key={row.year} className="hover:bg-orange-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900">{row.year}</td>
                          <td className="py-3 px-4 text-center font-extrabold text-orange-600">#{row.overall}</td>
                          <td className="py-3 px-4 text-center font-bold text-blue-600">#{row.engineering}</td>
                          <td className="py-3 px-4 text-center font-bold text-purple-600">#{row.university}</td>
                          <td className="py-3 px-4 text-center font-bold text-teal-600">#{row.management}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600">#{row.law}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SUB-SECTION 2: INDIA TODAY - MDRA SURVEY                           */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "india-today" && (
            <div className="space-y-6">
              {/* Overview & Parameters */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Historical Ranks */}
                <Card className="border border-gray-200 shadow-sm rounded-xl bg-white lg:col-span-1">
                  <CardHeader className="p-5 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-blue-600" />
                      <span>Historical Survey Standing</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      India Today - MDRA Best Private Universities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {indiaTodayRankings.map((r) => (
                      <div key={r.year} className="p-3.5 bg-gradient-to-r from-blue-50/70 to-white rounded-xl border border-blue-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-900">Year {r.year}</p>
                          <p className="text-[10px] text-gray-500">{r.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-blue-600">#{r.rank}</p>
                          <p className="text-[10px] font-mono text-gray-500">Score: {r.score}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Parameters */}
                <Card className="border border-gray-200 shadow-sm rounded-xl bg-white lg:col-span-2">
                  <CardHeader className="p-5 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span>MDRA Assessment Pillars</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      5 Key dimensions evaluated during institutional survey
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {mdraParameters.map((param, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-gray-800">{param.name}</span>
                            <span className="text-[10px] text-gray-500 ml-2">({param.desc})</span>
                          </div>
                          <span className="font-mono font-bold text-blue-600">{param.score} / {param.maxScore}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                            style={{ width: `${(param.score / param.maxScore) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Supporting Documents Checklist Matrix */}
              <Card className="border border-gray-200 shadow-sm rounded-xl bg-white overflow-hidden">
                <CardHeader className="p-5 border-b border-gray-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <span>Supporting Documents Checklist (2026 Submission)</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500">
                        Verification of uploaded files and department in-charge mappings
                      </CardDescription>
                    </div>

                    {/* Completion Meter */}
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-900">
                        {submittedDocsCount}/{mdraSupportingDocuments.length} Verified ({docCompletionPercentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        placeholder="Search checklist documents, file names, or incharge..."
                        className="pl-8 h-8 text-xs border-gray-200"
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={docStatusFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDocStatusFilter("all")}
                        className="text-xs h-8 px-2.5"
                      >
                        All ({mdraSupportingDocuments.length})
                      </Button>
                      <Button
                        variant={docStatusFilter === "submitted" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDocStatusFilter("submitted")}
                        className="text-xs h-8 px-2.5 text-emerald-700"
                      >
                        Submitted ({submittedDocsCount})
                      </Button>
                      <Button
                        variant={docStatusFilter === "pending" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDocStatusFilter("pending")}
                        className="text-xs h-8 px-2.5 text-red-600"
                      >
                        Pending ({mdraSupportingDocuments.length - submittedDocsCount})
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-gray-200 font-semibold text-gray-700">
                      <tr>
                        <th className="py-3 px-3.5 w-10 text-center">#</th>
                        <th className="py-3 px-3.5 min-w-[260px]">Supporting Document Requirement</th>
                        <th className="py-3 px-3.5 min-w-[140px]">Department Incharge</th>
                        <th className="py-3 px-3.5 min-w-[180px]">File Reference</th>
                        <th className="py-3 px-3.5 whitespace-nowrap text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDocuments.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3.5 text-center font-mono text-gray-400">{idx + 1}</td>
                          <td className="py-3 px-3.5">
                            <p className="font-semibold text-gray-900">{doc.document}</p>
                            <span className="inline-block mt-0.5 text-[10px] text-gray-500 font-medium">Category: {doc.category}</span>
                          </td>
                          <td className="py-3 px-3.5 text-gray-700 font-medium">{doc.incharge}</td>
                          <td className="py-3 px-3.5 font-mono text-[10px] text-gray-500 truncate max-w-[220px]" title={doc.fileName}>
                            {doc.fileName}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {doc.submitted ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Submitted
                              </Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Pending
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SUB-SECTION 3: TIMES HIGHER EDUCATION (THE) WORLD UNIVERSITY RANKING */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "the" && (
            <div className="space-y-6">
              {/* Standings Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-purple-100 bg-gradient-to-br from-purple-50/80 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">World University Rank</p>
                    <p className="text-3xl font-extrabold text-purple-600 mt-2">{theRankings.overall}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Times Higher Education 2024</p>
                  </CardContent>
                </Card>

                <Card className="border border-purple-100 bg-gradient-to-br from-purple-50/80 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Asia University Rank</p>
                    <p className="text-3xl font-extrabold text-purple-600 mt-2">{theRankings.asiaRank}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Among Asian institutions</p>
                  </CardContent>
                </Card>

                <Card className="border border-purple-100 bg-gradient-to-br from-purple-50/80 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Young University Rank</p>
                    <p className="text-3xl font-extrabold text-purple-600 mt-2">{theRankings.youngUniversityRank}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Institutions under 50 years</p>
                  </CardContent>
                </Card>

                <Card className="border border-purple-100 bg-gradient-to-br from-purple-50/80 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">SDG Impact Rank</p>
                    <p className="text-3xl font-extrabold text-purple-600 mt-2">{theRankings.impactRank}</p>
                    <p className="text-[10px] text-gray-500 mt-1">UN SDG Global Impact</p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Pillars */}
              <Card className="border border-gray-200 shadow-sm rounded-xl bg-white">
                <CardHeader className="p-5 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span>THE 5 Core Performance Pillars</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive weighting methodology evaluating teaching, research, citations, and global engagement
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {theScores.map((score, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <div>
                          <span className="font-bold text-gray-800">{score.category}</span>
                          <Badge variant="outline" className="text-[10px] font-mono text-purple-700 bg-purple-50 border-purple-200 ml-2">
                            Weight: {score.weight}
                          </Badge>
                          <p className="text-[10px] text-gray-500">{score.desc}</p>
                        </div>
                        <div className="text-right font-mono flex-shrink-0">
                          <span className="text-sm font-extrabold text-purple-600">{score.score}</span>
                          <span className="text-xs text-gray-400"> / {score.maxScore}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2.5 rounded-full"
                          style={{ width: `${(score.score / score.maxScore) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* UN SDG Impact Highlights */}
              <Card className="border border-gray-200 shadow-sm rounded-xl bg-white overflow-hidden">
                <CardHeader className="p-5 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span>UN Sustainable Development Goals (SDG) Impact Highlights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-gray-200 font-semibold text-gray-700">
                      <tr>
                        <th className="py-3 px-4">Sustainable Development Goal</th>
                        <th className="py-3 px-4 text-center">Global Band</th>
                        <th className="py-3 px-4 text-right">Impact Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {theSdgHighlights.map((h, idx) => (
                        <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900">{h.sdg}</td>
                          <td className="py-3 px-4 text-center font-bold text-purple-700">{h.rank}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-gray-800">{h.score} / 100</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SUB-SECTION 4: QS WORLD & INDIA RANKINGS                            */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "qs" && (
            <div className="space-y-6">
              {/* Standings Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">QS India Ranking</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-2">#{qsRankings.indiaRank}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Among Top Indian Universities</p>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">QS Asia Ranking</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-2">#{qsRankings.asiaRank}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Asian Higher Education Band</p>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">QS World Ranking</p>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-2">{qsRankings.overall}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Global University Band</p>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">QS Sustainability</p>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-2">{qsRankings.sustainabilityRank}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Environmental & Social Impact</p>
                  </CardContent>
                </Card>
              </div>

              {/* QS Indicators */}
              <Card className="border border-gray-200 shadow-sm rounded-xl bg-white">
                <CardHeader className="p-5 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-600" />
                    <span>QS Ranking Indicator Metrics</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive indicator methodology evaluating academic reputation, citations, and employability
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {qsScores.map((score, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <div>
                          <span className="font-bold text-gray-800">{score.indicator}</span>
                          <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border-emerald-200 ml-2">
                            Weight: {score.weight}
                          </Badge>
                          <p className="text-[10px] text-gray-500">{score.desc}</p>
                        </div>
                        <div className="text-right font-mono flex-shrink-0">
                          <span className="text-sm font-extrabold text-emerald-600">{score.score}</span>
                          <span className="text-xs text-gray-400"> / {score.maxScore}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2.5 rounded-full"
                          style={{ width: `${(score.score / score.maxScore) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}