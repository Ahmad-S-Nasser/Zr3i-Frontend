import { useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { FarmList, FarmListItem, Portfolio as PortfolioData } from '../api/types';
import { can, useAuth } from '../auth/AuthProvider';
import { ErrorLine, Kpi, Loading, MaturityBadge, MethodBanner, Num, PageHeader } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmt } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hrefs } from '../router';

const PAGE = 50;

/** Portfolio: headline counts, the regions to filter by, and the farms in the order they were added. Nothing here ranks farms by risk. */
export function Portfolio() {
  const { t } = useLang();
  const { org } = useAuth();
  const [region, setRegion] = useState<string | null>(null);
  const season = DEFAULT_SEASON;
  const summary = useApi<PortfolioData>(org ? `/api/organisations/${org.id}/portfolio${region ? `?governorate=${encodeURIComponent(region)}` : ''}` : null);

  const [items, setItems] = useState<FarmListItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  async function load(cursor: string | null, replace: boolean) {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ pageSize: String(PAGE), season });
      if (region) q.set('governorate', region);
      if (cursor) q.set('cursor', cursor);
      const page = await api<FarmList>(`/api/organisations/${org.id}/farms?${q}`);
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
  }, [org?.id, region]);

  function exportCsv() {
    const rows = [['farm', 'region', 'parcels', 'area_feddan', 'fri'], ...items.map((f) => [f.name, f.governorate ?? '', String(f.parcelCount), f.areaFeddan.toFixed(1), f.fri ? f.fri.value.toFixed(1) : ''])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const canImport = org !== null && can(org.permissions, 'kernel:imports:write');
  const s = summary.data;

  return (
    <>
      <PageHeader
        crumb={t('pf.crumb', { org: org?.name ?? '', season })}
        title={t('pf.title')}
        actions={
          <>
            {canImport ? <a className="zr-btn" href="#/imports">{t('pf.import')}</a> : null}
            <button type="button" className="zr-btn primary" onClick={exportCsv} disabled={items.length === 0}>{t('pf.export')}</button>
          </>
        }
      />
      <div className="flex flex-col gap-4">
        <MethodBanner method="FRI-2026-01" />
        {summary.error ? <ErrorLine error={summary.error} onRetry={summary.reload} /> : null}

        {s && s.regions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('pf.region')}>
            <span className="muted text-sm">{t('pf.region')}</span>
            <button type="button" className="zr-chip" aria-pressed={region === null} onClick={() => setRegion(null)}>{t('pf.allRegions')}</button>
            {s.regions.map((r) => (
              <button key={r.name} type="button" className="zr-chip" aria-pressed={region === r.name} onClick={() => setRegion(r.name)}>{r.name}</button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-4">
          <Kpi label={t('pf.kpi.farms')} value={s ? <Num>{s.farms.toLocaleString('en-US')}</Num> : '…'} />
          <Kpi label={t('mine.kpi.parcels')} value={s ? <Num>{s.parcels.toLocaleString('en-US')}</Num> : '…'} />
          <Kpi label={t('mine.kpi.area')} value={s ? <Num>{fmt(s.areaFeddan, 0)}</Num> : '…'} />
        </div>

        <section className="card" aria-labelledby="bands">
          <h2 id="bands" className="title">{t('pf.bands.title')}</h2>
          <p className="muted mt-0 text-sm">{t('pf.bands.text')}</p>
          <p className="m-0">{t('pf.bands.none')}</p>
        </section>

        {error ? <ErrorLine error={error} onRetry={() => void load(null, true)} /> : null}
        <section className="card !p-0 overflow-hidden" aria-labelledby="farms">
          <div className="flex items-baseline justify-between px-4 py-3">
            <h2 id="farms" className="title">{t('pf.farms')}</h2>
            <span className="muted text-sm">{t('farms.count', { n: items.length })}</span>
          </div>
          <table className="zr-t">
            <thead>
              <tr>
                <th>{t('col.farm')}</th>
                <th>{t('col.region')}</th>
                <th className="num !font-display">{t('col.parcels')}</th>
                <th className="num !font-display">{t('col.area')}</th>
                <th className="num !font-display">{t('col.fri')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id}>
                  <td><a className="text-link underline" href={hrefs.farm(f.id, season)}><Num>{f.name}</Num></a></td>
                  <td>{f.governorate ?? t('common.none')}</td>
                  <td className="num">{fmt(f.parcelCount, 0)}</td>
                  <td className="num">{fmt(f.areaFeddan)}</td>
                  <td className="num">
                    {f.fri ? (
                      <span className="inline-flex flex-col items-end gap-1"><Num>{fmt(f.fri.value)}</Num><MaturityBadge /></span>
                    ) : (
                      <span className="muted font-sans">{t('farms.noFri')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <div className="px-4 py-3"><Loading /></div> : null}
          {!loading && !error && items.length === 0 ? <p className="muted px-4 py-3">{t('farms.empty')}</p> : null}
          {next && !loading ? <div className="px-4 py-3"><button type="button" className="zr-btn" onClick={() => void load(next, false)}>{t('farms.loadMore')}</button></div> : null}
          <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{t('farms.footer')}</p>
        </section>
      </div>
    </>
  );
}
