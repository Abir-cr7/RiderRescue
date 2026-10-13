// Shared validation rules (Bangladesh-oriented)
export const RE = {
  userId: /^[A-Za-z0-9_]{4,20}$/,                  // no "@" → login identifier is unambiguous
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(?:\+?88)?01[3-9]\d{8}$/,                // BD mobile
  nid: /^(\d{10}|\d{13}|\d{17})$/,                 // BD NID: 10 (smart) / 13 / 17 digits
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/,     // 72 = bcrypt byte limit
};

export const SERVICE_TYPES = ['fuel', 'rescue', 'workshop'];

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Fields common to every account. Returns { errors, value }. */
export function validateAccount(b) {
  const errors = {};
  const v = {
    name: str(b.name),
    user_id: str(b.user_id),
    email: str(b.email).toLowerCase(),
    phone: str(b.phone).replace(/[\s-]/g, ''),
    nid_number: str(b.nid_number).replace(/\s/g, ''),
    password: typeof b.password === 'string' ? b.password : '',
  };
  if (v.name.length < 2) errors.name = 'Enter your full name.';
  if (!RE.userId.test(v.user_id)) errors.user_id = 'Use 4–20 letters, numbers or underscores.';
  if (!RE.email.test(v.email)) errors.email = 'Enter a valid email address.';
  if (!RE.phone.test(v.phone)) errors.phone = 'Enter a valid mobile number, e.g. 01712345678.';
  if (!RE.nid.test(v.nid_number)) errors.nid_number = 'NID must be 10, 13 or 17 digits.';
  if (!RE.password.test(v.password)) errors.password = 'Use 8+ characters with at least one letter and one number.';
  if (v.password !== b.confirm_password) errors.confirm_password = 'Passwords do not match.';
  return { errors, value: v };
}

/** Category-specific details → normalized JSON stored in provider_profiles.service_details */
export function validateServiceDetails(type, d = {}) {
  const errors = {};
  const arr = (x) => (Array.isArray(x) ? x.map(str).filter(Boolean) : []);
  const num = (x) => (x === '' || x == null ? NaN : Number(x));
  let value = {};

  if (type === 'fuel') {
    value = { grades: arr(d.grades), price_per_liter: num(d.price_per_liter), delivery_radius_km: num(d.delivery_radius_km) };
    if (!value.grades.length) errors.grades = 'Select at least one fuel grade.';
    if (!(value.price_per_liter > 0)) errors.price_per_liter = 'Enter a price per liter.';
    if (!(value.delivery_radius_km > 0 && value.delivery_radius_km <= 100)) errors.delivery_radius_km = 'Enter a radius between 1 and 100 km.';
  } else if (type === 'rescue') {
    value = { hotline: str(d.hotline).replace(/[\s-]/g, ''), vehicle_types: arr(d.vehicle_types), response_capacity: num(d.response_capacity) };
    if (!RE.phone.test(value.hotline)) errors.hotline = 'Enter a valid hotline number.';
    if (!value.vehicle_types.length) errors.vehicle_types = 'Select at least one vehicle or towing type.';
    if (!(value.response_capacity >= 1)) errors.response_capacity = 'How many calls can you handle at once?';
  } else if (type === 'workshop') {
    value = { address: str(d.address), lat: num(d.lat), lng: num(d.lng), services: arr(d.services), base_rate: num(d.base_rate) };
    if (value.address.length < 5) errors.address = 'Enter the shop address.';
    if (!(value.lat >= -90 && value.lat <= 90) || !(value.lng >= -180 && value.lng <= 180)) errors.lat = 'Enter valid GPS coordinates.';
    if (!value.services.length) errors.services = 'Select at least one repair service.';
    if (!(value.base_rate >= 0)) errors.base_rate = 'Enter your base rate.';
  }
  return { errors, value };
}
