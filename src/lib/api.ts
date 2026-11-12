import { useAuth } from '@/stores/auth';
import { useSettings } from '@/stores/settings';

/** Galat RFC 9457 dari gateway RAVE. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: { title?: string; detail?: string; type?: string; [k: string]: unknown },
  ) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
  }
}

type Opts = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  signal?: AbortSignal;
  keepalive?: boolean;
};

const base = () => useSettings.getState().server;

/** URL absolut untuk path relatif dari API (gambar, stream, demo-art). */
export function media(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return base() + (url.startsWith('/') ? url : `/${url}`);
}

let refreshing: Promise<boolean> | null = null;

/**
 * Refresh token berotasi; memakai token lama dua kali dianggap pencurian oleh IAM (seluruh sesi dicabut) →
 * satu refresh pada satu waktu. Sesi hanya dihapus bila server menolak token (400/401/403), bukan saat offline.
 */
async function refreshToken(): Promise<boolean> {
  const rt = useAuth.getState().refreshToken;
  if (!rt) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${base()}/v1/auth/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: rt }),
      });
      if ([400, 401, 403].includes(res.status)) {
        useAuth.getState().clear();
        return false;
      }
      if (!res.ok) return false;
      useAuth.getState().setSession(await res.json());
      return true;
    } catch {
      return false;
    }
  })().finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const url = new URL(base() + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const go = () => {
    const token = useAuth.getState().accessToken;
    const headers: Record<string, string> = { 'accept-language': useSettings.getState().locale };
    if (opts.body !== undefined) headers['content-type'] = 'application/json';
    if (token && opts.auth !== false) headers.authorization = `Bearer ${token}`;
    return fetch(url, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
      keepalive: opts.keepalive,
    });
  };
  let res = await go();
  if (res.status === 401 && useAuth.getState().refreshToken && (await refreshToken())) res = await go();
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!res.ok) throw new ApiError(res.status, (data as ApiError['problem']) ?? { title: res.statusText });
  return data as T;
}

/** Pesan galat ramah pengguna (jaringan / server tak terjangkau). */
export function errorText(e: unknown, offline: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof TypeError) return offline; // fetch gagal: server mati / CORS / offline
  return (e as Error)?.message ?? String(e);
}
