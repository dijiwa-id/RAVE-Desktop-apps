import { api } from '@/lib/api';
import { clearCache } from '@/lib/query';
import { useAuth } from '@/stores/auth';
import { useLikes } from '@/stores/likes';
import { useNav } from '@/stores/nav';
import { resetPlayer } from '@/stores/player';

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
