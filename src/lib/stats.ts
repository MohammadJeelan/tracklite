import type { Shipment, UnifiedStatus } from './types';

export interface Kpis {
  total: number;
  onTimePct: number;
  delayed: number;
  inTransit: number;
  rto: number;
  delivered: number;
}

const IN_TRANSIT: UnifiedStatus[] = [
  'picked',
  'in_transit',
  'at_hub',
  'out_for_delivery',
  'failed_attempt',
];

export function computeKpis(shipments: Shipment[]): Kpis {
  const total = shipments.length;
  if (!total) {
    return { total: 0, onTimePct: 0, delayed: 0, inTransit: 0, rto: 0, delivered: 0 };
  }
  const delayed = shipments.filter((s) => s.isLate).length;
  const delivered = shipments.filter((s) => s.currentStatus === 'delivered').length;
  const onTimeDelivered = shipments.filter(
    (s) => s.currentStatus === 'delivered' && !s.isLate,
  ).length;
  // On-time % among delivered; if none delivered yet, use non-late share
  const onTimePct =
    delivered > 0
      ? Math.round((onTimeDelivered / delivered) * 1000) / 10
      : Math.round(((total - delayed) / total) * 1000) / 10;
  return {
    total,
    onTimePct,
    delayed,
    inTransit: shipments.filter((s) => IN_TRANSIT.includes(s.currentStatus)).length,
    rto: shipments.filter((s) => s.currentStatus === 'rto').length,
    delivered,
  };
}

export function groupByCourier(shipments: Shipment[]) {
  const map = new Map<string, { courier: string; total: number; late: number; delivered: number }>();
  for (const s of shipments) {
    const g = map.get(s.courier) ?? { courier: s.courier, total: 0, late: 0, delivered: 0 };
    g.total += 1;
    if (s.isLate) g.late += 1;
    if (s.currentStatus === 'delivered') g.delivered += 1;
    map.set(s.courier, g);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function groupByCity(shipments: Shipment[]) {
  const map = new Map<string, { city: string; total: number; late: number }>();
  for (const s of shipments) {
    const city = s.destinationCity || 'Unknown';
    const g = map.get(city) ?? { city, total: 0, late: 0 };
    g.total += 1;
    if (s.isLate) g.late += 1;
    map.set(city, g);
  }
  return [...map.values()].sort((a, b) => b.late - a.late || b.total - a.total).slice(0, 10);
}
