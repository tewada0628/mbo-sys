import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getActiveRoles } from '@/lib/phases';
import { hasAdminPrivilege } from '@/lib/permissions';

export async function requireAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { employee, roles } = await getActiveRoles(user.email);
  if (!employee) {
    return { error: NextResponse.json({ error: 'Employee not found' }, { status: 404 }) };
  }

  if (!hasAdminPrivilege(roles)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { employee, roles, error: null };
}
