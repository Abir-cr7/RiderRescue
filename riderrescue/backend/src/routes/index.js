import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { wrap } from '../utils/http.js';
import { authenticate, requireRole, requireApprovedProvider } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as admin from '../controllers/adminController.js';
import * as svc from '../controllers/serviceController.js';

const r = Router();

// Slow down password guessing
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a few minutes.' } });

/* ── Auth ── */
r.post('/auth/register/member', wrap(auth.registerMember));
r.post('/auth/register/provider', wrap(auth.registerProvider));
r.post('/auth/login', loginLimiter, wrap(auth.login));
r.get('/auth/me', authenticate, wrap(auth.me));

/* ── Admin ── */
const adminOnly = [authenticate, requireRole('admin')];
r.get('/admin/pending-providers', adminOnly, wrap(admin.pendingProviders));
r.put('/admin/verify-provider/:id', adminOnly, wrap(admin.verifyProvider));
r.get('/admin/stats', adminOnly, wrap(admin.stats));
r.get('/admin/users', adminOnly, wrap(admin.listUsers));
r.put('/admin/users/:id/status', adminOnly, wrap(admin.setUserStatus));

/* ── Members ── */
r.get('/providers', authenticate, requireRole('member'), wrap(svc.listProviders));
r.post('/requests', authenticate, requireRole('member'), wrap(svc.createRequest));
r.get('/requests/mine', authenticate, requireRole('member'), wrap(svc.myRequests));
r.post('/requests/:id/rate', authenticate, requireRole('member'), wrap(svc.rateRequest));

/* ── Providers (approved only) ── */
const approvedProvider = [authenticate, requireRole('provider'), requireApprovedProvider];
r.get('/requests/incoming', approvedProvider, wrap(svc.incomingRequests));
r.patch('/requests/:id/status', approvedProvider, wrap(svc.updateRequestStatus));

export default r;
