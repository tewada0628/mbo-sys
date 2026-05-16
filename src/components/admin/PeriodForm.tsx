'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type PeriodStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type PhaseType = 'GOAL_SETTING' | 'MIDTERM' | 'DEGREE_360' | 'SELF_REVIEW' | 'MANAGER_REVIEW' | 'ADJUSTMENT';

type PeriodPhase = {
  id: string;
  phaseType: PhaseType;
  startDate: string;
  endDate: string;
};

type PeriodItem = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  organizationCount: number;
  membershipCount: number;
  goalSetCount: number;
  phases: PeriodPhase[];
};

type PeriodsResponse = {
  items: PeriodItem[];
};

type PeriodDraft = {
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  phases: PeriodPhase[];
};

const phaseLabels: Record<PhaseType, string> = {
  GOAL_SETTING: '目標設定',
  MIDTERM: '中間振り返り',
  DEGREE_360: '360度評価',
  SELF_REVIEW: '自己評価',
  MANAGER_REVIEW: '上長評価',
  ADJUSTMENT: '評価調整・確定',
};

const statusLabels: Record<PeriodStatus, string> = {
  ACTIVE: '有効',
  INACTIVE: '無効',
  ARCHIVED: 'アーカイブ',
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('評価期一覧の取得に失敗しました。');
  return res.json() as Promise<PeriodsResponse>;
};

function emptyCreateForm() {
  const year = new Date().getFullYear();
  return {
    name: `${year}年度`,
    startDate: `${year}-04-01`,
    endDate: `${year + 1}-03-31`,
    status: 'INACTIVE' as PeriodStatus,
  };
}

function toDraft(period: PeriodItem): PeriodDraft {
  return {
    name: period.name,
    startDate: period.startDate,
    endDate: period.endDate,
    status: period.status,
    phases: period.phases.map((phase) => ({ ...phase })),
  };
}

export function PeriodForm() {
  const { data, error, mutate } = useSWR<PeriodsResponse>('/api/admin/periods', fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [drafts, setDrafts] = useState<Record<string, PeriodDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const rows = useMemo(() => (
    (data?.items ?? []).map((period) => ({
      ...period,
      draft: drafts[period.id] ?? toDraft(period),
    }))
  ), [data?.items, drafts]);

  const updateDraft = (period: PeriodItem, updater: (draft: PeriodDraft) => PeriodDraft) => {
    setDrafts((current) => ({
      ...current,
      [period.id]: updater(current[period.id] ?? toDraft(period)),
    }));
  };

  const createPeriod = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '評価期の作成に失敗しました。');
      }
      await mutate();
      setCreateOpen(false);
      setCreateForm(emptyCreateForm());
    } catch (err) {
      alert(err instanceof Error ? err.message : '評価期の作成に失敗しました。');
    } finally {
      setIsCreating(false);
    }
  };

  const savePeriod = async (period: PeriodItem, draft: PeriodDraft) => {
    setSavingId(period.id);
    try {
      const res = await fetch(`/api/admin/periods/${period.id}/phases`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '評価期の保存に失敗しました。');
      }
      await mutate();
      setDrafts((current) => {
        const next = { ...current };
        delete next[period.id];
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : '評価期の保存に失敗しました。');
    } finally {
      setSavingId(null);
    }
  };

  const deletePeriod = async (period: PeriodItem) => {
    if (period.goalSetCount > 0) {
      alert('目標セットが紐づいている評価期は削除できません。');
      return;
    }
    if (period.membershipCount > 0) {
      alert('所属履歴が紐づいている評価期は削除できません。先に社員管理で所属を移してください。');
      return;
    }

    const confirmed = confirm(
      `${period.name} を削除します。\n紐づくフェーズと組織スナップショットも削除されます。この操作は元に戻せません。`,
    );
    if (!confirmed) return;

    setDeletingId(period.id);
    try {
      const res = await fetch(`/api/admin/periods/${period.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '評価期の削除に失敗しました。');
      }
      await mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '評価期の削除に失敗しました。');
    } finally {
      setDeletingId(null);
    }
  };

  if (error) return <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">評価期一覧の取得に失敗しました。</div>;
  if (!data) return <div className="rounded-md border bg-white p-4 text-sm text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              評価期を追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>評価期を追加</DialogTitle>
              <DialogDescription>評価期を作成すると、標準フェーズが自動作成されます。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="period-name">名称</Label>
                <Input id="period-name" value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="period-start">開始日</Label>
                  <Input id="period-start" type="date" value={createForm.startDate} onChange={(event) => setCreateForm((current) => ({ ...current, startDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-end">終了日</Label>
                  <Input id="period-end" type="date" value={createForm.endDate} onChange={(event) => setCreateForm((current) => ({ ...current, endDate: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>状態</Label>
                <Select value={createForm.status} onValueChange={(value) => setCreateForm((current) => ({ ...current, status: value as PeriodStatus }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createPeriod} disabled={isCreating}>{isCreating ? '作成中...' : '作成'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {rows.map((period) => (
          <section key={period.id} className="rounded-lg border bg-white">
            <div className="border-b p-4">
              <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_160px_auto]">
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input value={period.draft.name} onChange={(event) => updateDraft(period, (draft) => ({ ...draft, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>開始日</Label>
                  <Input type="date" value={period.draft.startDate} onChange={(event) => updateDraft(period, (draft) => ({ ...draft, startDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>終了日</Label>
                  <Input type="date" value={period.draft.endDate} onChange={(event) => updateDraft(period, (draft) => ({ ...draft, endDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>状態</Label>
                  <Select value={period.draft.status} onValueChange={(value) => updateDraft(period, (draft) => ({ ...draft, status: value as PeriodStatus }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              <div className="flex items-end justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => deletePeriod(period)}
                  disabled={period.goalSetCount > 0 || period.membershipCount > 0 || deletingId === period.id}
                  title={
                    period.goalSetCount > 0
                      ? '目標セットがある評価期は削除できません'
                      : period.membershipCount > 0
                        ? '所属履歴がある評価期は削除できません'
                        : undefined
                  }
                >
                  <Trash2 className="size-4" />
                  {deletingId === period.id ? '削除中...' : '削除'}
                </Button>
                <Button onClick={() => savePeriod(period, period.draft)} disabled={savingId === period.id}>
                  {savingId === period.id ? '保存中...' : '保存'}
                </Button>
                </div>
              </div>
              <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">組織 {period.organizationCount}</Badge>
                <Badge variant="outline">所属 {period.membershipCount}</Badge>
                <Badge variant="outline">目標セット {period.goalSetCount}</Badge>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4">フェーズ</TableHead>
                  <TableHead>開始日</TableHead>
                  <TableHead>終了日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {period.draft.phases.map((phase, index) => (
                  <TableRow key={phase.id || phase.phaseType}>
                    <TableCell className="px-4 font-medium">{phaseLabels[phase.phaseType]}</TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={phase.startDate}
                        onChange={(event) => updateDraft(period, (draft) => ({
                          ...draft,
                          phases: draft.phases.map((item, itemIndex) => itemIndex === index ? { ...item, startDate: event.target.value } : item),
                        }))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={phase.endDate}
                        onChange={(event) => updateDraft(period, (draft) => ({
                          ...draft,
                          phases: draft.phases.map((item, itemIndex) => itemIndex === index ? { ...item, endDate: event.target.value } : item),
                        }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))}
      </div>
    </div>
  );
}
