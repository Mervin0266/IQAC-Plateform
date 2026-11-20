import React, { useState } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface CustomMetricItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  formula: string;
  domain: string;
  unit?: string;
  format?: string;
  isSystem?: boolean;
}

interface MetricFormulaStudioViewProps {
  customMetrics?: CustomMetricItem[];
  onRefreshMetrics?: () => void;
}

const AVAILABLE_TOKENS = [
  { token: 'total_publications', label: 'Total Publications (papers)', domain: 'Research' },
  { token: 'total_citations', label: 'Approved Citations (count)', domain: 'Research' },
  { token: 'total_faculty', label: 'Total Teaching Faculty (count)', domain: 'Faculty' },
  { token: 'total_students', label: 'Total Enrolled Students (count)', domain: 'Students' },
  { token: 'placed_students', label: 'Distinct Placed Students (count)', domain: 'Placements' },
  { token: 'eligible_students', label: 'Eligible Graduating Students (count)', domain: 'Placements' },
  { token: 'sponsored_grants_lakhs', label: 'Extramural Grants (₹ Lakhs)', domain: 'Research' },
  { token: 'consultancy_inflow_lakhs', label: 'Consultancy Inflow (₹ Lakhs)', domain: 'Research' },
  { token: 'patents_granted', label: 'Patents Granted (count)', domain: 'Research' }
];

