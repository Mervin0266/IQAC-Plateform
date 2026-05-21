import React from "react";
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
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Badge } from "./ui/badge";

interface RankingPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function RankingPage({ onNavigate, isPublicView = false }: RankingPageProps) {
  // NIRF Ranking Data
  const nirfRankings = {
    overall: {
      rank: 96,
      previousRank: 100,
      year: 2024,
      category: "Overall",
    },
    engineering: {
      rank: 76,
      previousRank: 123,
      year: 2024,
      category: "Engineering",
    },
    university: {
      rank: 63,
      previousRank: 67,
      year: 2024,
      category: "University",
    },
    management: {
      rank: 32,
      previousRank: 35,
      year: 2024,
      category: "Management",
    },
  };

  const nirfParameters = [
    {
      name: "Teaching, Learning & Resources",
      score: 82.5,
      maxScore: 100,
      weight: "30%",
    },
    {
      name: "Research and Professional Practice",
      score: 75.8,
      maxScore: 100,
      weight: "30%",
    },
    {
      name: "Graduation Outcomes",
      score: 88.2,
      maxScore: 100,
      weight: "20%",
    },
    {
      name: "Outreach and Inclusivity",
      score: 91.5,
      maxScore: 100,
      weight: "10%",
    },
    {
      name: "Perception",
      score: 78.9,
      maxScore: 100,
      weight: "10%",
    },
  ];

  // India Today - MDRA Rankings
  const indiaTodayRankings = [
    {
      year: 2024,
      rank: 4,
      category: "Best Private Universities",
      score: 865.4,
    },
    {
      year: 2023,
      rank: 4,
      category: "Best Private Universities",
      score: 845.2,
    },
    {
      year: 2022,
      rank: 4,
      category: "Best Private Universities",
      score: 825.8,
    },
  ];

  const mdraParameters = [
    { name: "Academic Excellence", score: 92, maxScore: 100 },
    { name: "Infrastructure", score: 88, maxScore: 100 },
    { name: "Faculty Quality", score: 85, maxScore: 100 },
    { name: "Placements", score: 90, maxScore: 100 },
    { name: "Research Output", score: 78, maxScore: 100 },
  ];

  // India Today - MDRA Supporting Documents (2026)
  const mdraSupportingDocuments = [
    {
      document:
        "List of full-time and visiting faculty along with qualification, courses taught and teaching experience",
      incharge: "Departments",
      fileName: "g_IndiaToday_2026_D1_Details of Faculties.pdf",
      submitted: true,
    },
    {
      document: "List of Guest Speakers in last one year",
      incharge: "Departments",
      fileName: "j_IndiaToday_2026_D1_Guest Speakers.pdf",
      submitted: true,
    },
    {
      document: "List of students' societies/ clubs",
      incharge: "Departments",
      fileName:
        "k_IndiaToday_2026_D1_Students Societies_Clubs.pdf",
      submitted: true,
    },
    {
      document:
        "List of national & international conferences/ seminar/ FDPs/ workshops attended by permanent faculties",
      incharge: "Departments",
      fileName:
        "l_IndiaToday_2026_D1_National_International Conferences_Seminars_Workshops.pdf",
      submitted: true,
    },
    {
      document:
        "List of research papers published by existing permanent faculty in Indian and foreign journals in the last two years",
      incharge: "Departments",
      fileName: "m_IndiaToday_2026_D1_Publications.pdf",
      submitted: true,
    },
    {
      document:
        "Offer Letters of Top 10 students (passed out in 2025) placed in India (Domestic placement) – Please ensure Total CTC break-up to be there in the offer letters",
      incharge: "Departments",
      fileName:
        "q_IndiaToday_2026_D1_Domestic Offer Letters.pdf",
      submitted: true,
    },
    {
      document:
        "Offer Letters of students (passed out in 2025) got international placements – Please ensure Total CTC break-up to be there in the offer letters",
      incharge: "Departments",
      fileName:
        "r_IndiaToday_2026_D1_International Offer Letters.pdf",
      submitted: false,
    },
    {
      document:
        "Recent copy journal/ magazine/ e-magazine & Newsletter",
      incharge: "Departments",
      fileName:
        "s_IndiaToday_2026_D1_Journals.pdf, s_IndiaToday_2026_D2_Magazines.pdf, s_IndiaToday_2026_D3_Newsletters.pdf",
      submitted: true,
    },
    {
      document:
        "List of voluntary or charity programs your institute is associated with",
      incharge: "Departments",
      fileName:
        "v_IndiaToday_2026_D1_Voluntary or Charity Programs.pdf",
      submitted: false,
    },
    {
      document:
        "List of companies offered internship in 2024-25",
      incharge: "Departments",
      fileName: "w_IndiaToday_2026_D1_Internship.pdf",
      submitted: true,
    },
  ];

