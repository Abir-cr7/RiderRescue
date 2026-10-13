export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Wrap async route handlers so rejections reach the error middleware. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
  // Postgres unique violation → friendly field-level message
  if (err.code === '23505') {
    const c = err.constraint || '';
    const field = c.includes('email') ? 'email' : c.includes('user_id') ? 'user_id' : c.includes('trade') ? 'trade_license_number' : null;
    const label = { email: 'email', user_id: 'User ID', trade_license_number: 'trade license number' }[field] || 'value';
    return res.status(409).json({ error: `That ${label} is already registered.`, fields: field ? { [field]: `That ${label} is already registered.` } : {} });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
