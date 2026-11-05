import type { Grant } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Grants } from '../components/Grants';
import { ErrorLine, Loading, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLang } from '../i18n/LangProvider';

/** The farmer's consent: every permission given to another organisation, with Withdraw, and the ones that ended. */
export function Consent() {
  const { t } = useLang();
  const { org } = useAuth();
  const { data, error, loading, reload } = useApi<Grant[]>(org ? `/api/organisations/${org.id}/consents` : null);
  const mine = (data ?? []).filter((g) => g.role === 'owner');
  const live = mine.filter((g) => g.status === 'active' || g.status === 'scheduled');
  const past = mine.filter((g) => g.status === 'expired' || g.status === 'withdrawn');

  return (
    <>
      <PageHeader crumb={org?.name ?? ''} title={t('cons.title')} />
      <div className="flex flex-col gap-4">
        <p className="muted m-0 max-w-3xl">{t('mine.who.text')}</p>
        {error ? <ErrorLine error={error} onRetry={reload} /> : null}
        {loading ? <Loading /> : null}
        {data ? (
          <>
            <section className="card !p-0 overflow-hidden">
              <h2 className="title px-4 py-3">{t('mine.who.title')}</h2>
              <div className="px-4 pb-3">
                <Grants grants={live} onChanged={reload} empty="mine.who.none" />
              </div>
            </section>
            {past.length > 0 ? (
              <section className="card !p-0 overflow-hidden">
                <h2 className="title px-4 py-3">{t('cons.history')}</h2>
                <Grants grants={past} onChanged={reload} empty="mine.who.none" />
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
