'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MeetingRejectModal } from '@/components/approvals/MeetingRejectModal';

interface MeetingRejectActionProps {
  goalSetId: string;
  employeeName: string;
}

export function MeetingRejectAction({ goalSetId, employeeName }: MeetingRejectActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (note: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/goals/${goalSetId}/meeting-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionNote: note }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '差し戻しに失敗しました。');
      }

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : '差し戻しに失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setIsOpen(true)}>
        最終承認後差し戻し
      </Button>
      <MeetingRejectModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        employeeName={employeeName}
      />
    </>
  );
}
