import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const res = await pool.query("SELECT id, name, phase_type, start_date, end_date FROM evaluation_periods");
  console.table(res.rows);
  pool.end();
}
main();
