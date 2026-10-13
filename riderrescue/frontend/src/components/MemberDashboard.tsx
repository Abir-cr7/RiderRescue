import { useCallback, useEffect, useMemo, useState } from 'react';
import { Fuel, LifeBuoy, MapPin, Phone, Search, Star, Wrench } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { MemberRequest, ProviderListing, ServiceType } from '../lib/types';
import { SERVICE_LABEL } from '../lib/types';
import { Button, Empty, ErrorNote, Field, Modal, Rating, Select, StatusPill, TextInput, TypeBadge, ago, taka } from './ui';

type Filter = ServiceType | 'all';
type Sort = 'rating' | 'distance' | 'price';

const priceOf = (p: ProviderListing) => p.service_type === 'fuel' ? p.service_details.price_per_liter : p.service_type === 'workshop' ? p.service_details.base_rate : undefined;

export default function MemberDashboard() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('rating');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<ProviderListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [target, setTarget] = useState<ProviderListing | null>(null);
  const [sos, setSos] = useState(false);
  const [toast, setToast] = useState('');

  const loadRequests = useCallback(() => api.myRequests().then((r) => setRequests(r.requests)).catch(() => {}), []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api.providers({ type: filter, q, ...(coords ?? {}) })
        .then((r) => { setProviders(r.providers); setError(''); })
        .catch((e: ApiError) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [filter, q, coords]);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const sorted = useMemo(() => {
    const list = [...providers];
    if (sort === 'distance') list.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
    if (sort === 'price') list.sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity));
    return list;
  }, [providers, sort]);

  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setSort('distance'); },
    () => setError('Location is blocked. Allow location access to see distances.'));

  const jump = (f: Filter) => { setFilter(f); document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' }); };
  const sent = (msg: string) => { setToast(msg); void loadRequests(); setTimeout(() => setToast(''), 4000); };

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Hi {user?.name.split(' ')[0]}, what do you need?</h1>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <button onClick={() => jump('fuel')} className="card flex items-center gap-4 p-5 text-left hover:border-go">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-go/10 text-go"><Fuel className="h-6 w-6" aria-hidden /></span>
            <span><span className="block font-bold">Order fuel</span><span className="text-sm text-slate-500">Delivered to where you’re parked</span></span>
          </button>
          <button onClick={() => setSos(true)} className="flex items-center gap-4 rounded-2xl bg-crimson p-5 text-left text-white shadow-sm hover:bg-red-600">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/20"><LifeBuoy className="h-6 w-6" aria-hidden /></span>
            <span><span className="block font-bold">Call rescue SOS</span><span className="text-sm text-red-50">Towing and roadside emergencies</span></span>
          </button>
          <button onClick={() => jump('workshop')} className="card flex items-center gap-4 p-5 text-left hover:border-ink">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-ink"><Wrench className="h-6 w-6" aria-hidden /></span>
            <span><span className="block font-bold">Request repair</span><span className="text-sm text-slate-500">Tires, engine and more</span></span>
          </button>
        </div>
        {toast && <p role="status" className="mt-4 rounded-xl bg-go/10 px-4 py-3 text-sm font-semibold text-emerald-700">{toast}</p>}
      </section>

      <section id="providers" className="scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">Verified providers</h2>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Service type">
            {(['all', 'fuel', 'rescue', 'workshop'] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === f ? 'bg-ink text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                {f === 'all' ? 'All' : SERVICE_LABEL[f].replace('Emergency ', '').replace('Mechanical ', '')}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by shop name" className="pl-10" aria-label="Search providers" />
          </div>
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
            <option value="rating">Top rated</option>
            <option value="distance">Nearest</option>
            <option value="price">Lowest price</option>
          </Select>
          <Button variant="outline" onClick={locate}><MapPin className="h-4 w-4" aria-hidden /> {coords ? 'Location on' : 'Use my location'}</Button>
        </div>

        <div className="mt-5">
          <ErrorNote>{error}</ErrorNote>
          {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading providers…</p>
            : sorted.length === 0 ? <Empty title="No providers match">Try another category or clear your search. Providers appear here after an admin verifies them.</Empty>
            : <div className="grid gap-4 md:grid-cols-2">{sorted.map((p) => <ProviderCard key={p.id} p={p} onRequest={() => setTarget(p)} />)}</div>}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-extrabold">Your requests</h2>
        {requests.length === 0 ? <Empty title="No requests yet">When you order fuel, call rescue or book a repair, it shows up here.</Empty> : (
          <ul className="space-y-3">
            {requests.map((r) => <RequestRow key={r.id} r={r} onRated={loadRequests} />)}
          </ul>
        )}
      </section>

      {target && <RequestModal p={target} onClose={() => setTarget(null)} onSent={() => { setTarget(null); sent(`Request sent to ${target.shop_name}.`); }} />}
      {sos && <SosModal onClose={() => setSos(false)} onSent={(n) => { setSos(false); sent(`SOS sent to ${n}. Keep your phone nearby.`); }} />}
    </div>
  );
}

/* ───────────── provider card ───────────── */
function ProviderCard({ p, onRequest }: { p: ProviderListing; onRequest: () => void }) {
  const d = p.service_details;
  const chips = p.service_type === 'fuel' ? d.grades : p.service_type === 'rescue' ? d.vehicle_types : d.services;
  return (
    <article className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold">{p.shop_name}</h3>
          <div className="mt-1.5 flex items-center gap-3"><TypeBadge type={p.service_type} /><Rating value={p.average_rating} count={p.rating_count} /></div>
        </div>
        <div className="text-right text-sm">
          {p.distance_km != null && <p className="inline-flex items-center gap-1 font-semibold"><MapPin className="h-4 w-4 text-slate-400" aria-hidden />{p.distance_km} km</p>}
          {p.service_type === 'fuel' && <p className="font-semibold">{taka(d.price_per_liter)}<span className="font-normal text-slate-500">/L</span></p>}
          {p.service_type === 'workshop' && <p className="font-semibold">from {taka(d.base_rate)}</p>}
        </div>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {(chips ?? []).map((c) => <li key={c} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{c}</li>)}
      </ul>

      <p className="text-sm text-slate-500">
        {p.service_type === 'fuel' && `Delivers within ${d.delivery_radius_km} km`}
        {p.service_type === 'rescue' && `Handles ${d.response_capacity} calls at once`}
        {p.service_type === 'workshop' && d.address}
      </p>

      <div className="mt-auto flex gap-2">
        <Button variant={p.service_type === 'rescue' ? 'danger' : 'primary'} onClick={onRequest} className="flex-1">
          {p.service_type === 'fuel' ? 'Order fuel' : p.service_type === 'rescue' ? 'Request rescue' : 'Request repair'}
        </Button>
        {p.service_type === 'rescue' && d.hotline && (
          <a href={`tel:${d.hotline}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50" aria-label={`Call ${p.shop_name}`}>
            <Phone className="h-4 w-4" aria-hidden /> Call
          </a>
        )}
      </div>
    </article>
  );
}

/* ───────────── request modal ───────────── */
function RequestModal({ p, onClose, onSent }: { p: ProviderListing; onClose: () => void; onSent: () => void }) {
  const d = p.service_details;
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async () => {
    const need = p.service_type === 'fuel' ? ['grade', 'liters', 'address'] : p.service_type === 'rescue' ? ['vehicle', 'location'] : ['service', 'vehicle'];
    if (need.some((k) => !f[k]?.trim())) { setError('Fill in every required field.'); return; }
    setBusy(true);
    try { await api.createRequest(p.id, f); onSent(); }
    catch (e) { setError((e as ApiError).message); setBusy(false); }
  };

  return (
    <Modal title={`${p.shop_name}`} onClose={onClose}>
      <div className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        {p.service_type === 'fuel' && (<>
          <Field label="Fuel grade"><Select value={f.grade ?? ''} onChange={set('grade')}><option value="">Choose…</option>{d.grades?.map((g) => <option key={g}>{g}</option>)}</Select></Field>
          <Field label="Liters" hint={d.price_per_liter && f.liters ? `Estimated ${taka(Number(f.liters) * d.price_per_liter)}` : undefined}><TextInput inputMode="decimal" value={f.liters ?? ''} onChange={set('liters')} /></Field>
          <Field label="Deliver to"><TextInput value={f.address ?? ''} onChange={set('address')} placeholder="Road, landmark, area" /></Field>
        </>)}
        {p.service_type === 'rescue' && (<>
          <Field label="Vehicle type"><Select value={f.vehicle ?? ''} onChange={set('vehicle')}><option value="">Choose…</option>{['Motorcycle', 'Scooter', 'Car', 'CNG / Auto', 'Other'].map((v) => <option key={v}>{v}</option>)}</Select></Field>
          <Field label="Where are you?"><TextInput value={f.location ?? ''} onChange={set('location')} placeholder="Road, landmark, area" /></Field>
          <Field label="What happened? (optional)"><TextInput value={f.issue ?? ''} onChange={set('issue')} /></Field>
        </>)}
        {p.service_type === 'workshop' && (<>
          <Field label="Service needed"><Select value={f.service ?? ''} onChange={set('service')}><option value="">Choose…</option>{d.services?.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Vehicle"><TextInput value={f.vehicle ?? ''} onChange={set('vehicle')} placeholder="e.g. Yamaha R15, 2021" /></Field>
          <Field label="Describe the problem (optional)"><TextInput value={f.issue ?? ''} onChange={set('issue')} /></Field>
        </>)}
        <Button onClick={submit} loading={busy} className="w-full">Send request</Button>
      </div>
    </Modal>
  );
}

/* ───────────── SOS ───────────── */
function SosModal({ onClose, onSent }: { onClose: () => void; onSent: (shop: string) => void }) {
  const [teams, setTeams] = useState<ProviderListing[] | null>(null);
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.providers({ type: 'rescue' }).then((r) => setTeams(r.providers)).catch((e: ApiError) => setError(e.message)); }, []);

  const send = async (t: ProviderListing) => {
    if (!location.trim()) { setError('Tell the team where you are first.'); return; }
    setBusy(t.id); setError('');
    try { await api.createRequest(t.id, { sos: true, location, vehicle: 'Not specified', issue: 'SOS' }); onSent(t.shop_name); }
    catch (e) { setError((e as ApiError).message); setBusy(''); }
  };

  return (
    <Modal title="Rescue SOS" onClose={onClose}>
      <div className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Where are you?"><TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Road, landmark, area" autoFocus /></Field>
        {teams === null ? <p className="text-sm text-slate-500">Finding rescue teams…</p>
          : teams.length === 0 ? <Empty title="No rescue teams are verified yet" />
          : <ul className="space-y-2">{teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0"><p className="truncate font-bold">{t.shop_name}</p><Rating value={t.average_rating} /></div>
                <div className="flex gap-2">
                  {t.service_details.hotline && <a href={`tel:${t.service_details.hotline}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Call</a>}
                  <Button variant="danger" loading={busy === t.id} onClick={() => send(t)}>Send SOS</Button>
                </div>
              </li>))}</ul>}
      </div>
    </Modal>
  );
}

