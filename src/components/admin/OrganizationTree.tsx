'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Edit, Plus, Trash2, Upload } from 'lucide-react';
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

type PeriodOption = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};

type OrganizationItem = {
  id: string;
  evaluationPeriodId: string;
  evaluationPeriodName: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  membershipCount: number;
  childCount: number;
};

type OrganizationsResponse = {
  periods: PeriodOption[];
  organizations: OrganizationItem[];
};

type OrganizationRow = OrganizationItem & { depth: number };

type OrganizationFormState = {
  id?: string;
  evaluationPeriodId: string;
  name: string;
  parentId: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('組織一覧の取得に失敗しました。');
  return res.json() as Promise<OrganizationsResponse>;
};

function buildRows(organizations: OrganizationItem[], parentId: string | null = null, depth = 0): OrganizationRow[] {
  return organizations
    .filter((organization) => organization.parentId === parentId)
    .flatMap((organization) => [
      { ...organization, depth },
      ...buildRows(organizations, organization.id, depth + 1),
    ]);
}

function emptyForm(periodId: string): OrganizationFormState {
  return {
    evaluationPeriodId: periodId,
    name: '',
    parentId: 'NONE',
  };
}

function OrganizationDialog({
  mode,
  form,
  setForm,
  periods,
  organizations,
  open,
  onOpenChange,
  onSubmit,
  isSaving,
}: {
  mode: 'create' | 'edit';
  form: OrganizationFormState;
  setForm: (updater: (current: OrganizationFormState) => OrganizationFormState) => void;
  periods: PeriodOption[];
  organizations: OrganizationItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isSaving: boolean;
}) {
  const parentOptions = organizations.filter((organization) => (
    organization.evaluationPeriodId === form.evaluationPeriodId && organization.id !== form.id
  ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {mode === 'create' && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            組織を追加
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '組織を追加' : '組織を編集'}</DialogTitle>
          <DialogDescription>評価期ごとの組織スナップショットを管理します。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>評価期</Label>
            <Select
              value={form.evaluationPeriodId}
              disabled={mode === 'edit'}
              onValueChange={(value) => setForm((current) => ({ ...current, evaluationPeriodId: value, parentId: 'NONE' }))}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-org-name`}>組織名</Label>
            <Input id={`${mode}-org-name`} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>親組織</Label>
            <Select value={form.parentId} onValueChange={(value) => setForm((current) => ({ ...current, parentId: value }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">なし</SelectItem>
                {parentOptions.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={isSaving}>{isSaving ? '保存中...' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrganizationTree() {
  const { data, error, mutate } = useSWR<OrganizationsResponse>('/api/admin/organizations', fetcher);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [form, setFormState] = useState<OrganizationFormState>(() => emptyForm(''));
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importCsvText, setImportCsvText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);

  const activePeriodId = selectedPeriodId || data?.periods.find((period) => period.status === 'ACTIVE')?.id || data?.periods[0]?.id || '';
  const filteredOrganizations = useMemo(() => (
    data?.organizations.filter((organization) => organization.evaluationPeriodId === activePeriodId) ?? []
  ), [activePeriodId, data?.organizations]);
  const rows = useMemo(() => buildRows(filteredOrganizations), [filteredOrganizations]);
  const setForm = (updater: (current: OrganizationFormState) => OrganizationFormState) => setFormState(updater);
  const activePeriodName = data?.periods.find((period) => period.id === activePeriodId)?.name ?? '';

  const save = async (mode: 'create' | 'edit') => {
    setIsSaving(true);
    try {
      const res = await fetch(mode === 'create' ? '/api/admin/organizations' : `/api/admin/organizations/${form.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationPeriodId: form.evaluationPeriodId,
          name: form.name,
          parentId: form.parentId,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '組織情報の保存に失敗しました。');
      }
      await mutate();
      setCreateOpen(false);
      setEditOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '組織情報の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const importCsv = async () => {
    setIsImporting(true);
    try {
      const res = await fetch('/api/admin/organizations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationPeriodId: activePeriodId,
          csvText: importCsvText,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'CSV取込に失敗しました。');
      }
      await mutate();
      setImportOpen(false);
      setImportFileName('');
      setImportCsvText('');
      alert(`CSV取込が完了しました。作成 ${body.createdCount} 件、更新 ${body.updatedCount} 件`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSV取込に失敗しました。');
    } finally {
      setIsImporting(false);
    }
  };

  const deleteOrganization = async (organization: OrganizationItem) => {
    if (organization.childCount > 0) {
      alert('子組織がある組織は削除できません。先に子組織を削除してください。');
      return;
    }
    if (organization.membershipCount > 0) {
      alert('所属社員がいる組織は削除できません。先に社員管理で所属を移してください。');
      return;
    }

    const confirmed = confirm(`${organization.name} を削除します。この操作は元に戻せません。`);
    if (!confirmed) return;

    setDeletingOrgId(organization.id);
    try {
      const res = await fetch(`/api/admin/organizations/${organization.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '組織の削除に失敗しました。');
      }
      await mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '組織の削除に失敗しました。');
    } finally {
      setDeletingOrgId(null);
    }
  };

  if (error) return <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">組織一覧の取得に失敗しました。</div>;
  if (!data) return <div className="rounded-md border bg-white p-4 text-sm text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={activePeriodId} onValueChange={setSelectedPeriodId}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {data.periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2">
          <Dialog open={importOpen} onOpenChange={(open) => {
            setImportOpen(open);
            if (!open) {
              setImportFileName('');
              setImportCsvText('');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!activePeriodId}>
                <Upload className="size-4" />
                CSV取込
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>組織CSV取込</DialogTitle>
                <DialogDescription>
                  選択中の評価期「{activePeriodName}」に組織を一括登録します。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">CSVフォーマット</p>
                  <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs">{`name,parent_name
営業本部,
営業部,営業本部
営業1課,営業部`}</pre>
                  <p className="mt-2 text-xs text-muted-foreground">
                    `name` は評価期内で一意にしてください。`parent_name` は空欄、既存組織名、またはCSV内の組織名を指定できます。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization-csv">CSVファイル</Label>
                  <Input
                    id="organization-csv"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        setImportFileName('');
                        setImportCsvText('');
                        return;
                      }
                      setImportFileName(file.name);
                      setImportCsvText(await file.text());
                    }}
                  />
                  {importFileName && (
                    <p className="text-xs text-muted-foreground">選択中: {importFileName}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={importCsv} disabled={!importCsvText || isImporting}>
                  {isImporting ? '取込中...' : '取込'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <OrganizationDialog
            mode="create"
            form={form}
            setForm={setForm}
            periods={data.periods}
            organizations={data.organizations}
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) setFormState(emptyForm(activePeriodId));
            }}
            onSubmit={() => save('create')}
            isSaving={isSaving}
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="px-4">組織名</TableHead>
              <TableHead>親組織</TableHead>
              <TableHead>子組織</TableHead>
              <TableHead>所属人数</TableHead>
              <TableHead>評価期</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  この評価期の組織がありません。
                </TableCell>
              </TableRow>
            ) : rows.map((organization) => (
              <TableRow key={organization.id}>
                <TableCell className="px-4 font-medium">
                  <span style={{ paddingLeft: `${organization.depth * 20}px` }}>
                    {organization.depth > 0 ? '└ ' : ''}
                    {organization.name}
                  </span>
                </TableCell>
                <TableCell>{organization.parentName ?? '-'}</TableCell>
                <TableCell>{organization.childCount}</TableCell>
                <TableCell>{organization.membershipCount}</TableCell>
                <TableCell>
                  <Badge variant="outline">{organization.evaluationPeriodName}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormState({
                        id: organization.id,
                        evaluationPeriodId: organization.evaluationPeriodId,
                        name: organization.name,
                        parentId: organization.parentId ?? 'NONE',
                      });
                      setEditOpen(true);
                    }}
                  >
                    <Edit className="size-4" />
                    編集
                  </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={organization.childCount > 0 || organization.membershipCount > 0 || deletingOrgId === organization.id}
                      title={
                        organization.childCount > 0
                          ? '子組織がある組織は削除できません'
                          : organization.membershipCount > 0
                            ? '所属社員がいる組織は削除できません'
                            : undefined
                      }
                      onClick={() => deleteOrganization(organization)}
                    >
                      <Trash2 className="size-4" />
                      {deletingOrgId === organization.id ? '削除中...' : '削除'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OrganizationDialog
        mode="edit"
        form={form}
        setForm={setForm}
        periods={data.periods}
        organizations={data.organizations}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={() => save('edit')}
        isSaving={isSaving}
      />
    </div>
  );
}
