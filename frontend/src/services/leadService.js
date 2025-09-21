import api from "./api";

// Date helpers
// Expected input format: 'YYYY-MM-DD' (ISO date without time)
function toStartOfDayUTC(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
}

// Expected input format: 'YYYY-MM-DD' (ISO date without time)
function toEndOfDayUTC(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
}

class LeadService {
  // Normalize axios errors to a consistent shape
  normalizeError(error) {
    const resp =
      error && error.response && error.response.data
        ? error.response.data
        : null;
    const message =
      (resp && (resp.message || resp.error || resp.title)) ||
      error.message ||
      "Request failed";
    // Try common fields for validation errors
    let errors = [];
    if (resp) {
      if (Array.isArray(resp.errors)) {
        errors = resp.errors;
      } else if (Array.isArray(resp.details)) {
        errors = resp.details;
      } else if (
        resp.validationErrors &&
        Array.isArray(resp.validationErrors)
      ) {
        errors = resp.validationErrors;
      }
    }
    return { success: false, message, errors };
  }

  // Standardize success responses
  _handleSuccess({ data = null, meta, message } = {}) {
    const out = { success: true, data };
    if (message) out.message = message;
    if (meta) out.meta = meta;
    return out;
  }

  // Wrap API requests with unified error handling
  async _safeRequest(fn) {
    try {
      return await fn();
    } catch (error) {
      return this.normalizeError(error);
    }
  }

