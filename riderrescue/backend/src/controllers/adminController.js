import { query, withTransaction } from '../db.js';
import { HttpError } from '../utils/http.js';

/* GET /api/admin/pending-providers — the review queue */
export async function pendingProviders(_req, res) {
  const { rows } = await query(
    `SELECT p.id, p.shop_name, p.trade_license_number, p.service_type, p.service_details,
            u.name AS provider_name, u.user_id, u.email, u.phone, u.nid_number, u.created_at
       FROM provider_profiles p
       JOIN users u ON u.id = p.user_id
      WHERE p.is_approved = FALSE AND u.status = 'pending'
      ORDER BY u.created_at ASC`);
  res.json({ providers: rows });
}

/**
 * PUT /api/admin/verify-provider/:id        (:id = provider_profiles.id)
 * Body: { approved?: boolean }  — omit to toggle the current state.
 * approve → is_approved = true,  user.status = 'active'
 * reject  → is_approved = false, user.status = 'restricted'
 */
export async function verifyProvider(req, res) {
  const { id } = req.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'Invalid provider id.');

  const result = await withTransaction(async (c) => {
    const found = (await c.query(`SELECT id, user_id, is_approved FROM provider_profiles WHERE id = $1 FOR UPDATE`, [id])).rows[0];
    if (!found) throw new HttpError(404, 'Provider not found.');

    const approved = typeof req.body.approved === 'boolean' ? req.body.approved : !found.is_approved;

    const profile = (await c.query(
      `UPDATE provider_profiles SET is_approved = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3 RETURNING id, shop_name, is_approved`,
      [approved, req.user.id, id])).rows[0];
    await c.query(`UPDATE users SET status = $1 WHERE id = $2`, [approved ? 'active' : 'restricted', found.user_id]);
    return profile;
  });

  res.json({ provider: result });
}

/* GET /api/admin/stats */
export async function stats(_req, res) {
  const [members, providers, revenue, ratings] = await Promise.all([
    query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'member' AND status = 'active'`),
    query(`SELECT service_type, COUNT(*)::int AS n FROM provider_profiles WHERE is_approved GROUP BY service_type`),
    query(`SELECT COALESCE(SUM(total_amount),0)::float AS total FROM service_requests WHERE status = 'completed'`),
    query(`SELECT service_type, ROUND(AVG(average_rating) FILTER (WHERE average_rating > 0),2)::float AS avg
             FROM provider_profiles WHERE is_approved GROUP BY service_type`),
  ]);

  const byType = { fuel: 0, rescue: 0, workshop: 0 };
  providers.rows.forEach((r) => (byType[r.service_type] = r.n));
  const ratingByType = { fuel: null, rescue: null, workshop: null };
  ratings.rows.forEach((r) => (ratingByType[r.service_type] = r.avg));

  res.json({
    active_members: members.rows[0].n,
    verified_providers: byType,
    total_revenue: revenue.rows[0].total,
    average_rating: ratingByType,
  });
}

/* GET /api/admin/users?role=&q= */
export async function listUsers(req, res) {
  const role = ['member', 'provider'].includes(req.query.role) ? req.query.role : null;
  const q = String(req.query.q || '').trim().toLowerCase();
  const { rows } = await query(
    `SELECT id, user_id, name, email, phone, role, status, created_at
       FROM users
      WHERE role <> 'admin'
        AND ($1::text IS NULL OR role = $1)
        AND ($2 = '' OR LOWER(name) LIKE '%'||$2||'%' OR LOWER(user_id) LIKE '%'||$2||'%' OR LOWER(email) LIKE '%'||$2||'%')
      ORDER BY created_at DESC LIMIT 200`, [role, q]);
  res.json({ users: rows });
}

/* PUT /api/admin/users/:id/status   Body: { status: 'active' | 'restricted' } */
export async function setUserStatus(req, res) {
  const { status } = req.body;
  if (!['active', 'restricted'].includes(status)) throw new HttpError(422, 'Status must be active or restricted.');
  const { rows } = await query(
    `UPDATE users SET status = $1 WHERE id = $2 AND role <> 'admin' RETURNING id, user_id, status`, [status, req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'User not found.');
  res.json({ user: rows[0] });
}
