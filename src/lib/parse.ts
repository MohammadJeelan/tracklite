import Papa from 'papaparse';
import type { DelayReason, Shipment, StatusEvent } from './types';
import { normalizeStatus } from './normalize';
import { autoDetect, type FieldKey, type Mapping } from './mapping';

/** Reference time for the bundled sample (so its delays stay stable). */
export const SAMPLE_AS_OF = new Date('2026-10-20T18:00:00+05:30');
const HUB_STUCK_MS = 48 * 3600 * 1000;

const ADDRESS_HINTS = [
  'address incomplete',
  'incorrect pincode',
  'consignee address',
  'address not found',
  'wrong address',
];

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Accepts the date shapes seen in Indian courier exports; times are read as IST. */
export function parseDate(input: string | undefined): Date | null {
  const s = (input || '').trim();
  if (!s) return null;
  const mk = (y: number, mo: number, d: number, hh = 0, mm = 0, ss = 0) => {
    const iso = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}+05:30`;
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };
  const time = (rest: string | undefined) => {
    const t = (rest || '').match(/(\d{1,2}):?(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!t) return [0, 0, 0];
    let h = +t[1];
    if (t[4]) { const pm = t[4].toLowerCase() === 'pm'; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    return [h, +t[2], +(t[3] || 0)];
  };
  // ISO with explicit zone
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](.*))?$/);
  if (m) { const [h, mi, se] = time(m[4]); return mk(+m[1], +m[2] - 1, +m[3], h, mi, se); }
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T,]+(.*))?$/); // DD-MM-YYYY (Indian order)
  if (m) { const [h, mi, se] = time(m[4]); return mk(+m[3], +m[2] - 1, +m[1], h, mi, se); }
  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3,9})[\s-,]+(\d{4})(?:[ T,]+(.*))?$/); // 30 January 2023 / 30-Jan-2023
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()] !== undefined) {
    const [h, mi, se] = time(m[4]);
    return mk(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1], h, mi, se);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseEvents(raw: string): StatusEvent[] {
  if (!raw) return [];
  return raw
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [atStr, code = '', location = '', remark = ''] = chunk.split('|');
      const at = parseDate(atStr) ?? new Date(0);
      return {
        at,
        rawCode: code,
        location,
        remark,
        status: normalizeStatus(code),
      };
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

function inferDelay(s: Omit<Shipment, 'isLate' | 'delayReason' | 'delayLabel'>, NOW: Date): {
  isLate: boolean;
  delayReason: DelayReason;
  delayLabel: string | null;
} {
  const current = s.currentStatus;
  const last = s.events[s.events.length - 1];
  const promisedEnd = s.promisedDate ? new Date(s.promisedDate.getTime() + 86_399_999) : null;

  // Address issue from failed-attempt remarks
  const failed = [...s.events].reverse().find((e) => e.status === 'failed_attempt');
  if (failed) {
    const remark = (failed.remark || '').toLowerCase();
    if (ADDRESS_HINTS.some((h) => remark.includes(h))) {
      return {
        isLate: true,
        delayReason: 'address_issue',
        delayLabel: 'Address issue',
      };
    }
  }

  if (current === 'rto') {
    return { isLate: true, delayReason: 'rto', delayLabel: 'RTO initiated' };
  }

  if (current === 'failed_attempt') {
    return {
      isLate: true,
      delayReason: 'failed_delivery',
      delayLabel: 'Failed delivery attempt',
    };
  }

  if (current === 'at_hub' && last) {
    const stuckMs = NOW.getTime() - last.at.getTime();
    if (stuckMs >= HUB_STUCK_MS) {
      return {
        isLate: true,
        delayReason: 'stuck_at_hub',
        delayLabel: 'Stuck at hub > 48h',
      };
    }
  }

  // Missed promise: not delivered and past promised date
  if (promisedEnd && current !== 'delivered' && NOW > promisedEnd) {
    return {
      isLate: true,
      delayReason: 'missed_promise',
      delayLabel: 'Missed promised date',
    };
  }

  // Delivered late
  if (promisedEnd && current === 'delivered' && s.deliveredAt && s.deliveredAt > promisedEnd) {
    return {
      isLate: true,
      delayReason: 'missed_promise',
      delayLabel: 'Delivered after promise',
    };
  }

  return { isLate: false, delayReason: null, delayLabel: null };
}

export function rowToShipment(row: Record<string, string>, map: Mapping, asOf: Date): Shipment | null {
  const get = (k: FieldKey) => (map[k] ? (row[map[k]!] ?? '').trim() : '');
  const orderId = get('orderId') || get('awb');
  if (!orderId) return null;

  let events = parseEvents(get('statusEvents'));
  if (!events.length && get('status')) {
    const at = parseDate(get('statusAt')) ?? parseDate(get('deliveredAt')) ?? parseDate(get('createdAt')) ?? asOf;
    events = [{
      at,
      rawCode: get('status'),
      location: get('statusLocation'),
      remark: get('remark'),
      status: normalizeStatus(get('status')),
    }];
  }
  const createdAt = parseDate(get('createdAt')) ?? events[0]?.at ?? null;
  if (!createdAt) return null;
  const currentStatus = events.length > 0 ? events[events.length - 1].status : 'unknown';
  let deliveredAt = parseDate(get('deliveredAt'));
  if (!deliveredAt && currentStatus === 'delivered') deliveredAt = events[events.length - 1].at;

  const base = {
    orderId,
    courier: get('courier') || 'Unknown',
    originCity: get('originCity'),
    destinationCity: get('destinationCity'),
    pincode: get('pincode'),
    createdAt,
    promisedDate: parseDate(get('promisedDate')),
    deliveredAt,
    events,
    currentStatus,
  };
  return { ...base, ...inferDelay(base, asOf) };
}

export function readCsv(text: string): { headers: string[]; rows: Record<string, string>[]; errors: string[] } {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return {
    headers: (parsed.meta.fields || []).filter(Boolean),
    rows: parsed.data,
    errors: parsed.errors.slice(0, 5).map((e) => `Row ${e.row ?? '?'}: ${e.message}`),
  };
}

export function buildShipments(rows: Record<string, string>[], map: Mapping, asOf: Date = new Date()) {
  const shipments: Shipment[] = [];
  let skipped = 0;
  for (const row of rows) {
    const s = rowToShipment(row, map, asOf);
    if (s) shipments.push(s); else skipped++;
  }
  return { shipments, skipped };
}

export function parseShipmentsCsv(text: string, asOf: Date = new Date()): { shipments: Shipment[]; errors: string[] } {
  const { headers, rows, errors } = readCsv(text);
  const { shipments } = buildShipments(rows, autoDetect(headers), asOf);
  if (!shipments.length) errors.push('No valid shipment rows found. Check column names.');
  return { shipments, errors };
}

export async function loadSampleShipments(): Promise<{
  shipments: Shipment[];
  errors: string[];
}> {
  const res = await fetch(`${import.meta.env.BASE_URL}sample-shipments.csv`);
  if (!res.ok) throw new Error(`Failed to load sample CSV (${res.status})`);
  const text = await res.text();
  return parseShipmentsCsv(text, SAMPLE_AS_OF);
}
