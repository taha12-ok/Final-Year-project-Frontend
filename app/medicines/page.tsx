"use client";
/**
 * /medicines — dedicated medicines & reminders page (profile ka poora medicines
 * section, ab apne page par). Features:
 *  - Aaj ka schedule (Taken/Missed), streak + 7-day adherence
 *  - Add/stop medicines with optional per-medicine reminder email
 *  - Email reminders ON/OFF + default reminder email override
 *  - Login reminder popup: due/pending dose ho to login par foran popup
 *  - Header me "due now" badge jab koi dose pending ho
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill, Bell, BellOff, Plus, Trash2, Flame, X, AlertCircle, ArrowRight, Clock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import Reveal, { EASE } from "@/components/Reveal";
import { apiJson, logActivity } from "@/lib/api";
import { useAuth } from "@/components/Auth";

interface MedItem { id: number; name: string; dose: string; times: string[]; recipient_email?: string; }
interface TodayItem { medicine_id: number; name: string; dose: string; slot: string; day: string; status: string; }
interface TodayData { day: string; items: TodayItem[]; taken: number; missed: number; total: number; }
interface MedStats { adherence_pct: number | null; streak_days: number; week: { day: string; taken: number; missed: number; pending: number; ratio: number | null }[]; }

const inputStyle = { border: "1px solid var(--border-strong)", borderRadius: 11, padding: "10px 13px", fontSize: 13.5, background: "var(--bg)", color: "var(--ink)", outline: "none" } as const;

export default function MedicinesPage() {
  const { user, ready } = useAuth();

  const [meds, setMeds] = useState<MedItem[]>([]);
  const [today, setToday] = useState<TodayData | null>(null);
  const [medStats, setMedStats] = useState<MedStats | null>(null);
  const [emailRem, setEmailRem] = useState(true);
  const [remEmail, setRemEmail] = useState("");
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medTimes, setMedTimes] = useState("");
  const [medEmail, setMedEmail] = useState("");
  const [medBusy, setMedBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [popupDose, setPopupDose] = useState<TodayItem | null>(null);

  const loadMeds = useCallback(async () => {
    try {
      const [m, t, s, st] = await Promise.all([
        apiJson<{ medicines: MedItem[]; reminder_email?: string }>("/medicines"),
        apiJson<TodayData>("/medicines/today"),
        apiJson<MedStats>("/medicines/stats"),
        apiJson<{ email_reminders: boolean; reminder_email?: string }>("/settings/me"),
      ]);
      setMeds(m.medicines);
      setToday(t);
      setMedStats(s);
      setEmailRem(st.email_reminders);
      setRemEmail(st.reminder_email || m.reminder_email || "");
    } catch { /* 401 handled globally */ }
  }, []);

  useEffect(() => {
    if (user && ready) loadMeds();
  }, [user, ready, loadMeds]);

  /** Login reminder popup — due/pending dose (slot aane wala 15 min me ya ho chuka 30 min tak) */
  useEffect(() => {
    if (!user || !today) return;
    if (popupDose) return;
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const dayKey = today.day;
    for (const it of today.items) {
      if (it.status !== "pending") continue;
      const [hh, mm] = it.slot.split(":").map(Number);
      const slotMin = hh * 60 + mm;
      const due = slotMin - nowMin <= 15 && nowMin - slotMin <= 30; // aane wala ya abhi ka
      if (!due) continue;
      const dismissKey = `medai_dose_dismissed_${dayKey}_${it.medicine_id}_${it.slot}`;
      if (typeof window !== "undefined" && sessionStorage.getItem(dismissKey)) continue;
      setPopupDose(it);
      break;
    }
  }, [user, today, popupDose]);

  const dismissPopup = (it: TodayItem | null) => {
    if (it && today && typeof window !== "undefined") {
      sessionStorage.setItem(`medai_dose_dismissed_${today.day}_${it.medicine_id}_${it.slot}`, "1");
    }
    setPopupDose(null);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const markDose = async (medicine_id: number, day: string, slot: string, status: "taken" | "missed") => {
    setMedBusy(true);
    try {
      await apiJson("/medicines/log", { method: "POST", body: JSON.stringify({ medicine_id, day, slot, status }) });
      const [t, s] = await Promise.all([apiJson<TodayData>("/medicines/today"), apiJson<MedStats>("/medicines/stats")]);
      setToday(t); setMedStats(s);
      showToast(status === "taken" ? "✓ Dose marked as taken" : "Dose marked as missed");
    } catch { /* ignore */ } finally { setMedBusy(false); }
  };

  const addMed = async () => {
    if (!medName.trim()) return;
    setMedBusy(true);
    try {
      const times = medTimes.split(",").map((x) => x.trim()).filter(Boolean);
      await apiJson("/medicines", { method: "POST", body: JSON.stringify({ name: medName, dose: medDose, times: times.length ? times : ["09:00"], recipient_email: medEmail.trim() }) });
      logActivity("medicine_add", `${medName.trim()}${medDose ? " " + medDose : ""}`);
      setMedName(""); setMedDose(""); setMedTimes(""); setMedEmail("");
      await loadMeds();
      showToast("Medicine added — reminders set");
    } catch { /* ignore */ } finally { setMedBusy(false); }
  };

  const stopMed = async (id: number, name: string) => {
    setMedBusy(true);
    try {
      await apiJson(`/medicines/${id}`, { method: "DELETE" });
      await loadMeds();
      showToast(`${name} stopped`);
    } catch { /* ignore */ } finally { setMedBusy(false); }
  };

  const saveEmailSettings = async (nextOn: boolean) => {
    try {
      const r = await apiJson<{ email_reminders: boolean; reminder_email?: string }>("/settings/me", { method: "POST", body: JSON.stringify({ email_reminders: nextOn, reminder_email: remEmail.trim() }) });
      setEmailRem(r.email_reminders);
      if (r.reminder_email !== undefined) setRemEmail(r.reminder_email);
      showToast(nextOn ? "Email reminders ON" : "Email reminders OFF");
    } catch { /* ignore */ }
  };

  const pendingNow = useMemo(() => {
    if (!today) return 0;
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    return today.items.filter((it) => {
      if (it.status !== "pending") return false;
      const [hh, mm] = it.slot.split(":").map(Number);
      return nowMin - (hh * 60 + mm) <= 30;
    }).length;
  }, [today]);

  // ── Auth gate ──
  if (!ready) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Navbar variant="app" />
        <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</motion.p>
      </main>
    );
  }
  if (!user) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Navbar variant="app" />
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}
          className="panel" style={{ maxWidth: 420, width: "100%", padding: "38px 34px", textAlign: "center", borderRadius: 22 }}>
          <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 58, height: 58, borderRadius: 18, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, var(--brand), var(--violet))", color: "#fff", boxShadow: "0 10px 26px rgba(43,75,223,0.35)" }}>
            <Pill size={27} />
          </motion.span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Medicines & reminders</h2>
          <p style={{ color: "var(--body)", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Sign in to add your medicines, track doses and get email reminders — never miss a dose again.
          </p>
          <Link href="/login?next=/medicines" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", display: "inline-flex", padding: "12px 20px", fontSize: 14.5 }}>
            Sign in to continue <ArrowRight size={16} />
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", paddingTop: 96, paddingBottom: 80 }}>
      <Navbar variant="app" />

      {/* ── Login reminder popup ── */}
      <AnimatePresence>
        {popupDose && (
          <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.35, ease: EASE }}
            style={{ position: "fixed", top: 78, left: "50%", transform: "translateX(-50%)", zIndex: 90, width: "min(440px, calc(100vw - 32px))" }}>
            <div className="panel" style={{ padding: "16px 18px", borderRadius: 18, border: "1px solid rgba(245,165,36,0.5)", background: "var(--surface)", boxShadow: "0 14px 38px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                <span style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,165,36,0.14)", color: "#b45309" }}>
                  <AlertCircle size={19} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, fontFamily: "var(--font-display)" }}>Dose time — {popupDose.slot}</p>
                  <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.55 }}>
                    {popupDose.name}{popupDose.dose ? ` (${popupDose.dose})` : ""} is due. Mark it once taken.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button disabled={medBusy} onClick={async () => { await markDose(popupDose.medicine_id, popupDose.day, popupDose.slot, "taken"); dismissPopup(popupDose); }}
                      className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12.5 }}>✓ Taken</button>
                    <button disabled={medBusy} onClick={async () => { await markDose(popupDose.medicine_id, popupDose.day, popupDose.slot, "missed"); dismissPopup(popupDose); }}
                      style={{ padding: "7px 14px", fontSize: 12.5, borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>Missed</button>
                    <button onClick={() => dismissPopup(popupDose)}
                      style={{ padding: "7px 10px", fontSize: 12.5, borderRadius: 10, border: "none", background: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>Later</button>
                  </div>
                </div>
                <button onClick={() => dismissPopup(popupDose)} title="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}>
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }} transition={{ duration: 0.3 }}
            style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 90 }}>
            <div className="panel" style={{ padding: "11px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: "var(--ink)", color: "var(--bg)", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
        <SectionHeading
          eyebrow="Medicines"
          title="Never Miss a Dose"
          sub="Apni dawaiyan add karein — app me aaj ka schedule, streak aur adherence track hota hai, aur dose ka reminder email par aata hai."
        />
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "26px 20px 0" }}>
        <Reveal type="fade-up">
          <div className="panel" style={{ padding: 22, borderRadius: 20 }}>
            {/* header row: email toggle + due badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Pill size={17} style={{ color: "var(--violet)" }} />
                <p style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: 16 }}>Your schedule</p>
                {pendingNow > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: "rgba(245,165,36,0.15)", color: "#b45309" }}>
                    <Clock size={11} /> {pendingNow} due now
                  </span>
                )}
              </div>
              <button onClick={() => saveEmailSettings(!emailRem)}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  padding: "8px 14px", borderRadius: 999, border: "1px solid var(--border)",
                  background: emailRem ? "var(--violet-soft)" : "var(--surface)", color: emailRem ? "var(--brand-deep)" : "var(--muted)" }}>
                {emailRem ? <Bell size={13} /> : <BellOff size={13} />} Email reminders {emailRem ? "ON" : "OFF"}
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
              Har dose ka reminder dose se pehle email par aayega{remEmail ? ` (${remEmail})` : ""} — assistant se bhi pooch sakte hain: "metformin kab leni hai?"
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
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="Medicine (e.g. Metformin)" style={{ flex: "1 1 150px", ...inputStyle }} />
              <input value={medDose} onChange={(e) => setMedDose(e.target.value)} placeholder="Dose (e.g. 500mg)" style={{ flex: "0 1 130px", ...inputStyle }} />
              <input value={medTimes} onChange={(e) => setMedTimes(e.target.value)} placeholder="Times (09:00, 21:00)" style={{ flex: "1 1 170px", ...inputStyle }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              <input value={medEmail} onChange={(e) => setMedEmail(e.target.value)} placeholder="Reminder email for this medicine (optional)" style={{ flex: "1 1 260px", ...inputStyle }} />
              <button onClick={addMed} disabled={medBusy || !medName.trim()} className="btn btn-primary"
                style={{ padding: "10px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, opacity: medBusy || !medName.trim() ? 0.6 : 1 }}>
                <Plus size={14} /> Add medicine
              </button>
            </div>

            {/* reminder email override */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
              <input value={remEmail} onChange={(e) => setRemEmail(e.target.value)} placeholder="Default reminder email (khaali = account email)" style={{ flex: "1 1 240px", ...inputStyle }} />
              <button onClick={() => saveEmailSettings(emailRem)} disabled={medBusy}
                style={{ padding: "10px 16px", fontSize: 13, borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--ink)", cursor: "pointer", fontWeight: 700 }}>
                Save
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
                    <div key={d.day} title={`${d.day}: ${pct == null ? "no doses" : `${pct}% taken`}`} style={{ textAlign: "center" }}>
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
                      <p style={{ fontSize: 12, color: "var(--muted)" }}>{m.times.join(", ")}{m.recipient_email ? ` · 📧 ${m.recipient_email}` : ""}</p>
                    </div>
                    <button onClick={() => stopMed(m.id, m.name)} title="Stop medicine" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </section>
    </main>
  );
}
