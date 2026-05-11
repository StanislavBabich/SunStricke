import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import {
  formatPlaceLine,
  getLeafletBoundsFromPlace,
  placeHasBoundingBox,
  searchPlaces,
  zoomForPlace
} from "../lib/geocoding";
import { attachGoogleLightingZone } from "../lib/googleLightingZone";
import { formatLightingKm2 } from "../lib/lightingZone";
import { attachLeafletLightingZone } from "../lib/leafletLightingZone";
import { computeLightingPriceUsd, formatLightingUsd, LIGHTING_HOURS_MAX, LIGHTING_HOURS_MIN } from "../lib/lightingPricing";
import { getGoogleMapsLoaderOptions, getLeafletBasemap } from "../lib/mapLocale";
import LightingReviewModal from "./LightingReviewModal";

const SEARCH_DEBOUNCE_MS = 380;

function purgeGoogleMapsScripts() {
  document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach((s) => s.remove());
  document.querySelectorAll('script[src*="maps.gstatic.com"]').forEach((s) => s.remove());
  try {
    delete window.google;
  } catch {
    // ignore
  }
}

const DefaultIcon = L.icon({
  iconRetinaUrl: icon2x,
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function LocationExplorer({
  translations,
  languageCode,
  userBalance = 0,
  onLightingPayment,
  onLightingReviewSubmit
}) {
  const mapHostRef = useRef(null);
  const viewportRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showLeafletCredits, setShowLeafletCredits] = useState(!GOOGLE_MAPS_KEY);
  const [lightingKm2, setLightingKm2] = useState(null);
  const [lightingHours, setLightingHours] = useState(LIGHTING_HOURS_MIN);
  const [lightingReviewOpen, setLightingReviewOpen] = useState(false);
  const wrapRef = useRef(null);
  /** Контекст последней оплаты освещения — уходит в отзыв (карта, площадь, время). */
  const lastLightingForReviewRef = useRef(null);

  const totalPriceUsd = useMemo(
    () => computeLightingPriceUsd(lightingKm2, lightingHours),
    [lightingKm2, lightingHours]
  );

  const userBal = Number.isFinite(userBalance) ? userBalance : 0;
  const insufficientFunds = totalPriceUsd > userBal;
  const hasLightingArea = lightingKm2 !== null && Number.isFinite(lightingKm2);
  /** Время по умолчанию 1 ч — ползунок не обязателен; блокируем оплату только без зоны на карте. */
  const payDisabled = !hasLightingArea;

  const leafletBasemap = useMemo(() => getLeafletBasemap(languageCode), [languageCode]);

  useEffect(() => {
    const host = mapHostRef.current;
    if (!host) return;

    let cancelled = false;
    const disposers = [];

    const disconnectResize = () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };

    const teardown = () => {
      disconnectResize();
      const v = viewportRef.current;
      if (v?.lighting) {
        v.lighting.destroy();
      }
      if (v?.mode === "leaflet") {
        v.map.remove();
      } else if (v?.mode === "google") {
        host.innerHTML = "";
      }
      viewportRef.current = null;
      setLightingKm2(null);
    };

    const scheduleResize = () => {
      const v = viewportRef.current;
      if (!v) return;
      if (v.mode === "leaflet") {
        v.map.invalidateSize();
        return;
      }
      if (typeof google !== "undefined" && google.maps?.event) {
        google.maps.event.trigger(v.map, "resize");
      }
    };

    const attachResizeObserver = () => {
      disconnectResize();
      const parent = host.parentElement;
      if (!parent) return;
      const ro = new ResizeObserver(() => scheduleResize());
      ro.observe(parent);
      resizeObserverRef.current = ro;
    };

    const bumpLeafletSize = () => {
      requestAnimationFrame(() => scheduleResize());
      setTimeout(scheduleResize, 120);
    };

    const onWindowResize = () => scheduleResize();

    function initLeaflet() {
      if (cancelled || !mapHostRef.current || viewportRef.current) return;
      const basemap = getLeafletBasemap(languageCode);
      const map = L.map(mapHostRef.current, {
        worldCopyJump: true,
        scrollWheelZoom: true,
        preferCanvas: false,
        maxZoom: basemap.maxZoom,
        attributionControl: false
      }).setView([25, 10], 2);

      L.tileLayer(basemap.url, {
        maxZoom: basemap.maxZoom,
        ...(basemap.subdomains ? { subdomains: basemap.subdomains } : {}),
        attribution: ""
      }).addTo(map);

      const lighting = attachLeafletLightingZone(map, { onAreaKm2: setLightingKm2 });
      viewportRef.current = { mode: "leaflet", map, marker: null, lighting };
      setShowLeafletCredits(true);
      attachResizeObserver();
      bumpLeafletSize();
      window.addEventListener("resize", onWindowResize);
      disposers.push(() => window.removeEventListener("resize", onWindowResize));
    }

    const googleKey = GOOGLE_MAPS_KEY;

    if (googleKey) {
      purgeGoogleMapsScripts();
      const gLoc = getGoogleMapsLoaderOptions(languageCode);
      import("@googlemaps/js-api-loader")
        .then(
          ({ Loader }) =>
            new Loader({
              apiKey: googleKey,
              version: "weekly",
              language: gLoc.language,
              region: gLoc.region
            }).load()
        )
        .then(() => {
          if (cancelled || !mapHostRef.current || viewportRef.current) return;
          const map = new google.maps.Map(mapHostRef.current, {
            center: { lat: 25, lng: 10 },
            zoom: 2,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            mapTypeId: google.maps.MapTypeId.ROADMAP
          });
          const lighting = attachGoogleLightingZone(map, { onAreaKm2: setLightingKm2 });
          viewportRef.current = { mode: "google", map, marker: null, lighting };
          setShowLeafletCredits(false);
          attachResizeObserver();
          window.addEventListener("resize", onWindowResize);
          disposers.push(() => window.removeEventListener("resize", onWindowResize));
          setTimeout(scheduleResize, 100);
        })
        .catch(() => {
          if (cancelled || !mapHostRef.current) return;
          mapHostRef.current.innerHTML = "";
          initLeaflet();
        });
    } else {
      initLeaflet();
    }

    return () => {
      cancelled = true;
      disposers.forEach((d) => d());
      teardown();
      setShowLeafletCredits(!GOOGLE_MAPS_KEY);
    };
  }, [languageCode]);

  const runSearch = useCallback(
    async (text) => {
      const q = text.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        setSearchError("");
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSearching(true);
      setSearchError("");
      try {
        const results = await searchPlaces(q, languageCode, controller.signal);
        setSuggestions(results);
      } catch (e) {
        if (e.name === "AbortError") return;
        setSuggestions([]);
        setSearchError(translations.searchError);
      } finally {
        setIsSearching(false);
      }
    },
    [languageCode, translations.searchError]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const flyToPlace = useCallback((place) => {
    const lat = Number(place.latitude);
    const lon = Number(place.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const zoom = zoomForPlace(place);
    const v = viewportRef.current;
    if (!v) return;

    const llBounds = placeHasBoundingBox(place) ? getLeafletBoundsFromPlace(place) : null;

    if (v.mode === "google") {
      if (llBounds && typeof google !== "undefined") {
        const gBounds = new google.maps.LatLngBounds(
          { lat: llBounds[0][0], lng: llBounds[0][1] },
          { lat: llBounds[1][0], lng: llBounds[1][1] }
        );
        v.map.fitBounds(gBounds, 48);
      } else {
        v.map.setCenter({ lat, lng: lon });
        v.map.setZoom(zoom);
      }
    if (!v.marker) {
      v.marker = new google.maps.Marker({
        map: v.map,
        position: { lat, lng: lon }
      });
    } else {
      v.marker.setPosition({ lat, lng: lon });
    }
    v.lighting?.setFromLatLng(lat, lon);
    google.maps.event.trigger(v.map, "resize");
    return;
  }

    if (llBounds) {
      v.map.fitBounds(llBounds, { padding: [24, 24], maxZoom: 19, animate: true });
    } else {
      v.map.flyTo([lat, lon], zoom, { duration: 1.05 });
    }
    if (!v.marker) {
      v.marker = L.marker([lat, lon]).addTo(v.map);
    } else {
      v.marker.setLatLng([lat, lon]);
    }
    v.lighting?.setFromLatLng(lat, lon);
    requestAnimationFrame(() => v.map.invalidateSize());
  }, []);

  const handleLightingReviewClose = useCallback(() => {
    lastLightingForReviewRef.current = null;
    setLightingReviewOpen(false);
  }, []);

  const resetAfterPayment = useCallback(() => {
    abortRef.current?.abort();
    setLightingKm2(null);
    setLightingHours(LIGHTING_HOURS_MIN);
    setQuery("");
    setSuggestions([]);
    setSearchError("");
    setIsOpen(false);
    setIsSearching(false);

    const v = viewportRef.current;
    v?.lighting?.clear?.();

    if (v?.marker) {
      if (v.mode === "leaflet") {
        try {
          v.map.removeLayer(v.marker);
        } catch {
          // ignore
        }
        v.marker = null;
      } else if (v.mode === "google") {
        v.marker.setMap(null);
        v.marker = null;
      }
    }
  }, []);

  const handlePick = (place) => {
    setQuery(formatPlaceLine(place, languageCode));
    setIsOpen(false);
    setSuggestions([]);
    flyToPlace(place);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);
    setSearchError("");
    setIsOpen(true);
    try {
      const results = await searchPlaces(q, languageCode, controller.signal);
      setSuggestions(results);
      if (results.length === 1) {
        const only = results[0];
        setQuery(formatPlaceLine(only, languageCode));
        setIsOpen(false);
        setSuggestions([]);
        flyToPlace(only);
      } else if (results.length === 0) {
        setSearchError(translations.noResults);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setSuggestions([]);
      setSearchError(translations.searchError);
    } finally {
      setIsSearching(false);
    }
  };

  const showList = isOpen && (isSearching || suggestions.length > 0 || (query.trim().length >= 2 && !isSearching));

  return (
    <section className="location-explorer" aria-labelledby="location-explorer-prompt">
      <div className="location-explorer__map-wrap">
        <div className="location-explorer__map-pane">
          <div ref={mapHostRef} className="location-explorer__map" role="presentation" />
        </div>
        {showLeafletCredits && (
          <div className="location-explorer__map-footer">
            <span dangerouslySetInnerHTML={{ __html: leafletBasemap.attribution }} />
            <span className="location-explorer__map-footer__sep"> · </span>
            <a href="https://leafletjs.com/" target="_blank" rel="noreferrer">
              Leaflet
            </a>
          </div>
        )}
      </div>
      <div className="location-explorer__panel">
        <label id="location-explorer-prompt" className="location-explorer__prompt" htmlFor="location-explorer-search">
          {translations.addressPrompt}
        </label>
        <form ref={wrapRef} className="location-explorer__search" onSubmit={handleSearchSubmit} autoComplete="off">
          <input
            id="location-explorer-search"
            type="search"
            className="location-explorer__input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={translations.addressInputPlaceholder ?? ""}
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls="location-explorer-suggestions"
          />
          {showList && (
            <ul id="location-explorer-suggestions" className="location-explorer__suggestions" role="listbox">
              {isSearching && (
                <li className="location-explorer__suggestion location-explorer__suggestion--muted" role="option">
                  {translations.searching}
                </li>
              )}
              {!isSearching &&
                suggestions.map((place) => {
                  const id = String(place.id ?? `${place.latitude},${place.longitude}`);
                  return (
                    <li key={id} role="presentation">
                      <button
                        type="button"
                        className="location-explorer__suggestion"
                        role="option"
                        onClick={() => handlePick(place)}
                      >
                        {formatPlaceLine(place, languageCode)}
                      </button>
                    </li>
                  );
                })}
              {!isSearching && query.trim().length >= 2 && suggestions.length === 0 && !searchError && (
                <li className="location-explorer__suggestion location-explorer__suggestion--muted" role="option">
                  {translations.noResults}
                </li>
              )}
              {searchError && (
                <li className="location-explorer__suggestion location-explorer__suggestion--error" role="option">
                  {searchError}
                </li>
              )}
            </ul>
          )}
        </form>
        <p className="location-explorer__lighting" aria-live="polite">
          <span className="location-explorer__lighting-label">{translations.lightingAreaLabel}:</span>{" "}
          {lightingKm2 === null ? (
            <span className="location-explorer__lighting-value">—</span>
          ) : (
            <span className="location-explorer__lighting-value">
              {formatLightingKm2(lightingKm2, languageCode)} {translations.lightingAreaUnit}
            </span>
          )}
        </p>
        <div className="location-explorer__duration">
          <label className="location-explorer__duration-label" htmlFor="location-explorer-hours">
            {translations.lightingTimeLabel}:
          </label>
          <div className="location-explorer__duration-row">
            <input
              id="location-explorer-hours"
              type="range"
              min={LIGHTING_HOURS_MIN}
              max={LIGHTING_HOURS_MAX}
              step={1}
              value={lightingHours}
              onChange={(e) => setLightingHours(Number(e.target.value))}
              className="location-explorer__hours-range"
              aria-valuemin={LIGHTING_HOURS_MIN}
              aria-valuemax={LIGHTING_HOURS_MAX}
              aria-valuenow={lightingHours}
              aria-valuetext={`${lightingHours} ${translations.lightingTimeHoursSuffix}`}
            />
            <span className="location-explorer__duration-value" aria-hidden="true">
              {lightingHours} {translations.lightingTimeHoursSuffix}
            </span>
          </div>
        </div>
        <p className="location-explorer__sum" aria-live="polite">
          <span className="location-explorer__sum-label">{translations.lightingSumLabel}:</span>{" "}
          <span className="location-explorer__sum-value">${formatLightingUsd(totalPriceUsd)}</span>
        </p>
        <div className="location-explorer__pay-foot">
          {insufficientFunds && (
            <p className="location-explorer__insufficient" role="alert">
              {translations.lightingInsufficientFunds}
            </p>
          )}
          <button
            type="button"
            className="location-explorer__pay"
            disabled={payDisabled}
            onClick={() => {
              if (payDisabled || insufficientFunds) return;
              const snap = viewportRef.current?.lighting?.getZoneSnapshot?.();
              if (!snap) return;
              lastLightingForReviewRef.current = {
                areaKm2: lightingKm2,
                hours: lightingHours,
                centerLat: snap.centerLat,
                centerLng: snap.centerLng,
                radiusMeters: snap.radiusM
              };
              onLightingPayment?.({
                amountUsd: totalPriceUsd,
                address: query.trim(),
                areaKm2: lightingKm2,
                hours: lightingHours,
                centerLat: snap.centerLat,
                centerLng: snap.centerLng,
                radiusMeters: snap.radiusM
              });
              resetAfterPayment();
              setLightingReviewOpen(true);
            }}
          >
            {translations.lightingPay}
          </button>
        </div>
      </div>
      <LightingReviewModal
        isOpen={lightingReviewOpen}
        onClose={handleLightingReviewClose}
        onReviewSubmit={onLightingReviewSubmit}
        lightingContextRef={lastLightingForReviewRef}
        translations={translations}
      />
    </section>
  );
}
