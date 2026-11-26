import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  RotateCcw,
  AlertCircle,
  FileText,
  BarChart2,
  Table as TableIcon,
  List,
  Sparkles,
  Info,
  Shield,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import {
  REPORT_FIELD_CATALOG,
  SectionDefinition,
  SubModuleDefinition,
  FieldItem,
  GranularContentConfig,
  PlacementRecordConfig
} from '../../report-builder/reportFieldCatalog';

interface SectionAccordionListProps {
  reportType: 'summary' | 'analytical' | 'detailed';
  config: GranularContentConfig;
  onChange: (newConfig: GranularContentConfig) => void;
  availableCompanies?: string[];
  availableDepartments?: string[];
}

export function SectionAccordionList({
  reportType,
  config,
  onChange,
  availableCompanies = [],
  availableDepartments = []
}: SectionAccordionListProps) {
  const isSummary = reportType === 'summary';
  const isDetailed = reportType === 'detailed';

  // Expansion state per section
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    executiveOverview: true,
    academicFaculty: false,
    researchInnovation: false,
    placements: false,
    accreditation: false,
    comparativeAnalytics: false,
    insightsActionPlan: false,
    appendix: false
  });

  // Nested expansion for Research sub-modules
  const [expandedResearchSubs, setExpandedResearchSubs] = useState<Record<string, boolean>>({
    publications: true,
    quartiles: false,
    citations: false,
    facultyContributions: false,
    patents: false,
    copyrights: false,
    consultancy: false,
    sponsoredResearch: false,
    researchAwardsEContent: false
  });

  const toggleSectionExpand = (secId: string) => {
    setExpandedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  const toggleResearchSubExpand = (subId: string) => {
    setExpandedResearchSubs(prev => ({ ...prev, [subId]: !prev[subId] }));
  };

  const handleSectionToggle = (secId: string, checked: boolean) => {
    onChange({
      ...config,
      sections: {
        ...config.sections,
        [secId]: checked
      }
    });
  };

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    onChange({
      ...config,
      fieldSelections: {
        ...config.fieldSelections,
        [fieldId]: checked
      }
    });
  };

  // Section-level Select All
  const handleSelectAllInSection = (sec: SectionDefinition) => {
    const updated = { ...config.fieldSelections };
    sec.items.forEach(item => {
      if (!(isSummary && item.notAllowedInSummary) && !(item.requiresDetailed && !isDetailed)) {
        updated[item.id] = true;
      }
    });
    if (sec.subModules) {
      sec.subModules.forEach(sub => {
        sub.items.forEach(item => {
          if (!(isSummary && item.notAllowedInSummary) && !(item.requiresDetailed && !isDetailed)) {
            updated[item.id] = true;
          }
        });
      });
    }
    onChange({
      ...config,
      sections: { ...config.sections, [sec.id]: true },
      fieldSelections: updated
    });
  };

  // Section-level Deselect All
  const handleDeselectAllInSection = (sec: SectionDefinition) => {
    const updated = { ...config.fieldSelections };
    sec.items.forEach(item => {
      updated[item.id] = false;
    });
    if (sec.subModules) {
      sec.subModules.forEach(sub => {
        sub.items.forEach(item => {
          updated[item.id] = false;
        });
      });
    }
    onChange({
      ...config,
      fieldSelections: updated
    });
  };

  // Section-level Reset Defaults
  const handleResetSectionDefaults = (sec: SectionDefinition) => {
    const updated = { ...config.fieldSelections };
    sec.items.forEach(item => {
      if (isSummary && item.notAllowedInSummary) {
        updated[item.id] = false;
      } else if (item.requiresDetailed && !isDetailed) {
        updated[item.id] = false;
      } else {
        updated[item.id] = item.defaultSelected;
      }
    });
    if (sec.subModules) {
      sec.subModules.forEach(sub => {
        sub.items.forEach(item => {
          if (isSummary && item.notAllowedInSummary) {
            updated[item.id] = false;
          } else if (item.requiresDetailed && !isDetailed) {
            updated[item.id] = false;
          } else {
            updated[item.id] = item.defaultSelected;
          }
        });
      });
    }
    onChange({
      ...config,
      sections: { ...config.sections, [sec.id]: sec.defaultSelected },
      fieldSelections: updated
    });
  };

  // Placement record config updater
  const handlePlacementConfigChange = (updates: Partial<PlacementRecordConfig>) => {
    onChange({
      ...config,
      placementRecords: {
        ...config.placementRecords,
        ...updates
      }
    });
  };

  // Helper to count selected fields in a section
  const getSectionCounts = (sec: SectionDefinition) => {
    let total = 0;
    let selected = 0;

    const evalItem = (item: FieldItem) => {
      if (isSummary && item.notAllowedInSummary) return;
      if (item.requiresDetailed && !isDetailed) return;
      total++;
      if (config.fieldSelections[item.id]) {
        selected++;
      }
    };

    sec.items.forEach(evalItem);
    if (sec.subModules) {
      sec.subModules.forEach(sub => sub.items.forEach(evalItem));
    }

    return { total, selected };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'kpis':
        return <Sparkles className="w-3.5 h-3.5 text-blue-600" />;
      case 'charts':
        return <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />;
      case 'tables':
        return <TableIcon className="w-3.5 h-3.5 text-teal-600" />;
      case 'records':
        return <List className="w-3.5 h-3.5 text-amber-600" />;
      case 'narrative':
        return <FileText className="w-3.5 h-3.5 text-slate-600" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {REPORT_FIELD_CATALOG.map(sec => {
        const isSecActive = Boolean(config.sections[sec.id]);
        const isExpanded = Boolean(expandedSections[sec.id]);
        const { total, selected } = getSectionCounts(sec);

        return (
          <div
            key={sec.id}
            className={`border rounded-xl transition-all duration-200 overflow-hidden ${
              isSecActive
                ? isExpanded
                  ? 'border-[#2855B9]/60 shadow-sm bg-white'
                  : 'border-slate-300 bg-white'
                : 'border-slate-200 bg-slate-50/70 opacity-75'
            }`}
          >
            {/* Header Accordion Bar */}
            <div className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isSecActive}
                  onCheckedChange={c => handleSectionToggle(sec.id, !!c)}
                  className="data-[state=checked]:bg-[#1C355B] data-[state=checked]:border-[#1C355B]"
                />
                <button
                  type="button"
                  onClick={() => toggleSectionExpand(sec.id)}
                  className="flex items-center gap-2 text-left group"
                >
                  <span className="font-bold text-slate-900 text-sm group-hover:text-[#2855B9] transition-colors">
                    {sec.number}. {sec.name}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-[#2855B9]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#2855B9]" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Field count badge */}
                <Badge
                  variant="outline"
                  className={`text-[11px] font-medium px-2 py-0.5 ${
                    !isSecActive
                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                      : selected === total
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : selected > 0
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {isSecActive ? `${selected} / ${total} fields active` : 'Excluded from report'}
                </Badge>

                {isSecActive && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSelectAllInSection(sec)}
                      className="h-6 text-[10px] px-1.5 text-slate-600 hover:text-slate-900"
                    >
                      Select All
                    </Button>
                    <span className="text-slate-300">|</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeselectAllInSection(sec)}
                      className="h-6 text-[10px] px-1.5 text-slate-600 hover:text-slate-900"
                    >
                      Deselect
                    </Button>
                    <span className="text-slate-300">|</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResetSectionDefaults(sec)}
                      className="h-6 text-[10px] px-1.5 text-[#2855B9] hover:text-[#1C355B]"
                      title="Reset section to report profile defaults"
                    >
                      <RotateCcw className="w-2.5 h-2.5 mr-1" />
                      Reset
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Description & Strict Exclusion note */}
            <div className="px-3.5 pb-2 -mt-1 flex items-center justify-between text-xs text-slate-500">
              <p>{sec.description}</p>
              {sec.strictExclusionNote && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {sec.strictExclusionNote}
                </span>
              )}
            </div>

            {/* Inline Expanded Customization Area */}
            {isExpanded && isSecActive && (
              <div className="border-t border-slate-200 bg-slate-50/50 p-4 space-y-4">
                {/* 1. SECTION 3: RESEARCH & INNOVATION NESTED ACCORDIONS */}
                {sec.id === 'researchInnovation' && sec.subModules && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-1">
                      <span>9 Research & Innovation Modular Elements</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Configure KPIs, quartile benchmarks, citations, patents, and grant tables independently.
                      </span>
                    </div>

                    <div className="space-y-2">
                      {sec.subModules.map(sub => {
                        const isSubExpanded = Boolean(expandedResearchSubs[sub.id]);
                        const activeCount = sub.items.filter(
                          i =>
                            config.fieldSelections[i.id] &&
                            !(isSummary && i.notAllowedInSummary) &&
                            !(i.requiresDetailed && !isDetailed)
                        ).length;

                        return (
                          <div
                            key={sub.id}
                            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => toggleResearchSubExpand(sub.id)}
                              className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isSubExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                <span className="font-semibold text-slate-800 text-xs">{sub.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">
                                  {sub.description.slice(0, 50)}...
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-1.5 bg-slate-50 text-slate-700"
                                >
                                  {activeCount} / {sub.items.length}
                                </Badge>
                              </div>
                            </button>

                            {isSubExpanded && (
                              <div className="p-3 border-t border-slate-100 bg-slate-50/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {sub.items.map(item => {
                                  const disabled =
                                    (isSummary && item.notAllowedInSummary) ||
                                    (item.requiresDetailed && !isDetailed);
                                  const checked = Boolean(config.fieldSelections[item.id]) && !disabled;

                                  return (
                                    <label
                                      key={item.id}
                                      className={`flex items-start gap-2 p-2 rounded border transition-colors ${
                                        disabled
                                          ? 'bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed'
                                          : checked
                                          ? 'bg-blue-50/50 border-blue-200 cursor-pointer'
                                          : 'bg-white border-slate-200 cursor-pointer hover:border-slate-300'
                                      }`}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        disabled={disabled}
                                        onCheckedChange={c => handleFieldToggle(item.id, !!c)}
                                        className="mt-0.5"
                                      />
                                      <div className="text-xs">
                                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                          {getCategoryIcon(item.category)}
                                          <span>{item.label}</span>
                                        </div>
                                        {disabled && (
                                          <span className="text-[9px] text-amber-700 block mt-0.5">
                                            {isSummary && item.notAllowedInSummary
                                              ? 'Charts disabled in Summary'
                                              : 'Available only in Detailed'}
                                          </span>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. SECTION 4: PLACEMENTS WITH INDIVIDUAL RECORDS & TOP-N */}
                {sec.id === 'placements' && (
                  <div className="space-y-4">
                    {/* Standard Placement KPIs & Charts */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 mb-2">
                        Placement Metrics, Aggregate Brackets & Recruiter Tables
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {sec.items
                          .filter(i => i.category !== 'records')
                          .map(item => {
                            const disabled = isSummary && item.notAllowedInSummary;
                            const checked = Boolean(config.fieldSelections[item.id]) && !disabled;

                            return (
                              <label
                                key={item.id}
                                className={`flex items-start gap-2 p-2 rounded border transition-colors ${
                                  disabled
                                    ? 'bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed'
                                    : checked
                                    ? 'bg-blue-50/50 border-blue-200 cursor-pointer'
                                    : 'bg-white border-slate-200 cursor-pointer hover:border-slate-300'
                                }`}
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={disabled}
                                  onCheckedChange={c => handleFieldToggle(item.id, !!c)}
                                  className="mt-0.5"
                                />
                                <div className="text-xs">
                                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                    {getCategoryIcon(item.category)}
                                    <span>{item.label}</span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>

                    {/* Detailed Individual Placement Records Box */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-[#2855B9]" />
                          <h4 className="font-bold text-xs text-slate-900">
                            Category D: Individual Placement Records Register
                          </h4>
                        </div>
                        {isDetailed ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            Detailed Mode Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                            Permitted Exclusively in Detailed Report
                          </Badge>
                        )}
                      </div>

                      {!isDetailed ? (
                        <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Student Record Confidentiality Policy</p>
                            <p className="text-[11px] text-amber-800 mt-0.5">
                              Summary and Analytical report types present aggregate metrics, departmental percentages,
                              and recruiter tables. To inspect or export individual student placement registers with
                              custom column selection, filters, and Top-N sorting, switch the report profile to
                              <strong className="ml-1 text-amber-950 font-bold">Detailed</strong> in Step 1.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={config.placementRecords.enabled}
                              onCheckedChange={c => handlePlacementConfigChange({ enabled: !!c })}
                            />
                            <span className="text-xs font-semibold text-slate-800">
                              Include Individual Placement Records Register in Detailed Report
                            </span>
                          </label>

                          {config.placementRecords.enabled && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
                              {/* Column selection */}
                              <div>
                                <span className="font-semibold text-slate-700 block mb-1.5">
                                  Select Register Columns:
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {sec.items
                                    .filter(i => i.category === 'records')
                                    .map(col => {
                                      const isColChecked = config.placementRecords.columns.includes(col.id);
                                      return (
                                        <label
                                          key={col.id}
                                          className={`flex items-center gap-1.5 p-1.5 rounded border cursor-pointer ${
                                            isColChecked
                                              ? 'bg-white border-blue-300 font-medium text-blue-900'
                                              : 'bg-white/70 border-slate-200 text-slate-700'
                                          }`}
                                        >
                                          <Checkbox
                                            checked={isColChecked}
                                            onCheckedChange={c => {
                                              const newCols = c
                                                ? [...config.placementRecords.columns, col.id]
                                                : config.placementRecords.columns.filter(x => x !== col.id);
                                              handlePlacementConfigChange({ columns: newCols });
                                            }}
                                          />
                                          <span className="text-[11px]">{col.label}</span>
                                        </label>
                                      );
                                    })}
                                </div>
                              </div>

                              {/* Controls: Top N, Sort, Filter */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Record Limit (Top N):
                                  </label>
                                  <select
                                    value={config.placementRecords.topN}
                                    onChange={e => {
                                      const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                                      handlePlacementConfigChange({ topN: val });
                                    }}
                                    className="w-full text-xs h-8 px-2 rounded border border-slate-200 bg-white"
                                  >
                                    <option value={10}>Top 10 Records</option>
                                    <option value={20}>Top 20 Records</option>
                                    <option value={50}>Top 50 Records</option>
                                    <option value="all">All Matching Records (Up to 500)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Sort Dimension:
                                  </label>
                                  <select
                                    value={config.placementRecords.sortBy}
                                    onChange={e =>
                                      handlePlacementConfigChange({ sortBy: e.target.value as any })
                                    }
                                    className="w-full text-xs h-8 px-2 rounded border border-slate-200 bg-white"
                                  >
                                    <option value="package">Package / CTC (Highest First)</option>
                                    <option value="company">Company Name</option>
                                    <option value="studentName">Student Name</option>
                                    <option value="department">Department</option>
                                    <option value="placementDate">Offer Date</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Sort Order:
                                  </label>
                                  <select
                                    value={config.placementRecords.sortOrder}
                                    onChange={e =>
                                      handlePlacementConfigChange({ sortOrder: e.target.value as any })
                                    }
                                    className="w-full text-xs h-8 px-2 rounded border border-slate-200 bg-white"
                                  >
                                    <option value="desc">Descending (Highest / Z–A)</option>
                                    <option value="asc">Ascending (Lowest / A–Z)</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. STANDARD SECTIONS (All other sections) */}
                {sec.id !== 'researchInnovation' && sec.id !== 'placements' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {sec.items.map(item => {
                        const disabled =
                          (isSummary && item.notAllowedInSummary) ||
                          (item.requiresDetailed && !isDetailed);
                        const checked = Boolean(config.fieldSelections[item.id]) && !disabled;

                        return (
                          <label
                            key={item.id}
                            className={`flex items-start gap-2 p-2 rounded border transition-colors ${
                              disabled
                                ? 'bg-slate-100/60 border-slate-200 opacity-50 cursor-not-allowed'
                                : checked
                                ? 'bg-blue-50/50 border-blue-200 cursor-pointer'
                                : 'bg-white border-slate-200 cursor-pointer hover:border-slate-300'
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={c => handleFieldToggle(item.id, !!c)}
                              className="mt-0.5"
                            />
                            <div className="text-xs">
                              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                {getCategoryIcon(item.category)}
                                <span>{item.label}</span>
                              </div>
                              {disabled && (
                                <span className="text-[9px] text-amber-700 block mt-0.5">
                                  {isSummary && item.notAllowedInSummary
                                    ? 'Charts disabled in Summary'
                                    : 'Available only in Detailed'}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
