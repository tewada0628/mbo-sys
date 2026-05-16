import { z } from 'zod';

const roleSchema = z.enum(['ADMIN', 'HR', 'MANAGER', 'TEAM_LEADER', 'MEMBER']);
const employeeTypeSchema = z.enum(['REGULAR', 'CONTRACT', 'ASSISTANT']);
const periodStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
const phaseTypeSchema = z.enum([
  'GOAL_SETTING',
  'MIDTERM',
  'DEGREE_360',
  'SELF_REVIEW',
  'MANAGER_REVIEW',
  'ADJUSTMENT',
]);

const optionalUuidSchema = z.preprocess(
  (value) => value === '' || value === 'NONE' ? null : value,
  z.string().uuid().nullable().optional(),
);

const membershipSchema = z.object({
  id: optionalUuidSchema,
  organizationSnapshotId: z.string().uuid('組織を選択してください'),
  grade: z.coerce.number().int().min(1).max(9),
  gradeType: z.string().min(1, '等級種別を入力してください'),
  position: z.string().min(1, '役職を入力してください'),
  employeeType: employeeTypeSchema,
  roles: z.array(roleSchema).min(1, 'ロールを1つ以上選択してください'),
  managerId: optionalUuidSchema,
  divisionManagerId: optionalUuidSchema,
  executiveId: optionalUuidSchema,
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().nullable().optional(),
});

export const employeeCreateSchema = z.object({
  employeeCode: z.string().min(1, '社員番号を入力してください'),
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  isActive: z.boolean().default(true),
  membership: membershipSchema,
});

export const employeeUpdateSchema = employeeCreateSchema.omit({ employeeCode: true }).extend({
  employeeCode: z.string().min(1, '社員番号を入力してください').optional(),
});

export const organizationSchema = z.object({
  evaluationPeriodId: z.string().uuid('評価期を選択してください').optional(),
  name: z.string().min(1, '部署名を入力してください'),
  parentId: optionalUuidSchema,
});

export const periodSchema = z.object({
  name: z.string().min(1, '名称を入力してください'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: periodStatusSchema.default('INACTIVE'),
}).refine((value) => value.endDate >= value.startDate, {
  message: '終了日は開始日以降にしてください',
  path: ['endDate'],
});

export const periodPhasesUpdateSchema = periodSchema.extend({
  phases: z.array(z.object({
    id: optionalUuidSchema,
    phaseType: phaseTypeSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })).min(1),
});
