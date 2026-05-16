import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  const managerEmail = 't-wada+manager@new-one.co.jp';
  const memberEmail = 't-wada+member@new-one.co.jp';
  const executiveEmail = 't-wada@new-one.co.jp'; // Setting an executive too to complete the flow

  const managerRes = await pool.query("SELECT id FROM employees WHERE email = $1", [managerEmail]);
  const executiveRes = await pool.query("SELECT id FROM employees WHERE email = $1", [executiveEmail]);
  
  if (managerRes.rows.length === 0) {
    console.log("Manager not found");
    pool.end();
    return;
  }
  
  const managerId = managerRes.rows[0].id;
  const executiveId = executiveRes.rows[0] ? executiveRes.rows[0].id : null;

  const updateRes = await pool.query(`
    UPDATE organization_memberships 
    SET division_manager_id = $1, executive_id = $2
    WHERE employee_id = (SELECT id FROM employees WHERE email = $3)
  `, [managerId, executiveId, memberEmail]);

  console.log(`Updated ${updateRes.rowCount} membership records.`);
  console.log(`Member: ${memberEmail}`);
  console.log(`Division Manager: ${managerEmail} (Same as Manager)`);
  console.log(`Executive: ${executiveEmail}`);

  pool.end();
}
main();
