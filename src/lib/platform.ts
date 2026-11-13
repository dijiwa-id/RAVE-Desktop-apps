import { useApi, usePolling } from '@/lib/query';

const KEY = '/v1/platform/config';

/** Pengaturan publik platform (modul aktif, live, dll.) — sama dengan web `usePlatformConfig`. */
export function usePlatform() {
  const q = useApi<{ settings?: Record<string, unknown> }>(KEY);
  usePolling(KEY, 60_000);
  return <T,>(key: string, fallback: T): T => {
    const v = q.data?.settings?.[key];
    return v === undefined || v === null ? fallback : (v as T);
  };
}
