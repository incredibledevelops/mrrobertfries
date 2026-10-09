"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiGet } from "@/lib/api";

const BranchContext = createContext(null);

const STORAGE_KEY = "mrf_branch_id";

function readSavedBranchId() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeSavedBranchId(id) {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState("");
  const [loading, setLoading] = useState(true);

  // Guard so we don't overwrite a user's pick with a stale load.
  const hasHydratedRef = useRef(false);

  // Single effect: read storage, load branches, reconcile.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // 1. Read the saved id BEFORE any network call.
      const savedId = readSavedBranchId();

      // 2. Fetch branches.
      let list = [];
      try {
        list = await apiGet("/api/v1/branches?active_only=true");
      } catch (e) {
        console.error("Failed to load branches:", e);
      }

      if (cancelled) return;

      setBranches(Array.isArray(list) ? list : []);

      // 3. Resolve which branch should be active.
      const ids = new Set((list || []).map((b) => b.id));
      let resolvedId = "";

      if (savedId && ids.has(savedId)) {
        // Saved branch still exists — honor the user's choice.
        resolvedId = savedId;
      } else {
        // Fall back to the default branch or the first branch.
        const defaultBranch =
          (list || []).find((b) => b.is_default) || (list || [])[0];
        resolvedId = defaultBranch?.id || "";
      }

      setActiveBranchId(resolvedId);
      if (resolvedId) writeSavedBranchId(resolvedId);
      hasHydratedRef.current = true;
      setLoading(false);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist user changes (after hydration).
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    writeSavedBranchId(activeBranchId);
  }, [activeBranchId]);

  // If a saved id disappears from the branches list after a refresh, fall back.
  useEffect(() => {
    if (loading) return;
    if (!branches.length) return;
    if (activeBranchId && branches.some((b) => b.id === activeBranchId)) return;

    const fallback =
      branches.find((b) => b.is_default) || branches[0];
    if (fallback && fallback.id !== activeBranchId) {
      setActiveBranchId(fallback.id);
    }
  }, [branches, activeBranchId, loading]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId),
    [branches, activeBranchId]
  );

  const value = {
    branches,
    activeBranchId,
    setActiveBranchId,
    activeBranch,
    loading,
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used inside <BranchProvider>");
  return ctx;
}