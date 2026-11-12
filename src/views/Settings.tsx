import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { logout } from '@/lib/session';
import { clearCache } from '@/lib/query';
import { useAuth } from '@/stores/auth';
import { normalizeServer, useSettings, type Quality } from '@/stores/settings';
import { toast } from '@/stores/toast';
import { cx } from '@/components/ui';

const APP_VERSION = '0.1.0';

export default function Settings() {
  const t = useT();
  const s = useSettings();
  const user = useAuth((x) => x.user);
  const [server, setServer] = useState(s.server);
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);

  async function testServer(url = server) {
    const u = normalizeServer(url);
    if (!u) return setTest({ ok: false, text: t.settings.serverInvalid });
    try {
      const r = await fetch(`${u}/v1/version`, { signal: AbortSignal.timeout(5000) });
      const v = (await r.json()) as { version?: string };
      setTest({ ok: r.ok, text: r.ok ? t.settings.testOk(v.version ?? '?') : `HTTP ${r.status}` });
    } catch {
      setTest({ ok: false, text: t.common.offline });
    }
  }
  async function saveServer() {
    const u = normalizeServer(server);
    if (!u) return setTest({ ok: false, text: t.settings.serverInvalid });
    if (u === s.server) return;
    // Server lain = akun & data lain → keluar dulu agar token tidak terkirim ke server yang salah.
    if (user) await logout();
    s.setServer(u);
    clearCache();
    setServer(u);
    toast.success(t.settings.serverSaved);
  }

  return (
    <div className="max-w-3xl px-6 pt-2 pb-16">
      <h1 className="display text-[56px]">{t.settings.title}</h1>

      <Section title={t.settings.account}>
        {user ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">{t.settings.signedAs(user.display_name)}</p>
              <p className="text-sm text-muted">
                {user.email} · {user.premium ? t.settings.premium : t.settings.free}
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => void logout()}>
              {t.settings.logout}
            </button>
          </div>
        ) : null}
      </Section>

      <Section title={t.settings.server} hint={t.settings.serverHint}>
        <div className="flex flex-wrap gap-2">
          <input className="field max-w-md font-mono" value={server} onChange={(e) => setServer(e.target.value)} spellCheck={false} aria-label={t.settings.server} />
          <button type="button" className="btn-ghost" onClick={() => void testServer()}>
            {t.settings.test}
          </button>
          <button type="button" className="btn-primary" disabled={server === s.server} onClick={() => void saveServer()}>
            OK
          </button>
        </div>
        {test && <p className={cx('mt-2 text-sm', test.ok ? 'text-mustard' : 'text-berry')}>{test.text}</p>}
      </Section>

      <Section title={t.settings.language}>
        <div className="flex gap-2">
          {(['id', 'en'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={s.locale === l} onClick={() => s.setLocale(l)} className={cx('label px-4 py-2', s.locale === l ? 'bg-paper text-ink' : 'bg-raised hover:bg-hover')}>
              {l === 'id' ? 'Bahasa Indonesia' : 'English'}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.settings.quality} hint={t.settings.qualityHint}>
        <select className="field max-w-xs" value={s.quality} onChange={(e) => s.setQuality(e.target.value as Quality)} aria-label={t.settings.quality}>
          {(['auto', 'low', 'normal', 'high', 'lossless'] as const).map((q) => (
            <option key={q} value={q} disabled={!user?.premium && (q === 'high' || q === 'lossless')}>
              {t.settings.q[q]}
              {!user?.premium && (q === 'high' || q === 'lossless') ? ` — ${t.common.premium}` : ''}
            </option>
          ))}
        </select>
      </Section>

      <Section title={t.settings.mediaKeys} hint={t.settings.mediaKeysHint}>
        <label className="flex items-center gap-3 font-semibold">
          <input type="checkbox" className="size-4 accent-[var(--color-mustard)]" checked={s.mediaKeys} onChange={(e) => s.setMediaKeys(e.target.checked)} />
          {t.settings.mediaKeys}
        </label>
      </Section>

      <Section title={t.settings.shortcuts}>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          {t.settings.keys.map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="label border border-line bg-raised px-2 py-1">{k}</kbd>
              </dt>
              <dd className="self-center text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={t.settings.about}>
        <p className="text-sm text-muted">
          {t.settings.version(APP_VERSION)} · © 2026 RAVE · dijiwa.id
        </p>
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-dashed border-line pt-6">
      <h2 className="label text-mustard">{title}</h2>
      {hint && <p className="mt-1 mb-3 text-sm text-muted">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}
