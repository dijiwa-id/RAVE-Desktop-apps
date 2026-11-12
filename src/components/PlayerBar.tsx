import { useEffect, useState } from 'react';
import { AlertCircle, Heart, ListMusic, Loader2, MicVocal, PanelRight, Pause, Play, Repeat, Repeat1, RotateCcw, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/fmt';
import { useAuth } from '@/stores/auth';
import { useLikes } from '@/stores/likes';
import { useNav } from '@/stores/nav';
import { usePlayer } from '@/stores/player';
import { useAds } from '@/stores/ads';
import { Cover, cx, IconButton } from '@/components/ui';
import { AdBar } from '@/components/AdBreak';

export type PanelTab = 'now' | 'queue' | 'lyrics';

/** Bilah pemutar bawah (selalu terlihat): lagu, kontrol transport + progres, volume & panel. */
export function PlayerBar({ panel, onPanel }: { panel: PanelTab | null; onPanel: (t: PanelTab | null) => void }) {
  const t = useT();
  const p = usePlayer();
  const ad = useAds((s) => s.active);
  const liked = useLikes((s) => s.liked);
  const toggleLike = useLikes((s) => s.toggle);
  const authed = !!useAuth((s) => s.accessToken);
  const go = useNav((s) => s.go);
  const [drag, setDrag] = useState<number | null>(null);
  useEffect(() => setDrag(null), [p.current?.id]);

  if (ad) return <AdBar />;
  const pos = drag ?? p.positionMs;
  const dur = p.durationMs || p.current?.duration_ms || 0;
  const pct = dur ? Math.min(100, (pos / dur) * 100) : 0;
  const VolIcon = p.muted || p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;
  const cur = p.current;
  const tab = (x: PanelTab) => onPanel(panel === x ? null : x);

  return (
    <footer className="grid h-[84px] shrink-0 grid-cols-[minmax(180px,1fr)_minmax(320px,2fr)_minmax(180px,1fr)] items-center gap-4 px-3" aria-label={t.player.nowPlaying}>
      {/* Lagu */}
      <div className="flex min-w-0 items-center gap-3">
        {cur ? (
          <>
            <button type="button" onClick={() => tab('now')} aria-label={t.player.panel} className="shrink-0">
              <Cover src={cur.image_url} className="size-14 shadow-[0_4px_14px_rgb(0_0_0/0.5)]" />
            </button>
            <div className="min-w-0">
              <button type="button" onClick={() => cur.releaseId && go({ name: 'album', id: cur.releaseId })} className="block max-w-full truncate text-left font-semibold hover:underline">
                {cur.title}
              </button>
              <button type="button" onClick={() => cur.artistKey && go({ name: 'artist', id: cur.artistKey })} className="block max-w-full truncate text-left text-[13px] text-muted hover:text-paper hover:underline">
                {cur.subtitle}
              </button>
            </div>
            {authed && cur.kind === 'track' && (
              <IconButton label={liked.has(cur.id) ? t.common.unlike : t.common.like} active={liked.has(cur.id)} onClick={() => void toggleLike(cur.id)}>
                <Heart className={cx('size-[18px]', liked.has(cur.id) && 'fill-current')} />
              </IconButton>
            )}
          </>
        ) : (
          <p className="label text-subtle">{t.player.nothing}</p>
        )}
      </div>

      {/* Transport */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <IconButton label={t.common.shuffle} active={p.shuffle} onClick={p.toggleShuffle}>
            <Shuffle className="size-[18px]" />
          </IconButton>
          <IconButton label={t.player.prev} onClick={p.prev} disabled={!cur}>
            <SkipBack className="size-5 fill-current" />
          </IconButton>
          <button
            type="button"
            aria-label={p.playing ? t.common.pause : t.common.play}
            title={`${p.playing ? t.common.pause : t.common.play} (Space)`}
            disabled={!cur}
            onClick={p.error ? p.retry : p.toggle}
            className="grid size-10 place-items-center border-2 border-ink bg-paper text-ink shadow-[2px_2px_0_#0b0a0c] transition hover:scale-105 hover:bg-mustard disabled:opacity-40"
          >
            {p.buffering ? <Loader2 className="size-5 animate-spin" /> : p.error ? <RotateCcw className="size-5" /> : p.playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 translate-x-px fill-current" />}
          </button>
          <IconButton label={t.player.next} onClick={p.next} disabled={!cur}>
            <SkipForward className="size-5 fill-current" />
          </IconButton>
          <IconButton label={t.player.repeat} active={p.repeat !== 'off'} onClick={p.cycleRepeat}>
            {p.repeat === 'one' ? <Repeat1 className="size-[18px]" /> : <Repeat className="size-[18px]" />}
          </IconButton>
        </div>
        <div className="flex w-full max-w-[640px] items-center gap-2 text-[11px] text-subtle tabular-nums">
          <span className="w-10 text-right">{fmt.duration(pos)}</span>
          <input
            type="range"
            className="range"
            min={0}
            max={dur || 1}
            step={500}
            value={pos}
            disabled={!cur}
            aria-label="Posisi"
            aria-valuetext={`${fmt.duration(pos)} / ${fmt.duration(dur)}`}
            style={{ '--pct': `${pct}%` } as React.CSSProperties}
            onChange={(e) => setDrag(Number(e.target.value))}
            onPointerUp={() => {
              if (drag != null) p.seek(drag);
              setDrag(null);
            }}
            onKeyUp={() => {
              if (drag != null) p.seek(drag);
              setDrag(null);
            }}
          />
          <span className="w-10">{fmt.duration(dur)}</span>
        </div>
        {p.error && (
          <p className="flex items-center gap-1.5 text-[11px] text-mustard" role="alert">
            <AlertCircle className="size-3.5" /> {p.error}
          </p>
        )}
      </div>

      {/* Kanan */}
      <div className="flex items-center justify-end gap-1">
        {p.session && <span className="label mr-1 hidden border border-line px-1.5 py-0.5 text-[9px] text-muted xl:inline">{p.session.codec_label}</span>}
        <IconButton label={t.player.lyrics} active={panel === 'lyrics'} onClick={() => tab('lyrics')} disabled={!cur}>
          <MicVocal className="size-[18px]" />
        </IconButton>
        <IconButton label={t.player.queue} active={panel === 'queue'} onClick={() => tab('queue')}>
          <ListMusic className="size-[18px]" />
        </IconButton>
        <IconButton label={t.player.panel} active={panel === 'now'} onClick={() => tab('now')}>
          <PanelRight className="size-[18px]" />
        </IconButton>
        <IconButton label={p.muted ? t.player.unmute : t.player.mute} onClick={p.toggleMute}>
          <VolIcon className="size-[18px]" />
        </IconButton>
        <input
          type="range"
          className="range w-24"
          min={0}
          max={1}
          step={0.01}
          value={p.muted ? 0 : p.volume}
          aria-label={t.player.volume}
          style={{ '--pct': `${(p.muted ? 0 : p.volume) * 100}%` } as React.CSSProperties}
          onChange={(e) => p.setVolume(Number(e.target.value))}
        />
      </div>
    </footer>
  );
}
