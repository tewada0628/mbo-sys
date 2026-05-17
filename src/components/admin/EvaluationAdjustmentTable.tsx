'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Upload } from 'lucide-react';
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

type FinalGrade = 'S' | 'A' | 'B' | 'C' | 'D';

type EvaluationItem = {
  goalSetId: string;
  employeeCode: string;
  employeeName: string;
  evaluationPeriodName: string;
  grade: number;
  mboScore: number | null;
  degree360AchievementBonus: number;
  degree360CredoBonus: number;
  totalScore: number | null;
  isComplete: boolean;
  finalGrade: FinalGrade | null;
  adjustmentNote: string;
  confirmedAt: string | null;
};

type PeriodOption = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};

type EvaluationResponse = {
  periods: PeriodOption[];
  items: EvaluationItem[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('評価データの取得に失敗しました。');
  return res.json() as Promise<EvaluationResponse>;
};

const gradeOptions: FinalGrade[] = ['S', 'A', 'B', 'C', 'D'];

const formatScore = (score: number | null) => {
  return score == null ? '-' : score.toFixed(2);
};

export function EvaluationAdjustmentTable() {
  const { data, error, mutate } = useSWR<EvaluationResponse>('/api/admin/evaluations', fetcher);
  const [savingGoalSetId, setSavingGoalSetId] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, FinalGrade | 'UNSET'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importCsvText, setImportCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((item) => ({
      ...item,
      selectedGrade: grades[item.goalSetId] ?? item.finalGrade ?? 'UNSET',
      adjustmentNoteDraft: notes[item.goalSetId] ?? item.adjustmentNote ?? '',
    }));
  }, [data?.items, grades, notes]);
  const activePeriodId = selectedPeriodId || data?.periods.find((period) => period.status === 'ACTIVE')?.id || data?.periods[0]?.id || '';

  const handleSave = async (item: EvaluationItem) => {
    const selectedGrade = grades[item.goalSetId] ?? item.finalGrade ?? 'UNSET';
    if (selectedGrade === 'UNSET') {
      alert('総合評価を選択してください。');
      return;
    }

    setSavingGoalSetId(item.goalSetId);
    try {
      const res = await fetch(`/api/admin/evaluations/${item.goalSetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalGrade: selectedGrade,
          adjustmentNote: notes[item.goalSetId] ?? item.adjustmentNote ?? '',
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '評価確定に失敗しました。');
      }

      await mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '評価確定に失敗しました。');
    } finally {
      setSavingGoalSetId(null);
    }
  };

  const handleImport = async () => {
    if (!activePeriodId) {
      alert('評価期を選択してください。');
      return;
    }
    if (!importCsvText.trim()) {
      alert('CSVファイルを選択してください。');
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch('/api/admin/degree360-scores/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationPeriodId: activePeriodId,
          csvText: importCsvText,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || '360度スコアの取込に失敗しました。');
      }
      alert(`360度スコアを取り込みました。新規: ${body.createdCount}件 / 更新: ${body.updatedCount}件`);
      setImportOpen(false);
      setImportFileName('');
      setImportCsvText('');
      await mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '360度スコアの取込に失敗しました。');
    } finally {
      setIsImporting(false);
    }
  };

  if (error) {
    return <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">評価データの取得に失敗しました。</div>;
  }

  if (!data) {
    return <div className="rounded-md border bg-white p-4 text-sm text-muted-foreground">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border bg-white p-4">
        <div className="space-y-2">
          <Label>360度スコア取込対象の評価期</Label>
          <Select value={activePeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="評価期を選択" /></SelectTrigger>
            <SelectContent>
              {data.periods.map((period) => (
                <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="size-4" />
              360度スコアCSV取込
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>360度スコアCSV取込</DialogTitle>
              <DialogDescription>
                employee_code, achievement_score, credo_score, is_top20_achievement を含むCSVを取り込みます。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>CSVファイル</Label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setImportFileName(file.name);
                    setImportCsvText(await file.text());
                  }}
                />
                {importFileName && <p className="text-xs text-muted-foreground">選択中: {importFileName}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleImport} disabled={isImporting || !importCsvText.trim()}>
                {isImporting ? '取込中...' : '取込'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>社員</TableHead>
            <TableHead>評価期</TableHead>
            <TableHead>等級</TableHead>
            <TableHead>MBO</TableHead>
            <TableHead>360成果</TableHead>
            <TableHead>360クレド</TableHead>
            <TableHead>合計</TableHead>
            <TableHead>総合評価</TableHead>
            <TableHead>調整メモ</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                評価対象の目標セットがありません。
              </TableCell>
            </TableRow>
          ) : rows.map((item) => (
            <TableRow key={item.goalSetId}>
              <TableCell>
                <div className="font-medium">{item.employeeName}</div>
                <div className="text-xs text-muted-foreground">{item.employeeCode}</div>
              </TableCell>
              <TableCell>{item.evaluationPeriodName}</TableCell>
              <TableCell>{item.grade}</TableCell>
              <TableCell>{formatScore(item.mboScore)}</TableCell>
              <TableCell>{item.degree360AchievementBonus}</TableCell>
              <TableCell>{item.degree360CredoBonus}</TableCell>
              <TableCell className="font-semibold">{formatScore(item.totalScore)}</TableCell>
              <TableCell>
                <Select
                  value={item.selectedGrade}
                  onValueChange={(value) => setGrades((current) => ({
                    ...current,
                    [item.goalSetId]: value as FinalGrade | 'UNSET',
                  }))}
                  disabled={!item.isComplete}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSET">未選択</SelectItem>
                    {gradeOptions.map((grade) => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  className="w-56"
                  value={item.adjustmentNoteDraft}
                  onChange={(event) => setNotes((current) => ({
                    ...current,
                    [item.goalSetId]: event.target.value,
                  }))}
                  placeholder="調整理由・補足"
                  disabled={!item.isComplete}
                />
              </TableCell>
              <TableCell>
                {item.confirmedAt ? (
                  <div className="space-y-1">
                    <Badge className="bg-green-100 text-green-800">確定済み</Badge>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(item.confirmedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </div>
                  </div>
                ) : item.isComplete ? (
                  <Badge className="bg-amber-100 text-amber-800">未確定</Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-600">上長評価待ち</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  onClick={() => handleSave(item)}
                  disabled={!item.isComplete || savingGoalSetId === item.goalSetId}
                >
                  {savingGoalSetId === item.goalSetId ? '保存中...' : '確定'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
