import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getLeafletBasemap } from "../lib/mapLocale";
import { latLngEastOfByMeters } from "../lib/lightingZone";

const handleIcon = L.divIcon({
  className: "lighting-zone-handle lighting-zone-handle--static",
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

function clearLeafletContainer(el) {
  if (!el) return;
  try {
    delete el._leaflet_id;
  } catch {
    // ignore
  }
  try {
    if (typeof el.replaceChildren === "function") el.replaceChildren();
    else while (el.firstChild) el.removeChild(el.firstChild);
  } catch {
    // ignore
  }
}

/**
 * Статичная мини-карта с кругом зоны освещения (как на основной карте).
 * @param {{ centerLat: number, centerLng: number, radiusMeters: number, languageCode: string }} props
 */
export default function HistoryMapThumb({ centerLat, centerLng, radiusMeters, languageCode }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      return undefined;
    }

    let cancelled = false;
    let retryTimer = null;
    let invalidateTimer = null;
    let layoutAttempts = 0;

    const mount = () => {
      if (cancelled || !hostRef.current) return;
      const node = hostRef.current;
      const { width, height } = node.getBoundingClientRect();
      if (width < 16 || height < 16) {
        layoutAttempts += 1;
        if (layoutAttempts < 50) retryTimer = window.setTimeout(mount, 50);
        return;
      }

      const existing = mapRef.current;
      if (existing) {
        try {
          existing.remove();
        } catch {
          // ignore
        }
        mapRef.current = null;
      }
      clearLeafletContainer(node);

      try {
        const basemap = getLeafletBasemap(languageCode);
        const map = L.map(node, {
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          attributionControl: false,
          preferCanvas: false,
          maxZoom: basemap.maxZoom
        });

        L.tileLayer(basemap.url, {
          maxZoom: basemap.maxZoom,
          ...(basemap.subdomains ? { subdomains: basemap.subdomains } : {}),
          attribution: ""
        }).addTo(map);

        const c = L.latLng(centerLat, centerLng);
        const circle = L.circle(c, {
          radius: radiusMeters,
          color: "#e8b020",
          weight: 2,
          fillColor: "#ffd54f",
          fillOpacity: 0.22,
          interactive: false
        }).addTo(map);

        const edge = latLngEastOfByMeters(centerLat, centerLng, radiusMeters);
        L.marker([edge.lat, edge.lng], { icon: handleIcon, interactive: false }).addTo(map);

        try {
          map.fitBounds(circle.getBounds().pad(0.38), { animate: false });
        } catch {
          map.setView([centerLat, centerLng], 12);
        }
        mapRef.current = map;
        requestAnimationFrame(() => {
          if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
        });
        invalidateTimer = window.setTimeout(() => {
          if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
        }, 200);
      } catch (err) {
        console.warn("[HistoryMapThumb]", err);
        mapRef.current = null;
        clearLeafletContainer(node);
      }
    };

    const startId = requestAnimationFrame(() => requestAnimationFrame(mount));

    return () => {
      cancelled = true;
      cancelAnimationFrame(startId);
      if (retryTimer) clearTimeout(retryTimer);
      if (invalidateTimer) clearTimeout(invalidateTimer);
      const m = mapRef.current;
      mapRef.current = null;
      if (m) {
        try {
          m.remove();
        } catch {
          // ignore
        }
      }
      clearLeafletContainer(hostRef.current);
    };
  }, [centerLat, centerLng, radiusMeters, languageCode]);

  return (
    <div
      className="history-map-thumb"
      ref={hostRef}
      role="img"
      aria-hidden="true"
      style={{ width: "100%", height: "100%", minHeight: 158 }}
    />
  );
}
