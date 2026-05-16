import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const res = await pool.query(`
    SELECT p.name as period_name, ph.phase_type, ph.start_date, ph.end_date
    FROM period_phases ph
    JOIN evaluation_periods p ON p.id = ph.evaluation_period_id
    ORDER BY ph.start_date ASC
  `);
  console.table(res.rows);
  pool.end();
}
main();
