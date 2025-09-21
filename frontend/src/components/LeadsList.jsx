import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

// Register community modules BEFORE any grid is instantiated
try {
  ModuleRegistry.registerModules([AllCommunityModule]);
} catch {
  // no-op (safe to register multiple times)
}
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  getColumnDefs,
  defaultColDef,
  gridOptions,
} from "./grid/LeadGridConfig";
import LeadServerSideDatasource from "./grid/LeadServerSideDatasource";
import LoadingSpinner from "./LoadingSpinner";
import LeadFormModal from "./LeadFormModal";
import ConfirmModal from "./ConfirmModal";
import leadService from "../services/leadService";
import useFilters from "../hooks/useFilters";
import FilterPanel from "./filters/FilterPanel";
import { LiquidButton, Button } from "@/components/ui/liquid-glass-button";

// Leads grid with infinite scrolling and filter-driven datasource.
const LeadsList = () => {
  // (modules already registered at module scope)
  const { user, logout } = useAuth();
  const gridRef = useRef(null);
  const gridApiRef = useRef(null);
  const datasourceRef = useRef(null);
  const successTimerRef = useRef(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  // Component State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null,
  });
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  // Custom hook for managing filter state and logic
  const {
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    activeFilterCount,
    isLoading: isApplyingFilters,
    setIsLoading: setIsApplyingFilters,
    onFiltersChanged,
  } = useFilters();

  /**
   * Creates a new instance of the server-side datasource.
   * This function is recreated whenever filters change, ensuring the grid
   * fetches data with the latest filter criteria.
   */
  const createDatasource = useCallback(() => {
    if (datasourceRef.current?.destroy) {
      datasourceRef.current.destroy();
    }
    const newDatasource = new LeadServerSideDatasource(
      (errorMessage) => setError(errorMessage),
      (loading) => setIsLoading(loading),
      () => filters, // The datasource uses a function to get the latest filters
      () => setIsApplyingFilters(false),
      gridOptions.cacheBlockSize,
    );
    datasourceRef.current = newDatasource;
    return newDatasource;
  }, [filters, setIsApplyingFilters]); // Dependency on filters and setter

  /**
   * Safely refreshes the grid data by creating and setting a new datasource.
   * This approach is more reliable than just purging the cache for the
   * Infinite Row Model, as it guarantees the new filter state is used.
   */
  const refreshGridData = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return;

    const datasource = createDatasource();
    // v32+ prefers setGridOption
    if (typeof api.setGridOption === "function") {
      api.setGridOption("datasource", datasource);
    } else if (typeof api.setDatasource === "function") {
      api.setDatasource(datasource);
    }
  }, [createDatasource]);

  // Callback to handle filter changes from the useFilters hook
  const applyFilters = useCallback(() => {
    refreshGridData();
  }, [refreshGridData]);

  /**
   * Sets up the grid API and initial datasource when the grid is ready.
   */
  const onGridReady = useCallback(
    (params) => {
      gridApiRef.current = params.api;
      const datasource = createDatasource();
      if (typeof params.api.setGridOption === "function") {
        params.api.setGridOption("datasource", datasource);
      } else if (typeof params.api.setDatasource === "function") {
        params.api.setDatasource(datasource);
      }
    },
    [createDatasource],
  );

  /**
   * Updates the selectedRows state when the user selection changes in the grid.
   */
  const onSelectionChanged = useCallback((event) => {
    // Prefer event.api if available, otherwise use the ref
    const api = event?.api || gridApiRef.current;
    if (api) {
      setSelectedRows(api.getSelectedNodes().map((node) => node.data));
    }
  }, []);

  const handleCreateLead = useCallback(() => {
    setEditingLead(null);
    setIsModalOpen(true);
  }, []);

  const handleEditLead = useCallback((leadData) => {
    setEditingLead(leadData);
    setIsModalOpen(true);
  }, []);

  // --- Notification and Modal Handlers ---

  const clearError = () => setError(null);
  const clearSuccessMessage = () => setSuccessMessage(null);

  const sanitizeMessage = useCallback((message) => {
    if (typeof message !== "string") return "";
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    };
    return message.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  }, []);

  const showSuccess = useCallback(
    (message, duration = 5000) => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      setSuccessMessage(sanitizeMessage(message));
      successTimerRef.current = setTimeout(() => {
        setSuccessMessage(null);
      }, duration);
    },
    [sanitizeMessage],
  );

  const showConfirmModal = useCallback(
    (title, message, onConfirm, onCancel = null) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          hideConfirmModal();
          onConfirm();
        },
        onCancel: () => {
          hideConfirmModal();
          onCancel?.();
        },
      });
    },
    [],
  );

  const hideConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  /**
   * Handles the deletion of a single lead, with confirmation.
   */
  const handleDeleteLead = useCallback(
    (leadData) => {
      const performDelete = async () => {
        setIsLoading(true);
        setError(null); // Clear previous errors before starting the action

        try {
          const result = await leadService.deleteLead(leadData._id);
          if (result?.success) {
            refreshGridData();
            showSuccess(result.message || "Lead deleted successfully.");
          } else {
            // Extract a meaningful error message from the response
            const message =
              result?.message ||
              result?.errors?.[0]?.message ||
              "Failed to delete lead.";
            setError(message);
          }
        } catch (err) {
          console.error("Error deleting lead:", err);
          setError(
            err.message || "A network error occurred. Please try again.",
          );
        } finally {
          setIsLoading(false);
        }
      };

      showConfirmModal(
        "Confirm Deletion",
        `Are you sure you want to delete lead: ${leadData.firstName} ${leadData.lastName}? This action cannot be undone.`,
        performDelete,
      );
    },
    [refreshGridData, showSuccess, showConfirmModal],
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingLead(null);
  }, []);

  const handleFormSuccess = useCallback(
    (lead, action) => {
      handleModalClose();
      refreshGridData();
      const message =
        action === "created"
          ? `Lead "${lead.firstName} ${lead.lastName}" created successfully.`
          : `Lead "${lead.firstName} ${lead.lastName}" updated successfully.`;
      showSuccess(message);
    },
    [refreshGridData, showSuccess, handleModalClose],
  );

  // Memoize column definitions to prevent unnecessary re-renders of the grid
  const columnDefs = useMemo(
    () => getColumnDefs(handleEditLead, handleDeleteLead),
    [handleEditLead, handleDeleteLead],
  );

  // Effect to trigger grid refresh when filter state changes (debounced)
  useEffect(() => {
    if (gridApiRef.current) {
      onFiltersChanged(applyFilters);
    }
  }, [filters, onFiltersChanged, applyFilters]);

  // Smooth the loading overlay to avoid flashing for very fast loads
  useEffect(() => {
    const isBusy = isLoading || isApplyingFilters;
    const SHOW_DELAY_MS = 200; // wait before showing
    const MIN_VISIBLE_MS = 350; // keep visible once shown

    if (isBusy) {
      // cancel pending hide
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      // schedule show if not already visible
      if (!showLoadingOverlay && !showTimerRef.current) {
        showTimerRef.current = setTimeout(() => {
          setShowLoadingOverlay(true);
          showTimerRef.current = null;
        }, SHOW_DELAY_MS);
      }
    } else {
      // cancel pending show
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      // schedule hide if currently visible
      if (showLoadingOverlay && !hideTimerRef.current) {
        hideTimerRef.current = setTimeout(() => {
          setShowLoadingOverlay(false);
          hideTimerRef.current = null;
        }, MIN_VISIBLE_MS);
      }
    }

    return () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isLoading, isApplyingFilters, showLoadingOverlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="glass-header shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Lead Management System
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage and track your leads efficiently.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user?.firstName || "User"}
              </span>
              <LiquidButton onClick={logout}>Logout</LiquidButton>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full py-6 px-4 lg:px-8 bg-white">
        <div className="px-4 py-6 sm:px-0">
          {/* Notifications */}
          {successMessage && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-md flex justify-between items-center">
              <span>{successMessage}</span>
              <Button variant="outline" onClick={clearSuccessMessage}>
                ×
              </Button>
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-md flex justify-between items-center">
              <span>{error}</span>
              <Button variant="outline" onClick={clearError}>
                ×
              </Button>
            </div>
          )}

          {/* Grid Controls */}
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">Leads</h2>
              {selectedRows.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedRows.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <LiquidButton
                onClick={refreshGridData}
                disabled={isLoading || isApplyingFilters}>
                {isLoading ? "Loading..." : "Refresh"}
              </LiquidButton>
              <Button
                variant="outline"
                onClick={() => setIsFilterOpen(true)}
                className="relative">
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 text-xs font-medium bg-blue-500 text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <LiquidButton onClick={handleCreateLead}>Add Lead</LiquidButton>
            </div>
          </div>

          {/* AG Grid */}
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="ag-theme-alpine h-[calc(100vh-240px)] w-full">
              <AgGridReact
                ref={gridRef}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                gridOptions={gridOptions}
                onGridReady={onGridReady}
                onSelectionChanged={onSelectionChanged}
                theme="legacy"
                animateRows={true}
              />
            </div>
          </div>

          {/* Loading Overlay */}
          {showLoadingOverlay && !isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
              <LoadingSpinner
                size="large"
                message={
                  isApplyingFilters ? "Applying filters..." : "Loading leads..."
                }
              />
            </div>
          )}
        </div>
      </main>

      {/* Modals and Panels */}
      <LeadFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        leadData={editingLead}
        onSuccess={handleFormSuccess}
      />
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilter={setFilter}
        clearFilter={clearFilter}
        clearAllFilters={clearAllFilters}
        activeFilterCount={activeFilterCount}
        isApplying={isApplyingFilters}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
        variant="danger"
      />
    </div>
  );
};

export default LeadsList;
