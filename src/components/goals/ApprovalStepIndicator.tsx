import type { GoalSetStatus } from '@prisma/client';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalStepIndicatorProps {
  status: GoalSetStatus;
  isRevisionPending?: boolean;
  isMboTarget?: boolean;
  variant?: 'full' | 'compact';
}

const steps = [
  { id: 'self', label: '本人入力' },
  { id: 'manager', label: '上長承認' },
  { id: 'division', label: '事業部長承認' },
  { id: 'executive', label: '経営承認' },
  { id: 'approved', label: '確定' },
];

const STATUS_LABELS: Record<GoalSetStatus, string> = {
  DRAFT: '下書き',
  SAVED: '保存済み',
  PENDING_MANAGER: '上長承認待ち',
  PENDING_DIVISION: '事業部長承認待ち',
  PENDING_EXECUTIVE: '経営承認待ち',
  APPROVED: '承認済み',
  REJECTED: '差し戻し',
  MEETING_REJECTED: '最終承認後差し戻し',
};

const STATUS_COLORS: Record<GoalSetStatus, string> = {
  DRAFT: 'border-gray-200 bg-gray-50 text-gray-700',
  SAVED: 'border-gray-200 bg-gray-50 text-gray-700',
  PENDING_MANAGER: 'border-amber-200 bg-amber-50 text-amber-800',
  PENDING_DIVISION: 'border-amber-200 bg-amber-50 text-amber-800',
  PENDING_EXECUTIVE: 'border-amber-200 bg-amber-50 text-amber-800',
  APPROVED: 'border-green-200 bg-green-50 text-green-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
  MEETING_REJECTED: 'border-orange-200 bg-orange-50 text-orange-800',
};

function getCurrentStepIndex(status: GoalSetStatus, isRevisionPending?: boolean) {
  if (status === 'APPROVED' && !isRevisionPending) return 4;
  if (status === 'PENDING_EXECUTIVE') return 3;
  if (status === 'PENDING_DIVISION') return 2;
  if (status === 'PENDING_MANAGER') return 1;
  return 0;
}

function CompactApprovalStepIndicator({
  status,
  isRevisionPending,
  isMboTarget,
}: Required<Pick<ApprovalStepIndicatorProps, 'status' | 'isMboTarget'>> &
  Pick<ApprovalStepIndicatorProps, 'isRevisionPending'>) {
  const currentStepIndex = getCurrentStepIndex(status, isRevisionPending);
  const currentLabel = status === 'MEETING_REJECTED' ? '最終承認後差し戻し' : steps[currentStepIndex].label;
  const showSteps = isMboTarget && status !== 'SAVED' && status !== 'REJECTED' && status !== 'MEETING_REJECTED';

  return (
    <div className="min-w-[220px] space-y-1.5" title={`${STATUS_LABELS[status]}: ${currentLabel}`}>
      <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_COLORS[status])}>
        {STATUS_LABELS[status]}
      </span>
      {showSteps ? (
        <div className="flex items-center gap-1" aria-label={`承認ステップ: ${currentLabel}`}>
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex || (status === 'APPROVED' && !isRevisionPending);
            const isCurrent = index === currentStepIndex && status !== 'APPROVED';

            return (
              <div key={step.id} className="flex items-center gap-1">
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                    isCompleted ? 'border-primary bg-primary text-primary-foreground' :
                    isCurrent ? 'border-primary bg-background text-primary' :
                    'border-muted bg-background text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="size-3" /> : index + 1}
                </span>
                {index < steps.length - 1 && <span className="h-px w-4 bg-border" />}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{currentLabel}</p>
      )}
    </div>
  );
}

export function ApprovalStepIndicator({
  status,
  isRevisionPending,
  isMboTarget = true,
  variant = 'full',
}: ApprovalStepIndicatorProps) {
  if (variant === 'compact') {
    return (
      <CompactApprovalStepIndicator
        status={status}
        isRevisionPending={isRevisionPending}
        isMboTarget={isMboTarget}
      />
    );
  }

  // Return null for statuses that are not in the approval flow yet
  if (status === 'DRAFT' || status === 'SAVED' || status === 'REJECTED' || status === 'MEETING_REJECTED') {
    return null;
  }

  const currentStepIndex = getCurrentStepIndex(status, isRevisionPending);

  return (
    <div className="w-full py-4 px-2">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-500"
          style={{ width: `${Math.min((currentStepIndex / (steps.length - 1)) * 100, 100)}%` }}
        />
        
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex || (status === 'APPROVED' && !isRevisionPending);
          const isCurrent = index === currentStepIndex && (status !== 'APPROVED' || isRevisionPending);
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 bg-background px-2">
              <div 
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isCompleted ? "border-primary bg-primary text-primary-foreground" :
                  isCurrent ? "border-primary bg-background text-primary" :
                  "border-muted bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={cn(
                "text-xs font-medium",
                isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
