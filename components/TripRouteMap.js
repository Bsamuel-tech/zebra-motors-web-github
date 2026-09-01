"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

let iconsFixed = false;
function fixDefaultIcons(L) {
  // Leaflet's default marker icons reference relative image paths that
  // break under Next.js's webpack bundling, this is the standard
  // workaround, pointing them at the same package's own files via static
  // import so nothing depends on an external CDN being reachable.
  if (iconsFixed) return;
  iconsFixed = true;
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}

// Real map, OpenStreetMap tiles via Leaflet, no API key needed (part of the
// same free OSM-based provider choice as lib/geo/provider.js). Renders
// markers for every stop that has a real coordinate (from the destinations
// database or a successful on-the-fly geocode of a custom stop) and, when
// a real route has been computed, the actual road-following line returned
// by the routing API. Stops without coordinates yet are simply not shown
// as markers, never placed at a guessed position.
export default function TripRouteMap({ stops, routeGeometry }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);

  const pointed = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || pointed.length === 0) return;
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      fixDefaultIcons(L);

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 18,
        }).addTo(mapRef.current);
      }
      const map = mapRef.current;

      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
      } else {
        layerGroupRef.current = L.layerGroup().addTo(map);
      }
      const group = layerGroupRef.current;

      pointed.forEach((s, i) => {
        L.marker([s.lat, s.lng])
          .addTo(group)
          .bindPopup(`<strong>${i + 1}. ${escapeHtml(s.name)}</strong>`);
      });

      if (Array.isArray(routeGeometry) && routeGeometry.length > 1) {
        L.polyline(routeGeometry, { color: "#d9a916", weight: 4 }).addTo(group);
      }

      const bounds = L.latLngBounds(pointed.map((s) => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      // A Leaflet map created while its container was hidden or mid-layout
      // sometimes renders at the wrong size until this is called once more.
      setTimeout(() => map.invalidateSize(), 150);
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pointed.map((s) => [s.id, s.lat, s.lng])), JSON.stringify(routeGeometry)]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (pointed.length === 0) {
    return (
      <div className="card" style={{ padding: 30, textAlign: "center" }}>
        <p className="muted" style={{ fontSize: 13 }}>
          A route map will appear here once your stops have real coordinates. Stops from Zebra&apos;s
          destination catalogue usually have these already, a custom stop is located automatically
          when possible.
        </p>
      </div>
    );
  }

  return <div ref={containerRef} style={{ height: 320, width: "100%", borderRadius: 4 }} className="card" />;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
