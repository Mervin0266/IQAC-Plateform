import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  FileText, Plus, Edit2, ArrowUp, ArrowDown, Archive, RotateCcw,
  CheckCircle2, AlertTriangle, GitBranch, Trash2, Undo2, Redo2, Save
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { adminFetch } from './adminApi';

const FIELD_TYPES = [
  { group: 'Basic', value: 'text', label: 'Text' },
  { group: 'Basic', value: 'long_text', label: 'Long Text' },
  { group: 'Basic', value: 'number', label: 'Number' },
  { group: 'Contact', value: 'email', label: 'Email' },
  { group: 'Contact', value: 'phone', label: 'Phone' },
  { group: 'Date', value: 'date', label: 'Date' },
  { group: 'Date', value: 'date_range', label: 'Date Range' },
  { group: 'Selection', value: 'dropdown', label: 'Dropdown' },
  { group: 'Selection', value: 'multi_select', label: 'Multi-select' },
  { group: 'Selection', value: 'radio', label: 'Radio' },
  { group: 'Selection', value: 'checkbox', label: 'Checkbox' },
  { group: 'Document', value: 'file_upload', label: 'File Upload' },
  { group: 'Document', value: 'multi_file_upload', label: 'Multiple File Upload' },
  { group: 'Advanced', value: 'faculty_selector', label: 'Faculty Selector' },
  { group: 'Advanced', value: 'student_selector', label: 'Student Selector' },
  { group: 'Advanced', value: 'department_selector', label: 'Department Selector' },
  { group: 'Logic', value: 'conditional', label: 'Conditional Field' },
  { group: 'Logic', value: 'calculated', label: 'Calculated Field' },
  { group: 'Logic', value: 'read_only', label: 'Read-only Field' }
];

const MAX_HISTORY_ENTRIES = 50;

function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

function normalizeFieldComparable(fld: any) {
  return {
    id: fld.id,
    label: String(fld.label || '').trim(),
    fieldKey: String(fld.fieldKey || '').trim(),
    description: fld.description || '',
    fieldType: fld.fieldType || 'text',
    isCore: Boolean(fld.isCore),
    isRequired: Boolean(fld.isRequired),
    defaultValue: fld.defaultValue || '',
    validationRules: fld.validationRules || {},
    options: Array.isArray(fld.options) ? fld.options : [],
    conditionalRules: Array.isArray(fld.conditionalRules) ? fld.conditionalRules : [],
    status: fld.status || 'active',
    _isNewDraft: Boolean(fld._isNewDraft)
  };
}

function areFieldListsEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  return JSON.stringify(a.map(normalizeFieldComparable)) === JSON.stringify(b.map(normalizeFieldComparable));
}

interface AdminFormBuilderTabProps {
  token: string;
  onConfigChanged: () => Promise<void>;
}

