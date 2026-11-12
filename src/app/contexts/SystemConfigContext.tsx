import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface FormFieldConfig {
  id: string;
  formId: string;
  fieldKey: string;
  label: string;
  description?: string | null;
  fieldType: string;
  isCore: boolean;
  isRequired: boolean;
  defaultValue?: string | null;
  validationRules: Record<string, any>;
  options: any[];
  conditionalRules: Array<{
    id?: string;
    logic: 'AND' | 'OR';
    conditions: Array<{ fieldKey: string; operator: string; value: any }>;
    action: 'show' | 'hide' | 'require' | 'optional' | 'readonly' | 'set_options';
    actionPayload?: any;
    description?: string;
  }>;
  displayOrder: number;
  status: 'active' | 'disabled' | 'archived';
}

export interface FormDefinitionConfig {
  id: string;
  moduleKey: string;
  formKey: string;
  formName: string;
  version: number;
  fields: FormFieldConfig[];
}

export interface ModuleState {
  moduleKey: string;
  moduleName: string;
  routeKey: string;
  isEnabled: boolean;
  isCritical: boolean;
  affectedRoutes: string[];
}

export interface RuntimeConfigData {
  version: number;
  userContext: {
    id: string;
    role: string;
    roleName: string;
    isSystemAdmin: boolean;
    effectivePermissions: Record<string, Record<string, boolean>>;
    scopes: any[];
  };
  modules: ModuleState[];
  hierarchy: {
    campuses: any[];
    schools: any[];
    departments: any[];
    programLevels: any[];
    courses: any[];
  };
  settings: Record<string, any>;
  forms: FormDefinitionConfig[];
}

interface SystemConfigContextType {
  runtimeConfig: RuntimeConfigData | null;
  loadingConfig: boolean;
  refreshRuntimeConfig: () => Promise<void>;
  isModuleEnabled: (moduleKey: string) => boolean;
  hasModulePermission: (moduleKey: string, permission: string) => boolean;
  getFormConfig: (formKey: string) => FormDefinitionConfig | null;
  evaluateFieldBehavior: (field: FormFieldConfig, values: Record<string, any>) => {
    visible: boolean;
    required: boolean;
    readOnly: boolean;
    optionsOverride: any[] | null;
  };
  isSystemAdmin: boolean;
  academicYears: string[];
  uploadRestrictions: { allowedExtensions: string[]; maxFileSizeMb: number };
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function evaluateCondition(cond: { fieldKey: string; operator: string; value: any }, values: Record<string, any>) {
  const actual = values ? values[cond.fieldKey] : undefined;
  const actualStr = actual === null || actual === undefined ? '' : String(actual).trim().toLowerCase();
  const targetStr = cond.value === null || cond.value === undefined ? '' : String(cond.value).trim().toLowerCase();

  switch (cond.operator) {
    case 'equals':
      return actualStr === targetStr;
    case 'not_equals':
      return actualStr !== targetStr;
    case 'contains':
      return actualStr.includes(targetStr);
    case 'in': {
      const list = Array.isArray(cond.value)
        ? cond.value.map((v: any) => String(v).trim().toLowerCase())
        : String(cond.value || '').split(',').map((s) => s.trim().toLowerCase());
      return list.includes(actualStr);
    }
    case 'gt':
      return Number(actual) > Number(cond.value);
    case 'lt':
      return Number(actual) < Number(cond.value);
    case 'is_empty':
      return actualStr === '';
    case 'is_not_empty':
      return actualStr !== '';
    default:
      return false;
  }
}

export function SystemConfigProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfigData | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const refreshRuntimeConfig = useCallback(async () => {
    if (!isAuthenticated || !user?.token) {
      setRuntimeConfig(null);
      return;
    }

    setLoadingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/api/system/runtime-config`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setRuntimeConfig(json.data);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('iqac:config-updated', { detail: json.data }));
          }
        }
      }
    } catch (err) {
      console.warn('[SystemConfig] Failed to fetch runtime config:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, [isAuthenticated, user?.token]);

  useEffect(() => {
    refreshRuntimeConfig();
  }, [refreshRuntimeConfig]);

  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    if (!runtimeConfig?.modules || runtimeConfig.modules.length === 0) return true;
    const mod = runtimeConfig.modules.find((m) => m.moduleKey === moduleKey || (m.affectedRoutes || []).includes(moduleKey));
    return mod ? mod.isEnabled : true;
  }, [runtimeConfig]);

  const isSystemAdmin = Boolean(
    runtimeConfig?.userContext?.isSystemAdmin ??
    user?.isSystemAdmin ??
    (user?.role === 'admin' || user?.role === 'system_admin')
  );

  const hasModulePermission = useCallback((moduleKey: string, permission: string): boolean => {
    if (isSystemAdmin) return true;
    const perms = runtimeConfig?.userContext?.effectivePermissions || user?.effectivePermissions;
    if (perms && perms[moduleKey] && perms[moduleKey][permission] !== undefined) {
      return Boolean(perms[moduleKey][permission]);
    }
    return true;
  }, [runtimeConfig, user, isSystemAdmin]);

  const getFormConfig = useCallback((formKey: string): FormDefinitionConfig | null => {
    if (!runtimeConfig?.forms) return null;
    return runtimeConfig.forms.find((f) => f.formKey === formKey) || null;
  }, [runtimeConfig]);

  const evaluateFieldBehavior = useCallback((field: FormFieldConfig, values: Record<string, any>) => {
    let visible = field.status === 'active';
    let required = Boolean(field.isRequired);
    let readOnly = field.fieldType === 'read_only';
    let optionsOverride: any[] | null = null;

    const rules = Array.isArray(field.conditionalRules) ? field.conditionalRules : [];
    for (const rule of rules) {
      const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
      if (conditions.length === 0) continue;

      const logic = (rule.logic || 'AND').toUpperCase();
      const matched = logic === 'OR'
        ? conditions.some((c) => evaluateCondition(c, values))
        : conditions.every((c) => evaluateCondition(c, values));

      if (matched) {
        if (rule.action === 'show') visible = true;
        else if (rule.action === 'hide') visible = false;
        else if (rule.action === 'require') required = true;
        else if (rule.action === 'optional') required = false;
        else if (rule.action === 'readonly') readOnly = true;
        else if (rule.action === 'set_options' && Array.isArray(rule.actionPayload)) {
          optionsOverride = rule.actionPayload;
        }
      }
    }

    return { visible, required, readOnly, optionsOverride };
  }, []);

  const academicYears = runtimeConfig?.settings?.academic_years?.activeYears || [
    'AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24', 'AY 2022–23', 'AY 2021–22', 'AY 2020–21'
  ];

  const uploadRestrictions = runtimeConfig?.settings?.upload_restrictions || {
    allowedExtensions: ['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.docx'],
    maxFileSizeMb: 10
  };

  return (
    <SystemConfigContext.Provider
      value={{
        runtimeConfig,
        loadingConfig,
        refreshRuntimeConfig,
        isModuleEnabled,
        hasModulePermission,
        getFormConfig,
        evaluateFieldBehavior,
        isSystemAdmin,
        academicYears,
        uploadRestrictions
      }}
    >
      {children}
    </SystemConfigContext.Provider>
  );
}

export function useSystemConfig() {
  const ctx = useContext(SystemConfigContext);
  if (!ctx) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return ctx;
}

