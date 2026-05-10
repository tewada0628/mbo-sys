import 'dotenv/config';
import prisma from '../src/lib/db.ts';

async function test() {
  console.log('Connecting to database via pooler...');
  try {
    const employees = await prisma.employee.findMany();
    console.log(`Success! Found ${employees.length} employees.`);
    employees.forEach(e => console.log(`- ${e.name} (${e.email})`));
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
