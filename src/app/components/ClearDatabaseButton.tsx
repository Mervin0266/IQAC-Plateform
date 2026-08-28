import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ClearDatabaseButtonProps {
  onSuccess?: () => void;
  className?: string;
}

export function ClearDatabaseButton({ onSuccess, className }: ClearDatabaseButtonProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleClear = async () => {
    if (confirmText.toUpperCase() !== 'CLEAR') {
      alert('Please type "CLEAR" to confirm wiping the entire database.');
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/system/clear-database`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Entire database cleared successfully! The website is now clean without initial data.');
        setIsOpen(false);
        setConfirmText('');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        alert(data.message || 'Failed to clear database.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server to clear database.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={className || 'bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center space-x-2 px-3 py-1.5 shadow-sm rounded-lg'}
      >
        <Trash2 className="w-4 h-4" />
        <span>Clear Entire Database</span>
      </Button>

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white p-4 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-red-200">
          <DialogHeader className="pb-3 border-b border-gray-150">
            <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Clear Entire Database</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              This action will <strong>permanently delete all data</strong> from the database, including:
            </p>
            <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
              <li>Student & Faculty Directories</li>
              <li>Departmental Activities & Matrix Tables</li>
              <li>Achievements, Publications, Patents & Research Metrics</li>
              <li>Placements & Consultancy Projects</li>
              <li>Departments, Schools, Campuses & Programs</li>
            </ul>

            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-[11px] text-red-800 font-semibold">
              ⚠️ The website will be 100% clean without any initial seed data.
            </div>

            <div className="pt-2">
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                Type <span className="text-red-600 font-mono">CLEAR</span> to confirm:
              </Label>
              <Input
                type="text"
                placeholder="CLEAR"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full text-xs uppercase font-mono tracking-widest border-red-300 focus:ring-red-500"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsOpen(false); setConfirmText(''); }}
              className="text-xs"
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleClear}
              disabled={confirmText.toUpperCase() !== 'CLEAR' || isClearing}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {isClearing ? 'Clearing Database...' : 'Wipe & Clear Database'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
