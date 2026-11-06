import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api } from '../api/client';
import { can, useAuth } from '../auth/AuthProvider';
import { ErrorLine, Kpi, Loading, Num, PageHeader } from '../components/ui';
import { fmt, fmtUtc } from '../format';
import { hrefs } from '../router';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';

interface Counts {
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  errorCodes: string[];
}

interface Status {
  discover: Counts;
  ingest: Counts;
  chip: Counts;
}

interface SceneRow {
  sceneId: string;
  sensingTime: string;
  tile: string;
  platform: string;
  cloudCover: number;
  attribution: string;
  parcelsUnder: number;
  observed: number;
  readable: number;
}

interface Overview {
  hasParcels: boolean;
  total: number;
  scenes: SceneRow[];
}

type Phase = 'idle' | 'discover' | 'ingest';

const DAYS = [7, 30, 90] as const;
const busy = (c: Counts | undefined) => (c ? c.queued + c.running : 0);

/**
 * Satellite: Sentinel-2 scenes over the organisation's parcels. "Fetch imagery" asks for a search of the public catalogue and then a reading of
 * every parcel in the scenes found; both run in the background and this page follows them. Numbers and dates only, no verdicts.
 */
export function Satellite() {
  const { t } = useLang();
  const { org } = useAuth();
  const base = org ? `/api/organisations/${org.id}/imagery` : null;
  const canFetch = org !== null && can(org.permissions, 'kernel:imagery:write');
  const [days, setDays] = useState<number>(30);
  const [cloud, setCloud] = useState(60);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<ApiError | null>(null);

  // The period is fixed when the page opens or the choice changes, so the scene list does not shift under the reader.
  const period = useMemo(() => {
    const to = new Date();
    return { from: new Date(to.getTime() - days * 86400000).toISOString(), to: to.toISOString() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, phase === 'idle']);

  const status = useApi<Status>(base ? `${base}/status` : null);
  const scenes = useApi<Overview>(base ? `${base}/scenes?from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}` : null);
  const working = busy(status.data?.discover) + busy(status.data?.ingest) > 0 || phase !== 'idle';
  const reloadStatus = status.reload;
  const reloadScenes = scenes.reload;

  // Follow the background work every few seconds while there is any.
  useEffect(() => {
    if (!working) return;
    const timer = window.setInterval(() => { reloadStatus(); reloadScenes(); }, 3000);
    return () => window.clearInterval(timer);
  }, [working, reloadStatus, reloadScenes]);

  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  /** Asks for the status until none of this kind of job is waiting or running. The first look comes after the request returned, and the jobs were queued before it did, so it is never stale. */
  async function waitUntilIdle(kind: 'discover' | 'ingest', failedBefore: number): Promise<void> {
    for (;;) {
      const s = await api<Status>(`${base}/status`);
      if (!alive.current) return;
      reloadStatus();
      if (busy(s[kind]) === 0) {
        if (s[kind].failed > failedBefore) throw new ApiError(500, s[kind].errorCodes[0] ?? 'unknown');
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  /** The whole chain: search the catalogue, wait; read the parcels in the scenes found, wait; then refresh the list. */
  async function fetchImagery() {
    if (!base) return;
    setError(null);
    const body = { from: period.from, to: period.to, maxCloudCover: cloud };
    try {
      const before = (await api<Status>(`${base}/status`));
      setPhase('discover');
      await api(`${base}/discover`, { method: 'POST', body });
      await waitUntilIdle('discover', before.discover.failed);
      if (!alive.current) return;
      setPhase('ingest');
      await api(`${base}/ingest`, { method: 'POST', body });
      await waitUntilIdle('ingest', before.ingest.failed);
    } catch (e) {
      if (alive.current) setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      if (alive.current) {
        setPhase('idle');
        reloadStatus();
        reloadScenes();
      }
    }
  }

  const rows = scenes.data?.scenes ?? [];
  const sum = (key: 'observed' | 'readable') => rows.reduce((n, r) => n + r[key], 0);
  const line = (c: Counts) => t('sat.status.line', { q: c.queued, r: c.running, s: c.succeeded, f: c.failed });

  return (
    <>
      <PageHeader crumb={t('sat.crumb', { org: org?.name ?? '' })} title={t('sat.title')} />
      <div className="flex flex-col gap-4">
        <p className="muted m-0">{t('sat.intro')}</p>

        <section className="card flex flex-wrap items-end gap-4" aria-label={t('sat.period')}>
          <div className="zr-field">
            <label htmlFor="sd">{t('sat.period')}</label>
            <select id="sd" className="zr-in" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {DAYS.map((d) => <option key={d} value={d}>{t('sat.days', { n: d })}</option>)}
            </select>
          </div>
          <div className="zr-field">
            <label htmlFor="sc">{t('sat.cloud')}</label>
            <input id="sc" type="number" min={0} max={100} dir="ltr" className="zr-in !w-28" value={cloud} onChange={(e) => setCloud(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
          </div>
          {canFetch ? <button type="button" className="zr-btn primary" disabled={working} onClick={() => void fetchImagery()}>{t('sat.fetch')}</button> : null}
        </section>

        {phase !== 'idle' ? <div className="banner neutral" role="status"><span>{t(phase === 'discover' ? 'sat.working.discover' : 'sat.working.ingest')} {t('sat.slow')}</span></div> : null}
        {error ? <ErrorLine error={error} /> : null}
        {status.error ? <ErrorLine error={status.error} onRetry={status.reload} /> : null}
        {scenes.error ? <ErrorLine error={scenes.error} onRetry={scenes.reload} /> : null}

        {status.data ? (
          <section className="card" aria-labelledby="bg">
            <h2 id="bg" className="title">{t('sat.status.title')}</h2>
            <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="muted">{t('sat.status.discover')}</dt><dd className="m-0"><Num>{line(status.data.discover)}</Num></dd>
              <dt className="muted">{t('sat.status.ingest')}</dt><dd className="m-0"><Num>{line(status.data.ingest)}</Num></dd>
              <dt className="muted">{t('sat.status.chip')}</dt><dd className="m-0"><Num>{line(status.data.chip)}</Num></dd>
            </dl>
            {[...status.data.discover.errorCodes, ...status.data.ingest.errorCodes, ...status.data.chip.errorCodes].length > 0 ? (
              <p className="muted m-0 mt-2 text-xs" dir="ltr">{[...new Set([...status.data.discover.errorCodes, ...status.data.ingest.errorCodes, ...status.data.chip.errorCodes])].join(' · ')}</p>
            ) : null}
          </section>
        ) : null}

        {scenes.loading && !scenes.data ? <Loading /> : null}
        {scenes.data ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Kpi label={t('sat.kpi.scenes')} value={<Num>{scenes.data.total}</Num>} />
              <Kpi label={t('sat.kpi.read')} value={<Num>{sum('observed')}</Num>} />
              <Kpi label={t('sat.kpi.usable')} value={<Num>{sum('readable')}</Num>} />
            </div>
            {!scenes.data.hasParcels ? <div className="banner neutral" role="note"><span>{t('sat.noparcels')}</span></div> : null}
            <section className="card !p-0 overflow-hidden" aria-labelledby="sc-list">
              <div className="px-4 py-3">
                <h2 id="sc-list" className="title">{t('sat.scenes')}</h2>
                {scenes.data.total > rows.length ? <p className="muted m-0 text-sm">{t('sat.shown', { shown: rows.length, total: scenes.data.total })}</p> : null}
              </div>
              {rows.length === 0 ? <p className="muted px-4 pb-3">{t('sat.none')}</p> : (
                <table className="zr-t">
                  <thead>
                    <tr>
                      <th>{t('sat.col.date')}</th>
                      <th>{t('sat.col.scene')}</th>
                      <th className="num !font-display">{t('sat.col.cloud')}</th>
                      <th className="num !font-display">{t('sat.col.under')}</th>
                      <th className="num !font-display">{t('sat.col.read')}</th>
                      <th className="num !font-display">{t('sat.col.usable')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.sceneId}>
                        <td className="font-mono text-xs"><Num>{fmtUtc(r.sensingTime).slice(0, 10)}</Num></td>
                        <td className="font-mono text-xs"><a className="text-link underline" href={hrefs.scene(r.sceneId)}><Num>{r.sceneId}</Num></a><div className="muted"><Num>{r.tile}</Num></div></td>
                        <td className="num"><Num>{fmt(r.cloudCover, 0)}%</Num></td>
                        <td className="num"><Num>{r.parcelsUnder}</Num></td>
                        <td className="num"><Num>{r.observed}</Num></td>
                        <td className="num"><Num>{r.readable}</Num></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{rows[0]?.attribution ?? t('sat.attribution')}</p>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}
