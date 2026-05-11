import L from "leaflet";
import {
  circleAreaKm2FromRadiusM,
  latLngEastOfByMeters,
  minCircleRadiusMeters,
  planarDistanceMeters
} from "./lightingZone.js";

const MIN_KM2 = 1;
const MIN_R_M = minCircleRadiusMeters(MIN_KM2);

const handleIcon = L.divIcon({
  className: "lighting-zone-handle",
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

/**
 * @param {import('leaflet').Map} map
 * @param {{ onAreaKm2: (n: number | null) => void }} handlers
 */
export function attachLeafletLightingZone(map, handlers) {
  const { onAreaKm2 } = handlers;
  const group = L.layerGroup().addTo(map);

  let centerLat = 0;
  let centerLng = 0;
  let radiusM = MIN_R_M;
  let hasZone = false;

  /** @type {import('leaflet').Circle | null} */
  let circle = null;
  /** @type {import('leaflet').Marker | null} */
  let radiusHandle = null;

  function syncVisuals() {
    if (!hasZone) return;
    const c = L.latLng(centerLat, centerLng);
    if (!circle) {
      circle = L.circle(c, {
        radius: radiusM,
        color: "#e8b020",
        weight: 2,
        fillColor: "#ffd54f",
        fillOpacity: 0.22,
        interactive: true
      }).addTo(group);
      circle.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
      });
    } else {
      circle.setLatLng(c);
      circle.setRadius(radiusM);
    }
    const edge = latLngEastOfByMeters(centerLat, centerLng, radiusM);
    if (!radiusHandle) {
      radiusHandle = L.marker([edge.lat, edge.lng], {
        draggable: true,
        icon: handleIcon,
        zIndexOffset: 2000
      }).addTo(group);
      radiusHandle.on("drag", onRadiusHandleDrag);
      radiusHandle.on("dragend", onRadiusHandleDragEnd);
    } else {
      radiusHandle.setLatLng(L.latLng(edge.lat, edge.lng));
    }
    onAreaKm2(circleAreaKm2FromRadiusM(radiusM));
  }

  function onRadiusHandleDrag() {
    if (!radiusHandle) return;
    const ll = radiusHandle.getLatLng();
    let r = planarDistanceMeters(centerLat, centerLng, ll.lat, ll.lng);
    if (r < MIN_R_M) r = MIN_R_M;
    radiusM = r;
    if (circle) {
      circle.setRadius(radiusM);
    }
    onAreaKm2(circleAreaKm2FromRadiusM(radiusM));
  }

  function onRadiusHandleDragEnd() {
    if (!radiusHandle) return;
    const ll = radiusHandle.getLatLng();
    let r = planarDistanceMeters(centerLat, centerLng, ll.lat, ll.lng);
    if (r < MIN_R_M) r = MIN_R_M;
    radiusM = r;
    const edge = latLngEastOfByMeters(centerLat, centerLng, radiusM);
    radiusHandle.setLatLng(L.latLng(edge.lat, edge.lng));
    if (circle) circle.setRadius(radiusM);
    onAreaKm2(circleAreaKm2FromRadiusM(radiusM));
  }

  function setFromLatLng(lat, lng) {
    centerLat = lat;
    centerLng = lng;
    radiusM = MIN_R_M;
    hasZone = true;
    syncVisuals();
  }

  function onMapClick(e) {
    if (!e?.latlng) return;
    setFromLatLng(e.latlng.lat, e.latlng.lng);
  }

  function clear() {
    hasZone = false;
    if (radiusHandle) {
      radiusHandle.off();
      group.removeLayer(radiusHandle);
      radiusHandle = null;
    }
    if (circle) {
      group.removeLayer(circle);
      circle = null;
    }
    onAreaKm2(null);
  }

  map.on("click", onMapClick);

  function destroy() {
    map.off("click", onMapClick);
    if (radiusHandle) {
      radiusHandle.off();
      group.removeLayer(radiusHandle);
      radiusHandle = null;
    }
    if (circle) {
      group.removeLayer(circle);
      circle = null;
    }
    map.removeLayer(group);
  }

  function getZoneSnapshot() {
    if (!hasZone) return null;
    return { centerLat, centerLng, radiusM };
  }

  return { setFromLatLng, clear, destroy, getZoneSnapshot };
}
