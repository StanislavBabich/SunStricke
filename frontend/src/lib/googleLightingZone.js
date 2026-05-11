import { circleAreaKm2FromRadiusM, minCircleRadiusMeters } from "./lightingZone.js";

const MIN_R_M = minCircleRadiusMeters(1);

/**
 * @param {google.maps.Map} map
 * @param {{ onAreaKm2: (n: number | null) => void }} handlers
 */
export function attachGoogleLightingZone(map, handlers) {
  const { onAreaKm2 } = handlers;
  /** @type {google.maps.Circle | null} */
  let circle = null;
  let clampGuard = false;
  /** @type {google.maps.MapsEventListener | null} */
  let radiusListener = null;
  /** @type {google.maps.MapsEventListener | null} */
  let centerListener = null;
  /** @type {google.maps.MapsEventListener | null} */
  let clickListener = null;

  function emitArea() {
    if (!circle) return;
    const r = circle.getRadius();
    onAreaKm2(circleAreaKm2FromRadiusM(r));
  }

  function clampRadiusIfNeeded() {
    if (clampGuard || !circle) return;
    const r = circle.getRadius();
    if (r < MIN_R_M - 0.05) {
      clampGuard = true;
      circle.setRadius(MIN_R_M);
      clampGuard = false;
    }
    emitArea();
  }

  function setFromLatLng(lat, lng) {
    if (!circle) {
      circle = new google.maps.Circle({
        map,
        center: { lat, lng },
        radius: MIN_R_M,
        editable: true,
        draggable: true,
        strokeColor: "#e8b020",
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: "#ffd54f",
        fillOpacity: 0.22
      });
      radiusListener = google.maps.event.addListener(circle, "radius_changed", clampRadiusIfNeeded);
      centerListener = google.maps.event.addListener(circle, "center_changed", () => {
        if (!clampGuard) emitArea();
      });
    } else {
      clampGuard = true;
      circle.setCenter({ lat, lng });
      circle.setRadius(MIN_R_M);
      clampGuard = false;
    }
    emitArea();
  }

  clickListener = google.maps.event.addListener(map, "click", (e) => {
    if (e.latLng) {
      setFromLatLng(e.latLng.lat(), e.latLng.lng());
    }
  });

  function clear() {
    if (radiusListener) {
      google.maps.event.removeListener(radiusListener);
      radiusListener = null;
    }
    if (centerListener) {
      google.maps.event.removeListener(centerListener);
      centerListener = null;
    }
    if (circle) {
      circle.setMap(null);
      circle = null;
    }
    onAreaKm2(null);
  }

  function destroy() {
    if (clickListener) {
      google.maps.event.removeListener(clickListener);
      clickListener = null;
    }
    if (radiusListener) {
      google.maps.event.removeListener(radiusListener);
      radiusListener = null;
    }
    if (centerListener) {
      google.maps.event.removeListener(centerListener);
      centerListener = null;
    }
    if (circle) {
      circle.setMap(null);
      circle = null;
    }
  }

  function getZoneSnapshot() {
    if (!circle) return null;
    const c = circle.getCenter();
    return { centerLat: c.lat(), centerLng: c.lng(), radiusM: circle.getRadius() };
  }

  return { setFromLatLng, clear, destroy, getZoneSnapshot };
}
