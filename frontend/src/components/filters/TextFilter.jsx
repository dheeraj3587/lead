import React, { useEffect, useRef, useState } from 'react';

const TextFilter = ({ label, field, value = '', mode = 'contains', onChange, placeholder = '' }) => {
  const [localValue, setLocalValue] = useState(value);
  const [localMode, setLocalMode] = useState(mode);
  const [isActive, setIsActive] = useState(!!value);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
    setIsActive(!!value);
  }, [value]);

  useEffect(() => {
    setLocalMode(mode);
  }, [mode]);

  const applyChange = (nextValue, nextMode) => {
    onChange?.(nextValue, nextMode);
  };

  const onInputChange = (e) => {
    const next = e.target.value;
    setLocalValue(next);
    setIsActive(!!next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyChange(next, localMode), 300);
  };

  const onModeChange = (e) => {
    const nextMode = e.target.value;
    setLocalMode(nextMode);
    applyChange(localValue, nextMode);
  };

  const onClear = () => {
    setLocalValue('');
    setIsActive(false);
    applyChange('', localMode);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') applyChange(localValue, localMode);
    if (e.key === 'Escape') onClear();
  };

  return (
    <div className={`border rounded-md p-3 ${isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
      <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={localValue}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`${label} filter input`}
        />
        {localValue && (
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
            aria-label={`Clear ${label} filter`}
          >
            ×
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center space-x-4 text-sm">
        <label className="inline-flex items-center space-x-1">
          <input
            type="radio"
            name={`mode-${field}`}
            value="equals"
            checked={localMode === 'equals'}
            onChange={onModeChange}
          />
          <span>Equals</span>
        </label>
        <label className="inline-flex items-center space-x-1">
          <input
            type="radio"
            name={`mode-${field}`}
            value="contains"
            checked={localMode === 'contains'}
            onChange={onModeChange}
          />
          <span>Contains</span>
        </label>
      </div>
    </div>
  );
};

export default TextFilter;
