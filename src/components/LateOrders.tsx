import { useMemo, useState } from 'react';
import { STATUS_LABEL, STATUS_TONE } from '../lib/normalize';
import { downloadText, lateOrdersCsv, openPrintableLateReport } from '../lib/report';
import { trackHref } from '../lib/router';
import { shareHref } from '../lib/share';
import type { DelayReason, Shipment } from '../lib/types';

const REASONS: { value: DelayReason | 'all'; label: string }[] = [
  { value: 'all', label: 'All late reasons' },
  { value: 'stuck_at_hub', label: 'Stuck at hub > 48h' },
  { value: 'failed_delivery', label: 'Failed delivery' },
  { value: 'address_issue', label: 'Address issue' },
  { value: 'rto', label: 'RTO' },
  { value: 'missed_promise', label: 'Missed promise' },
];

function fmtDate(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

export function LateOrders({
  shipments,
  source,
}: {
  shipments: Shipment[];
  source: string | null;
}) {
  const [q, setQ] = useState('');
  const [reason, setReason] = useState<DelayReason | 'all'>('all');
  const [courier, setCourier] = useState('all');
  const [copied, setCopied] = useState<string | null>(null);

  const couriers = useMemo(
    () => [...new Set(shipments.map((s) => s.courier))].sort(),
    [shipments],
  );

  const late = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return shipments
      .filter((s) => s.isLate)
      .filter((s) => (reason === 'all' ? true : s.delayReason === reason))
      .filter((s) => (courier === 'all' ? true : s.courier === courier))
      .filter((s) => {
        if (!qq) return true;
        return (
          s.orderId.toLowerCase().includes(qq) ||
          s.destinationCity.toLowerCase().includes(qq) ||
          s.pincode.includes(qq) ||
          (s.delayLabel || '').toLowerCase().includes(qq)
        );
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [shipments, q, reason, courier]);

  async function copyShare(s: Shipment) {
    const url = `${window.location.origin}${window.location.pathname}${shareHref(s)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(s.orderId);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt('Copy this shareable tracking link:', url);
    }
  }

  return (
    <section className="card" aria-labelledby="late-title">
      <div className="section-head">
        <div>
          <h2 id="late-title">Late orders</h2>
          <p className="sub">
            Inferred reason from status timeline — stuck hub, failed attempt, address issue, RTO, or missed promise.
          </p>
        </div>
        <div className="upload-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!late.length}
            onClick={() => downloadText(
              `tracklite-late-${new Date().toISOString().slice(0, 10)}.csv`,
              lateOrdersCsv(late),
            )}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!late.length}
            onClick={() => openPrintableLateReport(late, source)}
          >
            Print report
          </button>
        </div>
      </div>
      <div className="toolbar">
        <input
          className="field search"
          placeholder="Search order, city, pincode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search late orders"
        />
        <select className="field" value={reason ?? 'all'} onChange={(e) => setReason(e.target.value as DelayReason | 'all')} aria-label="Filter by reason">
          {REASONS.map((r) => <option key={String(r.value)} value={String(r.value)}>{r.label}</option>)}
        </select>
        <select className="field" value={courier} onChange={(e) => setCourier(e.target.value)} aria-label="Filter by courier">
          <option value="all">All couriers</option>
          {couriers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {late.length === 0 ? (
        <div className="empty">No late orders match these filters.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Courier</th>
                <th>Route</th>
                <th>Status</th>
                <th>Why late</th>
                <th>Promised</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {late.map((s) => (
                <tr key={s.orderId}>
                  <td className="mono"><a href={trackHref(s.orderId)}>{s.orderId}</a></td>
                  <td>{s.courier}</td>
                  <td>{s.originCity} → {s.destinationCity}</td>
                  <td><span className={`badge ${STATUS_TONE[s.currentStatus]}`}>{STATUS_LABEL[s.currentStatus]}</span></td>
                  <td><span className="badge warn">{s.delayLabel}</span></td>
                  <td className="mono">{fmtDate(s.promisedDate)}</td>
                  <td>
                    <button type="button" className="linkish" onClick={() => void copyShare(s)}>
                      {copied === s.orderId ? 'Copied' : 'Copy link'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
