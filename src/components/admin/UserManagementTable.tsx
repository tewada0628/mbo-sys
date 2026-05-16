'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Edit, Plus, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type Role = 'ADMIN' | 'HR' | 'MANAGER' | 'TEAM_LEADER' | 'MEMBER';
type EmployeeType = 'REGULAR' | 'CONTRACT' | 'ASSISTANT';

type PeriodOption = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};

type AdminMembership = {
  id: string;
  organizationSnapshotId: string;
  organizationName: string;
  evaluationPeriodId: string;
  evaluationPeriodName: string;
  grade: number;
  gradeType: string;
  position: string;
  employeeType: EmployeeType;
  roles: Role[];
  managerId: string | null;
  managerName: string | null;
  divisionManagerId: string | null;
  divisionManagerName: string | null;
  executiveId: string | null;
  executiveName: string | null;
  validFrom: string;
  validTo: string | null;
};

type AdminEmployee = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  isActive: boolean;
  memberships: AdminMembership[];
  membership: AdminMembership | null;
};

type OrganizationOption = {
  id: string;
  name: string;
  evaluationPeriodId: string;
  evaluationPeriodName: string;
  evaluationPeriodStatus: string;
};

type EmployeeOption = {
  id: string;
  employeeCode: string;
  name: string;
  isActive: boolean;
};

type UsersResponse = {
  periods: PeriodOption[];
  items: AdminEmployee[];
  organizations: OrganizationOption[];
  employees: EmployeeOption[];
};

type UserFormState = {
  id?: string;
  membershipId?: string;
  employeeCode: string;
  name: string;
  email: string;
  isActive: boolean;
  organizationSnapshotId: string;
  grade: string;
  gradeType: string;
  position: string;
  employeeType: EmployeeType;
  roles: Role[];
  managerId: string;
  divisionManagerId: string;
  executiveId: string;
  validFrom: string;
  validTo: string;
};

const roleOptions: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: '管理者' },
  { value: 'HR', label: '人事' },
  { value: 'MANAGER', label: '上長' },
  { value: 'TEAM_LEADER', label: 'チームリーダー' },
  { value: 'MEMBER', label: '一般社員' },
];

const employeeTypeOptions: { value: EmployeeType; label: string }[] = [
  { value: 'REGULAR', label: '正社員' },
  { value: 'CONTRACT', label: '契約社員' },
  { value: 'ASSISTANT', label: 'アシスタント' },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('社員一覧の取得に失敗しました。');
  return res.json() as Promise<UsersResponse>;
};

const emptyForm = (): UserFormState => ({
  employeeCode: '',
  name: '',
  email: '',
  isActive: true,
  organizationSnapshotId: '',
  grade: '3',
  gradeType: 'G',
  position: 'MEMBER',
  employeeType: 'REGULAR',
  roles: ['MEMBER'],
  managerId: 'NONE',
  divisionManagerId: 'NONE',
  executiveId: 'NONE',
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: '',
});

function getMembershipForPeriod(employee: AdminEmployee, periodId: string) {
  return employee.memberships.find((membership) => membership.evaluationPeriodId === periodId) ?? null;
}

function toFormState(employee: AdminEmployee, membership: AdminMembership | null): UserFormState {
  return {
    id: employee.id,
    membershipId: membership?.id,
    employeeCode: employee.employeeCode,
    name: employee.name,
    email: employee.email,
    isActive: employee.isActive,
    organizationSnapshotId: membership?.organizationSnapshotId ?? '',
    grade: String(membership?.grade ?? 3),
    gradeType: membership?.gradeType ?? 'STANDARD',
    position: membership?.position ?? 'MEMBER',
    employeeType: membership?.employeeType ?? 'REGULAR',
    roles: membership?.roles.length ? membership.roles : ['MEMBER'],
    managerId: membership?.managerId ?? 'NONE',
    divisionManagerId: membership?.divisionManagerId ?? 'NONE',
    executiveId: membership?.executiveId ?? 'NONE',
    validFrom: membership?.validFrom ?? new Date().toISOString().slice(0, 10),
    validTo: membership?.validTo ?? '',
  };
}

function buildPayload(form: UserFormState) {
  return {
    employeeCode: form.employeeCode,
    name: form.name,
    email: form.email,
    isActive: form.isActive,
    membership: {
      id: form.membershipId ?? null,
      organizationSnapshotId: form.organizationSnapshotId,
      grade: Number(form.grade),
      gradeType: form.gradeType,
      position: form.position,
      employeeType: form.employeeType,
      roles: form.roles,
      managerId: form.managerId,
      divisionManagerId: form.divisionManagerId,
      executiveId: form.executiveId,
      validFrom: form.validFrom,
      validTo: form.validTo || null,
    },
  };
}

