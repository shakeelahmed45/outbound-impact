import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ═══════════════════════════════════════════════════════════
// Module-level cache — shared across all components
// ═══════════════════════════════════════════════════════════
let cachedSettings = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute
let fetchPromise = null;
let subscribers = new Set();

const DEFAULTS = {
  platformName: 'Outbound Impact',
  currency: 'USD',
  currencySymbol: '$',
  supportEmail: 'support@outboundimpact.org',
  currencies: { AUD: 'A$', USD: '$', EUR: '€', GBP: '£', PKR: '₨', CAD: 'C$', NZD: 'NZ$' },
  baseCurrency: 'USD',
  exchangeRate: 1
};

const fetchSettings = async (force = false) => {
  if (fetchPromise && !force) return fetchPromise;
  if (!force && cachedSettings && Date.now() - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }

  fetchPromise = api.get('/admin/settings/public', { skipCache: true })
    .then(res => {
      const data = res.data;
      cachedSettings = {
        platformName: data.platformName || DEFAULTS.platformName,
        currency: data.currency || DEFAULTS.currency,
        currencySymbol: data.currencySymbol || DEFAULTS.currencySymbol,
        supportEmail: data.supportEmail || DEFAULTS.supportEmail,
        currencies: data.currencies || DEFAULTS.currencies,
        baseCurrency: data.baseCurrency || 'USD',
        exchangeRate: data.exchangeRate || 1
      };
      cacheTime = Date.now();
      fetchPromise = null;
      return cachedSettings;
    })
    .catch(() => {
      fetchPromise = null;
      return cachedSettings || DEFAULTS;
    });

  return fetchPromise;
};

/**
 * Clear cache and notify all mounted components to re-fetch.
 * Call from AdminSettingsPage after saving.
 */
const clearSettingsCache = () => {
  cachedSettings = null;
  cacheTime = 0;
  fetchPromise = null;
  subscribers.forEach(cb => cb());
};

/**
 * Hook: returns settings + formatCurrency that CONVERTS from USD.
 *
 * All Stripe values are in USD. formatCurrency converts then formats:
 *   formatCurrency(3053)  → "A$4,824"   (AUD, rate 1.58)
 *   formatCurrency(3053)  → "₨849,134"  (PKR, rate 278)
 *   formatCurrency(3053)  → "$3,053"    (USD, rate 1)
 *   formatCurrency(179.59, { decimals: 2 }) → "A$283.75"
 */
const usePlatformSettings = () => {
  const [settings, setSettings] = useState(cachedSettings || DEFAULTS);

  const refetch = useCallback(() => {
    fetchSettings(true).then(s => setSettings(s));
  }, []);

  useEffect(() => {
    fetchSettings().then(s => setSettings(s));
    subscribers.add(refetch);
    return () => subscribers.delete(refetch);
  }, [refetch]);

  /**
   * Convert a USD amount to selected currency and format with symbol.
   * @param {number} amountInUSD - Raw amount from Stripe (always USD)
   * @param {object} [options]
   * @param {number} [options.decimals=0] - Decimal places (use 2 for per-unit prices)
   */
  const formatCurrency = useCallback((amountInUSD, options = {}) => {
    if (amountInUSD === null || amountInUSD === undefined) {
      return `${settings.currencySymbol}0`;
    }

    const { decimals = 0 } = options;
    const rate = settings.exchangeRate || 1;
    const converted = Number(amountInUSD) * rate;

    if (decimals > 0) {
      return `${settings.currencySymbol}${converted.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}`;
    }

    return `${settings.currencySymbol}${Math.round(converted).toLocaleString()}`;
  }, [settings.currencySymbol, settings.exchangeRate]);

  /**
   * Convert USD amount to selected currency (raw number, no symbol).
   * Useful for chart data that needs numeric values.
   */
  const convertAmount = useCallback((amountInUSD) => {
    if (!amountInUSD) return 0;
    return Number(amountInUSD) * (settings.exchangeRate || 1);
  }, [settings.exchangeRate]);

  return {
    ...settings,
    formatCurrency,
    convertAmount
  };
};

export default usePlatformSettings;
export { fetchSettings, clearSettingsCache, DEFAULTS as PLATFORM_DEFAULTS };