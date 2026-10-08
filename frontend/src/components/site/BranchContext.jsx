"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { apiGet } from "@/lib/api";

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState("");
  const [loading, setLoading] = useState(true);

  // Load branches once
  useEffect(() => {
    (async () => {
      try {
        const list = await apiGet("/api/v1/branches?active_only=true");
        setBranches(list);
        const defaultBranch = list.find((b) => b.is_default) || list[0];
        if (defaultBranch) setActiveBranchId(defaultBranch.id);
      } catch (e) {
        console.error("Failed to load branches:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist chosen branch
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mrf_branch_id");
      if (saved && !activeBranchId) setActiveBranchId(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeBranchId) {
      try {
        localStorage.setItem("mrf_branch_id", activeBranchId);
      } catch {}
    }
  }, [activeBranchId]);

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