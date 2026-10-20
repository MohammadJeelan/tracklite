import type { UnifiedStatus } from './types';

/** Map courier-native status codes into one shared model. */
const MAP: Record<string, UnifiedStatus> = {
  // Delhivery
  manifested: 'picked',
  'in transit': 'in_transit',
  'reached hub': 'at_hub',
  dispatched: 'out_for_delivery',
  delivered: 'delivered',
  'pending - undelivered': 'failed_attempt',
  'rto initiated': 'rto',
  // Blue Dart
  pu: 'picked',
  it: 'in_transit',
  hub: 'at_hub',
  ofd: 'out_for_delivery',
  dl: 'delivered',
  ud: 'failed_attempt',
  rt: 'rto',
  // Ekart
  shipment_picked: 'picked',
  in_transit: 'in_transit',
  reached_hub: 'at_hub',
  out_for_delivery: 'out_for_delivery',
  delivery_attempt_failed: 'failed_attempt',
  rto_initiated: 'rto',
  // XpressBees
  pkd: 'picked',
  rad: 'at_hub',
  dlvd: 'delivered',
  udl: 'failed_attempt',
};

/**
 * Exact code lookup first, then keyword heuristics so free-text statuses from
 * aggregator / courier exports (e.g. "SHIPMENT DELIVERED", "Undelivered",
 * "RTO In Transit") still land in the shared model.
 */
export function normalizeStatus(raw: string): UnifiedStatus {
  const key = raw.trim().toLowerCase();
  if (MAP[key]) return MAP[key];
  const t = key.replace(/[_-]+/g, ' ');
  if (!t) return 'unknown';
  if (/\brto\b|return(ed)? to origin|returned/.test(t)) return 'rto';
  if (/undeliver|not delivered|attempt fail|failed|attempted|ndr|refused|not reachable/.test(t)) return 'failed_attempt';
  if (/out for delivery|\bofd\b|dispatched for delivery/.test(t)) return 'out_for_delivery';
  if (/deliver(ed|y completed)|\bdlvd\b/.test(t)) return 'delivered';
  if (/hub|arrived|reached|received at|facility|destination center|pending/.test(t)) return 'at_hub';
  if (/transit|connected|shipped|forwarded|in route|departed/.test(t)) return 'in_transit';
  if (/pick(ed)? ?up|picked|manifest|booked|ready to ship/.test(t)) return 'picked';
  return 'unknown';
}

export const STATUS_LABEL: Record<UnifiedStatus, string> = {
  picked: 'Picked up',
  in_transit: 'In transit',
  at_hub: 'At destination hub',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed_attempt: 'Failed delivery attempt',
  rto: 'RTO initiated',
  unknown: 'Unknown',
};

export const STATUS_TONE: Record<UnifiedStatus, string> = {
  picked: 'info',
  in_transit: 'info',
  at_hub: 'warn',
  out_for_delivery: 'info',
  delivered: 'ok',
  failed_attempt: 'bad',
  rto: 'bad',
  unknown: 'muted',
};
