import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const email = 't-wada+member@new-one.co.jp';
  const res = await pool.query(`
    SELECT m.id, m.manager_id, m.division_manager_id, m.executive_id 
    FROM organization_memberships m
    JOIN employees e ON e.id = m.employee_id
    WHERE e.email = $1
  `, [email]);
  console.log(res.rows);
  pool.end();
}
main();
