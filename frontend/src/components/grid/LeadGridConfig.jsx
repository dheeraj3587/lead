/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { LiquidButton, Button } from "@/components/ui/liquid-glass-button";

// Status badge component
const StatusBadge = ({ value }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "contacted":
        return "bg-yellow-100 text-yellow-800";
      case "qualified":
        return "bg-green-100 text-green-800";
      case "lost":
        return "bg-red-100 text-red-800";
      case "won":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
        value,
      )}`}>
      {value}
    </span>
  );
};

// Source badge component
const SourceBadge = ({ value }) => {
  const getSourceColor = (source) => {
    switch (source) {
      case "website":
      case "facebook_ads":
        return "bg-blue-100 text-blue-800";
      case "google_ads":
        return "bg-green-100 text-green-800";
      case "referral":
        return "bg-purple-100 text-purple-800";
      case "events":
        return "bg-orange-100 text-orange-800";
      case "other":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatSource = (source) =>
    source
      ? source.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
      : "";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceColor(
        value,
      )}`}>
      {formatSource(value)}
    </span>
  );
};

// Action buttons component
const ActionButtons = ({ data, onEdit, onDelete }) => (
  <div className="flex w-full items-center justify-end gap-2 pr-2">
    <Button
      variant="outline"
      type="button"
      onClick={() => onEdit(data)}
      title="Edit Lead">
      Edit
    </Button>
    <LiquidButton
      type="button"
      onClick={() => onDelete(data)}
      title="Delete Lead">
      Delete
    </LiquidButton>
  </div>
);

// Currency formatter
const currencyFormatter = (params) => {
  if (params.value == null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(params.value);
};

// Date formatter
const dateFormatter = (params) => {
  if (!params.value) return "";
  return new Date(params.value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Score cell renderer
const ScoreRenderer = ({ value }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getScoreColor(value)}`}
          style={{ width: `${value || 0}%` }}></div>
      </div>
      <span className="text-sm font-medium text-gray-700 w-8">
        {value ?? 0}
      </span>
    </div>
  );
};

// Boolean renderer
const BooleanRenderer = ({ value }) => (
  <span
    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
    }`}>
    {value ? "Yes" : "No"}
  </span>
);

export const getColumnDefs = (onEdit, onDelete) => [
  {
    headerName: "#",
    field: "_serial",
    width: 70,
    pinned: "left",
    filter: false,
    sortable: false,
    suppressHeaderMenuButton: true,
    valueGetter: (params) => (params?.node ? params.node.rowIndex + 1 : ""),
    cellClass: "text-center text-black dark:text-gray-200",
    headerClass: "text-center text-black dark:text-gray-100",
  },
  {
    headerName: "Name",
    field: "firstName",
    filter: "agTextColumnFilter",
    filterParams: {
      filterOptions: ["equals", "contains"],
      defaultOption: "contains",
    },
    valueGetter: (params) =>
      `${params.data?.firstName ?? ""} ${params.data?.lastName ?? ""}`.trim(),
    width: 180,
    pinned: "left",
  },
  {
    headerName: "Email",
    field: "email",
    filter: "agTextColumnFilter",
    width: 220,
  },
  {
    headerName: "Phone",
    field: "phone",
    filter: "agTextColumnFilter",
    width: 140,
  },
  {
    headerName: "Company",
    field: "company",
    filter: "agTextColumnFilter",
    filterParams: {
      filterOptions: ["equals", "contains"],
      defaultOption: "contains",
    },
    width: 160,
  },
  {
    headerName: "Location",
    field: "city",
    filter: "agTextColumnFilter",
    valueGetter: (params) => {
      const city = params.data?.city ?? "";
      const state = params.data?.state ?? "";
      return city && state ? `${city}, ${state}` : city || state;
    },
    width: 160,
  },
  {
    headerName: "Source",
    field: "source",
    filter: "agTextColumnFilter",
    cellRenderer: SourceBadge,
    width: 120,
  },
  {
    headerName: "Status",
    field: "status",
    filter: "agTextColumnFilter",
    cellRenderer: StatusBadge,
    width: 120,
  },
  {
    headerName: "Score",
    field: "score",
    filter: "agNumberColumnFilter",
    cellRenderer: ScoreRenderer,
    width: 140,
  },
  {
    headerName: "Lead Value",
    field: "leadValue",
    valueGetter: (params) => params.data?.lead_value ?? params.data?.leadValue,
    filter: "agNumberColumnFilter",
    valueFormatter: currencyFormatter,
    width: 120,
  },
  {
    headerName: "Qualified",
    field: "isQualified",
    filter: "agTextColumnFilter",
    cellRenderer: BooleanRenderer,
    width: 100,
  },
  {
    headerName: "Last Activity",
    field: "lastActivityAt",
    filter: "agDateColumnFilter",
    valueFormatter: dateFormatter,
    width: 130,
  },
  {
    headerName: "Created",
    field: "createdAt",
    filter: "agDateColumnFilter",
    valueFormatter: dateFormatter,
    width: 120,
  },
  {
    headerName: "Actions",
    field: "actions",
    filter: false,
    cellRenderer: (params) => (
      <ActionButtons data={params.data} onEdit={onEdit} onDelete={onDelete} />
    ),
    width: 180,
    pinned: "right",
    cellClass: "ag-actions-cell",
  },
];

export const defaultColDef = {
  resizable: true,
  sortable: false,
  filter: true,
  floatingFilter: true,
  suppressHeaderMenuButton: true,
  cellClass: "text-black dark:text-gray-200",
  headerClass: "text-black dark:text-gray-100",
};

export const gridOptions = {
  rowModelType: "infinite",
  cacheBlockSize: 20,
  cacheOverflowSize: 2,
  maxConcurrentDatasourceRequests: 2,
  infiniteInitialRowCount: 20,
  maxBlocksInCache: 10,
  animateRows: true,
  // ✅ fixed API; disable header checkbox (not supported in infinite model)
  rowSelection: {
    mode: "multiRow",
    enableClickSelection: false,
    headerCheckbox: false,
  },
  suppressCellFocus: true,
  getRowId: (params) => params.data?._id,
};
