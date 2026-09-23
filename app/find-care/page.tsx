"use client";
/**
 * /find-care — Hospital & doctor finder with an in-app map (Leaflet/OSM, no API
 * key, no external redirect) + ambulance numbers directory (all countries).
 * MVP scope: search facilities by specialty + location, click result to see it
 * on the map, "Get Directions" draws an OSRM route with distance/ETA.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin, Navigation, Search, Phone, Copy, Check, Ambulance, Stethoscope,
  LocateFixed, ExternalLink, AlertTriangle, Hospital, ShieldCheck, ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import Reveal, { EASE } from "@/components/Reveal";
import { apiJson, logActivity } from "@/lib/api";
import { useAuth } from "@/components/Auth";
import { AMBULANCE_NUMBERS } from "@/lib/emergency";
import type { Facility, RouteInfo } from "@/components/FindCareMap";

// Leaflet touches window — client-only
const FindCareMap = dynamic(() => import("@/components/FindCareMap"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", borderRadius: 18, background: "var(--bg-alt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: 13, color: "var(--muted)", display: "flex", gap: 8, alignItems: "center" }}><MapPin size={14} /> Loading map…</p>
    </div>
  ),
});

const SPECIALTIES = [
  "Hospital", "Orthopedic", "Dentist", "Cardiologist", "Pediatrician",
  "Eye Specialist", "GP", "Pharmacy",
];

const DEFAULT_CENTER = { lat: 24.8607, lon: 67.0011 }; // Karachi — fallback view

export default function FindCarePage() {
  const { user, ready } = useAuth();

  // Finder state
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Facility | null>(null);

  // Route state
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Ambulance state
  const [ambQ, setAmbQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  const ambList = useMemo(() => {
    const q = ambQ.trim().toLowerCase();
    if (!q) return AMBULANCE_NUMBERS;
    return AMBULANCE_NUMBERS.filter(
      (a) => a.country.toLowerCase().includes(q) || a.number.includes(q)
    );
  }, [ambQ]);

  /** Ambulance list ki priority: pehle user ke country ke numbers (detect kiye hue ya search se), baqi neeche. */
  const sortedAmbList = useMemo(() => {
    if (!detectedCountry) return ambList;
    const dc = detectedCountry.toLowerCase();
    const match = ambList.filter((a) => a.country.toLowerCase().includes(dc));
    if (!match.length) return ambList;
    return [...match, ...ambList.filter((a) => !match.includes(a))];
  }, [ambList, detectedCountry]);

  /** Resolve location -> fetch facilities (auth required by backend). */
  const runSearch = useCallback(async (opts?: { myLocation?: boolean }) => {
    setLoading(true);
    setError(null);
    setRoute(null);
    setRouteError(null);
    try {
      let lat: number, lon: number;
      if (opts?.myLocation) {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        setCenter({ lat, lon });
        // Location text auto-fill — "Use my location" ke sath field khud bhar jaye
        apiJson<{ name: string }>(`/doctors/reverse?lat=${lat}&lon=${lon}`)
          .then((r) => { if (r.name) setCity(r.name); })
          .catch(() => { /* silent */ });
      } else {
        const q = city.trim();
        if (!q) throw new Error("Type a city first — or use my location.");
      const g = await apiJson<{ lat: number; lon: number; name?: string }>(
        `/doctors/geocode?q=${encodeURIComponent(q)}`
      );
      lat = g.lat; lon = g.lon;
      setCenter({ lat, lon });
      if (g.name && !opts?.myLocation && !city.includes(",")) setCity(g.name.split(",").slice(0, 2).join(", "));
      if (g.name) {
        // Country detect karo geocode label se — ambulance list us country ko priority degi
        const parts = g.name.split(",").map((s: string) => s.trim());
        const countryGuess = parts[parts.length - 1];
        if (countryGuess && countryGuess.length > 2) setDetectedCountry(countryGuess);
      }
      }
      const d = await apiJson<{ facilities: Facility[] }>(
        `/doctors/nearby?lat=${lat}&lon=${lon}&specialty=${encodeURIComponent(specialty)}`
      );
      setFacilities(d.facilities || []);
      setSearched(true);
      setSelected((d.facilities || [])[0] || null);
      if (!d.facilities?.length) setError("No facilities found nearby — try a bigger city name.");
      else logActivity("find_care_search", `${specialty || "all"} - ${opts?.myLocation ? "my location" : city.trim()} - ${d.facilities.length} results`);
    } catch (e: any) {
      setFacilities([]);
      setSearched(true);
      setError(e.message || "Search failed — please try again.");
    } finally {
      setLoading(false);
    }
  }, [city, specialty]);

  /** Draw route from user to selected facility — via backend OSRM proxy. */
  const getDirections = useCallback(async () => {
    if (!selected) return;
    setRouteLoading(true);
    setRouteError(null);
    setRoute(null);
    try {
      const d = await apiJson<{ coords: [number, number][]; km: number; min: number }>(
        `/doctors/directions?lat1=${center.lat}&lon1=${center.lon}&lat2=${selected.lat}&lon2=${selected.lon}`
      );
      setRoute({ coords: d.coords, km: String(d.km), min: d.min });
      logActivity("directions", `${selected.name} - ${d.km} km - ${d.min} min`);
    } catch {
      setRouteError("Routing service is busy right now — try again in a moment.");
    } finally {
      setRouteLoading(false);
    }
  }, [selected, center]);

  /** Prefill from AI assistant handoff (sessionStorage) or URL params. */
  useEffect(() => {
    if (!ready || !user) return;
    let prefill: { specialty?: string; city?: string } | null = null;
    try {
      const raw = sessionStorage.getItem("findcare_prefill");
      if (raw) {
        prefill = JSON.parse(raw);
        sessionStorage.removeItem("findcare_prefill");
      }
    } catch { /* ignore */ }
    if (!prefill && typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("city") || sp.get("specialty")) {
        prefill = { specialty: sp.get("specialty") || "", city: sp.get("city") || "" };
      }
    }
    if (prefill) {
      if (prefill.specialty) setSpecialty(prefill.specialty);
      if (prefill.city) {
        setCity(prefill.city);
        // auto-search once with the prefilled city
        (async () => {
          setLoading(true);
          try {
            const g = await apiJson<{ lat: number; lon: number }>(
              `/doctors/geocode?q=${encodeURIComponent(prefill!.city!)}`
            );
            setCenter({ lat: g.lat, lon: g.lon });
            const d = await apiJson<{ facilities: Facility[] }>(
              `/doctors/nearby?lat=${g.lat}&lon=${g.lon}&specialty=${encodeURIComponent(prefill!.specialty || "")}`
            );
            setFacilities(d.facilities || []);
            setSelected((d.facilities || [])[0] || null);
            setSearched(true);
          } catch { /* user can retry manually */ } finally { setLoading(false); }
        })();
      }
    }
  }, [ready, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyNumber = async (entry: { country: string; number: string }) => {
    try {
      await navigator.clipboard.writeText(entry.number);
      setCopied(entry.country);
      setTimeout(() => setCopied(null), 1600);
      logActivity("ambulance_copy", `${entry.country} ${entry.number}`);
    } catch { /* clipboard unavailable */ }
  };

  const callAmbulance = (entry: { country: string; number: string }) => {
    logActivity("ambulance_call", `${entry.country} ${entry.number}`);
  };

  // ── Auth gate: signed-out users see nothing but a sign-in prompt ──
  const authLoading = !ready;
  const signedOut = ready && !user;

  if (authLoading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Navbar variant="app" />
        <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}
          style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</motion.p>
      </main>
    );
  }

  if (signedOut) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Navbar variant="app" />
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}
          className="panel" style={{ maxWidth: 420, width: "100%", padding: "38px 34px", textAlign: "center", borderRadius: 22 }}>
          <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 58, height: 58, borderRadius: 18, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, var(--brand), var(--violet))", color: "#fff", boxShadow: "0 10px 26px rgba(43,75,223,0.35)" }}>
            <ShieldCheck size={27} />
          </motion.span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Members only</h2>
          <p style={{ color: "var(--body)", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Find Care — hospital search, live map, directions and the emergency directory — is available to signed-in MedAI members.
          </p>
          <Link href="/login?next=/find-care" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", display: "inline-flex", padding: "12px 20px", fontSize: 14.5 }}>
            Sign in to continue <ArrowRight size={16} />
          </Link>
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14 }}>
            New here? <Link href="/signup?next=/find-care" style={{ color: "var(--brand)", fontWeight: 700 }}>Create a free account</Link>
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", paddingTop: 96, paddingBottom: 80 }}>
      <Navbar variant="app" />

      {/* ── Header ── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px" }}>
        <SectionHeading
          eyebrow="Find Care"
          title="Hospitals & Emergency Near You"
          sub="Search doctors and hospitals by specialty, see them on a live map, get directions — all inside MedAI. Plus one-tap ambulance numbers for every country."
        />
      </section>

      {/* ── Finder panel ── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 20px 0" }}>
        <Reveal type="fade-up">
          <div className="panel" style={{ padding: "22px 24px", borderRadius: 20 }}>
            {/* Specialty chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {SPECIALTIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpecialty(specialty === s ? "" : s)}
                  className="nav-link"
                  style={{
                    padding: "7px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                    border: `1px solid ${specialty === s ? "var(--brand)" : "var(--border)"}`,
                    background: specialty === s ? "rgba(43,75,223,0.1)" : "transparent",
                    color: specialty === s ? "var(--brand)" : "var(--muted)",
                    fontWeight: 600, fontFamily: "inherit",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Location row */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", borderRadius: 13, border: "1px solid var(--border)", background: "var(--bg-alt)" }}>
                <Search size={15} style={{ color: "var(--muted)" }} />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ready && user && runSearch()}
                  placeholder="Type your city — e.g. Karachi, Lahore, Dubai…"
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 14 }}
                />
                {city && (
                  <button onClick={() => setCity("")} title="Clear"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 15, lineHeight: 1, padding: 0, fontFamily: "inherit" }}>×</button>
                )}
              </div>
              <button
                onClick={() => runSearch({ myLocation: true })}
                disabled={loading}
                className="btn btn-secondary"
                style={{ padding: "11px 16px", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 7 }}
              >
                <LocateFixed size={15} /> Use my location
              </button>
              <button
                onClick={() => runSearch()}
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: "11px 22px", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 7 }}
              >
                <Search size={15} /> {loading ? "Searching…" : "Search"}
              </button>
            </div>

            {error && (
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 7 }}>
                <AlertTriangle size={13} /> {error}
              </p>
            )}
          </div>
        </Reveal>
      </section>

      {/* ── Results + map ── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.15fr)", gap: 16, alignItems: "stretch" }} className="findcare-grid">
          {/* Results list */}
          <Reveal type="fade-up" delay={0.05}>
            <div className="panel" style={{ padding: 16, borderRadius: 20, height: "100%", maxHeight: 560, overflowY: "auto" }}>
              {!searched && (
                <div style={{ textAlign: "center", padding: "48px 16px" }}>
                  <Hospital size={30} style={{ color: "var(--border)", marginBottom: 10 }} />
                  <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
                    Pick a specialty, type your city, and hit Search — results will appear here.
                  </p>
                </div>
              )}
              {searched && facilities.length === 0 && !error && (
                <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: 24 }}>No facilities found.</p>
              )}
              {facilities.map((f, i) => {
                const isSel = selected && f.lat === selected.lat && f.lon === selected.lon;
                return (
                  <motion.button
                    key={`${f.lat}-${f.lon}-${i}`}
                    onClick={() => { setSelected(f); setRoute(null); setRouteError(null); }}
                    whileHover={{ y: -2 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.045, duration: 0.35, ease: EASE }}
                    style={{
                      width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 11,
                      padding: "12px 14px", borderRadius: 14, marginBottom: 9, cursor: "pointer",
                      border: `1px solid ${isSel ? "var(--brand)" : "var(--border)"}`,
                      background: isSel ? "rgba(43,75,223,0.07)" : "var(--bg-alt)",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{
                      width: 34, height: 34, borderRadius: 11, flexShrink: 0, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      background: isSel ? "linear-gradient(135deg, var(--brand), var(--violet))" : "rgba(43,75,223,0.1)",
                      color: "#fff",
                    }}>
                      <Stethoscope size={15} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{f.name}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                        {f.kind} · {f.distance_km} km away{f.phone ? " · 📞" : ""}
                      </span>
                    </span>
                    <Navigation size={14} style={{ color: isSel ? "var(--brand)" : "var(--muted)", flexShrink: 0 }} />
                  </motion.button>
                );
              })}
            </div>
          </Reveal>

          {/* Map + selected card */}
          <Reveal type="fade-up" delay={0.1}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
              <div style={{ height: 380, borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)", position: "relative" }}>
                <FindCareMap
                  center={center}
                  facilities={facilities}
                  selected={selected}
                  onSelect={(f) => { setSelected(f); setRoute(null); setRouteError(null); }}
                  route={route}
                />
              </div>

              {/* Selected facility actions */}
              {selected && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}
                  className="panel" style={{ padding: "14px 16px", borderRadius: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{selected.name}</p>
                      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {selected.kind}{selected.address ? ` · ${selected.address}` : ""}{selected.phone ? ` · ${selected.phone}` : ""}
                      </p>
                      {route && (
                        <p style={{ fontSize: 12.5, color: "var(--brand)", fontWeight: 700, marginTop: 6 }}>
                          🚗 {route.km} km · about {route.min} min drive
                        </p>
                      )}
                      {routeError && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{routeError}</p>}
                    </div>
                    <button
                      onClick={getDirections}
                      disabled={routeLoading}
                      className="btn btn-primary"
                      style={{ padding: "9px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 7 }}
                    >
                      <Navigation size={14} /> {routeLoading ? "Routing…" : route ? "Re-draw route" : "Get Directions"}
                    </button>
                    {selected.maps && (
                      <a href={selected.maps} target="_blank" rel="noreferrer" className="btn btn-secondary"
                        style={{ padding: "9px 14px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <ExternalLink size={13} /> Google Maps
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Ambulance numbers ── */}
      <section id="ambulance" style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 20px 0" }}>
        <SectionHeading
          eyebrow="Emergency"
          title="Ambulance Numbers — Every Country"
          sub="One tap dials emergency services on mobile. Search your country and save the number today."
        />

        <Reveal type="fade-up" delay={0.05}>
          <div style={{ maxWidth: 480, margin: "22px auto 0", display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Search size={15} style={{ color: "var(--muted)" }} />
            <input
              value={ambQ}
              onChange={(e) => setAmbQ(e.target.value)}
              placeholder="Search country — e.g. Pakistan, UAE, India…"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 14 }}
            />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{ambList.length} countries</span>
          </div>
          {detectedCountry && (
            <div style={{ maxWidth: 480, margin: "12px auto 0", textAlign: "center" }}>
              <button onClick={() => setDetectedCountry(null)} title="Clear country focus"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  padding: "7px 14px", borderRadius: 999, border: "1px solid rgba(220,38,38,0.35)", background: "rgba(220,38,38,0.08)", color: "#dc2626", fontFamily: "inherit" }}>
                <Ambulance size={13} /> {detectedCountry} — your location <span style={{ opacity: 0.7 }}>·</span> <span style={{ textDecoration: "underline" }}>clear</span>
              </button>
            </div>
          )}
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12, marginTop: 22 }}>
          {sortedAmbList.map((a, i) => (
            <motion.div
              key={a.country}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.4, ease: EASE }}
              whileHover={{ y: -3 }}
              style={{
                borderRadius: 16, padding: "14px 16px",
                background: "linear-gradient(150deg, rgba(220,38,38,0.09), rgba(220,38,38,0.02))",
                border: "1px solid rgba(220,38,38,0.22)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 19 }}>{a.flag}</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", flex: 1 }}>{a.country}</p>
                <Ambulance size={15} style={{ color: "#dc2626" }} />
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "#dc2626", letterSpacing: "0.02em", lineHeight: 1 }}>
                {a.number}
              </p>
              {a.note && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>{a.note}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <a
                  href={`tel:${a.number.replace(/\s/g, "")}`}
                  onClick={() => callAmbulance(a)}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "8px 10px", fontSize: 12.5, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: "linear-gradient(135deg, #dc2626, #b91c1c)", boxShadow: "0 5px 14px rgba(220,38,38,0.3)" }}
                >
                  <Phone size={13} /> Call now
                </a>
                <button
                  onClick={() => copyNumber(a)}
                  className="btn btn-secondary"
                  title="Copy number"
                  style={{ padding: "8px 10px", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  {copied === a.country ? <Check size={13} style={{ color: "#16a34a" }} /> : <Copy size={13} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted)", marginTop: 18 }}>
          Numbers compiled from public emergency directories — always verify locally. In a life-threatening situation, call immediately.
        </p>
      </section>

      {/* Responsive grid fix */}
      <style jsx>{`
        @media (max-width: 900px) {
          .findcare-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
