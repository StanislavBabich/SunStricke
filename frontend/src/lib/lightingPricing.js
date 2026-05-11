export const PRICE_USD_PER_KM2 = 10_000;
export const PRICE_USD_PER_HOUR = 300;
export const LIGHTING_HOURS_MIN = 1;
export const LIGHTING_HOURS_MAX = 168;

/**
 * @param {number | null} km2 площадь в км² (null → 0)
 * @param {number} hours 1…168
 */
export function computeLightingPriceUsd(km2, hours) {
  const a = km2 != null && Number.isFinite(km2) && km2 > 0 ? km2 : 0;
  let h = Number.isFinite(hours) ? Math.round(hours) : LIGHTING_HOURS_MIN;
  if (h < LIGHTING_HOURS_MIN) h = LIGHTING_HOURS_MIN;
  if (h > LIGHTING_HOURS_MAX) h = LIGHTING_HOURS_MAX;
  return a * PRICE_USD_PER_KM2 + h * PRICE_USD_PER_HOUR;
}

/** Целые доллары для отображения. */
export function formatLightingUsd(amount) {
  const n = Math.round(Number.isFinite(amount) ? amount : 0);
  return n.toLocaleString("en-US");
}
