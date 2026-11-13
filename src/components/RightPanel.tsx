import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useApi } from '@/lib/query';
import type { Lyrics } from '@/lib/types';
import { useNav } from '@/stores/nav';
import { usePlayer } from '@/stores/player';
import { Cover, cx, Spinner } from '@/components/ui';
import type { PanelTab } from '@/components/PlayerBar';

/** Panel kanan: Sedang diputar · Antrean · Lirik tersinkron. */
export function RightPanel({ tab, onTab, onClose }: { tab: PanelTab; onTab: (t: PanelTab) => void; onClose: () => void }) {
  const t = useT();
  const tabs: [PanelTab, string][] = [
    ['now', t.player.nowPlaying],
    ['queue', t.player.queue],
    ['lyrics', t.player.lyrics],
  ];
  return (
    <aside className="panel flex min-h-0 w-[340px] shrink-0 flex-col" aria-label={t.player.panel}>
      <div className="flex items-center gap-1 border-b border-line px-2 pt-2" role="tablist">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => onTab(k)}
            className={cx('label px-3 py-2.5 transition-colors', tab === k ? 'text-paper shadow-[inset_0_-3px_0_var(--color-mustard)]' : 'text-subtle hover:text-paper')}
          >
            {label}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" aria-label={t.login.close} title={t.login.close} onClick={onClose} className="grid size-8 place-items-center text-muted hover:text-paper">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{tab === 'now' ? <NowPlaying /> : tab === 'queue' ? <Queue /> : <LyricsView />}</div>
    </aside>
  );
}

function NowPlaying() {
  const t = useT();
  const cur = usePlayer((s) => s.current);
  const go = useNav((s) => s.go);
  if (!cur) return <p className="p-6 text-sm text-muted">{t.player.nothing}</p>;
  return (
    <div className="grain p-5">
      <Cover src={cur.image_url} className="aspect-square w-full shadow-[0_12px_36px_rgb(0_0_0/0.55)]" />
      <h2 className="display mt-5 text-[34px] break-words">{cur.title}</h2>
      <button type="button" onClick={() => cur.artistKey && go({ name: 'artist', id: cur.artistKey })} className="mt-1 text-muted hover:text-paper hover:underline">
        {cur.subtitle}
      </button>
      <div className="mt-5 flex flex-wrap gap-2">
        {cur.artistKey && (
          <button type="button" className="btn-ghost" onClick={() => go({ name: 'artist', id: cur.artistKey! })}>
            {t.common.goArtist}
          </button>
        )}
        {cur.releaseId && (
          <button type="button" className="btn-ghost" onClick={() => go({ name: 'album', id: cur.releaseId! })}>
            {t.common.goAlbum}
          </button>
        )}
      </div>
    </div>
  );
}

function Queue() {
  const t = useT();
  const { queue, index, jump, current } = usePlayer();
  const upcoming = queue.slice(index + 1);
  return (
    <div className="p-4">
      {current && (
        <>
          <p className="label mb-2 text-subtle">{t.player.nowPlaying}</p>
          <QueueRow title={current.title} subtitle={current.subtitle} image={current.image_url} active />
        </>
      )}
      <p className="label mt-5 mb-2 text-subtle">{t.player.nextUp}</p>
      {upcoming.length ? upcoming.map((q, i) => <QueueRow key={q.id + i} title={q.title} subtitle={q.subtitle} image={q.image_url} onClick={() => jump(index + 1 + i)} />) : <p className="text-sm text-muted">{t.player.noQueue}</p>}
    </div>
  );
}

function QueueRow({ title, subtitle, image, active, onClick }: { title: string; subtitle: string; image: string | null; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className="flex w-full items-center gap-3 p-2 text-left hover:bg-raised disabled:hover:bg-transparent">
      <Cover src={image} className="size-10" />
      <span className="min-w-0">
        <span className={cx('block truncate font-semibold', active && 'text-mustard')}>{title}</span>
        <span className="block truncate text-[13px] text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

function LyricsView() {
  const t = useT();
  const cur = usePlayer((s) => s.current);
  const seek = usePlayer((s) => s.seek);
  const q = useApi<Lyrics>(cur?.kind === 'track' ? `/v1/catalog/tracks/${cur.id}/lyrics` : null);
  const pos = usePlayer((s) => s.positionMs);
  const lines = q.data?.lines ?? [];
  const synced = !!q.data?.synced;
  const active = useMemo(() => {
    if (!synced) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) if (lines[i].time_ms <= pos + 150) idx = i;
    return idx;
  }, [lines, synced, pos]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  if (!cur) return <p className="p-6 text-sm text-muted">{t.player.nothing}</p>;
  if (q.loading) return <div className="grid place-items-center py-16"><Spinner /></div>;
  if (!lines.length) return <p className="p-6 text-sm text-muted">{t.player.noLyrics}</p>;
  return (
    <div ref={box} className="selectable bg-gradient-to-b from-purple/40 to-transparent px-6 py-8">
      {lines.map((l, i) => (
        <p
          key={i}
          data-i={i}
          onClick={() => synced && seek(l.time_ms)}
          className={cx(
            'my-3 text-[22px] leading-snug font-extrabold transition-colors',
            !synced ? 'text-paper' : i === active ? 'text-mustard' : i < active ? 'text-paper/45' : 'text-paper/80',
            synced && 'cursor-pointer hover:text-paper',
            !l.text && 'h-4',
          )}
        >
          {l.text}
        </p>
      ))}
    </div>
  );
}
