import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const goalSetId = '0a28e557-5632-4195-abcb-094787c51d24';
  const res = await pool.query("SELECT id, request_type, status, approver_id, requested_at, resolved_at FROM approval_requests WHERE goal_set_id = $1 ORDER BY requested_at DESC", [goalSetId]);
  console.log("--- Approval Requests ---");
  console.table(res.rows);
  pool.end();
}
main();
