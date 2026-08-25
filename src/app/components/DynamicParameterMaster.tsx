import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Card } from './ui/card';
import { 
  Sliders, 
  Award, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Upload, 
  ChevronRight,
  TrendingUp,
  BookOpen,
  Layers,
  FileText
} from 'lucide-react';
import { 
  AccreditationFramework, 
  AccreditationParameter, 
  ParameterDataSubmission 
} from '../types/parameterMaster';

interface DynamicParameterMasterProps {
  onNavigate: (page: string) => void;
}

export function DynamicParameterMaster({ onNavigate }: DynamicParameterMasterProps) {
  const { user } = useAuth();
  const [frameworks, setFrameworks] = useState<AccreditationFramework[]>([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('');
  const [parameters, setParameters] = useState<AccreditationParameter[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(user?.department || 'Computer Science and Engineering');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCriterionFilter, setActiveCriterionFilter] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active submission modal state
  const [activeParam, setActiveParam] = useState<AccreditationParameter | null>(null);
  const [formActualValue, setFormActualValue] = useState<number>(0);
  const [formTextResponse, setFormTextResponse] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch Frameworks
  useEffect(() => {
    const fetchFrameworks = async () => {
      if (!user?.token) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/parameter-master/frameworks`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          setFrameworks(json.data);
          setSelectedFrameworkId(json.data[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load accreditation frameworks.');
      } finally {
        setLoading(false);
      }
    };
    fetchFrameworks();
  }, [user]);

  // Fetch Parameters for Selected Framework & Department
  useEffect(() => {
    const fetchParameters = async () => {
      if (!user?.token || !selectedFrameworkId) return;
      try {
        setLoading(true);
        const params = new URLSearchParams({
          frameworkId: selectedFrameworkId,
          department: selectedDept,
          academicYear: '2024-2025'
        });
        const res = await fetch(`${API_BASE}/api/parameter-master/parameters?${params.toString()}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const json = await res.json();
        if (json.success) {
          setParameters(json.data);
        }
      } catch (err: any) {
        setError('Error loading metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchParameters();
  }, [user, selectedFrameworkId, selectedDept]);

  // Distinct Criteria for filter tabs
  const criteriaList = useMemo(() => {
    const set = new Set(parameters.map(p => p.criterionNumber));
    return ['All', ...Array.from(set)];
  }, [parameters]);

  // Calculated Summary Score
  const summaryMetrics = useMemo(() => {
    let totalWeight = 0;
    let earnedScore = 0;
    let completedCount = 0;

    parameters.forEach((p) => {
      totalWeight += Number(p.weightage || 0);
      const sub = p.submissions?.[0];
      if (sub && (sub.status === 'Approved' || sub.status === 'Submitted')) {
        earnedScore += Number(sub.calculatedScore || 0);
        completedCount++;
      }
    });

    const completionRate = parameters.length > 0 
      ? Math.round((completedCount / parameters.length) * 100) 
      : 0;

    return { totalWeight, earnedScore: earnedScore.toFixed(1), completionRate };
  }, [parameters]);

  // Filtered parameter list
  const filteredParameters = parameters.filter((p) => {
    const matchesSearch = 
      p.metricId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.metricTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.criterionTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCriterion = activeCriterionFilter === 'All' || p.criterionNumber === activeCriterionFilter;

    return matchesSearch && matchesCriterion;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParam || !user?.token) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/parameter-master/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          parameterId: activeParam.id,
          department: selectedDept,
          academicYear: '2024-2025',
          actualValue: formActualValue,
          qualitativeResponse: formTextResponse
        })
      });
      const json = await res.json();
      if (json.success) {
        setParameters((prev) =>
          prev.map((p) => (p.id === activeParam.id ? { ...p, submissions: [json.data] } : p))
        );
        setActiveParam(null);
        setSuccessMessage(`Metric ${activeParam.metricId} recorded successfully.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        alert(json.message || 'Error saving submission');
      }
    } catch (err) {
      alert('Network error submitting metric.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFramework = frameworks.find(f => f.id === selectedFrameworkId);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage="naac-accreditation" onNavigate={onNavigate} />
      
      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] p-6 rounded-xl text-white shadow-md">
            <div>
              <div className="flex items-center space-x-2 text-blue-200 text-xs font-semibold uppercase tracking-wider">
                <Sliders className="w-4 h-4" />
                <span>Accreditation & Institutional Quality Engine</span>
              </div>
              <h1 className="text-2xl font-bold mt-1">
                {selectedFramework?.name || 'Dynamic Parameter Master'}
              </h1>
              <p className="text-xs text-blue-100 mt-0.5 max-w-2xl">
                {selectedFramework?.description || 'Configure parameters, track quantitative milestones, and compute weighted compliance metrics.'}
              </p>
            </div>

            {/* Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedFrameworkId}
                onChange={(e) => setSelectedFrameworkId(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-white/10 border border-white/20 text-white font-medium focus:bg-white focus:text-gray-900 focus:outline-none cursor-pointer"
              >
                {frameworks.map((f) => (
                  <option key={f.id} value={f.id} className="text-gray-900">
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-white/10 border border-white/20 text-white font-medium focus:bg-white focus:text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="Computer Science and Engineering" className="text-gray-900">CSE Department</option>
                <option value="Electronics and Communication Engineering" className="text-gray-900">ECE Department</option>
                <option value="Civil Engineering" className="text-gray-900">Civil Engineering</option>
                <option value="Mechanical Engineering" className="text-gray-900">Mechanical Engg</option>
                <option value="Electrical Engineering" className="text-gray-900">Electrical Engg</option>
                <option value="Artificial Intelligence and Data Science" className="text-gray-900">AI & DS</option>
              </select>
            </div>
          </div>

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 flex items-center justify-between border-blue-100 bg-white shadow-sm">
              <div>
                <p className="text-xs text-gray-500 font-medium">Framework Weightage</p>
                <p className="text-2xl font-bold text-[#1e3a8a] mt-0.5">{summaryMetrics.totalWeight} pts</p>
                <span className="text-[11px] text-gray-400">Total Benchmark Max Score</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#1e3a8a]">
                <Award className="w-6 h-6" />
              </div>
            </Card>

            <Card className="p-5 flex items-center justify-between border-green-100 bg-white shadow-sm">
              <div>
                <p className="text-xs text-gray-500 font-medium">Earned Department Score</p>
                <p className="text-2xl font-bold text-green-600 mt-0.5">{summaryMetrics.earnedScore} pts</p>
                <span className="text-[11px] text-green-600 font-medium">
                  {summaryMetrics.totalWeight > 0 ? `${((Number(summaryMetrics.earnedScore) / summaryMetrics.totalWeight) * 100).toFixed(1)}% Attainment` : '0%'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </Card>

            <Card className="p-5 flex items-center justify-between border-amber-100 bg-white shadow-sm">
              <div>
                <p className="text-xs text-gray-500 font-medium">Submission Progress</p>
                <p className="text-2xl font-bold text-amber-600 mt-0.5">{summaryMetrics.completionRate}%</p>
                <span className="text-[11px] text-gray-400">{parameters.length} Total Parameters</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </Card>
          </div>

          {/* Criteria Filter Tabs */}
          <div className="flex flex-wrap gap-2 pt-1">
            {criteriaList.map((crit) => (
              <button
                key={crit}
                onClick={() => setActiveCriterionFilter(crit)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeCriterionFilter === crit
                    ? 'bg-[#1e3a8a] text-white shadow-sm font-semibold'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {crit}
              </button>
            ))}
          </div>

          {/* Metric Catalog Table */}
          <Card className="p-5 shadow-sm border border-gray-200 bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Metric ID (e.g., 3.2.1), Criterion, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                Syncing metric parameters with IQAC database...
              </div>
            ) : filteredParameters.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500">
                No accreditation parameters found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-3">Metric Code</th>
                      <th className="p-3">Criterion & Description</th>
                      <th className="p-3 text-center">Type</th>
                      <th className="p-3 text-center">Weightage</th>
                      <th className="p-3 text-center">Target Benchmark</th>
                      <th className="p-3 text-center">Department Actual</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParameters.map((p) => {
                      const submission = p.submissions?.[0];
                      return (
                        <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-3 font-bold text-[#1e3a8a]">{p.metricId}</td>
                          <td className="p-3 max-w-md">
                            <p className="font-semibold text-gray-800">{p.criterionNumber}: {p.criterionTitle}</p>
                            <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">{p.metricTitle}</p>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              p.metricType === 'Quantitative' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {p.metricType}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-gray-700">{p.weightage}</td>
                          <td className="p-3 text-center text-gray-600">
                            {p.benchmarkValue ? `${p.benchmarkValue} ${p.unitOfMeasure || ''}` : 'Qualitative'}
                          </td>
                          <td className="p-3 text-center font-semibold text-blue-700">
                            {submission ? (
                              <div>
                                <span>{submission.actualValue} {p.unitOfMeasure}</span>
                                <span className="block text-[10px] text-green-600">({submission.calculatedScore} pts)</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              submission?.status === 'Approved'
                                ? 'bg-green-100 text-green-700'
                                : submission?.status === 'Submitted'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission?.status || 'Pending'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setActiveParam(p);
                                setFormActualValue(submission?.actualValue || 0);
                                setFormTextResponse(submission?.qualitativeResponse || '');
                              }}
                              className="px-3 py-1 bg-[#1e3a8a] hover:bg-[#2563eb] text-white rounded text-[11px] font-medium transition-colors shadow-sm"
                            >
                              {submission ? 'Update' : 'Submit'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Submission Modal Dialog */}
          {activeParam && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase">
                      {activeParam.criterionNumber}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      {activeParam.metricId}: {activeParam.criterionTitle}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setActiveParam(null)} 
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">{activeParam.metricTitle}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {activeParam.metricType === 'Quantitative' ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Department Actual Value ({activeParam.unitOfMeasure || 'Value'})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formActualValue}
                        onChange={(e) => setFormActualValue(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      {activeParam.benchmarkValue && (
                        <span className="text-[10px] text-gray-500 mt-1 block">
                          Target Benchmark: {activeParam.benchmarkValue} (Max Weightage: {activeParam.weightage} pts)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Qualitative Description / Compliance Summary
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={formTextResponse}
                        onChange={(e) => setFormTextResponse(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Provide detailed compliance notes adhering to NAAC/NBA metric guidelines..."
                      />
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setActiveParam(null)}
                      className="px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 text-xs bg-[#1e3a8a] text-white hover:bg-[#2563eb] rounded-lg font-semibold shadow-sm disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Save & Submit Metric'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
