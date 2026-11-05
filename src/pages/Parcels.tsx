import { useEffect, useMemo, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { Analysis, ParcelItem, ParcelList, Readability, SizeClass } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader, VerdictPill, useCropName } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmt } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hrefs } from '../router';

const PAGE = 50;
const FILTERS = [
  { key: 'all', verdict: null, label: 'ver.all' },
  { key: 'MEASURED', verdict: 'MEASURED', label: 'ver.confirmed' },
  { key: 'FLAGGED', verdict: 'FLAGGED', label: 'ver.flagged' },
  { key: 'PENDING', verdict: 'PENDING', label: 'ver.pending' },
  { key: 'NOT_ASSESSABLE', verdict: 'NOT_ASSESSABLE', label: 'ver.notAssessable' },
] as const;

/** The size class an area falls in, or null when classes are not configured or the parcel has no measured area. */
export function sizeClassOf(classes: SizeClass[] | undefined, area: number | null): SizeClass | null {
  if (!classes || classes.length === 0 || area === null) return null;
  return classes.find((c) => area >= c.fromFeddan && (c.toFeddan === null || area < c.toFeddan)) ?? null;
}

/** A size class in words: "Under 1", "1 to 2", "5 and over". */
export function sizeClassLabel(c: SizeClass, t: (key: 'par.size.under' | 'par.size.over' | 'par.size.between', vars: Record<string, string | number>) => string): string {
  if (c.fromFeddan === 0 && c.toFeddan !== null) return t('par.size.under', { to: c.toFeddan });
  if (c.toFeddan === null) return t('par.size.over', { from: c.fromFeddan });
  return t('par.size.between', { from: c.fromFeddan, to: c.toFeddan });
}

