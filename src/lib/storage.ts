import type { Shipment } from './types';

const DATASETS_KEY = 'tracklite.datasets.v1';
const ACTIVE_KEY = 'tracklite.active.v1';

export interface SavedDataset {
  id: string;
  name: string;
  source: string;
  savedAt: string;
  count: number;
  shipments: SerializedShipment[];
}

type SerializedShipment = Omit<Shipment, 'createdAt' | 'promisedDate' | 'deliveredAt' | 'events'> & {
  createdAt: string;
  promisedDate: string | null;
  deliveredAt: string | null;
  events: Array<{ at: string; rawCode: string; location: string; remark: string; status: Shipment['currentStatus'] }>;
};

function serialize(shipments: Shipment[]): SerializedShipment[] {
  return shipments.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    promisedDate: s.promisedDate ? s.promisedDate.toISOString() : null,
    deliveredAt: s.deliveredAt ? s.deliveredAt.toISOString() : null,
    events: s.events.map((e) => ({ ...e, at: e.at.toISOString() })),
  }));
}

function deserialize(list: SerializedShipment[]): Shipment[] {
  return list.map((s) => ({
    ...s,
    createdAt: new Date(s.createdAt),
    promisedDate: s.promisedDate ? new Date(s.promisedDate) : null,
    deliveredAt: s.deliveredAt ? new Date(s.deliveredAt) : null,
    events: s.events.map((e) => ({ ...e, at: new Date(e.at) })),
  }));
}

export function listDatasets(): SavedDataset[] {
  try {
    const all = JSON.parse(localStorage.getItem(DATASETS_KEY) || '[]') as SavedDataset[];
    return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

export function saveDataset(name: string, source: string, shipments: Shipment[]): SavedDataset {
  const ds: SavedDataset = {
    id: `ds_${Date.now().toString(36)}`,
    name: name.trim() || source || 'Untitled',
    source,
    savedAt: new Date().toISOString(),
    count: shipments.length,
    shipments: serialize(shipments),
  };
  const all = listDatasets().filter((d) => d.name !== ds.name);
  all.unshift(ds);
  localStorage.setItem(DATASETS_KEY, JSON.stringify(all.slice(0, 8)));
  localStorage.setItem(ACTIVE_KEY, ds.id);
  return ds;
}

export function loadDataset(id: string): { shipments: Shipment[]; meta: SavedDataset } | null {
  const meta = listDatasets().find((d) => d.id === id);
  if (!meta) return null;
  localStorage.setItem(ACTIVE_KEY, id);
  return { shipments: deserialize(meta.shipments), meta };
}

export function deleteDataset(id: string) {
  const all = listDatasets().filter((d) => d.id !== id);
  localStorage.setItem(DATASETS_KEY, JSON.stringify(all));
  if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
}

export function restoreActive(): { shipments: Shipment[]; source: string } | null {
  try {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (!id) return null;
    const loaded = loadDataset(id);
    if (!loaded) return null;
    return { shipments: loaded.shipments, source: loaded.meta.name };
  } catch {
    return null;
  }
}
