import { useState } from 'react';
import type { FindingRow, ObservationRow, ParcelItem } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, Num, PageHeader, VerdictPill, useCropName } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmt, fmtUtc, shortHash } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';
import { hrefs } from '../router';

/**
 * Parcel evidence: declared against measured with the noise, each finding with its own verdict, the method and provenance behind it
 * (with hashes), and the scene observations. Anything a finding rests on is on this page. It states facts; a person decides.
 */
export function ParcelEvidence({ id, season: routeSeason }: { id: string; season: string | null }) {
  const { t } = useLang();
  const { org } = useAuth();
  const cropName = useCropName();
  const season = routeSeason ?? DEFAULT_SEASON;
  const base = org ? `/api/organisations/${org.id}` : null;
  const parcel = useApi<ParcelItem>(base ? `${base}/parcels/${encodeURIComponent(id)}?season=${season}` : null);
  const findings = useApi<FindingRow[]>(base ? `${base}/parcels/${encodeURIComponent(id)}/findings` : null);
  const observations = useApi<ObservationRow[]>(base ? `${base}/parcels/${encodeURIComponent(id)}/observations` : null);
  const [showHistory, setShowHistory] = useState(false);

  const back = <a className="zr-btn" href="#/parcels">{t('ev.back')}</a>;
  if (parcel.error) return <><PageHeader crumb="" title="" actions={back} /><ErrorLine error={parcel.error} onRetry={parcel.reload} /></>;
  if (parcel.loading || !parcel.data) return <Loading />;

  const p = parcel.data;
  const mine = (findings.data ?? []).filter((f) => f.season === season);
  const current = mine.filter((f) => f.current);
  const older = mine.filter((f) => !f.current);
  const area = current.find((f) => f.type === 'area_gap' || (f.area !== null));
  const reasonText = (reason: string | null) => (reason && hasMessage(`ev.reason.${reason}`) ? t(`ev.reason.${reason}` as never) : reason ?? '');

  return (
    <>
      <PageHeader
        crumb={t('ev.crumb', { org: org?.name ?? '', farm: p.farmName, season })}
        title={t('ev.title', { label: p.label })}
        actions={<><a className="zr-btn" href={hrefs.parcelImagery(p.id, season)}>{t('par.imagery')}</a>{back}</>}
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3"><VerdictPill status={p.finding?.status} reason={p.finding?.reason} /><span className="muted text-sm">{p.farmName} · {cropName(p.crop)}</span></div>

        <section className="card" aria-labelledby="dvm">
          <h2 id="dvm" className="title">{t('ev.declaredVsMeasured')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><div className="muted text-sm">{t('par.col.declared')}</div><div className="display"><Num>{fmt(p.declaredAreaFeddan)}</Num></div></div>
            <div><div className="muted text-sm">{t('par.col.measured')}</div><div className="display"><Num>{fmt(p.measuredAreaFeddan)}</Num></div></div>
            <div><div className="muted text-sm">{t('ev.gap')}</div><div className="display"><Num>{area?.area ? `${fmt(area.area.gapPercent, 0)}%` : '—'}</Num></div></div>
            <div><div className="muted text-sm">{t('ev.noise')}</div><div className="display"><Num>{area?.area ? `±${fmt(area.area.noisePercent, 1)}%` : '—'}</Num></div></div>
          </div>
          {area?.area && hasMessage(`ev.direction.${area.area.direction}`) ? <p className="mt-3 mb-0">{t(`ev.direction.${area.area.direction}` as never)}</p> : null}
        </section>

        <section className="card" aria-labelledby="findings">
          <h2 id="findings" className="title">{t('ev.findings')}</h2>
          {findings.loading ? <Loading /> : null}
          {findings.error ? <ErrorLine error={findings.error} onRetry={findings.reload} /> : null}
          {!findings.loading && current.length === 0 ? <p className="muted">{t('ev.noFindings')}</p> : null}
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {current.map((f) => <FindingCard key={f.id} f={f} reasonText={reasonText} />)}
          </ul>
          {older.length > 0 ? (
            <>
              <button type="button" className="zr-btn mt-3" aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)}>{t('ev.history')} <Num>{older.length}</Num></button>
              {showHistory ? <ul className="mt-3 mb-0 flex list-none flex-col gap-3 p-0 opacity-80">{older.map((f) => <FindingCard key={f.id} f={f} reasonText={reasonText} old />)}</ul> : null}
            </>
          ) : null}
        </section>

        {current[0] ? (
          <section className="card" aria-labelledby="prov">
            <h2 id="prov" className="title">{t('ev.prov.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="muted">{t('ev.prov.method')}</dt><dd className="m-0"><Num>{current[0].method.id} v{current[0].method.version}</Num></dd>
              <dt className="muted">{t('ev.prov.state')}</dt><dd className="m-0"><Num>{current[0].method.state}</Num></dd>
              <dt className="muted">{t('ev.prov.params')}</dt><dd className="m-0 font-mono" title={current[0].method.parametersSha256}><Num>{shortHash(current[0].method.parametersSha256)}</Num></dd>
              <dt className="muted">{t('ev.prov.boundary')}</dt><dd className="m-0 font-mono" title={current[0].boundary.geometrySha256}><Num>{shortHash(current[0].boundary.geometrySha256)}</Num></dd>
              {current.find((f) => f.cropRule) ? (
                <><dt className="muted">{t('ev.prov.rule')}</dt><dd className="m-0"><Num>{current.find((f) => f.cropRule)!.cropRule!.source}</Num></dd></>
              ) : null}
              <dt className="muted">{t('ev.prov.accuracy')}</dt><dd className="m-0 font-mono"><Num>{current[0].accuracyRef}</Num></dd>
              <dt className="muted">{t('ev.prov.created')}</dt><dd className="m-0 font-mono"><Num>{fmtUtc(current[0].createdAt)}</Num></dd>
            </dl>
            {current[0].method.state === 'draft' ? <p className="mt-3 mb-0 text-sm">{t('ev.prov.draft')}</p> : null}
            <p className="mt-2 mb-0 text-sm"><b>{t('ev.prov.accuracyNote')}</b></p>
          </section>
        ) : null}

        <section className="card !p-0 overflow-hidden" aria-labelledby="obs">
          <h2 id="obs" className="title px-4 py-3">{t('ev.obs.title')}</h2>
          {observations.loading ? <div className="px-4 pb-3"><Loading /></div> : null}
          {observations.data && observations.data.length === 0 ? <p className="muted px-4 pb-3">{t('ev.obs.none')}</p> : null}
          {observations.data && observations.data.length > 0 ? (
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('ev.obs.date')}</th>
                  <th className="num !font-display">{t('ev.obs.usable')}</th>
                  <th className="num !font-display">{t('ev.obs.ndvi')}</th>
                  <th>{t('ev.obs.readable')}</th>
                </tr>
              </thead>
              <tbody>
                {observations.data.map((o) => (
                  <tr key={o.sceneId}>
                    <td className="font-mono text-xs"><Num>{fmtUtc(o.sensingTime).slice(0, 10)} · {o.sceneId}</Num></td>
                    <td className="num"><Num>{o.usablePixels} / {o.fullPixels}</Num></td>
                    <td className="num">{o.ndvi ? fmt(o.ndvi.median, 2) : t('common.none')}</td>
                    <td>{o.readable ? t('ev.yes') : t('ev.no')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </div>
    </>
  );
}

function FindingCard({ f, reasonText, old }: { f: FindingRow; reasonText: (r: string | null) => string; old?: boolean }) {
  const { t } = useLang();
  return (
    <li className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b>{hasMessage(`ev.type.${f.type}`) ? t(`ev.type.${f.type}` as never) : f.type}</b>
        <VerdictPill status={f.status === 'MEASURED' ? 'MEASURED' : f.status} reason={f.reason} />
      </div>
      {f.reason ? <p className="mt-2 mb-0 text-sm">{reasonText(f.reason)}</p> : null}
      {f.crop ? (
        <p className="muted mt-2 mb-0 text-sm">
          {t('ev.scenes', { n: f.crop.scenesUsed, p: f.crop.passesUsed })}
          {f.crop.maxNdvi !== null ? <> · {t('ev.maxNdvi', { v: fmt(f.crop.maxNdvi, 2) })}</> : null}
          {f.crop.rulesTested.length > 0 ? <> · {t('ev.rules')}: <span className="font-mono"><Num>{f.crop.rulesTested.join(', ')}</Num></span></> : null}
        </p>
      ) : null}
      {old ? <p className="muted mt-2 mb-0 text-sm">{t('ev.replaced')} · <Num>{fmtUtc(f.createdAt)}</Num></p> : null}
    </li>
  );
}
