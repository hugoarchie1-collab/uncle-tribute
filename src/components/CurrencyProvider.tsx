/**
 * <CurrencyProvider> — mounts the presentment-currency context at the App root.
 *
 * All the logic, FX table, formatting and the store helpers live in
 * src/lib/currency.ts (JSX-free, so consumers can import { useCurrency } without
 * pulling a component into a logic module — the lib/deliverTo.ts pattern). This
 * file holds ONLY the provider component, so React Fast Refresh stays happy.
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  CurrencyContext,
  buildCurrencyValue,
  readStoredCurrency,
  type CurrencyCode,
} from "../lib/currency";

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [code, setCode] = useState<CurrencyCode>(readStoredCurrency);
  const value = useMemo(() => buildCurrencyValue(code, setCode), [code]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export default CurrencyProvider;
