import 'dotenv/config';
import prisma from '../src/lib/db';

async function main() {
  const email = 't-wada+member@new-one.co.jp';
  
  const employee = await prisma.employee.findUnique({
    where: { email },
  });

  if (!employee) {
    console.log('Employee not found');
    return;
  }

  console.log(`Resetting data for employee: ${employee.name} (${email})`);

  // 1. Delete ApprovalRequests
  const approvalRequests = await prisma.approvalRequest.deleteMany({
    where: {
      goalSet: {
        employeeId: employee.id
      }
    }
  });
  console.log(`Deleted ${approvalRequests.count} approval requests`);

  // 2. Delete MidtermReviews
  const midtermReviews = await prisma.midtermReview.deleteMany({
    where: {
      goal: {
        goalSet: {
          employeeId: employee.id
        }
      }
    }
  });
  console.log(`Deleted ${midtermReviews.count} midterm reviews`);

  // 3. Delete Goals
  const goals = await prisma.goal.deleteMany({
    where: {
      goalSet: {
        employeeId: employee.id
      }
    }
  });
  console.log(`Deleted ${goals.count} goals`);

  // 4. Delete GoalSets
  const goalSets = await prisma.goalSet.deleteMany({
    where: {
      employeeId: employee.id
    }
  });
  console.log(`Deleted ${goalSets.count} goal sets`);

  // 5. Optionally reset notifications
  const notifications = await prisma.notification.deleteMany({
    where: {
      employeeId: employee.id
    }
  });
  console.log(`Deleted ${notifications.count} notifications`);

  console.log('Reset complete. The employee can now start goal setting from scratch.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
