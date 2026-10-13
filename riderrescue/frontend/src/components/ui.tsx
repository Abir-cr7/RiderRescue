import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Fuel, LifeBuoy, Loader2, Wrench, Star, type LucideIcon } from 'lucide-react';
import type { RequestStatus, ServiceType } from '../lib/types';

/* ── Buttons ── */
type Variant = 'primary' | 'danger' | 'success' | 'ghost' | 'outline';
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-slate-800',
  danger: 'bg-crimson text-white hover:bg-red-600',
  success: 'bg-go text-white hover:bg-emerald-600',
  ghost: 'text-slate-600 hover:bg-slate-100',
  outline: 'border border-slate-200 bg-white text-ink hover:bg-slate-50',
};

export function Button({ variant = 'primary', loading, className = '', children, disabled, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors
                  disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ── Form fields ── */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error ? <span role="alert" className="mt-1.5 block text-xs font-medium text-crimson">{error}</span>
             : hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ invalid, className = '', ...p }, ref) => (
    <input ref={ref} aria-invalid={invalid || undefined} {...p} className={`input ${invalid ? 'input-error' : ''} ${className}`} />
  ));
TextInput.displayName = 'TextInput';

export function Select({ className = '', ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={`input ${className}`} />;
}

/** Multi-select chips (fuel grades, repair services …) */
export function ChipSelect({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            type="button" key={o} aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              on ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >{o}</button>
        );
      })}
    </div>
  );
}

/* ── Service type visuals ── */
export const SERVICE_ICON: Record<ServiceType, LucideIcon> = { fuel: Fuel, rescue: LifeBuoy, workshop: Wrench };
export const SERVICE_SHORT: Record<ServiceType, string> = { fuel: 'Fuel', rescue: 'Rescue', workshop: 'Workshop' };

export function TypeBadge({ type }: { type: ServiceType }) {
  const Icon = SERVICE_ICON[type];
  const tone = type === 'rescue' ? 'bg-crimson/10 text-red-700' : type === 'fuel' ? 'bg-go/10 text-emerald-700' : 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden /> {SERVICE_SHORT[type]}
    </span>
  );
}

const statusTone: Record<RequestStatus, string> = {
  requested: 'bg-amber-50 text-amber-700',
  accepted: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-go/10 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};
export const statusText = (s: RequestStatus) => ({ requested: 'Waiting', accepted: 'Accepted', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled' }[s]);

export function StatusPill({ status }: { status: RequestStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[status]}`}>{statusText(status)}</span>;
}

export function Rating({ value, count }: { value: number; count?: number }) {
  if (!value) return <span className="text-xs text-slate-400">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
      {value.toFixed(1)}{count != null && <span className="font-normal text-slate-400">({count})</span>}
    </span>
  );
}

/* ── Misc ── */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}
         onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" aria-label="Close">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <p className="font-bold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
    </div>
  );
}

export function ErrorNote({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-xl bg-crimson/10 px-3.5 py-2.5 text-sm font-medium text-red-700">{children}</p>;
}

export const taka = (n: number | null | undefined) => `৳${Number(n ?? 0).toLocaleString('en-BD')}`;
export const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};
