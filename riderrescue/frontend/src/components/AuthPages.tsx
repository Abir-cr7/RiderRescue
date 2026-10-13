import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Eye, EyeOff, LocateFixed, ShieldCheck } from 'lucide-react';
import { Brand, LogoMark } from './Logo';
import { Button, ChipSelect, ErrorNote, Field, SERVICE_ICON, TextInput } from './ui';
import { api, ApiError } from '../lib/api';
import { homeFor, useAuth } from '../lib/auth';
import { SERVICE_LABEL, type ServiceType } from '../lib/types';

/* ───────────── validation (mirrors backend/src/utils/validators.js) ───────────── */
const RE = {
  userId: /^[A-Za-z0-9_]{4,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(?:\+?88)?01[3-9]\d{8}$/,
  nid: /^(\d{10}|\d{13}|\d{17})$/,
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/,
};
type Errors = Record<string, string>;
const clean = (s: string) => s.replace(/[\s-]/g, '');

interface Account {
  name: string; user_id: string; email: string; phone: string; nid_number: string; password: string; confirm_password: string;
}
const emptyAccount: Account = { name: '', user_id: '', email: '', phone: '', nid_number: '', password: '', confirm_password: '' };

function checkAccount(a: Account): Errors {
  const e: Errors = {};
  if (a.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!RE.userId.test(a.user_id.trim())) e.user_id = 'Use 4–20 letters, numbers or underscores.';
  if (!RE.email.test(a.email.trim())) e.email = 'Enter a valid email address.';
  if (!RE.phone.test(clean(a.phone))) e.phone = 'Enter a valid mobile number, e.g. 01712345678.';
  if (!RE.nid.test(clean(a.nid_number))) e.nid_number = 'NID must be 10, 13 or 17 digits.';
  if (!RE.password.test(a.password)) e.password = 'Use 8+ characters with at least one letter and one number.';
  if (a.password !== a.confirm_password) e.confirm_password = 'Passwords do not match.';
  return e;
}

/* ───────────── layout ───────────── */
function AuthShell({ title, subtitle, children, wide = false }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[2fr_3fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">
        <Brand inverted size="lg" />
        <div>
          <LogoMark className="absolute -bottom-10 -right-10 h-[26rem] opacity-[0.07]" fg="#FFFFFF" />
          <p className="relative max-w-xs font-brand text-5xl leading-tight">Stuck on the road? Move on.</p>
          <p className="relative mt-4 max-w-xs text-sm text-slate-300">Fuel, towing and repairs from verified providers near you — requested in a few taps.</p>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-go" aria-hidden /> Every provider’s NID and trade license is checked by our team.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
          <div className="mb-8 lg:hidden"><Brand /></div>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

function PasswordInput(props: React.ComponentProps<typeof TextInput>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextInput {...props} type={show ? 'text' : 'password'} className="pr-11" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-ink">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ───────────── Login (Member / Provider) — User ID OR Email ───────────── */
export function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { nav(homeFor((await login(identifier.trim(), password)).role), { replace: true }); }
    catch (err) { setError((err as ApiError).message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in with your User ID or email.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorNote>{error}</ErrorNote>
        <Field label="User ID or email">
          <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Button type="submit" loading={busy} className="w-full">Log in</Button>
      </form>

      <div className="mt-8 space-y-2 border-t border-slate-100 pt-6 text-sm text-slate-600">
        <p>New rider? <Link to="/signup/member" className="font-bold text-ink underline">Create a member account</Link></p>
        <p>Run a fuel, rescue or repair business? <Link to="/signup/provider" className="font-bold text-ink underline">Join as a provider</Link></p>
        <p className="pt-2"><Link to="/admin/login" className="text-slate-400 hover:text-ink">Admin portal</Link></p>
      </div>
    </AuthShell>
  );
}

/* ───────────── Admin login ───────────── */
export function AdminLogin() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(identifier.trim(), password, 'admin'); nav('/admin', { replace: true }); }
    catch (err) { setError((err as ApiError).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Brand inverted /></div>
        <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
          <div>
            <h1 className="text-xl font-extrabold">Admin portal</h1>
            <p className="text-sm text-slate-500">Authorized staff only.</p>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <Field label="User ID or email"><TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required /></Field>
          <Field label="Password"><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
          <Button type="submit" loading={busy} className="w-full">Log in to admin</Button>
        </form>
        <p className="mt-6 text-center text-sm"><Link to="/login" className="text-slate-400 hover:text-white">Back to rider and provider login</Link></p>
      </div>
    </div>
  );
}

/* ───────────── Shared account fields ───────────── */
function AccountFields({ v, set, errors }: { v: Account; set: (k: keyof Account, val: string) => void; errors: Errors }) {
  const f = (k: keyof Account) => ({ value: v[k], invalid: !!errors[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value) });
  return (
    <>
      <Field label="Full name" error={errors.name}><TextInput {...f('name')} autoComplete="name" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="User ID" error={errors.user_id} hint="You can log in with this or your email."><TextInput {...f('user_id')} autoComplete="username" /></Field>
        <Field label="Mobile number" error={errors.phone}><TextInput {...f('phone')} inputMode="tel" autoComplete="tel" placeholder="01712345678" /></Field>
      </div>
      <Field label="Email" error={errors.email}><TextInput {...f('email')} type="email" autoComplete="email" /></Field>
      <Field label="NID number" error={errors.nid_number} hint="National ID: 10, 13 or 17 digits."><TextInput {...f('nid_number')} inputMode="numeric" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" error={errors.password}><PasswordInput {...f('password')} autoComplete="new-password" /></Field>
        <Field label="Confirm password" error={errors.confirm_password}><PasswordInput {...f('confirm_password')} autoComplete="new-password" /></Field>
      </div>
    </>
  );
}

/* ───────────── Member signup ───────────── */
export function MemberSignup() {
  const { signUp, user } = useAuth();
  const nav = useNavigate();
  const [v, setV] = useState<Account>(emptyAccount);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = checkAccount(v);
    setErrors(errs); setError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      signUp(await api.registerMember({ ...v, phone: clean(v.phone), nid_number: clean(v.nid_number) }));
      nav('/member', { replace: true });
    } catch (err) {
      const a = err as ApiError; setErrors(a.fields ?? {}); setError(a.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your rider account" subtitle="You’ll have full access as soon as you sign up." wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorNote>{error}</ErrorNote>
        <AccountFields v={v} set={(k, val) => setV((s) => ({ ...s, [k]: val }))} errors={errors} />
        <Button type="submit" loading={busy} className="w-full">Create account</Button>
      </form>
      <p className="mt-6 text-sm text-slate-600">Already registered? <Link to="/login" className="font-bold text-ink underline">Log in</Link></p>
    </AuthShell>
  );
}

/* ───────────── Provider onboarding (3 steps) ───────────── */
const FUEL_GRADES = ['Octane', 'Petrol', 'Diesel', 'CNG', 'LPG'];
const TOWING = ['Flatbed', 'Wheel-lift', 'Motorbike carrier', 'Heavy-duty', 'On-site jump start'];
const REPAIRS = ['Tire', 'Engine', 'Towing', 'Brakes', 'Electrical', 'Oil change'];
const SERVICE_BLURB: Record<ServiceType, string> = {
  fuel: 'Deliver petrol, octane or diesel to riders who run dry.',
  rescue: 'Tow and recover vehicles after breakdowns and accidents.',
  workshop: 'Fix tires, engines and more at your shop.',
};
const STEPS = ['Service', 'Business', 'Details'];

export function ProviderOnboarding() {
  const { signUp, user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ServiceType | null>(null);
  const [acct, setAcct] = useState<Account>(emptyAccount);
  const [biz, setBiz] = useState({ shop_name: '', trade_license_number: '' });
  const [d, setD] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const setDetail = (k: string, val: unknown) => setD((s) => ({ ...s, [k]: val }));

  const validateStep2 = () => {
    const e = checkAccount(acct);
    if (biz.shop_name.trim().length < 2) e.shop_name = 'Enter your shop name (Dokaner Nam).';
    if (biz.trade_license_number.trim().length < 4) e.trade_license_number = 'Enter your trade license number.';
    return e;
  };

  const validateStep3 = () => {
    const e: Errors = {};
    const n = (k: string) => (d[k] === '' || d[k] == null ? NaN : Number(d[k]));
    if (type === 'fuel') {
      if (!d.grades?.length) e.grades = 'Select at least one fuel grade.';
      if (!(n('price_per_liter') > 0)) e.price_per_liter = 'Enter a price per liter.';
      if (!(n('delivery_radius_km') > 0 && n('delivery_radius_km') <= 100)) e.delivery_radius_km = 'Enter a radius between 1 and 100 km.';
    } else if (type === 'rescue') {
      if (!RE.phone.test(clean(d.hotline ?? ''))) e.hotline = 'Enter a valid hotline number.';
      if (!d.vehicle_types?.length) e.vehicle_types = 'Select at least one vehicle or towing type.';
      if (!(n('response_capacity') >= 1)) e.response_capacity = 'How many calls can you handle at once?';
    } else if (type === 'workshop') {
      if ((d.address ?? '').trim().length < 5) e.address = 'Enter the shop address.';
      if (!(Math.abs(n('lat')) <= 90) || !(Math.abs(n('lng')) <= 180)) e.lat = 'Enter valid GPS coordinates.';
      if (!d.services?.length) e.services = 'Select at least one repair service.';
      if (!(n('base_rate') >= 0)) e.base_rate = 'Enter your base rate.';
    }
    return e;
  };

  const next = () => {
    setError('');
    if (step === 0) { if (!type) { setError('Choose one service category to continue.'); return; } setStep(1); return; }
    if (step === 1) { const e = validateStep2(); setErrors(e); if (!Object.keys(e).length) setStep(2); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateStep3();
    setErrors(errs); setError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const session = await api.registerProvider({
        ...acct, phone: clean(acct.phone), nid_number: clean(acct.nid_number), ...biz, service_type: type, service_details: d,
      });
      signUp(session);
      nav('/provider', { replace: true });
    } catch (err) {
      const a = err as ApiError;
      setErrors(a.fields ?? {}); setError(a.message);
      // jump back to the step that holds the problem
      const step2Keys = ['name', 'user_id', 'email', 'phone', 'nid_number', 'password', 'confirm_password', 'shop_name', 'trade_license_number'];
      if (Object.keys(a.fields ?? {}).some((k) => step2Keys.includes(k))) setStep(1);
    } finally { setBusy(false); }
  };

  const num = (k: string, props = {}) => ({
    value: d[k] ?? '', invalid: !!errors[k], inputMode: 'decimal' as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDetail(k, e.target.value), ...props,
  });

  const locate = () => navigator.geolocation?.getCurrentPosition((p) => {
    setDetail('lat', p.coords.latitude.toFixed(6)); setDetail('lng', p.coords.longitude.toFixed(6));
  });

  return (
    <AuthShell title="Join as a service provider" subtitle="Three short steps. An admin reviews your NID and trade license before you receive requests." wide>
      {/* progress */}
      <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
              i < step ? 'bg-go text-white' : i === step ? 'bg-ink text-white' : 'bg-slate-200 text-slate-500'}`}>
              {i < step ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={`text-sm font-semibold ${i === step ? 'text-ink' : 'text-slate-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorNote>{error}</ErrorNote>

        {step === 0 && (
          <div className="space-y-3" role="radiogroup" aria-label="Primary service category">
            {(Object.keys(SERVICE_LABEL) as ServiceType[]).map((t) => {
              const Icon = SERVICE_ICON[t]; const on = type === t;
              return (
                <button type="button" key={t} role="radio" aria-checked={on} onClick={() => setType(t)}
                        className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                          on ? 'border-ink bg-white ring-2 ring-ink' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${t === 'rescue' ? 'bg-crimson/10 text-crimson' : t === 'fuel' ? 'bg-go/10 text-go' : 'bg-slate-100 text-ink'}`}>
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold">{SERVICE_LABEL[t]}</span>
                    <span className="block text-sm text-slate-500">{SERVICE_BLURB[t]}</span>
                  </span>
                </button>
              );
            })}
            <p className="text-xs text-slate-500">Pick one primary category. You can’t change it after registering.</p>
          </div>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Shop name (Dokaner Nam)" error={errors.shop_name}>
                <TextInput value={biz.shop_name} invalid={!!errors.shop_name} onChange={(e) => setBiz((b) => ({ ...b, shop_name: e.target.value }))} />
              </Field>
              <Field label="Trade license number" error={errors.trade_license_number}>
                <TextInput value={biz.trade_license_number} invalid={!!errors.trade_license_number} onChange={(e) => setBiz((b) => ({ ...b, trade_license_number: e.target.value }))} />
              </Field>
            </div>
            <AccountFields v={acct} set={(k, val) => setAcct((s) => ({ ...s, [k]: val }))} errors={errors} />
          </>
        )}

        {step === 2 && type === 'fuel' && (
          <>
            <Field label="Fuel grades available" error={errors.grades}>
              <ChipSelect options={FUEL_GRADES} value={d.grades ?? []} onChange={(g) => setDetail('grades', g)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price per liter (৳)" error={errors.price_per_liter}><TextInput {...num('price_per_liter')} /></Field>
              <Field label="Delivery radius (km)" error={errors.delivery_radius_km}><TextInput {...num('delivery_radius_km')} /></Field>
            </div>
          </>
        )}

        {step === 2 && type === 'rescue' && (
          <>
            <Field label="Emergency hotline number" error={errors.hotline}>
              <TextInput value={d.hotline ?? ''} invalid={!!errors.hotline} inputMode="tel" onChange={(e) => setDetail('hotline', e.target.value)} />
            </Field>
            <Field label="Vehicle and towing types" error={errors.vehicle_types}>
              <ChipSelect options={TOWING} value={d.vehicle_types ?? []} onChange={(g) => setDetail('vehicle_types', g)} />
            </Field>
            <Field label="Response capacity" error={errors.response_capacity} hint="Calls you can handle at the same time.">
              <TextInput {...num('response_capacity')} />
            </Field>
          </>
        )}

        {step === 2 && type === 'workshop' && (
          <>
            <Field label="Shop address" error={errors.address}>
              <TextInput value={d.address ?? ''} invalid={!!errors.address} onChange={(e) => setDetail('address', e.target.value)} />
            </Field>
            <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Latitude" error={errors.lat}><TextInput {...num('lat')} invalid={!!errors.lat} /></Field>
              <Field label="Longitude"><TextInput {...num('lng')} invalid={!!errors.lat} /></Field>
              <Button type="button" variant="outline" onClick={locate}><LocateFixed className="h-4 w-4" aria-hidden /> Use my location</Button>
            </div>
            <Field label="Repair services offered" error={errors.services}>
              <ChipSelect options={REPAIRS} value={d.services ?? []} onChange={(g) => setDetail('services', g)} />
            </Field>
            <Field label="Base rate (৳)" error={errors.base_rate} hint="Your starting charge before parts."><TextInput {...num('base_rate')} /></Field>
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => { setErrors({}); setError(''); setStep(step - 1); }}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Button>
          ) : <span />}
          {step < 2
            ? <Button type="button" onClick={next}>Continue</Button>
            : <Button type="submit" loading={busy}>Submit for verification</Button>}
        </div>
      </form>

      <p className="mt-6 text-sm text-slate-600">Already registered? <Link to="/login" className="font-bold text-ink underline">Log in</Link></p>
    </AuthShell>
  );
}
