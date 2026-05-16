import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const res = await pool.query(`
    SELECT e.name, e.email, m.manager_id, m.division_manager_id, m.executive_id 
    FROM organization_memberships m
    JOIN employees e ON e.id = m.employee_id
  `);
  console.table(res.rows);
  pool.end();
}
main();
