import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import type { FarmList, ParcelItem } from '../api/types';
import { can, useAuth } from '../auth/AuthProvider';
import { RequestReportButton } from '../components/RequestReport';
import { ErrorLine, Loading, Num, PageHeader, VerdictPill } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmt } from '../format';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';
import { hrefs } from '../router';

interface Tranche {
  id: string;
  name: string;
  season: string;
  scheduledDate: string | null;
  parcelCount: number;
}

interface Check {
  tranche: Tranche;
  verdicts: Record<string, number>;
  accuracy: string;
  needsALookTotal: number;
  needsALook: ParcelItem[];
}

const CARDS = [
  { key: 'MEASURED', label: 'ver.confirmed', text: 'trn.card.confirmed', pill: 'confirmed' },
  { key: 'FLAGGED', label: 'ver.flagged', text: 'trn.card.flagged', pill: 'flagged' },
  { key: 'PENDING', label: 'ver.pending', text: 'trn.card.pending', pill: 'pending' },
  { key: 'NOT_ASSESSABLE', label: 'ver.notAssessable', text: 'trn.card.notAssessable', pill: 'na' },
] as const;

/** Tranche check: the organisation's own groups of parcels, the verdict counts for each, and the parcels that need a person's look. */
export function Tranches() {
  const { t } = useLang();
  const { org } = useAuth();
  const list = useApi<Tranche[]>(org ? `/api/organisations/${org.id}/tranches` : null);
  const [selected, setSelected] = useState<string | null>(null);
  const current = list.data?.find((x) => x.id === selected) ?? list.data?.[0] ?? null;
  const check = useApi<Check>(org && current ? `/api/organisations/${org.id}/tranches/${current.id}/check` : null);
  const canWrite = org !== null && can(org.permissions, 'kernel:tranches:write');

  return (
    <>
      <PageHeader crumb={t('trn.crumb', { org: org?.name ?? '', season: current?.season ?? DEFAULT_SEASON })} title={t('trn.title')} actions={current ? <RequestReportButton kind="tranche" subjectId={current.id} label={t('trn.report')} /> : undefined} />
      <div className="flex flex-col gap-4">
        {list.error ? <ErrorLine error={list.error} onRetry={list.reload} /> : null}
        {list.loading ? <Loading /> : null}
        {list.data && list.data.length === 0 ? <p className="muted">{t('trn.none')}</p> : null}

        {list.data && list.data.length > 0 ? (
          <>
            <div className="zr-tabs" role="tablist" aria-label={t('trn.tabs')}>
              {list.data.map((x) => (
                <button key={x.id} type="button" role="tab" className="zr-tab" aria-selected={x.id === current?.id} onClick={() => setSelected(x.id)}>{x.name}</button>
              ))}
            </div>
            {current ? (
              <p className="m-0 font-semibold">
                {t('trn.heading', { name: current.name, n: current.parcelCount })}
                {current.scheduledDate ? <span className="muted font-normal"> · {t('trn.scheduled', { date: current.scheduledDate })}</span> : null}
              </p>
            ) : null}
            {check.error ? <ErrorLine error={check.error} onRetry={check.reload} /> : null}
            {check.loading ? <Loading /> : null}

            {check.data ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {CARDS.map((c) => (
                    <section key={c.key} className="card">
                      <span className={`pill ${c.pill}`}>{t(c.label)}</span>
                      <p className="display mt-2"><Num>{check.data!.verdicts[c.key] ?? 0}</Num></p>
                      <p className="muted m-0 text-sm">{t(c.text)}</p>
                    </section>
                  ))}
                </div>
                <p className="muted m-0 text-sm"><span className="pill na">{t('ver.none')} <Num>{check.data.verdicts.none ?? 0}</Num></span> · {t('ana.accuracy')}</p>

                <section className="card !p-0 overflow-hidden" aria-labelledby="look">
                  <div className="px-4 py-3">
                    <h2 id="look" className="title">{t('trn.look.title')}</h2>
                    {check.data.needsALookTotal > check.data.needsALook.length ? <p className="muted m-0 text-sm">{t('trn.look.shown', { shown: check.data.needsALook.length, total: check.data.needsALookTotal })}</p> : null}
                  </div>
                  {check.data.needsALook.length === 0 ? <p className="muted px-4 pb-3">{t('trn.look.none')}</p> : (
                    <table className="zr-t">
                      <thead>
                        <tr>
                          <th>{t('col.parcel')}</th>
                          <th>{t('par.col.verdict')}</th>
                          <th>{t('trn.col.record')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {check.data.needsALook.map((p) => (
                          <tr key={p.id}>
                            <td><a className="text-link underline" href={hrefs.parcelEvidence(p.id, current?.season)}><Num>{p.label}</Num></a></td>
                            <td><VerdictPill status={p.finding?.status} reason={p.finding?.reason} /></td>
                            <td className="text-sm">
                              {p.finding?.gapPercent != null && p.measuredAreaFeddan !== null && p.declaredAreaFeddan !== null
                                ? t('par.sentence', { m: fmt(p.measuredAreaFeddan), d: fmt(p.declaredAreaFeddan), g: fmt(p.finding.gapPercent, 0), n: fmt(p.finding.noisePercent, 1) })
                                : t('trn.noResult')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{t('ver.noDecision')}</p>
                </section>
              </>
            ) : null}
          </>
        ) : null}

        {canWrite ? <NewTranche onCreated={(id) => { setSelected(id); list.reload(); }} /> : null}
      </div>
    </>
  );
}

function NewTranche({ onCreated }: { onCreated: (id: string) => void }) {
  const { t } = useLang();
  const { org } = useAuth();
  const farms = useApi<FarmList>(org ? `/api/organisations/${org.id}/farms?pageSize=200` : null);
  const [name, setName] = useState('');
  const [season, setSeason] = useState(DEFAULT_SEASON);
  const [date, setDate] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [ids, setIds] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => setError(null), [name, season, date, ids]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: string }>(`/api/organisations/${org.id}/tranches`, {
        method: 'POST',
        body: { name, season, scheduledDate: date || null, farmIds: [...chosen], parcelExternalIds: ids.split('\n').map((x) => x.trim()).filter(Boolean) },
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
      <h2 className="title">{t('trn.new.title')}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="zr-field"><label htmlFor="tn">{t('trn.new.name')}</label><input id="tn" className="zr-in" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="zr-field"><label htmlFor="ts">{t('trn.new.season')}</label><input id="ts" dir="ltr" className="zr-in" value={season} onChange={(e) => setSeason(e.target.value)} /></div>
        <div className="zr-field"><label htmlFor="td">{t('trn.new.date')}</label><input id="td" type="date" dir="ltr" className="zr-in" value={date} onChange={(e) => setDate(e.target.value)} /></div>
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
        <label htmlFor="ti">{t('trn.new.ids')}</label>
        <textarea id="ti" dir="ltr" rows={3} className="zr-in !py-2 font-mono text-sm" value={ids} onChange={(e) => setIds(e.target.value)} />
      </div>
      {error ? <ErrorLine error={error} /> : null}
      <button type="submit" className="zr-btn primary self-start" disabled={busy || !name.trim()}>{t('trn.new.create')}</button>
    </form>
  );
}
