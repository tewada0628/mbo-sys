import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 1);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 7);

  const res = await pool.query(`
    UPDATE period_phases 
    SET start_date = $1, end_date = $2
    WHERE phase_type = 'MIDTERM'
  `, [startDate, endDate]);

  console.log(`Updated ${res.rowCount} phases to be active.`);
  pool.end();
}
main();
