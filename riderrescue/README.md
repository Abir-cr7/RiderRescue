# RiderRescue — MOVE ON

React + Tailwind frontend, Express + PostgreSQL backend.

## Run it

```bash
# 1. Database
createdb riderrescue

# 2. API
cd backend
cp .env.example .env        # set JWT_SECRET and ADMIN_PASSWORD
npm install
npm run db:init             # creates the tables
npm run seed:admin          # creates the first admin
npm run dev                 # http://localhost:4000

# 3. Web app (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api to :4000)
```

Admin portal: `/admin/login`. Everyone else: `/login` (User ID **or** email).

## Provider approval flow

1. Provider registers → `users.status = 'pending'`, `provider_profiles.is_approved = false`.
2. They can log in and see the "Verification pending" banner, but `/api/requests/incoming` returns `403 PROVIDER_PENDING`, and members never see them in `/api/providers`.
3. Admin approves (`PUT /api/admin/verify-provider/:id {approved:true}`) → `is_approved = true`, `status = 'active'`.
4. Reject sets `status = 'restricted'` (login is blocked).

## API

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/register/member` | public |
| POST | `/api/auth/register/provider` | public |
| POST | `/api/auth/login` (`identifier` = User ID or email) | public |
| GET | `/api/auth/me` | any |
| GET | `/api/admin/pending-providers` | admin |
| PUT | `/api/admin/verify-provider/:id` | admin |
| GET | `/api/admin/stats`, `/api/admin/users` · PUT `/api/admin/users/:id/status` | admin |
| GET | `/api/providers` · POST `/api/requests` · GET `/api/requests/mine` · POST `/api/requests/:id/rate` | member |
| GET | `/api/requests/incoming` · PATCH `/api/requests/:id/status` | approved provider |

## Before going live

- NID numbers are stored as plain text so admins can review them. Encrypt that column at rest (e.g. pgcrypto or app-level encryption) and restrict DB access.
- The JWT is kept in `localStorage` for simplicity. For production, move it to an httpOnly, SameSite cookie.
- Put the API behind HTTPS and set `CLIENT_ORIGIN` to your real domain.
- Provider documents (a photo of the NID and trade license) aren't uploaded yet; reviewers see the numbers only.
