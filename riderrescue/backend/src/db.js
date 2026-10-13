import 'dotenv/config';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, '../db/pgdata');

async function testTcpConnection(connectionString) {
  try {
    const url = new URL(connectionString);
    const host = url.hostname || 'localhost';
    const port = parseInt(url.port, 10) || 5432;
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1200);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });
  } catch {
    return false;
  }
}

let mode = 'pg';
let pgPool = null;
let pgliteDb = null;

const dbUrl = process.env.DATABASE_URL || '';
const preferPglite = process.env.USE_PGLITE === 'true' || !dbUrl || dbUrl.startsWith('pglite');

let hasPostgres = false;
if (!preferPglite && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
  hasPostgres = await testTcpConnection(dbUrl);
}

if (hasPostgres) {
  mode = 'pg';
  pgPool = new pg.Pool({ connectionString: dbUrl });
  console.log('[DB] Connected to PostgreSQL service.');
} else {
  mode = 'pglite';
  const { PGlite } = await import('@electric-sql/pglite');
  fs.mkdirSync(dbDir, { recursive: true });
  pgliteDb = new PGlite(dbDir);
  console.log(`[DB] PostgreSQL service not detected; using persistent embedded PGlite at ${dbDir}`);
}

export const pool = mode === 'pg' ? pgPool : {
  query: (text, params) => pgliteDb.query(text, params),
  exec: (sql) => pgliteDb.exec(sql),
  connect: async () => ({
    query: (text, params) => pgliteDb.query(text, params),
    release: () => {},
  }),
  end: async () => {
    if (pgliteDb) await pgliteDb.close();
  },
};

export const query = (text, params) => {
  if (mode === 'pg') {
    return pgPool.query(text, params);
  }
  return pgliteDb.query(text, params);
};

/** Run `fn(client)` inside a transaction. */
export async function withTransaction(fn) {
  if (mode === 'pg') {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    return await pgliteDb.transaction(async (tx) => {
      return await fn(tx);
    });
  }
}

/** Automatically bootstrap schema and seed admin if database is uninitialized */
export async function ensureDbReady() {
  try {
    const res = await query(`SELECT to_regclass('public.users') as exists`);
    if (!res.rows[0]?.exists) {
      console.log('[DB] Database tables not found. Automatically applying schema...');
      const schemaPath = path.resolve(__dirname, '../db/schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      if (mode === 'pglite' || pool.exec) {
        await (pool.exec ? pool.exec(sql) : query(sql));
      } else {
        await query(sql);
      }
      console.log('[DB] Schema applied successfully.');

      const adminPass = process.env.ADMIN_PASSWORD || 'ChangeMe123';
      const adminUser = process.env.ADMIN_USER_ID || 'admin';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@riderrescue.app';
      const bcrypt = (await import('bcryptjs')).default;
      const hash = await bcrypt.hash(adminPass, 12);
      await query(
        `INSERT INTO users (user_id, name, email, phone, nid_number, password_hash, role, status)
         VALUES ($1,'Platform Admin',$2,'01700000000','0000000000',$3,'admin','active')
         ON CONFLICT (LOWER(email)) DO NOTHING`,
        [adminUser, adminEmail.toLowerCase(), hash]
      );
      console.log(`[DB] Default admin ready → ID: "${adminUser}", Email: "${adminEmail}", Pass: "${adminPass}"`);
    }
  } catch (err) {
    console.error('[DB] Auto-bootstrap error:', err);
  }
}
