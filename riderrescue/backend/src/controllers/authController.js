import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { signToken } from '../middleware/auth.js';
import { HttpError } from '../utils/http.js';
import { SERVICE_TYPES, validateAccount, validateServiceDetails } from '../utils/validators.js';

const BCRYPT_COST = 12;
// Compared against when no user is found, so response time doesn't reveal which IDs exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const publicUser = (u) => ({ id: u.id, user_id: u.user_id, name: u.name, email: u.email, phone: u.phone, role: u.role, status: u.status });
const publicProfile = (p) => p && ({
  id: p.id, shop_name: p.shop_name, service_type: p.service_type, service_details: p.service_details,
  average_rating: Number(p.average_rating), is_approved: p.is_approved,
});

async function loadProfile(userUuid) {
  const { rows } = await query(`SELECT * FROM provider_profiles WHERE user_id = $1`, [userUuid]);
  return rows[0] || null;
}

/* POST /api/auth/register/member */
export async function registerMember(req, res) {
  const { errors, value } = validateAccount(req.body);
  if (Object.keys(errors).length) throw new HttpError(422, 'Please fix the highlighted fields.', { fields: errors });

  const hash = await bcrypt.hash(value.password, BCRYPT_COST);
  const { rows } = await query(
    `INSERT INTO users (user_id, name, email, phone, nid_number, password_hash, role, status)
     VALUES ($1,$2,$3,$4,$5,$6,'member','active') RETURNING *`,
    [value.user_id, value.name, value.email, value.phone, value.nid_number, hash]);

  res.status(201).json({ token: signToken(rows[0]), user: publicUser(rows[0]), provider: null });
}

/* POST /api/auth/register/provider  → status 'pending', is_approved false */
export async function registerProvider(req, res) {
  const b = req.body;
  const { errors, value } = validateAccount(b);

  const shop_name = String(b.shop_name || '').trim();
  const trade_license_number = String(b.trade_license_number || '').trim();
  const service_type = b.service_type;

  if (!SERVICE_TYPES.includes(service_type)) errors.service_type = 'Choose a service category.';
  if (shop_name.length < 2) errors.shop_name = 'Enter your shop name (Dokaner Nam).';
  if (trade_license_number.length < 4) errors.trade_license_number = 'Enter your trade license number.';

  let details = {};
  if (SERVICE_TYPES.includes(service_type)) {
    const d = validateServiceDetails(service_type, b.service_details);
    Object.assign(errors, d.errors);
    details = d.value;
  }
  if (Object.keys(errors).length) throw new HttpError(422, 'Please fix the highlighted fields.', { fields: errors });

  const hash = await bcrypt.hash(value.password, BCRYPT_COST);

  const { user, profile } = await withTransaction(async (c) => {
    const u = (await c.query(
      `INSERT INTO users (user_id, name, email, phone, nid_number, password_hash, role, status)
       VALUES ($1,$2,$3,$4,$5,$6,'provider','pending') RETURNING *`,
      [value.user_id, value.name, value.email, value.phone, value.nid_number, hash])).rows[0];
    const p = (await c.query(
      `INSERT INTO provider_profiles (user_id, shop_name, trade_license_number, service_type, service_details, is_approved)
       VALUES ($1,$2,$3,$4,$5,FALSE) RETURNING *`,
      [u.id, shop_name, trade_license_number, service_type, JSON.stringify(details)])).rows[0];
    return { user: u, profile: p };
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user), provider: publicProfile(profile) });
}

/**
 * POST /api/auth/login
 * Body: { identifier, password }  — identifier is a User ID OR an email.
 * (Also accepts { user_id } or { email } for API clients.)
 * Optional { portal: 'admin' } restricts the admin login page to admins.
 */
export async function login(req, res) {
  const raw = String(req.body.identifier ?? req.body.user_id ?? req.body.email ?? '').trim().toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!raw || !password) throw new HttpError(422, 'Enter your User ID or email, and your password.');

  const column = raw.includes('@') ? 'email' : 'user_id';   // user_id can never contain "@"
  const { rows } = await query(`SELECT * FROM users WHERE LOWER(${column}) = $1`, [raw]);
  const user = rows[0];

  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  const portalMismatch = req.body.portal === 'admin' && user?.role !== 'admin';
  if (!user || !ok || portalMismatch) throw new HttpError(401, 'User ID/email or password is incorrect.');
  if (user.status === 'restricted') throw new HttpError(403, 'This account is restricted. Contact support.', { code: 'ACCOUNT_RESTRICTED' });

  const provider = user.role === 'provider' ? await loadProfile(user.id) : null;
  res.json({ token: signToken(user), user: publicUser(user), provider: publicProfile(provider) });
}

/* GET /api/auth/me */
export async function me(req, res) {
  const provider = req.user.role === 'provider' ? await loadProfile(req.user.id) : null;
  res.json({ user: req.user, provider: publicProfile(provider) });
}
