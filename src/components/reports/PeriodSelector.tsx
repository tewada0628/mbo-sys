'use client';

import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Period = { id: string; name: string };

export function PeriodSelector({
  periods,
  selectedId,
}: {
  periods: Period[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={selectedId}
      onValueChange={(v) => router.push(`/reports/summary?periodId=${v}`)}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="評価期を選択" />
      </SelectTrigger>
      <SelectContent>
        {periods.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
