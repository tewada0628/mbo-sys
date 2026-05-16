import { z } from 'zod';

export const midtermReviewSchema = z.object({
  progress: z.string().min(1, '進捗状況を入力してください'),
  comment: z.string().optional(),
});

export const selfReviewSchema = z.object({
  score: z.number().min(0).max(2, 'スコアは0.0から2.0の間で入力してください'),
  comment: z.string().optional(),
});

export const selfReviewRequestSchema = z.object({
  reviews: z.array(z.object({
    goalId: z.string().uuid(),
    score: z.number().min(0).max(2, 'スコアは0.0から2.0の間で入力してください'),
    comment: z.string().optional(),
  })).min(1),
});

export const managerReviewSchema = z.object({
  score: z.number().min(0).max(2, 'スコアは0.0から2.0の間で入力してください'),
  comment: z.string().optional(),
});

export const managerReviewRequestSchema = z.object({
  reviews: z.array(z.object({
    goalId: z.string().uuid(),
    score: z.number().min(0).max(2, 'スコアは0.0から2.0の間で入力してください'),
    comment: z.string().optional(),
  })).min(1),
});
