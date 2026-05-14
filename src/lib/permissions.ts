import { Role } from '@/types';

export const hasRole = (roles: Role[], targetRole: Role | Role[]): boolean => {
  if (Array.isArray(targetRole)) {
    return targetRole.some((r) => roles.includes(r));
  }
  return roles.includes(targetRole);
};

export const isAdmin = (roles: Role[]): boolean => hasRole(roles, 'ADMIN');
export const isHR = (roles: Role[]): boolean => hasRole(roles, 'HR');
export const isManager = (roles: Role[]): boolean => hasRole(roles, ['MANAGER', 'TEAM_LEADER']);

export const hasAdminPrivilege = (roles: Role[]): boolean => {
  return isAdmin(roles) || isHR(roles);
};

// Return true if the user can view an employee's goal
export const canManageEmployee = (roles: Role[]): boolean => {
  return hasAdminPrivilege(roles) || isManager(roles);
};
