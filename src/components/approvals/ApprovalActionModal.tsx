'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ApprovalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'approve' | 'reject' | null;
  onSubmit: (note?: string) => Promise<void>;
  isSubmitting: boolean;
  employeeName: string;
}

export function ApprovalActionModal({
  isOpen,
  onClose,
  actionType,
  onSubmit,
  isSubmitting,
  employeeName,
}: ApprovalActionModalProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (actionType === 'reject' && !note.trim()) {
      setError('差し戻し理由は必須です。');
      return;
    }
    setError('');
    await onSubmit(actionType === 'reject' ? note : undefined);
    setNote('');
  };

  const isApprove = actionType === 'approve';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setNote('');
        setError('');
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {employeeName}さんの目標設定を{isApprove ? '承認' : '差し戻し'}しますか？
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? '承認すると、次の承認ステップに進むか、または確定されます。'
              : '差し戻すと、申請者に差し戻し理由が通知され、再提出が必要になります。'}
          </DialogDescription>
        </DialogHeader>

        {!isApprove && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="note" className="text-destructive font-semibold">
                差し戻し理由（必須）
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="差し戻す理由や修正指示を具体的に記入してください。"
                className={error ? 'border-destructive' : ''}
                rows={4}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '処理中...' : isApprove ? '承認する' : '差し戻す'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
