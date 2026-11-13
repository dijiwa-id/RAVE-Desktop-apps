import { api } from '@/lib/api';
import { clearCache } from '@/lib/query';
import { useAuth } from '@/stores/auth';
import { useLikes } from '@/stores/likes';
import { useNav } from '@/stores/nav';
import { resetPlayer } from '@/stores/player';
import { useSettings } from '@/stores/settings';

/** Keluar: cabut refresh token di server (best-effort), hentikan pemutar, bersihkan cache milik akun ini. */
export async function logout() {
  const rt = useAuth.getState().refreshToken;
  if (rt) await api('/v1/auth/logout', { body: { refresh_token: rt } }).catch(() => {});
  resetPlayer();
  useAuth.getState().clear();
  useLikes.getState().reset();
  clearCache();
  useNav.setState({ stack: [{ name: 'home' }], index: 0, route: { name: 'home' } });
}

/** Ganti server dengan aman: server lain = akun & data lain → keluar dulu agar token tidak terkirim ke server yang salah. */
export async function switchServer(url: string) {
  const s = useSettings.getState();
  if (url === s.server) return;
  if (useAuth.getState().user || useAuth.getState().refreshToken) await logout();
  else resetPlayer();
  s.setServer(url);
  clearCache();
}

/** Uji server tanpa mengubah pengaturan: versi RAVE, atau null bila tak terjangkau (batas 6 dtk). */
export async function probeServer(url: string): Promise<string | null> {
  try {
    const r = await fetch(`${url}/v1/version`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return ((await r.json()) as { version?: string }).version ?? '?';
  } catch {
    return null;
  }
}
