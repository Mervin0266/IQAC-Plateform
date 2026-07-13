import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface EditRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  achievementId: string;
  achievementTitle: string;
  token: string;
  onSuccess: () => void;
}

export function EditRequestDialog({
  isOpen,
  onClose,
  achievementId,
  achievementTitle,
  token,
  onSuccess
}: EditRequestDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for your edit request.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/edit-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          achievementId,
          reason
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
        setReason('');
      } else {
        setError(data.message || 'Failed to submit edit request.');
      }
    } catch (err) {
      console.error('Edit request error:', err);
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">Request Edit Permissions</DialogTitle>
          <DialogDescription className="sr-only">
            Submit an edit request for the selected achievement record.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-xs font-medium border border-red-200">
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Achievement Title</p>
            <p className="text-sm font-semibold text-gray-800">{achievementTitle}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs font-medium text-gray-700">
              Reason for Modification Request
            </Label>
            <Textarea
              id="reason"
              placeholder="Describe the changes you need to make (e.g., correcting spelling, adding missing participants, updating dates, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] text-sm"
              disabled={loading}
            />
            <p className="text-[11px] text-gray-400">
              This request will be sent to your Department Coordinator and Head of Department for review.
            </p>
          </div>

          <DialogFooter className="flex space-x-2 justify-end pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-900 text-white hover:bg-blue-800 text-xs"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
