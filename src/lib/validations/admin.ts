import { z } from 'zod';
import { Role, EmployeeType } from '@prisma/client';

export const employeeUpdateSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  isActive: z.boolean(),
});

export const organizationSchema = z.object({
  name: z.string().min(1, '部署名を入力してください'),
  parentId: z.string().uuid().optional().nullable(),
});

export const periodSchema = z.object({
  name: z.string().min(1, '名称を入力してください'),
  startDate: z.date(),
  endDate: z.date(),
});
