import leadService from "../../services/leadService";

class LeadServerSideDatasource {
  constructor(
    onError,
    onLoading,
    getCustomFilters,
    onComplete,
    blockSize = 20,
  ) {
    this.onError = onError;
    this.onLoading = onLoading;
    this.getCustomFilters = getCustomFilters;
    this.onComplete = onComplete;
    this.blockSize = Number(blockSize) || 20;
  }

  getRows(params) {
    this.onLoading(true);

    const startRow = Number(params.startRow) || 0;
    const requested = Math.max(1, (Number(params.endRow) || 0) - startRow);
    const limit = this.blockSize || requested;
    const skip = startRow;

    const gridFilters = leadService.transformFiltersForAPI(
      params.filterModel || {},
    );
    const customState =
      typeof this.getCustomFilters === "function"
        ? this.getCustomFilters()
        : null;
    const customFilters = leadService.transformCustomFiltersForAPI(customState);
    const filters = { ...gridFilters, ...customFilters };

    let sort = { sortBy: "createdAt", sortDir: "desc" };
    const sortModel = params.sortModel;
    if (Array.isArray(sortModel) && sortModel.length > 0) {
      const primary = sortModel[0];
      if (primary && primary.colId && primary.sort) {
        sort = { sortBy: primary.colId, sortDir: primary.sort };
      }
    }

    leadService
      .getLeads({ skip, limit, filters, sort, scope: "all" })
      .then((result) => {
        this.onLoading(false);

        if (result.success) {
          const rows = Array.isArray(result.data)
            ? result.data.map((r) => ({
                _id: r?._id,
                firstName: r?.firstName ?? "",
                lastName: r?.lastName ?? "",
                email: r?.email ?? "",
                phone: r?.phone ?? "",
                company: r?.company ?? "",
                city: r?.city ?? "",
                state: r?.state ?? "",
                source: r?.source ?? "",
                status: r?.status ?? "",
                score: Number.isFinite(r?.score) ? r.score : 0,
                leadValue: r?.lead_value ?? r?.leadValue ?? 0,
                isQualified: Boolean(r?.isQualified),
                lastActivityAt: r?.lastActivityAt ?? null,
                createdAt: r?.createdAt ?? null,
              }))
            : [];

          const meta = result.meta || {};
          const total = Number(meta.total) || 0;
          const currentLastRow = skip + rows.length;
          const lastRow = currentLastRow >= total ? total : -1;

          if (typeof params.successCallback === "function") {
            params.successCallback(rows, lastRow);
          } else if (typeof params.success === "function") {
            params.success({ rowData: rows, rowCount: lastRow });
          }
        } else {
          this.onError(result.message || "Failed to load leads");
          if (typeof params.failCallback === "function") params.failCallback();
          else if (typeof params.fail === "function") params.fail();
        }
      })
      .catch((error) => {
        this.onLoading(false);
        console.error("Error loading leads:", error);
        this.onError("Failed to load leads. Please try again.");
        if (typeof params.failCallback === "function") params.failCallback();
        else if (typeof params.fail === "function") params.fail();
      })
      .finally(() => {
        try {
          if (typeof this.onComplete === "function") {
            this.onComplete();
          }
        } catch {}
      });
  }

  destroy() {}
}

export default LeadServerSideDatasource;
