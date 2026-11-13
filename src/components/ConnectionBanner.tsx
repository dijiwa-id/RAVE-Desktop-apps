import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudOff, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { clearCache } from '@/lib/query';
import { probeServer, switchServer } from '@/lib/session';
import { useNav } from '@/stores/nav';
import { SERVER_PRESETS, useSettings } from '@/stores/settings';
import { toast } from '@/stores/toast';

/**
 * Banner koneksi: memeriksa server saat start, saat server diganti, dan saat jendela kembali fokus/online.
 * Bila gagal, mencoba ulang dengan jeda bertahap (5→60 dtk) dan menawarkan server lain dari preset.
 * Selama sehat tidak menggambar apa pun dan tidak melakukan polling.
 */
export function ConnectionBanner() {
  const t = useT();
  const server = useSettings((s) => s.server);
  const [down, setDown] = useState(false);
  const [checking, setChecking] = useState(false);
  const fails = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const busy = useRef(false);
  const wasDown = useRef(false);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    clearTimeout(timer.current);
    setChecking(true);
    const ok = (await probeServer(useSettings.getState().server)) !== null;
    busy.current = false;
    setChecking(false);
    setDown(!ok);
    if (ok) {
      fails.current = 0;
      if (wasDown.current) clearCache(); // muat ulang layar yang tadi gagal
      wasDown.current = false;
      return;
    }
    wasDown.current = true;
    fails.current++;
    timer.current = setTimeout(() => void check(), Math.min(60_000, 5_000 * 2 ** Math.min(fails.current - 1, 4)));
  }, []);

  useEffect(() => {
    fails.current = 0;
    void check();
    return () => clearTimeout(timer.current);
  }, [server, check]);

  useEffect(() => {
    const again = () => wasDown.current && void check();
    window.addEventListener('online', again);
    window.addEventListener('focus', again);
    return () => {
      window.removeEventListener('online', again);
      window.removeEventListener('focus', again);
    };
  }, [check]);

  if (!down) return null;
  const others = SERVER_PRESETS.filter((p) => p.url !== server);
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-2 border-berry bg-[#2a1416] px-4 py-2 text-sm">
      <CloudOff className="size-4 shrink-0 text-berry" />
      <span className="font-bold">{t.settings.serverDown}</span>
      <span className="truncate font-mono text-xs text-muted">{server}</span>
      <span className="ml-auto flex items-center gap-3">
        {checking && <Loader2 className="size-4 animate-spin text-mustard" />}
        <button type="button" className="label text-mustard hover:underline" disabled={checking} onClick={() => void check()}>
          {t.common.retry}
        </button>
        {others.map((p) => (
          <button
            key={p.url}
            type="button"
            title={p.url}
            className="label text-paper hover:underline"
            onClick={async () => {
              if ((await probeServer(p.url)) === null) return toast.error(t.settings.serverUnreachable(p.name));
              await switchServer(p.url);
              toast.success(t.settings.serverSaved);
            }}
          >
            {t.settings.useServer(p.name)}
          </button>
        ))}
        <button type="button" className="label text-muted hover:text-paper" onClick={() => useNav.getState().go({ name: 'settings' })}>
          {t.settings.title}
        </button>
      </span>
    </div>
  );
}
