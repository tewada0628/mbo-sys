'use client';

import type { GoalSetStatus } from '@prisma/client';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApprovalStepIndicator } from '@/components/goals/ApprovalStepIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type GoalSetListRow = {
  id: string;
  employeeName: string;
  employeeCode: string;
  organizationName: string;
  grade: number;
  position: string;
  evaluationPeriodName: string;
  status: GoalSetStatus;
  isMboTarget: boolean;
  goalTitles: string[];
  selfReviewSubmitted: boolean | null;
  managerReviewSubmitted: boolean | null;
  mboScore: number | null;
  canManagerReview: boolean;
};

const reviewBadgeClass = {
  submitted: 'border-green-200 bg-green-50 text-green-800',
  pending: 'border-gray-200 bg-gray-50 text-gray-700',
  none: 'border-gray-200 bg-white text-gray-500',
};

function ReviewStatusBadge({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <Badge variant="outline" className={reviewBadgeClass.none}>
        対象外
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(value ? reviewBadgeClass.submitted : reviewBadgeClass.pending)}
    >
      {value ? '提出済み' : '未提出'}
    </Badge>
  );
}

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('a,button,input,select,textarea'));
}

export function GoalSetListTable({ rows }: { rows: GoalSetListRow[] }) {
  const router = useRouter();

  const navigateToDetail = (goalSetId: string) => {
    router.push(`/goals/${goalSetId}`);
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[180px] px-4">社員名</TableHead>
            <TableHead className="w-[150px]">等級・役職</TableHead>
            <TableHead className="min-w-[220px]">目標タイトル</TableHead>
            <TableHead className="w-[260px]">承認ステップ</TableHead>
            <TableHead className="w-[96px] text-center">自己評価</TableHead>
            <TableHead className="w-[96px] text-center">上長評価</TableHead>
            <TableHead className="w-[96px] text-right">MBO</TableHead>
            <TableHead className="w-[104px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              role="link"
              tabIndex={0}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={(event) => {
                if (!isInteractiveElement(event.target)) {
                  navigateToDetail(row.id);
                }
              }}
              onKeyDown={(event) => {
                if (!isInteractiveElement(event.target) && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  navigateToDetail(row.id);
                }
              }}
            >
              <TableCell className="px-4">
                <div className="font-medium text-foreground">{row.employeeName}</div>
                <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium">等級{row.grade}</div>
                <div className="text-xs text-muted-foreground">{row.position}</div>
              </TableCell>
              <TableCell className="max-w-[360px] whitespace-normal">
                <div className="space-y-1">
                  {row.goalTitles.length > 0 ? (
                    row.goalTitles.map((title, index) => (
                      <p key={`${row.id}-${index}`} className="line-clamp-1 text-sm">
                        {title}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">目標未入力</p>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.organizationName} / {row.evaluationPeriodName}
                </div>
              </TableCell>
              <TableCell>
                <ApprovalStepIndicator
                  status={row.status}
                  isMboTarget={row.isMboTarget}
                  variant="compact"
                />
              </TableCell>
              <TableCell className="text-center">
                <ReviewStatusBadge value={row.selfReviewSubmitted} />
              </TableCell>
              <TableCell className="text-center">
                <ReviewStatusBadge value={row.managerReviewSubmitted} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {row.mboScore === null ? '-' : row.mboScore.toFixed(1)}
              </TableCell>
              <TableCell className="text-right">
                {row.canManagerReview ? (
                  <Button
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/goals/${row.id}/manager-review`);
                    }}
                  >
                    上長評価
                  </Button>
                ) : (
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
