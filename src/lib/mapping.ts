/**
 * Column mapping for arbitrary courier / aggregator CSV exports.
 *
 * Synonym sources (only names we could verify in public docs, 2026-10-20):
 *  - Shiprocket API docs (apidocs.shiprocket.in) tracking/order payloads:
 *    awb_code, courier_name, channel_order_id, current_status, shipment_status,
 *    etd, pickup_date, delivered_date, origin, destination
 *  - Delhivery Order Tracking API (delhivery-express-api-doc.readme.io):
 *    AWB, ReferenceNo, Status, StatusDateTime, StatusLocation, Instructions,
 *    PickUpDate, Origin, Destination, PinCode, FirstAttemptDate
 *  - Blue Dart tracking XML (WaybillNo, RefNo, Status, StatusDate,
 *    PickUpDate, Origin, Destination, ExpectedDeliveryDate, Instructions)
 *  - Ekart: no public export/API column list found, so nothing Ekart-specific.
 * These are API field names; panel CSV exports usually reuse them but may be
 * worded differently, which is why manual mapping exists.
 */
export type FieldKey =
  | 'orderId'
  | 'awb'
  | 'courier'
  | 'originCity'
  | 'destinationCity'
  | 'pincode'
  | 'createdAt'
  | 'promisedDate'
  | 'deliveredAt'
  | 'statusEvents'
  | 'status'
  | 'statusAt'
  | 'statusLocation'
  | 'remark';

export interface FieldDef {
  key: FieldKey;
  label: string;
  hint: string;
  required?: boolean;
  synonyms: string[];
}

export const FIELDS: FieldDef[] = [
  { key: 'orderId', label: 'Order ID', required: true, hint: 'Your order / reference number',
    synonyms: ['order_id', 'orderid', 'order id', 'order no', 'order number', 'channel_order_id', 'ReferenceNo', 'RefNo', 'reference number'] },
  { key: 'awb', label: 'AWB / tracking no.', hint: 'Used as order ID if no order column',
    synonyms: ['awb', 'awb_code', 'awb code', 'awb number', 'awb no', 'Waybill', 'WaybillNo', 'tracking number', 'tracking_id', 'tracking id'] },
  { key: 'courier', label: 'Courier', hint: 'Courier / carrier name',
    synonyms: ['courier', 'courier_name', 'courier name', 'courier company', 'carrier', 'logistics partner'] },
  { key: 'originCity', label: 'Origin', hint: 'Pickup city / hub',
    synonyms: ['origin_city', 'origin', 'pickup city', 'from city', 'source city'] },
  { key: 'destinationCity', label: 'Destination', hint: 'Delivery city',
    synonyms: ['destination_city', 'destination', 'customer city', 'delivery city', 'to city', 'consignee city'] },
  { key: 'pincode', label: 'Pincode', hint: 'Delivery pincode',
    synonyms: ['pincode', 'PinCode', 'pin code', 'customer pincode', 'delivery pincode', 'consignee pincode', 'zip'] },
  { key: 'createdAt', label: 'Created / picked', hint: 'Order or pickup date (falls back to first scan)',
    synonyms: ['created_at', 'created at', 'order date', 'pickup_date', 'PickUpDate', 'pickup date', 'shipped date', 'manifest date'] },
  { key: 'promisedDate', label: 'Promised / EDD', hint: 'Needed for missed-promise detection',
    synonyms: ['promised_date', 'promised date', 'etd', 'edd', 'ExpectedDeliveryDate', 'expected delivery date', 'promised delivery date'] },
  { key: 'deliveredAt', label: 'Delivered at', hint: 'Delivery date if delivered',
    synonyms: ['delivered_at', 'delivered_date', 'delivered date', 'delivery date', 'delivered on'] },
  { key: 'statusEvents', label: 'Full scan history', hint: 'Optional: "time|code|location|remark;…"',
    synonyms: ['status_events', 'scan history', 'events'] },
  { key: 'status', label: 'Current status', hint: 'Used when there is no scan history',
    synonyms: ['current_status', 'shipment_status', 'Status', 'current status', 'latest status', 'delivery status'] },
  { key: 'statusAt', label: 'Status time', hint: 'When the current status happened',
    synonyms: ['StatusDateTime', 'StatusDate', 'status date', 'status time', 'last update', 'last updated', 'updated_at'] },
  { key: 'statusLocation', label: 'Status location', hint: 'Where the last scan happened',
    synonyms: ['StatusLocation', 'status location', 'current location', 'last location', 'ScannedLocation'] },
  { key: 'remark', label: 'Remark / NDR reason', hint: 'Detects address issues',
    synonyms: ['Instructions', 'remark', 'remarks', 'ndr reason', 'reason', 'comment'] },
];

export type Mapping = Partial<Record<FieldKey, string>>;

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

export function autoDetect(headers: string[]): Mapping {
  const byNorm = new Map(headers.map((h) => [norm(h), h]));
  const used = new Set<string>();
  const m: Mapping = {};
  for (const f of FIELDS) {
    for (const syn of f.synonyms) {
      const h = byNorm.get(norm(syn));
      if (h && !used.has(h)) {
        m[f.key] = h;
        used.add(h);
        break;
      }
    }
  }
  return m;
}

export function mappingProblems(m: Mapping): string[] {
  const p: string[] = [];
  if (!m.orderId && !m.awb) p.push('Pick an Order ID or AWB column.');
  if (!m.statusEvents && !m.status) p.push('Pick a scan-history or current-status column.');
  return p;
}

const SAVED_KEY = 'tracklite.mappings.v1';
export function headerSignature(headers: string[]) {
  return headers.map(norm).sort().join('|');
}
export function loadSavedMapping(headers: string[]): Mapping | null {
  try {
    const all = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}') as Record<string, Mapping>;
    return all[headerSignature(headers)] ?? null;
  } catch {
    return null;
  }
}
export function saveMapping(headers: string[], m: Mapping) {
  try {
    const all = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}') as Record<string, Mapping>;
    all[headerSignature(headers)] = m;
    localStorage.setItem(SAVED_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
