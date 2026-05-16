import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const res = await pool.query("SELECT id, title, version, is_current FROM goals WHERE goal_set_id = 'a915bb50-8345-4956-8878-67f150e7deab' ORDER BY version DESC, is_current DESC");
  console.log(res.rows);
  pool.end();
}
main();
