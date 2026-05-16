import { GoalSetStatus } from '@prisma/client';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalStepIndicatorProps {
  status: GoalSetStatus;
  isRevisionPending?: boolean;
}

const steps = [
  { id: 'manager', label: '上長承認', pendingStatus: 'PENDING_MANAGER' },
  { id: 'division', label: '事業部長承認', pendingStatus: 'PENDING_DIVISION' },
  { id: 'executive', label: '役員承認', pendingStatus: 'PENDING_EXECUTIVE' },
  { id: 'approved', label: '承認完了', pendingStatus: 'APPROVED' },
];

export function ApprovalStepIndicator({ status, isRevisionPending }: ApprovalStepIndicatorProps) {
  // Return null for statuses that are not in the approval flow yet
  if (status === 'DRAFT' || status === 'SAVED' || status === 'REJECTED' || status === 'MEETING_REJECTED') {
    return null;
  }

  const currentStepIndex = 
    (status === 'APPROVED' && !isRevisionPending) ? 4 :
    status === 'PENDING_EXECUTIVE' ? 2 :
    status === 'PENDING_DIVISION' ? 1 : 0;

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
