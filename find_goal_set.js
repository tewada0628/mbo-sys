import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const email = 't-wada+member@new-one.co.jp';
  const res = await pool.query(`
    SELECT g.id, g.status 
    FROM goal_sets g
    JOIN employees e ON e.id = g.employee_id
    WHERE e.email = $1
    ORDER BY g.created_at DESC
  `, [email]);
  console.log(res.rows);
  pool.end();
}
main();
