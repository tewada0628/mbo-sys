import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const res = await pool.query(`
    SELECT m.id, m.manager_id, m.division_manager_id, m.executive_id 
    FROM organization_memberships m
    JOIN goal_sets g ON g.membership_id = m.id
    WHERE g.id = 'a915bb50-8345-4956-8878-67f150e7deab'
  `);
  console.log(res.rows);
  pool.end();
}
main();
