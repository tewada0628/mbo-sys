import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
async function main() {
  await pool.query("BEGIN");
  
  // 1. Delete the accidental GOAL_APPROVAL request
  await pool.query("DELETE FROM approval_requests WHERE id = '22a697e3-2818-448d-913f-b344e565842a'");
  
  // 2. Restore the GOAL_REVISION request to PENDING
  await pool.query("UPDATE approval_requests SET status = 'PENDING', resolved_at = NULL WHERE id = 'be6b202a-6593-4b59-bf20-bf7017b9497d'");
  
  // 3. Restore GoalSet status to APPROVED
  await pool.query("UPDATE goal_sets SET status = 'APPROVED' WHERE id = 'a915bb50-8345-4956-8878-67f150e7deab'");
  
  await pool.query("COMMIT");
  console.log("Database fixed!");
  pool.end();
}
main();
