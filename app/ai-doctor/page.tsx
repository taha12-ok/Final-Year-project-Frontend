"use client";
/**
 * /ai-doctor — AI Health Assistant v2.
 * - ChatGPT-style sidebar: sessions (persisted on backend per user)
 * - Memory-aware: assistant facts injected server-side (skills.md + user memory)
 * - Doctor finder: assistant can trigger nearby-facilities search (OpenStreetMap)
 * - Handoff: structured assessment opens the right analyzer pre-filled
 */
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Stethoscope, Bone, Brain, Droplets, AlertTriangle, Siren, Search,
  FlaskConical, UserRound, SendHorizonal, Bot, User, ArrowRight, RotateCcw,
  Plus, Trash2, MessageSquare, MapPin, BrainCircuit, X, Navigation,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRequireAuth } from "@/components/Auth";
import { apiJson } from "@/lib/api";
import { EASE } from "@/components/Reveal";

interface Handoff { screening: string; name?: string; age?: string; gender?: string; concern?: string }
interface DoctorFind { specialty: string; query?: string }
interface Msg { role: "user" | "assistant"; content: string; handoff?: Handoff | null; doctorfind?: DoctorFind | null; triage?: Triage | null; medicine_answer?: string | null }
interface Triage { level: "red" | "amber" | "green"; label: string; advice: string }
interface Session { id: number; title: string; updated_at: string }

const SCREENINGS: Record<string, { href: string; label: string; icon: ReactNode }> = {
  fracture: { href: "/analyze/fracture", label: "Fracture Detection (X-ray)", icon: <Bone size={17} /> },
  brain: { href: "/analyze/brain", label: "Brain Tumor (MRI)", icon: <Brain size={17} /> },
  kidney: { href: "/analyze/kidney", label: "Kidney Disease (CT)", icon: <Droplets size={17} /> },
};

function headingIcon(text: string): ReactNode {
  const t = text.toLowerCase();
  if (t.includes("assessment")) return <Search size={17} />;
  if (t.includes("condition")) return <AlertTriangle size={17} />;
  if (t.includes("test")) return <FlaskConical size={17} />;
  if (t.includes("urgency")) return <Siren size={17} />;
  if (t.includes("specialist")) return <UserRound size={17} />;
  if (t.includes("next step")) return <ArrowRight size={17} />;
  return null;
}

function AssistantBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ fontSize: 14.5, lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          const heading = line.replace("## ", "");
          const isHigh = /high/i.test(heading);
          const isMed = /medium/i.test(heading);
          return (
            <h3 key={i} style={{
              fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700,
              margin: "14px 0 6px", display: "flex", alignItems: "center", gap: 7,
              color: isHigh ? "var(--alert)" : isMed ? "var(--violet)" : "var(--brand-deep)",
            }}>
              {headingIcon(heading)}{heading}
            </h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 6 }}>
              <span style={{ color: "var(--brand)", fontWeight: 700, flexShrink: 0 }}>▸</span>
              <span>{line.replace(/^[-*] /, "")}</span>
            </div>
          );
        }
        if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />;
        if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ marginBottom: 4 }}>{line}</p>;
      })}
    </div>
  );
}

