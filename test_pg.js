import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const res = await pool.query("SELECT id, request_type, status, approver_id FROM approval_requests WHERE goal_set_id = 'a915bb50-8345-4956-8878-67f150e7deab'");
  console.log(res.rows);
  pool.end();
}
main();
