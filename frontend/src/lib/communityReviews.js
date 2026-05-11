const COMMUNITY_REVIEWS_KEY = "sunstrike_community_reviews";
const MAX_ENTRIES = 300;

function readRaw() {
  try {
    const raw = localStorage.getItem(COMMUNITY_REVIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeCommunityReviews(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === "object")
    .map((r, idx) => {
      const rating = Math.min(5, Math.max(1, Math.round(Number(r.rating)) || 1));
      const areaKm2 = Number.isFinite(r.areaKm2) && r.areaKm2 > 0 ? r.areaKm2 : null;
      return {
        id: typeof r.id === "string" && r.id ? r.id : `c_${idx}_${Number(r.at) || Date.now()}`,
        at: Number.isFinite(r.at) ? r.at : Date.now(),
        nickname: typeof r.nickname === "string" ? r.nickname.slice(0, 120) : "",
        rating,
        text: typeof r.text === "string" ? r.text.slice(0, 2000) : "",
        centerLat: Number.isFinite(r.centerLat) ? r.centerLat : NaN,
        centerLng: Number.isFinite(r.centerLng) ? r.centerLng : NaN,
        radiusMeters: Number.isFinite(r.radiusMeters) && r.radiusMeters > 0 ? r.radiusMeters : NaN,
        areaKm2,
        hours: Math.min(168, Math.max(1, Math.round(Number(r.hours)) || 1))
      };
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_ENTRIES);
}

export function readCommunityReviews() {
  return normalizeCommunityReviews(readRaw());
}

/** Добавить отзыв в общую ленту; возвращает нормализованный массив. */
export function prependCommunityReview(entry) {
  const list = readCommunityReviews();
  const id =
    typeof entry.id === "string" && entry.id
      ? entry.id
      : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const row = {
    id,
    at: Number.isFinite(entry.at) ? entry.at : Date.now(),
    nickname: typeof entry.nickname === "string" ? entry.nickname.slice(0, 120) : "",
    rating: Math.min(5, Math.max(1, Math.round(Number(entry.rating)) || 1)),
    text: typeof entry.text === "string" ? entry.text.slice(0, 2000) : "",
    centerLat: Number.isFinite(entry.centerLat) ? entry.centerLat : NaN,
    centerLng: Number.isFinite(entry.centerLng) ? entry.centerLng : NaN,
    radiusMeters: Number.isFinite(entry.radiusMeters) && entry.radiusMeters > 0 ? entry.radiusMeters : NaN,
    areaKm2: Number.isFinite(entry.areaKm2) && entry.areaKm2 > 0 ? entry.areaKm2 : null,
    hours: Math.min(168, Math.max(1, Math.round(Number(entry.hours)) || 1))
  };
  const next = normalizeCommunityReviews([row, ...list]);
  localStorage.setItem(COMMUNITY_REVIEWS_KEY, JSON.stringify(next));
  return next;
}
