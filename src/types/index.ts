import { 
  Role as PrismaRole, 
  EmployeeType as PrismaEmployeeType,
  GoalType as PrismaGoalType,
  GoalSetStatus as PrismaGoalSetStatus,
  ApprovalRequestType as PrismaApprovalRequestType,
  ApprovalStatus as PrismaApprovalStatus,
  PhaseType as PrismaPhaseType
} from '@prisma/client';

export * from '@prisma/client';

// Re-exporting as cleaner names if needed or using as is
export type Role = PrismaRole;
export type EmployeeType = PrismaEmployeeType;
export type GoalType = PrismaGoalType;
export type GoalSetStatus = PrismaGoalSetStatus;
export type ApprovalRequestType = PrismaApprovalRequestType;
export type ApprovalStatus = PrismaApprovalStatus;
export type PhaseType = PrismaPhaseType;

// Custom types for frontend/logic
export interface UserSession {
  id: string;
  email: string;
  name: string;
  roles: Role[];
}

export type RevisionReason = 
  | 'KPI_CHANGE' 
  | 'STANDARD_DEVIATION' 
  | 'ROLE_CHANGE' 
  | 'MIDTERM_ENTRY' 
  | 'EARLY_CLOSURE' 
  | 'GRADE_PROMOTION';
