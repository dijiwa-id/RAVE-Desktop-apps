import { useEffect, useReducer, useRef } from 'react';
import { api } from '@/lib/api';

/**
 * Cache data mungil (stale-while-revalidate) — pengganti react-query agar bundel tetap ringan.
 * Kunci = path API. Data lama langsung tampil saat kembali ke halaman, lalu diperbarui di latar.
 */
type Entry = { data?: unknown; error?: unknown; at: number; inflight?: Promise<unknown> };
const cache = new Map<string, Entry>();
const subs = new Map<string, Set<() => void>>();
const FRESH_MS = 30_000;

function notify(key: string) {
  subs.get(key)?.forEach((f) => f());
}

function load(key: string, force = false): Promise<unknown> {
  const e = cache.get(key);
  if (e?.inflight) return e.inflight;
  if (!force && e && e.data !== undefined && Date.now() - e.at < FRESH_MS) return Promise.resolve(e.data);
  const p = api(key)
    .then((data) => {
      cache.set(key, { data, at: Date.now() });
      notify(key);
      return data;
    })
    .catch((error) => {
      cache.set(key, { ...cache.get(key), error, at: Date.now(), inflight: undefined });
      notify(key);
      throw error;
    });
  cache.set(key, { ...e, at: e?.at ?? 0, inflight: p });
  return p;
}

export function useApi<T>(key: string | null): { data: T | undefined; error: unknown; loading: boolean; reload: () => void } {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const keyRef = useRef(key);
  keyRef.current = key;
  useEffect(() => {
    if (!key) return;
    const set = subs.get(key) ?? new Set();
    set.add(rerender);
    subs.set(key, set);
    load(key).catch(() => {});
    return () => {
      set.delete(rerender);
    };
  }, [key]);
  const e = key ? cache.get(key) : undefined;
  return {
    data: e?.data as T | undefined,
    error: e?.data === undefined ? e?.error : undefined,
    loading: !!key && e?.data === undefined && !e?.error,
    reload: () => {
      if (keyRef.current) load(keyRef.current, true).catch(() => {});
    },
  };
}

/** Tandai basi & muat ulang semua kunci berawalan `prefix` yang sedang dipakai. */
export function invalidate(prefix: string) {
  for (const k of cache.keys()) {
    if (!k.startsWith(prefix)) continue;
    const e = cache.get(k)!;
    e.at = 0;
    if (subs.get(k)?.size) load(k, true).catch(() => {});
  }
}

/** Kosongkan cache (logout / ganti server). */
export function clearCache() {
  cache.clear();
  subs.forEach((s) => s.forEach((f) => f()));
}
