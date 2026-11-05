import { Suspense, lazy, useEffect } from 'react';
import { useAuth } from './auth/AuthProvider';
import { Shell } from './components/Shell';
import { Loading } from './components/ui';
import { FarmRisk } from './pages/FarmRisk';
import { Farms } from './pages/Farms';
import { ParcelRisk } from './pages/ParcelRisk';
import { SignIn } from './pages/SignIn';
import { go, hrefs, useRoute } from './router';

// Development-only login page. import.meta.env.DEV is false in production builds, so this import and the page are removed from them.
const DevLogin = import.meta.env.DEV ? lazy(() => import('./dev/DevLogin')) : null;

export function App() {
  const route = useRoute();
  const { loading, me } = useAuth();
  const signedIn = me !== null;

  // Signed-out visitors go to sign-in; a signed-in user who lands on it goes to the farms.
  useEffect(() => {
    if (loading) return;
    if (!signedIn && route.name !== 'sign-in' && route.name !== 'dev-login') go(hrefs.signIn());
    if (signedIn && route.name === 'sign-in') go(hrefs.farms());
  }, [loading, signedIn, route.name]);

  if (DevLogin && route.name === 'dev-login') {
    return (
      <Suspense fallback={<Loading />}>
        <DevLogin />
      </Suspense>
    );
  }

  if (loading) return <Loading />;
  if (!signedIn) return route.name === 'sign-in' ? <SignIn /> : <Loading />;

  return (
    <Shell route={route}>
      {route.name === 'farms' && <Farms season={route.season} />}
      {route.name === 'farm' && <FarmRisk key={`${route.farmId}/${route.season}`} farmId={route.farmId} season={route.season} />}
      {route.name === 'parcel' && <ParcelRisk key={route.parcelSeasonId} parcelSeasonId={route.parcelSeasonId} />}
      {route.name === 'not-found' && <Farms season={null} />}
    </Shell>
  );
}
