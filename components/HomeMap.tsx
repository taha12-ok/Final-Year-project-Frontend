"use client";
/**
 * components/HomeMap.tsx — real Leaflet map for the home-page Find Care showcase.
 * Real Karachi hospitals, a dashed animated route + "you are here" pulse.
 * Deliberately non-interactive (no drag / scroll zoom) so it never hijacks page scroll.
 */
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CENTER: [number, number] = [24.8686, 67.0310]; // central Karachi
const YOU: [number, number] = [24.8607, 67.0011]; // Saddar
const CIVIL: [number, number] = [24.8580, 67.0310]; // Civil Hospital Karachi

const HOSPITALS: { name: string; pos: [number, number] }[] = [
  { name: "Civil Hospital", pos: CIVIL },
  { name: "Jinnah Hospital", pos: [24.8556, 67.0409] },
  { name: "Aga Khan Hospital", pos: [24.8918, 67.0773] },
  { name: "Liaquat National", pos: [24.8857, 67.0670] },
  { name: "Indus Hospital", pos: [24.8679, 67.0695] },
];

const pinIcon = L.divIcon({
  className: "home-map-pin",
  html: `<span class="home-pin-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const selectedIcon = L.divIcon({
  className: "home-map-pin",
  html: `<span class="home-pin-badge home-pin-selected"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitView() {
  const map = useMap();
  useEffect(() => {
    const pts = [YOU, ...HOSPITALS.map((h) => h.pos)];
    map.fitBounds(L.latLngBounds(pts).pad(0.18));
  }, [map]);
  return null;
}

/** styled-jsx can't reach into leaflet's SVG path — set dash animation directly. */
function DashAnimate() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      const el = map.getContainer().querySelector("path[stroke-dasharray]") as SVGPathElement | null;
      if (el) el.style.animation = "homeDashMove 1.6s linear infinite";
    }, 120);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function HomeMap() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes homeDashMove { to { stroke-dashoffset: -19; } }` }} />
      <MapContainer
      center={CENTER}
      zoom={13}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      style={{ width: "100%", height: "100%", background: "#e8edfb" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitView />
      <DashAnimate />

      {/* route: you -> Civil Hospital (dashed, animated via CSS) */}
      <Polyline positions={[YOU, CIVIL]} pathOptions={{ color: "#7c5cfc", weight: 4, dashArray: "10 9", className: "home-route-dash" }} />

      {HOSPITALS.map((h) => (
        <Marker key={h.name} position={h.pos} icon={h.name === "Civil Hospital" ? selectedIcon : pinIcon} />
      ))}

      {/* you-are-here */}
      <CircleMarker center={YOU} radius={7} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2b4bdf", fillOpacity: 1 }} />
      <CircleMarker center={YOU} radius={16} pathOptions={{ color: "#2b4bdf", weight: 1.5, fillOpacity: 0.08 }} className="home-pulse-ring" />

      <style jsx global>{`
        .home-pin-badge {
          width: 24px; height: 24px; border-radius: 50% 50% 50% 4px;
          transform: rotate(-45deg);
          background: linear-gradient(135deg, #2b4bdf, #7c5cfc);
          box-shadow: 0 6px 14px rgba(43, 75, 223, 0.4);
          display: flex; align-items: center; justify-content: center;
        }
        .home-pin-badge svg { transform: rotate(45deg); }
        .home-pin-selected {
          width: 28px; height: 28px;
          animation: homePinBounce 2.2s ease-in-out infinite;
        }
        .home-route-dash { animation: homeDashMove 1.6s linear infinite; }
        .home-pulse-ring { animation: homePulse 2s ease-out infinite; transform-origin: center; }
        @keyframes homeDashMove { to { stroke-dashoffset: -19; } }
        @keyframes homePinBounce { 0%, 100% { margin-top: 0; } 50% { margin-top: -4px; } }
        @keyframes homePulse { 0% { opacity: 0.7; } 70% { opacity: 0.12; } 100% { opacity: 0.7; } }
      `}</style>      </MapContainer>
    </>
  );
}
