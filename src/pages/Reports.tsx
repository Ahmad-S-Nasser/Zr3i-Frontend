import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, download } from '../api/client';
import type { FarmList } from '../api/types';
import { can, useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmtUtc, shortHash } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';

interface ReportFile {
  name: string;
  bytes: number;
  sha256: string;
}

interface Ready {
  id: string;
  kind: string;
  season: string | null;
  subjectName: string;
  createdAt: string;
  snapshotSha256: string;
  methodVersions: string;
  files: ReportFile[];
}

interface Pending {
  reportId: string;
  kind: string;
  season: string | null;
  status: string;
  errorCode: string | null;
}

interface ReportList {
  ready: Ready[];
  pending: Pending[];
}

interface Tranche {
  id: string;
  name: string;
  season: string;
}

const FILE_ORDER = ['report.en.pdf', 'report.ar.pdf', 'report.en.html', 'report.ar.html', 'report.csv', 'snapshot.json', 'manifest.json'];

/** Reports: freeze a report (it is made in the background), then download its files. A frozen report never changes. */
export function Reports() {
  const { t } = useLang();
  const { org } = useAuth();
  const list = useApi<ReportList>(org ? `/api/organisations/${org.id}/reports` : null);
  const reload = list.reload;
  const waiting = (list.data?.pending ?? []).some((p) => p.status === 'queued' || p.status === 'running');
  const canWrite = org !== null && can(org.permissions, 'kernel:reports:write');

  // While a report is being prepared the list is refreshed every few seconds.
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(reload, 3000);
    return () => window.clearInterval(timer);
  }, [waiting, reload]);

  const pending = list.data?.pending ?? [];
  return (
    <>
      <PageHeader crumb={t('rep.crumb', { org: org?.name ?? '' })} title={t('rep.title')} />
      <div className="flex flex-col gap-4">
        <p className="muted m-0">{t('rep.intro')}</p>
        {list.error ? <ErrorLine error={list.error} onRetry={list.reload} /> : null}
        {list.loading && !list.data ? <Loading /> : null}

        {canWrite ? <NewReport onRequested={list.reload} /> : null}

        {pending.length > 0 ? (
          <section className="card !p-0 overflow-hidden" aria-labelledby="pend">
            <h2 id="pend" className="title px-4 py-3">{t('rep.pending.title')}</h2>
            <table className="zr-t">
              <tbody>
                {pending.map((p) => (
                  <tr key={p.reportId}>
                    <td>{kindLabel(t, p.kind)}</td>
                    <td className="whitespace-nowrap font-mono text-xs"><Num>{p.season ?? ''}</Num></td>
                    <td>
                      {p.status === 'failed'
                        ? <span className="pill flagged">{t('rep.status.failed')}</span>
                        : <span className="pill pending">{t(p.status === 'running' ? 'rep.status.running' : 'rep.status.queued')}</span>}
                      {p.status === 'failed' ? <div className="muted text-xs">{p.errorCode && hasMessage(`rep.error.${p.errorCode}`) ? t(`rep.error.${p.errorCode}` as never) : t('rep.error.unknown')}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {list.data ? (
          <section className="card !p-0 overflow-hidden" aria-labelledby="done">
            <h2 id="done" className="title px-4 py-3">{t('rep.list.title')}</h2>
            {list.data.ready.length === 0 ? <p className="muted px-4 pb-3">{t('rep.none')}</p> : (
              <table className="zr-t">
                <thead>
                  <tr>
                    <th>{t('rep.col.report')}</th>
                    <th>{t('rep.col.subject')}</th>
                    <th>{t('rep.col.season')}</th>
                    <th>{t('rep.col.frozen')}</th>
                    <th>{t('rep.col.hash')}</th>
                    <th>{t('rep.col.files')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.ready.map((r) => <ReadyRow key={r.id} report={r} orgId={org!.id} />)}
                </tbody>
              </table>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}

function kindLabel(t: (k: never) => string, kind: string): string {
  return hasMessage(`rep.kind.${kind}`) ? t(`rep.kind.${kind}` as never) : kind;
}

function ReadyRow({ report, orgId }: { report: Ready; orgId: string }) {
  const { t } = useLang();
  const [error, setError] = useState<ApiError | null>(null);
  const files = [...report.files].sort((a, b) => FILE_ORDER.indexOf(a.name) - FILE_ORDER.indexOf(b.name));

  async function get(name: string) {
    setError(null);
    try {
      await download(`/api/organisations/${orgId}/reports/${report.id}/files/${encodeURIComponent(name)}`, name);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    }
  }

  return (
    <tr>
      <td>{kindLabel(t as never, report.kind)}{report.methodVersions ? <div className="muted font-mono text-xs"><Num>{report.methodVersions}</Num></div> : null}</td>
      <td>{report.subjectName}</td>
      <td className="whitespace-nowrap font-mono text-xs"><Num>{report.season ?? ''}</Num></td>
      <td className="font-mono text-xs"><Num>{fmtUtc(report.createdAt)}</Num></td>
      <td className="font-mono text-xs" title={report.snapshotSha256}><Num>{shortHash(report.snapshotSha256)}</Num></td>
      <td>
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <button key={f.name} type="button" className="zr-btn" title={`${f.name} · ${f.sha256}`} onClick={() => get(f.name)}>
              {hasMessage(`rep.file.${f.name}`) ? t(`rep.file.${f.name}` as never) : f.name}
            </button>
          ))}
        </div>
        {error ? <ErrorLine error={error} /> : null}
      </td>
    </tr>
  );
}

/** A report kind is offered only when there is something to report on, so the form never needs to know the kind of organisation. */
function NewReport({ onRequested }: { onRequested: () => void }) {
  const { t } = useLang();
  const { org } = useAuth();
  const canTranches = org !== null && can(org.permissions, 'kernel:tranches:read');
  const tranches = useApi<Tranche[]>(org && canTranches ? `/api/organisations/${org.id}/tranches` : null);
  const farms = useApi<FarmList>(org ? `/api/organisations/${org.id}/farms?pageSize=200` : null);
  const hasTranches = (tranches.data?.length ?? 0) > 0;
  const hasFarms = (farms.data?.items.length ?? 0) > 0;
  const kinds = [...(hasTranches ? ['tranche'] : []), ...(hasFarms ? ['farm_risk', 'farmer_results'] : [])];

  const [kind, setKind] = useState('');
  const [subject, setSubject] = useState('');
  const [season, setSeason] = useState(DEFAULT_SEASON);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const chosen = kinds.includes(kind) ? kind : (kinds[0] ?? '');

  useEffect(() => setError(null), [chosen, subject, season]);

  if (tranches.loading || farms.loading) return null;
  if (kinds.length === 0) return <p className="muted m-0">{t('rep.new.nothing')}</p>;

  const subjects = chosen === 'tranche' ? (tranches.data ?? []).map((x) => ({ id: x.id, name: x.name })) : (farms.data?.items ?? []).map((x) => ({ id: x.id, name: x.name }));
  const needsSubject = chosen !== 'farmer_results';
  const subjectId = subjects.some((s) => s.id === subject) ? subject : (subjects[0]?.id ?? '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setBusy(true);
    setError(null);
    setNote(false);
    try {
      await api(`/api/organisations/${org.id}/reports`, { method: 'POST', body: { kind: chosen, subjectId: needsSubject ? subjectId : null, season: chosen === 'tranche' ? null : season } });
      setNote(true);
      onRequested();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3" noValidate>
      <h2 className="title">{t('rep.new.title')}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="zr-field">
          <label htmlFor="rk">{t('rep.new.kind')}</label>
          <select id="rk" className="zr-in" value={chosen} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => <option key={k} value={k}>{kindLabel(t as never, k)}</option>)}
          </select>
        </div>
        {needsSubject ? (
          <div className="zr-field">
            <label htmlFor="rs">{t(chosen === 'tranche' ? 'rep.new.subject.tranche' : 'rep.new.subject.farm')}</label>
            <select id="rs" className="zr-in" value={subjectId} onChange={(e) => setSubject(e.target.value)}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        ) : null}
        {chosen !== 'tranche' ? (
          <div className="zr-field"><label htmlFor="rn">{t('rep.new.season')}</label><input id="rn" dir="ltr" className="zr-in" value={season} onChange={(e) => setSeason(e.target.value)} /></div>
        ) : null}
      </div>
      {error ? <ErrorLine error={error} /> : null}
      {note ? <p className="muted m-0" role="status">{t('rep.requested')}</p> : null}
      <button type="submit" className="zr-btn primary self-start" disabled={busy || (needsSubject && !subjectId)}>{t('rep.new.create')}</button>
    </form>
  );
}
