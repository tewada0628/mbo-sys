import 'dotenv/config';
import prisma from '../src/lib/db';

async function main() {
  const emails = [
    't-wada+member@new-one.co.jp',
    't-wada+manager@new-one.co.jp',
    't-wada+hr@new-one.co.jp',
    't-wada@new-one.co.jp'
  ];

  console.log('Starting full reset for the following users:');
  console.log(emails);

  const employees = await prisma.employee.findMany({
    where: {
      email: { in: emails }
    }
  });

  if (employees.length === 0) {
    console.log('No employees found with the specified emails.');
    return;
  }

  const employeeIds = employees.map(emp => emp.id);
  console.log('Employee IDs found:', employeeIds);

  // 1. Delete notifications where employeeId is in the list
  const deletedNotifications = await prisma.notification.deleteMany({
    where: {
      employeeId: { in: employeeIds }
    }
  });
  console.log(`Deleted ${deletedNotifications.count} notifications.`);

  // 2. Delete approval requests where requester or approver is in the list
  const deletedApprovalRequests = await prisma.approvalRequest.deleteMany({
    where: {
      OR: [
        { requesterId: { in: employeeIds } },
        { approverId: { in: employeeIds } }
      ]
    }
  });
  console.log(`Deleted ${deletedApprovalRequests.count} approval requests.`);

  // 3. Find all goal sets belonging to these employees to delete dependent records
  const goalSets = await prisma.goalSet.findMany({
    where: {
      employeeId: { in: employeeIds }
    },
    select: {
      id: true
    }
  });
  const goalSetIds = goalSets.map(gs => gs.id);

  if (goalSetIds.length > 0) {
    // Delete final evaluations for these goal sets
    const deletedFinalEvals = await prisma.finalEvaluation.deleteMany({
      where: {
        goalSetId: { in: goalSetIds }
      }
    });
    console.log(`Deleted ${deletedFinalEvals.count} final evaluations.`);

    // Find all goals belonging to these goal sets
    const goals = await prisma.goal.findMany({
      where: {
        goalSetId: { in: goalSetIds }
      },
      select: {
        id: true
      }
    });
    const goalIds = goals.map(g => g.id);

    if (goalIds.length > 0) {
      // Delete midterm reviews
      const deletedMidterm = await prisma.midtermReview.deleteMany({
        where: {
          goalId: { in: goalIds }
        }
      });
      console.log(`Deleted ${deletedMidterm.count} midterm reviews.`);

      // Delete self reviews
      const deletedSelf = await prisma.selfReview.deleteMany({
        where: {
          goalId: { in: goalIds }
        }
      });
      console.log(`Deleted ${deletedSelf.count} self reviews.`);

      // Delete manager reviews
      const deletedManager = await prisma.managerReview.deleteMany({
        where: {
          goalId: { in: goalIds }
        }
      });
      console.log(`Deleted ${deletedManager.count} manager reviews.`);

      // Delete goals
      const deletedGoals = await prisma.goal.deleteMany({
        where: {
          id: { in: goalIds }
        }
      });
      console.log(`Deleted ${deletedGoals.count} goals.`);
    }

    // Delete goal sets
    const deletedGoalSets = await prisma.goalSet.deleteMany({
      where: {
        id: { in: goalSetIds }
      }
    });
    console.log(`Deleted ${deletedGoalSets.count} goal sets.`);
  }

  // 4. Delete 360 scores for these employees
  const deleted360 = await prisma.degree360Score.deleteMany({
    where: {
      employeeId: { in: employeeIds }
    }
  });
  console.log(`Deleted ${deleted360.count} 360 scores.`);

  // 5. Delete audit logs where actor is in the list
  const deletedAudit = await prisma.auditLog.deleteMany({
    where: {
      actorId: { in: employeeIds }
    }
  });
  console.log(`Deleted ${deletedAudit.count} audit logs.`);

  console.log('Full reset completed successfully!');
}

main()
  .catch(e => {
    console.error('Error executing reset:', e);
    process.exit(1);
  });
