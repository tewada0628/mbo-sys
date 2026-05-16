'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApprovalActionModal } from '@/components/approvals/ApprovalActionModal';
import { ApprovalRequest, Employee } from '@prisma/client';
import { useRouter } from 'next/navigation';

interface GoalApprovalActionsProps {
  request: ApprovalRequest;
  requesterName: string;
}

export function GoalApprovalActions({ request, requesterName }: GoalApprovalActionsProps) {
  const router = useRouter();
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (type: 'approve' | 'reject') => {
    setActionType(type);
  };

  const closeModal = () => {
    setActionType(null);
  };

  const handleActionSubmit = async (note?: string) => {
    if (!actionType) return;
    
    setIsSubmitting(true);
    try {
      const endpoint = `/api/approvals/${request.id}/${actionType}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionNote: note }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '操作に失敗しました。');
      }

      alert(actionType === 'approve' ? '承認しました。' : '差し戻しました。');
      
      closeModal();
      router.refresh();
      router.push('/approvals');
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => openModal('approve')}>
          承認する
        </Button>
        <Button variant="destructive" onClick={() => openModal('reject')}>
          差し戻し
        </Button>
      </div>

      <ApprovalActionModal
        isOpen={!!actionType}
        onClose={closeModal}
        actionType={actionType}
        onSubmit={handleActionSubmit}
        isSubmitting={isSubmitting}
        employeeName={requesterName}
      />
    </>
  );
}
