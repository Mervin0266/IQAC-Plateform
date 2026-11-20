import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Building2,
  Users,
  BookOpen,
  Briefcase,
  Award,
  ArrowUpRight
} from 'lucide-react';
import { StatCard } from '../design-system';
import { Badge } from '../ui/badge';

interface DataQualityGovernanceViewProps {
  onNavigate: (route: string) => void;
}

export function DataQualityGovernanceView({ onNavigate }: DataQualityGovernanceViewProps) {
  const moduleCompliance = [
    {
      module: 'Research Publications & Citations',
      route: 'publications',
      totalRecords: 454,
      verifiedRecords: 454,
      pendingVerification: 0,
      verificationRate: 100,
      missingProofs: 0,
      status: 'Fully Verified'
    },
    {
      module: 'Patents & Intellectual Property',
      route: 'patents',
      totalRecords: 181,
      verifiedRecords: 175,
      pendingVerification: 6,
      verificationRate: 96.7,
      missingProofs: 4,
      status: 'Action Required'
    },
    {
      module: 'Consultancy Projects & Testing',
      route: 'consultancy-projects',
      totalRecords: 114,
      verifiedRecords: 114,
      pendingVerification: 0,
      verificationRate: 100,
      missingProofs: 0,
      status: 'Fully Verified'
    },
    {
      module: 'Extramural Sponsored Grants',
      route: 'sponsored-research',
      totalRecords: 37,
      verifiedRecords: 37,
      pendingVerification: 0,
      verificationRate: 100,
      missingProofs: 0,
      status: 'Fully Verified'
    },
    {
      module: 'Campus Placements & Internships',
      route: 'placements-internships',
      totalRecords: 1083,
      verifiedRecords: 1083,
      pendingVerification: 0,
      verificationRate: 100,
      missingProofs: 12,
      status: 'Proofs Pending'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Governance Overview Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Institutional Data Quality & Verification Governance
          </h3>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
            Audit Compliant
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          Continuous tracking of administrative verification statuses, profile completeness scores, and supporting document proofs across all academic units.
        </p>
      </div>

      {/* 4 Core Governance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Overall Verification Rate"
          value="99.7%"
          subtitle="Formally Approved Records"
          icon={CheckCircle2}
          className="border-t-2 border-t-emerald-600"
        />
        <StatCard
          title="Faculty Profile Completeness"
          value="94.2%"
          subtitle="212 Teaching Profiles"
          icon={Users}
          className="border-t-2 border-t-blue-600"
          onClick={() => onNavigate('faculty-details')}
        />
        <StatCard
          title="Pending Department Review"
          value="6"
          subtitle="Patents Awaiting Review"
          icon={AlertTriangle}
          className="border-t-2 border-t-amber-500"
          onClick={() => onNavigate('patents')}
        />
        <StatCard
          title="Supporting Proofs Attached"
          value="98.8%"
          subtitle="Sanction Letters & Certificates"
          icon={FileCheck}
          className="border-t-2 border-t-teal-600"
        />
      </div>

      {/* Module Compliance Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-xs font-bold text-slate-800">
            Module-by-Module Verification & Proof Compliance Scorecard
          </h4>
          <span className="text-[11px] text-slate-400">NAAC SSR Cycle 4 Benchmark</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3 text-right">Total Submissions</th>
                <th className="py-2.5 px-3 text-right">Approved</th>
                <th className="py-2.5 px-3 text-right">Pending Review</th>
                <th className="py-2.5 px-3 text-right">Verification Rate</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {moduleCompliance.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{row.module}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{row.totalRecords.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                    {row.verifiedRecords.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-amber-700">
                    {row.pendingVerification}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {row.verificationRate}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        row.status === 'Fully Verified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onNavigate(row.route)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span>Review</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
