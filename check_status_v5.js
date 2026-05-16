import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const goalSetId = '0a28e557-5632-4195-abcb-094787c51d24';
  const res = await pool.query("SELECT status FROM goal_sets WHERE id = $1", [goalSetId]);
  console.log(res.rows);
  pool.end();
}
main();
