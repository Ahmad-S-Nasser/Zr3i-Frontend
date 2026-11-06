import { Fragment, useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import { can, useAuth } from '../auth/AuthProvider';
import { ErrorLine, Kpi, Loading, NotAssessable, Num, PageHeader } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmt, fmtUtc, shortHash } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hrefs } from '../router';
import { ChipImage } from './ParcelImagery';

interface ParcelRow {
  parcelId: string;
  label: string;
  farmName: string;
  status: 'usable' | 'scene_lost' | 'below_resolution' | 'not_read';
  fullPixels: number | null;
  usablePixels: number | null;
  lostShare: number | null;
  ndviMedian: number | null;
  chips: { id: string; kind: string }[];
}

interface Detail {
  scene: { sceneId: string; sensingTime: string; tile: string; platform: string; cloudCover: number; attribution: string; processingBaseline: string; itemSha256: string };
  total: number;
  parcels: ParcelRow[];
}

const madeBoth = (r: ParcelRow) => r.chips.some((c) => c.kind === 'true_colour') && r.chips.some((c) => c.kind === 'ndvi');

/**
 * One scene and every parcel of the organisation under it: what the reading found (usable share, NDVI) and the pictures. Parcels are listed
 * by label, never by value. A parcel the scene could not see is "not assessable", and one too small to test is "below resolution", never "no crop".
 */
