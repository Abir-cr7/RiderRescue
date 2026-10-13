import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { HttpError, wrap } from '../utils/http.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/** Verifies the bearer token and loads a fresh user row (so restrictions apply immediately). */
export const authenticate = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please log in to continue.');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again.');
  }

  const { rows } = await query(
    `SELECT id, user_id, name, email, phone, role, status FROM users WHERE id = $1`, [payload.sub]);
  const user = rows[0];
  if (!user) throw new HttpError(401, 'Account not found.');
  if (user.status === 'restricted') throw new HttpError(403, 'This account is restricted. Contact support.', { code: 'ACCOUNT_RESTRICTED' });

  req.user = user;
  next();
});

/** RBAC: allow only the listed roles. */
export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'You do not have access to this area.'));

/**
 * Providers only: loads their profile and blocks anything customer-facing
 * until an Admin has approved them (is_approved = true).
 */
export const requireApprovedProvider = wrap(async (req, _res, next) => {
  const { rows } = await query(`SELECT * FROM provider_profiles WHERE user_id = $1`, [req.user.id]);
  const profile = rows[0];
  if (!profile) throw new HttpError(403, 'No provider profile found.');
  if (!profile.is_approved) throw new HttpError(403, 'Your account is waiting for admin verification.', { code: 'PROVIDER_PENDING' });
  req.provider = profile;
  next();
});
