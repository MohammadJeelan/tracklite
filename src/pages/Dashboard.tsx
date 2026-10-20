import { Charts } from '../components/Charts';
import { KpiRow } from '../components/KpiRow';
import { LateOrders } from '../components/LateOrders';
import { UploadPanel } from '../components/UploadPanel';
import { computeKpis } from '../lib/stats';
import type { Shipment } from '../lib/types';

interface Props {
  shipments: Shipment[];
  source: string | null;
  onLoaded: (shipments: Shipment[], source: string) => void;
}

export function Dashboard({ shipments, source, onLoaded }: Props) {
  const kpis = computeKpis(shipments);

  return (
    <>
      <UploadPanel onLoaded={onLoaded} current={shipments} source={source} />
      {shipments.length > 0 && (
        <>
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0 }}>Ops dashboard</h2>
                <p className="sub" style={{ marginBottom: 0 }}>
                  Unified view after normalizing courier status codes
                  {source ? ` · loaded from ${source}` : ''}
                </p>
              </div>
              <span className="pill">{shipments.length} shipments</span>
            </div>
            <KpiRow kpis={kpis} />
          </section>
          <Charts shipments={shipments} />
          <LateOrders shipments={shipments} source={source} />
        </>
      )}
    </>
  );
}
