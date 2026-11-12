import { useState } from 'react';
import { ArrowLeft, Server } from 'lucide-react';
import logo from '@/assets/rave-logo.webp';
import { api, errorText } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { TokenResponse } from '@/lib/types';
import { useAuth } from '@/stores/auth';
import { normalizeServer, useSettings } from '@/stores/settings';
import { clearCache } from '@/lib/query';
import { cx } from '@/components/ui';

/** Masuk dengan OTP email (IAM RAVE hanya OTP — tanpa kata sandi). */
export default function Login() {
  const t = useT();
  const { server, setServer, locale, setLocale } = useSettings();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dev, setDev] = useState<string | null>(null);
  const [editServer, setEditServer] = useState(false);
  const [srv, setSrv] = useState(server);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ dev_code?: string }>('/v1/auth/otp', { body: { destination: email.trim(), channel: 'email' }, auth: false });
      setDev(r.dev_code ?? null);
      setStep('code');
    } catch (x) {
      setErr(errorText(x, t.common.offline));
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<TokenResponse>('/v1/auth/token', { body: { grant_type: 'otp', destination: email.trim(), code: code.trim() }, auth: false });
      clearCache();
      useAuth.getState().setSession(r);
      if (r.user.locale) setLocale(r.user.locale);
    } catch (x) {
      setErr(errorText(x, t.common.offline));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grain grid h-full grid-cols-1 bg-canvas lg:grid-cols-[1.1fr_1fr]">
      {/* Poster merek */}
      <div className="relative hidden overflow-hidden bg-purple p-12 lg:flex lg:flex-col lg:justify-between">
        <img src={logo} alt="RAVE" className="h-10 w-auto self-start" />
        <div className="groove absolute -right-40 -bottom-40 size-[520px] opacity-90" aria-hidden />
        <div className="relative">
          <p className="label sticker mb-6 bg-mustard px-2 py-1 text-ink [--r:-4deg]">DIY · Indie · Live</p>
          <h1 className="display max-w-xl text-[92px]">{t.login.tagline}</h1>
        </div>
        <p className="label relative text-paper/60">RV-DESKTOP · © 2026 RAVE · dijiwa.id</p>
      </div>

      {/* Formulir */}
      <div className="flex flex-col justify-center px-8 py-10 sm:px-16">
        <img src={logo} alt="RAVE" className="mb-10 h-9 w-auto self-start lg:hidden" />
        <h2 className="display text-[56px]">{t.login.title}</h2>

        {step === 'email' ? (
          <form onSubmit={sendCode} className="mt-8 max-w-sm space-y-4">
            <label className="block">
              <span className="label mb-2 block text-muted">{t.login.email}</span>
              <input className="field" type="email" required autoFocus autoComplete="email" placeholder={t.login.emailPh} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" className="btn-primary w-full" disabled={busy || !email.includes('@')}>
              {busy ? '…' : t.login.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-8 max-w-sm space-y-4">
            <p className="text-sm text-muted">{t.login.codeSent(email)}</p>
            {dev && <p className="label text-mustard">{t.login.devCode(dev)}</p>}
            <label className="block">
              <span className="label mb-2 block text-muted">{t.login.code}</span>
              <input
                className="field text-center font-mono text-2xl tracking-[0.5em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <button type="submit" className="btn-primary w-full" disabled={busy || code.length !== 6}>
              {busy ? '…' : t.login.verify}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" className="inline-flex items-center gap-1 text-muted hover:text-paper" onClick={() => (setStep('email'), setCode(''), setErr(null))}>
                <ArrowLeft className="size-4" /> {t.login.change}
              </button>
              <button type="button" className="text-muted hover:text-paper" disabled={busy} onClick={() => void sendCode()}>
                {t.login.resend}
              </button>
            </div>
          </form>
        )}
        {err && (
          <p role="alert" className="mt-4 max-w-sm border-l-4 border-berry bg-berry/15 px-3 py-2 text-sm">
            {err}
          </p>
        )}

        <div className="mt-12 max-w-sm border-t border-dashed border-line pt-4 text-sm">
          {editServer ? (
            <div className="flex gap-2">
              <input className="field font-mono text-xs" value={srv} onChange={(e) => setSrv(e.target.value)} aria-label={t.login.server} spellCheck={false} />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  const u = normalizeServer(srv);
                  if (!u) return setErr(t.settings.serverInvalid);
                  setServer(u);
                  clearCache();
                  setEditServer(false);
                  setErr(null);
                }}
              >
                OK
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditServer(true)} className="inline-flex items-center gap-2 text-subtle hover:text-paper">
              <Server className="size-4" /> {t.login.server}: <span className="font-mono">{server.replace(/^https?:\/\//, '')}</span>
            </button>
          )}
          <div className="mt-3 flex gap-3">
            {(['id', 'en'] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLocale(l)} className={cx('label', locale === l ? 'text-mustard' : 'text-subtle hover:text-paper')}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
