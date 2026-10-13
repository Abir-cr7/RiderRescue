import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function init() {
  const schemaPath = path.resolve(__dirname, '../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('[DB] Initializing database schema...');
  if (pool.exec) {
    await pool.exec(sql);
  } else {
    await query(sql);
  }
  console.log('[DB] Database schema initialized successfully.');
  if (pool.end) await pool.end();
}

init().catch((err) => {
  console.error('[DB] Database initialization error:', err);
  process.exit(1);
});
