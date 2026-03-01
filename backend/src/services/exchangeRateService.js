// ═══════════════════════════════════════════════════════════
// EXCHANGE RATE SERVICE — Live rates, 1-hour cache
// Base currency: USD (Stripe account currency)
// ═══════════════════════════════════════════════════════════

let ratesCache = { rates: null, lastFetched: 0 };
const RATES_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fallback rates if both APIs are down (approximate Feb 2026)
const FALLBACK_RATES = {
  USD: 1,
  AUD: 1.58,
  EUR: 0.92,
  GBP: 0.79,
  PKR: 278.50,
  CAD: 1.44,
  NZD: 1.72
};

/**
 * Fetch live exchange rates from free API.
 * Returns { USD: 1, AUD: 1.58, EUR: 0.92, PKR: 278.5, ... }
 */
const fetchRates = async () => {
  const now = Date.now();

  // Return cached if fresh
  if (ratesCache.rates && (now - ratesCache.lastFetched < RATES_CACHE_TTL)) {
    return ratesCache.rates;
  }

  // Primary API (no key needed)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.rates) {
        const rates = {
          USD: 1,
          AUD: data.rates.AUD || FALLBACK_RATES.AUD,
          EUR: data.rates.EUR || FALLBACK_RATES.EUR,
          GBP: data.rates.GBP || FALLBACK_RATES.GBP,
          PKR: data.rates.PKR || FALLBACK_RATES.PKR,
          CAD: data.rates.CAD || FALLBACK_RATES.CAD,
          NZD: data.rates.NZD || FALLBACK_RATES.NZD
        };
        ratesCache = { rates, lastFetched: now };
        console.log('✅ Exchange rates fetched:', JSON.stringify(rates));
        return rates;
      }
    }
  } catch (e) {
    console.error('⚠️ Primary exchange rate API failed:', e.message);
  }

  // Backup API
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.rates) {
        const rates = {
          USD: 1,
          AUD: data.rates.AUD || FALLBACK_RATES.AUD,
          EUR: data.rates.EUR || FALLBACK_RATES.EUR,
          GBP: data.rates.GBP || FALLBACK_RATES.GBP,
          PKR: data.rates.PKR || FALLBACK_RATES.PKR,
          CAD: data.rates.CAD || FALLBACK_RATES.CAD,
          NZD: data.rates.NZD || FALLBACK_RATES.NZD
        };
        ratesCache = { rates, lastFetched: now };
        console.log('✅ Exchange rates fetched (backup):', JSON.stringify(rates));
        return rates;
      }
    }
  } catch (e) {
    console.error('⚠️ Backup exchange rate API failed:', e.message);
  }

  // Stale cache is better than nothing
  if (ratesCache.rates) {
    console.log('⚠️ Using stale cached exchange rates');
    return ratesCache.rates;
  }

  // Last resort
  console.log('⚠️ Using fallback exchange rates');
  ratesCache = { rates: FALLBACK_RATES, lastFetched: now };
  return FALLBACK_RATES;
};

module.exports = { fetchRates, FALLBACK_RATES };