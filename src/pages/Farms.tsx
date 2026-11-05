import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import type { FarmList, FarmListItem } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ErrorLine, Loading, MaturityBadge, MethodBanner, Num, PageHeader } from '../components/ui';
import { DEFAULT_SEASON } from '../config';
import { fmt } from '../format';
import { useLang } from '../i18n/LangProvider';
import { go, hrefs } from '../router';

const PAGE = 50;

/** The organisation's farms for one season, in the order they were added. Nothing here ranks farms by risk. */
export function Farms({ season: routeSeason }: { season: string | null }) {
  const { t } = useLang();
  const { org } = useAuth();
  const season = routeSeason ?? DEFAULT_SEASON;
  const [draft, setDraft] = useState(season);
  const [items, setItems] = useState<FarmListItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [method, setMethod] = useState('FRI-2026-01');

  useEffect(() => setDraft(season), [season]);

  async function load(cursor: string | null, replace: boolean, signal?: AbortSignal) {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ pageSize: String(PAGE), season });
      if (cursor) q.set('cursor', cursor);
      const page = await api<FarmList>(`/api/organisations/${org.id}/farms?${q}`, { signal });
      setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
      setNext(page.nextCursor);
      const withFri = page.items.find((f) => f.fri);
      if (withFri?.fri) setMethod(withFri.fri.method.id);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof ApiError ? e : new ApiError(0, 'network'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setNext(null);
    void load(null, true, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, season]);

  function applySeason(e: FormEvent) {
    e.preventDefault();
    go(hrefs.farms(draft.trim()));
  }

  return (
    <>
      <PageHeader crumb={t('farms.crumb', { org: org?.name ?? '', season })} title={t('farms.title')} />
      <div className="flex flex-col gap-4">
        <MethodBanner method={method} />

        <form onSubmit={applySeason} className="flex items-end gap-3">
          <div className="zr-field">
            <label htmlFor="season">{t('farms.season')}</label>
            <input id="season" dir="ltr" className="zr-in !w-40" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <span className="zr-hint">{t('farms.seasonHint')}</span>
          </div>
          <button type="submit" className="zr-btn" disabled={!draft.trim() || draft.trim() === season}>
            {t('farms.apply')}
          </button>
        </form>

        {error ? <ErrorLine error={error} onRetry={() => void load(null, true)} /> : null}

        <div className="card !p-0 overflow-hidden">
          <div className="flex items-baseline justify-between px-4 py-3">
            <h2 className="title">{t('farms.title')}</h2>
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
                  <td>
                    <a className="text-link underline" href={hrefs.farm(f.id, season)}>
                      <Num>{f.name}</Num>
                    </a>
                  </td>
                  <td>{f.governorate ?? t('common.none')}</td>
                  <td className="num">{fmt(f.parcelCount, 0)}</td>
                  <td className="num">{fmt(f.areaFeddan)}</td>
                  <td className="num">
                    {f.fri ? (
                      <span className="inline-flex flex-col items-end gap-1">
                        <Num>{fmt(f.fri.value)}</Num>
                        <MaturityBadge />
                      </span>
                    ) : (
                      <span className="muted font-sans">{t('farms.noFri')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? (
            <div className="px-4 py-3">
              <Loading />
            </div>
          ) : null}
          {!loading && !error && items.length === 0 ? <p className="muted px-4 py-3">{t('farms.empty')}</p> : null}
          {next && !loading ? (
            <div className="px-4 py-3">
              <button type="button" className="zr-btn" onClick={() => void load(next, false)}>
                {t('farms.loadMore')}
              </button>
            </div>
          ) : null}
          <p className="muted m-0 border-t border-line px-4 py-3 text-sm">{t('farms.footer')}</p>
        </div>
      </div>
    </>
  );
}