/* ───────────── my request row + rating ───────────── */
function RequestRow({ r, onRated }: { r: MemberRequest; onRated: () => void }) {
  const [hover, setHover] = useState(0);
  const rate = (n: number) => api.rate(r.id, n).then(onRated).catch(() => {});
  const summary = r.details.sos ? `SOS · ${r.details.location}` : r.details.grade ? `${r.details.liters} L ${r.details.grade}` : r.details.service ?? r.details.vehicle ?? '';
  return (
    <li className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-bold"><TypeBadge type={r.service_type} /> <span className="truncate">{r.shop_name}</span></p>
        <p className="mt-1 text-sm text-slate-500">{summary} · {ago(r.created_at)}</p>
      </div>
      <div className="flex items-center gap-4">
        {r.total_amount != null && <span className="font-bold">{taka(r.total_amount)}</span>}
        {r.status === 'completed' && (r.rating
          ? <Rating value={r.rating} />
          : <span className="flex" onMouseLeave={() => setHover(0)} role="group" aria-label="Rate this service">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onMouseEnter={() => setHover(n)} onClick={() => rate(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="p-0.5">
                  <Star className={`h-5 w-5 ${n <= hover ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>))}
            </span>)}
        <StatusPill status={r.status} />
      </div>
    </li>
  );
}
