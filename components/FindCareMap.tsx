"use client";
/**
 * components/FindCareMap.tsx — in-app Leaflet map (OpenStreetMap tiles).
 * No API key, no external redirect. Markers are CircleMarkers (no icon assets).
 * Route polyline comes from OSRM (free routing, drawn client-side).
 */
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface Facility {
  name: string;
  kind: string;
  distance_km: number;
  specialities?: string;
  phone?: string;
  address?: string;
  lat: number;
  lon: number;
  maps?: string;
}

export interface RouteInfo {
  coords: [number, number][]; // [lat, lon]
  km: string;
  min: number;
}

interface FitProps {
  facilities: Facility[];
  route: RouteInfo | null;
  center: { lat: number; lon: number };
}

function FitAll({ facilities, route, center }: FitProps) {
  const map = useMap();
  useEffect(() => {
    if (route && route.coords.length > 1) {
      map.fitBounds(L.latLngBounds(route.coords), { padding: [42, 42] });
      return;
    }
    const pts = facilities
      .filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lon))
      .map((f) => [f.lat, f.lon] as [number, number]);
    if (pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts).pad(0.28));
    } else {
      map.setView([center.lat, center.lon], 12);
    }
  }, [facilities, route, center]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface MapProps {
  center: { lat: number; lon: number };
  facilities: Facility[];
  selected: Facility | null;
  onSelect: (f: Facility) => void;
  route: RouteInfo | null;
}

export default function FindCareMap({ center, facilities, selected, onSelect, route }: MapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={12}
      scrollWheelZoom
      style={{ width: "100%", height: "100%", borderRadius: 18, zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User location */}
      <CircleMarker
        center={[center.lat, center.lon]}
        radius={9}
        pathOptions={{ color: "#2b4bdf", fillColor: "#2b4bdf", fillOpacity: 0.9, weight: 3 }}
      >
        <Popup>You are here</Popup>
      </CircleMarker>

      {/* Facilities */}
      {facilities.map((f, i) => {
        const isSel = selected && f.lat === selected.lat && f.lon === selected.lon;
        return (
          <CircleMarker
            key={`${f.lat}-${f.lon}-${i}`}
            center={[f.lat, f.lon]}
            radius={isSel ? 10 : 6}
            pathOptions={{
              color: isSel ? "#7c3aed" : "#2b4bdf",
              fillColor: isSel ? "#7c3aed" : "#5b7cf7",
              fillOpacity: 0.85,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelect(f) }}
          >
            <Popup>
              <b>{f.name}</b>
              <br />
              {f.kind} · {f.distance_km} km
              <br />
              <small>{f.address}</small>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Route */}
      {route && route.coords.length > 1 && (
        <Polyline
          positions={route.coords}
          pathOptions={{ color: "#7c3aed", weight: 5, opacity: 0.85, lineCap: "round" }}
        />
      )}

      <FitAll facilities={facilities} route={route} center={center} />
    </MapContainer>
  );
}