export function SceneDetail({ sceneId }: { sceneId: string }) {
  const { t } = useLang();
  const { org } = useAuth();
  const base = org ? `/api/organisations/${org.id}` : null;
  const detail = useApi<Detail>(base ? `${base}/imagery/scenes/${encodeURIComponent(sceneId)}` : null);
  const canMake = org !== null && can(org.permissions, 'kernel:imagery:write');
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const reload = detail.reload;

  const rows = detail.data?.parcels ?? [];
  const waiting = rows.some((r) => asked.has(r.parcelId) && !madeBoth(r));

  // While the worker makes pictures, look again every few seconds; stop asking after two minutes so a failed job does not poll forever.
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(reload, 3000);
    const stop = window.setTimeout(() => setAsked(new Set()), 120000);
    return () => { window.clearInterval(timer); window.clearTimeout(stop); };
  }, [waiting, reload]);

  async function make(parcelId: string): Promise<boolean> {
    try {
      await api(`${base}/parcels/${encodeURIComponent(parcelId)}/chips`, { method: 'POST', body: { sceneId } });
      setAsked((prev) => new Set(prev).add(parcelId));
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
      return false;
    }
  }

  async function makeAll() {
    setError(null);
    setBulk(true);
    for (const r of rows.filter((x) => x.status === 'usable' && !madeBoth(x))) if (!(await make(r.parcelId))) break;
    setBulk(false);
    reload();
  }

  const toggle = (id: string) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const back = <a className="zr-btn" href="#/satellite">{t('scn.back')}</a>;

  if (detail.error) return <><PageHeader crumb="" title="" actions={back} /><ErrorLine error={detail.error} onRetry={detail.reload} /></>;
  if (detail.loading && !detail.data) return <Loading />;
  if (!detail.data) return <Loading />;
  const d = detail.data;
  const usable = rows.filter((r) => r.status === 'usable');
  const toMake = usable.filter((r) => !madeBoth(r));

  const status = (r: ParcelRow) => {
    if (r.status === 'usable') return t('scn.status.usable');
    if (r.status === 'scene_lost') return <NotAssessable>{t('scn.status.lost')}</NotAssessable>;
    if (r.status === 'below_resolution') return <NotAssessable>{t('scn.status.below')}</NotAssessable>;
    return <span className="muted">{t('scn.status.notRead')}</span>;
  };

  return (
    <>
      <PageHeader crumb={t('scn.crumb', { org: org?.name ?? '' })} title={fmtUtc(d.scene.sensingTime).slice(0, 10)} actions={back} />
      <div className="flex flex-col gap-4">
        <section className="card">
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
            <dt className="muted">{t('scn.scene')}</dt><dd className="m-0 font-mono"><Num>{d.scene.sceneId}</Num></dd>
            <dt className="muted">{t('sat.col.cloud')}</dt><dd className="m-0 font-mono"><Num>{fmt(d.scene.cloudCover, 0)}%</Num></dd>
            <dt className="muted">{t('scn.tile')}</dt><dd className="m-0 font-mono"><Num>{d.scene.tile} · {d.scene.platform}</Num></dd>
            <dt className="muted">{t('scn.baseline')}</dt><dd className="m-0 font-mono"><Num>{d.scene.processingBaseline}</Num></dd>
            <dt className="muted">{t('scn.item')}</dt><dd className="m-0 font-mono text-xs" title={d.scene.itemSha256}><Num>{shortHash(d.scene.itemSha256)}</Num></dd>
          </dl>
          <p className="muted m-0 mt-2 text-xs">{d.scene.attribution}</p>
        </section>

        <div className="grid grid-cols-3 gap-4">
          <Kpi label={t('sat.col.under')} value={<Num>{d.total}</Num>} />
          <Kpi label={t('sat.col.usable')} value={<Num>{usable.length}</Num>} />
          <Kpi label={t('scn.kpi.pictures')} value={<Num>{rows.filter(madeBoth).length}</Num>} />
        </div>

        {error ? <ErrorLine error={error} /> : null}

        <section className="card !p-0 overflow-hidden" aria-labelledby="scn-list">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <h2 id="scn-list" className="title">{t('scn.parcels')}</h2>
              {d.total > rows.length ? <p className="muted m-0 text-sm">{t('sat.shown', { shown: rows.length, total: d.total })}</p> : null}
            </div>
            {canMake && toMake.length > 0 ? <button type="button" className="zr-btn primary" disabled={bulk} onClick={() => void makeAll()}>{t(bulk ? 'chip.making' : 'scn.makeAll', { n: toMake.length })}</button> : null}
          </div>
          {rows.length === 0 ? <p className="muted px-4 pb-3">{t('scn.none')}</p> : (
            <table className="zr-t">
              <thead>
                <tr>
                  <th>{t('col.parcel')}</th>
                  <th>{t('col.farm')}</th>
                  <th>{t('sat.col.read')}</th>
                  <th className="num !font-display">{t('scn.col.share')}</th>
                  <th className="num !font-display">{t('ev.obs.ndvi')}</th>
                  <th>{t('chip.title')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pending = asked.has(r.parcelId) && !madeBoth(r);
                  const share = r.usablePixels !== null && r.fullPixels ? (r.usablePixels / r.fullPixels) * 100 : null;
                  return (
                    <Fragment key={r.parcelId}>
                      <tr>
                        <td><a className="text-link underline" href={hrefs.parcelImagery(r.parcelId, DEFAULT_SEASON)}><Num>{r.label}</Num></a></td>
                        <td>{r.farmName}</td>
                        <td>{status(r)}</td>
                        <td className="num">{share === null ? t('common.none') : <Num>{r.usablePixels} / {r.fullPixels} · {fmt(share, 0)}%</Num>}</td>
                        <td className="num">{r.ndviMedian === null ? t('common.none') : <Num>{fmt(r.ndviMedian, 2)}</Num>}</td>
                        <td>
                          {madeBoth(r)
                            ? <button type="button" className="zr-btn" aria-expanded={open.has(r.parcelId)} onClick={() => toggle(r.parcelId)}>{t(open.has(r.parcelId) ? 'scn.hide' : 'scn.show')}</button>
                            : r.status === 'usable' && canMake
                              ? <button type="button" className="zr-btn" disabled={pending} onClick={() => void make(r.parcelId)}>{t(pending ? 'chip.making' : 'chip.make')}</button>
                              : <span className="muted">{t('common.none')}</span>}
                        </td>
                      </tr>
                      {open.has(r.parcelId) && madeBoth(r) ? (
                        <tr>
                          <td colSpan={6}>
                            <div className="grid gap-4 py-2 sm:grid-cols-2">
                              {(['true_colour', 'ndvi'] as const).map((kind) => {
                                const c = r.chips.find((x) => x.kind === kind)!;
                                return <ChipImage key={kind} orgId={org!.id} parcelId={r.parcelId} chip={{ id: c.id, kind, widthPx: 320, heightPx: 320, attribution: '', sha256: '', sceneId }} label={t(kind === 'ndvi' ? 'chip.ndvi' : 'chip.trueColour')} />;
                              })}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{t('scn.note')}</p>
        </section>
      </div>
    </>
  );
}
