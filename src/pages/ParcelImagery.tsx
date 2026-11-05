import { useState } from 'react';
import type { ObservationRow, ParcelItem } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, MethodBanner, Num, PageHeader, VerdictPill } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmt, fmtUtc } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hrefs } from '../router';

/**
 * Imagery for one parcel. The platform does not draw image chips yet, so this page shows what each scene read from the stored observations:
 * the NDVI by date, which scenes were usable, and the details of the selected scene. Field photos are not stored yet.
 */
export function ParcelImagery({ id, season: routeSeason }: { id: string; season: string | null }) {
  const { t } = useLang();
  const { org } = useAuth();
  const season = routeSeason ?? DEFAULT_SEASON;
  const base = org ? `/api/organisations/${org.id}` : null;
  const parcel = useApi<ParcelItem>(base ? `${base}/parcels/${encodeURIComponent(id)}?season=${season}` : null);
  const observations = useApi<ObservationRow[]>(base ? `${base}/parcels/${encodeURIComponent(id)}/observations` : null);
  const [index, setIndex] = useState<number | null>(null);

  const rows = observations.data ?? [];
  const at = rows.length === 0 ? null : (index ?? rows.length - 1);
  const sel = at === null ? null : rows[at];
  const back = <a className="zr-btn" href={hrefs.parcelEvidence(id, season)}>{t('img.back')}</a>;

  if (parcel.error) return <><PageHeader crumb="" title="" actions={back} /><ErrorLine error={parcel.error} onRetry={parcel.reload} /></>;
  if (parcel.loading || !parcel.data) return <Loading />;
  const p = parcel.data;

  return (
    <>
      <PageHeader crumb={`${org?.name ?? ''} · ${p.farmName}`} title={t('img.title', { label: p.label })} actions={back} />
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3"><VerdictPill status={p.finding?.status} reason={p.finding?.reason} /></div>
        <div className="banner synthetic" role="note"><span>{t('img.placeholder')}</span></div>
        {observations.error ? <ErrorLine error={observations.error} onRetry={observations.reload} /> : null}
        {observations.loading ? <Loading /> : null}

        {rows.length === 0 && !observations.loading ? <p className="muted">{t('img.none')}</p> : null}

        {rows.length > 0 ? (
          <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
            <section className="card" aria-labelledby="ndvi">
              <h2 id="ndvi" className="title">{t('img.ndvi')}</h2>
              <NdviChart rows={rows} selected={at} onSelect={setIndex} />
              <div className="zr-field mt-3">
                <label htmlFor="slider">{t('img.slider')}: <Num>{sel ? `${fmtUtc(sel.sensingTime).slice(0, 10)} · ${(at ?? 0) + 1}/${rows.length}` : ''}</Num></label>
                <input id="slider" type="range" min={0} max={rows.length - 1} value={at ?? 0} onChange={(e) => setIndex(Number(e.target.value))} className="accent-brand" />
              </div>
              <div className="vbar mt-2" role="img" aria-label={t('img.ticks')}>
                {rows.map((o, i) => (
                  <i key={o.sceneId} className={o.readable ? 'c' : 'n'} style={{ flex: 1, outline: at === i ? '2px solid var(--focus)' : undefined, outlineOffset: -2 }} />
                ))}
              </div>
              <p className="zr-hint mt-2 mb-0">{t('img.ticks')}</p>
              <p className="zr-hint mt-1 mb-0">{t('img.legend')}</p>
            </section>

            <aside className="card">
              <p className="eyebrow m-0">{t('img.selected')}</p>
              {sel ? (
                <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="muted">{t('img.sensor')}</dt><dd className="m-0 font-mono"><Num>Sentinel-2 L2A · 10 m</Num></dd>
                  <dt className="muted">{t('ev.obs.date')}</dt><dd className="m-0 font-mono"><Num>{fmtUtc(sel.sensingTime).slice(0, 10)}</Num></dd>
                  <dt className="muted">{t('img.cloud')}</dt><dd className="m-0 font-mono"><Num>{fmt(sel.lostShare * 100, 0)}%</Num></dd>
                  <dt className="muted">{t('ev.obs.ndvi')}</dt><dd className="m-0 font-mono"><Num>{sel.ndvi ? fmt(sel.ndvi.median, 2) : '—'}</Num></dd>
                  <dt className="muted">{t('img.used')}</dt><dd className="m-0">{sel.readable ? t('ev.yes') : t('ev.no')}</dd>
                </dl>
              ) : null}
              <p className="muted mt-3 mb-0 text-xs">{sel?.attribution}</p>
            </aside>
          </div>
        ) : null}

        <section className="card" aria-labelledby="photos">
          <h2 id="photos" className="title">{t('img.photos')}</h2>
          <p className="muted m-0">{t('img.photos.none')}</p>
        </section>
        <MethodBanner method="FRI-2026-01" />
      </div>
    </>
  );
}

/** NDVI median by scene date as an inline SVG, with a text table behind it for anyone who cannot see the chart. */
function NdviChart({ rows, selected, onSelect }: { rows: ObservationRow[]; selected: number | null; onSelect: (i: number) => void }) {
  const { t } = useLang();
  const [asTable, setAsTable] = useState(false);
  const w = 560;
  const h = 160;
  const pad = 28;
  const pts = rows.map((o, i) => ({ i, x: rows.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (rows.length - 1), y: o.ndvi ? h - pad - o.ndvi.median * (h - 2 * pad) : null, o }));
  const line = pts.filter((p) => p.y !== null).map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <>
      {asTable ? (
        <table className="zr-t">
          <thead><tr><th>{t('ev.obs.date')}</th><th className="num !font-display">{t('ev.obs.ndvi')}</th></tr></thead>
          <tbody>{rows.map((o) => (<tr key={o.sceneId}><td className="font-mono text-xs"><Num>{fmtUtc(o.sensingTime).slice(0, 10)}</Num></td><td className="num">{o.ndvi ? fmt(o.ndvi.median, 2) : '—'}</td></tr>))}</tbody>
        </table>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={t('img.ndvi')}>
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--line-strong)" />
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line x1={pad} x2={w - pad} y1={h - pad - v * (h - 2 * pad)} y2={h - pad - v * (h - 2 * pad)} stroke="var(--line)" />
              <text x={4} y={h - pad - v * (h - 2 * pad) + 4} fontSize="10" fill="var(--ink-muted)">{v.toFixed(1)}</text>
            </g>
          ))}
          {line ? <polyline points={line} fill="none" stroke="var(--zr-field)" strokeWidth="2" /> : null}
          {pts.map((p) => (p.y === null ? (
            <line key={p.i} x1={p.x} x2={p.x} y1={pad} y2={h - pad} stroke="var(--not-assessable)" strokeDasharray="3 3" />
          ) : (
            <circle key={p.i} cx={p.x} cy={p.y} r={selected === p.i ? 6 : 4} fill={selected === p.i ? 'var(--brand)' : 'var(--zr-field)'} stroke="var(--surface)" strokeWidth="1.5" tabIndex={0} role="button" aria-label={`${fmtUtc(p.o.sensingTime).slice(0, 10)} NDVI ${fmt(p.o.ndvi?.median, 2)}`} onClick={() => onSelect(p.i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(p.i); }} style={{ cursor: 'pointer' }} />
          )))}
        </svg>
      )}
      <button type="button" className="zr-btn text !min-h-0 !px-0" onClick={() => setAsTable(!asTable)}>{asTable ? t('ana.chart') : t('ana.table')}</button>
    </>
  );
}
