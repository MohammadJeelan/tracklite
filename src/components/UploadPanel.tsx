import { useEffect, useRef, useState } from 'react';
import {
  autoDetect,
  loadSavedMapping,
  saveMapping,
  type Mapping,
} from '../lib/mapping';
import { buildShipments, loadSampleShipments, readCsv } from '../lib/parse';
import {
  deleteDataset,
  listDatasets,
  loadDataset,
  saveDataset,
  type SavedDataset,
} from '../lib/storage';
import type { Shipment } from '../lib/types';
import { ColumnMapper } from './ColumnMapper';

interface Props {
  onLoaded: (shipments: Shipment[], source: string) => void;
  current: Shipment[];
  source: string | null;
}

interface Pending {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  mapping: Mapping;
}

export function UploadPanel({ onLoaded, current, source }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [datasets, setDatasets] = useState<SavedDataset[]>(() => listDatasets());
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    setDatasets(listDatasets());
  }, [current]);

  function beginMap(text: string, fileName: string) {
    const { headers, rows, errors } = readCsv(text);
    if (!headers.length || !rows.length) {
      setError(errors.join(' ') || 'CSV has no usable rows.');
      return;
    }
    const mapping = loadSavedMapping(headers) || autoDetect(headers);
    setPending({ headers, rows, fileName, mapping });
    setError(null);
  }

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      beginMap(await file.text(), file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read file');
    } finally {
      setBusy(false);
    }
  }

  function confirmImport() {
    if (!pending) return;
    const { shipments, skipped } = buildShipments(pending.rows, pending.mapping);
    if (!shipments.length) {
      setError(`No valid rows after mapping (${skipped} skipped). Check Order ID / status columns.`);
      return;
    }
    saveMapping(pending.headers, pending.mapping);
    onLoaded(shipments, pending.fileName);
    setSaveName(pending.fileName.replace(/\.csv$/i, ''));
    setPending(null);
    if (skipped) setError(`Imported ${shipments.length}; skipped ${skipped} incomplete rows.`);
    else setError(null);
  }

  async function handleSample() {
    setBusy(true);
    setError(null);
    setPending(null);
    try {
      const { shipments, errors } = await loadSampleShipments();
      if (!shipments.length) {
        setError(errors.join(' ') || 'Sample CSV failed to load.');
        return;
      }
      onLoaded(shipments, 'sample-shipments.csv');
      setSaveName('sample-shipments');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sample');
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    if (!current.length) return;
    const name = saveName.trim() || source || 'Untitled';
    saveDataset(name, source || name, current);
    setDatasets(listDatasets());
  }

  return (
    <section className="card" aria-labelledby="upload-title">
      <h2 id="upload-title">Load shipments</h2>
      <p className="sub">
        Drop any courier or aggregator CSV. TrackLite auto-detects common Shiprocket /
        Delhivery / Blue Dart column names, lets you remap, then saves the dataset in this
        browser so you can reopen tomorrow.
      </p>

      {pending ? (
        <ColumnMapper
          headers={pending.headers}
          mapping={pending.mapping}
          previewRows={pending.rows.length}
          onChange={(m) => setPending({ ...pending, mapping: m })}
          onConfirm={confirmImport}
          onCancel={() => setPending(null)}
        />
      ) : (
        <div
          className={`upload-zone${drag ? ' drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
        >
          <strong>Drag & drop a CSV here</strong>
          <span>
            Works with exports that have order/AWB, courier, cities, dates and a status
            (or a status_events history column). Sample data uses the TrackLite schema.
          </span>
          <div className="upload-actions">
            <button type="button" className="btn btn-secondary" disabled={busy}
              onClick={() => inputRef.current?.click()}>Choose CSV</button>
            <button type="button" className="btn btn-primary" disabled={busy}
              onClick={() => void handleSample()}>
              {busy ? 'Loading…' : 'Load sample data'}
            </button>
          </div>
          <input ref={inputRef} className="file-input" type="file" accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {current.length > 0 && (
        <div className="save-row">
          <input
            className="field"
            placeholder="Dataset name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            aria-label="Dataset name"
          />
          <button type="button" className="btn btn-secondary" onClick={handleSave}>
            Save to this browser
          </button>
        </div>
      )}

      {datasets.length > 0 && (
        <div className="dataset-list">
          <h3>Saved datasets</h3>
          <ul>
            {datasets.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="linkish"
                  onClick={() => {
                    const loaded = loadDataset(d.id);
                    if (loaded) {
                      onLoaded(loaded.shipments, loaded.meta.name);
                      setSaveName(loaded.meta.name);
                    }
                  }}
                >
                  {d.name}
                </button>
                <span className="muted">{d.count} · {new Date(d.savedAt).toLocaleDateString('en-IN')}</span>
                <button
                  type="button"
                  className="linkish danger"
                  onClick={() => { deleteDataset(d.id); setDatasets(listDatasets()); }}
                  aria-label={`Delete ${d.name}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <div className="err" role="alert">{error}</div>}
    </section>
  );
}