export function AdminFormBuilderTab({ token, onConfigChanged }: AdminFormBuilderTabProps) {
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');

  // Form-level Undo / Redo draft stack (atomic stack + index)
  const [formHistoryState, setFormHistoryState] = useState<{ stack: any[][]; index: number }>({
    stack: [[]],
    index: 0
  });

  // Field Configuration Modal + Modal-level Undo / Redo stack (atomic stack + index)
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [modalHistoryState, setModalHistoryState] = useState<{ stack: any[]; index: number }>({
    stack: [],
    index: 0
  });
  const lastModalEditMeta = useRef<{ key: string; ts: number }>({ key: '', ts: 0 });

  const [compatCheck, setCompatCheck] = useState<any>(null);
  const [archiveTarget, setArchiveTarget] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingCompat, setCheckingCompat] = useState(false);

  const emptyFieldForm = () => ({
    label: '',
    fieldKey: '',
    description: '',
    fieldType: 'text',
    isRequired: false,
    defaultValue: '',
    optionsText: '',
    minVal: '',
    maxVal: '',
    conditionalRules: []
  });

  const fieldForm = modalHistoryState.stack[modalHistoryState.index] || emptyFieldForm();

  const currentForm = useMemo(
    () => forms.find((f) => f.id === selectedFormId) || null,
    [forms, selectedFormId]
  );

  const savedFields = useMemo(() => currentForm?.fields || [], [currentForm]);
  const draftFields = formHistoryState.stack[formHistoryState.index] || savedFields;

  const canUndoForm = formHistoryState.index > 0;
  const canRedoForm = formHistoryState.index < formHistoryState.stack.length - 1;
  const hasUnsavedChanges = Boolean(currentForm && !areFieldListsEqual(savedFields, draftFields));

  const canUndoModal = modalHistoryState.index > 0;
  const canRedoModal = modalHistoryState.index < modalHistoryState.stack.length - 1;

  const initializeFormHistory = useCallback((initialFields: any[]) => {
    setFormHistoryState({
      stack: [deepClone(initialFields || [])],
      index: 0
    });
  }, []);

  const loadForms = async (preserveSelectedId?: string) => {
    try {
      const res = await adminFetch('/api/admin/forms', token);
      const list = res.data || [];
      setForms(list);
      const targetId = preserveSelectedId || selectedFormId || (list[0]?.id || '');
      if (targetId) {
        const matched = list.find((f: any) => f.id === targetId) || list[0];
        if (matched) {
          setSelectedFormId(matched.id);
          initializeFormHistory(matched.fields || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load forms.');
    }
  };

  useEffect(() => {
    loadForms();
  }, [token]);

  const handleSelectForm = (form: any) => {
    if (form.id === selectedFormId) return;
    if (hasUnsavedChanges) {
      const ok = window.confirm('You have unsaved form changes. Discard unsaved edits and switch forms?');
      if (!ok) return;
    }
    setSelectedFormId(form.id);
    initializeFormHistory(form.fields || []);
    setMessage('');
    setError('');
  };

  const pushFormSnapshot = useCallback((nextFields: any[]) => {
    const cloned = deepClone(nextFields).map((f: any, idx: number) => ({
      ...f,
      displayOrder: idx + 1
    }));
    setFormHistoryState((prev) => {
      const base = prev.stack.slice(0, prev.index + 1);
      const stack = [...base, cloned].slice(-MAX_HISTORY_ENTRIES);
      return { stack, index: stack.length - 1 };
    });
  }, []);

  const handleUndoForm = useCallback(() => {
    setFormHistoryState((prev) =>
      prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev
    );
    setMessage('');
    setError('');
  }, []);

  const handleRedoForm = useCallback(() => {
    setFormHistoryState((prev) =>
      prev.index < prev.stack.length - 1 ? { ...prev, index: prev.index + 1 } : prev
    );
    setMessage('');
    setError('');
  }, []);

  const handleDiscardChanges = () => {
    initializeFormHistory(savedFields);
    setMessage('Reverted draft back to last saved form version.');
    setError('');
  };

  // Modal Undo / Redo helpers
  const updateFieldForm = (updater: any, coalesceKey?: string) => {
    const now = Date.now();
    const isCoalesceCandidate =
      Boolean(coalesceKey) &&
      lastModalEditMeta.current.key === coalesceKey &&
      now - lastModalEditMeta.current.ts < 650;

    lastModalEditMeta.current = { key: coalesceKey || '', ts: now };

    setModalHistoryState((prev) => {
      const current = prev.stack[prev.index] || emptyFieldForm();
      const nextState = typeof updater === 'function' ? updater(deepClone(current)) : { ...current, ...updater };
      if (JSON.stringify(current) === JSON.stringify(nextState)) return prev;

      if (isCoalesceCandidate && prev.index === prev.stack.length - 1 && prev.stack.length > 1) {
        const stack = [...prev.stack];
        stack[stack.length - 1] = deepClone(nextState);
        return { stack, index: prev.index };
      }

      const base = prev.stack.slice(0, prev.index + 1);
      const stack = [...base, deepClone(nextState)].slice(-MAX_HISTORY_ENTRIES);
      return { stack, index: stack.length - 1 };
    });
  };

  const handleUndoModal = useCallback(() => {
    lastModalEditMeta.current = { key: '', ts: 0 };
    setModalHistoryState((prev) =>
      prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev
    );
  }, []);

  const handleRedoModal = useCallback(() => {
    lastModalEditMeta.current = { key: '', ts: 0 };
    setModalHistoryState((prev) =>
      prev.index < prev.stack.length - 1 ? { ...prev, index: prev.index + 1 } : prev
    );
  }, []);

  const openAddField = () => {
    const initial = emptyFieldForm();
    setEditingField(null);
    setModalHistoryState({ stack: [initial], index: 0 });
    lastModalEditMeta.current = { key: '', ts: 0 };
    setCompatCheck(null);
    setError('');
    setFieldModalOpen(true);
  };

  const openEditField = (fld: any) => {
    const initial = {
      label: fld.label || '',
      fieldKey: fld.fieldKey || '',
      description: fld.description || '',
      fieldType: fld.fieldType || 'text',
      isRequired: Boolean(fld.isRequired),
      defaultValue: fld.defaultValue || '',
      optionsText: Array.isArray(fld.options) ? fld.options.join(', ') : '',
      minVal: fld.validationRules?.min ?? '',
      maxVal: fld.validationRules?.max ?? '',
      conditionalRules: deepClone(fld.conditionalRules || [])
    };
    setEditingField(fld);
    setModalHistoryState({ stack: [initial], index: 0 });
    lastModalEditMeta.current = { key: '', ts: 0 };
    setCompatCheck(null);
    setError('');
    setFieldModalOpen(true);
  };

  const addConditionRuleGroup = () => {
    const firstKey = draftFields[0]?.fieldKey || 'placementType';
    updateFieldForm((prev: any) => ({
      ...prev,
      conditionalRules: [
        ...(prev.conditionalRules || []),
        {
          id: `rule-${Date.now()}`,
          logic: 'AND',
          conditions: [{ fieldKey: firstKey, operator: 'equals', value: '' }],
          action: 'show',
          description: ''
        }
      ]
    }));
  };

  const updateRuleGroup = (rIdx: number, updates: any, coalesceKey?: string) => {
    updateFieldForm((prev: any) => {
      const next = [...(prev.conditionalRules || [])];
      next[rIdx] = { ...next[rIdx], ...updates };
      return { ...prev, conditionalRules: next };
    }, coalesceKey);
  };

  const addConditionToGroup = (rIdx: number) => {
    const firstKey = draftFields[0]?.fieldKey || 'placementType';
    updateFieldForm((prev: any) => {
      const next = [...(prev.conditionalRules || [])];
      next[rIdx].conditions = [...(next[rIdx].conditions || []), { fieldKey: firstKey, operator: 'equals', value: '' }];
      return { ...prev, conditionalRules: next };
    });
  };

  const removeRuleGroup = (rIdx: number) => {
    updateFieldForm((prev: any) => ({
      ...prev,
      conditionalRules: (prev.conditionalRules || []).filter((_: any, idx: number) => idx !== rIdx)
    }));
  };

  const handleApplyFieldToDraft = async (confirmedTypeChange = false) => {
    if (!currentForm) return;
    if (!String(fieldForm.label || '').trim()) {
      setError('Field Label is required.');
      return;
    }

    setError('');

    const options = fieldForm.optionsText
      ? fieldForm.optionsText.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    const validationRules: Record<string, any> = {};
    if (fieldForm.minVal !== '' && fieldForm.minVal !== null && fieldForm.minVal !== undefined) {
      validationRules.min = Number(fieldForm.minVal);
    }
    if (fieldForm.maxVal !== '' && fieldForm.maxVal !== null && fieldForm.maxVal !== undefined) {
      validationRules.max = Number(fieldForm.maxVal);
    }

    if (!editingField) {
      const generatedKey =
        String(fieldForm.fieldKey || '').trim() ||
        String(fieldForm.label)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') ||
        `field_${Date.now()}`;

      const newDraftField = {
        id: `__draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        _isNewDraft: true,
        label: String(fieldForm.label).trim(),
        fieldKey: generatedKey,
        description: fieldForm.description || '',
        fieldType: fieldForm.fieldType || 'text',
        isCore: false,
        isRequired: Boolean(fieldForm.isRequired),
        defaultValue: fieldForm.defaultValue || '',
        validationRules,
        options,
        conditionalRules: deepClone(fieldForm.conditionalRules || []),
        status: 'active',
        displayOrder: draftFields.length + 1
      };

      pushFormSnapshot([...draftFields, newDraftField]);
      setFieldModalOpen(false);
      setCompatCheck(null);
      setMessage(`Added '${newDraftField.label}' to form draft. Click Save to publish.`);
      return;
    }

    const originalSavedField = savedFields.find((sf: any) => sf.id === editingField.id);
    const savedType = originalSavedField ? originalSavedField.fieldType : editingField.fieldType;
    const isSavedFieldTypeChanging = !editingField._isNewDraft && fieldForm.fieldType !== savedType;

    if (isSavedFieldTypeChanging && !confirmedTypeChange) {
      setCheckingCompat(true);
      try {
        const checkRes = await adminFetch(
          `/api/admin/forms/${currentForm.id}/fields/${editingField.id}/compatibility-check`,
          token,
          {
            method: 'POST',
            body: JSON.stringify({ targetFieldType: fieldForm.fieldType })
          }
        );
        setCompatCheck(checkRes.data);
      } catch (err: any) {
        setError(err.message || 'Failed to run field type compatibility check.');
      } finally {
        setCheckingCompat(false);
      }
      return;
    }

    const updatedList = draftFields.map((fld: any) => {
      if (fld.id !== editingField.id) return fld;
      return {
        ...fld,
        label: String(fieldForm.label).trim(),
        description: fieldForm.description || '',
        fieldType: fieldForm.fieldType,
        isRequired: Boolean(fieldForm.isRequired),
        defaultValue: fieldForm.defaultValue || '',
        validationRules,
        options,
        conditionalRules: deepClone(fieldForm.conditionalRules || []),
        _confirmTypeChange: Boolean(confirmedTypeChange || fld._confirmTypeChange)
      };
    });

    pushFormSnapshot(updatedList);
    setFieldModalOpen(false);
    setCompatCheck(null);
    setMessage(`Updated '${String(fieldForm.label).trim()}' in form draft. Click Save to publish.`);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    if (!currentForm) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= draftFields.length) return;
    const reordered = deepClone(draftFields);
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    pushFormSnapshot(reordered);
    setMessage('');
  };

  const removeUnsavedDraftField = (fieldId: string) => {
    const target = draftFields.find((f: any) => f.id === fieldId);
    const next = draftFields.filter((f: any) => f.id !== fieldId);
    pushFormSnapshot(next);
    if (target) {
      setMessage(`Removed unsaved draft field '${target.label}'. You can Undo if needed.`);
    }
  };

  const handleFieldStatusChange = (field: any, status: 'active' | 'disabled' | 'archived', confirmed = false) => {
    if (!currentForm) return;
    if (status === 'archived' && !confirmed) {
      setArchiveTarget(field);
      return;
    }
    const next = draftFields.map((f: any) => (f.id === field.id ? { ...f, status } : f));
    pushFormSnapshot(next);
    setArchiveTarget(null);
    setMessage(`Staged status '${status}' for '${field.label}'. Click Save to publish.`);
  };

  const handleSaveFormChanges = useCallback(async () => {
    if (!currentForm || !hasUnsavedChanges || saving) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const savedById = new Map<string, any>();
      savedFields.forEach((sf: any) => savedById.set(sf.id, sf));

      const draftIdToServerId = new Map<string, string>();

      // 1. Create newly staged custom fields
      for (const fld of draftFields) {
        if (!fld._isNewDraft) continue;
        const createRes = await adminFetch(`/api/admin/forms/${currentForm.id}/fields`, token, {
          method: 'POST',
          body: JSON.stringify({
            label: fld.label,
            fieldKey: fld.fieldKey || undefined,
            description: fld.description,
            fieldType: fld.fieldType,
            isRequired: fld.isRequired,
            defaultValue: fld.defaultValue,
            validationRules: fld.validationRules || {},
            options: fld.options || [],
            conditionalRules: fld.conditionalRules || []
          })
        });
        const createdId = createRes?.data?.id;
        if (createdId) {
          draftIdToServerId.set(fld.id, createdId);
          if (fld.status && fld.status !== 'active') {
            await adminFetch(`/api/admin/forms/${currentForm.id}/fields/${createdId}/status`, token, {
              method: 'POST',
              body: JSON.stringify({ status: fld.status, confirmed: true })
            });
          }
        }
      }

      // 2. Update modified existing fields & status transitions
      for (const fld of draftFields) {
        if (fld._isNewDraft) continue;
        const orig = savedById.get(fld.id);
        if (!orig) continue;

        const origComp = normalizeFieldComparable({ ...orig, status: orig.status || 'active' });
        const curComp = normalizeFieldComparable({ ...fld, status: fld.status || 'active' });

        const configChanged =
          origComp.label !== curComp.label ||
          origComp.description !== curComp.description ||
          origComp.fieldType !== curComp.fieldType ||
          origComp.isRequired !== curComp.isRequired ||
          origComp.defaultValue !== curComp.defaultValue ||
          JSON.stringify(origComp.validationRules) !== JSON.stringify(curComp.validationRules) ||
          JSON.stringify(origComp.options) !== JSON.stringify(curComp.options) ||
          JSON.stringify(origComp.conditionalRules) !== JSON.stringify(curComp.conditionalRules);

        if (configChanged) {
          await adminFetch(`/api/admin/forms/${currentForm.id}/fields/${fld.id}`, token, {
            method: 'PUT',
            body: JSON.stringify({
              label: fld.label,
              description: fld.description,
              fieldType: fld.fieldType,
              isRequired: fld.isRequired,
              defaultValue: fld.defaultValue,
              validationRules: fld.validationRules || {},
              options: fld.options || [],
              conditionalRules: fld.conditionalRules || [],
              confirmTypeChange: Boolean(fld._confirmTypeChange || orig.fieldType === fld.fieldType)
            })
          });
        }

        if (origComp.status !== curComp.status) {
          await adminFetch(`/api/admin/forms/${currentForm.id}/fields/${fld.id}/status`, token, {
            method: 'POST',
            body: JSON.stringify({ status: fld.status, confirmed: true })
          });
        }
      }

      // 3. Persist final field ordering if any positions shifted
      const finalOrderedIds = draftFields
        .map((fld: any) => (fld._isNewDraft ? draftIdToServerId.get(fld.id) : fld.id))
        .filter(Boolean) as string[];
      const defaultServerOrderIds = [
        ...savedFields.map((f: any) => f.id),
        ...Array.from(draftIdToServerId.values())
      ];
      if (
        finalOrderedIds.length > 0 &&
        JSON.stringify(finalOrderedIds) !== JSON.stringify(defaultServerOrderIds)
      ) {
        await adminFetch(`/api/admin/forms/${currentForm.id}/fields/reorder`, token, {
          method: 'POST',
          body: JSON.stringify({ orderedFieldIds: finalOrderedIds })
        });
      }

      await loadForms(currentForm.id);
      await onConfigChanged();
      setMessage(`All changes to '${currentForm.formName}' saved and published.`);
    } catch (err: any) {
      setError(err.message || 'Failed to save form changes.');
    } finally {
      setSaving(false);
    }
  }, [currentForm, hasUnsavedChanges, saving, savedFields, draftFields, token, onConfigChanged]);

  // Keyboard shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+S)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTextControl = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      const key = e.key.toLowerCase();
      if (fieldModalOpen) {
        if (isTextControl) return;
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndoModal();
        } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedoModal();
        }
        return;
      }

      if (archiveTarget) return;
      if (key === 's') {
        if (hasUnsavedChanges) {
          e.preventDefault();
          handleSaveFormChanges();
        }
        return;
      }
      if (isTextControl) return;
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndoForm();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedoForm();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    fieldModalOpen,
    archiveTarget,
    hasUnsavedChanges,
    handleUndoForm,
    handleRedoForm,
    handleSaveFormChanges,
    handleUndoModal,
    handleRedoModal
  ]);

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{error}</div>}
      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Existing Module Forms Selector */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 h-fit">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Existing IQAC Forms</h3>
              <p className="text-[10px] text-slate-500">Select an existing module form to customize</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {forms.map((f) => {
              const active = f.id === selectedFormId;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectForm(f)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                    active ? 'bg-blue-50 border-blue-200 text-blue-950 font-semibold' : 'bg-white border-slate-200/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{f.formName}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">v{f.version}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Module: {f.moduleKey} &bull; {active ? draftFields.length : f.fields?.length || 0} fields
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Fields & Conditional Rules Editor */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          {currentForm ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{currentForm.formName}</h3>
                    {hasUnsavedChanges && (
                      <Badge className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                        Unsaved Edits
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{currentForm.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canUndoForm || saving}
                    onClick={handleUndoForm}
                    title="Undo last form change (Ctrl+Z)"
                    className="h-8 px-2.5 text-xs"
                  >
                    <Undo2 className="w-3.5 h-3.5 mr-1" />
                    Undo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canRedoForm || saving}
                    onClick={handleRedoForm}
                    title="Redo form change (Ctrl+Y)"
                    className="h-8 px-2.5 text-xs"
                  >
                    <Redo2 className="w-3.5 h-3.5 mr-1" />
                    Redo
                  </Button>
                  {hasUnsavedChanges && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={saving}
                      onClick={handleDiscardChanges}
                      title="Discard all unsaved edits"
                      className="h-8 px-2.5 text-xs text-slate-600"
                    >
                      Discard
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={!hasUnsavedChanges || saving}
                    onClick={handleSaveFormChanges}
                    title="Save and publish form changes (Ctrl+S)"
                    className={`h-8 px-3 text-xs ${
                      hasUnsavedChanges
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" onClick={openAddField} className="h-8 text-xs bg-[#2855B9] hover:bg-[#1e4296]">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Custom Field
                  </Button>
                </div>
              </div>

              {hasUnsavedChanges && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    You have staged edits ({formHistoryState.index} / {formHistoryState.stack.length - 1} undo step(s)). Use <strong>Undo</strong> / <strong>Redo</strong> to review or click <strong>Save</strong> to publish live.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {draftFields.map((fld: any, idx: number) => (
                  <div
                    key={fld.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      fld._isNewDraft
                        ? 'bg-blue-50/40 border-blue-200'
                        : fld.status === 'archived'
                        ? 'bg-amber-50/40 border-amber-200'
                        : fld.status === 'disabled'
                        ? 'bg-slate-50 border-slate-200 opacity-75'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{fld.label}</span>
                        {fld.isRequired && <span className="text-rose-600 font-bold">*</span>}
                        <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">{fld.fieldType}</Badge>
                        {fld._isNewDraft && (
                          <Badge className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">New Draft Field</Badge>
                        )}
                        {fld.isCore && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Core Field</Badge>}
                        {fld.status === 'archived' && <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">Archived (Historical Visible)</Badge>}
                        {fld.status === 'disabled' && <Badge variant="outline" className="text-[10px]">Disabled</Badge>}
                        {fld.conditionalRules?.length > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200">
                            <GitBranch className="w-3 h-3 mr-1" />
                            {fld.conditionalRules.length} Rule(s)
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">Key: {fld.fieldKey}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" disabled={idx === 0} onClick={() => moveField(idx, -1)} className="h-7 w-7 p-0" title="Move Up">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={idx === draftFields.length - 1} onClick={() => moveField(idx, 1)} className="h-7 w-7 p-0" title="Move Down">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditField(fld)} className="h-7 px-2 text-xs text-blue-600">
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      {fld._isNewDraft ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeUnsavedDraftField(fld.id)}
                          className="h-7 px-2 text-xs text-rose-600"
                          title="Remove unsaved custom field"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      ) : fld.status === 'archived' ? (
                        <Button size="sm" variant="ghost" onClick={() => handleFieldStatusChange(fld, 'active', true)} className="h-7 px-2 text-xs text-emerald-700">
                          <RotateCcw className="w-3 h-3 mr-1" /> Restore
                        </Button>
                      ) : !fld.isCore && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFieldStatusChange(fld, fld.status === 'disabled' ? 'active' : 'disabled', true)}
                            className="h-7 px-2 text-xs"
                          >
                            {fld.status === 'disabled' ? 'Enable' : 'Disable'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleFieldStatusChange(fld, 'archived', false)} className="h-7 px-2 text-xs text-amber-700">
                            <Archive className="w-3 h-3 mr-1" /> Archive
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Add / Edit Field + Conditional Rules Modal */}
      <Dialog open={fieldModalOpen} onOpenChange={setFieldModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              {editingField ? `Configure Field: ${editingField.label}` : 'Add Custom Field'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {error}
            </div>
          )}

          <div className="space-y-4 text-xs max-h-[72vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium mb-1">Field Label *</label>
                <Input
                  value={fieldForm.label}
                  onChange={(e) => updateFieldForm({ label: e.target.value }, 'label')}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Field Key</label>
                <Input
                  value={fieldForm.fieldKey}
                  disabled={!!editingField && !editingField._isNewDraft}
                  onChange={(e) => updateFieldForm({ fieldKey: e.target.value }, 'fieldKey')}
                  placeholder="auto-generated if empty"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Field Type</label>
                <select
                  value={fieldForm.fieldType}
                  disabled={editingField?.isCore}
                  onChange={(e) => {
                    updateFieldForm({ fieldType: e.target.value });
                    setCompatCheck(null);
                  }}
                  className="w-full h-8 rounded border border-slate-200 px-2 text-xs"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>{ft.group} — {ft.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Default Value</label>
                <Input
                  value={fieldForm.defaultValue}
                  onChange={(e) => updateFieldForm({ defaultValue: e.target.value }, 'defaultValue')}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium mb-1">Help Description</label>
                <Input
                  value={fieldForm.description}
                  onChange={(e) => updateFieldForm({ description: e.target.value }, 'description')}
                  className="h-8 text-xs"
                />
              </div>
              {['dropdown', 'multi_select', 'radio'].includes(fieldForm.fieldType) && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium mb-1">Selection Options (comma-separated)</label>
                  <Input
                    value={fieldForm.optionsText}
                    onChange={(e) => updateFieldForm({ optionsText: e.target.value }, 'optionsText')}
                    placeholder="Option A, Option B, Option C"
                    className="h-8 text-xs"
                  />
                </div>
              )}
              {fieldForm.fieldType === 'number' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Min Value</label>
                    <Input
                      type="number"
                      value={fieldForm.minVal}
                      onChange={(e) => updateFieldForm({ minVal: e.target.value }, 'minVal')}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Max Value</label>
                    <Input
                      type="number"
                      value={fieldForm.maxVal}
                      onChange={(e) => updateFieldForm({ maxVal: e.target.value }, 'maxVal')}
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldForm.isRequired}
                    onChange={(e) => updateFieldForm({ isRequired: e.target.checked })}
                  />
                  <span className="font-medium text-slate-800">Mark as Required Field</span>
                </label>
              </div>
            </div>

            {/* Compatibility Warning on Type Change */}
            {compatCheck && (
              <div className={`p-3 rounded-xl border space-y-2 ${compatCheck.compatible ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-300'}`}>
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Field Type Compatibility Check ({compatCheck.currentType} &rarr; {compatCheck.targetType})</span>
                </div>
                <p className="text-[11px] text-slate-700">{compatCheck.proposedConversion}</p>
                {compatCheck.sampleInvalidValues?.length > 0 && (
                  <p className="text-[11px] text-rose-700 font-mono">
                    Sample incompatible values: {compatCheck.sampleInvalidValues.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Advanced Conditional Rules Builder */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Advanced Conditional Rules (AND / OR Groups)</p>
                  <p className="text-[10px] text-slate-500">Enforced across Add, Edit, View & Backend API validation</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addConditionRuleGroup} className="h-7 text-[11px]">
                  <Plus className="w-3 h-3 mr-1" /> Add Rule Group
                </Button>
              </div>

              {(fieldForm.conditionalRules || []).map((rule: any, rIdx: number) => (
                <div key={rIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold">Match</span>
                      <select
                        value={rule.logic}
                        onChange={(e) => updateRuleGroup(rIdx, { logic: e.target.value })}
                        className="h-7 rounded border border-slate-200 bg-white px-2 text-[11px]"
                      >
                        <option value="AND">ALL conditions (AND)</option>
                        <option value="OR">ANY condition (OR)</option>
                      </select>
                      <span className="text-[11px] font-semibold">&rarr; Action:</span>
                      <select
                        value={rule.action}
                        onChange={(e) => updateRuleGroup(rIdx, { action: e.target.value })}
                        className="h-7 rounded border border-slate-200 bg-white px-2 text-[11px]"
                      >
                        <option value="show">Show Field</option>
                        <option value="hide">Hide Field</option>
                        <option value="require">Make Required</option>
                        <option value="optional">Make Optional</option>
                        <option value="readonly">Make Read-Only</option>
                      </select>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeRuleGroup(rIdx)} className="h-7 px-2 text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {(rule.conditions || []).map((cond: any, cIdx: number) => (
                    <div key={cIdx} className="grid grid-cols-3 gap-2">
                      <select
                        value={cond.fieldKey}
                        onChange={(e) => {
                          const nextConds = [...rule.conditions];
                          nextConds[cIdx] = { ...cond, fieldKey: e.target.value };
                          updateRuleGroup(rIdx, { conditions: nextConds });
                        }}
                        className="h-7 rounded border border-slate-200 bg-white px-2 text-[11px]"
                      >
                        {draftFields.map((f: any) => (
                          <option key={f.fieldKey} value={f.fieldKey}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          const nextConds = [...rule.conditions];
                          nextConds[cIdx] = { ...cond, operator: e.target.value };
                          updateRuleGroup(rIdx, { conditions: nextConds });
                        }}
                        className="h-7 rounded border border-slate-200 bg-white px-2 text-[11px]"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="in">In List (csv)</option>
                        <option value="is_empty">Is Empty</option>
                        <option value="is_not_empty">Is Not Empty</option>
                      </select>
                      <Input
                        value={cond.value}
                        onChange={(e) => {
                          const nextConds = [...rule.conditions];
                          nextConds[cIdx] = { ...cond, value: e.target.value };
                          updateRuleGroup(rIdx, { conditions: nextConds }, `cond_${rIdx}_${cIdx}`);
                        }}
                        placeholder="Value..."
                        className="h-7 text-[11px]"
                      />
                    </div>
                  ))}
                  <button type="button" onClick={() => addConditionToGroup(rIdx)} className="text-[11px] text-blue-600 hover:underline">
                    + Add Condition
                  </button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canUndoModal || checkingCompat}
                onClick={handleUndoModal}
                title="Undo last change in field editor"
                className="text-xs h-8 px-2.5"
              >
                <Undo2 className="w-3.5 h-3.5 mr-1" />
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canRedoModal || checkingCompat}
                onClick={handleRedoModal}
                title="Redo change in field editor"
                className="text-xs h-8 px-2.5"
              >
                <Redo2 className="w-3.5 h-3.5 mr-1" />
                Redo
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setFieldModalOpen(false)} className="text-xs h-8">
                Cancel
              </Button>
              {compatCheck ? (
                <Button
                  size="sm"
                  disabled={checkingCompat}
                  onClick={() => handleApplyFieldToDraft(true)}
                  className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Confirm Type Change &amp; Apply
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={checkingCompat}
                  onClick={() => handleApplyFieldToDraft(false)}
                  className="text-xs h-8 bg-[#2855B9] hover:bg-[#1e4296]"
                >
                  {checkingCompat ? 'Checking...' : 'Apply Field'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Modal */}
      <Dialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-600" />
              <span>Archive Form Field: {archiveTarget?.label}</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-600 leading-relaxed">
            Archiving removes <strong>{archiveTarget?.label}</strong> from all new-entry forms while strictly preserving existing historical values, historical record rendering, and historical exports. You can restore this field at any time.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setArchiveTarget(null)} className="text-xs">Cancel</Button>
            <Button
              size="sm"
              onClick={() => handleFieldStatusChange(archiveTarget, 'archived', true)}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirm Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
