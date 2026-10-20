import type { Shipment } from './types';

/** Compact payload for #/s/<base64url> share links — no backend needed. */
export function encodeShipment(s: Shipment): string {
  const payload = {
    o: s.orderId,
    c: s.courier,
    oc: s.originCity,
    dc: s.destinationCity,
    p: s.pincode,
    ca: s.createdAt.toISOString(),
    pd: s.promisedDate ? s.promisedDate.toISOString() : null,
    da: s.deliveredAt ? s.deliveredAt.toISOString() : null,
    cs: s.currentStatus,
    il: s.isLate,
    dr: s.delayReason,
    dl: s.delayLabel,
    e: s.events.map((ev) => [
      ev.at.toISOString(),
      ev.rawCode,
      ev.location,
      ev.remark,
      ev.status,
    ]),
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return b64;
}

export function decodeShipment(raw: string): Shipment | null {
  try {
    let b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    const p = JSON.parse(json) as {
      o: string; c: string; oc: string; dc: string; p: string;
      ca: string; pd: string | null; da: string | null;
      cs: Shipment['currentStatus']; il: boolean;
      dr: Shipment['delayReason']; dl: string | null;
      e: Array<[string, string, string, string, Shipment['currentStatus']]>;
    };
    return {
      orderId: p.o,
      courier: p.c,
      originCity: p.oc,
      destinationCity: p.dc,
      pincode: p.p,
      createdAt: new Date(p.ca),
      promisedDate: p.pd ? new Date(p.pd) : null,
      deliveredAt: p.da ? new Date(p.da) : null,
      currentStatus: p.cs,
      isLate: !!p.il,
      delayReason: p.dr ?? null,
      delayLabel: p.dl ?? null,
      events: (p.e || []).map(([at, rawCode, location, remark, status]) => ({
        at: new Date(at), rawCode, location, remark, status,
      })),
    };
  } catch {
    return null;
  }
}

export function shareHref(s: Shipment): string {
  return `#/s/${encodeShipment(s)}`;
}
