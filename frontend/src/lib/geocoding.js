const OPEN_METEO = "https://geocoding-api.open-meteo.com/v1/search";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

const NOMINATIM_EMAIL = "sunstrike-geocode@invalid";

/**
 * Расширяет сокращения вроде «д22», «к2», «ул» для поиска дома/улицы в OSM.
 * @param {string} raw
 * @param {string} languageCode
 */
export function normalizeAddressSearchQuery(raw, languageCode) {
  let s = String(raw).trim().replace(/\s+/g, " ");
  if (!s) return s;

  const cyrillic = /[\u0400-\u04FF]/.test(s);
  if (languageCode !== "ru" && !cyrillic) return s;

  s = s.replace(/([а-яёА-ЯЁ])д(\d+)$/gi, "$1 д $2");
  s = s.replace(/\s*д\.?\s*(\d+)/gi, " дом $1 ");
  s = s.replace(/(\d+)\s*к\.?\s*(\d+)/gi, "$1, корпус $2 ");
  s = s.replace(/(дом\s+\d+)\s+к\.?\s*(\d+)/gi, "$1, корпус $2 ");
  s = s.replace(/\s*стр\.?\s*(\d+)/gi, " строение $1 ");
  s = s.replace(/\s*лит\.?\s*([а-яёА-ЯЁa-zA-Z0-9]+)/gi, " литера $1 ");
  s = s.replace(/\bг\.?\s*/gi, " город ");
  s = s.replace(/\bул\.?\s*/gi, "улица ");
  s = s.replace(/\bпр-кт\b\.?/gi, "проспект ");
  s = s.replace(/\bпр\.?\s*/gi, "проспект ");
  s = s.replace(/\bпер\.?\s*/gi, "переулок ");
  s = s.replace(/\bш\.?\s*/gi, "шоссе ");
  s = s.replace(/\bнаб\.?\s*/gi, "набережная ");
  s = s.replace(/\bпл\.?\s*/gi, "площадь ");

  return s
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function nominatimClassToZoom(item) {
  const c = item.class;
  const t = item.type;
  if (c === "building" || t === "house" || t === "building") return 19;
  if (c === "highway") return 18;
  if (c === "place" && t === "house") return 19;
  if (c === "amenity" || c === "shop" || c === "tourism") return 18;
  if (c === "boundary" && t === "administrative") return 10;
  if (c === "place" && (t === "city" || t === "town")) return 12;
  if (c === "place" && t === "village") return 14;
  if (c === "place" && t === "suburb") return 14;
  return 15;
}

function normalizeNominatim(item) {
  const lat = Number.parseFloat(item.lat);
  const lon = Number.parseFloat(item.lon);
  const a = item.address || {};
  const admin1 =
    (typeof a.state === "string" && a.state) ||
    (typeof a.region === "string" && a.region) ||
    (typeof a.county === "string" && a.county) ||
    "";
  const name =
    (typeof item.name === "string" && item.name) ||
    (typeof item.display_name === "string" && item.display_name.split(",")[0]?.trim()) ||
    "";
  return {
    id: `n_${item.osm_type || "x"}_${item.osm_id ?? `${lat},${lon}`}`,
    name,
    country: typeof a.country === "string" ? a.country : "",
    admin1,
    latitude: lat,
    longitude: lon,
    population: 0,
    feature_code: "",
    display_name: typeof item.display_name === "string" ? item.display_name : "",
    boundingbox: Array.isArray(item.boundingbox) ? item.boundingbox : null,
    _zoomHint: nominatimClassToZoom(item),
    _source: "nominatim"
  };
}

async function fetchOpenMeteo(q, languageCode, signal) {
  const params = new URLSearchParams({
    name: q,
    count: "10",
    language: languageCode || "en",
    format: "json"
  });
  const res = await fetch(`${OPEN_METEO}?${params}`, { signal });
  if (!res.ok) throw new Error("Open-Meteo geocoding failed");
  const data = await res.json();
  const raw = Array.isArray(data.results) ? data.results : [];
  return raw.map((r) => ({
    ...r,
    display_name: typeof r.display_name === "string" ? r.display_name : "",
    boundingbox: null,
    _source: "openmeteo"
  }));
}

async function fetchNominatim(q, languageCode, signal) {
  const lang =
    languageCode === "zh"
      ? "zh-CN"
      : languageCode === "en"
        ? "en"
        : languageCode === "de"
          ? "de"
          : languageCode === "fr"
            ? "fr"
            : "ru";

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    limit: "18",
    addressdetails: "1",
    "accept-language": lang,
    email: NOMINATIM_EMAIL
  });

  const res = await fetch(`${NOMINATIM}?${params}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeNominatim) : [];
}

function mergeDeduped(primary, secondary, max = 18) {
  const seen = new Set();
  const out = [];
  for (const p of [...primary, ...secondary]) {
    const lat = Number(p.latitude);
    const lon = Number(p.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const k = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}

async function searchPlacesOnce(q, languageCode, signal) {
  if (q.length < 2) return [];
  const [nom, om] = await Promise.all([
    fetchNominatim(q, languageCode, signal).catch(() => []),
    fetchOpenMeteo(q, languageCode, signal).catch(() => [])
  ]);
  return mergeDeduped(nom, om);
}

/**
 * Города, страны, улицы, дом и корпус (нормализация «д22 к2» и т.п.) — Nominatim + Open-Meteo.
 * @param {string} query
 * @param {string} languageCode
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function searchPlaces(query, languageCode, signal) {
  const raw = query.trim();
  if (raw.length < 2) return [];

  const normalized = normalizeAddressSearchQuery(raw, languageCode);
  /** @type {string[]} */
  const variants = [];
  if (normalized.length >= 2) variants.push(normalized);
  if (raw !== normalized && raw.length >= 2) variants.push(raw);

  for (const q of variants) {
    const merged = await searchPlacesOnce(q, languageCode, signal);
    if (merged.length > 0) return merged;
  }

  return [];
}

/**
 * @param {Record<string, unknown>} place
 * @param {string} languageCode
 */
export function formatPlaceLine(place, languageCode) {
  if (typeof place.display_name === "string" && place.display_name.trim()) {
    const d = place.display_name.trim();
    return d.length > 140 ? `${d.slice(0, 137)}…` : d;
  }

  const country = typeof place.country === "string" ? place.country : "";
  const admin1 = typeof place.admin1 === "string" ? place.admin1 : "";
  const name = typeof place.name === "string" ? place.name : "";
  if (!name) return country || "—";

  if (languageCode === "ru") {
    if (admin1 && admin1 !== name) {
      return `${country ? `${country}. ` : ""}${admin1}, ${name}`;
    }
    return `${country ? `${country}. ` : ""}${name}`;
  }

  const left = country || admin1;
  if (admin1 && admin1 !== name) {
    return left ? `${left} — ${admin1}, ${name}` : `${admin1}, ${name}`;
  }
  return left ? `${left} — ${name}` : name;
}

/**
 * @param {Record<string, unknown>} place
 */
export function zoomForPlace(place) {
  if (typeof place._zoomHint === "number" && Number.isFinite(place._zoomHint)) {
    return place._zoomHint;
  }
  const pop = typeof place.population === "number" ? place.population : 0;
  const code = typeof place.feature_code === "string" ? place.feature_code : "";
  if (code === "PPLC" || pop > 2_500_000) return 11;
  if (pop > 500_000) return 12;
  if (pop > 50_000) return 12;
  if (pop > 5_000) return 13;
  return 14;
}

/**
 * @param {Record<string, unknown>} place
 */
export function placeHasBoundingBox(place) {
  return Array.isArray(place.boundingbox) && place.boundingbox.length >= 4;
}

/**
 * Leaflet / [[south, west], [north, east]]
 * @param {Record<string, unknown>} place
 */
export function getLeafletBoundsFromPlace(place) {
  const [south, north, west, east] = /** @type {string[]} */ (place.boundingbox).map((x) => Number.parseFloat(x));
  if (![south, north, west, east].every((n) => Number.isFinite(n))) return null;
  return [
    [south, west],
    [north, east]
  ];
}