export default function AIDoctorPage() {
  const { user, ready } = useRequireAuth("/ai-doctor");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [facilities, setFacilities] = useState<any[] | null>(null);
  const [facLoading, setFacLoading] = useState(false);
  const [facLast, setFacLast] = useState<{ specialty: string; query: string }>({ specialty: "", query: "" });
  const scrollRef = useRef<HTMLDivElement>(null);

  const GREETING: Msg = {
    role: "assistant",
    content:
      `Hello${user?.full_name ? " " + user.full_name.split(" ")[0] : ""}! 👋 I'm your MedAI Health Assistant.\n\nI remember our past conversations and your health details. Tell me what's bothering you — I'll ask a few questions, then give you a structured assessment and guide you to the right screening or specialist.`,
  };

  const loadSessions = useCallback(async () => {
    try {
      const d = await apiJson<{ sessions: Session[] }>("/chat/sessions");
      setSessions(d.sessions);
    } catch { /* 401 handled globally */ }
  }, []);

  useEffect(() => {
    if (user) loadSessions();
  }, [user, loadSessions]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const openSession = async (id: number) => {
    try {
      const d = await apiJson<{ id: number; messages: { role: string; content: string }[] }>(`/chat/sessions/${id}`);
      setActiveId(id);
      setMessages(d.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      setFacilities(null);
    } catch { /* ignore */ }
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([GREETING]);
    setFacilities(null);
    setError(null);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "…" }]);
    setInput("");
    setStreaming(true);
    setError(null);

    try {
      const d = await apiJson<{ session_id: number; reply: string; handoff: Handoff | null; doctorfind: DoctorFind | null; memory_saved: string[]; triage: Triage | null; medicine_answer: string | null }>(
        "/chat/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: activeId, message: text }),
        }
      );
      setActiveId(d.session_id);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: d.reply, handoff: d.handoff, doctorfind: d.doctorfind, triage: d.triage, medicine_answer: d.medicine_answer };
        return next;
      });
      loadSessions();
    } catch (e: any) {
      setError(e.message || "Something went wrong — please try again.");
      setMessages((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.content === "…") next.pop();
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiJson(`/chat/sessions/${id}`, { method: "DELETE" });
      if (activeId === id) newChat();
      loadSessions();
    } catch { /* ignore */ }
  };

  const findFacilities = useCallback(async (specialty: string, query?: string) => {
    setFacLoading(true);
    setFacilities(null);
    setFacLast({ specialty, query: query || "" });
    try {
      let lat: number, lon: number;
      if (query) {
        const g = await apiJson<{ lat: number; lon: number }>(`/doctors/geocode?q=${encodeURIComponent(query)}`);
        lat = g.lat; lon = g.lon;
      } else if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
        );
        lat = pos.coords.latitude; lon = pos.coords.longitude;
      } else {
        throw new Error("Location unavailable — tell me your city and I'll search again.");
      }
      const d = await apiJson<{ facilities: any[] }>(`/doctors/nearby?lat=${lat}&lon=${lon}&specialty=${encodeURIComponent(specialty || "")}`);
      setFacilities(d.facilities);
    } catch (e: any) {
      setError(e.message || "Could not find nearby facilities.");
    } finally {
      setFacLoading(false);
    }
  }, []);

  if (!ready || !user) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)" }}>Loading assistant…</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", position: "relative", overflow: "clip" }}>
      <div className="mesh-bg" />
      <Navbar variant="app" right={
        <button onClick={newChat} className="btn btn-secondary" style={{ padding: "9px 14px", fontSize: 13 }}>
          <RotateCcw size={14} /> New chat
        </button>
      } />

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "110px 16px 24px", display: "flex", gap: 16, position: "relative", zIndex: 1, alignItems: "flex-start" }}>
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="panel" style={{ width: 250, flexShrink: 0, padding: 12, maxHeight: "74vh", display: "flex", flexDirection: "column", position: "sticky", top: 96 }}>
              <button onClick={newChat} className="btn btn-primary" style={{ padding: "11px 0", fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 12 }}>
                <Plus size={15} /> New chat
              </button>
              <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", color: "var(--muted)", margin: "0 6px 8px" }}>CHAT HISTORY</p>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {sessions.length === 0 && <p style={{ fontSize: 12.5, color: "var(--muted)", padding: "6px 8px" }}>No conversations yet.</p>}
                {sessions.map((s) => (
                  <div key={s.id} onClick={() => openSession(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 11, cursor: "pointer",
                      background: activeId === s.id ? "var(--brand-soft)" : "transparent",
                      border: activeId === s.id ? "1px solid rgba(43,75,223,0.25)" : "1px solid transparent",
                    }}>
                    <MessageSquare size={13} style={{ color: activeId === s.id ? "var(--brand)" : "var(--muted)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12.8, fontWeight: 600, color: activeId === s.id ? "var(--brand-deep)" : "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.title}
                    </span>
                    <button onClick={(e) => deleteSession(s.id, e)} title="Delete chat"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", opacity: 0.6 }}>
                      <Trash2 size={12.5} />
                    </button>
                  </div>
                ))}
              </div>
              <Link href="/profile" style={{ fontSize: 12.5, color: "var(--brand)", fontWeight: 700, textDecoration: "none", padding: "10px 8px 4px", borderTop: "1px solid var(--border)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <BrainCircuit size={13} /> Manage memory →
              </Link>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            style={{ textAlign: "center", marginBottom: 16 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, letterSpacing: "-0.03em" }}>
              AI Health <span className="gradient-text">Assistant</span>
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
              Memory-aware symptom checker — it remembers your history and can find nearby doctors.
            </p>
          </motion.div>

          <div className="panel" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "min(66vh, 620px)" }}>
            <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              {(messages.length ? messages : [GREETING]).map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  style={{
                    display: "flex", gap: 10,
                    flexDirection: m.role === "user" ? "row-reverse" : "row",
                    maxWidth: "88%", alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: m.role === "user" ? "linear-gradient(135deg, var(--brand), var(--violet))" : "var(--brand-soft)",
                    color: m.role === "user" ? "#fff" : "var(--brand)",
                    border: m.role === "user" ? "none" : "1px solid rgba(43,75,223,0.2)",
                  }}>
                    {m.role === "user" ? <User size={16} /> : <Bot size={17} />}
                  </span>
                  <div style={{
                    background: m.role === "user" ? "linear-gradient(135deg, var(--brand), var(--violet) 140%)" : "var(--surface)",
                    color: m.role === "user" ? "#fff" : "var(--body)",
                    border: m.role === "user" ? "none" : "1px solid var(--border)",
                    borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    padding: "12px 15px", boxShadow: "var(--shadow-xs)", minWidth: 0,
                  }}>
                    {m.role === "assistant" ? <AssistantBody text={m.content} /> : <p style={{ fontSize: 14.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</p>}

                    {m.role === "assistant" && streaming && i === messages.length - 1 && m.content === "…" && (
                      <div style={{ display: "flex", gap: 5, padding: "4px 0" }}>
                        {[0, 1, 2].map((d) => (
                          <motion.span key={d} animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.18 }}
                            style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand)" }} />
                        ))}
                      </div>
                    )}

                    {/* Triage card (deterministic red/amber/green) */}
                    {m.triage && (() => {
                      const T = m.triage;
                      const tone = T.level === "red"
                        ? { bg: "rgba(229,72,77,0.08)", bd: "rgba(229,72,77,0.45)", fg: "#b91c1c" }
                        : T.level === "amber"
                          ? { bg: "rgba(245,165,36,0.1)", bd: "rgba(245,165,36,0.5)", fg: "#b45309" }
                          : { bg: "rgba(48,164,108,0.08)", bd: "rgba(48,164,108,0.45)", fg: "#15803d" };
                      return (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35, ease: EASE }}
                          style={{ marginTop: 14, padding: "13px 15px", borderRadius: 14, background: tone.bg, border: `1.5px solid ${tone.bd}` }}>
                          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: tone.fg, marginBottom: 4 }}>
                            {T.level === "red" ? "🚨 EMERGENCY" : T.level === "amber" ? "⚠️ SEE A DOCTOR SOON" : "✓ SELF CARE"}
                          </p>
                          <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>{T.advice}</p>
                          {T.level === "red" && (
                            <a href="tel:1122" className="btn btn-primary"
                              style={{ marginTop: 10, padding: "9px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
                              📞 Call Ambulance 1122
                            </a>
                          )}
                          {T.level === "amber" && (
                            <Link href="/find-care" className="btn btn-secondary"
                              style={{ marginTop: 10, padding: "9px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
                              <MapPin size={13} /> Find a specialist
                            </Link>
                          )}
                        </motion.div>
                      );
                    })()}

                    {/* Medicine schedule answer (deterministic, DB se) */}
                    {m.medicine_answer && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35, ease: EASE }}
                        style={{ marginTop: 14, padding: "13px 15px", borderRadius: 14, background: "rgba(124,92,252,0.07)", border: "1.5px solid rgba(124,92,252,0.4)" }}>
                        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "var(--violet)", marginBottom: 6 }}>💊 YOUR MEDICINES</p>
                        <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.medicine_answer}</p>
                        <Link href="/profile" className="btn btn-secondary"
                          style={{ marginTop: 10, padding: "8px 14px", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
                          Manage medicines & reminders
                        </Link>
                      </motion.div>
                    )}

                    {/* Doctor finder results */}
                    {m.doctorfind && (
                      <div style={{ marginTop: 12 }}>
                        {facLoading && <p style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 7 }}><Navigation size={13} /> Searching nearby facilities…</p>}
                        {facilities && facilities.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>No facilities found nearby — try a bigger city name.</p>}
                        {facilities && facilities.slice(0, 6).map((f: any, fi: number) => (
                          <a key={fi} href={f.maps} target="_blank" rel="noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 7, textDecoration: "none", background: "var(--bg-alt)" }}>
                            <MapPin size={15} style={{ color: "var(--brand)", flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{f.name}</p>
                              <p style={{ fontSize: 11.5, color: "var(--muted)" }}>
                                {f.kind} · {f.distance_km} km{f.specialities ? ` · ${f.specialities}` : ""}
                              </p>
                            </div>
                            <ArrowRight size={13} style={{ color: "var(--muted)" }} />
                          </a>
                        ))}
                        {facilities && facilities.length > 0 && (
                          <Link
                            href="/find-care"
                            onClick={() => {
                              try { sessionStorage.setItem("findcare_prefill", JSON.stringify({ specialty: facLast.specialty, city: facLast.query })); } catch { /* ignore */ }
                            }}
                            className="btn btn-secondary"
                            style={{ width: "100%", padding: "9px 12px", fontSize: 12.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 2 }}
                          >
                            <MapPin size={13} /> Open in Find Care — live map & directions
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Handoff card */}
                    {m.handoff && m.handoff.screening && m.handoff.screening !== "none" && SCREENINGS[m.handoff.screening] && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35, ease: EASE }}
                        style={{
                          marginTop: 14, padding: 14, borderRadius: 14,
                          background: "linear-gradient(135deg, var(--brand-soft), var(--violet-soft))",
                          border: "1px solid rgba(43,75,223,0.25)",
                        }}>
                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--brand-deep)", marginBottom: 8 }}>
                          RECOMMENDED SCREENING
                        </p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                          {SCREENINGS[m.handoff.screening].icon} {SCREENINGS[m.handoff.screening].label}
                        </p>
                        {m.handoff.concern && <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>“{m.handoff.concern}”</p>}
                        <Link href={{
                          pathname: SCREENINGS[m.handoff.screening].href,
                          query: {
                            name: m.handoff.name || "",
                            age: m.handoff.age || "",
                            gender: m.handoff.gender || "",
                            concern: m.handoff.concern || "",
                          },
                        }}>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="btn btn-primary" style={{ fontSize: 13.5, padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 7 }}>
                            Start Screening <ArrowRight size={15} />
                          </motion.button>
                        </Link>
                        <p style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>
                          Your details will be pre-filled — just upload the scan and analyze.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}

              {error && (
                <div style={{ alignSelf: "center", background: "rgba(229,72,77,0.08)", border: "1px solid var(--alert)", color: "var(--alert)", padding: "10px 16px", borderRadius: 12, fontSize: 13 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", background: "var(--surface)", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Describe your symptoms… (Enter to send)"
                disabled={streaming}
                style={{
                  flex: 1, resize: "none", border: "1px solid var(--border-strong)", borderRadius: 14,
                  padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", background: "var(--bg)",
                  color: "var(--ink)", outline: "none", maxHeight: 120, minHeight: 46,
                }}
              />
              <motion.button onClick={send} disabled={!input.trim() || streaming}
                whileHover={input.trim() && !streaming ? { scale: 1.05 } : {}} whileTap={input.trim() && !streaming ? { scale: 0.95 } : {}}
                className="btn" style={{
                  padding: "12px 16px",
                  ...(input.trim() && !streaming
                    ? { background: "linear-gradient(135deg, var(--brand), var(--violet))", color: "#fff", boxShadow: "var(--shadow-brand)" }
                    : { background: "var(--bg-alt)", color: "var(--muted)", cursor: "not-allowed" }),
                }}>
                <SendHorizonal size={17} />
              </motion.button>
            </div>
          </div>

          <div style={{ marginTop: 12, padding: "12px 16px", background: "var(--violet-soft)", border: "1px solid rgba(124,92,252,0.28)", borderRadius: 14, display: "flex", gap: 9, alignItems: "flex-start" }}>
            <AlertTriangle size={15} style={{ color: "#5B3FE4", flexShrink: 0, marginTop: 2 }} />
            <p style={{ color: "#5B3FE4", fontSize: 12, lineHeight: 1.65 }}>
              <strong>Medical Disclaimer:</strong> This AI assistant is a screening aid, not a diagnosis. In an emergency (severe chest pain, difficulty breathing, fainting), go to the nearest hospital immediately. Always confirm with a qualified doctor.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="btn btn-secondary"
        style={{ position: "fixed", bottom: 20, left: 16, zIndex: 90, padding: "11px 15px", borderRadius: 999, display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
        <MessageSquare size={15} /> History
      </button>
    </main>
  );
}
