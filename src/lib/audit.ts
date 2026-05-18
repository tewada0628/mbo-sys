import 'server-only';

import { Prisma, type PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';

type AuditClient = PrismaClient | Prisma.TransactionClient;

type CreateAuditLogInput = {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  client?: AuditClient;
};

export async function createAuditLog({
  actorId,
  action,
  targetType,
  targetId,
  beforeValue,
  afterValue,
  client = prisma,
}: CreateAuditLogInput) {
  return client.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      beforeValue: (beforeValue ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      afterValue: (afterValue ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
}

export const AUDIT_ACTIONS = {
  GOAL_APPROVED: 'GOAL_APPROVED',
  GOAL_REJECTED: 'GOAL_REJECTED',
  GOAL_MEETING_REJECTED: 'GOAL_MEETING_REJECTED',
  EVALUATION_CONFIRMED: 'EVALUATION_CONFIRMED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const auditActionLabels: Record<AuditAction, string> = {
  GOAL_APPROVED: '目標承認',
  GOAL_REJECTED: '目標差し戻し',
  GOAL_MEETING_REJECTED: 'すり合わせ差し戻し',
  EVALUATION_CONFIRMED: '評価確定',
};
