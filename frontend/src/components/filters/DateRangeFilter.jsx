import React, { useEffect, useMemo, useState } from "react";

// Build a local YYYY-MM-DD string from a Date object without converting to UTC.
// Expected: a valid JS Date (local timezone), returns local date parts.
const toLocalYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const DateRangeFilter = ({
  label,
  field,
  value = { start: "", end: "", mode: "between" },
  onChange,
  presets = [],
  allowSingleDate = true,
}) => {
  const [local, setLocal] = useState({
    start: value.start ?? "",
    end: value.end ?? "",
    mode: value.mode ?? "between",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setLocal({
      start: value.start ?? "",
      end: value.end ?? "",
      mode: value.mode ?? "between",
    });
  }, [value.start, value.end, value.mode]);

  useEffect(() => {
    validate(local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.start, local.end, local.mode]);

  const validate = (v) => {
    if (v.mode === "on") {
      if (!v.start) return setError("Pick a date");
      return setError("");
    }
    if (!v.start && !v.end) return setError("");
    if (v.start && v.end && new Date(v.start) > new Date(v.end))
      return setError("Start must be before end");
    setError("");
  };

  const applyPreset = (preset) => {
    onChange?.({ start: preset.start, end: preset.end, mode: "between" });
  };

  // Default presets if none provided
  const defaultPresets = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    // Clone today before subtracting to avoid mutating the reference
    const d7 = new Date(today);
    d7.setDate(d7.getDate() - 7);
    const d30 = new Date(today);
    d30.setDate(d30.getDate() - 30);
    return [
      { label: "Today", start: toLocalYMD(today), end: toLocalYMD(today) },
      { label: "Last 7 days", start: toLocalYMD(d7), end: toLocalYMD(today) },
      { label: "Last 30 days", start: toLocalYMD(d30), end: toLocalYMD(today) },
      {
        label: "This Month",
        start: toLocalYMD(startOfMonth),
        end: toLocalYMD(endOfMonth),
      },
    ];
  }, []);

  const usePresets = presets && presets.length > 0 ? presets : defaultPresets;

  const handleChange = (key, val) => {
    const next = { ...local, [key]: val };
    setLocal(next);
    onChange?.(next);
  };

  return (
    <div
      className={`border rounded-md p-3 ${
        value.start || value.end
          ? "border-blue-300 bg-blue-50"
          : "border-gray-200"
      }`}>
      <label className="block text-xs font-medium text-gray-600 mb-2">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <select
          value={local.mode}
          onChange={(e) => handleChange("mode", e.target.value)}
          className="px-2 py-2 border border-gray-300 rounded"
          aria-label="Date filter mode">
          {allowSingleDate && <option value="on">On</option>}
          <option value="between">Between</option>
        </select>

        {/* Start date input */}
        <input
          type="date"
          value={local.start || ""}
          onChange={(e) => handleChange("start", e.target.value)}
          placeholder="Start date"
          className="px-3 py-2 border border-gray-300 rounded"
          aria-labelledby={`${field}-start`}
        />

        {/* End datepicker */}
        {local.mode === "between" && (
          <input
            type="date"
            value={local.end || ""}
            onChange={(e) => handleChange("end", e.target.value)}
            placeholder="End date"
            className="px-3 py-2 border border-gray-300 rounded"
            aria-labelledby={`${field}-end`}
          />
        )}
      </div>

      {usePresets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {usePresets.map((p) => (
            <button
              key={`${field}-${p.label}`}
              type="button"
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
              onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      {(value.start || value.end) && (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs underline text-gray-600"
            onClick={() =>
              onChange?.({
                start: "",
                end: "",
                mode: allowSingleDate ? "on" : "between",
              })
            }>
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
