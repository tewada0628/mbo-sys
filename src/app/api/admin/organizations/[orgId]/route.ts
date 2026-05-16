import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdminContext } from '@/lib/admin-auth';
import { organizationSchema } from '@/lib/validations/admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const { orgId } = await params;
    const body = await req.json();
    const result = organizationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    if (result.data.parentId === orgId) {
      return NextResponse.json({ error: '親組織に自分自身は指定できません。' }, { status: 400 });
    }

    const organization = await prisma.organizationSnapshot.findUnique({
      where: { id: orgId },
    });
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (result.data.parentId) {
      const parent = await prisma.organizationSnapshot.findUnique({
        where: { id: result.data.parentId },
      });
      if (!parent || parent.evaluationPeriodId !== organization.evaluationPeriodId) {
        return NextResponse.json({ error: '同じ評価期内の組織を親に指定してください。' }, { status: 400 });
      }
    }

    await prisma.organizationSnapshot.update({
      where: { id: orgId },
      data: {
        name: result.data.name,
        parentId: result.data.parentId ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const auth = await requireAdminContext();
    if (auth.error) return auth.error;

    const { orgId } = await params;
    const organization = await prisma.organizationSnapshot.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            children: true,
            memberships: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (organization._count.children > 0) {
      return NextResponse.json(
        { error: '子組織がある組織は削除できません。先に子組織を削除してください。' },
        { status: 409 },
      );
    }

    if (organization._count.memberships > 0) {
      return NextResponse.json(
        { error: '所属社員がいる組織は削除できません。先に社員管理で所属を移してください。' },
        { status: 409 },
      );
    }

    await prisma.organizationSnapshot.delete({
      where: { id: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
