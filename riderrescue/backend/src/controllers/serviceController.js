import { query, withTransaction } from '../db.js';
import { HttpError } from '../utils/http.js';
import { SERVICE_TYPES } from '../utils/validators.js';

const haversineKm = (a, b) => {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/* GET /api/providers?type=&q=&lat=&lng=   — approved providers only */
export async function listProviders(req, res) {
  const type = SERVICE_TYPES.includes(req.query.type) ? req.query.type : null;
  const q = String(req.query.q || '').trim().toLowerCase();
  const here = { lat: parseFloat(req.query.lat), lng: parseFloat(req.query.lng) };
  const hasHere = Number.isFinite(here.lat) && Number.isFinite(here.lng);

  const { rows } = await query(
    `SELECT p.id, p.shop_name, p.service_type, p.service_details, p.average_rating::float AS average_rating,
            u.name AS provider_name,
            (SELECT COUNT(*)::int FROM service_requests r WHERE r.provider_id = p.id AND r.rating IS NOT NULL) AS rating_count
       FROM provider_profiles p JOIN users u ON u.id = p.user_id
      WHERE p.is_approved = TRUE AND u.status = 'active'
        AND ($1::text IS NULL OR p.service_type = $1)
        AND ($2 = '' OR LOWER(p.shop_name) LIKE '%'||$2||'%')
      ORDER BY p.average_rating DESC, p.shop_name ASC
      LIMIT 100`, [type, q]);

  const providers = rows.map((p) => {
    const d = p.service_details || {};
    const distance_km = hasHere && Number.isFinite(d.lat) && Number.isFinite(d.lng)
      ? Math.round(haversineKm(here, d) * 10) / 10 : null;     // only workshops store GPS
    return { ...p, distance_km };
  });
  res.json({ providers });
}

/* POST /api/requests  (member) Body: { provider_id, details } */
export async function createRequest(req, res) {
  const { provider_id, details } = req.body;
  if (typeof details !== 'object' || details === null || Array.isArray(details)) throw new HttpError(422, 'Add the details of your request.');
  if (JSON.stringify(details).length > 4000) throw new HttpError(413, 'Request details are too long.');

  const p = (await query(
    `SELECT p.id, p.service_type FROM provider_profiles p JOIN users u ON u.id = p.user_id
      WHERE p.id = $1 AND p.is_approved = TRUE AND u.status = 'active'`, [provider_id])).rows[0];
  if (!p) throw new HttpError(404, 'That provider is not available.');

  const { rows } = await query(
    `INSERT INTO service_requests (member_id, provider_id, service_type, details) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.user.id, p.id, p.service_type, JSON.stringify(details)]);
  res.status(201).json({ request: rows[0] });
}

/* GET /api/requests/mine  (member) */
export async function myRequests(req, res) {
  const { rows } = await query(
    `SELECT r.id, r.service_type, r.status, r.details, r.total_amount::float AS total_amount, r.rating, r.created_at,
            p.shop_name
       FROM service_requests r JOIN provider_profiles p ON p.id = r.provider_id
      WHERE r.member_id = $1 ORDER BY r.created_at DESC LIMIT 50`, [req.user.id]);
  res.json({ requests: rows });
}

/* GET /api/requests/incoming  (approved provider) — only requests addressed to this provider, hence only their service type */
export async function incomingRequests(req, res) {
  const { rows } = await query(
    `SELECT r.id, r.service_type, r.status, r.details, r.total_amount::float AS total_amount, r.rating, r.created_at,
            u.name AS member_name, u.phone AS member_phone
       FROM service_requests r JOIN users u ON u.id = r.member_id
      WHERE r.provider_id = $1 AND r.service_type = $2
      ORDER BY (r.status IN ('requested','accepted','in_progress')) DESC, r.created_at DESC LIMIT 100`,
    [req.provider.id, req.provider.service_type]);
  res.json({ requests: rows });
}

const NEXT = { requested: ['accepted', 'cancelled'], accepted: ['in_progress', 'cancelled'], in_progress: ['completed'] };

/* PATCH /api/requests/:id/status  (approved provider) Body: { status, total_amount? } */
export async function updateRequestStatus(req, res) {
  const { status, total_amount } = req.body;
  const cur = (await query(`SELECT id, status FROM service_requests WHERE id = $1 AND provider_id = $2`, [req.params.id, req.provider.id])).rows[0];
  if (!cur) throw new HttpError(404, 'Request not found.');
  if (!NEXT[cur.status]?.includes(status)) throw new HttpError(409, `A ${cur.status.replace('_', ' ')} request can't move to ${status}.`);

  let amount = null;
  if (status === 'completed') {
    amount = Number(total_amount);
    if (!(amount >= 0)) throw new HttpError(422, 'Enter the final amount charged.');
  }
  const { rows } = await query(
    `UPDATE service_requests SET status = $1, total_amount = COALESCE($2, total_amount), updated_at = now() WHERE id = $3 RETURNING *`,
    [status, amount, cur.id]);
  res.json({ request: rows[0] });
}

/* POST /api/requests/:id/rate  (member) Body: { rating: 1–5 } — recalculates provider average */
export async function rateRequest(req, res) {
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(422, 'Rating must be 1 to 5.');

  const out = await withTransaction(async (c) => {
    const r = (await c.query(
      `UPDATE service_requests SET rating = $1, updated_at = now()
        WHERE id = $2 AND member_id = $3 AND status = 'completed' AND rating IS NULL RETURNING provider_id`,
      [rating, req.params.id, req.user.id])).rows[0];
    if (!r) throw new HttpError(409, 'Only your completed, unrated requests can be rated.');
    await c.query(
      `UPDATE provider_profiles SET average_rating =
         (SELECT ROUND(AVG(rating)::numeric, 2) FROM service_requests WHERE provider_id = $1 AND rating IS NOT NULL)
       WHERE id = $1`, [r.provider_id]);
    return r;
  });
  res.json({ ok: true, provider_id: out.provider_id });
}
