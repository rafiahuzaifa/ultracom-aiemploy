"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Brand } from "@prisma/client";

interface BrandContextValue {
  brands: Brand[];
  currentBrand: Brand | null;
  currentBrandId: string | null;
  setCurrentBrandId: (id: string) => void;
  loading: boolean;
  refreshBrands: () => Promise<Brand[]>;
}

const BrandContext = createContext<BrandContextValue | null>(null);

const STORAGE_KEY = "autopost-ai:selected-brand";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentBrandId, setCurrentBrandIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBrands = useCallback(async () => {
    const res = await fetch("/api/brands");
    if (!res.ok) return [] as Brand[];
    const data = await res.json();
    const list = (data.brands ?? []) as Brand[];
    setBrands(list);
    return list;
  }, []);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* private browsing / storage disabled — fall back to server default */
    }

    refreshBrands()
      .then((list) => {
        if (list.length === 0) return;
        const storedIsValid = stored && list.some((b) => b.id === stored);
        const fallback = list.find((b) => b.isPrimary) ?? list[0];
        setCurrentBrandIdState(storedIsValid ? stored! : fallback.id);
      })
      .finally(() => setLoading(false));
  }, [refreshBrands]);

  const setCurrentBrandId = useCallback((id: string) => {
    setCurrentBrandIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const currentBrand = brands.find((b) => b.id === currentBrandId) ?? null;

  return (
    <BrandContext.Provider
      value={{ brands, currentBrand, currentBrandId, setCurrentBrandId, loading, refreshBrands }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used within a BrandProvider");
  return ctx;
}
