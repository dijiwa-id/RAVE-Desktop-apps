import { Heart, Home, Library, PanelLeftClose, PanelLeftOpen, Search, Settings } from 'lucide-react';
import logo from '@/assets/rave-logo.webp';
import icon from '@/assets/rave-icon.svg';
import { useT } from '@/lib/i18n';
import { useApi } from '@/lib/query';
import type { LibrarySummary } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { useNav, type Route } from '@/stores/nav';
import { usePlayer } from '@/stores/player';
import { Cover, cx } from '@/components/ui';

/** Navigasi kiri: menu utama + pustaka (Disukai & playlist). Ciut ke ikon di jendela sempit. */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const t = useT();
  const { route, go } = useNav();
  const authed = !!useAuth((s) => s.accessToken);
  const lib = useApi<LibrarySummary>(authed ? '/v1/library/summary' : null);
  const playing = usePlayer((s) => s.playing);

  const items: { r: Route; label: string; Icon: typeof Home }[] = [
    { r: { name: 'home' }, label: t.nav.home, Icon: Home },
    { r: { name: 'search' }, label: t.nav.search, Icon: Search },
    { r: { name: 'library' }, label: t.nav.library, Icon: Library },
  ];
  const isActive = (r: Route) => route.name === r.name && (!('id' in r) || ('id' in route && route.id === r.id));

  return (
    <aside className={cx('panel grain flex min-h-0 shrink-0 flex-col transition-[width] duration-200', collapsed ? 'w-[72px]' : 'w-[264px]')} aria-label="Navigasi">
      <div className={cx('flex items-center gap-2 px-4 pt-4 pb-3', collapsed && 'justify-center px-0')}>
        {collapsed ? <img src={icon} alt="RAVE" className={cx('size-9', playing && 'animate-[spin_6s_linear_infinite]')} /> : <img src={logo} alt="RAVE" className="h-8 w-auto" />}
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map(({ r, label, Icon }) => {
          const active = isActive(r);
          return (
            <button
              key={r.name}
              type="button"
              onClick={() => go(r)}
              title={collapsed ? label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex h-11 items-center gap-4 px-3 font-bold transition-colors',
                collapsed && 'justify-center px-0',
                active ? 'bg-raised text-paper shadow-[inset_3px_0_0_var(--color-mustard)]' : 'text-muted hover:text-paper',
              )}
            >
              <Icon className="size-[22px] shrink-0" strokeWidth={active ? 2.5 : 2} />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mx-4 my-3 border-t border-dashed border-line" />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {!collapsed && authed && <p className="label px-3 pb-2 text-subtle">{t.nav.yourPlaylists}</p>}
        {authed && (
          <LibRow
            collapsed={collapsed}
            active={route.name === 'liked'}
            onClick={() => go({ name: 'liked' })}
            title={t.nav.liked}
            subtitle={t.library.likedSub(lib.data?.liked_count ?? 0)}
            art={
              <div className="grid size-11 shrink-0 place-items-center bg-gradient-to-br from-purple to-plum">
                <Heart className="size-5 fill-mustard text-mustard" />
              </div>
            }
          />
        )}
        {lib.data?.playlists.map((p) => (
          <LibRow
            key={p.id}
            collapsed={collapsed}
            active={route.name === 'playlist' && route.id === p.id}
            onClick={() => go({ name: 'playlist', id: p.id })}
            title={p.title}
            subtitle={`Playlist · ${p.owner?.display_name ?? p.owner?.name ?? 'RAVE'}`}
            art={<Cover src={p.cover_url} className="size-11" />}
          />
        ))}
      </div>

      <div className={cx('flex items-center border-t border-line p-2', collapsed ? 'flex-col gap-1' : 'justify-between')}>
        <button
          type="button"
          onClick={() => go({ name: 'settings' })}
          title={t.nav.settings}
          aria-current={route.name === 'settings' ? 'page' : undefined}
          className={cx('flex h-9 items-center gap-3 px-2 text-sm font-bold', route.name === 'settings' ? 'text-paper' : 'text-muted hover:text-paper')}
        >
          <Settings className="size-[18px]" />
          {!collapsed && t.nav.settings}
        </button>
        <button type="button" onClick={onToggle} aria-label={collapsed ? t.nav.expand : t.nav.collapse} title={collapsed ? t.nav.expand : t.nav.collapse} className="grid size-9 place-items-center text-muted hover:text-paper">
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
        </button>
      </div>
    </aside>
  );
}

function LibRow({ collapsed, active, onClick, title, subtitle, art }: { collapsed: boolean; active: boolean; onClick: () => void; title: string; subtitle: string; art: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? title : undefined}
      aria-current={active ? 'page' : undefined}
      className={cx('flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-raised', active && 'bg-raised', collapsed && 'justify-center')}
    >
      {art}
      {!collapsed && (
        <span className="min-w-0">
          <span className={cx('block truncate font-semibold', active && 'text-mustard')}>{title}</span>
          <span className="block truncate text-[13px] text-muted">{subtitle}</span>
        </span>
      )}
    </button>
  );
}
