import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';
import { employeeUpdateSchema } from '@/lib/validations/admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const { userId } = await params;
    const body = await req.json();
    const result = employeeUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const { membership, employeeCode, ...employeeInput } = result.data;
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          orderBy: { validFrom: 'desc' },
          include: {
            organizationSnapshot: {
              select: { evaluationPeriodId: true },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const duplicate = await prisma.employee.findFirst({
      where: {
        id: { not: userId },
        OR: [
          ...(employeeCode ? [{ employeeCode }] : []),
          { email: employeeInput.email },
        ],
      },
    });

    if (duplicate) {
      return NextResponse.json({ error: '社員番号またはメールアドレスが既に登録されています。' }, { status: 409 });
    }

    const organization = await prisma.organizationSnapshot.findUnique({
      where: { id: membership.organizationSnapshotId },
      select: { evaluationPeriodId: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const membershipId = membership.id ?? employee.memberships.find((item) => (
      item.organizationSnapshot.evaluationPeriodId === organization.evaluationPeriodId
    ))?.id;

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: userId },
        data: {
          ...employeeInput,
          ...(employeeCode ? { employeeCode } : {}),
        },
      });

      const membershipData = {
        organizationSnapshotId: membership.organizationSnapshotId,
        grade: membership.grade,
        gradeType: membership.gradeType,
        position: membership.position,
        employeeType: membership.employeeType,
        roles: membership.roles,
        managerId: membership.managerId,
        divisionManagerId: membership.divisionManagerId,
        executiveId: membership.executiveId,
        validFrom: membership.validFrom,
        validTo: membership.validTo ?? null,
      };

      if (membershipId) {
        await tx.organizationMembership.update({
          where: { id: membershipId },
          data: membershipData,
        });
      } else {
        await tx.organizationMembership.create({
          data: {
            employeeId: userId,
            ...membershipData,
            joinDate: membership.validFrom,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating admin user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const { userId } = await params;

    if (auth.employee.id === userId) {
      return NextResponse.json({ error: '自分自身のアカウントは削除できません。' }, { status: 409 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            goalSets: true,
            degree360Scores: true,
            approvalRequests: true,
            approvalResponses: true,
            notifications: true,
            auditLogs: true,
            managedMemberships: true,
            divisionManagedMemberships: true,
            executiveMemberships: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const managerReviewCount = await prisma.managerReview.count({
      where: { managerId: userId },
    });
    const confirmedEvaluationCount = await prisma.finalEvaluation.count({
      where: { confirmedBy: userId },
    });

    const hasBlockingData = (
      employee._count.goalSets > 0 ||
      employee._count.degree360Scores > 0 ||
      employee._count.approvalRequests > 0 ||
      employee._count.approvalResponses > 0 ||
      employee._count.notifications > 0 ||
      employee._count.auditLogs > 0 ||
      employee._count.managedMemberships > 0 ||
      employee._count.divisionManagedMemberships > 0 ||
      employee._count.executiveMemberships > 0 ||
      managerReviewCount > 0 ||
      confirmedEvaluationCount > 0
    );

    if (hasBlockingData) {
      return NextResponse.json(
        { error: '目標・評価・承認・通知・監査ログ・評価者参照がある社員は削除できません。無効化で対応してください。' },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationMembership.deleteMany({
        where: { employeeId: userId },
      });
      await tx.employee.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
