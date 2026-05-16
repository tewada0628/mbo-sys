import 'dotenv/config';
import prisma from '../src/lib/db';

async function main() {
  const phases = await prisma.periodPhase.findMany({
    orderBy: { startDate: 'asc' }
  });
  console.log(JSON.stringify(phases, null, 2));
}

main();
