// Jembatan ke fitur native Tauri. Semua fungsi aman dipanggil di browser biasa (mode `npm run dev`) — plugin
// dimuat dinamis hanya bila berjalan di dalam Tauri, sehingga UI tetap bisa dikembangkan & diuji di browser.

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Buka tautan di browser bawaan OS (bukan di dalam jendela aplikasi). */
export async function openExternal(url: string) {
  if (!/^https?:\/\//i.test(url)) return;
  if (isTauri) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else window.open(url, '_blank', 'noopener,noreferrer');
}

const MEDIA_KEYS = ['MediaPlayPause', 'MediaTrackNext', 'MediaTrackPrevious'] as const;
type MediaKey = (typeof MEDIA_KEYS)[number];

/**
 * Tombol media keyboard global (berfungsi walau jendela tidak fokus). Mengembalikan fungsi pelepas.
 * Gagal didaftarkan (mis. dipegang aplikasi lain) → diam saja; MediaSession tetap menjadi jalur cadangan.
 */
export async function registerMediaKeys(handler: (k: MediaKey) => void): Promise<() => void> {
  if (!isTauri) return () => {};
  try {
    const gs = await import('@tauri-apps/plugin-global-shortcut');
    await gs.register([...MEDIA_KEYS], (e) => {
      if (e.state === 'Pressed') handler(e.shortcut as MediaKey);
    });
    return () => void gs.unregister([...MEDIA_KEYS]).catch(() => {});
  } catch {
    return () => {};
  }
}

/** Info lagu & kontrol untuk overlay media OS (Windows SMTC / macOS Now Playing) lewat MediaSession API. */
export function setMediaSession(
  meta: { title: string; artist: string; artwork?: string } | null,
  handlers: { play: () => void; pause: () => void; next: () => void; prev: () => void; seek: (ms: number) => void },
) {
  const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
  if (!ms) return;
  ms.metadata = meta ? new MediaMetadata({ title: meta.title, artist: meta.artist, album: 'RAVE', artwork: meta.artwork ? [{ src: meta.artwork, sizes: '640x640' }] : [] }) : null;
  const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
    try {
      ms.setActionHandler(a, h);
    } catch {
      /* aksi tidak didukung WebView ini */
    }
  };
  set('play', handlers.play);
  set('pause', handlers.pause);
  set('nexttrack', handlers.next);
  set('previoustrack', handlers.prev);
  set('seekto', (d) => d.seekTime != null && handlers.seek(d.seekTime * 1000));
}
