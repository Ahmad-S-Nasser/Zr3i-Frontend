import { Suspense, lazy, useEffect } from 'react';
import { useAuth } from './auth/AuthProvider';
import { Shell } from './components/Shell';
import { Loading } from './components/ui';
import { FarmRisk } from './pages/FarmRisk';
import { BeingBuilt } from './pages/BeingBuilt';
import { Farms } from './pages/Farms';
import { Section } from './pages/Section';
import { AcceptInvitation } from './pages/AcceptInvitation';
import { ConsentLink } from './pages/ConsentLink';
import { ParcelRisk } from './pages/ParcelRisk';
import { RequestAccess } from './pages/RequestAccess';
import { SignIn } from './pages/SignIn';
import { homeHref } from './nav';
import { go, hrefs, useRoute } from './router';

// Development-only login page. import.meta.env.DEV is false in production builds, so this import and the page are removed from them.
const DevLogin = import.meta.env.DEV ? lazy(() => import('./dev/DevLogin')) : null;

export function App() {
  const route = useRoute();
  const { loading, me, org } = useAuth();
  const signedIn = me !== null;

  // Signed-out visitors go to sign-in; a signed-in user who lands on it goes to the farms.
  useEffect(() => {
    if (loading) return;
    if (!signedIn && route.name !== 'sign-in' && route.name !== 'dev-login' && route.name !== 'request-access' && route.name !== 'consent-link' && route.name !== 'accept') go(hrefs.signIn());
    if (signedIn && route.name === 'sign-in' && org) go(homeHref(org));
    // The root address opens the account type's home view.
    if (signedIn && route.name === 'home' && org) go(homeHref(org));
  }, [loading, signedIn, route.name, org]);

  if (DevLogin && route.name === 'dev-login') {
    return (
      <Suspense fallback={<Loading />}>
        <DevLogin />
      </Suspense>
    );
  }

  // Pages anyone can open, signed in or not: the farmer's one-page consent link and Request access.
  if (route.name === 'consent-link') return <ConsentLink key={route.token} token={route.token} />;
  if (route.name === 'request-access' && !signedIn) return <RequestAccess />;
  if (route.name === 'accept') return <AcceptInvitation token={route.token} />;

  if (loading) return <Loading />;
  if (!signedIn) return route.name === 'sign-in' ? <SignIn /> : <Loading />;

  return (
    <Shell route={route}>
      {route.name === 'farms' && <Farms mode="farms" season={route.season} />}
      {route.name === 'farm' && <FarmRisk key={`${route.farmId}/${route.season}`} farmId={route.farmId} season={route.season} />}
      {route.name === 'parcel' && <ParcelRisk key={route.parcelSeasonId} parcelSeasonId={route.parcelSeasonId} />}
      {route.name === 'section' && <Section key={route.id} id={route.id} season={route.season} />}
      {route.name === 'home' && <Loading />}
      {route.name === 'not-found' && org && <BeingBuilt id="" />}
    </Shell>
  );
}
