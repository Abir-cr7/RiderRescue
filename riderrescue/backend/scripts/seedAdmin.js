import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const { ADMIN_USER_ID = 'admin', ADMIN_EMAIL = 'admin@riderrescue.app', ADMIN_PASSWORD } = process.env;
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) throw new Error('Set ADMIN_PASSWORD (8+ chars) in .env');

const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
await pool.query(
  `INSERT INTO users (user_id, name, email, phone, nid_number, password_hash, role, status)
   VALUES ($1,'Platform Admin',$2,'01700000000','0000000000',$3,'admin','active')
   ON CONFLICT (LOWER(email)) DO NOTHING`,
  [ADMIN_USER_ID, ADMIN_EMAIL.toLowerCase(), hash]);
console.log(`Admin ready → log in with "${ADMIN_USER_ID}" or "${ADMIN_EMAIL}"`);
await pool.end();
