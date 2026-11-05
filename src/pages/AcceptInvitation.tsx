import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import { LangToggle } from '../components/Shell';
import { ErrorLine } from '../components/ui';
import { useLang } from '../i18n/LangProvider';
import { hrefs } from '../router';

/**
 * Accept an invitation (public): the person sets a password, adds an authenticator app and chooses a language. The invitation token in
 * the link is the credential. The authenticator key comes from the API; the person types the first code to prove the app works.
 */
export function AcceptInvitation({ token }: { token: string | null }) {
  const { t, lang, setLang } = useLang();
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
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

  const mismatch = again.length > 0 && password !== again;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || !secret) return;
    setBusy(true);
    setError(null);
    try {
      await api('/api/invitations/accept', { method: 'POST', body: { token, password, language: lang, totpSecret: secret, totpCode: code.trim() } });
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
            <h1 className="display">{t('acc.done.title')}</h1>
            <p className="m-0">{t('acc.done.text')}</p>
            <a className="zr-btn primary self-start" href={hrefs.signIn()}>{t('signin.title')}</a>
          </section>
        ) : !token ? (
          <section className="card"><p className="m-0">{t('acc.missing')}</p></section>
        ) : (
          <form onSubmit={submit} noValidate className="card flex flex-col gap-4">
            <div>
              <h1 className="display">{t('acc.title')}</h1>
              <p className="muted m-0">{t('acc.intro')}</p>
            </div>
            <div className="zr-field">
              <label htmlFor="pw">{t('acc.passwordLabel')}</label>
              <input id="pw" type="password" dir="ltr" autoComplete="new-password" className="zr-in" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="zr-field">
              <label htmlFor="pw2">{t('acc.confirm')}</label>
              <input id="pw2" type="password" dir="ltr" autoComplete="new-password" className="zr-in" value={again} onChange={(e) => setAgain(e.target.value)} />
              {mismatch ? <span className="zr-err">{t('acc.mismatch')}</span> : null}
            </div>
            <div className="zr-field">
              <label htmlFor="lng">{t('acc.language')}</label>
              <select id="lng" className="zr-in" value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'ar')}>
                <option value="en">{t('fmr.lang.en')}</option>
                <option value="ar">{t('fmr.lang.ar')}</option>
              </select>
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
                <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" className="zr-in !w-40 tracking-widest" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              </div>
            </fieldset>

            {error ? <ErrorLine error={error} /> : null}
            <button type="submit" className="zr-btn primary self-start" disabled={busy || !password || password !== again || code.length !== 6 || !secret}>
              {busy ? t('acc.creating') : t('acc.create')}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
