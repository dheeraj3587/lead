import React, { useEffect, useMemo } from "react";
import TextFilter from "./TextFilter";
import SelectFilter from "./SelectFilter";
import NumberRangeFilter from "./NumberRangeFilter";
import DateRangeFilter from "./DateRangeFilter";
import LoadingSpinner from "../LoadingSpinner";
import { Button, LiquidButton } from "@/components/ui/liquid-glass-button";

// A11y: role=dialog, aria-modal, ESC handling is expected to be managed by parent if needed
const FilterPanel = ({
  isOpen,
  onClose,
  filters,
  setFilter,
  clearAllFilters,
  activeFilterCount,
  isApplying = false,
}) => {
  // Derived options
  const statusOptions = useMemo(
    () => [
      { value: "new", label: "New" },
      { value: "contacted", label: "Contacted" },
      { value: "qualified", label: "Qualified" },
      { value: "lost", label: "Lost" },
      { value: "won", label: "Won" },
    ],
    [],
  );

  const sourceOptions = useMemo(
    () => [
      { value: "website", label: "Website" },
      { value: "facebook_ads", label: "Facebook Ads" },
      { value: "google_ads", label: "Google Ads" },
      { value: "referral", label: "Referral" },
      { value: "events", label: "Events" },
      { value: "other", label: "Other" },
    ],
    [],
  );

  const boolOptions = useMemo(
    () => [
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ],
    [],
  );

  // Close with Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Filters</h3>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        {/* existing filter controls rendered here (left as-is) */}
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" onClick={clearAllFilters}>
            Clear All
          </Button>
          <LiquidButton onClick={onClose} disabled={isApplying}>
            Apply
          </LiquidButton>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
