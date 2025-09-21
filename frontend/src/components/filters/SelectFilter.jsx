import React, { useEffect, useMemo, useRef, useState } from 'react';

const SelectFilter = ({ label, field, options = [], value = [], onChange, multiSelect = true, searchable = true }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedValues = useMemo(() => new Set(value), [value]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !search) return options;
    const q = String(search).toLowerCase();
    return options.filter(o => String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q));
  }, [options, search, searchable]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleValue = (val) => {
    if (multiSelect) {
      const next = new Set(selectedValues);
      if (next.has(val)) next.delete(val); else next.add(val);
      onChange?.(Array.from(next));
    } else {
      onChange?.([val]);
      setOpen(false);
    }
  };

  const selectAll = () => onChange?.(options.map(o => o.value));
  const clearAll = () => onChange?.([]);

  const display = useMemo(() => {
    if (!value || value.length === 0) return 'Any';
    if (!multiSelect) {
      const match = options.find(o => o.value === value[0]);
      return match ? match.label : String(value[0]);
    }
    return `${value.length} selected`;
  }, [value, multiSelect, options]);

  return (
    <div className="border rounded-md p-3 border-gray-200" ref={containerRef}>
      <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
      <button
        type="button"
        className="w-full text-left px-3 py-2 border border-gray-300 rounded flex items-center justify-between hover:bg-gray-50"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{display}</span>
        <span className="text-gray-500">▾</span>
      </button>

      {open && (
        <div className="mt-2 border border-gray-200 rounded shadow bg-white max-h-64 overflow-auto" role="listbox">
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
            </div>
          )}

          {multiSelect && (
            <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-600 border-b border-gray-100">
              <button className="underline" onClick={selectAll} type="button">Select All</button>
              <button className="underline" onClick={clearAll} type="button">Clear All</button>
            </div>
          )}

          <ul className="p-2">
            {filteredOptions.map(opt => (
              <li key={`${field}-${String(opt.value)}`}>
                <label className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.has(opt.value)}
                    onChange={() => toggleValue(opt.value)}
                    aria-checked={selectedValues.has(opt.value)}
                    role="option"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              </li>
            ))}
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No options</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SelectFilter;
