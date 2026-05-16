import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const email = 't-wada+member@new-one.co.jp';
  const employeeRes = await pool.query("SELECT id FROM employees WHERE email = $1", [email]);
  if (employeeRes.rows.length === 0) {
    console.log("Employee not found");
    pool.end();
    return;
  }
  const employeeId = employeeRes.rows[0].id;
  console.log(`Resetting data for Employee ID: ${employeeId}`);

  // Delete notifications
  await pool.query("DELETE FROM notifications WHERE employee_id = $1", [employeeId]);
  
  // Find goal sets
  const goalSetsRes = await pool.query("SELECT id FROM goal_sets WHERE employee_id = $1", [employeeId]);
  const goalSetIds = goalSetsRes.rows.map(r => r.id);

  if (goalSetIds.length > 0) {
    const idsString = goalSetIds.map(id => `'${id}'`).join(',');
    
    // Delete approval requests related to these goal sets
    await pool.query(`DELETE FROM approval_requests WHERE goal_set_id IN (${idsString})`);
    
    // Delete goals
    await pool.query(`DELETE FROM goals WHERE goal_set_id IN (${idsString})`);
    
    // Delete goal sets
    await pool.query(`DELETE FROM goal_sets WHERE id IN (${idsString})`);
  }

  console.log("Data reset complete.");
  pool.end();
}
main();
