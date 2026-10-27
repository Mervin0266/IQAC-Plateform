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
  const [adminPassword, setAdminPassword] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // HARD DEFENSE: Only Admin in non-production local development environment may see or invoke database reset
  if (import.meta.env.PROD || !user || user.role !== 'admin') {
    return null;
  }

  const handleClear = async () => {
    if (confirmText.toUpperCase() !== 'CONFIRM_RESET') {
      alert('Please type "CONFIRM_RESET" to confirm resetting the disposable test database.');
      return;
    }
    if (!adminPassword || adminPassword.trim() === '') {
      alert('Please enter your administrator password for re-authentication.');
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/system/clear-database`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminPassword,
          confirmation: 'CONFIRM_DISPOSABLE_DATABASE_RESET'
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Disposable test database reset successfully. Audit logs and accreditation frameworks were safely preserved.');
        setIsOpen(false);
        setConfirmText('');
        setAdminPassword('');
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
        <span>Reset Disposable Test DB</span>
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
              <span>Reset Disposable Test Database</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              This action will reset transactional test data in this <strong>disposable local environment</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[11px] text-amber-800 font-medium">
              ℹ️ Security Preservation: <strong>Audit logs and accreditation frameworks are permanently preserved</strong> and will not be wiped.
            </div>

            <div className="pt-2 space-y-3">
              <div>
                <Label className="text-xs font-bold text-gray-700 block mb-1">
                  Administrator Password (Re-authentication):
                </Label>
                <Input
                  type="password"
                  placeholder="Enter your admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full text-xs border-red-300 focus:ring-red-500"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700 block mb-1">
                  Type <span className="text-red-600 font-mono">CONFIRM_RESET</span> to confirm:
                </Label>
                <Input
                  type="text"
                  placeholder="CONFIRM_RESET"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full text-xs uppercase font-mono tracking-widest border-red-300 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsOpen(false); setConfirmText(''); setAdminPassword(''); }}
              className="text-xs"
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleClear}
              disabled={confirmText.toUpperCase() !== 'CONFIRM_RESET' || !adminPassword || isClearing}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {isClearing ? 'Resetting Database...' : 'Execute Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
