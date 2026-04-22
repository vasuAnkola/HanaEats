import { Pool } from "pg";
import fs from "fs";
import path from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined },
});

async function run() {
  const sqlDir = path.join(process.cwd(), "sql");
  const files = fs.readdirSync(sqlDir).sort();

  for (const file of files) {
    if (!file.endsWith(".sql")) continue;
    console.log(`Running ${file}...`);
    const sql = fs.readFileSync(path.join(sqlDir, file), "utf-8");
    await pool.query(sql);
    console.log(`✓ ${file} done`);
  }

  await pool.end();
  console.log("Migration complete.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
