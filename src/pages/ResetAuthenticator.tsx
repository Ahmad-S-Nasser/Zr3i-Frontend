import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import { LangToggle } from '../components/Shell';
import { ErrorLine } from '../components/ui';
import { useLang } from '../i18n/LangProvider';
import { hrefs } from '../router';

/**
 * Re-enrol an authenticator (public): an administrator reset it, so the person opens the one-time link, proves who they are with their
 * password and types the first code from the new authenticator. The link is the credential.
 */
export function ResetAuthenticator({ token }: { token: string | null }) {
  const { t } = useLang();
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<{ secret: string; otpauthUri: string }>('/api/auth/totp-secret?label=Zr3i')
      .then((r) => {
        setSecret(r.secret);
        setOtpauth(r.otpauthUri);
      })
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError(0, 'network')));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || !secret) return;
    setBusy(true);
    setError(null);
    try {
      await api('/api/authenticator-reset', { method: 'POST', body: { token, password, totpSecret: secret, totpCode: code.trim() } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ground">
      <header className="flex items-center justify-between bg-zr-field px-6 py-3">
        <span dir="ltr" className="font-display text-2xl font-black text-zr-sage">{t('brand.wordmark')}</span>
        <LangToggle />
      </header>
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-8">
        {done ? (
          <section className="card flex flex-col gap-3" role="status">
            <h1 className="display">{t('rst.done.title')}</h1>
            <p className="m-0">{t('rst.done.text')}</p>
            <a className="zr-btn primary self-start" href={hrefs.signIn()}>{t('signin.title')}</a>
          </section>
        ) : !token ? (
          <section className="card"><p className="m-0">{t('rst.missing')}</p></section>
        ) : (
          <form onSubmit={submit} noValidate className="card flex flex-col gap-4">
            <div>
              <h1 className="display">{t('rst.title')}</h1>
              <p className="muted m-0">{t('rst.intro')}</p>
            </div>
            <div className="zr-field">
              <label htmlFor="pw">{t('rst.password')}</label>
              <input id="pw" type="password" dir="ltr" autoComplete="current-password" className="zr-in" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1 font-semibold">{t('acc.auth.title')}</legend>
              <p className="muted m-0 text-sm">{t('acc.auth.text')}</p>
              {secret ? (
                <div className="banner neutral">
                  <div>
                    <b>{t('acc.auth.key')}</b>
                    <div className="mt-1 break-all font-mono text-sm" dir="ltr">{secret}</div>
                    {otpauth ? <a className="text-link text-sm underline" href={otpauth}>otpauth</a> : null}
                  </div>
                </div>
              ) : null}
              <div className="zr-field">
                <label htmlFor="otp">{t('acc.auth.code')}</label>
                <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" className="zr-in !w-40 tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
            </fieldset>
            {error ? <ErrorLine error={error} /> : null}
            <button type="submit" className="zr-btn primary self-start" disabled={busy || !password || code.length !== 6 || !secret}>
              {busy ? t('rst.saving') : t('rst.submit')}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
