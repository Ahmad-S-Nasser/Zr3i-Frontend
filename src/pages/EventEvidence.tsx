import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import type { FarmList } from '../api/types';
import { can, useAuth } from '../auth/AuthProvider';
import { ErrorLine, Kpi, Loading, NotAssessable, Num, PageHeader } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmt, fmtUtc } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hasMessage } from '../i18n/messages';
import { hrefs } from '../router';

interface EventWindow {
  id: string;
  name: string;
  season: string;
  from: string;
  to: string;
  parcelCount: number;
}

interface Scene {
  sceneId: string;
  sensingTime: string;
  ndvi: number;
}

interface Evidence {
  window: EventWindow;
  coveredParcels: number;
  coveredFarms: number;
  parcelsWithEvidence: number;
  parcels: { id: string; label: string; farmName: string; before: Scene | null; after: Scene | null; ndviChange: number | null; status: string; reason: string | null }[];
}

/** Event evidence: for the organisation's own parcels, the nearest clear scene before and after an event window, with their NDVI. Numbers only. */
export function EventEvidence() {
  const { t } = useLang();
  const { org } = useAuth();
  const list = useApi<EventWindow[]>(org ? `/api/organisations/${org.id}/event-windows` : null);
  const [selected, setSelected] = useState<string | null>(null);
  const current = list.data?.find((x) => x.id === selected) ?? list.data?.[0] ?? null;
  const ev = useApi<Evidence>(org && current ? `/api/organisations/${org.id}/event-windows/${current.id}/evidence` : null);
  const canWrite = org !== null && can(org.permissions, 'kernel:events:write');
  const day = (iso: string) => fmtUtc(iso).slice(5, 10);

  return (
    <>
      <PageHeader crumb={t('evt.crumb', { org: org?.name ?? '', season: current?.season ?? DEFAULT_SEASON })} title={t('evt.title')} />
      <div className="flex flex-col gap-4">
        {list.error ? <ErrorLine error={list.error} onRetry={list.reload} /> : null}
        {list.loading ? <Loading /> : null}
        {list.data && list.data.length === 0 ? <p className="muted">{t('evt.none')}</p> : null}

        {list.data && list.data.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('evt.window')}>
              <span className="muted text-sm">{t('evt.window')}</span>
              {list.data.map((w) => (
                <button key={w.id} type="button" className="zr-chip" aria-pressed={w.id === current?.id} onClick={() => setSelected(w.id)}>{w.name} · <Num>{w.from} → {w.to}</Num></button>
              ))}
            </div>

            {ev.error ? <ErrorLine error={ev.error} onRetry={ev.reload} /> : null}
            {ev.loading ? <Loading /> : null}
            {ev.data ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Kpi label={t('evt.kpi.farms')} value={<Num>{ev.data.coveredFarms}</Num>} />
                  <Kpi label={t('evt.kpi.parcels')} value={<Num>{ev.data.coveredParcels}</Num>} />
                  <Kpi label={t('evt.kpi.evidence')} value={<Num>{ev.data.parcelsWithEvidence}</Num>} />
                </div>

                <section className="card !p-0 overflow-hidden" aria-labelledby="shows">
                  <div className="px-4 py-3">
                    <h2 id="shows" className="title">{t('evt.shows')}</h2>
                    <p className="muted m-0 text-sm">{t('evt.compared', { from: ev.data.window.from, to: ev.data.window.to })}</p>
                  </div>
                  <table className="zr-t">
                    <thead>
                      <tr>
                        <th>{t('col.parcel')}</th>
                        <th className="num !font-display">{t('evt.col.observed')}</th>
                        <th>{t('evt.col.scenes')}</th>
                        <th>{t('evt.col.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ev.data.parcels.map((p) => (
                        <tr key={p.id}>
                          <td><a className="text-link underline" href={hrefs.parcelEvidence(p.id, ev.data!.window.season)}><Num>{p.label}</Num></a><div className="muted text-xs">{p.farmName}</div></td>
                          <td className="num">
                            {p.before && p.after ? <Num>{fmt(p.before.ndvi, 2)} → {fmt(p.after.ndvi, 2)}<br /><span className="muted">{t('evt.change', { v: (p.ndviChange! > 0 ? '+' : '') + fmt(p.ndviChange, 2) })}</span></Num> : t('common.none')}
                          </td>
                          <td className="font-mono text-xs"><Num>{p.before ? day(p.before.sensingTime) : '—'} · {p.after ? day(p.after.sensingTime) : '—'}</Num></td>
                          <td>
                            {p.status === 'compared' ? <span className="pill confirmed">{t('evt.status.compared')}</span>
                              : <NotAssessable>{p.reason && hasMessage(`evt.reason.${p.reason}`) ? t(`evt.reason.${p.reason}` as never) : t('ver.notAssessable')}</NotAssessable>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{t('evt.note')}</p>
                </section>
              </>
            ) : null}
          </>
        ) : null}

        {canWrite ? <NewWindow onCreated={(id) => { setSelected(id); list.reload(); }} /> : null}
      </div>
    </>
  );
}

function NewWindow({ onCreated }: { onCreated: (id: string) => void }) {
  const { t } = useLang();
  const { org } = useAuth();
  const farms = useApi<FarmList>(org ? `/api/organisations/${org.id}/farms?pageSize=200` : null);
  const [name, setName] = useState('');
  const [season, setSeason] = useState(DEFAULT_SEASON);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [ids, setIds] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => setError(null), [name, season, from, to, ids]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: string }>(`/api/organisations/${org.id}/event-windows`, {
        method: 'POST',
        body: { name, season, from, to, farmIds: [...chosen], parcelExternalIds: ids.split('\n').map((x) => x.trim()).filter(Boolean) },
      });
      setName('');
      setIds('');
      setChosen(new Set());
      onCreated(r.id);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'network'));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id: string) => setChosen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3" noValidate>
      <h2 className="title">{t('evt.new.title')}</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="zr-field"><label htmlFor="en">{t('evt.new.name')}</label><input id="en" className="zr-in" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="zr-field"><label htmlFor="es">{t('trn.new.season')}</label><input id="es" dir="ltr" className="zr-in" value={season} onChange={(e) => setSeason(e.target.value)} /></div>
        <div className="zr-field"><label htmlFor="ef">{t('evt.new.from')}</label><input id="ef" type="date" dir="ltr" className="zr-in" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="zr-field"><label htmlFor="et">{t('evt.new.to')}</label><input id="et" type="date" dir="ltr" className="zr-in" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t('trn.new.farms')}</legend>
        <div className="flex flex-wrap gap-2">
          {(farms.data?.items ?? []).map((f) => (
            <label key={f.id} className="zr-chip cursor-pointer gap-2"><input type="checkbox" className="accent-brand" checked={chosen.has(f.id)} onChange={() => toggle(f.id)} />{f.name}</label>
          ))}
        </div>
      </fieldset>
      <div className="zr-field">
        <label htmlFor="ei">{t('trn.new.ids')}</label>
        <textarea id="ei" dir="ltr" rows={3} className="zr-in !py-2 font-mono text-sm" value={ids} onChange={(e) => setIds(e.target.value)} />
      </div>
      {error ? <ErrorLine error={error} /> : null}
      <button type="submit" className="zr-btn primary self-start" disabled={busy || !name.trim() || !from || !to}>{t('evt.new.create')}</button>
    </form>
  );
}
