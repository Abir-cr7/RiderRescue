import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Phone } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SERVICE_LABEL, type IncomingRequest, type ServiceType } from '../lib/types';
import { Button, Empty, ErrorNote, Field, Modal, Rating, StatusPill, TextInput, TypeBadge, ago, taka } from './ui';

const COPY: Record<ServiceType, { title: string; empty: string; accept: string }> = {
  fuel: { title: 'Fuel orders', empty: 'New fuel orders from riders appear here.', accept: 'Accept order' },
  rescue: { title: 'Rescue calls', empty: 'SOS and towing requests appear here the moment a rider sends one.', accept: 'Dispatch team' },
  workshop: { title: 'Repair jobs', empty: 'Repair bookings from riders appear here.', accept: 'Accept job' },
};

/** Only the fields that make sense for the provider’s own category are shown. */
function detailLines(type: ServiceType, d: Record<string, any>): [string, string][] {
  const rows: [string, string | undefined][] =
    type === 'fuel' ? [['Grade', d.grade], ['Liters', d.liters], ['Deliver to', d.address]]
    : type === 'rescue' ? [['Vehicle', d.vehicle], ['Location', d.location], ['Issue', d.issue]]
    : [['Service', d.service], ['Vehicle', d.vehicle], ['Problem', d.issue]];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

export default function ProviderDashboard() {
  const { provider, refresh } = useAuth();
  const [reqs, setReqs] = useState<IncomingRequest[]>([]);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState<IncomingRequest | null>(null);
  const [checking, setChecking] = useState(false);

  const approved = !!provider?.is_approved;
  const load = useCallback(() => api.incoming().then((r) => { setReqs(r.requests); setError(''); }).catch((e: ApiError) => setError(e.message)), []);

  useEffect(() => {
    if (!approved) return;
    void load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [approved, load]);

  if (!provider) return null;
  const copy = COPY[provider.service_type];
  const open = reqs.filter((r) => ['requested', 'accepted', 'in_progress'].includes(r.status));
  const done = reqs.filter((r) => r.status === 'completed');

  const move = async (r: IncomingRequest, status: string, amount?: number) => {
    try { await api.setStatus(r.id, status, amount); await load(); } catch (e) { setError((e as ApiError).message); }
  };
  const recheck = async () => { setChecking(true); await refresh(); setChecking(false); };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {!approved && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div>
              <p className="font-extrabold text-amber-900">Verification pending</p>
              <p className="mt-0.5 max-w-xl text-sm text-amber-800">An admin is checking your NID and trade license. You’ll start receiving requests as soon as you’re approved.</p>
            </div>
          </div>
          <Button variant="outline" onClick={recheck} loading={checking}>Check status</Button>
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{provider.shop_name}</h1>
          <p className="mt-2 flex items-center gap-3 text-sm text-slate-500"><TypeBadge type={provider.service_type} /> {SERVICE_LABEL[provider.service_type]}</p>
        </div>
        {approved && (
          <div className="flex gap-3">
            <Stat label="Open" value={String(open.length)} />
            <Stat label="Completed" value={String(done.length)} />
            <Stat label="Earned" value={taka(done.reduce((s, r) => s + (r.total_amount ?? 0), 0))} />
            <div className="card px-4 py-3"><p className="text-xs text-slate-500">Rating</p><Rating value={provider.average_rating} /></div>
          </div>
        )}
      </header>

      <ErrorNote>{error}</ErrorNote>

      <section aria-labelledby="queue">
        <h2 id="queue" className="mb-4 text-xl font-extrabold">{copy.title}</h2>
        {!approved ? <Empty title="Requests are locked until you’re verified">Nothing is lost — riders can’t see or contact you yet.</Empty>
          : open.length === 0 ? <Empty title="You’re all caught up">{copy.empty}</Empty>
          : (
          <ul className="space-y-3">
            {open.map((r) => (
              <li key={r.id} className={`card p-5 ${r.details.sos ? 'border-crimson' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-bold">
                      {r.member_name}
                      {r.details.sos && <span className="rounded-full bg-crimson px-2 py-0.5 text-xs font-bold text-white">SOS</span>}
                    </p>
                    <a href={`tel:${r.member_phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink"><Phone className="h-3.5 w-3.5" aria-hidden />{r.member_phone}</a>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">{ago(r.created_at)} <StatusPill status={r.status} /></div>
                </div>

                <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                  {detailLines(r.service_type, r.details).map(([k, v]) => (
                    <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></div>
                  ))}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  {r.status === 'requested' && <><Button variant="success" onClick={() => move(r, 'accepted')}>{copy.accept}</Button><Button variant="outline" onClick={() => move(r, 'cancelled')}>Decline</Button></>}
                  {r.status === 'accepted' && <Button onClick={() => move(r, 'in_progress')}>Start</Button>}
                  {r.status === 'in_progress' && <Button variant="success" onClick={() => setCompleting(r)}><CheckCircle2 className="h-4 w-4" aria-hidden /> Mark complete</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {approved && done.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-extrabold">Recently completed</h2>
          <ul className="card divide-y divide-slate-100">
            {done.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="font-semibold">{r.member_name}</span>
                <span className="text-slate-500">{ago(r.created_at)}</span>
                <span className="flex items-center gap-4">{r.rating ? <Rating value={r.rating} /> : <span className="text-xs text-slate-400">Not rated</span>}<b>{taka(r.total_amount)}</b></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {completing && <CompleteModal r={completing} base={provider.service_details.base_rate} onClose={() => setCompleting(null)}
        onDone={(amt) => { void move(completing, 'completed', amt); setCompleting(null); }} />}
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="card px-4 py-3"><p className="text-xs text-slate-500">{label}</p><p className="font-extrabold">{value}</p></div>
);

function CompleteModal({ r, base, onClose, onDone }: { r: IncomingRequest; base?: number; onClose: () => void; onDone: (n: number) => void }) {
  const [amount, setAmount] = useState(base ? String(base) : '');
  const valid = amount !== '' && Number(amount) >= 0;
  return (
    <Modal title={`Complete job for ${r.member_name}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Final amount charged (৳)"><TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
        <Button variant="success" disabled={!valid} onClick={() => onDone(Number(amount))} className="w-full">Confirm and complete</Button>
      </div>
    </Modal>
  );
}
