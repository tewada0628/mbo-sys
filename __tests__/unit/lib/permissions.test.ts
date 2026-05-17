import {
  canManageEmployee,
  hasAdminPrivilege,
  hasRole,
  isAdmin,
  isHR,
  isManager,
} from '@/lib/permissions';
import type { Role } from '@/types';

describe('permissions', () => {
  const memberRoles: Role[] = ['MEMBER'];
  const managerRoles: Role[] = ['MEMBER', 'MANAGER'];
  const teamLeaderRoles: Role[] = ['TEAM_LEADER'];
  const hrRoles: Role[] = ['HR'];
  const adminRoles: Role[] = ['ADMIN'];

  describe('hasRole', () => {
    it('checks a single role', () => {
      expect(hasRole(managerRoles, 'MANAGER')).toBe(true);
      expect(hasRole(memberRoles, 'MANAGER')).toBe(false);
    });

    it('checks any role from a list', () => {
      expect(hasRole(teamLeaderRoles, ['MANAGER', 'TEAM_LEADER'])).toBe(true);
      expect(hasRole(memberRoles, ['ADMIN', 'HR'])).toBe(false);
    });
  });

  it('identifies admin and HR roles', () => {
    expect(isAdmin(adminRoles)).toBe(true);
    expect(isAdmin(hrRoles)).toBe(false);
    expect(isHR(hrRoles)).toBe(true);
    expect(isHR(adminRoles)).toBe(false);
  });

  it('treats MANAGER and TEAM_LEADER as manager roles', () => {
    expect(isManager(managerRoles)).toBe(true);
    expect(isManager(teamLeaderRoles)).toBe(true);
    expect(isManager(memberRoles)).toBe(false);
  });

  it('grants admin privilege to ADMIN and HR only', () => {
    expect(hasAdminPrivilege(adminRoles)).toBe(true);
    expect(hasAdminPrivilege(hrRoles)).toBe(true);
    expect(hasAdminPrivilege(managerRoles)).toBe(false);
  });

  it('allows employee management for admin privilege or manager roles', () => {
    expect(canManageEmployee(adminRoles)).toBe(true);
    expect(canManageEmployee(hrRoles)).toBe(true);
    expect(canManageEmployee(managerRoles)).toBe(true);
    expect(canManageEmployee(memberRoles)).toBe(false);
  });
});
