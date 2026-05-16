import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const gsId = '94cc1ec4-0d27-40f3-bc54-9eb18cbdff7d';
  const res = await pool.query("SELECT id, request_type, status FROM approval_requests WHERE goal_set_id = $1 ORDER BY requested_at DESC", [gsId]);
  console.table(res.rows);
  pool.end();
}
main();
