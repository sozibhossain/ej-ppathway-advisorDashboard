"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { useCountries } from "./countries";
import { useAuth } from "./auth-context";

export type CurrencyInfo = {
  code: string;
  symbol: string;
  currencyName: string;
  primaryCountry: string;
};

let _list: CurrencyInfo[] | null = null;
let _map: Record<string, string> | null = null; // code -> symbol
let _inflight: Promise<CurrencyInfo[]> | null = null;

// Tiny fallback so symbols still render before the catalog loads.
const FALLBACK: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  NGN: "₦",
};

/** Fetch the ISO-4217 currency catalog once and cache it. */
export async function fetchCurrencyCatalog(): Promise<CurrencyInfo[]> {
  if (_list) return _list;
  if (!_inflight) {
    _inflight = api
      .get<CurrencyInfo[]>("/currencies/catalog")
      .then((r) => {
        _list = r.data ?? [];
        _map = Object.fromEntries(_list.map((c) => [c.code, c.symbol]));
        return _list;
      })
      .catch(() => (_list = []));
  }
  return _inflight;
}

/** Resolve the display symbol for an ISO-4217 code (sync; uses the loaded cache). */
export function symbolFor(code?: string | null): string {
  if (!code) return "$";
  const c = code.toUpperCase();
  return (_map && _map[c]) || FALLBACK[c] || c;
}

/** Format an amount with the correct currency symbol, e.g. formatMoney(59, "EUR") → "€59". */
export function formatMoney(
  amount: number | null | undefined,
  code?: string | null,
  opts?: { decimals?: number },
): string {
  const n = Number(amount);
  const sym = symbolFor(code);
  if (!Number.isFinite(n)) return `${sym}0`;
  const decimals = opts?.decimals ?? (Number.isInteger(n) ? 0 : 2);
  const grouped = n
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sym}${grouped}`;
}

/** Hook: the cached currency catalog (loads on first mount). */
export function useCurrencyCatalog(): CurrencyInfo[] {
  const [list, setList] = useState<CurrencyInfo[]>(_list ?? []);
  useEffect(() => {
    let active = true;
    fetchCurrencyCatalog().then((l) => active && setList(l));
    return () => {
      active = false;
    };
  }, []);
  return list;
}

/**
 * Hook: a money formatter that re-renders once the catalog has loaded, so the
 * right symbol shows up even on the first paint after data arrives.
 */
export function useMoney(): (
  amount: number | null | undefined,
  code?: string | null,
  opts?: { decimals?: number },
) => string {
  useCurrencyCatalog();
  return formatMoney;
}

/**
 * The logged-in advisor's display currency code, derived from the country they
 * selected (the country's own default currency), falling back to their stored
 * currency, then USD.
 */
export function useMyCurrencyCode(): string {
  const { user } = useAuth();
  const countries = useCountries();
  const fromCountry = user?.country
    ? countries.find((c) => c.iso2 === user.country)?.currency
    : undefined;
  return (fromCountry || user?.currency || "USD").toUpperCase();
}

/** The logged-in advisor's currency symbol (e.g. "৳" for Bangladesh). */
export function useMySymbol(): string {
  const code = useMyCurrencyCode();
  useCurrencyCatalog();
  return symbolFor(code);
}

/** A money formatter bound to the logged-in advisor's currency. */
export function useMyMoney(): (
  amount: number | null | undefined,
  opts?: { decimals?: number },
) => string {
  const code = useMyCurrencyCode();
  useCurrencyCatalog();
  return (amount, opts) => formatMoney(amount, code, opts);
}
