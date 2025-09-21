import React, { useEffect, useState, useCallback } from 'react';

const NumberRangeFilter = ({ label, field, min = 0, max = null, step = 1, value = { min: '', max: '' }, onChange, presets = [], currency = false }) => {
  const [local, setLocal] = useState({ min: value.min ?? '', max: value.max ?? '' });
  const [error, setError] = useState('');

  useEffect(() => {
    setLocal({ min: value.min ?? '', max: value.max ?? '' });
  }, [value.min, value.max]);

  useEffect(() => {
    validate(local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.min, local.max, min, max]);

  const fmtCurrency = (n) => {
    if (n === '' || n === null || n === undefined || isNaN(Number(n))) return '';
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(n));
  };

  const validate = useCallback((v) => {
    const from = v.min === '' ? null : Number(v.min);
    const to = v.max === '' ? null : Number(v.max);
    if (from !== null && isNaN(from)) return setError('Invalid minimum');
    if (to !== null && isNaN(to)) return setError('Invalid maximum');
    if (from !== null && max !== null && from > max) return setError('Min exceeds allowed max');
    if (to !== null && max !== null && to > max) return setError('Max exceeds allowed max');
    if (from !== null && to !== null && from > to) return setError('Min must be <= max');
    if (from !== null && from < (min ?? 0)) return setError('Min is below allowed');
    if (to !== null && to < (min ?? 0)) return setError('Max is below allowed');
    setError('');
  }, [min, max]);

  const handleChange = (key, val) => {
    const next = { ...local, [key]: val };
    setLocal(next);
    onChange?.(next);
  };

  return (
    <div className={`border rounded-md p-3 ${value.min !== '' || value.max !== '' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
      <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step={step}
          min={min ?? undefined}
          max={max ?? undefined}
          value={local.min}
          onChange={(e) => handleChange('min', e.target.value)}
          placeholder="Min"
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`${label} minimum`}
        />
        <input
          type="number"
          step={step}
          min={min ?? undefined}
          max={max ?? undefined}
          value={local.max}
          onChange={(e) => handleChange('max', e.target.value)}
          placeholder="Max"
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`${label} maximum`}
        />
      </div>

      {currency && (value.min || value.max) && (
        <div className="mt-2 text-xs text-gray-600">
          {fmtCurrency(value.min)} {value.min ? ' - ' : ''}{fmtCurrency(value.max)}
        </div>
      )}

      {presets && presets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={`${field}-${p.label}`}
              type="button"
              onClick={() => onChange?.({ min: p.min, max: p.max })}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      {(value.min || value.max) && (
        <div className="mt-2">
          <button type="button" className="text-xs underline text-gray-600" onClick={() => onChange?.({ min: '', max: '' })}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default NumberRangeFilter;
