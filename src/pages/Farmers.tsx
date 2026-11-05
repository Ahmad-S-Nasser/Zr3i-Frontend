import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import type { Farmer, Grant } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';

/** Farmers of the organisation: add one, see whether consent is given, and ask for consent (the farmer agrees through a one-page link). */
export function Farmers() {
  const { t } = useLang();
  const { org } = useAuth();
  const farmers = useApi<Farmer[]>(org ? `/api/organisations/${org.id}/farmers` : null);
  const grants = useApi<Grant[]>(org ? `/api/organisations/${org.id}/consents` : null);

  const given = new Set((grants.data ?? []).filter((g) => g.role === 'owner' && g.status === 'active').map((g) => g.farmerId));

  return (
    <>
      <PageHeader crumb={org?.name ?? ''} title={t('fmr.title')} />
      <div className="flex flex-col gap-4">
        {farmers.error ? <ErrorLine error={farmers.error} onRetry={farmers.reload} /> : null}
        {farmers.loading ? <Loading /> : null}

        <section className="card !p-0 overflow-hidden" aria-labelledby="list">
          <h2 id="list" className="title px-4 py-3">{t('fmr.title')}</h2>
          <table className="zr-t">
            <thead>
              <tr>
                <th>{t('fmr.col.farmer')}</th>
                <th>{t('fmr.col.phone')}</th>
                <th>{t('fmr.col.language')}</th>
                <th>{t('fmr.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {(farmers.data ?? []).map((f) => (
                <tr key={f.id}>
                  <td className="font-semibold">{f.name}</td>
                  <td className="font-mono text-xs"><Num>{f.phone ?? t('common.none')}</Num></td>
                  <td>{f.language === 'ar' ? t('fmr.lang.ar') : t('fmr.lang.en')}</td>
                  <td>{given.has(f.id) ? <span className="pill confirmed">{t('fmr.status.given')}</span> : <span className="pill na">{t('fmr.status.none')}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {farmers.data && farmers.data.length === 0 ? <p className="muted px-4 py-3">{t('fmr.empty')}</p> : null}
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <AddFarmer onAdded={farmers.reload} />
          <AskConsent farmers={farmers.data ?? []} />
        </div>
      </div>
    </>
  );
}

function AddFarmer({ onAdded }: { onAdded: () => void }) {
  const { t } = useLang();
  const { org } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('ar');
  const [externalId, setExternalId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/organisations/${org.id}/farmers`, { method: 'POST', body: { name: name.trim(), phone: phone.trim() || null, language, externalId: externalId.trim() || null } });
      setName('');
      setPhone('');
      setExternalId('');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3" noValidate>
      <h2 className="title">{t('fmr.invite.title')}</h2>
      <p className="muted m-0 text-sm">{t('fmr.invite.hint')}</p>
      <div className="zr-field">
        <label htmlFor="fname">{t('fmr.name')}</label>
        <input id="fname" className="zr-in" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="zr-field">
        <label htmlFor="fphone">{t('fmr.phone')}</label>
        <input id="fphone" dir="ltr" inputMode="tel" className="zr-in" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="zr-field">
        <label htmlFor="flang">{t('fmr.language')}</label>
        <select id="flang" className="zr-in" value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="ar">{t('fmr.lang.ar')}</option>
          <option value="en">{t('fmr.lang.en')}</option>
        </select>
      </div>
      <div className="zr-field">
        <label htmlFor="fext">{t('fmr.externalId')}</label>
        <input id="fext" dir="ltr" className="zr-in" value={externalId} onChange={(e) => setExternalId(e.target.value)} />
      </div>
      {error ? <ErrorLine error={error} /> : null}
      <button type="submit" className="zr-btn primary self-start" disabled={busy || !name.trim()}>
        {t('fmr.add')}
      </button>
    </form>
  );
}

function AskConsent({ farmers }: { farmers: Farmer[] }) {
  const { t } = useLang();
  const { org } = useAuth();
  const [farmerId, setFarmerId] = useState('');
  const [grantee, setGrantee] = useState('');
  const [purpose, setPurpose] = useState('');
  const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setBusy(true);
    setError(null);
    setLink(null);
    try {
      const r = await api<{ consentToken: string }>(`/api/organisations/${org.id}/consent-requests`, {
        method: 'POST',
        body: { farmerId: farmerId || farmers[0]?.id, granteeTenantId: grantee.trim(), purpose: purpose.trim(), validUntil: new Date(until + 'T23:59:59Z').toISOString() },
      });
      setLink(`${window.location.origin}/#/c/${r.consentToken}`);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3" noValidate>
      <h2 className="title">{t('fmr.request.title')}</h2>
      <p className="muted m-0 text-sm">{t('fmr.request.hint')}</p>
      <div className="zr-field">
        <label htmlFor="rfarmer">{t('fmr.request.farmer')}</label>
        <select id="rfarmer" className="zr-in" value={farmerId || farmers[0]?.id || ''} onChange={(e) => setFarmerId(e.target.value)}>
          {farmers.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <div className="zr-field">
        <label htmlFor="rgrantee">{t('fmr.request.grantee')}</label>
        <input id="rgrantee" dir="ltr" className="zr-in" value={grantee} onChange={(e) => setGrantee(e.target.value)} />
      </div>
      <div className="zr-field">
        <label htmlFor="rpurpose">{t('fmr.request.purpose')}</label>
        <input id="rpurpose" className="zr-in" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      </div>
      <div className="zr-field">
        <label htmlFor="runtil">{t('fmr.request.until')}</label>
        <input id="runtil" type="date" dir="ltr" className="zr-in" value={until} onChange={(e) => setUntil(e.target.value)} />
      </div>
      {error ? <ErrorLine error={error} /> : null}
      <button type="submit" className="zr-btn primary self-start" disabled={busy || farmers.length === 0 || !grantee.trim() || !purpose.trim() || !until}>
        {t('fmr.request.send')}
      </button>
      {link ? (
        <div className="banner neutral" role="status">
          <div>
            <b>{t('fmr.request.link')}</b>
            <div className="mt-1 break-all font-mono text-xs" dir="ltr">{link}</div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
