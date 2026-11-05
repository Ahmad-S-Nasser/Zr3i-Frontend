import { useState } from 'react';
import type { Analysis as AnalysisData, Readability } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { sizeClassLabel } from './Parcels';

const SEGMENTS = [
  { key: 'MEASURED', cls: 'c', label: 'ver.confirmed' },
  { key: 'FLAGGED', cls: 'f', label: 'ver.flagged' },
  { key: 'PENDING', cls: 'p', label: 'ver.pending' },
  { key: 'NOT_ASSESSABLE', cls: 'n', label: 'ver.notAssessable' },
] as const;

/** Data analysis: counts of verdicts, the readable share by size class (never pooled), and usable scenes per month. It ranks nothing. */
export function Analysis({ season: routeSeason }: { season: string | null }) {
  const { t } = useLang();
  const { org } = useAuth();
  const season = routeSeason ?? DEFAULT_SEASON;
  const analysis = useApi<AnalysisData>(org ? `/api/organisations/${org.id}/verification/analysis?season=${season}` : null);
  const sizes = useApi<Readability>(org ? `/api/organisations/${org.id}/readability` : null);
  const [tables, setTables] = useState(false);

  const a = analysis.data;
  const total = a ? SEGMENTS.reduce((s, x) => s + (a.verdicts[x.key] ?? 0), 0) : 0;
  const maxScenes = Math.max(1, ...(a?.scenesPerMonth.map((m) => m.scenes) ?? [0]));

  function exportCsv() {
    if (!a) return;
    const rows: string[][] = [['section', 'name', 'count'], ...SEGMENTS.map((s) => ['verdict', s.key, String(a.verdicts[s.key] ?? 0)]), ['verdict', 'none', String(a.verdicts.none ?? 0)], ...a.scenesPerMonth.map((m) => ['usable_scenes', m.month, String(m.scenes)])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const el = document.createElement('a');
    el.href = url;
    el.download = `analysis-${season}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        crumb={`${org?.name ?? ''} · ${season}`}
        title={t('ana.title')}
        actions={<button type="button" className="zr-btn" onClick={exportCsv} disabled={!a}>{t('ana.export')}</button>}
      />
      <div className="flex flex-col gap-4">
        <div className="banner neutral" role="note"><span>{t('ana.accuracy')}</span></div>
        {analysis.error ? <ErrorLine error={analysis.error} onRetry={analysis.reload} /> : null}
        {analysis.loading ? <Loading /> : null}

        {a ? (
          <>
            <section className="card" aria-labelledby="mix">
              <div className="flex items-baseline justify-between"><h2 id="mix" className="title">{t('ana.mix')}</h2><span className="muted font-mono text-sm">{t('ana.parcels', { n: a.parcels })}</span></div>
              <div className="vbar my-3" role="img" aria-label={t('ana.mix')}>
                {SEGMENTS.map((s) => (<i key={s.key} className={s.cls} style={{ width: `${total === 0 ? 0 : ((a.verdicts[s.key] ?? 0) / total) * 100}%` }} />))}
              </div>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map((s) => (<span key={s.key} className={`pill ${s.cls === 'c' ? 'confirmed' : s.cls === 'f' ? 'flagged' : s.cls === 'p' ? 'pending' : 'na'}`}>{t(s.label)} <Num>{a.verdicts[s.key] ?? 0}</Num></span>))}
                <span className="pill na">{t('ver.none')} <Num>{a.verdicts.none ?? 0}</Num></span>
              </div>
            </section>

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <section className="card" aria-labelledby="share">
                <h2 id="share" className="title">{t('ana.share')}</h2>
                <p className="muted mt-0 text-sm">{t('ana.share.text')}</p>
                {sizes.error ? <p className="m-0">{t('ana.share.unavailable')}</p> : null}
                {sizes.data ? (tables ? (
                  <table className="zr-t">
                    <thead><tr><th>{t('ana.sizeClass')}</th><th className="num !font-display">{t('ana.count')}</th></tr></thead>
                    <tbody>{sizes.data.classes.map((c) => (<tr key={c.key}><td>{sizeClassLabel(c, t)}</td><td className="num"><Num>{c.readable} / {c.parcels}</Num></td></tr>))}</tbody>
                  </table>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {sizes.data.classes.map((c) => (
                      <li key={c.key}>
                        <div className="flex justify-between text-sm"><b>{sizeClassLabel(c, t)}</b><span className="font-mono">{t('ana.share.row', { n: c.readable, total: c.parcels, pct: Math.round(c.share * 100) })}</span></div>
                        <div className="h-3 rounded-sm bg-sunken"><div className="h-3 rounded-sm bg-zr-field" style={{ width: `${Math.round(c.share * 100)}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                )) : null}
              </section>

              <section className="card" aria-labelledby="scenes">
                <h2 id="scenes" className="title">{t('ana.scenes')}</h2>
                <p className="muted mt-0 text-sm">{t('ana.scenes.text')}</p>
                {a.scenesPerMonth.length === 0 ? <p className="m-0">{t('ana.scenes.none')}</p> : tables ? (
                  <table className="zr-t">
                    <thead><tr><th>{t('ana.month')}</th><th className="num !font-display">{t('ana.count')}</th></tr></thead>
                    <tbody>{a.scenesPerMonth.map((m) => (<tr key={m.month}><td className="font-mono text-xs"><Num>{m.month}</Num></td><td className="num"><Num>{m.scenes}</Num></td></tr>))}</tbody>
                  </table>
                ) : (
                  <div className="flex items-end gap-3" role="img" aria-label={t('ana.scenes')}>
                    {a.scenesPerMonth.map((m) => (
                      <div key={m.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                        <span className="font-mono text-xs"><Num>{m.scenes}</Num></span>
                        <div className="w-full rounded-sm bg-zr-field" style={{ height: Math.max(6, Math.round((m.scenes / maxScenes) * 110)) }} />
                        <span className="font-mono text-xs"><Num>{m.month.slice(2)}</Num></span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <button type="button" className="zr-btn text self-start !px-0" onClick={() => setTables(!tables)}>{tables ? t('ana.chart') : t('ana.table')}</button>
          </>
        ) : null}
        <p className="muted text-sm">{t('ana.footer')}</p>
      </div>
    </>
  );
}
