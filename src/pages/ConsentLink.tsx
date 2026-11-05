import { useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { ConsentOffer } from '../api/types';
import { LangToggle } from '../components/Shell';
import { ErrorLine, Loading, Num } from '../components/ui';
import { fmtUtc } from '../format';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';

/**
 * The farmer's one-page consent. No sign-in: the link is the credential and it works once. The box is never pre-ticked, and "no" is as easy
 * as "yes". A single column at phone width, with large targets.
 */
export function ConsentLink({ token }: { token: string }) {
  const { t, lang, setLang } = useLang();
  const [offer, setOffer] = useState<ConsentOffer | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<null | { granted: boolean; withdrawToken: string | null }>(null);
  const [withdrawn, setWithdrawn] = useState(false);

  useEffect(() => {
    api<ConsentOffer>(`/api/consent/${encodeURIComponent(token)}`)
      .then((o) => {
        setOffer(o);
        if (o.language === 'ar' || o.language === 'en') setLang(o.language);                  // the farmer's own language
      })
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError(0, 'network')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function respond(accepted: boolean) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ granted: boolean; withdrawToken: string | null }>(`/api/consent/${encodeURIComponent(token)}`, { method: 'POST', body: { accepted, language: lang } });
      setOutcome(r);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!outcome?.withdrawToken) return;
    setBusy(true);
    try {
      await api(`/api/consent/withdraw/${encodeURIComponent(outcome.withdrawToken)}`, { method: 'POST' });
      setWithdrawn(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  const open = offer?.status === 'pending';

  return (
    <div className="-m-4 min-h-screen bg-ground">
      <header className="flex items-center justify-between bg-zr-field px-4 py-3">
        <span dir="ltr" className="font-display text-xl font-black text-zr-sage">{t('brand.wordmark')}</span>
        <LangToggle />
      </header>
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
        <div>
          <p className="eyebrow m-0">{t('link.eyebrow')}</p>
          <h1 className="display">{t('link.title')}</h1>
        </div>
        <div className="banner synthetic" role="note"><span>{t('link.draft')}</span></div>

        {!offer && !error ? <Loading /> : null}
        {error && !offer ? <p className="m-0">{t('link.closed')}</p> : null}
        {error && offer ? <ErrorLine error={error} /> : null}

        {offer && !outcome ? (
          !open ? (
            <p className="m-0">{t('link.closed')}</p>
          ) : (
            <>
              <p className="m-0 text-lg">
                {offer.parcelCount === null || offer.parcelCount === undefined
                  ? t('link.ask.all', { requester: offer.requester, grantee: offer.grantee })
                  : t('link.ask', { requester: offer.requester, n: offer.parcelCount, grantee: offer.grantee })}
              </p>
              <section className="card">
                <h2 className="eyebrow m-0">{t('link.purpose')}</h2>
                <p className="mt-1">{offer.purpose}</p>
                <h2 className="eyebrow m-0">{t('link.period')}</h2>
                <p className="mt-1 mb-0 font-mono text-sm"><Num>{fmtUtc(offer.validFrom).slice(0, 10)}</Num> → <Num>{fmtUtc(offer.validUntil).slice(0, 10)}</Num></p>
              </section>
              <section className="card">
                <h2 className="eyebrow m-0">{t('link.shared')}</h2>
                <ul className="m-0 mt-1 list-disc ps-5">
                  {offer.dataCategories.map((c) => (
                    <li key={c}>{hasMessage(`link.cat.${c}`) ? t(`link.cat.${c}` as never) : c}</li>
                  ))}
                </ul>
              </section>
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 size-6 accent-brand" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>{t('link.agree')}</span>
              </label>
              <div className="flex flex-col gap-2">
                <button type="button" className="zr-btn primary" disabled={!agree || busy} onClick={() => void respond(true)}>{t('link.give')}</button>
                <button type="button" className="zr-btn" disabled={busy} onClick={() => void respond(false)}>{t('link.decline')}</button>
              </div>
            </>
          )
        ) : null}

        {outcome ? (
          outcome.granted ? (
            <section className="card flex flex-col gap-2" role="status">
              <p className="m-0 text-lg font-semibold">{withdrawn ? t('link.withdrawn') : t('link.granted')}</p>
              {!withdrawn && outcome.withdrawToken ? (
                <>
                  <p className="m-0 text-sm">{t('link.granted.withdraw')}</p>
                  <button type="button" className="zr-btn" disabled={busy} onClick={() => void withdraw()}>{t('link.withdraw')}</button>
                </>
              ) : null}
            </section>
          ) : (
            <p role="status" className="m-0 text-lg">{t('link.declined')}</p>
          )
        ) : null}
      </main>
    </div>
  );
}
