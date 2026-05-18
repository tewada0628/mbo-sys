'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GoalSetStatus } from '@prisma/client';

type Period = { id: string; name: string };

const STATUS_OPTIONS: { value: GoalSetStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'すべて' },
  { value: 'DRAFT', label: 'ドラフト' },
  { value: 'SAVED', label: '保存済み' },
  { value: 'PENDING_MANAGER', label: '上長承認待ち' },
  { value: 'PENDING_DIVISION', label: '事業部長承認待ち' },
  { value: 'PENDING_EXECUTIVE', label: '経営承認待ち' },
  { value: 'APPROVED', label: '承認済み' },
  { value: 'REJECTED', label: '差し戻し' },
  { value: 'MEETING_REJECTED', label: 'すり合わせ差し戻し' },
];

type Props = {
  periods: Period[];
  selectedPeriodId: string;
  selectedStatus: string;
};

export function AllGoalsFilter({ periods, selectedPeriodId, selectedStatus }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'ALL' || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/goals/all?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">評価期</span>
        <Select
          value={selectedPeriodId || 'ALL'}
          onValueChange={(v) => updateParam('periodId', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="評価期を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">すべての評価期</SelectItem>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">ステータス</span>
        <Select
          value={selectedStatus || 'ALL'}
          onValueChange={(v) => updateParam('status', v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="ステータスを選択" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
