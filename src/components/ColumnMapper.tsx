import { FIELDS, mappingProblems, type FieldKey, type Mapping } from '../lib/mapping';

interface Props {
  headers: string[];
  mapping: Mapping;
  onChange: (m: Mapping) => void;
  onConfirm: () => void;
  onCancel: () => void;
  previewRows: number;
}

export function ColumnMapper({ headers, mapping, onChange, onConfirm, onCancel, previewRows }: Props) {
  const problems = mappingProblems(mapping);
  function set(key: FieldKey, value: string) {
    const next = { ...mapping };
    if (!value) delete next[key];
    else next[key] = value;
    onChange(next);
  }
  return (
    <div className="mapper">
      <h3>Map your columns</h3>
      <p className="sub">
        Auto-detected from {previewRows} rows. Adjust anything that looks wrong, then import.
        Synonyms cover Shiprocket / Delhivery / Blue Dart API field names we could verify.
      </p>
      <div className="mapper-grid">
        {FIELDS.map((f) => (
          <label key={f.key} className="mapper-field">
            <span>
              {f.label}
              {f.required ? <em> *</em> : null}
            </span>
            <select
              className="field"
              value={mapping[f.key] || ''}
              onChange={(e) => set(f.key, e.target.value)}
              aria-label={`Map ${f.label}`}
            >
              <option value="">— skip —</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <small>{f.hint}</small>
          </label>
        ))}
      </div>
      {problems.length > 0 && (
        <div className="err" role="alert">{problems.join(' ')}</div>
      )}
      <div className="upload-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={problems.length > 0}
          onClick={onConfirm}
        >
          Import {previewRows} rows
        </button>
      </div>
    </div>
  );
}
