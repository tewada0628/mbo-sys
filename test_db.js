import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const reqs = await prisma.approvalRequest.findMany({ where: { goalSetId: 'a915bb50-8345-4956-8878-67f150e7deab' } });
  console.log(reqs);
}
main();
