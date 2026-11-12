import { create } from 'zustand';
import { api, ApiError, media } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { PlaybackSession, Track } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { useSettings } from '@/stores/settings';
import { toast } from '@/stores/toast';
import { abortAdBreak, runAdBreak, useAds } from '@/stores/ads';

/** Item yang bisa diputar: lagu atau episode podcast. */
export interface Playable {
  id: string;
  kind: 'track' | 'episode';
  title: string;
  subtitle: string;
  artistKey?: string; // slug/id artis untuk navigasi
  releaseId?: string;
  image_url: string | null;
  duration_ms: number;
  premium?: boolean;
  content_warning?: boolean;
  explicit?: boolean;
  has_lyrics?: boolean;
}

export const trackToPlayable = (tr: Track): Playable => ({
  id: tr.id,
  kind: 'track',
  title: tr.title,
  subtitle: tr.artist.name,
  artistKey: tr.artist.slug,
  releaseId: tr.release.id,
  image_url: tr.release.cover_url,
  duration_ms: tr.duration_ms,
  explicit: tr.explicit,
  has_lyrics: tr.has_lyrics,
});

interface PlayerState {
  queue: Playable[];
  index: number;
  current: Playable | null;
  session: PlaybackSession | null;
  playing: boolean;
  buffering: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  error: string | null;
  playQueue: (items: Playable[], start?: number) => Promise<void>;
  playOne: (item: Playable) => Promise<void>;
  addToQueue: (item: Playable) => void;
  jump: (index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (ms: number) => void;
  retry: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

const audio = new Audio();
audio.preload = 'auto';

// ---- Event putar untuk royalti & statistik (TDD §11.3): start, progress tiap 15 dtk, complete, skip ----
const PENDING_KEY = 'rave-desktop-pending-events';
let pending: Record<string, unknown>[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as Record<string, unknown>[];
  } catch {
    return [];
  }
})();
const persist = () => {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending.slice(-200)));
  } catch {
    /* penyimpanan penuh/terkunci */
  }
};
let lastProgressAt = 0;
let playedMs = 0;
let lastTick = 0;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function queueEvent(type: 'start' | 'progress' | 'complete' | 'skip') {
  const s = usePlayer.getState();
  if (!s.session || !s.current || !useAuth.getState().accessToken) return;
  pending.push({
    session_id: s.session.session_id,
    [s.current.kind === 'track' ? 'track_id' : 'episode_id']: s.current.id,
    type,
    position_ms: Math.round(s.positionMs),
    played_ms: Math.round(playedMs),
    at: new Date().toISOString(),
  });
  persist();
  if (type !== 'progress' || pending.length >= 4) void flush();
  else if (!flushTimer) flushTimer = setInterval(() => void flush(), 30_000);
}
async function flush(keepalive = false) {
  if (!pending.length) return;
  const events = pending;
  pending = [];
  try {
    await api('/v1/events/play', { body: { events }, keepalive });
  } catch (e) {
    // Offline / 5xx / 429 → simpan untuk dikirim lagi; 4xx lain dibuang agar batch rusak tidak berulang.
    const retry = !(e instanceof ApiError) || e.status >= 500 || e.status === 429;
    if (retry) pending = events.concat(pending).slice(-200);
  } finally {
    if (!pending.length && flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    persist();
  }
}
// Kirim event yang tersisa dari sesi sebelumnya (aplikasi ditutup/offline).
if (pending.length) setTimeout(() => void flush(), 3000);
window.addEventListener('beforeunload', () => void flush(true));

let recoveries = 0;
let premiumNotified = false;

function playSafe() {
  return audio.play().catch((e: { name?: string }) => {
    if (e?.name === 'AbortError') return;
    usePlayer.setState({ playing: false, buffering: false, error: t().player.failed });
    throw e;
  });
}

export const usePlayer = create<PlayerState>((set, get) => {
  /** resumeMs > 0: pemulihan item yang sama (stream kedaluwarsa/putus) — lanjut dari posisi terakhir. */
  async function load(item: Playable, resumeMs = 0) {
    const prev = get();
    if (!resumeMs) recoveries = 0;
    if (!resumeMs && prev.current && prev.playing && prev.positionMs < prev.durationMs - 2000) queueEvent('skip');
    audio.pause();
    set({ current: item, session: null, positionMs: resumeMs, durationMs: item.duration_ms, error: null, buffering: true });
    if (!resumeMs) {
      playedMs = 0;
      lastProgressAt = 0;
    }
    try {
      const session = await api<PlaybackSession>('/v1/playback/sessions', {
        body: { [item.kind === 'track' ? 'track_id' : 'episode_id']: item.id, quality: useSettings.getState().quality },
      });
      if (get().current?.id !== item.id) return;
      set({ session, durationMs: session.duration_ms || item.duration_ms });
      const cap = session.quality_capped;
      if (cap && cap !== 'preview' && !premiumNotified) {
        premiumNotified = true;
        toast.info(cap === 'premium' ? t().player.premiumQuality : cap === 'disabled' ? t().player.qualityDisabled : t().player.qualityUnavailable);
      }
      audio.src = media(session.stream_url)!;
      if (resumeMs) audio.addEventListener('loadedmetadata', () => (audio.currentTime = resumeMs / 1000), { once: true });
      audio.volume = get().muted ? 0 : get().volume;
      await playSafe();
      if (get().current?.id !== item.id) return;
      if (!resumeMs) queueEvent('start');
    } catch (e) {
      if (e instanceof DOMException) return;
      if (get().current?.id !== item.id) return;
      const msg = e instanceof ApiError && e.status === 402 ? t().player.premiumEpisode : e instanceof ApiError ? e.message : t().common.offline;
      set({ playing: false, buffering: false, error: msg });
    }
  }

  function nextIndex(): number | null {
    const { queue, index, shuffle, repeat } = get();
    if (!queue.length) return null;
    const n = shuffle && queue.length > 1 ? (index + 1 + Math.floor(Math.random() * (queue.length - 1))) % queue.length : index + 1;
    if (n < queue.length) return n;
    return repeat === 'all' ? 0 : null;
  }

  /** Selesai alami → satu-satunya titik jeda iklan (tier Gratis), sebelum item berikutnya mulai. */
  async function onEnded() {
    queueEvent('complete');
    const { repeat, current, queue, index } = get();
    if (repeat === 'one' && current) {
      await runAdBreak(current);
      if (get().queue !== queue || get().index !== index) return void load(get().queue[get().index]);
      audio.currentTime = 0;
      void playSafe().catch(() => {});
      return;
    }
    const n = nextIndex();
    if (n == null) return;
    set({ index: n });
    await runAdBreak(get().queue[n]);
    const item = get().queue[get().index];
    if (item) void load(item);
  }

  audio.addEventListener('play', () => {
    lastTick = performance.now();
    set({ playing: true });
  });
  audio.addEventListener('pause', () => set({ playing: false, buffering: false }));
  audio.addEventListener('waiting', () => set({ buffering: true }));
  audio.addEventListener('playing', () => {
    recoveries = 0;
    set({ buffering: false });
  });
  audio.addEventListener('canplay', () => set({ buffering: false }));
  audio.addEventListener('timeupdate', () => {
    const now = performance.now();
    if (!audio.paused && lastTick) playedMs += Math.min(1000, now - lastTick);
    lastTick = now;
    const pos = audio.currentTime * 1000;
    const s = get();
    set({ positionMs: pos });
    if (s.session?.preview_only && s.session.preview_ms && pos >= s.session.preview_ms) {
      audio.pause();
      set({ error: t().player.previewEnded });
    }
    if (playedMs - lastProgressAt >= 15_000) {
      lastProgressAt = playedMs;
      queueEvent('progress');
    }
  });
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audio.duration)) set({ durationMs: audio.duration * 1000 });
  });
  audio.addEventListener('ended', () => void onEnded());
  audio.addEventListener('error', () => {
    const { current, session, positionMs } = get();
    if (!current || !session) return;
    // URL bertanda tangan kedaluwarsa / jaringan putus → sesi baru, lanjut dari posisi terakhir.
    if (recoveries < 2 && navigator.onLine !== false) {
      recoveries++;
      void load(current, positionMs);
      return;
    }
    set({ playing: false, buffering: false, error: t().player.streamLost });
  });
  window.addEventListener('online', () => {
    const { current, session, error, positionMs } = get();
    if (current && session && error === t().player.streamLost) {
      recoveries = 0;
      void load(current, positionMs);
    }
    void flush();
  });

  return {
    queue: [],
    index: -1,
    current: null,
    session: null,
    playing: false,
    buffering: false,
    positionMs: 0,
    durationMs: 0,
    volume: 0.8,
    muted: false,
    shuffle: false,
    repeat: 'off',
    error: null,

    async playQueue(items, start = 0) {
      if (!items.length) return;
      set({ queue: items, index: start });
      if (useAds.getState().busy) return; // diputar setelah iklan selesai
      await load(items[start]);
    },
    async playOne(item) {
      const { queue, index } = get();
      set({ queue: [...queue.slice(0, index + 1), item, ...queue.slice(index + 1)], index: index + 1 });
      if (useAds.getState().busy) return;
      await load(item);
    },
    addToQueue: (item) => set({ queue: [...get().queue, item] }),
    jump(i) {
      if (useAds.getState().busy) return;
      const item = get().queue[i];
      if (!item) return;
      set({ index: i });
      void load(item);
    },
    toggle() {
      if (useAds.getState().active) return useAds.getState().toggle();
      if (useAds.getState().busy || !get().current) return;
      if (audio.paused) {
        if (!audio.src) return void load(get().current!, get().positionMs);
        void playSafe().catch(() => {});
      } else audio.pause();
    },
    next() {
      if (useAds.getState().busy) return;
      const n = nextIndex();
      if (n == null) return void (get().queue.length && audio.pause());
      set({ index: n });
      void load(get().queue[n]);
    },
    prev() {
      if (useAds.getState().busy) return;
      const { queue, index } = get();
      if (audio.currentTime > 3 || index <= 0) {
        audio.currentTime = 0;
        return;
      }
      set({ index: index - 1 });
      void load(queue[index - 1]);
    },
    seek(ms) {
      if (useAds.getState().busy || !get().current) return;
      audio.currentTime = ms / 1000;
      set({ positionMs: ms });
    },
    retry() {
      const { current, positionMs } = get();
      if (current) {
        recoveries = 0;
        void load(current, positionMs);
      }
    },
    setVolume(v) {
      audio.volume = v;
      useAds.getState().setVolume(v);
      set({ volume: v, muted: v === 0 });
    },
    toggleMute() {
      const muted = !get().muted;
      audio.volume = muted ? 0 : get().volume || 0.8;
      useAds.getState().setVolume(audio.volume);
      set({ muted });
    },
    toggleShuffle: () => set({ shuffle: !get().shuffle }),
    cycleRepeat: () => set({ repeat: get().repeat === 'off' ? 'all' : get().repeat === 'all' ? 'one' : 'off' }),
  };
});

/** Logout: hentikan pemutaran & buang event milik akun sebelumnya (tidak boleh terkirim dengan token akun lain). */
export function resetPlayer() {
  pending = [];
  persist();
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  abortAdBreak();
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  usePlayer.setState({ queue: [], index: -1, current: null, session: null, playing: false, buffering: false, positionMs: 0, error: null });
}
