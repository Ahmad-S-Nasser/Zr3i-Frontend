import { useMemo, useState } from 'react';
import type { ParcelSummary } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, MaturityBadge, MethodBanner, Num, PageHeader, RiskBand, useCropName } from '../components/ui';
import { fmt, fmtUtc, shortHash } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import type { MessageKey } from '../i18n/messages';
import { hrefs } from '../router';

/** Parcel risk page: the CRI, where it came from, and its components, with a what-if view that never changes the stored result. */
export function ParcelRisk({ parcelSeasonId }: { parcelSeasonId: string }) {
  const { t } = useLang();
  const { org } = useAuth();
  const cropName = useCropName();
  const { data, error, loading, reload } = useApi<ParcelSummary>(org ? `/api/organisations/${org.id}/risk/parcel-seasons/${encodeURIComponent(parcelSeasonId)}/summary` : null);
  // Components the user has unticked. Empty means the stored result as it is.
  const [off, setOff] = useState<Set<string>>(new Set());

  const current = data?.current ?? null;
  const view = useMemo(() => {
    if (!current) return null;
    const used = current.components.filter((c) => c.established && c.score !== null && !off.has(c.key));
    const weight = used.reduce((s, c) => s + c.weight, 0);
    const sum = used.reduce((s, c) => s + (c.score ?? 0) * c.weight, 0);
    return { weight, sum, value: weight > 0 ? sum / weight : null, whatIf: off.size > 0 };
  }, [current, off]);

  if (error) return <><PageHeader crumb="" title="" /><ErrorLine error={error} onRetry={reload} /></>;
  if (loading || !data) return <Loading />;

  const { subject } = data;
  const back = <a className="zr-btn" href={hrefs.farm(subject.farmId, subject.season)}>{t('parcel.back')}</a>;
  const header = <PageHeader crumb={t('parcel.crumb', { org: org?.name ?? '', farm: subject.farmName ?? subject.farmId })} title={t('parcel.title', { label: subject.label })} actions={back} />;

  if (!current || !view) {
    return (
      <>
        {header}
        <div className="flex flex-col gap-4">
          <MethodBanner method={data.method.id} />
          <p className="muted">{t('parcel.none')}</p>
        </div>
      </>
    );
  }

  const toggle = (key: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const sub = current.closedSeasons === null
    ? t('parcel.subNoSeasons', { area: fmt(subject.areaFeddan), crop: cropName(subject.crop) })
    : t('parcel.sub', { area: fmt(subject.areaFeddan), crop: cropName(subject.crop), seasons: current.closedSeasons });

  return (
    <>
      {header}
      <div className="flex flex-col gap-4">
        <MethodBanner method={data.method.id} />
        {current.insufficient ? <div className="banner neutral" role="note"><span>{t('parcel.insufficient')}</span></div> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card flex items-start gap-4" aria-labelledby="cri">
            {current.band ? <RiskBand band={current.band.band} /> : null}
            <div>
              <p id="cri" className="eyebrow m-0">{t('parcel.cri')}</p>
              <p className="m-0 font-mono text-5xl leading-tight"><Num>{fmt(current.value)}</Num></p>
              <p className="muted m-0 text-sm">
                {sub}
                {current.band ? <> · {t('parcel.percentile', { p: fmt(current.band.percentile, 0) })}</> : null}
              </p>
              {current.band ? null : <p className="zr-hint mt-2 mb-0">{t('parcel.noBand')}</p>}
            </div>
          </section>

          <section className="card" aria-labelledby="prov">
            <h2 id="prov" className="eyebrow m-0">{t('parcel.prov.title')}</h2>
            <p className="my-2"><MaturityBadge /></p>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="muted">{t('maturity.method')}</dt>
              <dd className="m-0"><Num>{current.method.id}</Num></dd>
              <dt className="muted">{t('parcel.prov.hash')}</dt>
              <dd className="m-0 font-mono" title={current.inputSha256}><Num>{shortHash(current.inputSha256)}</Num></dd>
              <dt className="muted">{t('parcel.prov.computed')}</dt>
              <dd className="m-0 font-mono"><Num>{fmtUtc(current.createdAt)}</Num></dd>
            </dl>
          </section>
        </div>

        <section className="card" aria-labelledby="components">
          <h2 id="components" className="title">{t('parcel.comp.title')}</h2>
          <p className="muted mt-0 text-sm">{t('parcel.comp.intro')}</p>
          <table className="zr-t">
            <thead>
              <tr>
                <th>{t('col.use')}</th>
                <th>{t('col.component')}</th>
                <th>{t('col.feature')}</th>
                <th className="num !font-display">{t('col.value')}</th>
                <th className="num !font-display">{t('col.weight')}</th>
                <th className="num !font-display">{t('col.contribution')}</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {current.components.map((c) => {
                const on = c.established && !off.has(c.key);
                const contribution = on && view.weight > 0 && c.score !== null ? (c.score * c.weight) / view.weight : null;
                const feature = c.feature === null ? '' : c.feature === 'yield_history' ? t('feature.yield_history') : `${c.feature}${c.featureValue === null ? '' : ' ' + fmt(c.featureValue)}`;
                return (
                  <tr key={c.key} className={c.established ? undefined : 'muted'}>
                    <td>
                      <input type="checkbox" className="size-5 accent-brand" checked={on} disabled={!c.established} onChange={() => toggle(c.key)} aria-label={t(`component.${c.key}` as MessageKey)} />
                    </td>
                    <td className="font-semibold">{t(`component.${c.key}` as MessageKey)}</td>
                    <td className={c.established && c.feature !== 'yield_history' ? 'font-mono text-xs' : 'text-sm'}><Num>{c.established ? feature : t('parcel.comp.notEstablished')}</Num></td>
                    <td className="num">{c.score === null ? t('common.none') : fmt(c.score)}</td>
                    <td className="num">{fmt(c.weight, 0)}</td>
                    <td className="num">{contribution === null ? t('common.none') : fmt(contribution, 2)}</td>
                    <td className="w-40">
                      {c.score !== null ? (
                        <div className="h-3 rounded-sm bg-sunken" aria-hidden="true">
                          <div className={`h-3 rounded-sm ${on ? 'bg-zr-field' : 'bg-line-strong'}`} style={{ width: `${Math.min(100, Math.max(0, c.score))}%` }} />
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm">
              {view.value === null
                ? t('parcel.noneEstablished')
                : t('parcel.formula', { sum: fmt(view.sum), weight: fmt(view.weight, 0), value: fmt(view.value) })}
              {view.whatIf ? <> {t('parcel.whatif', { value: fmt(current.value) })}</> : null}
            </p>
            <button type="button" className="zr-btn" onClick={() => setOff(new Set())} disabled={!view.whatIf}>
              {t('parcel.restore')}
            </button>
          </div>
        </section>
        <p className="muted text-sm">{t('parcel.weights')}</p>
      </div>
    </>
  );
}
