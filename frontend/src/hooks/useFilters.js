import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

function createInitialState() {
  return {
    text: {
      firstName: { value: "", mode: "contains" },
      lastName: { value: "", mode: "contains" },
      email: { value: "", mode: "equals" },
      company: { value: "", mode: "contains" },
      city: { value: "", mode: "contains" },
      state: { value: "", mode: "contains" },
    },
    select: {
      status: [],
      source: [],
      isQualified: [], // [true] or [false]
    },
    number: {
      score: { min: "", max: "" },
      leadValue: { min: "", max: "" },
    },
    date: {
      createdAt: { start: "", end: "", mode: "between" },
      lastActivityAt: { start: "", end: "", mode: "between" },
    },
  };
}

const isPlainObject = (obj) =>
  Object.prototype.toString.call(obj) === "[object Object]";
const deepClone = (obj) => {
  try {
    return obj == null ? obj : structuredClone(obj);
  } catch {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_FILTER": {
      const { group, field, value } = action.payload || {};
      if (!group || !field) return state;
      const currentGroup = state[group];
      if (!currentGroup || typeof currentGroup !== "object") {
        console.warn(`[useFilters] Unknown group in SET_FILTER: ${group}`);
        return state;
      }
      if (!(field in currentGroup)) {
        console.warn(
          `[useFilters] Unknown field in SET_FILTER: ${group}.${field}`,
        );
        return state;
      }
      const currentFieldVal = currentGroup[field];
      const nextFieldVal =
        isPlainObject(currentFieldVal) && isPlainObject(value)
          ? { ...currentFieldVal, ...value }
          : value;
      return { ...state, [group]: { ...currentGroup, [field]: nextFieldVal } };
    }
    case "CLEAR_FILTER": {
      const { group, field } = action.payload || {};
      if (!group || !field) return state;
      const groupObj = state[group];
      if (!groupObj || typeof groupObj !== "object") {
        console.warn(`[useFilters] Unknown group in CLEAR_FILTER: ${group}`);
        return state;
      }
      if (!(field in groupObj)) {
        console.warn(
          `[useFilters] Unknown field in CLEAR_FILTER: ${group}.${field}`,
        );
        return state;
      }
      const next = { ...groupObj };
      if (group === "text")
        next[field] = { value: "", mode: next[field]?.mode || "contains" };
      if (group === "select") next[field] = [];
      if (group === "number") next[field] = { min: "", max: "" };
      if (group === "date")
        next[field] = {
          start: "",
          end: "",
          mode: next[field]?.mode || "between",
        };
      return { ...state, [group]: next };
    }
    case "RESET":
      return createInitialState();
    case "HYDRATE":
      return deepClone(action.payload) || createInitialState();
    default:
      return state;
  }
}

export default function useFilters() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  // persistence: URL + localStorage
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const encoded = urlParams.get("f") || urlParams.get("filters");
      if (encoded) {
        const parsed = JSON.parse(encoded);
        dispatch({ type: "HYDRATE", payload: parsed });
        return;
      }
      const saved = localStorage.getItem("leadFilters");
      if (saved) {
        dispatch({ type: "HYDRATE", payload: JSON.parse(saved) });
      }
    } catch {
      /* ignore persistence errors */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("leadFilters", JSON.stringify(state));
    } catch {
      /* ignore persistence errors */
    }
    // URL sync: full state
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = JSON.stringify(state);
      params.set("f", raw);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    } catch {
      /* ignore URL sync errors (e.g., CSP or long URLs) */
    }
  }, [state]);

  const setFilter = useCallback((group, field, value) => {
    dispatch({ type: "SET_FILTER", payload: { group, field, value } });
  }, []);

  const clearFilter = useCallback((group, field) => {
    dispatch({ type: "CLEAR_FILTER", payload: { group, field } });
  }, []);

  const clearAllFilters = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const activeCount = useMemo(() => activeFilterCount(state), [state]);

  // Debounced signal for applying filters externally (stable)
  const onFiltersChanged = useCallback((applyFn) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // new request
    const myId = ++requestIdRef.current;
    setErrors(null);
    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      try {
        // Do not set isLoading(false) here; the datasource will signal completion
        applyFn();
      } catch (e) {
        if (requestIdRef.current === myId) {
          setErrors(e?.message || "Failed to apply filters");
          setIsLoading(false);
        }
      }
    }, 300);
  }, []);

  // cleanup: clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    filters: state,
    setFilter,
    clearFilter,
    clearAllFilters,
    activeFilterCount: activeCount,
    isLoading,
    setIsLoading,
    errors,
    onFiltersChanged,
  };
}

function activeFilterCount(state) {
  let count = 0;
  Object.values(state.text).forEach(({ value }) => {
    if (value) count += 1;
  });
  Object.values(state.select).forEach((arr) => {
    if (arr && arr.length > 0) count += 1;
  });
  Object.values(state.number).forEach(({ min, max }) => {
    if (min !== "" || max !== "") count += 1;
  });
  Object.values(state.date).forEach(({ start, end }) => {
    if (start || end) count += 1;
  });
  return count;
}
