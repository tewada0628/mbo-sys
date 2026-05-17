import type { Role } from '@prisma/client';
import prisma from '@/lib/db';
import { hasAdminPrivilege, isManager } from '@/lib/permissions';

type ActiveMembership = {
  id: string;
  organizationSnapshotId: string;
  roles: Role[];
  position: string;
};

type AccessEmployee = {
  id: string;
  email: string;
  name: string;
  memberships: ActiveMembership[];
};

type AccessGoalSet = {
  id: string;
  employeeId: string;
  status: string;
  isMboTarget: boolean;
  isEvaluationExempt: boolean;
  evaluationPeriodId: string;
  membership: {
    id: string;
    organizationSnapshotId: string;
    grade: number;
    employeeType: string;
    managerId: string | null;
    divisionManagerId: string | null;
    executiveId: string | null;
  };
  approvalRequests: {
    approverId: string;
  }[];
};

export type GoalSetAccessContext = {
  employee: AccessEmployee;
  roles: Role[];
  goalSet: AccessGoalSet;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canSubmit: boolean;
    canRevise: boolean;
    canMidtermReview: boolean;
    canSelfReview: boolean;
    canManagerReview: boolean;
    canMeetingReject: boolean;
    canSavedReject: boolean;
  };
};

export type GoalSetAccessFailure = {
  status: 401 | 403 | 404;
  error: string;
};

export type GoalSetAccessResult =
  | { ok: true; context: GoalSetAccessContext }
  | { ok: false; failure: GoalSetAccessFailure };

const getActiveMembershipWhere = () => {
  const now = new Date();
  return {
    validFrom: { lte: now },
    OR: [
      { validTo: null },
      { validTo: { gt: now } },
    ],
  };
};

export async function getGoalSetAccessContext(email: string | null | undefined, goalSetId: string): Promise<GoalSetAccessResult> {
  if (!email) {
    return { ok: false, failure: { status: 401, error: 'Unauthorized' } };
  }

  const [employee, goalSet] = await Promise.all([
    prisma.employee.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: {
          where: getActiveMembershipWhere(),
          select: {
            id: true,
            organizationSnapshotId: true,
            roles: true,
            position: true,
          },
        },
      },
    }),
    prisma.goalSet.findUnique({
      where: { id: goalSetId },
      select: {
        id: true,
        employeeId: true,
        status: true,
        isMboTarget: true,
        isEvaluationExempt: true,
        evaluationPeriodId: true,
        membership: {
          select: {
            id: true,
            organizationSnapshotId: true,
            grade: true,
            employeeType: true,
            managerId: true,
            divisionManagerId: true,
            executiveId: true,
          },
        },
        approvalRequests: {
          where: { status: 'PENDING' },
          select: { approverId: true },
        },
      },
    }),
  ]);

  if (!employee) {
    return { ok: false, failure: { status: 404, error: 'Employee not found' } };
  }

  if (!goalSet) {
    return { ok: false, failure: { status: 404, error: 'Goal set not found' } };
  }

  const roles = Array.from(new Set(employee.memberships.flatMap((membership) => membership.roles)));
  const admin = hasAdminPrivilege(roles);
  const managerRole = isManager(roles);
  const activeOrganizationIds = new Set(employee.memberships.map((membership) => membership.organizationSnapshotId));

  const isOwner = goalSet.employeeId === employee.id;
  const isDirectManager = goalSet.membership.managerId === employee.id;
  const isApprovalChainMember = [
    goalSet.membership.managerId,
    goalSet.membership.divisionManagerId,
    goalSet.membership.executiveId,
  ].includes(employee.id);
  const isPendingApprover = goalSet.approvalRequests.some((request) => request.approverId === employee.id);
  const isSameOrganizationManager = managerRole && activeOrganizationIds.has(goalSet.membership.organizationSnapshotId);
  const isDepartmentRejector = goalSet.membership.divisionManagerId === employee.id || goalSet.membership.executiveId === employee.id;
  const hasDeptManagerPositionInSameOrg = employee.memberships.some((membership) => (
    membership.position === 'DEPT_MANAGER' &&
    membership.organizationSnapshotId === goalSet.membership.organizationSnapshotId
  ));

  const canMeetingReject = admin || isDepartmentRejector || hasDeptManagerPositionInSameOrg;
  const canSavedReject = admin || isApprovalChainMember || isSameOrganizationManager;
  const canView = admin || isOwner || isApprovalChainMember || isPendingApprover || isSameOrganizationManager || canMeetingReject || canSavedReject;

  return {
    ok: true,
    context: {
      employee,
      roles,
      goalSet,
      permissions: {
        canView,
        canEdit: isOwner,
        canSubmit: isOwner,
        canRevise: isOwner,
        canMidtermReview: isOwner || isDirectManager,
        canSelfReview: isOwner,
        canManagerReview: isDirectManager,
        canMeetingReject,
        canSavedReject,
      },
    },
  };
}