  // Get leads with pagination and filtering
  async getLeads(params = {}) {
    return this._safeRequest(async () => {
      const qp = {};
      // pagination: support skip/limit (cursor-style) and map to page/limit for backend
      if (params.skip != null && params.limit != null) {
        const limitNum = Number(params.limit) || 20;
        const skipNum = Number(params.skip) || 0;
        qp.limit = limitNum;
        qp.page = Math.floor(skipNum / limitNum) + 1;
      } else {
        if (params.page != null) qp.page = params.page;
        if (params.limit != null) qp.limit = params.limit;
      }
      // filters
      const filters = params.filters || {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          qp[key] = value;
        }
      });

      // Optional scope to view all leads (dev/demo only; backend guards in prod)
      if (params.scope === "all") {
        qp.scope = "all";
      }

      // sorting (optional): pass through to backend if supported
      if (params.sort && params.sort.sortBy) {
        qp.sortBy = params.sort.sortBy;
        qp.sortDir = params.sort.sortDir === "asc" ? "asc" : "desc";
      }

      const response = await api.get("/leads", { params: qp });
      return this._handleSuccess({
        data: response.data.data,
        meta: {
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total,
          totalPages: response.data.totalPages,
        },
      });
    });
  }

  // Get single lead by ID
  async getLead(id) {
    return this._safeRequest(async () => {
      const response = await api.get(`/leads/${id}`);
      return this._handleSuccess({ data: response.data.lead });
    });
  }

  // Create new lead
  async createLead(leadData) {
    return this._safeRequest(async () => {
      const response = await api.post("/leads", leadData);
      return this._handleSuccess({
        data: response.data.lead,
        message: response.data.message,
      });
    });
  }

  // Update lead
  async updateLead(id, leadData) {
    return this._safeRequest(async () => {
      const response = await api.put(`/leads/${id}`, leadData);
      return this._handleSuccess({
        data: response.data.lead,
        message: response.data.message,
      });
    });
  }

  // Delete lead
  async deleteLead(id) {
    return this._safeRequest(async () => {
      const response = await api.delete(`/leads/${id}`);
      return this._handleSuccess({
        data: null,
        message: response.data.message,
      });
    });
  }

  // Transform AG Grid filter model to backend query parameters
  transformFiltersForAPI(filterModel) {
    const filters = {};

    Object.entries(filterModel).forEach(([field, filter]) => {
      if (!filter) return;

      switch (filter.filterType) {
        case "text":
          if (filter.type === "equals") {
            if (field === "firstName") {
              // Combined Name column: match either first or last name
              filters["firstName"] = filter.filter;
              filters["lastName"] = filter.filter;
            } else {
              filters[field] = filter.filter;
            }
          } else if (filter.type === "contains") {
            if (field === "firstName") {
              // Combined Name column: search both first and last
              filters["firstName_contains"] = filter.filter;
              filters["lastName_contains"] = filter.filter;
            } else {
              filters[`${field}_contains`] = filter.filter;
            }
          }
          break;

        case "number":
          if (filter.type === "equals") {
            filters[field] = filter.filter;
          } else if (filter.type === "greaterThan") {
            filters[`${field}_gt`] = filter.filter;
          } else if (filter.type === "lessThan") {
            filters[`${field}_lt`] = filter.filter;
          } else if (filter.type === "inRange") {
            filters[`${field}_between`] = `${filter.filter},${filter.filterTo}`;
          }
          break;

        case "date":
          if (filter.type === "equals") {
            filters[`${field}_on`] = filter.dateFrom;
          } else if (filter.type === "greaterThan") {
            filters[`${field}_after`] = filter.dateFrom;
          } else if (filter.type === "lessThan") {
            filters[`${field}_before`] = filter.dateFrom;
          } else if (filter.type === "inRange") {
            filters[`${field}_between`] = `${filter.dateFrom},${filter.dateTo}`;
          }
          break;

        case "set":
          if (filter.values && filter.values.length > 0) {
            const values = filter.values.map((v) =>
              typeof v === "boolean" ? String(v) : v,
            );
            filters[`${field}_in`] = values.join(",");
          }
          break;

        default:
          // Handle simple value filters
          if (filter.filter !== undefined) {
            filters[field] = filter.filter;
          }
      }
    });

    return filters;
  }

  // Transform custom filter state from useFilters into backend query parameters
  transformCustomFiltersForAPI(custom) {
    if (!custom) return {};
    const params = {};

    // Text: equals/contains
    Object.entries(custom.text || {}).forEach(([field, cfg]) => {
      const val = (cfg && cfg.value) || "";
      if (!val) return;
      if (cfg.mode === "equals") params[field] = val;
      else params[`${field}_contains`] = val;
    });

    // Selects: arrays to comma CSV; booleans must be normalized to string true/false
    Object.entries(custom.select || {}).forEach(([field, arr]) => {
      if (!arr || arr.length === 0) return;
      const values = arr.map((v) => (typeof v === "boolean" ? String(v) : v));
      params[`${field}_in`] = values.join(",");
    });

    // Numbers: between or gt/lt if only one side
    Object.entries(custom.number || {}).forEach(([field, range]) => {
      const hasMin =
        range &&
        range.min !== "" &&
        range.min !== null &&
        range.min !== undefined;
      const hasMax =
        range &&
        range.max !== "" &&
        range.max !== null &&
        range.max !== undefined;
      if (!hasMin && !hasMax) return;
      if (hasMin && hasMax)
        params[`${field}_between`] = `${range.min},${range.max}`;
      else if (hasMin) params[`${field}_gt`] = range.min;
      else if (hasMax) params[`${field}_lt`] = range.max;
    });

    // Dates: on / between / before / after (no empty bounds); input YYYY-MM-DD
    Object.entries(custom.date || {}).forEach(([field, cfg]) => {
      if (!cfg) return;
      const { start, end, mode } = cfg;
      if (mode === "on" && start) {
        params[`${field}_on`] = toStartOfDayUTC(start);
      } else if (start && end) {
        params[`${field}_between`] = `${toStartOfDayUTC(start)},${toEndOfDayUTC(
          end,
        )}`;
      } else if (start && !end) {
        params[`${field}_after`] = toStartOfDayUTC(start);
      } else if (end && !start) {
        params[`${field}_before`] = toEndOfDayUTC(end);
      }
    });

    // Standardize lead value keys to snake_case only, removing camelCase duplicates
    if (params["leadValue_between"]) {
      params["lead_value_between"] = params["leadValue_between"];
      delete params["leadValue_between"];
    }
    if (params["leadValue_gt"]) {
      params["lead_value_gt"] = params["leadValue_gt"];
      delete params["leadValue_gt"];
    }
    if (params["leadValue_lt"]) {
      params["lead_value_lt"] = params["leadValue_lt"];
      delete params["leadValue_lt"];
    }

    return params;
  }
}

export default new LeadService();
