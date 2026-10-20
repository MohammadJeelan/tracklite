import type { Shipment } from './types';
import { STATUS_LABEL } from './normalize';

function fmt(d: Date | null) {
  if (!d) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

export function lateOrdersCsv(late: Shipment[]): string {
  const header = [
    'order_id', 'courier', 'origin', 'destination', 'pincode',
    'status', 'delay_reason', 'promised_date', 'created_at', 'delivered_at',
  ];
  const lines = [header.join(',')];
  for (const s of late) {
    const cells = [
      s.orderId, s.courier, s.originCity, s.destinationCity, s.pincode,
      STATUS_LABEL[s.currentStatus], s.delayLabel || '',
      fmt(s.promisedDate), fmt(s.createdAt), fmt(s.deliveredAt),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function openPrintableLateReport(late: Shipment[], source: string | null) {
  const rows = late
    .map(
      (s) => `<tr>
        <td>${esc(s.orderId)}</td><td>${esc(s.courier)}</td>
        <td>${esc(s.originCity)} → ${esc(s.destinationCity)}</td>
        <td>${esc(STATUS_LABEL[s.currentStatus])}</td>
        <td>${esc(s.delayLabel || '')}</td>
        <td>${esc(fmt(s.promisedDate))}</td>
      </tr>`,
    )
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Late orders — TrackLite</title>
<style>
  body{font:14px/1.45 system-ui,sans-serif;color:#111;margin:24px}
  h1{font-size:18px;margin:0 0 4px} .meta{color:#555;margin-bottom:16px}
  table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
  th{background:#f3f4f6} @media print{button{display:none}}
</style></head><body>
<h1>Late orders report</h1>
<div class="meta">${late.length} late · ${esc(source || 'current dataset')} · printed ${new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST
<button onclick="window.print()" style="margin-left:12px">Print</button></div>
<table><thead><tr><th>Order</th><th>Courier</th><th>Route</th><th>Status</th><th>Why late</th><th>Promised</th></tr></thead>
<tbody>${rows || '<tr><td colspan="6">No late orders</td></tr>'}</tbody></table>
</body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
