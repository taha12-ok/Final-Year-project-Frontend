"use client";
/**
 * /profile — personal dashboard: stats, analysis history (grid + detail),
 * assistant memory viewer/editor. Route-guarded (login required).
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  UserRound, Bone, Brain, Droplets, FileText, Trash2, X, RefreshCw,
  AlertTriangle, Calendar, BrainCircuit, Plus, ShieldCheck, History,
  Phone, Search, Navigation, Copy, Ambulance, Pill, Flame, Bell, Check,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRequireAuth } from "@/components/Auth";
import { apiJson, getActivity, type ActivityItem } from "@/lib/api";
import { EASE } from "@/components/Reveal";

interface Analysis {
  id: number;
  model_type: string;
  scan_type: string;
  result: string;
  confidence: number;
  inconclusive: boolean;
  scan_type_warning: string;
  has_thumbnail: boolean;
  patient_name: string;
  patient_age: string;
  patient_gender: string;
  created_at: string;
}
interface MemoryItem { id: number; key: string; value: string; source: string; updated_at: string; }
interface MedItem { id: number; name: string; dose: string; times: string[]; }
interface TodayItem { medicine_id: number; name: string; dose: string; slot: string; day: string; status: string; }
interface TodayData { day: string; items: TodayItem[]; taken: number; missed: number; total: number; }
interface MedStats { adherence_pct: number | null; streak_days: number; week: { day: string; taken: number; missed: number; pending: number; ratio: number | null }[]; }

const ACTIVITY_META: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  ambulance_call: { label: "Called an ambulance", icon: <Phone size={13} />, color: "#dc2626" },
  ambulance_copy: { label: "Copied an ambulance number", icon: <Copy size={13} />, color: "#dc2626" },
  find_care_search: { label: "Searched hospitals", icon: <Search size={13} />, color: "#2b4bdf" },
  directions: { label: "Got directions", icon: <Navigation size={13} />, color: "#2b4bdf" },
  medicine_add: { label: "Added a medicine", icon: <Pill size={13} />, color: "#7c5cfc" },
  medicine_taken: { label: "Took a dose", icon: <Check size={13} />, color: "#15803d" },
  medicine_missed: { label: "Marked a dose missed", icon: <AlertTriangle size={13} />, color: "#b45309" },
  medicine_stop: { label: "Stopped a medicine", icon: <Trash2 size={13} />, color: "var(--muted)" },
};
function activityMeta(kind: string) {
  return ACTIVITY_META[kind] || { label: kind.replace(/_/g, " "), icon: <History size={13} />, color: "var(--muted)" };
}

const MODEL_META: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  fracture: { label: "Fracture X-ray", icon: <Bone size={15} />, color: "#2b4bdf" },
  brain: { label: "Brain MRI", icon: <Brain size={15} />, color: "#7c5cfc" },
  kidney: { label: "Kidney CT", icon: <Droplets size={15} />, color: "#14b8a6" },
};

const NORMAL_RESULTS = ["normal", "not fractured", "no tumor"];

function resultTone(r: string, inconclusive: boolean) {
  if (inconclusive) return { bg: "rgba(245,165,36,0.1)", border: "rgba(245,165,36,0.4)", color: "#b45309" };
  if (NORMAL_RESULTS.includes(r.toLowerCase())) return { bg: "rgba(48,164,108,0.1)", border: "rgba(48,164,108,0.4)", color: "#15803d" };
  return { bg: "rgba(229,72,77,0.08)", border: "rgba(229,72,77,0.4)", color: "#b91c1c" };
}

export default function ProfilePage() {
  const { user, ready } = useRequireAuth("/profile");
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);
  const [thumbCache, setThumbCache] = useState<Record<number, string>>({});
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [memKey, setMemKey] = useState("");
  const [memVal, setMemVal] = useState("");
  const [tab, setTab] = useState<"history" | "medicines" | "memory" | "activity">("history");

  // medicines state
  const [meds, setMeds] = useState<MedItem[]>([]);
  const [today, setToday] = useState<TodayData | null>(null);
  const [medStats, setMedStats] = useState<MedStats | null>(null);
  const [emailRem, setEmailRem] = useState(true);
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medTimes, setMedTimes] = useState("");
  const [medBusy, setMedBusy] = useState(false);
  const [detailView, setDetailView] = useState<"original" | "focus">("original");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ total: number; analyses: Analysis[] }>(
        `/profile/analyses?${filter ? `model_type=${filter}&` : ""}limit=60`
      );
      setAnalyses(data.analyses);
      setTotal(data.total);
      const mem = await apiJson<{ memory: MemoryItem[] }>("/profile/memory");
      setMemory(mem.memory);
      getActivity(50).then(setActivities).catch(() => { /* ignore */ });
    } catch {
      /* 401 handled globally */
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const loadMeds = useCallback(async () => {
    try {
      const [m, t, s, st] = await Promise.all([
        apiJson<{ medicines: MedItem[] }>("/medicines"),
        apiJson<TodayData>("/medicines/today"),
        apiJson<MedStats>("/medicines/stats"),
        apiJson<{ email_reminders: boolean }>("/settings/me"),
      ]);
      setMeds(m.medicines);
      setToday(t);
      setMedStats(s);
      setEmailRem(st.email_reminders);
    } catch { /* 401 handled globally */ }
  }, []);

  useEffect(() => {
    if (user && tab === "medicines") loadMeds();
  }, [user, tab, loadMeds]);

  const markDose = async (medicine_id: number, day: string, slot: string, status: "taken" | "missed") => {
    setMedBusy(true);
    try {
      await apiJson("/medicines/log", { method: "POST", body: JSON.stringify({ medicine_id, day, slot, status }) });
      const [t, s] = await Promise.all([apiJson<TodayData>("/medicines/today"), apiJson<MedStats>("/medicines/stats")]);
      setToday(t); setMedStats(s);
      getActivity(50).then(setActivities).catch(() => {});
    } catch { /* ignore */ } finally { setMedBusy(false); }
  };

  const addMed = async () => {
    if (!medName.trim()) return;
    setMedBusy(true);
    try {
      const times = medTimes.split(",").map((x) => x.trim()).filter(Boolean);
      await apiJson("/medicines", { method: "POST", body: JSON.stringify({ name: medName, dose: medDose, times: times.length ? times : ["09:00"] }) });
      setMedName(""); setMedDose(""); setMedTimes("");
      await loadMeds();
      getActivity(50).then(setActivities).catch(() => {});
    } catch { /* ignore */ } finally { setMedBusy(false); }
  };

  const stopMed = async (id: number) => {
    setMedBusy(true);
    try {
      await apiJson(`/medicines/${id}`, { method: "DELETE" });
      await loadMeds();
      getActivity(50).then(setActivities).catch(() => {});
    } catch { /* ignore */ } finally { setMedBusy(false); }
  };

  const toggleEmail = async () => {
    try {
      const r = await apiJson<{ email_reminders: boolean }>("/settings/me", { method: "POST", body: JSON.stringify({ email_reminders: !emailRem }) });
      setEmailRem(r.email_reminders);
    } catch { /* ignore */ }
  };

  // thumbnails lazily load karo
  useEffect(() => {
    analyses.forEach(async (a) => {
      if (!a.has_thumbnail || thumbCache[a.id]) return;
      try {
        const d = await apiJson<{ thumbnail: string }>(`/profile/analyses/${a.id}/thumbnail`);
        setThumbCache((prev) => ({ ...prev, [a.id]: d.thumbnail }));
      } catch { /* ignore */ }
    });
  }, [analyses]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (a: Analysis) => {
    try {
      setDetailView("original");
      const d = await apiJson<any>(`/profile/analyses/${a.id}`);
      setDetail(d);
    } catch { /* ignore */ }
  };

  const downloadPdf = async (a: Analysis) => {
    try {
      const res = await apiJson<any>(`/profile/analyses/${a.id}/pdf`, { method: "POST" });
      // backend FileResponse — apiJson parse nahi kar sakta; fetch dobara blob ke liye
      const { BACKEND_URL, getToken } = await import("@/lib/api");
      const r = await fetch(`${BACKEND_URL}/profile/analyses/${a.id}/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) throw new Error("PDF failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MedAI_Report_${a.model_type}_${a.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { alert("PDF download failed — please try again."); }
  };

  const addMemory = async () => {
    if (!memKey.trim() || !memVal.trim()) return;
    try {
      await apiJson("/profile/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: memKey, value: memVal }),
      });
      setMemKey(""); setMemVal("");
      const mem = await apiJson<{ memory: MemoryItem[] }>("/profile/memory");
      setMemory(mem.memory);
    } catch { /* ignore */ }
  };

  const delMemory = async (id: number) => {
    try {
      await apiJson(`/profile/memory/${id}`, { method: "DELETE" });
      setMemory((prev) => prev.filter((m) => m.id !== id));
    } catch { /* ignore */ }
  };

  if (!ready || !user) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)" }}>Loading profile…</p>
      </main>
    );
  }

  const stats = {
    fracture: analyses.filter((a) => a.model_type === "fracture").length,
    brain: analyses.filter((a) => a.model_type === "brain").length,
    kidney: analyses.filter((a) => a.model_type === "kidney").length,
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", position: "relative", overflow: "clip" }}>
      <div className="mesh-bg" />
      <Navbar variant="app" right={
        <Link href="/ai-doctor" className="btn btn-primary" style={{ padding: "9px 16px", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <BrainCircuit size={15} /> AI Assistant
        </Link>
      } />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 20px 60px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <span style={{
            width: 66, height: 66, borderRadius: 20,
            background: "linear-gradient(135deg, var(--brand), var(--violet))",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
            boxShadow: "var(--shadow-brand)",
          }}>
            <UserRound size={30} />
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em" }}>
              {user.full_name || "Your profile"}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              {user.email}{user.age ? ` · ${user.age} yrs` : ""}{user.gender ? ` · ${user.gender}` : ""}
            </p>
          </div>
          <button onClick={load} className="btn btn-secondary" style={{ padding: "10px 16px", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </motion.div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 26 }}>
          {[
            { label: "Total screenings", value: total, icon: <FileText size={16} /> },
            { label: "Fracture X-rays", value: stats.fracture, icon: <Bone size={16} /> },
            { label: "Brain MRIs", value: stats.brain, icon: <Brain size={16} /> },
            { label: "Kidney CTs", value: stats.kidney, icon: <Droplets size={16} /> },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }} className="panel"
              style={{ padding: 18 }}>
              <span style={{ color: "var(--brand)", display: "inline-flex", marginBottom: 8 }}>{s.icon}</span>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700 }}>{s.value}</p>
              <p style={{ fontSize: 12.5, color: "var(--muted)" }}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 30, marginBottom: 16 }}>
        {(["history", "medicines", "memory", "activity"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`chip ${tab === t ? "chip-violet" : ""}`}
            style={{ fontSize: 13, padding: "9px 18px", cursor: "pointer", border: "1px solid var(--border)", background: tab === t ? "var(--violet-soft)" : "var(--surface)", color: tab === t ? "var(--brand-deep)" : "var(--muted)", fontWeight: 700 }}>
            {t === "history" ? "Screening history" : t === "medicines" ? "Medicines" : t === "memory" ? "Assistant memory" : "Recent activity"}
          </button>
        ))}
        </div>

        {tab === "history" && (
          <>
            {/* Filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[{ v: "", label: "All" }, ...Object.entries(MODEL_META).map(([k, m]) => ({ v: k, label: m.label }))].map((f) => (
                <button key={f.v} onClick={() => setFilter(f.v)}
                  style={{
                    fontSize: 12.5, fontWeight: 700, padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                    border: filter === f.v ? "1px solid var(--brand)" : "1px solid var(--border)",
                    background: filter === f.v ? "var(--brand-soft)" : "var(--surface)",
                    color: filter === f.v ? "var(--brand-deep)" : "var(--muted)",
                  }}>
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <p style={{ color: "var(--muted)", padding: 30 }}>Loading history…</p>
            ) : analyses.length === 0 ? (
              <div className="panel" style={{ padding: 40, textAlign: "center" }}>
                <FileText size={30} style={{ color: "var(--muted)", marginBottom: 10 }} />
                <p style={{ fontWeight: 700, marginBottom: 6 }}>No screenings yet</p>
                <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 16 }}>
                  Run your first analysis and it will appear here automatically.
                </p>
                <Link href="/analyze/fracture" className="btn btn-primary" style={{ padding: "11px 20px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 7 }}>
                  Start screening
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {analyses.map((a, i) => {
                  const meta = MODEL_META[a.model_type] || MODEL_META.fracture;
                  const tone = resultTone(a.result, a.inconclusive);
                  return (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.4), ease: EASE }}
                      className="panel" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
                      onClick={() => openDetail(a)}>
                      <div style={{ height: 130, background: "var(--bg-alt)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: "1px solid var(--border)" }}>
                        {thumbCache[a.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`data:image/jpeg;base64,${thumbCache[a.id]}`} alt={a.scan_type}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ color: "var(--muted)" }}>{meta.icon}</span>
                        )}
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            {meta.icon} {meta.label}
                          </span>
                          <span style={{ fontSize: 10.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Calendar size={10} /> {new Date(a.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontWeight: 800, fontSize: 16.5, fontFamily: "var(--font-display)", color: tone.color }}>
                          {a.result}
                        </p>
                        <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                          Confidence {a.confidence}%{a.inconclusive ? " · inconclusive" : ""}
                        </p>
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button onClick={(e) => { e.stopPropagation(); openDetail(a); }}
                            className="btn btn-secondary" style={{ flex: 1, padding: "8px 0", fontSize: 12.5 }}>
                            Details
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); downloadPdf(a); }}
                            className="btn btn-secondary" style={{ padding: "8px 10px", fontSize: 12.5 }} title="Download PDF">
                            <FileText size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "activity" && (
          <div className="panel" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <History size={17} style={{ color: "var(--brand)" }} />
              <p style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: 16 }}>Your recent activity</p>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
              Everything you do in MedAI — hospital searches, directions, ambulance calls — is saved here and in your admin records.
            </p>
            {activities.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
                No activity yet — search hospitals in Find Care or call an ambulance and it will show up here.
              </p>
            ) : (
              <div>
                {activities.map((a, i) => {
                  const meta = activityMeta(a.kind);
                  return (
                    <div key={a.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {/* timeline rail */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch" }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 10, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "var(--bg-alt)", border: "1px solid var(--border)", color: meta.color,
                        }}>{meta.icon}</span>
                        {i < activities.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 18, background: "var(--border)" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingBottom: 16 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginTop: 5 }}>{meta.label}</p>
                        <p style={{ fontSize: 12.5, color: "var(--body)", overflowWrap: "anywhere" }}>{a.detail}</p>
                        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                          {new Date(a.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "medicines" && (
          <div className="panel" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Pill size={17} style={{ color: "var(--violet)" }} />
                <p style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: 16 }}>Medicines & reminders</p>
              </div>
              <button onClick={toggleEmail} title="Email reminders toggle"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  padding: "8px 14px", borderRadius: 999, border: "1px solid var(--border)",
                  background: emailRem ? "var(--violet-soft)" : "var(--surface)", color: emailRem ? "var(--brand-deep)" : "var(--muted)" }}>
                <Bell size={13} /> Email reminders {emailRem ? "ON" : "OFF"}
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
              Apni dawaiyan add karein — har dose ka reminder email se aayega aur app me Taken/Missed mark hoga. Assistant se bhi pooch sakte hain: "metformin kab leni hai?"
            </p>

            {/* stats strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>
              <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", background: "var(--bg-alt)" }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em" }}>TODAY</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800 }}>
                  {today ? `${today.taken}/${today.total}` : "—"}
                  {today && today.missed > 0 && <span style={{ fontSize: 13, color: "#b45309", marginLeft: 6 }}>{today.missed} missed</span>}
                </p>
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", background: "var(--bg-alt)" }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em" }}>STREAK</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                  <Flame size={18} style={{ color: "#f59e0b" }} /> {medStats?.streak_days ?? 0} days
                </p>
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", background: "var(--bg-alt)" }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em" }}>7-DAY ADHERENCE</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800 }}>
                  {medStats?.adherence_pct != null ? `${medStats.adherence_pct}%` : "—"}
                </p>
              </div>
            </div>

            {/* add form */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              <input value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="Medicine (e.g. Metformin)"
                style={{ flex: "1 1 150px", border: "1px solid var(--border-strong)", borderRadius: 11, padding: "10px 13px", fontSize: 13.5, background: "var(--bg)", color: "var(--ink)", outline: "none" }} />
              <input value={medDose} onChange={(e) => setMedDose(e.target.value)} placeholder="Dose (e.g. 500mg)"
                style={{ flex: "0 1 130px", border: "1px solid var(--border-strong)", borderRadius: 11, padding: "10px 13px", fontSize: 13.5, background: "var(--bg)", color: "var(--ink)", outline: "none" }} />
              <input value={medTimes} onChange={(e) => setMedTimes(e.target.value)} placeholder="Times (09:00, 21:00)"
                style={{ flex: "1 1 170px", border: "1px solid var(--border-strong)", borderRadius: 11, padding: "10px 13px", fontSize: 13.5, background: "var(--bg)", color: "var(--ink)", outline: "none" }} />
              <button onClick={addMed} disabled={medBusy || !medName.trim()} className="btn btn-primary"
                style={{ padding: "10px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, opacity: medBusy || !medName.trim() ? 0.6 : 1 }}>
                <Plus size={14} /> Add medicine
              </button>
            </div>

            {/* today schedule */}
            {today && today.items.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 8 }}>TODAY'S SCHEDULE</p>
                {today.items.map((it) => {
                  const taken = it.status === "taken", missed = it.status === "missed";
                  return (
                    <div key={`${it.medicine_id}-${it.slot}`} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, marginBottom: 8,
                      border: `1px solid ${taken ? "rgba(48,164,108,0.4)" : missed ? "rgba(245,165,36,0.5)" : "var(--border)"}`,
                      background: taken ? "rgba(48,164,108,0.07)" : missed ? "rgba(245,165,36,0.08)" : "var(--bg-alt)",
                    }}>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, width: 54 }}>{it.slot}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700 }}>{it.name} {it.dose && <span style={{ color: "var(--muted)", fontWeight: 500 }}>· {it.dose}</span>}</p>
                        <p style={{ fontSize: 11.5, color: taken ? "#15803d" : missed ? "#b45309" : "var(--muted)" }}>
                          {taken ? "✓ Taken" : missed ? "Missed" : "Pending"}
                        </p>
                      </div>
                      {!taken && !missed && (
                        <>
                          <button disabled={medBusy} onClick={() => markDose(it.medicine_id, it.day, it.slot, "taken")} className="btn btn-primary"
                            style={{ padding: "7px 13px", fontSize: 12.5, opacity: medBusy ? 0.6 : 1 }}>✓ Taken</button>
                          <button disabled={medBusy} onClick={() => markDose(it.medicine_id, it.day, it.slot, "missed")}
                            style={{ padding: "7px 13px", fontSize: 12.5, borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer" }}>Missed</button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 7-day dots */}
            {medStats && medStats.week.some((d) => d.taken + d.missed + d.pending > 0) && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                {medStats.week.map((d) => {
                  const total = d.taken + d.missed + d.pending;
                  const pct = total ? Math.round((100 * d.taken) / total) : null;
                  const bgc = pct == null ? "var(--border)" : pct >= 80 ? "#30a46c" : pct >= 40 ? "#f5a524" : "#e5484d";
                  return (
                    <div key={d.day} title={`${d.day}: ${pct == null ? "no doses" : `${pct}% taken`}`}
                      style={{ textAlign: "center" }}>
                      <span style={{ display: "block", width: 34, height: 34, borderRadius: "50%", background: bgc, opacity: pct == null ? 0.35 : 0.85,
                        color: "#fff", fontSize: 11, fontWeight: 800, lineHeight: "34px" }}>{pct == null ? "·" : pct}</span>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{new Date(d.day + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* medicines list */}
            {meds.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Koi dawa set nahi hai — upar form se add karein.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                {meds.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", borderRadius: 12, padding: "10px 13px", background: "var(--bg-alt)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 700 }}>{m.name} {m.dose && <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 12 }}>· {m.dose}</span>}</p>
                      <p style={{ fontSize: 12, color: "var(--muted)" }}>{m.times.join(", ")}</p>
                    </div>
                    <button onClick={() => stopMed(m.id)} title="Stop medicine" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "memory" && (
          <div className="panel" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <BrainCircuit size={17} style={{ color: "var(--brand)" }} />
              <p style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: 16 }}>What your assistant remembers</p>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
              The AI Health Assistant saves durable facts you share (conditions, medications, family history, city).
              It uses them in every new chat. You can add or remove anything here.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              <input value={memKey} onChange={(e) => setMemKey(e.target.value)} placeholder="Key (e.g. allergy)"
                style={{ flex: "1 1 140px", border: "1px solid var(--border-strong)", borderRadius: 11, padding: "10px 13px", fontSize: 13.5, background: "var(--bg)", color: "var(--ink)", outline: "none" }} />
              <input value={memVal} onChange={(e) => setMemVal(e.target.value)} placeholder="Value (e.g. penicillin)"
                style={{ flex: "1 1 180px", border: "1px solid var(--border-strong)", borderRadius: 11, padding: "10px 13px", fontSize: 13.5, background: "var(--bg)", color: "var(--ink)", outline: "none" }} />
              <button onClick={addMemory} className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Add
              </button>
            </div>

            {memory.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nothing saved yet — chat with the assistant and it will learn as you go.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
                {memory.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", borderRadius: 12, padding: "10px 13px", background: "var(--bg-alt)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: "var(--brand)", textTransform: "capitalize" }}>{m.key.replace(/_/g, " ")}</p>
                      <p style={{ fontSize: 13, color: "var(--body)", overflowWrap: "anywhere" }}>{m.value}</p>
                    </div>
                    <button onClick={() => delMemory(m.id)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetail(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,30,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
            <motion.div initial={{ scale: 0.95, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="panel" style={{ width: "min(680px, 100%)", maxHeight: "86vh", overflowY: "auto", padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18 }}>
                  {MODEL_META[detail.model_type]?.label || detail.scan_type} — {detail.id}
                </p>
                <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                  <X size={19} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                {(thumbCache[detail.id] || detail.gradcam_image) && (
                  <div>
                    {detail.gradcam_image && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        {(["original", "focus"] as const).map((v) => (
                          <button key={v} onClick={() => setDetailView(v)}
                            style={{ fontSize: 11.5, fontWeight: 800, padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                              border: detailView === v ? "1px solid var(--brand)" : "1px solid var(--border)",
                              background: detailView === v ? "var(--brand-soft)" : "var(--surface)",
                              color: detailView === v ? "var(--brand-deep)" : "var(--muted)" }}>
                            {v === "original" ? "Original" : "AI Focus"}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detailView === "focus" && detail.gradcam_image
                        ? `data:image/jpeg;base64,${detail.gradcam_image}`
                        : `data:image/jpeg;base64,${thumbCache[detail.id] || detail.gradcam_image}`}
                      alt="scan"
                      style={{ width: "100%", borderRadius: 14, border: "1px solid var(--border)" }} />
                    {detailView === "focus" && (
                      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>Red/Yellow = region the AI focused on</p>
                    )}
                  </div>
                )}
                <div>
                  {(() => {
                    const tone = resultTone(detail.result, detail.inconclusive);
                    return (
                      <div style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: tone.color, marginBottom: 4 }}>SCREENING RESULT</p>
                        <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: tone.color }}>{detail.result}</p>
                        <p style={{ fontSize: 13, color: tone.color, opacity: 0.8 }}>{detail.confidence}% confidence{detail.inconclusive ? " · INCONCLUSIVE" : ""}</p>
                      </div>
                    );
                  })()}
                  <p style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Calendar size={12} /> {detail.created_at ? new Date(detail.created_at).toLocaleString() : "—"}
                  </p>
                  {detail.patient_name && (
                    <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
                      Patient: {detail.patient_name}{detail.patient_age ? `, ${detail.patient_age} yrs` : ""}
                    </p>
                  )}
                </div>
              </div>

              {detail.scan_type_warning && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(245,165,36,0.08)", border: "1px solid rgba(245,165,36,0.4)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
                  <AlertTriangle size={14} style={{ color: "#b45309", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12.5, color: "#b45309" }}>{detail.scan_type_warning}</p>
                </div>
              )}

              {detail.result_json?.alternatives?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.09em", color: "var(--muted)", marginBottom: 8 }}>ALL CLASS PROBABILITIES (AT TIME OF SCAN)</p>
                  {detail.result_json.alternatives.map((alt: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px dashed var(--border)" }}>
                      <span>{alt.class}</span><span style={{ fontWeight: 700 }}>{alt.confidence}%</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button onClick={() => downloadPdf(detail)} className="btn btn-primary" style={{ flex: 1, padding: "12px 0", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <FileText size={15} /> Download PDF report
                </button>
                <Link href={`/analyze/${detail.model_type}`} className="btn btn-secondary" style={{ padding: "12px 18px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 7 }}>
                  New {detail.model_type} scan
                </Link>
              </div>

              <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: 16, padding: 11, borderRadius: 11, background: "var(--violet-soft)" }}>
                <ShieldCheck size={13} style={{ color: "#5B3FE4", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11.5, color: "#5B3FE4" }}>
                  Archived screening record — AI-generated aid, not a diagnosis. Always confirm with a qualified doctor.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
