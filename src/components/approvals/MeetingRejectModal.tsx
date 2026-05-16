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

interface MeetingRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
  isSubmitting: boolean;
  employeeName: string;
}

export function MeetingRejectModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  employeeName,
}: MeetingRejectModalProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!note.trim()) {
      setError('差し戻し理由（評価会議での決定事項など）は必須です。');
      return;
    }
    setError('');
    await onSubmit(note);
    setNote('');
  };

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
          <DialogTitle className="text-destructive">
            最終承認後の差し戻し
          </DialogTitle>
          <DialogDescription>
            評価会議等での決定により、{employeeName}さんの承認済み目標を差し戻します。
            この操作により、目標ステータスは「最終承認後差し戻し」となり、社員に通知されます。
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '処理中...' : '差し戻しを実行'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
