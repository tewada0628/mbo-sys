import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const res = await pool.query("SELECT id, request_type, status, approver_id, requested_at, resolved_at FROM approval_requests WHERE goal_set_id = 'a915bb50-8345-4956-8878-67f150e7deab' ORDER BY requested_at DESC");
  console.log(res.rows);
  pool.end();
}
main();
