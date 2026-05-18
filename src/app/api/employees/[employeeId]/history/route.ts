import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/db';
import { hasAdminPrivilege, isManager } from '@/lib/permissions';

async function checkAccess(
  viewerEmail: string,
  targetEmployeeId: string,
): Promise<{ allowed: boolean; viewerId: string | null }> {
  const now = new Date();

  const viewer = await prisma.employee.findUnique({
    where: { email: viewerEmail },
    select: {
      id: true,
      memberships: {
        where: {
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gt: now } }],
        },
        select: { roles: true },
      },
    },
  });

  if (!viewer) return { allowed: false, viewerId: null };

  // Self access
  if (viewer.id === targetEmployeeId) return { allowed: true, viewerId: viewer.id };

  const roles = viewer.memberships.flatMap((m) => m.roles);

  // HR/ADMIN can view anyone
  if (hasAdminPrivilege(roles)) return { allowed: true, viewerId: viewer.id };

  // MANAGER/TEAM_LEADER can view their direct/division/executive reports
  if (isManager(roles)) {
    const manages = await prisma.organizationMembership.findFirst({
      where: {
        employeeId: targetEmployeeId,
        OR: [
          { managerId: viewer.id },
          { divisionManagerId: viewer.id },
          { executiveId: viewer.id },
        ],
      },
    });
    if (manages) return { allowed: true, viewerId: viewer.id };
  }

  return { allowed: false, viewerId: viewer.id };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const { employeeId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed } = await checkAccess(user.email, employeeId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    const [employee, goalSets] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          employeeCode: true,
          name: true,
          email: true,
          memberships: {
            where: {
              validFrom: { lte: now },
              OR: [{ validTo: null }, { validTo: { gt: now } }],
            },
            orderBy: { validFrom: 'desc' },
            take: 1,
            select: {
              grade: true,
              gradeType: true,
              position: true,
              employeeType: true,
              roles: true,
              joinDate: true,
              organizationSnapshot: { select: { name: true } },
              manager: { select: { name: true } },
            },
          },
        },
      }),
      prisma.goalSet.findMany({
        where: { employeeId, isActive: true },
        orderBy: [{ evaluationPeriod: { startDate: 'desc' } }],
        include: {
          evaluationPeriod: {
            select: { id: true, name: true, startDate: true, endDate: true, status: true },
          },
          goals: {
            where: { isCurrent: true },
            orderBy: { goalType: 'asc' },
            select: {
              id: true,
              goalType: true,
              title: true,
              weight: true,
              selfReview: { select: { score: true } },
              managerReview: { select: { score: true } },
            },
          },
          finalEvaluation: {
            select: {
              mboScore: true,
              totalScore: true,
              finalGrade: true,
              degree360AchievementBonus: true,
              degree360CredoBonus: true,
              confirmedAt: true,
            },
          },
        },
      }),
    ]);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const currentMembership = employee.memberships[0] ?? null;

    return NextResponse.json({
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        currentMembership: currentMembership
          ? {
              grade: currentMembership.grade,
              gradeType: currentMembership.gradeType,
              position: currentMembership.position,
              employeeType: currentMembership.employeeType,
              roles: currentMembership.roles,
              joinDate: currentMembership.joinDate.toISOString(),
              organizationName: currentMembership.organizationSnapshot.name,
              managerName: currentMembership.manager?.name ?? null,
            }
          : null,
      },
      goalSets: goalSets.map((gs) => ({
        goalSetId: gs.id,
        status: gs.status,
        isMboTarget: gs.isMboTarget,
        isEvaluationExempt: gs.isEvaluationExempt,
        evaluationPeriod: {
          id: gs.evaluationPeriod.id,
          name: gs.evaluationPeriod.name,
          startDate: gs.evaluationPeriod.startDate.toISOString(),
          endDate: gs.evaluationPeriod.endDate.toISOString(),
          status: gs.evaluationPeriod.status,
        },
        finalEvaluation: gs.finalEvaluation
          ? {
              mboScore: Number(gs.finalEvaluation.mboScore),
              totalScore: Number(gs.finalEvaluation.totalScore),
              finalGrade: gs.finalEvaluation.finalGrade,
              degree360AchievementBonus: gs.finalEvaluation.degree360AchievementBonus,
              degree360CredoBonus: gs.finalEvaluation.degree360CredoBonus,
              confirmedAt: gs.finalEvaluation.confirmedAt?.toISOString() ?? null,
            }
          : null,
        goals: gs.goals.map((g) => ({
          id: g.id,
          goalType: g.goalType,
          title: g.title,
          weight: Number(g.weight),
          selfScore: g.selfReview ? Number(g.selfReview.score) : null,
          managerScore: g.managerReview ? Number(g.managerReview.score) : null,
        })),
      })),
    });
  } catch (error) {
    console.error('Error fetching employee history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
