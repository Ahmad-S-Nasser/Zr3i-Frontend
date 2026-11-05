import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import type { AuditEntry, AuditPage } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { fmtUtc } from '../format';
import { useLang } from '../i18n/LangProvider';

const PAGE = 100;

/** The audit log, newest first. Read-only: the log is append-only and nothing here edits or deletes an event. */
export function AuditLog() {
  const { t } = useLang();
  const { org } = useAuth();
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({ action: '', from: '', to: '' });
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  async function load(cursor: string | null, replace: boolean) {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ pageSize: String(PAGE) });
      if (applied.action) q.set('action', applied.action);
      if (applied.from) q.set('from', applied.from);
      if (applied.to) q.set('to', applied.to);
      if (cursor) q.set('cursor', cursor);
      const page = await api<AuditPage>(`/api/organisations/${org.id}/audit?${q}`);
      setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
      setNext(page.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setItems([]);
    void load(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, applied]);

  function apply(e: FormEvent) {
    e.preventDefault();
    setApplied({ action: action.trim(), from, to });
  }

  function exportCsv() {
    const rows = [['time_utc', 'actor', 'action', 'object_type', 'object_id', 'outcome', 'purpose'], ...items.map((e) => [e.at, e.actorEmail ?? '', e.action, e.objectType, e.objectId, e.outcome, e.purpose ?? ''])];
    // A cell that starts with = + - or @ could run as a formula in a spreadsheet, so it is defused.
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        crumb={org?.name ?? ''}
        title={t('aud.title')}
        actions={<button type="button" className="zr-btn" onClick={exportCsv} disabled={items.length === 0}>{t('aud.export')}</button>}
      />
      <div className="flex flex-col gap-4">
        <p className="muted m-0 max-w-3xl">{t('aud.intro')}</p>

        <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
          <div className="zr-field">
            <label htmlFor="aact">{t('aud.filter.action')}</label>
            <input id="aact" dir="ltr" className="zr-in !w-56" value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <div className="zr-field">
            <label htmlFor="afrom">{t('aud.filter.from')}</label>
            <input id="afrom" type="date" dir="ltr" className="zr-in" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="zr-field">
            <label htmlFor="ato">{t('aud.filter.to')}</label>
            <input id="ato" type="date" dir="ltr" className="zr-in" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="submit" className="zr-btn">{t('aud.filter.apply')}</button>
        </form>

        {error ? <ErrorLine error={error} onRetry={() => void load(null, true)} /> : null}

        <section className="card !p-0 overflow-hidden">
          <table className="zr-t">
            <thead>
              <tr>
                <th>{t('aud.col.time')}</th>
                <th>{t('aud.col.who')}</th>
                <th>{t('aud.col.action')}</th>
                <th>{t('aud.col.object')}</th>
                <th>{t('aud.col.outcome')}</th>
                <th>{t('aud.col.purpose')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-xs"><Num>{fmtUtc(e.at).replace(' UTC', '')}</Num></td>
                  <td className="font-mono text-xs"><Num>{e.actorEmail ?? t('aud.system')}</Num></td>
                  <td className="font-mono text-xs"><Num>{e.action}</Num></td>
                  <td className="font-mono text-xs"><Num>{e.objectType} {e.objectId}</Num></td>
                  <td>{e.outcome === 'denied' ? <span className="pill flagged">{t('aud.outcome.denied')}</span> : <span className="pill confirmed">{t('aud.outcome.ok')}</span>}</td>
                  <td className="text-sm">{e.purpose ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <div className="px-4 py-3"><Loading /></div> : null}
          {!loading && !error && items.length === 0 ? <p className="muted px-4 py-3">{t('aud.empty')}</p> : null}
          {next && !loading ? <div className="px-4 py-3"><button type="button" className="zr-btn" onClick={() => void load(next, false)}>{t('aud.more')}</button></div> : null}
        </section>
      </div>
    </>
  );
}