  // THE World University Rankings
  const theRankings = {
    overall: "801-1000",
    year: 2024,
    impactRank: 301 - 400,
    asiaRank: "251-300",
  };

  const theScores = [
    { category: "Teaching", score: 35.2, maxScore: 100 },
    { category: "Research", score: 28.5, maxScore: 100 },
    { category: "Citations", score: 45.8, maxScore: 100 },
    { category: "Industry Income", score: 62.3, maxScore: 100 },
    {
      category: "International Outlook",
      score: 55.7,
      maxScore: 100,
    },
  ];

  // QS World University Rankings
  const qsRankings = {
    overall: "801-850",
    year: 2024,
    asiaRank: 228,
    indiaRank: 18,
  };

  const qsScores = [
    {
      indicator: "Academic Reputation",
      score: 38.5,
      maxScore: 100,
    },
    {
      indicator: "Employer Reputation",
      score: 55.2,
      maxScore: 100,
    },
    {
      indicator: "Faculty Student Ratio",
      score: 72.8,
      maxScore: 100,
    },
    {
      indicator: "Citations per Faculty",
      score: 32.1,
      maxScore: 100,
    },
    {
      indicator: "International Faculty Ratio",
      score: 68.9,
      maxScore: 100,
    },
    {
      indicator: "International Students Ratio",
      score: 45.3,
      maxScore: 100,
    },
  ];

  const getRankTrend = (current: number, previous: number) => {
    if (current < previous)
      return {
        icon: ArrowUp,
        color: "text-green-600",
        bg: "bg-green-50",
      };
    if (current > previous)
      return {
        icon: ArrowDown,
        color: "text-red-600",
        bg: "bg-red-50",
      };
    return {
      icon: Minus,
      color: "text-gray-600",
      bg: "bg-gray-50",
    };
  };