function UserDialog({
  mode,
  form,
  setForm,
  organizations,
  employees,
  open,
  onOpenChange,
  onSubmit,
  isSaving,
}: {
  mode: 'create' | 'edit';
  form: UserFormState;
  setForm: (updater: (current: UserFormState) => UserFormState) => void;
  organizations: OrganizationOption[];
  employees: EmployeeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isSaving: boolean;
}) {
  const managerOptions = employees.filter((employee) => employee.isActive && employee.id !== form.id);

  const toggleRole = (role: Role) => {
    setForm((current) => {
      const roles = current.roles.includes(role)
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role];
      return { ...current, roles: roles.length > 0 ? roles : ['MEMBER'] };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {mode === 'create' && (
        <DialogTrigger asChild>
          <Button onClick={() => setForm(() => emptyForm())}>
            <Plus className="size-4" />
            社員を追加
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '社員を追加' : '社員情報を編集'}</DialogTitle>
          <DialogDescription>社員情報、ロール、所属組織、評価者を更新します。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-employeeCode`}>社員番号</Label>
            <Input id={`${mode}-employeeCode`} value={form.employeeCode} onChange={(event) => setForm((current) => ({ ...current, employeeCode: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-name`}>氏名</Label>
            <Input id={`${mode}-name`} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`${mode}-email`}>メールアドレス</Label>
            <Input id={`${mode}-email`} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>所属組織</Label>
            <Select value={form.organizationSnapshotId || undefined} onValueChange={(value) => setForm((current) => ({ ...current, organizationSnapshotId: value }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name} / {organization.evaluationPeriodName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>雇用区分</Label>
            <Select value={form.employeeType} onValueChange={(value) => setForm((current) => ({ ...current, employeeType: value as EmployeeType }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {employeeTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-grade`}>等級</Label>
            <Input id={`${mode}-grade`} type="number" min="1" max="9" value={form.grade} onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-gradeType`}>等級種別</Label>
            <Input id={`${mode}-gradeType`} value={form.gradeType} onChange={(event) => setForm((current) => ({ ...current, gradeType: event.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`${mode}-position`}>役職</Label>
            <Input id={`${mode}-position`} value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>直属上長</Label>
            <Select value={form.managerId} onValueChange={(value) => setForm((current) => ({ ...current, managerId: value }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">未設定</SelectItem>
                {managerOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>事業部長</Label>
            <Select value={form.divisionManagerId} onValueChange={(value) => setForm((current) => ({ ...current, divisionManagerId: value }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">未設定</SelectItem>
                {managerOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>役員</Label>
            <Select value={form.executiveId} onValueChange={(value) => setForm((current) => ({ ...current, executiveId: value }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">未設定</SelectItem>
                {managerOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>在籍状態</Label>
            <div className="flex h-8 items-center gap-2">
              <Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked === true }))} />
              <span className="text-sm">有効</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-validFrom`}>所属開始日</Label>
            <Input id={`${mode}-validFrom`} type="date" value={form.validFrom} onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-validTo`}>所属終了日</Label>
            <Input id={`${mode}-validTo`} type="date" value={form.validTo} onChange={(event) => setForm((current) => ({ ...current, validTo: event.target.value }))} />
          </div>
          <div className="space-y-3 md:col-span-2">
            <Label>ロール</Label>
            <div className="grid gap-2 md:grid-cols-3">
              {roleOptions.map((role) => (
                <label key={role.value} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox checked={form.roles.includes(role.value)} onCheckedChange={() => toggleRole(role.value)} />
                  {role.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserManagementTable() {
  const { data, error, mutate } = useSWR<UsersResponse>('/api/admin/users', fetcher);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [form, setFormState] = useState<UserFormState>(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importCsvText, setImportCsvText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  const setForm = (updater: (current: UserFormState) => UserFormState) => setFormState(updater);
  const activePeriodId = selectedPeriodId || data?.periods.find((period) => period.status === 'ACTIVE')?.id || data?.periods[0]?.id || '';
  const activePeriodName = data?.periods.find((period) => period.id === activePeriodId)?.name ?? '';
  const organizationsForPeriod = useMemo(() => (
    data?.organizations.filter((organization) => organization.evaluationPeriodId === activePeriodId) ?? []
  ), [activePeriodId, data?.organizations]);
  const employees = useMemo(() => data?.items ?? [], [data?.items]);
  const rows = useMemo(() => (
    employees.map((employee) => ({
      employee,
      membership: getMembershipForPeriod(employee, activePeriodId),
    }))
  ), [activePeriodId, employees]);

  const save = async (mode: 'create' | 'edit') => {
    setIsSaving(true);
    try {
      const res = await fetch(mode === 'create' ? '/api/admin/users' : `/api/admin/users/${form.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '社員情報の保存に失敗しました。');
      }
      await mutate();
      setCreateOpen(false);
      setEditOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '社員情報の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const importCsv = async () => {
    setIsImporting(true);
    try {
      const res = await fetch('/api/admin/users/import', {
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

  const deleteEmployee = async (employee: AdminEmployee) => {
    const confirmed = confirm(
      `${employee.name}（${employee.employeeCode}）を削除します。\n所属履歴も削除されます。この操作は元に戻せません。`,
    );
    if (!confirmed) return;

    setDeletingEmployeeId(employee.id);
    try {
      const res = await fetch(`/api/admin/users/${employee.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '社員の削除に失敗しました。');
      }
      await mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '社員の削除に失敗しました。');
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  if (error) return <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">社員一覧の取得に失敗しました。</div>;
  if (!data) return <div className="rounded-md border bg-white p-4 text-sm text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={activePeriodId} onValueChange={setSelectedPeriodId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="評価期を選択" /></SelectTrigger>
          <SelectContent>
            {data.periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2">
        <Dialog open={importOpen} onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportFileName('');
            setImportCsvText('');
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="size-4" />
              CSV取込
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>社員CSV取込</DialogTitle>
              <DialogDescription>
                選択中の評価期「{activePeriodName}」に社員の所属、ロール、評価者を一括登録します。社員番号が既に存在する場合は社員マスタを更新します。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">CSVフォーマット</p>
                <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs">{`employee_code,name,email,is_active,organization_name,grade,grade_type,position,employee_type,roles,manager_employee_code,division_manager_employee_code,executive_employee_code,valid_from,valid_to
60001,山田太郎,yamada@example.com,true,営業部,3,STANDARD,スタッフ,REGULAR,MEMBER,30001,30001,,2025-09-01,
30001,営業部長,manager@example.com,true,営業部,5,STANDARD,部長,REGULAR,MANAGER,,,,2025-09-01,`}</pre>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>`roles` は `MEMBER`、`MANAGER`、`HR` などを指定します。複数指定は `MEMBER;TEAM_LEADER` のようにセミコロンで区切ります。</p>
                  <p>`organization_name` は選択中の評価期の組織管理に登録済みの組織名を指定してください。</p>
                  <p>評価者は社員番号で指定します。CSV内に同時に含めることもできます。</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-csv">CSVファイル</Label>
                <Input
                  id="user-csv"
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
        <UserDialog
          mode="create"
          form={form}
          setForm={setForm}
          organizations={organizationsForPeriod}
          employees={data.employees}
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (open) {
              setFormState({
                ...emptyForm(),
                organizationSnapshotId: organizationsForPeriod[0]?.id ?? '',
              });
            }
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
              <TableHead className="px-4">社員</TableHead>
              <TableHead>所属</TableHead>
              <TableHead>等級・役職</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead>評価者</TableHead>
              <TableHead>状態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ employee, membership }) => (
              <TableRow key={employee.id}>
                <TableCell className="px-4">
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-xs text-muted-foreground">{employee.employeeCode} / {employee.email}</div>
                </TableCell>
                <TableCell>
                  <div>{membership?.organizationName ?? '-'}</div>
                  <div className="text-xs text-muted-foreground">{membership?.evaluationPeriodName ?? activePeriodName}</div>
                </TableCell>
                <TableCell>
                  <div>等級{membership?.grade ?? '-'}</div>
                  <div className="text-xs text-muted-foreground">{membership?.position ?? '-'}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(membership?.roles ?? []).map((role) => (
                      <Badge key={role} variant="outline">{role}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">上長: {membership?.managerName ?? '-'}</div>
                  <div className="text-xs text-muted-foreground">事業部長: {membership?.divisionManagerName ?? '-'}</div>
                </TableCell>
                <TableCell>
                  {employee.isActive ? <Badge className="bg-green-100 text-green-800">有効</Badge> : <Badge variant="outline">無効</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormState({
                          ...toFormState(employee, membership),
                          organizationSnapshotId: membership?.organizationSnapshotId ?? organizationsForPeriod[0]?.id ?? '',
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
                      disabled={deletingEmployeeId === employee.id}
                      onClick={() => deleteEmployee(employee)}
                    >
                      <Trash2 className="size-4" />
                      {deletingEmployeeId === employee.id ? '削除中...' : '削除'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserDialog
        mode="edit"
        form={form}
        setForm={setForm}
        organizations={organizationsForPeriod}
        employees={data.employees}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={() => save('edit')}
        isSaving={isSaving}
      />
    </div>
  );
}
