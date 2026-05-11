/** Локаль для Google Maps Loader (подписи, страны, UI карты) */
const GOOGLE_MAP_LOCALE = {
  ru: { language: "ru", region: "RU" },
  de: { language: "de", region: "DE" },
  zh: { language: "zh-CN", region: "CN" },
  en: { language: "en", region: "US" },
  fr: { language: "fr", region: "FR" }
};

export function getGoogleMapsLoaderOptions(languageCode) {
  return GOOGLE_MAP_LOCALE[languageCode] || GOOGLE_MAP_LOCALE.en;
}

/**
 * Растровые тайлы Leaflet без ключа Google: полный контроль языка недоступен,
 * но можно выбрать источник с другим приоритетом подписей.
 * @returns {{ url: string, maxZoom: number, subdomains?: string, attribution: string }}
 */
export function getLeafletBasemap(languageCode) {
  const osmAttr =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  if (languageCode === "fr") {
    return {
      url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      maxZoom: 20,
      subdomains: "abcde",
      attribution: `&copy; OpenStreetMap France | ${osmAttr}`
    };
  }

  if (languageCode === "de") {
    return {
      url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
      maxZoom: 19,
      attribution: `&copy; <a href="https://www.openstreetmap.de/">OpenStreetMap DE</a> | ${osmAttr}`
    };
  }

  if (languageCode === "en") {
    return {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      maxZoom: 19,
      attribution: osmAttr
    };
  }

  return {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution: osmAttr
  };
}