  // Create summary rankings for public view
  const summaryRankings = [
    {
      id: 'nirf-overall',
      title: 'NIRF Overall Ranking — #96',
      body: 'National Institutional Ranking Framework',
      category: 'Overall',
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
      body: 'India Today - MDRA Survey',
      category: 'Private Universities',
      framework: 'India Today',
      year: 2024,
      previousRank: 4,
    },
    {
      id: 'the-world',
      title: 'THE World University Rankings — 801-1000',
      body: 'Times Higher Education',
      category: 'Global',
      framework: 'THE',
      year: 2024,
      previousRank: null,
    },
    {
      id: 'qs-india',
      title: 'QS India Ranking — #18',
      body: 'Quacquarelli Symonds Rankings',
      category: 'India',
      framework: 'QS',
      year: 2024,
      previousRank: 20,
    },
  ];

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-[#166534] text-white py-16">
          <div className="max-w-[1280px] mx-auto px-8">
            <div className="flex items-center gap-4 mb-4">
              <Trophy className="w-12 h-12" />
              <h1 className="text-4xl font-bold">Rankings & Accreditation</h1>
            </div>
            <p className="text-lg text-white/90">
              National and international recognition of academic quality.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-[1280px] mx-auto px-8 py-12">
          {/* Summary Cards */}
          <div className="space-y-6">
            {summaryRankings.map((ranking) => {
              const improved = ranking.previousRank && ranking.previousRank > parseInt(ranking.title.match(/#(\d+)/)?.[1] || '0');
              return (
                <Card
                  key={ranking.id}
                  className="bg-white shadow hover:shadow-lg transition-all hover:-translate-y-1 border-l-4 border-l-[#166534]"
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Trophy className="w-6 h-6 text-[#166534] flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{ranking.title}</CardTitle>
                        <p className="text-sm text-gray-600 mb-3">
                          {ranking.body} — {ranking.category}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline" className="bg-[#166534] text-white border-[#166534]">
                            {ranking.framework}
                          </Badge>
                          <Badge variant="outline">{ranking.category}</Badge>
                          <Badge variant="outline">{ranking.year}</Badge>
                        </div>
                        {ranking.previousRank && (
                          <p className="text-sm text-gray-500">
                            {improved
                              ? `Improved from #${ranking.previousRank} in ${ranking.year - 1}`
                              : ranking.previousRank === parseInt(ranking.title.match(/#(\d+)/)?.[1] || '0')
                              ? `Maintained #${ranking.previousRank} from ${ranking.year - 1}`
                              : `Previous rank: #${ranking.previousRank} in ${ranking.year - 1}`
                            }
                          </p>
                        )}
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {!isPublicView && <Sidebar currentPage="ranking" onNavigate={onNavigate} />}

      <div className={isPublicView ? 'flex-1' : 'flex-1 ml-64'}>
        <main className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              University Rankings
            </h1>
            <p className="text-gray-600 mt-2">
              Track Christ University's performance across
              various national and international ranking systems
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">
                  NIRF Overall Rank
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-orange-600">
                  #{nirfRankings.overall.rank}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    <ArrowUp className="w-3 h-3 mr-1" />
                    Improved from #
                    {nirfRankings.overall.previousRank}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">
                  India Today MDRA
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-blue-600">
                  #{indiaTodayRankings[0].rank}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Best Private Universities
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">
                  THE World Ranking
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-purple-600">
                  {theRankings.overall}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Global Band
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">
                  QS India Rank
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-green-600">
                  #{qsRankings.indiaRank}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Among Indian Universities
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Rankings Tabs */}
          <Tabs defaultValue="nirf" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger
                value="nirf"
                className="flex items-center gap-2 py-3"
              >
                <Trophy className="w-4 h-4" />
                <span>NIRF</span>
              </TabsTrigger>
              <TabsTrigger
                value="india-today"
                className="flex items-center gap-2 py-3"
              >
                <Award className="w-4 h-4" />
                <span>India Today - MDRA</span>
              </TabsTrigger>
              <TabsTrigger
                value="the"
                className="flex items-center gap-2 py-3"
              >
                <Globe className="w-4 h-4" />
                <span>THE Rankings</span>
              </TabsTrigger>
              <TabsTrigger
                value="qs"
                className="flex items-center gap-2 py-3"
              >
                <Star className="w-4 h-4" />
                <span>QS Rankings</span>
              </TabsTrigger>
            </TabsList>

            {/* NIRF Tab */}
            <TabsContent value="nirf" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-orange-600" />
                    NIRF Rankings 2024
                  </CardTitle>
                  <CardDescription>
                    National Institutional Ranking Framework -
                    Ministry of Education, Govt. of India
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Category Rankings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.values(nirfRankings).map(
                      (ranking, idx) => {
                        const trend = getRankTrend(
                          ranking.rank,
                          ranking.previousRank,
                        );
                        const TrendIcon = trend.icon;
                        return (
                          <div
                            key={idx}
                            className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-lg border border-orange-100"
                          >
                            <p className="text-sm text-gray-600 mb-1">
                              {ranking.category}
                            </p>
                            <p className="text-3xl font-bold text-orange-600 mb-2">
                              #{ranking.rank}
                            </p>
                            <div
                              className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${trend.bg} ${trend.color}`}
                            >
                              <TrendIcon className="w-3 h-3" />
                              <span>
                                From #{ranking.previousRank}
                              </span>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>

                  {/* Parameters Breakdown */}
                  <div>
                    <h4 className="font-semibold mb-4">
                      Performance Parameters
                    </h4>
                    <div className="space-y-4">
                      {nirfParameters.map((param, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {param.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Weight: {param.weight}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-orange-600">
                                {param.score}/{param.maxScore}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(
                                  (param.score /
                                    param.maxScore) *
                                  100
                                ).toFixed(1)}
                                %
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${(param.score / param.maxScore) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* India Today - MDRA Tab */}
            <TabsContent
              value="india-today"
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    India Today - MDRA Best Colleges Ranking
                  </CardTitle>
                  <CardDescription>
                    India Today Magazine - MDRA (Marketing &
                    Development Research Associates)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Year-wise Rankings */}
                  <div>
                    <h4 className="font-semibold mb-4">
                      Historical Performance
                    </h4>
                    <div className="space-y-3">
                      {indiaTodayRankings.map(
                        (ranking, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100"
                          >
                            <div>
                              <p className="font-semibold text-lg">
                                Year {ranking.year}
                              </p>
                              <p className="text-sm text-gray-600">
                                {ranking.category}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-bold text-blue-600">
                                #{ranking.rank}
                              </p>
                              <p className="text-sm text-gray-500">
                                Score: {ranking.score}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Assessment Parameters */}
                  <div>
                    <h4 className="font-semibold mb-4">
                      Assessment Parameters
                    </h4>
                    <div className="space-y-4">
                      {mdraParameters.map((param, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {param.name}
                            </p>
                            <p className="text-sm font-bold text-blue-600">
                              {param.score}/{param.maxScore}
                            </p>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(param.score / param.maxScore) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Supporting Documents */}
                  <div>
                    <h4 className="font-semibold mb-4">
                      Supporting Documents Checklist (2026)
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-blue-50">
                            <tr>
                              <th className="text-left p-3 text-sm font-semibold text-gray-700">
                                Supporting Document
                              </th>
                              <th className="text-left p-3 text-sm font-semibold text-gray-700">
                                Incharge
                              </th>
                              <th className="text-left p-3 text-sm font-semibold text-gray-700">
                                File Name
                              </th>
                              <th className="text-center p-3 text-sm font-semibold text-gray-700">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {mdraSupportingDocuments.map(
                              (doc, idx) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  <td className="p-3 text-sm text-gray-700">
                                    {doc.document}
                                  </td>
                                  <td className="p-3 text-sm text-gray-600">
                                    {doc.incharge}
                                  </td>
                                  <td className="p-3 text-xs text-gray-500 font-mono">
                                    {doc.fileName}
                                  </td>
                                  <td className="p-3 text-center">
                                    {doc.submitted ? (
                                      <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1 justify-center">
                                        <CheckCircle className="w-3 h-3" />
                                        Yes
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1 justify-center">
                                        <XCircle className="w-3 h-3" />
                                        No
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* THE Rankings Tab */}
            <TabsContent value="the" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-600" />
                    Times Higher Education World University
                    Rankings
                  </CardTitle>
                  <CardDescription>
                    Global university performance rankings
                    across teaching, research, citations, and
                    more
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Rankings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border border-purple-100">
                      <p className="text-sm text-gray-600 mb-1">
                        World Ranking
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {theRankings.overall}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border border-purple-100">
                      <p className="text-sm text-gray-600 mb-1">
                        Asia Ranking
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {theRankings.asiaRank}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border border-purple-100">
                      <p className="text-sm text-gray-600 mb-1">
                        Impact Ranking
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {theRankings.impactRank}
                      </p>
                    </div>
                  </div>

                  {/* THE Pillars */}
                  <div>
                    <h4 className="font-semibold mb-4">
                      Performance Indicators
                    </h4>
                    <div className="space-y-4">
                      {theScores.map((score, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {score.category}
                            </p>
                            <p className="text-sm font-bold text-purple-600">
                              {score.score}/{score.maxScore}
                            </p>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                              style={{
                                width: `${(score.score / score.maxScore) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* QS Rankings Tab */}
            <TabsContent value="qs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-green-600" />
                    QS World University Rankings
                  </CardTitle>
                  <CardDescription>
                    Quacquarelli Symonds - Global university
                    rankings based on multiple indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Rankings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border border-green-100">
                      <p className="text-sm text-gray-600 mb-1">
                        World Ranking
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {qsRankings.overall}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border border-green-100">
                      <p className="text-sm text-gray-600 mb-1">
                        Asia Ranking
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        #{qsRankings.asiaRank}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border border-green-100">
                      <p className="text-sm text-gray-600 mb-1">
                        India Ranking
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        #{qsRankings.indiaRank}
                      </p>
                    </div>
                  </div>

                  {/* QS Indicators */}
                  <div>
                    <h4 className="font-semibold mb-4">
                      QS Ranking Indicators
                    </h4>
                    <div className="space-y-4">
                      {qsScores.map((score, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {score.indicator}
                            </p>
                            <p className="text-sm font-bold text-green-600">
                              {score.score}/{score.maxScore}
                            </p>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                              style={{
                                width: `${(score.score / score.maxScore) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}