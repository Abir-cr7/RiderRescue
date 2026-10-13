import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { Brand } from './Logo';
import { useAuth } from '../lib/auth';
import { SERVICE_LABEL } from '../lib/types';

const roleStyle = {
  member: 'bg-go/10 text-emerald-700',
  provider: 'bg-slate-100 text-slate-700',
  admin: 'bg-ink text-white',
} as const;

export default function Navbar() {
  const { user, provider, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const roleLabel = !user ? '' : user.role === 'provider' && provider ? SERVICE_LABEL[provider.service_type] : user.role === 'admin' ? 'Admin' : 'Member';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to={user ? `/${user.role}` : '/login'} aria-label="RiderRescue home"><Brand /></Link>

        {user ? (
          <div className="flex items-center gap-3" ref={box}>
            <span className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline ${roleStyle[user.role]}`}>{roleLabel}</span>
            <div className="relative">
              <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 hover:bg-slate-50">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                <span className="hidden max-w-[10rem] truncate text-sm font-semibold sm:block">{user.name}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
              </button>
              {open && (
                <div role="menu" className="card absolute right-0 mt-2 w-60 p-2 shadow-lg">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-bold">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">@{user.user_id}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button role="menuitem" onClick={() => { logout(); nav('/login'); }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-crimson hover:bg-crimson/10">
                    <LogOut className="h-4 w-4" aria-hidden /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link to="/login" className="rounded-xl px-3 py-2 hover:bg-slate-100">Log in</Link>
            <Link to="/signup/member" className="rounded-xl bg-ink px-4 py-2 text-white hover:bg-slate-800">Sign up</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
