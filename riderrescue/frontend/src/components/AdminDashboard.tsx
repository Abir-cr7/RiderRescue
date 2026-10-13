import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { SERVICE_LABEL, type AdminStats, type AdminUser, type PendingProvider, type ServiceType } from '../lib/types';
import { Button, Empty, ErrorNote, Modal, Rating, TextInput, TypeBadge, taka } from './ui';

const TYPES: ServiceType[] = ['fuel', 'rescue', 'workshop'];

export default function AdminDashboard() {
  const [tab, setTab] = useState<'queue' | 'users'>('queue');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<PendingProvider[]>([]);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState<PendingProvider | null>(null);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.stats(), api.pending()]);
      setStats(s); setPending(p.providers); setError('');
    } catch (e) { setError((e as ApiError).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const decide = async (p: PendingProvider, approved: boolean) => {
    setBusyId(p.id);
    try { await api.verify(p.id, approved); await load(); } catch (e) { setError((e as ApiError).message); }
    finally { setBusyId(''); setRejecting(null); }
  };

  const totalProviders = stats ? TYPES.reduce((n, t) => n + stats.verified_providers[t], 0) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Admin dashboard</h1>
      <ErrorNote>{error}</ErrorNote>

      {/* platform stats */}
      <section className="grid gap-4 md:grid-cols-4" aria-label="Platform stats">
        <Metric label="Active members" value={stats ? String(stats.active_members) : '–'} />
        <Metric label="Verified providers" value={stats ? String(totalProviders) : '–'} />
        <Metric label="Total revenue" value={stats ? taka(stats.total_revenue) : '–'} tone="go" />
        <Metric label="Awaiting review" value={String(pending.length)} tone={pending.length ? 'crimson' : undefined} />
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Providers by category">
        {TYPES.map((t) => {
          const n = stats?.verified_providers[t] ?? 0;
          return (
            <div key={t} className="card p-5">
              <div className="flex items-center justify-between"><TypeBadge type={t} /><Rating value={stats?.average_rating[t] ?? 0} /></div>
              <p className="mt-4 text-3xl font-extrabold">{n}</p>
              <p className="text-sm text-slate-500">verified {SERVICE_LABEL[t].toLowerCase()} {n === 1 ? 'provider' : 'providers'}</p>
              <div className="mt-3 h-1.5 rounded-full bg-slate-100" aria-hidden>
                <div className={`h-full rounded-full ${t === 'rescue' ? 'bg-crimson' : t === 'fuel' ? 'bg-go' : 'bg-ink'}`} style={{ width: totalProviders ? `${(n / totalProviders) * 100}%` : '0%' }} />
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex gap-2 border-b border-slate-200" role="tablist">
        {([['queue', `Review queue${pending.length ? ` (${pending.length})` : ''}`], ['users', 'Users']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold ${tab === k ? 'border-crimson text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`}>{label}</button>
        ))}
      </div>

      {tab === 'queue' ? (
        pending.length === 0 ? <Empty title="Review queue is empty">New provider applications show up here with their NID and trade license.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <tr>{['Provider', 'Shop name', 'NID number', 'Trade license', 'Service', ''].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-4"><p className="font-bold">{p.provider_name}</p><p className="text-xs text-slate-500">@{p.user_id} · {p.phone}</p></td>
                    <td className="px-5 py-4 font-semibold">{p.shop_name}</td>
                    <td className="px-5 py-4 font-mono text-[13px]">{p.nid_number}</td>
                    <td className="px-5 py-4 font-mono text-[13px]">{p.trade_license_number}</td>
                    <td className="px-5 py-4"><TypeBadge type={p.service_type} /></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="success" loading={busyId === p.id} onClick={() => decide(p, true)}><Check className="h-4 w-4" aria-hidden /> Approve</Button>
                        <Button variant="danger" disabled={busyId === p.id} onClick={() => setRejecting(p)}><X className="h-4 w-4" aria-hidden /> Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : <UsersTab />}

      {rejecting && (
        <Modal title="Reject this provider?" onClose={() => setRejecting(null)}>
          <p className="text-sm text-slate-600"><b>{rejecting.shop_name}</b> will be restricted and won’t be able to log in or receive requests.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejecting(null)}>Keep in queue</Button>
            <Button variant="danger" loading={busyId === rejecting.id} onClick={() => decide(rejecting, false)}>Reject provider</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'go' | 'crimson' }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${tone === 'go' ? 'text-go' : tone === 'crimson' ? 'text-crimson' : ''}`}>{value}</p>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => api.users(q).then((r) => setUsers(r.users)).catch((e: ApiError) => setError(e.message)), [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const toggle = async (u: AdminUser) => {
    try { await api.setUserStatus(u.id, u.status === 'restricted' ? 'active' : 'restricted'); await load(); }
    catch (e) { setError((e as ApiError).message); }
  };

  return (
    <div className="space-y-4">
      <ErrorNote>{error}</ErrorNote>
      <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, User ID or email" aria-label="Search users" className="max-w-sm" />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
            <tr>{['Name', 'Role', 'Status', ''].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3"><p className="font-bold">{u.name}</p><p className="text-xs text-slate-500">@{u.user_id} · {u.email}</p></td>
                <td className="px-5 py-3 capitalize">{u.role}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.status === 'active' ? 'bg-go/10 text-emerald-700' : u.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-crimson/10 text-red-700'}`}>{u.status}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  {u.status !== 'pending' && <Button variant="outline" onClick={() => toggle(u)}>{u.status === 'restricted' ? 'Restore' : 'Restrict'}</Button>}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