/** Parcels: every parcel with what was declared, what was measured, and the verdict. States findings only; no approve or reject action exists. */
export function Parcels({ season: routeSeason }: { season: string | null }) {
  const { t } = useLang();
  const { org } = useAuth();
  const cropName = useCropName();
  const season = routeSeason ?? DEFAULT_SEASON;
  const [verdict, setVerdict] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState('');
  const [items, setItems] = useState<ParcelItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [selected, setSelected] = useState<ParcelItem | null>(null);

  const analysis = useApi<Analysis>(org ? `/api/organisations/${org.id}/verification/analysis?season=${season}` : null);
  const sizes = useApi<Readability>(org ? `/api/organisations/${org.id}/readability` : null);       // 409 until size classes are configured
  const classes = sizes.data?.classes;

  async function load(cursor: string | null, replace: boolean) {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ pageSize: String(PAGE), season });
      if (verdict) qs.set('verdict', verdict);
      if (applied) qs.set('q', applied);
      if (cursor) qs.set('cursor', cursor);
      const page = await api<ParcelList>(`/api/organisations/${org.id}/parcels?${qs}`);
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
    setSelected(null);
    void load(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, season, verdict, applied]);

  const counts = analysis.data?.verdicts;
  const countFor = (v: string | null) => (v === null ? analysis.data?.parcels : counts?.[v]);

  const sizeLabel = useMemo(
    () => (p: ParcelItem) => {
      const c = sizeClassOf(classes, p.measuredAreaFeddan);
      return c ? sizeClassLabel(c, t) : t('common.none');
    },
    [classes, t],
  );

  return (
    <>
      <PageHeader crumb={t('par.crumb', { org: org?.name ?? '', season })} title={t('par.title')} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('par.col.verdict')}>
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className="zr-chip" aria-pressed={verdict === f.verdict} onClick={() => setVerdict(f.verdict)}>
              {t(f.label)}&nbsp;<Num>{countFor(f.verdict) ?? '…'}</Num>
            </button>
          ))}
          <form className="ms-auto flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(q.trim()); }}>
            <label htmlFor="find" className="text-sm">{t('par.search')}</label>
            <input id="find" dir="ltr" className="zr-in !w-44" placeholder={t('par.searchHint')} value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
        </div>
        <p className="muted m-0 text-sm">{t('ver.statusNote')}</p>
        {error ? <ErrorLine error={error} onRetry={() => void load(null, true)} /> : null}

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
          <section className="card !p-0 overflow-x-auto">
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('col.parcel')}</th>
                  <th>{t('par.col.size')}</th>
                  <th className="num !font-display">{t('par.col.declared')}</th>
                  <th className="num !font-display">{t('par.col.measured')}</th>
                  <th className="num !font-display">{t('par.col.gap')}</th>
                  <th>{t('par.col.verdict')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} aria-selected={selected?.id === p.id} onClick={() => setSelected(p)} className="cursor-pointer">
                    <td><a className="text-link underline" href={hrefs.parcelEvidence(p.id, season)} onClick={(e) => e.stopPropagation()}><Num>{p.label}</Num></a></td>
                    <td>{sizeLabel(p)}</td>
                    <td className="num">{fmt(p.declaredAreaFeddan)}</td>
                    <td className="num">{fmt(p.measuredAreaFeddan)}</td>
                    <td className="num">
                      {p.finding?.gapPercent != null ? <Num>{fmt(p.finding.gapPercent, 0)}% / ±{fmt(p.finding.noisePercent, 1)}%</Num> : t('common.none')}
                    </td>
                    <td><VerdictPill status={p.finding?.status} reason={p.finding?.reason} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading ? <div className="px-4 py-3"><Loading /></div> : null}
            {!loading && !error && items.length === 0 ? <p className="muted px-4 py-3">{t('par.empty')}</p> : null}
            {next && !loading ? <div className="px-4 py-3"><button type="button" className="zr-btn" onClick={() => void load(next, false)}>{t('farms.loadMore')}</button></div> : null}
            <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{t('par.shown', { n: items.length, total: analysis.data?.parcels ?? '…' })}</p>
          </section>

          <aside className="card" aria-live="polite">
            <p className="eyebrow m-0">{t('par.selected')}</p>
            {selected ? (
              <>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <h2 className="title"><Num>{selected.label}</Num></h2>
                  <VerdictPill status={selected.finding?.status} reason={selected.finding?.reason} />
                </div>
                <p className="muted mt-1 mb-2 text-sm">{selected.farmName} · {cropName(selected.crop)}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><div className="muted">{t('par.col.declared')}</div><Num>{fmt(selected.declaredAreaFeddan)}</Num> fd</div>
                  <div><div className="muted">{t('par.col.measured')}</div><Num>{fmt(selected.measuredAreaFeddan)}</Num> fd</div>
                </div>
                <p>
                  {selected.measuredAreaFeddan === null || selected.declaredAreaFeddan === null
                    ? t('par.sentenceNone')
                    : selected.finding?.gapPercent != null && selected.finding.noisePercent != null
                      ? t('par.sentence', { m: fmt(selected.measuredAreaFeddan), d: fmt(selected.declaredAreaFeddan), g: fmt(selected.finding.gapPercent, 0), n: fmt(selected.finding.noisePercent, 1) })
                      : selected.finding?.gapPercent != null
                        ? t('par.sentenceNoNoise', { m: fmt(selected.measuredAreaFeddan), d: fmt(selected.declaredAreaFeddan), g: fmt(selected.finding.gapPercent, 0) })
                        : t('par.sentenceNone')}
                </p>
                <div className="flex flex-col gap-2">
                  <a className="zr-btn primary" href={hrefs.parcelEvidence(selected.id, season)}>{t('par.evidence')}</a>
                  <a className="zr-btn" href={hrefs.parcelImagery(selected.id, season)}>{t('par.imagery')}</a>
                  <button type="button" className="zr-btn" disabled>{t('par.walk')}</button>
                  <span className="zr-hint">{t('par.walk.hint')}</span>
                </div>
              </>
            ) : (
              <p className="muted">{t('par.selected.none')}</p>
            )}
            <p className="muted mb-0 border-t border-line pt-3 text-sm">{t('ver.noDecision')}</p>
          </aside>
        </div>
      </div>
    </>
  );
}
