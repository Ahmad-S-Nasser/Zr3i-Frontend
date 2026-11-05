import type { FarmParcelRow, FarmSummary } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { RequestReportButton } from '../components/RequestReport';
import { ErrorLine, Kpi, Loading, MaturityBadge, MethodBanner, NotAssessable, Num, PageHeader, RiskBand, useCropName } from '../components/ui';
import { fmt } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import type { MessageKey } from '../i18n/messages';
import { hrefs } from '../router';

const ADJUSTMENTS = ['crop_concentration', 'spatial_concentration', 'irrigation_diversity', 'record_length', 'worst_parcel_exposure'] as const;

function signed(n: number): string {
  return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
}

/** Farm risk page: the FRI and how it is built, where the exposure sits, and every parcel (by id, never by value). */
export function FarmRisk({ farmId, season }: { farmId: string; season: string }) {
  const { t } = useLang();
  const { org } = useAuth();
  const cropName = useCropName();
  const { data, error, loading, reload } = useApi<FarmSummary>(org ? `/api/organisations/${org.id}/risk/farms/${encodeURIComponent(farmId)}/seasons/${encodeURIComponent(season)}/summary` : null);

  const back = <a className="zr-btn" href={hrefs.farms(season)}>{t('farm.back')}</a>;
  if (error) return <><PageHeader crumb="" title="" actions={back} /><ErrorLine error={error} onRetry={reload} /></>;
  if (loading || !data) return <Loading />;

  const s = data;
  const fri = s.fri;
  const withArea = s.parcels.filter((p) => p.areaFeddan !== null && p.areaFeddan > 0);
  const areaTotal = withArea.reduce((sum, p) => sum + (p.areaFeddan ?? 0), 0);
  const areaCriTotal = s.parcels.reduce((sum, p) => sum + (p.areaTimesCri ?? 0), 0);
  const adjustments = new Map((fri?.adjustments ?? []).map((a) => [a.key, a.value]));

  return (
    <>
      <PageHeader crumb={t('farm.crumb', { org: org?.name ?? '', season: s.season })} title={t('farm.title', { name: s.farm.name })} actions={<>{back}<RequestReportButton kind="farm_risk" subjectId={s.farm.id} season={s.season} label={t('rep.farm.report')} /></>} />
      <div className="flex flex-col gap-4">
        <MethodBanner method={s.method.id} />
        {s.friStale ? <div className="banner neutral" role="note"><span>{t('farm.stale')}</span></div> : null}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label={t('farm.kpi.fri')} value={fri ? <Num>{fmt(fri.value)}</Num> : t('common.none')} />
          <Kpi label={t('farm.kpi.area')} value={<Num>{fmt(s.totalAreaFeddan)}</Num>} />
          <Kpi label={t('farm.kpi.parcels')} value={<Num>{fmt(s.parcelCount, 0)}</Num>} />
          <Kpi label={t('farm.kpi.seasons')} value={s.seasonsOnFile === null ? t('common.none') : <Num>{fmt(s.seasonsOnFile, 0)}</Num>} />
        </div>

        <div className="card flex flex-wrap items-center gap-4 self-start">
          <div>
            <p className="eyebrow m-0">{t('farm.pct.title')}</p>
            <p className="m-0 font-semibold">{t('band.farmCohort')}</p>
            <p className="zr-hint m-0 max-w-xs">{t('farm.pct.hint')}</p>
          </div>
          {fri ? <MaturityBadge /> : null}
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <section className="card" aria-labelledby="built">
            <h2 id="built" className="title">{t('farm.built.title')}</h2>
            <p className="muted mt-0 text-sm">{t('farm.built.sub')}</p>
            {fri ? (
              <table className="zr-t">
                <tbody>
                  <tr className="font-bold">
                    <td className="bg-zr-mist">{t('farm.built.awcri')}</td>
                    <td className="num bg-zr-mist"><Num>{fmt(s.awcri)}</Num></td>
                  </tr>
                  {ADJUSTMENTS.map((k) => {
                    const v = adjustments.get(k) ?? null;
                    return (
                      <tr key={k}>
                        <td>{t(`adjustment.${k}` as MessageKey)}</td>
                        <td className="num">{v === null ? <span className="muted font-sans">{t('adjustment.notApplied')}</span> : <Num>{signed(v)}</Num>}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-bold">
                    <td className="bg-zr-mist">{t('farm.built.sum')}</td>
                    <td className="num bg-zr-mist"><Num>{signed(s.adjustmentsSum)}</Num></td>
                  </tr>
                  <tr className="font-bold">
                    <td className="bg-zr-mist">{t('farm.built.fri')}</td>
                    <td className="num bg-zr-mist"><Num>{fmt(fri.value)}</Num></td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="muted">{t('farm.noFri')}</p>
            )}
            {fri ? <p className="mt-3 mb-0"><MaturityBadge /> <span className="muted text-sm">{t('maturity.method')} <Num>{fri.method.id}</Num></span></p> : null}
          </section>

          <section className="card" aria-labelledby="exposure">
            <h2 id="exposure" className="title">{t('farm.exposure.title')}</h2>
            {s.exposure ? (
              <p>
                {t('farm.exposure.text', {
                  label: s.exposure.label,
                  crop: cropName(s.exposure.crop),
                  area: fmt(s.exposure.areaFeddan),
                  cri: fmt(s.exposure.cri, 0),
                  without: fmt(s.exposure.awcriWithout),
                  share: fmt(s.exposure.areaSharePercent),
                })}
              </p>
            ) : (
              <p className="muted">{t('farm.exposure.none')}</p>
            )}
            <h3 className="m-0 text-sm font-semibold">{t('farm.share.title')}</h3>
            <ShareBar parcels={withArea} total={areaTotal} />
            <p className="zr-hint mt-2 mb-0">{t('farm.share.hint')}</p>
          </section>
        </div>

        <section className="card !p-0 overflow-hidden" aria-labelledby="parcels">
          <h2 id="parcels" className="title px-4 py-3">{t('farm.parcels.title')}</h2>
          <table className="zr-t">
            <thead>
              <tr>
                <th>{t('col.parcel')}</th>
                <th>{t('col.crop')}</th>
                <th className="num !font-display">{t('col.area')}</th>
                <th className="num !font-display">{t('col.cri')}</th>
                <th>{t('col.band')}</th>
                <th className="num !font-display">{t('col.areaCri')}</th>
              </tr>
            </thead>
            <tbody>
              {s.parcels.map((p) => (
                <ParcelRow key={p.parcelSeasonId} p={p} cropName={cropName(p.crop)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={2}>{t('farm.total')}</td>
                <td className="num"><Num>{fmt(s.totalAreaFeddan)}</Num></td>
                <td />
                <td />
                <td className="num"><Num>{fmt(areaCriTotal)}</Num></td>
              </tr>
            </tfoot>
          </table>
          <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{t('farm.parcels.note')}</p>
        </section>
      </div>
    </>
  );
}

function ParcelRow({ p, cropName }: { p: FarmParcelRow; cropName: string }) {
  const { t } = useLang();
  return (
    <tr>
      <td><a className="text-link underline" href={hrefs.parcel(p.parcelSeasonId)}><Num>{p.label}</Num></a></td>
      <td>{cropName}</td>
      <td className="num">{p.areaFeddan === null ? t('common.none') : fmt(p.areaFeddan)}</td>
      <td className="num">{p.cri === null ? t('common.none') : fmt(p.cri)}</td>
      <td>
        {p.status !== 'included' ? (
          <NotAssessable>{t(`status.${p.status}` as MessageKey)}</NotAssessable>
        ) : p.band ? (
          <span className="inline-flex items-center gap-2"><RiskBand band={p.band.band} /><Num>{fmt(p.band.percentile, 0)}</Num></span>
        ) : (
          <span className="muted">{t(p.bandReason === 'no_declared_crop' ? 'band.noCrop' : 'band.noRef')}</span>
        )}
      </td>
      <td className="num">{p.areaTimesCri === null ? t('common.none') : fmt(p.areaTimesCri)}</td>
    </tr>
  );
}

/** Segment widths are parcel areas. Segments take the parcel's band colour once a reference gives it one, and stay neutral until then. */
function ShareBar({ parcels, total }: { parcels: FarmParcelRow[]; total: number }) {
  const { t } = useLang();
  if (total <= 0) return null;
  return (
    <div className="vbar mt-2" role="list" aria-label={t('farm.share.title')}>
      {parcels.map((p) => {
        const band = p.band?.band;
        const text = `${p.label} · ${fmt(p.areaFeddan)} fd${band ? ` · ${band}` : ''}`;
        return (
          <i
            key={p.parcelSeasonId}
            role="listitem"
            tabIndex={0}
            title={text}
            aria-label={text}
            style={{ width: `${((p.areaFeddan ?? 0) / total) * 100}%`, background: band ? `var(--band-${band.toLowerCase()})` : 'var(--line-strong)', borderInlineEnd: '1px solid var(--surface)' }}
          />
        );
      })}
    </div>
  );
}
