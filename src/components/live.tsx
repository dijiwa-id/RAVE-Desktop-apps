import { useEffect, useRef, useState, type FormEvent } from 'react';
import type Hls from 'hls.js';
import { ArrowDown, CalendarClock, Eye, Maximize, Radio, Send, Volume2, VolumeX } from 'lucide-react';
import { api, ApiError, media } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/fmt';
import { usePlatform } from '@/lib/platform';
import { useApi, usePolling } from '@/lib/query';
import type { LiveChatMessage, LiveChatPage, LivePlayback, LiveStatus, LiveStream } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { useNav } from '@/stores/nav';
import { usePlayer } from '@/stores/player';
import { useUi } from '@/stores/ui';
import { toast } from '@/stores/toast';
import { cx, Spinner } from '@/components/ui';

// Live Streaming setara web (apps/web components/live): daftar stream, pemutar HLS bertoken, heartbeat, chat polling.

export const isOnAir = (s: LiveStatus | null | undefined) => s === 'LIVE' || s === 'INTERRUPTED';
export const liveImage = (s: LiveStream) => s.cover_url ?? s.artist?.image_url ?? null;
export const dateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Modul live aktif (pengaturan publik `modules.live`, default aktif). */
export function useLiveEnabled() {
  return usePlatform()('modules.live', true);
}

/** Daftar stream publik dengan polling. */
export function useLiveStreams(status: 'live' | 'upcoming' | 'ended', limit: number, every: number, enabled = true) {
  const key = enabled ? `/v1/live/streams?status=${status}&limit=${limit}` : null;
  const q = useApi<{ data: LiveStream[] }>(key);
  usePolling(key, every);
  return q;
}

/** Penonton anonim per sesi aplikasi (heartbeat). */
let viewer: string | null = null;
function viewerId() {
  try {
    viewer ??= sessionStorage.getItem('rave-live-viewer');
    if (!viewer) sessionStorage.setItem('rave-live-viewer', (viewer = crypto.randomUUID()));
  } catch {
    viewer ??= crypto.randomUUID();
  }
  return viewer;
}

function useCountdown(until: string | null | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [until]);
  return until ? Math.max(0, new Date(until).getTime() - now) : null;
}

export function Countdown({ until, className }: { until: string; className?: string }) {
  const t = useT();
  const left = useCountdown(until) ?? 0;
  if (left <= 0) return <span className={className}>{t.live.startingSoon}</span>;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const p = (n: number) => String(n).padStart(2, '0');
  return <span className={cx('font-label tabular-nums', className)}>{`${d ? t.live.days(d) : ''}${p(Math.floor((s % 86400) / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`}</span>;
}

/** Pill merah "LIVE" berdenyut + jumlah penonton. */
export function LivePill({ viewers, interrupted }: { viewers?: number | null; interrupted?: boolean }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx('label inline-flex items-center gap-1.5 px-2 py-0.5 !text-[11px] text-white', interrupted ? 'bg-amber-600' : 'bg-red-600')}>
        <span className="relative flex size-2">
          {!interrupted && <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />}
          <span className="relative inline-flex size-2 rounded-full bg-white" />
        </span>
        {interrupted ? t.live.interrupted : t.live.live}
      </span>
      {viewers != null && (
        <span className="inline-flex items-center gap-1 bg-black/70 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
          <Eye className="size-3" />
          {fmt.compact(viewers)}
        </span>
      )}
    </span>
  );
}

