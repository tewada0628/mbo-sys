import { PhaseType, Role } from '@prisma/client';
import prisma from '@/lib/db';
import { hasAdminPrivilege } from './permissions';

export const EVALUATION_PHASES = {
  GOAL_SETTING: 'GOAL_SETTING',
  MIDTERM: 'MIDTERM',
  DEGREE_360: 'DEGREE_360',
  SELF_REVIEW: 'SELF_REVIEW',
  MANAGER_REVIEW: 'MANAGER_REVIEW',
  ADJUSTMENT: 'ADJUSTMENT',
} as const satisfies Record<string, PhaseType>;

export const getCurrentPhase = async (evaluationPeriodId: string, at = new Date()) => {
  return prisma.periodPhase.findFirst({
    where: {
      evaluationPeriodId,
      startDate: { lte: at },
      endDate: { gte: at },
    },
  });
};

export const canOperateInPhase = (roles: Role[], currentPhase: PhaseType | null | undefined, allowedPhases: PhaseType[]) => {
  if (hasAdminPrivilege(roles)) return true;
  return !!currentPhase && allowedPhases.includes(currentPhase);
};

export const isInPhase = (currentPhase: PhaseType | null | undefined, allowedPhases: PhaseType[]) => {
  return !!currentPhase && allowedPhases.includes(currentPhase);
};

export const getActiveRoles = async (email: string) => {
  const employee = await prisma.employee.findUnique({
    where: { email },
    include: {
      memberships: {
        where: {
          validFrom: { lte: new Date() },
          OR: [
            { validTo: null },
            { validTo: { gt: new Date() } },
          ],
        },
        select: { roles: true },
      },
    },
  });

  return {
    employee,
    roles: employee?.memberships.flatMap((membership) => membership.roles) ?? [],
  };
};
