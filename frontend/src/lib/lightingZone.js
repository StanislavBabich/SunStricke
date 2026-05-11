/** Метры на градус широты (среднее значение). */
export const M_PER_DEG_LAT = 111_320;

export function metersPerDegLon(latDeg) {
  return M_PER_DEG_LAT * Math.cos((latDeg * Math.PI) / 180);
}

/** Радиус круга в метрах, чтобы площадь была ≥ minAreaKm2 (π r²). */
export function minCircleRadiusMeters(minAreaKm2 = 1) {
  return Math.sqrt((minAreaKm2 * 1_000_000) / Math.PI);
}

export function circleAreaKm2FromRadiusM(rM) {
  if (!Number.isFinite(rM) || rM < 0) return 0;
  return (Math.PI * rM * rM) / 1_000_000;
}

/** Радиус круга в метрах по площади км² (обратно к circleAreaKm2FromRadiusM). */
export function circleRadiusMFromAreaKm2(km2) {
  if (!Number.isFinite(km2) || km2 <= 0) return minCircleRadiusMeters(1);
  return Math.sqrt((km2 * 1_000_000) / Math.PI);
}

/** Расстояние между точками, м (локальная плоская аппроксимация). */
export function planarDistanceMeters(lat1, lng1, lat2, lng2) {
  const dy = (lat2 - lat1) * M_PER_DEG_LAT;
  const dx = (lng2 - lng1) * metersPerDegLon((lat1 + lat2) / 2);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Точка на восток от центра на заданное расстояние (м). */
export function latLngEastOfByMeters(centerLat, centerLng, distanceMeters) {
  return {
    lat: centerLat,
    lng: centerLng + distanceMeters / metersPerDegLon(centerLat)
  };
}

/**
 * @param {number} km2
 * @param {string} languageCode
 */
export function formatLightingKm2(km2, languageCode) {
  if (!Number.isFinite(km2) || km2 < 0) return "—";
  const rounded = Math.round(km2 * 10) / 10;
  const dec = languageCode === "ru" || languageCode === "fr" ? "," : ".";
  const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", dec);
  return s;
}