/** Kartu stream 16:9 (Live, Beranda). */
export function LiveCard({ s }: { s: LiveStream }) {
  const t = useT();
  const go = useNav((n) => n.go);
  const img = media(liveImage(s));
  const open = () => go({ name: 'live-watch', id: s.id });
  return (
    <div role="button" tabIndex={0} onClick={open} onKeyDown={(e) => e.key === 'Enter' && open()} className="group min-w-0 p-3 transition-colors hover:bg-raised focus-visible:bg-raised">
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-raised to-berry/60 shadow-[0_8px_24px_rgb(0_0_0/0.45)]">
        {img ? (
          <img src={img} alt="" loading="lazy" className={cx('size-full object-cover transition duration-300 group-hover:scale-105', s.status === 'ENDED' && 'opacity-60 grayscale')} />
        ) : (
          <div className="grid size-full place-items-center">
            <Radio className="size-10 text-paper/60" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          {isOnAir(s.status) ? (
            <LivePill viewers={s.viewers} interrupted={s.status === 'INTERRUPTED'} />
          ) : s.status === 'SCHEDULED' ? (
            <span className="inline-flex items-center gap-1 bg-black/75 px-2 py-0.5 text-[11px] font-bold">
              <CalendarClock className="size-3" /> {s.scheduled_at ? dateTime(s.scheduled_at) : t.live.soon}
            </span>
          ) : (
            <span className="bg-black/75 px-2 py-0.5 text-[11px] font-bold text-paper/80">{t.live.aired}</span>
          )}
        </div>
        {s.access === 'TICKET' && <span className="label absolute top-2 right-2 bg-berry px-1.5 py-0.5 !text-[10px] text-white">{t.live.ticket}</span>}
      </div>
      <p className="mt-3 truncate font-bold">{s.title}</p>
      <p className="mt-0.5 truncate text-[13px] text-muted">
        {s.artist?.name ?? s.org.name}
        {s.status === 'SCHEDULED' && s.scheduled_at && (
          <>
            {' · '}
            <Countdown until={s.scheduled_at} className="text-mustard" />
          </>
        )}
        {s.status === 'ENDED' && s.ended_at && ` · ${fmt.date(s.ended_at)}`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Pemutar HLS

let hlsModule: Promise<typeof Hls> | null = null;
const loadHls = () =>
  (hlsModule ??= import('hls.js/light')
    .then((m) => m.default)
    .catch((e) => {
      hlsModule = null;
      throw e;
    }));

const tokenOf = (url: string) => {
  try {
    return new URL(url).searchParams.get('token');
  } catch {
    return null;
  }
};

type Phase = 'connecting' | 'waiting' | 'playing' | 'error';

/**
 * Pemutar live: POST /playback → hls_url bertoken (relatif → server), token diperbarui sebelum kedaluwarsa dan disisipkan
 * ke tiap request hls.js (xhrSetup) tanpa memutus pemutaran. 409 = belum live → tunggu & coba lagi. Musik dijeda saat live
 * mulai berbunyi. Heartbeat penonton tiap 15 dtk selama video berjalan.
 */
export function LivePlayer({ streamId, status, autoMute = false }: { streamId: string; status: LiveStatus; autoMute?: boolean }) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const token = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>('connecting');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(autoMute);
  const [viewers, setViewers] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const onAir = isOnAir(status);

  useEffect(() => {
    if (!onAir) return;
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    let backoff = 2000;
    const v = video.current!;
    setPhase('connecting');
    setError('');

    const teardown = () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      v.removeAttribute('src');
      v.load();
    };
    const again = (ms: number) => {
      clearTimeout(retry);
      retry = setTimeout(() => !disposed && void start(), ms);
    };
    const fail = (msg: string) => {
      setPhase('error');
      setError(msg);
    };
    const playback = () => api<LivePlayback>(`/v1/live/streams/${streamId}/playback`, { method: 'POST', body: {} });
    const scheduleRefresh = (expiresAt: string) => {
      clearTimeout(refresh);
      const ms = Math.max(30_000, new Date(expiresAt).getTime() - Date.now() - 5 * 60_000);
      refresh = setTimeout(async () => {
        const pb = await playback().catch(() => null);
        if (disposed) return;
        if (pb) {
          token.current = tokenOf(media(pb.hls_url)!);
          scheduleRefresh(pb.expires_at);
        } else scheduleRefresh(new Date(Date.now() + 5 * 60_000 + 30_000).toISOString());
      }, ms);
    };

    async function start() {
      teardown();
      let pb: LivePlayback;
      try {
        pb = await playback();
      } catch (e) {
        if (disposed) return;
        if (e instanceof ApiError) {
          if (e.status === 409) {
            setPhase('waiting');
            return again(5000);
          }
          if (e.status === 401) return fail(t.live.needLogin);
          if (e.status === 403) return fail(t.live.ticketOnly);
          if (e.status === 404) return fail(t.live.notFound);
        }
        backoff = Math.min(backoff * 2, 15_000);
        return again(backoff);
      }
      if (disposed) return;
      const url = media(pb.hls_url)!;
      token.current = tokenOf(url);
      scheduleRefresh(pb.expires_at);
      const H = await loadHls().catch(() => null);
      if (disposed) return;
      if (!H || !H.isSupported()) {
        if (v.canPlayType('application/vnd.apple.mpegurl')) {
          v.src = url;
          void v.play().catch(() => {});
          return;
        }
        return fail(t.live.failed);
      }
      // Tanpa worker: CSP Tauri tidak mengizinkan worker blob.
      const hls = new H({
        enableWorker: false,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
        xhrSetup: (xhr, u) => {
          const tk = token.current;
          if (!tk) return;
          try {
            const x = new URL(u);
            if (x.searchParams.has('token') && x.searchParams.get('token') !== tk) {
              x.searchParams.set('token', tk);
              xhr.open('GET', x.toString(), true);
            }
          } catch {
            /* biarkan apa adanya */
          }
        },
      });
      hlsRef.current = hls;
      let mediaErrors = 0;
      hls.on(H.Events.MANIFEST_PARSED, () => void v.play().catch(() => {}));
      hls.on(H.Events.ERROR, (_e, d) => {
        if (!d.fatal || disposed) return;
        if (d.type === H.ErrorTypes.MEDIA_ERROR && mediaErrors++ < 2) return hls.recoverMediaError();
        const code = (d.response as { code?: number } | undefined)?.code;
        if (code === 401 || code === 403) {
          // Token ditolak → minta playback baru.
          return again(500);
        }
        setPhase('waiting');
        backoff = Math.min(backoff * 2, 15_000);
        again(backoff);
      });
      hls.loadSource(url);
      hls.attachMedia(v);
    }

    void start();
    return () => {
      disposed = true;
      clearTimeout(retry);
      clearTimeout(refresh);
      teardown();
    };
  }, [streamId, onAir, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Atribut `muted` React tidak selalu tercermin setelah mount → set langsung.
  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  // Video berbunyi → jeda musik (satu sumber suara).
  useEffect(() => {
    const v = video.current!;
    const onPlaying = () => {
      setPhase('playing');
      if (!v.muted) {
        const p = usePlayer.getState();
        if (p.playing) p.toggle();
      }
    };
    v.addEventListener('playing', onPlaying);
    v.addEventListener('volumechange', onPlaying);
    return () => {
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('volumechange', onPlaying);
    };
  }, []);

  // Heartbeat penonton.
  useEffect(() => {
    if (!onAir) return;
    let stop = false;
    const beat = async () => {
      const v = video.current;
      if (!v || v.paused) return;
      const r = await api<{ viewers: number }>(`/v1/live/streams/${streamId}/heartbeat`, { body: { viewer_id: viewerId() } }).catch(() => null);
      if (!stop && r) setViewers(r.viewers);
    };
    const first = setTimeout(beat, 1500);
    const i = setInterval(beat, 15_000);
    return () => {
      stop = true;
      clearTimeout(first);
      clearInterval(i);
    };
  }, [streamId, onAir]);

  const goLive = () => {
    const v = video.current;
    const edge = hlsRef.current?.liveSyncPosition ?? (v && v.seekable.length ? v.seekable.end(v.seekable.length - 1) - 3 : null);
    if (v && edge != null) v.currentTime = edge;
    void v?.play().catch(() => {});
  };

  return (
    <div ref={wrap} className="group relative aspect-video w-full overflow-hidden bg-black">
      <video ref={video} muted={muted} playsInline className="size-full" data-testid="live-video" />
      {phase !== 'playing' && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 text-center">
          {phase === 'error' ? (
            <div className="flex flex-col items-center gap-3 p-6">
              <p className="max-w-sm text-sm">{error}</p>
              <button type="button" className="btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
                {t.live.retry}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Spinner className="size-7" />
              <p className="label text-muted">{phase === 'waiting' ? t.live.waiting : t.live.connecting}</p>
            </div>
          )}
        </div>
      )}
      {phase === 'playing' && (
        <>
          <div className="absolute top-3 left-3">
            <LivePill viewers={viewers} interrupted={status === 'INTERRUPTED'} />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-3 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <PlayerBtn label={muted ? t.live.unmute : t.live.mute} onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </PlayerBtn>
            <button type="button" onClick={goLive} className="label px-2 py-1 text-paper hover:text-mustard">
              {t.live.goLive}
            </button>
            <span className="flex-1" />
            <PlayerBtn label={t.live.fullscreen} onClick={() => void wrap.current?.requestFullscreen?.().catch(() => {})}>
              <Maximize className="size-5" />
            </PlayerBtn>
          </div>
          {muted && (
            <button type="button" onClick={() => setMuted(false)} className="btn-primary absolute right-3 top-3 !px-3 !py-1.5">
              <VolumeX className="mr-1.5 inline size-4" />
              {t.live.unmute}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PlayerBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-9 place-items-center text-paper hover:text-mustard">
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- Chat

const MAX_LEN = 300;

/** Chat live berbasis polling (tiap 2 dtk, jeda saat jendela tersembunyi, backoff saat gagal). */
export function LiveChat({ streamId, ended, className }: { streamId: string; ended?: boolean; className?: string }) {
  const t = useT();
  const authed = !!useAuth((s) => s.accessToken);
  const [msgs, setMsgs] = useState<LiveChatMessage[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [slowmode, setSlowmode] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastId = useRef<number | null>(null);

  const merge = (incoming: LiveChatMessage[]) => {
    if (!incoming.length) return;
    setMsgs((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const add = incoming.filter((m) => !seen.has(m.id));
      if (!add.length) return prev;
      if (!atBottom.current) setUnseen((n) => n + add.length);
      return [...prev, ...add].sort((a, b) => a.id - b.id).slice(-500);
    });
  };

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 2000;
    let inFlight = false;
    lastId.current = null;
    setMsgs([]);
    setLoaded(false);
    const tick = async () => {
      if (stop) return;
      if (document.hidden) {
        timer = setTimeout(tick, 2000);
        return;
      }
      inFlight = true;
      try {
        const r = await api<LiveChatPage>(`/v1/live/streams/${streamId}/chat`, { query: { after: lastId.current ?? undefined, limit: 100 } });
        if (stop) return;
        setEnabled(r.chat_enabled);
        setSlowmode(r.slowmode_s ?? 0);
        if (r.last_id != null) lastId.current = Math.max(lastId.current ?? 0, r.last_id);
        merge(r.data);
        setLoaded(true);
        delay = 2000;
      } catch {
        delay = Math.min(delay * 2, 30_000);
      } finally {
        inFlight = false;
      }
      if (!stop) timer = setTimeout(tick, delay);
    };
    void tick();
    const onVis = () => {
      if (!document.hidden && !inFlight) {
        clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [streamId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = list.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const i = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= cooldownUntil) clearInterval(i);
    }, 250);
    return () => clearInterval(i);
  }, [cooldownUntil]);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending || cooldown > 0) return;
    setSending(true);
    try {
      const m = await api<LiveChatMessage>(`/v1/live/streams/${streamId}/chat`, { body: { body } });
      setText('');
      atBottom.current = true;
      merge([{ ...m, mine: true }]);
      if (slowmode > 0) {
        setCooldownUntil(Date.now() + slowmode * 1000);
        setNow(Date.now());
      }
    } catch (err) {
      const retryAfter = err instanceof ApiError ? Number((err.problem as { retry_after?: number }).retry_after) : NaN;
      if (retryAfter > 0) {
        setCooldownUntil(Date.now() + retryAfter * 1000);
        setNow(Date.now());
      } else {
        toast.error((err as Error).message);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className={cx('panel flex min-h-0 flex-col', className)} aria-label={t.live.chat}>
      <div className="flex h-12 shrink-0 items-center border-b border-line px-4">
        <h2 className="label text-paper">{t.live.chat}</h2>
      </div>
      <div
        ref={list}
        onScroll={() => {
          const el = list.current!;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          if (atBottom.current) setUnseen(0);
        }}
        className="relative min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm"
      >
        {!enabled ? (
          <p className="py-8 text-center text-muted">{t.live.chatOff}</p>
        ) : !loaded ? (
          <div className="grid place-items-center py-8">
            <Spinner />
          </div>
        ) : msgs.length === 0 ? (
          <p className="py-8 text-center text-muted">{t.live.chatEmpty}</p>
        ) : (
          msgs.map((m) => (
            <p key={m.id} className="break-words leading-snug">
              <span className={cx('mr-1.5 font-bold', m.mine ? 'text-mustard' : 'text-lavender')}>{m.display_name}</span>
              <span className="text-paper/90">{m.body}</span>
            </p>
          ))
        )}
      </div>
      {unseen > 0 && (
        <button
          type="button"
          onClick={() => {
            list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
            atBottom.current = true;
            setUnseen(0);
          }}
          className="label mx-auto -mt-10 mb-2 flex items-center gap-1 bg-mustard px-3 py-1 text-ink"
        >
          <ArrowDown className="size-3" /> {t.live.newMsgs(unseen)}
        </button>
      )}
      <div className="shrink-0 border-t border-line p-3">
        {!enabled || ended ? null : authed ? (
          <form onSubmit={send} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              placeholder={t.live.chatPh}
              aria-label={t.live.chatPh}
              className="min-w-0 flex-1 border border-line bg-raised px-3 py-2 text-sm placeholder:text-subtle focus:border-mustard focus:outline-none"
            />
            <button type="submit" disabled={!text.trim() || sending || cooldown > 0} title={t.live.send} aria-label={t.live.send} className="btn-primary !px-3 !py-2">
              {cooldown > 0 ? <span className="text-xs">{t.live.slow(cooldown)}</span> : <Send className="size-4" />}
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => useUi.getState().openAuth()} className="btn-ghost w-full justify-center">
            {t.live.chatLogin}
          </button>
        )}
      </div>
    </aside>
  );
}

/** Ada stream yang sedang live (titik merah di navigasi) — dipoll tiap 60 dtk. */
export function useAnyLive() {
  const enabled = useLiveEnabled();
  const q = useLiveStreams('live', 1, 60_000, enabled);
  return enabled && !!q.data?.data.length;
}

