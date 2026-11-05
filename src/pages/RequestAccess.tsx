import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import type { SelfSignupType } from '../api/types';
import { LangToggle } from '../components/Shell';
import { ErrorLine } from '../components/ui';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';
import { go, hrefs } from '../router';

/** Request access (public): pick an account type, give the fields that type needs, and wait for a Zr3i administrator's invitation. */
export function RequestAccess() {
  const { t, lang } = useLang();
  const [types, setTypes] = useState<SelfSignupType[]>([]);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [type, setType] = useState('company');
  const [org, setOrg] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<SelfSignupType[]>('/api/account-types').then(setTypes).catch((e) => setLoadError(e instanceof ApiError ? e : new ApiError(0, 'network')));
  }, []);

  const current = types.find((x) => x.key === type);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/access-requests', {
        method: 'POST',
        body: { accountType: type, organisationName: org.trim(), contactName: contact.trim(), email: email.trim(), purpose: purpose.trim(), language: lang, fields },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  const ready = org.trim() && contact.trim() && email.trim() && purpose.trim() && confirm && (current?.signupFields ?? []).every((f) => !f.required || (fields[f.key] ?? '').trim());

  return (
    <div className="-m-4 min-h-screen bg-ground">
      <header className="flex items-center justify-between bg-zr-field px-6 py-3 text-zr-mist">
        <span className="flex items-baseline gap-3">
          <span dir="ltr" className="font-display text-2xl font-black text-zr-sage">{t('brand.wordmark')}</span>
          <span className="text-xs font-bold text-zr-amber">{t('brand.endorsement')}</span>
        </span>
        <span className="flex items-center gap-3">
          <a className="zr-btn" href={hrefs.signIn()}>{t('signin.title')}</a>
          <LangToggle />
        </span>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        {done ? (
          <section className="card lg:col-span-2" role="status">
            <h1 className="display">{t('req.done.title')}</h1>
            <p>{t('req.done.text')}</p>
            <a className="zr-btn" href={hrefs.signIn()}>{t('req.back')}</a>
          </section>
        ) : (
          <>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <div>
                <p className="eyebrow m-0">{t('req.eyebrow')}</p>
                <h1 className="display">{t('req.title')}</h1>
                <p className="muted m-0">{t('req.intro')}</p>
              </div>
              {loadError ? <ErrorLine error={loadError} /> : null}

              <div className="card flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="zr-field">
                    <label htmlFor="org">{t('req.org')}</label>
                    <input id="org" className="zr-in" value={org} onChange={(e) => setOrg(e.target.value)} required />
                  </div>
                  {(current?.signupFields ?? []).map((f) => (
                    <div key={f.key} className="zr-field">
                      <label htmlFor={f.key}>{lang === 'ar' ? f.labelAr : f.labelEn}</label>
                      <input id={f.key} dir="ltr" className="zr-in" value={fields[f.key] ?? ''} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} required={f.required} />
                    </div>
                  ))}
                  <div className="zr-field">
                    <label htmlFor="contact">{t('req.contact')}</label>
                    <input id="contact" className="zr-in" value={contact} onChange={(e) => setContact(e.target.value)} required />
                  </div>
                  <div className="zr-field">
                    <label htmlFor="remail">{t('req.email')}</label>
                    <input id="remail" type="email" dir="ltr" className="zr-in" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-2 text-sm font-semibold">{t('req.type')}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {types.map((x) => (
                      <label key={x.key} className={`card flex cursor-pointer items-start gap-3 ${type === x.key ? '!border-brand bg-zr-mist' : ''}`}>
                        <input type="radio" name="type" className="mt-1 size-5 accent-brand" checked={type === x.key} onChange={() => { setType(x.key); setFields({}); }} />
                        <span>
                          <b>{lang === 'ar' ? x.labelAr : x.labelEn}</b>
                          <span className="muted flex text-sm">{hasMessage(`req.type.${x.key}`) ? t(`req.type.${x.key}` as never) : ''}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="zr-hint mt-2 mb-0">{t('req.staff')}</p>
                </fieldset>

                <div className="zr-field">
                  <label htmlFor="purpose">{t('req.purpose')}</label>
                  <textarea id="purpose" className="zr-in !py-2" rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
                  <span className="zr-hint">{t('req.purposeHint')}</span>
                </div>

                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 size-5 accent-brand" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                  <span>{t('req.confirm')}</span>
                </label>

                {error ? <ErrorLine error={error} /> : null}
                <div className="flex gap-2">
                  <button type="submit" className="zr-btn primary" disabled={busy || !ready}>{busy ? t('req.sending') : t('req.send')}</button>
                  <button type="button" className="zr-btn" onClick={() => go(hrefs.signIn())}>{t('req.back')}</button>
                </div>
              </div>
            </form>

            <aside className="flex flex-col gap-4">
              <section className="card">
                <h2 className="title">{t('req.next.title')}</h2>
                <ol className="m-0 list-decimal ps-5">
                  <li>{t('req.next.1')}</li>
                  <li>{t('req.next.2')}</li>
                  <li>{t('req.next.3')}</li>
                </ol>
              </section>
              <div className="banner synthetic" role="note"><span>{t('req.farmer.note')}</span></div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
