import type {
  AdminStats, AdminUser, IncomingRequest, MemberRequest, PendingProvider,
  ProviderListing, ProviderProfile, ServiceType, User,
} from './types';

export class ApiError extends Error {
  status: number;
  code?: string;
  fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}, code?: string) {
    super(message);
    this.status = status; this.fields = fields; this.code = code;
  }
}

const TOKEN_KEY = 'rr_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Can’t reach RiderRescue. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong.', data.fields, data.code);
  return data as T;
}

export interface Session { token: string; user: User; provider: ProviderProfile | null }

export const api = {
  // auth
  login: (identifier: string, password: string, portal?: 'admin') =>
    request<Session>('/auth/login', { method: 'POST', body: { identifier, password, portal } }),
  registerMember: (body: Record<string, unknown>) => request<Session>('/auth/register/member', { method: 'POST', body }),
  registerProvider: (body: Record<string, unknown>) => request<Session>('/auth/register/provider', { method: 'POST', body }),
  me: () => request<{ user: User; provider: ProviderProfile | null }>('/auth/me'),

  // member
  providers: (p: { type?: ServiceType | 'all'; q?: string; lat?: number; lng?: number }) => {
    const qs = new URLSearchParams();
    if (p.type && p.type !== 'all') qs.set('type', p.type);
    if (p.q) qs.set('q', p.q);
    if (p.lat != null && p.lng != null) { qs.set('lat', String(p.lat)); qs.set('lng', String(p.lng)); }
    return request<{ providers: ProviderListing[] }>(`/providers?${qs}`);
  },
  createRequest: (provider_id: string, details: Record<string, unknown>) =>
    request('/requests', { method: 'POST', body: { provider_id, details } }),
  myRequests: () => request<{ requests: MemberRequest[] }>('/requests/mine'),
  rate: (id: string, rating: number) => request(`/requests/${id}/rate`, { method: 'POST', body: { rating } }),

  // provider
  incoming: () => request<{ requests: IncomingRequest[] }>('/requests/incoming'),
  setStatus: (id: string, status: string, total_amount?: number) =>
    request(`/requests/${id}/status`, { method: 'PATCH', body: { status, total_amount } }),

  // admin
  pending: () => request<{ providers: PendingProvider[] }>('/admin/pending-providers'),
  verify: (id: string, approved: boolean) => request(`/admin/verify-provider/${id}`, { method: 'PUT', body: { approved } }),
  stats: () => request<AdminStats>('/admin/stats'),
  users: (q = '') => request<{ users: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(q)}`),
  setUserStatus: (id: string, status: 'active' | 'restricted') =>
    request(`/admin/users/${id}/status`, { method: 'PUT', body: { status } }),
};