export function MetricFormulaStudioView({
  customMetrics = [],
  onRefreshMetrics
}: MetricFormulaStudioViewProps) {
  const [metricName, setMetricName] = useState('');
  const [domain, setDomain] = useState('Research');
  const [unit, setUnit] = useState('units');
  const [format, setFormat] = useState('ratio');
  const [formula, setFormula] = useState('');
  const [description, setDescription] = useState('');
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-configured default system metrics
  const defaultSystemMetrics: CustomMetricItem[] = [
    {
      id: 'sys-1',
      name: 'Publications per Faculty Member',
      code: 'PUBS_PER_FACULTY',
      description: 'Average research papers per full-time faculty member',
      formula: 'total_publications / total_faculty',
      domain: 'Research',
      unit: 'papers/faculty',
      format: 'ratio',
      isSystem: true
    },
    {
      id: 'sys-2',
      name: 'Student-to-Faculty Ratio (SFR)',
      code: 'SFR_RATIO',
      description: 'Number of enrolled students per full-time teaching faculty member',
      formula: 'total_students / total_faculty',
      domain: 'Academic',
      unit: ':1',
      format: 'ratio',
      isSystem: true
    },
    {
      id: 'sys-3',
      name: 'Consultancy Inflow per Faculty',
      code: 'CONSULTANCY_PER_FACULTY',
      description: 'Total consultancy earnings generated per teaching faculty (in INR Lakhs)',
      formula: 'consultancy_inflow_lakhs / total_faculty',
      domain: 'Research',
      unit: 'Lakhs/faculty',
      format: 'currency',
      isSystem: true
    },
    {
      id: 'sys-4',
      name: 'Verified Placement Percentage',
      code: 'PLACEMENT_PCT',
      description: 'Ratio of distinct placed students over eligible cohort',
      formula: '(placed_students / eligible_students) * 100',
      domain: 'Placements',
      unit: '%',
      format: 'percentage',
      isSystem: true
    }
  ];

  const allMetrics = [...defaultSystemMetrics, ...customMetrics.filter(m => !defaultSystemMetrics.some(s => s.code === m.code))];

  const handleInsertToken = (tok: string) => {
    setFormula(prev => (prev ? `${prev} ${tok}` : tok));
  };

  const handleInsertOperator = (op: string) => {
    setFormula(prev => `${prev} ${op} `);
  };

  const handleValidateFormula = () => {
    if (!formula.trim()) {
      setValidationResult({ isValid: false, message: 'Formula expression cannot be empty.' });
      return;
    }

    // Replace valid tokens with sample numeric test values (avoid 0 for denominators)
    let testExpr = formula.toLowerCase();
    AVAILABLE_TOKENS.forEach(t => {
      const regex = new RegExp(`\\b${t.token.toLowerCase()}\\b`, 'g');
      testExpr = testExpr.replace(regex, '10');
    });

    // Check for disallowed characters
    if (!/^[0-9\s\+\-\*\/\.\(\)]+$/.test(testExpr)) {
      setValidationResult({
        isValid: false,
        message: 'Invalid syntax: Unknown tokens or disallowed characters detected. Use catalog tokens only.'
      });
      return;
    }

    try {
      const val = Function(`"use strict"; return (${testExpr});`)();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        setValidationResult({
          isValid: true,
          message: `Expression valid. Test output with baseline values: ${val.toFixed(2)} ${unit}`
        });
      } else {
        setValidationResult({
          isValid: false,
          message: 'Evaluation failed: Check for division by zero or unbalanced parentheses.'
        });
      }
    } catch (err: any) {
      setValidationResult({
        isValid: false,
        message: `Syntax error: ${err.message}`
      });
    }
  };

  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    handleValidateFormula();
    if (!metricName.trim() || !formula.trim()) return;

    setIsSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token') || (() => {
        try {
          return JSON.parse(localStorage.getItem('iqac_user') || '{}')?.token;
        } catch {
          return null;
        }
      })();

      const res = await fetch(`${API_URL}/api/institutional-analytics/custom-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: metricName.trim(),
          domain,
          unit,
          format,
          formula: formula.trim(),
          description: description.trim()
        })
      });

      if (res.ok) {
        setMetricName('');
        setFormula('');
        setDescription('');
        setValidationResult({ isValid: true, message: 'Custom metric successfully created and registered!' });
        if (onRefreshMetrics) onRefreshMetrics();
      }
    } catch (err) {
      console.warn('Failed to save custom metric:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
        <div className="flex items-center space-x-2">
          <Calculator className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Custom Metric & Formula Studio
          </h3>
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
            Validated Arithmetic Engine
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          Build custom normalized institutional ratios and composite indicators using validated mathematical expressions.
          Formulas are safely parsed to prevent injection and avoid division by zero.
        </p>
      </div>

      {/* Main Formula Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Metric Creator Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
            Create New Normalized Custom Metric
          </h4>

          <form onSubmit={handleSaveMetric} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metric Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={metricName}
                  onChange={e => setMetricName(e.target.value)}
                  placeholder="e.g. Publications per Faculty"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Domain *
                </label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border border-slate-200">
                    <SelectValue placeholder="Domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Research">Research & Innovation</SelectItem>
                    <SelectItem value="Faculty">Teaching Faculty</SelectItem>
                    <SelectItem value="Students">Student Analytics</SelectItem>
                    <SelectItem value="Placements">Placements & Internships</SelectItem>
                    <SelectItem value="Diversity">Diversity & Inclusion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Label
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="e.g. papers/faculty, %, :1"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Format Type
                </label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border border-slate-200">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ratio">Ratio (e.g. 2.4 : 1)</SelectItem>
                    <SelectItem value="percentage">Percentage (e.g. 78.5%)</SelectItem>
                    <SelectItem value="currency">Currency (INR Lakhs)</SelectItem>
                    <SelectItem value="number">Raw Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Formula Expression Builder */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Formula Expression *
                </label>
                <span className="text-[10px] text-slate-400">Insert tokens or operators below</span>
              </div>
              <textarea
                required
                rows={3}
                value={formula}
                onChange={e => setFormula(e.target.value)}
                placeholder="e.g. total_publications / total_faculty"
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-blue-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Token Picker Pills */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Available Database Metric Tokens:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TOKENS.map(t => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() => handleInsertToken(t.token)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-mono border border-slate-200 transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5 text-slate-400" />
                    <span>{t.token}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Operator Buttons */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Arithmetic Operators:
              </span>
              <div className="flex items-center gap-2">
                {['+', '-', '*', '/', '(', ')'].map(op => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => handleInsertOperator(op)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-200 transition-colors"
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            {/* Validation Feedback */}
            {validationResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  validationResult.isValid
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {validationResult.isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{validationResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleValidateFormula}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition-colors"
              >
                Test Expression
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg text-xs text-white bg-blue-600 hover:bg-blue-700 font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Register Custom Metric'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Predefined & Custom Metrics Registry */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-bold text-slate-900">
              Active Institutional Metric Registry
            </h4>
            <Badge variant="outline" className="text-[10px] bg-slate-50">
              {allMetrics.length} Active Formulas
            </Badge>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {allMetrics.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{m.name}</span>
                  {m.isSystem ? (
                    <Badge className="text-[9px] bg-blue-100 text-blue-800 border-none font-semibold">
                      System Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      User Custom
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">{m.description}</p>
                <div className="p-1.5 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-700">
                  {m.formula}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Domain: {m.domain}</span>
                  <span>Unit: {m.unit || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
