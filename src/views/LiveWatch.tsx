import type { ReactNode } from 'react';
import { CalendarClock, Globe, Lock, Radio, Ticket } from 'lucide-react';
import { media } from '@/lib/api';
import { fmt } from '@/lib/fmt';
import { useT } from '@/lib/i18n';
import { openExternal } from '@/lib/native';
import { useApi, usePolling } from '@/lib/query';
import type { LiveStreamDetail } from '@/lib/types';
import { useNav } from '@/stores/nav';
import { useSettings } from '@/stores/settings';
import { useUi } from '@/stores/ui';
import { Loadable } from '@/components/ui';
import { Countdown, dateTime, isOnAir, LiveChat, LivePill, LivePlayer, liveImage, useLiveEnabled } from '@/components/live';
import { usePlatform } from '@/lib/platform';

/** Kartu pengganti pemutar (akses ditolak / belum mulai / selesai). */
function Gate({ s, children }: { s: LiveStreamDetail; children: ReactNode }) {
  const img = media(liveImage(s));
  return (
    <div className="relative grid aspect-video w-full place-items-center overflow-hidden bg-black">
      {img && <img src={img} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-xl" />}
      <div className="relative flex max-w-md flex-col items-center gap-3 p-6 text-center">{children}</div>
    </div>
  );
}

/** Tonton live: pemutar + info + chat (setara web /app/live/:id). Status & akses dipoll tiap 10 dtk. */
export default function LiveWatch({ id }: { id: string }) {
  const t = useT();
  const go = useNav((n) => n.go);
  const server = useSettings((n) => n.server);
  const enabled = useLiveEnabled();
  const chatOn = usePlatform()('live.chat_enabled', true);
  const key = `/v1/live/streams/${id}`;
  const q = useApi<LiveStreamDetail>(key);
  usePolling(key, 10_000);
  const s = q.data;
  const eventKey = s?.event?.slug ?? s?.event?.id;
  const openEvent = () => eventKey && void openExternal(`${server}/app/events/${encodeURIComponent(eventKey)}`);

  let stage: ReactNode = null;
  if (s) {
    if (s.status === 'ENDED')
      stage = (
        <Gate s={s}>
          <p className="label text-paper/60">{t.live.ended}</p>
          <p className="display text-[32px] leading-none">{s.title}</p>
          <p className="text-sm text-paper/70">
            {s.ended_at && `${dateTime(s.ended_at)} · `}
            {t.live.peak(fmt.num(s.peak_viewers))}
          </p>
          <button type="button" onClick={() => go({ name: 'live' })} className="btn-primary mt-2">
            {t.live.seeOther}
          </button>
        </Gate>
      );
    else if (!s.can_watch && s.access_reason === 'login_required')
      stage = (
        <Gate s={s}>
          <Lock className="size-8" />
          <p className="text-lg font-bold">{t.live.signInToWatch}</p>
          <p className="text-sm text-paper/70">{t.live.requiresAccount}</p>
          <button type="button" onClick={() => useUi.getState().openAuth()} className="btn-primary">
            {t.guest.cta}
          </button>
        </Gate>
      );
    else if (!s.can_watch && s.access_reason === 'ticket_required')
      stage = (
        <Gate s={s}>
          <Ticket className="size-8" />
          <p className="text-lg font-bold">{t.live.ticketHolders}</p>
          <p className="text-sm text-paper/70">{s.event ? t.live.partOfEvent(s.event.title) : t.live.requiresTicket}</p>
          {eventKey && (
            <button type="button" onClick={openEvent} className="btn-primary inline-flex items-center gap-2">
              <Ticket className="size-4" /> {t.live.buyTicket}
            </button>
          )}
        </Gate>
      );
    else if (s.status === 'SCHEDULED')
      stage = (
        <Gate s={s}>
          <CalendarClock className="size-8" />
          <p className="text-lg font-bold">{t.live.notStarted}</p>
          {s.scheduled_at ? (
            <>
              <p className="text-sm text-paper/70">{t.live.scheduled(dateTime(s.scheduled_at))}</p>
              <Countdown until={s.scheduled_at} className="text-3xl font-bold" />
            </>
          ) : (
            <p className="text-sm text-paper/70">{t.live.startingSoon}</p>
          )}
          <p className="text-xs text-paper/50">{t.live.autoPlay}</p>
        </Gate>
      );
    else stage = <LivePlayer streamId={s.id} status={s.status} />;
  }

  const showChat = !!s && enabled && chatOn && s.chat_enabled && s.can_watch;

  return (
    <Loadable loading={q.loading} error={q.error} onRetry={q.reload}>
      {s && (
        <div className="grid gap-6 px-6 pt-2 pb-10 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {stage}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {isOnAir(s.status) && <LivePill viewers={s.viewers} interrupted={s.status === 'INTERRUPTED'} />}
              {s.access === 'TICKET' ? (
                <span className="label inline-flex items-center gap-1 bg-berry/30 px-2 py-0.5 !text-[11px] text-paper">
                  <Ticket className="size-3" /> {t.live.ticketHolders}
                </span>
              ) : (
                <span className="label inline-flex items-center gap-1 bg-paper/10 px-2 py-0.5 !text-[11px] text-paper/80">
                  <Globe className="size-3" /> {t.live.free}
                </span>
              )}
              {s.started_at && isOnAir(s.status) && <span className="text-xs text-muted">{t.live.started(dateTime(s.started_at))}</span>}
            </div>
            <h1 className="display mt-3 text-[40px] leading-none">{s.title}</h1>
            <p className="mt-2 text-sm text-muted">
              {s.artist && (
                <button type="button" onClick={() => go({ name: 'artist', id: s.artist!.slug })} className="font-bold text-paper hover:underline">
                  {s.artist.name}
                </button>
              )}
              {s.org.name !== s.artist?.name && (
                <>
                  {s.artist && ' · '}
                  {s.org.name}
                </>
              )}
            </p>
            {s.event && (
              <button type="button" onClick={openEvent} title={t.home.ticketsOnWeb} className="mt-3 inline-flex items-center gap-2 bg-raised px-3 py-2 text-left text-sm hover:bg-hover">
                <Radio className="size-4 text-berry" />
                <span>
                  <span className="font-bold">{s.event.title}</span> · {s.event.city}, {fmt.date(s.event.starts_at)}
                </span>
              </button>
            )}
            {s.description && <p className="mt-4 max-w-3xl text-sm leading-relaxed whitespace-pre-line text-muted">{s.description}</p>}
          </div>
          {showChat && <LiveChat streamId={s.id} ended={s.status === 'ENDED'} className="h-[480px] xl:sticky xl:top-20 xl:h-[calc(100vh-15rem)]" />}
        </div>
      )}
    </Loadable>
  );
}
