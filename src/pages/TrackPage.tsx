import { useState } from 'react';
import { STATUS_LABEL, STATUS_TONE } from '../lib/normalize';
import { homeHref } from '../lib/router';
import { shareHref } from '../lib/share';
import type { Shipment } from '../lib/types';

function fmtWhen(d: Date) {
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });
}

function fmtDay(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

export function TrackPage({
  orderId,
  shipment,
  shared = false,
}: {
  orderId: string;
  shipment: Shipment | undefined;
  shared?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!shipment) {
    return (
      <div className="track-page">
        <section className="card">
          <h2>Shipment not found</h2>
          <p className="sub">
            {shared
              ? 'This share link is damaged or incomplete.'
              : <>No order <span className="mono">{orderId}</span> in the currently loaded data. Load a CSV (or open a shareable link) and try again.</>}
          </p>
          <a className="btn btn-primary" href={homeHref()} style={{ display: 'inline-block' }}>
            ← Back to dashboard
          </a>
        </section>
      </div>
    );
  }

  const tone = STATUS_TONE[shipment.currentStatus];
  const events = [...shipment.events].reverse();

  async function copyShare() {
    const url = `${window.location.origin}${window.location.pathname}${shareHref(shipment!)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy this shareable tracking link:', url);
    }
  }

  return (
    <div className="track-page">
      <section className="card">
        <div className="track-hero">
          <div>
            {!shared && <a href={homeHref()} style={{ fontSize: '0.85rem' }}>← Dashboard</a>}
            <h2 style={{ margin: '8px 0 4px' }}>Track {shipment.orderId}</h2>
            <p className="sub" style={{ marginBottom: 0 }}>
              {shipment.originCity} → {shipment.destinationCity} · {shipment.courier}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`badge ${tone}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
              {STATUS_LABEL[shipment.currentStatus]}
            </span>
            <button type="button" className="btn btn-secondary" onClick={() => void copyShare()}>
              {copied ? 'Link copied' : 'Copy shareable link'}
            </button>
          </div>
        </div>

        <div className="track-meta">
          <div className="meta-item">
            <div className="k">Pincode</div>
            <div className="v mono">{shipment.pincode || '—'}</div>
          </div>
          <div className="meta-item">
            <div className="k">Promised</div>
            <div className="v mono">{fmtDay(shipment.promisedDate)}</div>
          </div>
          <div className="meta-item">
            <div className="k">Created</div>
            <div className="v mono">{fmtWhen(shipment.createdAt)}</div>
          </div>
          <div className="meta-item">
            <div className="k">Delivered</div>
            <div className="v mono">
              {shipment.deliveredAt ? fmtWhen(shipment.deliveredAt) : '—'}
            </div>
          </div>
        </div>

        {shipment.isLate && shipment.delayLabel && (
          <div className="notice" role="status">
            Delay reason: <strong>{shipment.delayLabel}</strong>
          </div>
        )}
        {shared && (
          <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>
            This page is self-contained in the URL — the recipient does not need your CSV.
          </p>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Timeline</h2>
        <p className="sub">Raw courier codes normalized to a shared status model</p>
        {events.length === 0 ? (
          <div className="empty">No status events yet.</div>
        ) : (
          <ul className="timeline">
            {events.map((e, i) => (
              <li key={`${e.at.toISOString()}-${i}`}>
                <div className={`dot ${STATUS_TONE[e.status]}`} />
                <div>
                  <div className="when">{fmtWhen(e.at)}</div>
                  <div className="what">{STATUS_LABEL[e.status]}</div>
                  <div className="where">
                    {e.location || '—'}
                    {e.rawCode ? (
                      <span className="mono" style={{ marginLeft: 8, opacity: 0.7 }}>
                        ({e.rawCode})
                      </span>
                    ) : null}
                  </div>
                  {e.remark ? <div className="remark">{e.remark}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
