import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  // 1. Check all employees and their IDs
  const employees = await pool.query("SELECT id, name, email FROM employees");
  console.log("--- Employees ---");
  console.table(employees.rows);

  // 2. Check who is assigned as manager, division_manager, executive in memberships
  const roles = await pool.query(`
    SELECT DISTINCT manager_id as id, 'Manager' as role FROM organization_memberships WHERE manager_id IS NOT NULL
    UNION
    SELECT DISTINCT division_manager_id as id, 'Division Manager' as role FROM organization_memberships WHERE division_manager_id IS NOT NULL
    UNION
    SELECT DISTINCT executive_id as id, 'Executive' as role FROM organization_memberships WHERE executive_id IS NOT NULL
  `);
  
  console.log("--- Roles Assigned in Memberships ---");
  const rolesWithNames = roles.rows.map(role => {
    const emp = employees.rows.find(e => e.id === role.id);
    return {
      name: emp ? emp.name : 'Unknown',
      email: emp ? emp.email : 'Unknown',
      role: role.role
    };
  });
  console.table(rolesWithNames);

  pool.end();
}
main();
