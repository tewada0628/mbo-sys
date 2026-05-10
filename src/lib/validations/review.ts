import { z } from 'zod';

export const midtermReviewSchema = z.object({
  progress: z.string().min(1, '進捗状況を入力してください'),
  comment: z.string().optional(),
});

export const selfReviewSchema = z.object({
  score: z.number().min(0).max(2, 'スコアは0.0から2.0の間で入力してください'),
  comment: z.string().optional(),
});

export const managerReviewSchema = z.object({
  score: z.number().min(0).max(2, 'スコアは0.0から2.0の間で入力してください'),
  comment: z.string().optional(),
  revisionRequested: z.boolean().default(false),
  revisionRequestNote: z.string().optional(),
});
