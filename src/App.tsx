import { useEffect, useRef, useState } from 'react';
import { api, media } from '@/lib/api';
import { registerMediaKeys, setMediaSession } from '@/lib/native';
import type { Me } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { useNav } from '@/stores/nav';
import { usePlayer } from '@/stores/player';
import { useSettings } from '@/stores/settings';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { PlayerBar, type PanelTab } from '@/components/PlayerBar';
import { RightPanel } from '@/components/RightPanel';
import { Toasts } from '@/components/ui';
import Home from '@/views/Home';
import Search from '@/views/Search';
import Library from '@/views/Library';
import Album from '@/views/Album';
import Artist from '@/views/Artist';
import Playlist from '@/views/Playlist';
import Show from '@/views/Show';
import Settings from '@/views/Settings';
import Login from '@/views/Login';
import { useUi } from '@/stores/ui';
import { Splash } from '@/components/Splash';
import { Onboarding } from '@/components/Onboarding';

/** Lebar jendela → tata letak: sidebar ciut < 1100 px, panel kanan menimpa konten < 1280 px. */
function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

/** Langsung masuk ke pemutar sebagai tamu (pratinjau 30 dtk); Masuk/Daftar dibuka sebagai modal. */
export default function App() {
  const auth = useUi((s) => s.auth);
  const needsOnboarding = useAuth((s) => !!s.accessToken && s.user?.onboarded === false);
  const [skipOnboarding, setSkipOnboarding] = useState(false);
  return (
    <>
      <Shell />
      {auth && <Login key={auth} mode={auth} />}
      {needsOnboarding && !skipOnboarding && !auth && <Onboarding onClose={() => setSkipOnboarding(true)} />}
      <Splash />
    </>
  );
}

function Shell() {
  const width = useWidth();
  const route = useNav((s) => s.route);
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const [panel, setPanel] = useState<PanelTab | null>(null);
  const [solid, setSolid] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const collapsed = userCollapsed ?? width < 1100;
  const overlayPanel = width < 1280;

  // Profil terbaru (status Premium dsb.) saat aplikasi dibuka / setelah masuk.
  const authed = !!useAuth((s) => s.accessToken);
  useEffect(() => {
    if (!authed) return;
    api<Me>('/v1/me')
      .then((u) => useAuth.getState().setUser(u))
      .catch(() => {});
  }, [authed]);

  // Gulir ke atas saat pindah halaman.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setSolid(false);
  }, [route]);

  useShortcuts();
  useMediaIntegration();
  useLocaleSync();

  const view = (() => {
    switch (route.name) {
      case 'home':
        return <Home />;
      case 'search':
        return <Search q={route.q} />;
      case 'library':
        return <Library />;
      case 'liked':
        return <Playlist id="liked" />;
      case 'album':
        return <Album key={route.id} id={route.id} />;
      case 'artist':
        return <Artist key={route.id} id={route.id} />;
      case 'playlist':
        return <Playlist key={route.id} id={route.id} />;
      case 'show':
        return <Show key={route.id} id={route.id} />;
      case 'settings':
        return <Settings />;
    }
  })();

  return (
    <div className="flex h-full flex-col gap-2 bg-canvas p-2">
      <div className="relative flex min-h-0 flex-1 gap-2">
        <Sidebar collapsed={collapsed} onToggle={() => setUserCollapsed(!collapsed)} />
        <main className="panel relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div ref={scroller} onScroll={(e) => setSolid(e.currentTarget.scrollTop > 40)} className="min-h-0 flex-1 overflow-y-auto">
            <TopBar solid={solid} />
            <div className="rise" key={JSON.stringify(route)}>
              {view}
            </div>
          </div>
        </main>
        {panel && (
          <div className={overlayPanel ? 'absolute inset-y-0 right-0 z-30 flex shadow-[-12px_0_32px_rgb(0_0_0/0.5)]' : 'flex'}>
            <RightPanel tab={panel} onTab={setPanel} onClose={() => setPanel(null)} />
          </div>
        )}
      </div>
      <PlayerBar panel={panel} onPanel={setPanel} />
      <Toasts />
    </div>
  );
}

/** Pintasan keyboard (tidak aktif saat mengetik di kolom isian). */
/** Bahasa yang dipilih disimpan ke akun (PATCH /v1/me, BRD IAM-08). */
function useLocaleSync() {
  const locale = useSettings((s) => s.locale);
  const authed = !!useAuth((s) => s.accessToken);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (authed) void api('/v1/me', { method: 'PATCH', body: { locale } }).catch(() => {});
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps
}

function useShortcuts() {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.tagName === 'SELECT' || el?.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      const p = usePlayer.getState();
      const nav = useNav.getState();
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        nav.go({ name: 'search' });
        return;
      }
      if (e.altKey && e.key === 'ArrowLeft') return nav.back();
      if (e.altKey && e.key === 'ArrowRight') return nav.forward();
      if (typing) return;
      if (e.code === 'Space' && !(el?.tagName === 'BUTTON' || el?.getAttribute('role') === 'button')) {
        e.preventDefault();
        p.toggle();
      } else if (mod && e.key === 'ArrowRight') {
        e.preventDefault();
        p.next();
      } else if (mod && e.key === 'ArrowLeft') {
        e.preventDefault();
        p.prev();
      } else if (mod && e.key === 'ArrowUp') {
        e.preventDefault();
        p.setVolume(Math.min(1, p.volume + 0.1));
      } else if (mod && e.key === 'ArrowDown') {
        e.preventDefault();
        p.setVolume(Math.max(0, p.volume - 0.1));
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
}

/** Tombol media keyboard global (Tauri) + overlay media OS (MediaSession) mengikuti lagu yang diputar. */
function useMediaIntegration() {
  const mediaKeys = useSettings((s) => s.mediaKeys);
  const current = usePlayer((s) => s.current);
  useEffect(() => {
    if (!mediaKeys) return;
    let off = () => {};
    let alive = true;
    void registerMediaKeys((k) => {
      const p = usePlayer.getState();
      if (k === 'MediaPlayPause') p.toggle();
      else if (k === 'MediaTrackNext') p.next();
      else p.prev();
    }).then((f) => (alive ? (off = f) : f()));
    return () => {
      alive = false;
      off();
    };
  }, [mediaKeys]);
  useEffect(() => {
    const p = usePlayer.getState();
    setMediaSession(current ? { title: current.title, artist: current.subtitle, artwork: media(current.image_url) } : null, {
      play: () => usePlayer.getState().playing || usePlayer.getState().toggle(),
      pause: () => usePlayer.getState().playing && usePlayer.getState().toggle(),
      next: p.next,
      prev: p.prev,
      seek: p.seek,
    });
  }, [current]);
  // Judul jendela = lagu yang diputar (seperti pemutar desktop lain).
  const playing = usePlayer((s) => s.playing);
  useEffect(() => {
    document.title = current && playing ? `${current.title} · ${current.subtitle}` : 'RAVE';
  }, [current, playing]);
}
