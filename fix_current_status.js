import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const goalSetId = '94cc1ec4-0d27-40f3-bc54-9eb18cbdff7d';
  const res = await pool.query("UPDATE goal_sets SET status = 'PENDING_MANAGER' WHERE id = $1", [goalSetId]);
  console.log(`Updated ${res.rowCount} records.`);
  pool.end();
}
main();
