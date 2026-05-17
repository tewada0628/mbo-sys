'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MeetingRejectModal } from '@/components/approvals/MeetingRejectModal';

interface SavedGoalRejectActionProps {
  goalSetId: string;
  employeeName: string;
}

export function SavedGoalRejectAction({ goalSetId, employeeName }: SavedGoalRejectActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (note: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/goals/${goalSetId}/saved-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionNote: note }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '修正依頼に失敗しました。');
      }

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : '修正依頼に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setIsOpen(true)}>
        修正依頼
      </Button>
      <MeetingRejectModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        employeeName={employeeName}
        title="保存済み目標の修正依頼"
        description={`${employeeName}さんの保存済み目標に修正が必要な場合、理由を入力して差し戻します。社員に通知され、社員は目標を編集して再保存できます。`}
        noteLabel="修正依頼の理由（必須）"
        submitLabel="修正依頼を送る"
      />
    </>
  );
}
