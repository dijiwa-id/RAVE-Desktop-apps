import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, Search, Settings, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/stores/auth';
import { useNav } from '@/stores/nav';
import { Cover, cx } from '@/components/ui';
import { logout } from '@/lib/session';
import { useUi } from '@/stores/ui';

/** Bilah atas tiap tampilan: maju/mundur riwayat, kolom cari (di tampilan Cari), menu akun. */
export function TopBar({ solid }: { solid: boolean }) {
  const t = useT();
  const { stack, index, back, forward, route, replace } = useNav();
  const user = useAuth((s) => s.user);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState(route.name === 'search' ? (route.q ?? '') : '');
  const input = useRef<HTMLInputElement>(null);

  // Cari langsung saat mengetik (jeda 250 ms), tanpa menumpuk riwayat.
  useEffect(() => {
    if (route.name !== 'search') return;
    const h = setTimeout(() => (route.q ?? '') !== q.trim() && replace({ name: 'search', q: q.trim() }), 250);
    return () => clearTimeout(h);
  }, [q, route, replace]);
  useEffect(() => {
    if (route.name === 'search') {
      setQ(route.q ?? '');
      input.current?.focus();
    }
  }, [route.name]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <header className={cx('sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 px-6 transition-colors', solid ? 'bg-base/95 backdrop-blur' : 'bg-transparent')}>
      <div className="flex gap-2">
        <NavBtn label={t.nav.back} disabled={index === 0} onClick={back}>
          <ChevronLeft className="size-5" />
        </NavBtn>
        <NavBtn label={t.nav.forward} disabled={index >= stack.length - 1} onClick={forward}>
          <ChevronRight className="size-5" />
        </NavBtn>
      </div>

      {route.name === 'search' && (
        <label className="relative ml-2 w-full max-w-[420px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.search.placeholder}
            aria-label={t.nav.search}
            className="h-11 w-full border-2 border-transparent bg-raised pr-10 pl-11 text-[15px] text-paper outline-none placeholder:text-subtle focus:border-paper"
          />
          {q && (
            <button type="button" aria-label="Hapus" onClick={() => setQ('')} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-paper">
              <X className="size-4" />
            </button>
          )}
        </label>
      )}

      <div className="flex-1" />

      {!user && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => useUi.getState().openAuth('login')} className="label px-2 py-2 text-paper hover:text-mustard">
            {t.guest.login}
          </button>
          <button type="button" onClick={() => useUi.getState().openAuth('signup')} className="btn-primary !px-4 !py-2.5">
            {t.guest.signup}
          </button>
        </div>
      )}

      {user && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menu}
            className="flex items-center gap-2 border border-line bg-canvas/80 py-1 pr-3 pl-1 text-sm font-bold hover:border-paper"
          >
            <Cover src={user.avatar_url} round className="size-7" />
            <span className="max-w-36 truncate">{user.display_name}</span>
            {user.premium && <span className="label sticker bg-mustard px-1 py-px text-[9px] text-ink [--r:-4deg]">{t.common.premium}</span>}
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
              <div role="menu" className="rise absolute right-0 z-40 mt-2 w-56 border-2 border-ink bg-raised p-1 shadow-[4px_4px_0_var(--color-mustard)]">
                <p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p>
                <MenuItem
                  onClick={() => {
                    setMenu(false);
                    useNav.getState().go({ name: 'settings' });
                  }}
                >
                  <Settings className="size-4" /> {t.nav.settings}
                </MenuItem>
                <MenuItem onClick={() => void logout()}>
                  <LogOut className="size-4" /> {t.settings.logout}
                </MenuItem>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function NavBtn({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-8 place-items-center bg-canvas/80 text-paper disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold hover:bg-hover">
      {children}
    </button>
  );
}
