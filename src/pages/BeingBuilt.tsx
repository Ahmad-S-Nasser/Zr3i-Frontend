import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../components/ui';
import { useLang } from '../i18n/LangProvider';
import { NAV, homeHref } from '../nav';

/** A plain page for a sidebar item whose screen does not exist yet. A stopgap: it goes away item by item as each screen is built. */
export function BeingBuilt({ id }: { id: string }) {
  const { t } = useLang();
  const { org } = useAuth();
  const def = NAV[id];
  const name = def ? t(def.label) : id;
  return (
    <>
      <PageHeader crumb={org?.name ?? ''} title={name} />
      <div className="card flex max-w-xl flex-col gap-3">
        <h2 className="title">{t('section.building.title')}</h2>
        <p className="m-0">{t('section.building.text', { name })}</p>
        {org ? (
          <a className="zr-btn self-start" href={homeHref(org)}>
            {t('section.building.back')}
          </a>
        ) : null}
      </div>
    </>
  );
}
