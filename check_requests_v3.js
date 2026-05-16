import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const res = await pool.query("SELECT id, request_type, status, approver_id, requested_at, resolved_at FROM approval_requests WHERE goal_set_id = '8f4b6393-52ac-4906-9a61-4b4364abe7ef' ORDER BY requested_at DESC");
  console.log("--- Approval Requests ---");
  console.table(res.rows);
  
  const gs = await pool.query("SELECT id, status FROM goal_sets WHERE id = '8f4b6393-52ac-4906-9a61-4b4364abe7ef'");
  console.log("--- Goal Set Status ---");
  console.table(gs.rows);
  
  pool.end();
}
main();
