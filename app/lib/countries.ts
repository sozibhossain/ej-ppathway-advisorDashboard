"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export type CountryOption = {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  phone_code: string;
  capital: string;
  currency: string;
};

let _countries: CountryOption[] | null = null;
let _inflight: Promise<CountryOption[]> | null = null;
const _cityCache = new Map<string, string[]>();

/** Fetch the country catalog once and cache it for the session. */
export async function fetchCountries(): Promise<CountryOption[]> {
  if (_countries) return _countries;
  if (!_inflight) {
    _inflight = api
      .get<CountryOption[]>("/locations/countries")
      .then((r) => (_countries = r.data ?? []))
      .catch(() => (_countries = []));
  }
  return _inflight;
}

/** Fetch (and cache) the flat city list for a country by ISO-2 code. */
export async function fetchCities(iso2: string): Promise<string[]> {
  const code = (iso2 || "").trim().toUpperCase();
  if (!code) return [];
  const cached = _cityCache.get(code);
  if (cached) return cached;
  try {
    const r = await api.get<{ name: string }[]>(
      `/locations/countries/${code}/cities`,
    );
    const list = (r.data ?? []).map((c) => c.name);
    _cityCache.set(code, list);
    return list;
  } catch {
    return [];
  }
}

/** React hook: the cached country list (loads on first mount). */
export function useCountries(): CountryOption[] {
  const [countries, setCountries] = useState<CountryOption[]>(_countries ?? []);
  useEffect(() => {
    let active = true;
    fetchCountries().then((c) => active && setCountries(c));
    return () => {
      active = false;
    };
  }, []);
  return countries;
}

/** React hook: the city list for the given country (re-loads when it changes). */
export function useCities(iso2?: string): string[] {
  const [cities, setCities] = useState<string[]>([]);
  useEffect(() => {
    if (!iso2) {
      setCities([]);
      return;
    }
    let active = true;
    fetchCities(iso2).then((c) => active && setCities(c));
    return () => {
      active = false;
    };
  }, [iso2]);
  return cities;
}

/** React hook: a resolver turning an ISO-2 code into its full country name. */
export function useCountryName(): (iso2?: string) => string {
  const countries = useCountries();
  return useCallback(
    (iso2?: string) => {
      if (!iso2) return "";
      return countries.find((c) => c.iso2 === iso2)?.name ?? iso2;
    },
    [countries],
  );
}

/** Build a readable "City, Country" label from discrete fields. */
export function formatLocation(city?: string, countryName?: string): string {
  return [city, countryName].filter(Boolean).join(", ");
}
