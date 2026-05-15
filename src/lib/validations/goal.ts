import { z } from 'zod';
import { GoalType } from '@prisma/client';

export const goalSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください').max(100),
  description: z.string().min(1, '詳細を入力してください'),
  goalType: z.nativeEnum(GoalType),
  kpiPattern: z.string().optional(),
  criteria12: z.string().optional(),
  criteria10: z.string().min(1, '達成基準(1.0)を入力してください'),
  criteria08: z.string().optional(),
  weight: z.number().int().min(1).max(100),
  visibility: z.enum(['SELF_ONLY', 'DEPARTMENT', 'COMPANY']),
});

export const goalSetSchema = z.object({
  goals: z.array(goalSchema).length(3, '目標は3つ設定する必要があります'),
  revisionReason: z.string().optional(),
  revisionNote: z.string().optional(),
}).refine((data) => {
  const totalWeight = data.goals.reduce((sum, g) => sum + g.weight, 0);
  return totalWeight === 100;
}, {
  message: 'ウェイトの合計は100%にする必要があります',
  path: ['goals'],
});
