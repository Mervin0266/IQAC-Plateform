import React from 'react';
import { useSystemConfig, FormFieldConfig } from '../contexts/SystemConfigContext';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface DynamicFormFieldsRendererProps {
  formKey: string;
  mode: 'create' | 'edit' | 'view';
  coreValues?: Record<string, any>;
  customValues: Record<string, any>;
  onChangeCustomValue?: (fieldKey: string, value: any) => void;
}

/**
 * Renders administrator-configured custom fields and historical archived fields
 * synchronized with System Administration V2.0 Form Builder.
 */
export function DynamicFormFieldsRenderer({
  formKey,
  mode,
  coreValues = {},
  customValues = {},
  onChangeCustomValue
}: DynamicFormFieldsRendererProps) {
  const { getFormConfig, evaluateFieldBehavior } = useSystemConfig();
  const { departmentList } = useAcademicHierarchy();

  const formConfig = getFormConfig(formKey);
  if (!formConfig || !formConfig.fields || formConfig.fields.length === 0) {
    return null;
  }

  const combinedValues = { ...coreValues, ...customValues };
  const customFields = formConfig.fields.filter((f) => !f.isCore);

  // Determine which fields to display based on mode & status
  const visibleFields = customFields.filter((field) => {
    if (field.status === 'archived') {
      // Archived fields MUST NOT appear in new-entry forms, MUST remain visible in historical records if a value exists
      if (mode === 'create') return false;
      const hasHistoricalVal =
        customValues[field.fieldKey] !== undefined &&
        customValues[field.fieldKey] !== null &&
        String(customValues[field.fieldKey]).trim() !== '';
      return hasHistoricalVal;
    }

    if (field.status === 'disabled') return false;
    const behavior = evaluateFieldBehavior(field, combinedValues);
    return behavior.visible;
  });

  if (visibleFields.length === 0) return null;

  const renderFieldInput = (field: FormFieldConfig) => {
    const val = customValues[field.fieldKey] ?? field.defaultValue ?? '';
    const behavior = evaluateFieldBehavior(field, combinedValues);
    const isReadOnly = mode === 'view' || field.status === 'archived' || behavior.readOnly;
    const options = behavior.optionsOverride || field.options || [];

    if (mode === 'view' || field.status === 'archived') {
      const display = Array.isArray(val) ? val.join(', ') : String(val || '—');
      return (
        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800">
          {display}
        </div>
      );
    }

    switch (field.fieldType) {
      case 'long_text':
        return (
          <textarea
            value={String(val)}
            disabled={isReadOnly}
            onChange={(e) => onChangeCustomValue?.(field.fieldKey, e.target.value)}
            rows={3}
            placeholder={field.description || `Enter ${field.label}`}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={String(val)}
            disabled={isReadOnly}
            onChange={(e) => onChangeCustomValue?.(field.fieldKey, e.target.value)}
            className="h-9 text-xs"
          />
        );
      case 'email':
        return (
          <Input
            type="email"
            value={String(val)}
            disabled={isReadOnly}
            onChange={(e) => onChangeCustomValue?.(field.fieldKey, e.target.value)}
            className="h-9 text-xs"
          />
        );
      case 'phone':
        return (
          <Input
            type="tel"
            value={String(val)}
            disabled={isReadOnly}
            onChange={(e) => onChangeCustomValue?.(field.fieldKey, e.target.value)}
            className="h-9 text-xs"
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={String(val)}
            disabled={isReadOnly}
            onChange={(e) => onChangeCustomValue?.(field.fieldKey, e.target.value)}
            className="h-9 text-xs"
          />
        );
      case 'dropdown':
        return (
          <select
            value={String(val)}
            disabled={isReadOnly}
            onChange={(e) => onChangeCustomValue?.(field.fieldKey, e.target.value)}
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
          >
            <option value="">Select {field.label}...</option>
            {options.map((opt: any, idx: number) => (
              <option key={idx} value={String(opt)}>
                {String(opt)}
              </option>
            ))}
          </select>
        );
      case 'department_selector':
        return (
          <select
            value={String(val)}
            disabled={isReadOnly}
            onChange={(e) => onChangeCustomValue?.(field.fieldKey, e.target.value)}
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
          >
            <option value="">Select Department...</option>
            {departmentList.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="flex flex-wrap gap-3 pt-1">
            {options.map((opt: any, idx: number) => (
              <label key={idx} className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name={`custom-${field.fieldKey}`}
                  value={String(opt)}
                  checked={String(val) === String(opt)}
                  disabled={isReadOnly}
                  onChange={() => onChangeCustomValue?.(field.fieldKey, String(opt))}
                />
                <span>{String(opt)}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={val === true || val === 'true'}
              disabled={isReadOnly}
              onChange={(e) => onChangeCustomValue?.(field.fieldKey, e.target.checked)}
            />
            <span>{field.description || 'Yes / Confirmed'}</span>
          </label>
        );
      default:
        return (
          <Input
            type="text"
            value={String(val)}
            disabled={isReadOnly}
            placeholder={field.description || ''}
            onChange={(e) => onChangeCustomValue?.(field.fieldKey, e.target.value)}
            className="h-9 text-xs"
          />
        );
    }
  };

  return (
    <div className="pt-3 mt-3 border-t border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Configured Custom & Historical Fields
        </span>
        <Badge variant="outline" className="text-[10px] bg-slate-50">
          Form Builder v{formConfig.version}
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleFields.map((field) => {
          const behavior = evaluateFieldBehavior(field, combinedValues);
          return (
            <div key={field.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium text-slate-700">
                  {field.label}
                  {behavior.required && field.status !== 'archived' && (
                    <span className="text-rose-600 ml-0.5">*</span>
                  )}
                </Label>
                {field.status === 'archived' && (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                    Archived Historical Field
                  </Badge>
                )}
              </div>
              {renderFieldInput(field)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

