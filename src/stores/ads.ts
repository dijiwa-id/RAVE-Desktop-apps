import { create } from 'zustand';
import { api, media } from '@/lib/api';
import type { AdBreakResponse, AdCreative } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import type { Playable } from '@/stores/player';

// Jeda iklan tier Gratis (sama dengan web, docs/API.md §11): hanya di antara lagu yang selesai alami, tidak pernah
// memotong lagu. Best-effort — galat/timeout apa pun langsung melanjutkan pemutaran.

const REQUEST_TIMEOUT_MS = 4000;

interface Active {
  ads: AdCreative[];
  index: number;
  elapsedMs: number;
  paused: boolean;
}
interface AdsState {
  busy: boolean;
  active: Active | null;
  volume: number;
  setVolume: (v: number) => void;
  toggle: () => void;
  skip: () => void;
  click: () => void;
}

let el: HTMLAudioElement | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let lastTick = 0;
let finish: (() => void) | null = null;

const send = (id: string, event: 'start' | 'complete' | 'skip' | 'click') => void api(`/v1/ads/impressions/${id}/events`, { body: { event } }).catch(() => {});

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  if (el) {
    el.onended = el.onerror = el.ontimeupdate = null;
    el.pause();
    el.removeAttribute('src');
    el = null;
  }
}

export const useAds = create<AdsState>((set, get) => ({
  busy: false,
  active: null,
  volume: 0.8,
  setVolume(volume) {
    set({ volume });
    if (el) el.volume = volume;
  },
  toggle() {
    const a = get().active;
    if (!a) return;
    const paused = !a.paused;
    set({ active: { ...a, paused } });
    if (el) paused ? el.pause() : void el.play().catch(() => {});
    lastTick = performance.now();
  },
  skip() {
    const a = get().active;
    const ad = a?.ads[a.index];
    if (!a || !ad || ad.skippable_after_s == null || a.elapsedMs < ad.skippable_after_s * 1000) return;
    send(ad.impression_id, 'skip');
    advance();
  },
  click() {
    const a = get().active;
    const ad = a?.ads[a.index];
    if (ad) send(ad.impression_id, 'click');
  },
}));

const setElapsed = (ms: number) => {
  const a = useAds.getState().active;
  if (a) useAds.setState({ active: { ...a, elapsedMs: ms } });
};

function startTimer(ad: AdCreative) {
  if (timer) clearInterval(timer);
  lastTick = performance.now();
  timer = setInterval(() => {
    const a = useAds.getState().active;
    if (!a) return;
    const now = performance.now();
    const dt = now - lastTick;
    lastTick = now;
    if (a.paused) return;
    const ms = a.elapsedMs + dt;
    if (ms >= ad.duration_s * 1000) {
      send(ad.impression_id, 'complete');
      advance();
    } else setElapsed(ms);
  }, 250);
}

function playAd(index: number) {
  stop();
  const a = useAds.getState().active;
  const ad = a?.ads[index];
  if (!a || !ad) return end();
  useAds.setState({ active: { ...a, index, elapsedMs: 0, paused: false } });
  send(ad.impression_id, 'start');
  if (ad.type === 'audio' && ad.audio_url) {
    const audio = new Audio(media(ad.audio_url));
    el = audio;
    audio.volume = useAds.getState().volume;
    let fell = false;
    const fallback = () => {
      if (fell || el !== audio) return;
      fell = true;
      stop();
      startTimer(ad); // lanjut sebagai kartu bertimer
    };
    audio.ontimeupdate = () => setElapsed(audio.currentTime * 1000);
    audio.onended = () => {
      send(ad.impression_id, 'complete');
      advance();
    };
    audio.onerror = fallback;
    audio.play().catch(fallback);
  } else startTimer(ad);
}

function advance() {
  const a = useAds.getState().active;
  if (!a) return;
  if (a.index + 1 < a.ads.length) playAd(a.index + 1);
  else end();
}

function end() {
  stop();
  useAds.setState({ active: null, busy: false });
  const f = finish;
  finish = null;
  f?.();
}

const eligible = () => {
  const { accessToken, user } = useAuth.getState();
  return !!accessToken && !!user && !user.premium;
};

/** Minta jeda iklan sebelum `next` diputar; resolve setelah iklan selesai (atau segera bila tidak ada). Tidak pernah reject. */
export async function runAdBreak(next: Playable): Promise<void> {
  if (!eligible() || useAds.getState().busy) return;
  useAds.setState({ busy: true });
  let res: AdBreakResponse | null = null;
  try {
    res = await Promise.race([
      api<AdBreakResponse>('/v1/ads/break', {
        body: {
          placement: next.kind === 'episode' ? 'podcast_preroll' : 'between_tracks',
          content: { kind: next.kind, id: next.id, ...(next.premium ? { premium: true } : {}), ...(next.content_warning ? { content_warning: true } : {}) },
        },
      }),
      new Promise<null>((r) => setTimeout(() => r(null), REQUEST_TIMEOUT_MS)),
    ]);
  } catch {
    res = null;
  }
  if (!res?.ads?.length || !eligible()) {
    useAds.setState({ busy: false });
    return;
  }
  const ads = res.ads;
  return new Promise<void>((resolve) => {
    finish = resolve;
    useAds.setState({ active: { ads, index: 0, elapsedMs: 0, paused: false } });
    playAd(0);
  });
}

export function abortAdBreak() {
  if (useAds.getState().active || useAds.getState().busy) end();
}
