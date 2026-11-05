import { useState } from 'react';
import { ApiError, api } from '../api/client';
import type { AccessRequest } from '../api/types';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';

const STATUSES = ['pending', 'approved', 'rejected'] as const;

/** The Zr3i administrators' queue of access requests: send an invitation, or decline with an optional reason. */
export function AccessRequests() {
  const { t } = useLang();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('pending');
  const { data, error, loading, reload } = useApi<AccessRequest[]>(`/api/platform/access-requests?status=${status}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const typeName = (key: string) => (hasMessage(`accountType.${key}`) ? t(`accountType.${key}` as never) : key);

  async function invite(id: string) {
    setBusy(id);
    setActionError(null);
    setLink(null);
    try {
      const r = await api<{ inviteToken: string }>(`/api/platform/access-requests/${encodeURIComponent(id)}/approve`, { method: 'POST' });
      setLink(`${window.location.origin}/#/accept?token=${encodeURIComponent(r.inviteToken)}`);
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      setBusy(null);
    }
  }

  async function decline(id: string) {
    setBusy(id);
    setActionError(null);
    try {
      await api(`/api/platform/access-requests/${encodeURIComponent(id)}/reject`, { method: 'POST', body: { reason: reason.trim() || null } });
      setDeclining(null);
      setReason('');
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader crumb={t('ar.crumb')} title={t('ar.title')} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('ar.filter')}>
          <span className="muted text-sm">{t('ar.filter')}</span>
          {STATUSES.map((s) => (
            <button key={s} type="button" className="zr-chip" aria-pressed={status === s} onClick={() => setStatus(s)}>{t(`ar.status.${s}`)}</button>
          ))}
        </div>

        {error ? <ErrorLine error={error} onRetry={reload} /> : null}
        {actionError ? <ErrorLine error={actionError} /> : null}
        {link ? (
          <div className="banner neutral" role="status">
            <div>
              <b>{t('ar.link')}</b>
              <div className="mt-1 break-all font-mono text-xs" dir="ltr">{link}</div>
            </div>
          </div>
        ) : null}
        {loading ? <Loading /> : null}
        {data && data.length === 0 ? <p className="muted">{t('ar.empty')}</p> : null}

        {data && data.length > 0 ? (
          <section className="card !p-0 overflow-hidden">
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('ar.col.org')}</th>
                  <th>{t('tnt.col.type')}</th>
                  <th>{t('ar.col.contact')}</th>
                  <th>{t('ar.col.purpose')}</th>
                  <th>{t('ar.col.status')}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.organisationName}</td>
                    <td>{typeName(r.accountType)}</td>
                    <td>
                      <div>{r.contactName}</div>
                      <div className="font-mono text-xs"><Num>{r.email}</Num></div>
                    </td>
                    <td className="max-w-xs text-sm">{r.purpose}</td>
                    <td>{t(`ar.status.${r.status}`)}</td>
                    <td>
                      {r.status === 'pending' ? (
                        declining === r.id ? (
                          <div className="flex flex-col gap-2">
                            <div className="zr-field">
                              <label htmlFor={`why-${r.id}`}>{t('ar.reason')}</label>
                              <input id={`why-${r.id}`} className="zr-in" value={reason} onChange={(e) => setReason(e.target.value)} />
                            </div>
                            <button type="button" className="zr-btn" disabled={busy !== null} onClick={() => void decline(r.id)}>{t('ar.confirmDecline')}</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" className="zr-btn primary" disabled={busy !== null} onClick={() => void invite(r.id)}>{t('ar.invite')}</button>
                            <button type="button" className="zr-btn" disabled={busy !== null} onClick={() => setDeclining(r.id)}>{t('ar.decline')}</button>
                          </div>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>
    </>
  );
}
