import type { Kpis } from '../lib/stats';

export function KpiRow({ kpis }: { kpis: Kpis }) {
  return (
    <div className="kpi-grid" role="group" aria-label="Shipment KPIs">
      <div className="kpi ok">
        <div className="label">On-time %</div>
        <div className="value">{kpis.onTimePct}%</div>
        <div className="hint">of delivered orders</div>
      </div>
      <div className="kpi bad">
        <div className="label">Delayed</div>
        <div className="value">{kpis.delayed}</div>
        <div className="hint">of {kpis.total} total</div>
      </div>
      <div className="kpi info">
        <div className="label">In transit</div>
        <div className="value">{kpis.inTransit}</div>
        <div className="hint">not yet delivered / RTO</div>
      </div>
      <div className="kpi warn">
        <div className="label">RTO</div>
        <div className="value">{kpis.rto}</div>
        <div className="hint">{kpis.delivered} delivered</div>
      </div>
    </div>
  );
}
