import { useEffect, useMemo, useState } from 'react';
import { Footer } from './components/Footer';
import { parseHash, type Route } from './lib/router';
import { decodeShipment } from './lib/share';
import { restoreActive } from './lib/storage';
import type { Shipment } from './lib/types';
import { Dashboard } from './pages/Dashboard';
import { TrackPage } from './pages/TrackPage';

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const restored = restoreActive();
  const [shipments, setShipments] = useState<Shipment[]>(() => restored?.shipments ?? []);
  const [source, setSource] = useState<string | null>(() => restored?.source ?? null);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, Shipment>();
    for (const s of shipments) m.set(s.orderId, s);
    return m;
  }, [shipments]);

  function handleLoaded(next: Shipment[], src: string) {
    setShipments(next);
    setSource(src);
  }

  if (route.name === 'share') {
    const shared = decodeShipment(route.payload);
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <div className="logo-mark" aria-hidden>TL</div>
            <div>
              <h1>TrackLite</h1>
              <p>Shared tracking page</p>
            </div>
          </div>
          <span className="pill">Self-contained link · no login</span>
        </header>
        <TrackPage
          orderId={shared?.orderId || 'unknown'}
          shipment={shared ?? undefined}
          shared
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo-mark" aria-hidden>TL</div>
          <div>
            <h1>TrackLite</h1>
            <p>Multi-courier tracking & delay explainer</p>
          </div>
        </div>
        <span className="pill">Client-side · free · works offline after load</span>
      </header>

      {route.name === 'track' ? (
        <TrackPage orderId={route.id} shipment={byId.get(route.id)} />
      ) : (
        <Dashboard shipments={shipments} source={source} onLoaded={handleLoaded} />
      )}

      <Footer />
    </div>
  );
}
