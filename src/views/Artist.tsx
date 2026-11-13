import { useEffect, useState } from 'react';
import { BadgeCheck, ExternalLink, MapPin } from 'lucide-react';
import { api, media } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/fmt';
import { useApi } from '@/lib/query';
import { openExternal } from '@/lib/native';
import type { Artist as ArtistData } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { trackToPlayable, usePlayer } from '@/stores/player';
import { toast } from '@/stores/toast';
import { Loadable, PlayButton } from '@/components/ui';
import { useUi } from '@/stores/ui';
import { MediaCard, Shelf, TrackList } from '@/components/media';

export default function Artist({ id }: { id: string }) {
  const t = useT();
  const q = useApi<ArtistData>(`/v1/catalog/artists/${encodeURIComponent(id)}`);
  const a = q.data;
  const authed = !!useAuth((s) => s.accessToken);
  const { current, playing, playQueue, toggle } = usePlayer();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    setFollowing(null);
    if (!authed || !a) return;
    api<{ following: boolean }>(`/v1/library/follows/${a.id}`)
      .then((r) => setFollowing(r.following))
      .catch(() => {});
  }, [authed, a?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function follow() {
    if (!a || following == null) return;
    const was = following;
    setFollowing(!was);
    try {
      await api(`/v1/library/follows/${a.id}`, { method: was ? 'DELETE' : 'PUT' });
    } catch (e) {
      setFollowing(was);
      toast.error((e as Error).message);
    }
  }

  const inThis = !!a && !!current && a.top_tracks.some((x) => x.id === current.id);
  const banner = media(a?.cover_url ?? a?.image_url);

  return (
    <Loadable loading={q.loading} error={q.error} onRetry={q.reload}>
      {a && (
        <div className="pb-10">
          <header className="grain relative -mt-16 flex h-[360px] items-end overflow-hidden bg-purple px-6 pb-6">
            {banner && <img src={banner} alt="" className="absolute inset-0 size-full object-cover grayscale contrast-125" />}
            <span className="absolute inset-0 bg-purple mix-blend-multiply" aria-hidden />
            <span className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/30 to-transparent" aria-hidden />
            <div className="relative min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {a.verified && (
                  <span className="label sticker bg-paper px-2 py-0.5 text-ink">
                    <BadgeCheck className="size-3.5" /> {t.common.verified}
                  </span>
                )}
                {a.city && (
                  <span className="label inline-flex items-center gap-1 border border-dashed border-paper/70 px-2 py-0.5 [rotate:2deg]">
                    <MapPin className="size-3" /> {a.city}
                  </span>
                )}
                {a.genres.slice(0, 3).map((g) => (
                  <span key={g} className="label border-2 border-ink bg-mustard px-1.5 py-px text-[10px] text-ink shadow-[2px_2px_0_#0b0a0c]">
                    {g}
                  </span>
                ))}
              </div>
              <h1 className="display text-[clamp(56px,8vw,112px)]">{a.name}</h1>
              <p className="mt-2 text-sm text-paper/85">
                {t.common.listeners(fmt.num(a.monthly_listeners))} · {t.common.followers(fmt.compact(a.followers))}
              </p>
            </div>
          </header>

          <div className="flex items-center gap-5 px-6 py-5">
            <PlayButton size="lg" label={t.common.play} playing={inThis && playing} onClick={() => (inThis ? toggle() : void playQueue(a.top_tracks.map(trackToPlayable)))} />
            {!authed && (
              <button type="button" onClick={() => useUi.getState().openAuth()} className="btn-ghost">
                {t.common.follow}
              </button>
            )}
            {authed && following != null && (
              <button type="button" onClick={() => void follow()} aria-pressed={following} className="btn-ghost">
                {following ? t.common.following : t.common.follow}
              </button>
            )}
            {a.links?.map((l) => (
              <button key={l.url} type="button" title={l.platform} onClick={() => void openExternal(l.url)} className="label inline-flex items-center gap-1 text-muted hover:text-paper">
                {l.platform.replace('_', ' ')} <ExternalLink className="size-3" />
              </button>
            ))}
          </div>

          {a.top_tracks.length > 0 && (
            <section>
              <h2 className="display mb-3 px-6 text-[28px]">{t.artist.popular}</h2>
              <TrackList tracks={more ? a.top_tracks : a.top_tracks.slice(0, 5)} showAlbum={false} numbered={false} context={t.artist.popular} />
              {a.top_tracks.length > 5 && (
                <button type="button" onClick={() => setMore((v) => !v)} className="label mt-3 px-10 text-muted hover:text-paper">
                  {more ? '−' : '+'} {t.common.seeAll}
                </button>
              )}
            </section>
          )}

          {a.releases.length > 0 && (
            <Shelf title={t.artist.discography}>
              {a.releases.map((r) => (
                <MediaCard key={r.id} item={{ id: r.id, kind: 'release', title: r.title, subtitle: '', image_url: r.cover_url, href: `/app/album/${r.id}` }} subtitle={`${fmt.year(r.release_date)} · ${t.kinds[r.type]}`} />
              ))}
            </Shelf>
          )}

          {a.bio && (
            <section className="mt-10 px-6">
              <h2 className="display mb-3 text-[28px]">{t.artist.about}</h2>
              <p className="selectable max-w-3xl leading-relaxed whitespace-pre-line text-paper/85">{a.bio}</p>
            </section>
          )}
        </div>
      )}
    </Loadable>
  );
}
