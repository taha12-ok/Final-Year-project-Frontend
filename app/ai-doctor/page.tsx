"use client";
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Stethoscope, Bone, Brain, Droplets, Check, AlertTriangle, Bot,
  RefreshCw, Search, FlaskConical, Pill, Siren, UserRound,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Field from "@/components/Field";
import { EASE } from "@/components/Reveal";

// Model mapping — AI response se detect karo
const MODEL_MAP: { keywords: string[]; href: string; label: string; icon: ReactNode }[] = [
  { keywords: ["fracture", "bone", "x-ray", "orthopedic"], href: "/analyze/fracture", label: "Fracture Detection", icon: <Bone size={16} /> },
  { keywords: ["brain", "tumor", "mri", "glioma", "meningioma", "pituitary"], href: "/analyze/brain", label: "Brain Tumor", icon: <Brain size={16} /> },
  { keywords: ["kidney", "ct scan", "cyst", "stone", "renal"], href: "/analyze/kidney", label: "Kidney Disease", icon: <Droplets size={16} /> },
];

function detectModel(aiResponse: string) {
  const lower = aiResponse.toLowerCase();
  for (const m of MODEL_MAP) {
    if (m.keywords.some(k => lower.includes(k))) return m;
  }
  return MODEL_MAP[0]; // default fracture
}

const STEPS = [{ n: 1, label: "Patient Info" }, { n: 2, label: "Symptoms" }, { n: 3, label: "AI Analysis" }];

// Heading text ke keywords se matching icon nikalne wala helper
function headingIcon(headingText: string) {
  const t = headingText.toLowerCase();
  if (t.includes("initial assessment")) return <Search size={18} />;
  if (t.includes("possible conditions")) return <AlertTriangle size={18} />;
  if (t.includes("recommended tests") || t.includes("scans")) return <FlaskConical size={18} />;
  if (t.includes("screening model")) return <Bot size={18} />;
  if (t.includes("immediate recommendations")) return <Pill size={18} />;
  if (t.includes("urgency")) return <Siren size={18} />;
  if (t.includes("specialist")) return <UserRound size={18} />;
  if (t.includes("setup required") || t.includes("api error") || t.includes("system error") || t.includes("no response") || t.includes("note")) return <AlertTriangle size={18} />;
  return null;
}

export default function AIDoctorPage() {
  const [form, setForm] = useState({
    name: "", age: "", gender: "",
    history: "", symptoms: "",
    duration: "", severity: "Moderate",
  });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [suggestedModel, setSuggestedModel] = useState(MODEL_MAP[0]);

  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.symptoms) {
      alert("Please fill Name, Age and Symptoms!");
      return;
    }
    setLoading(true);
    setResult(null);
    setStep(2);
    const res = await fetch("/api/ai-doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setResult(data.response);
    setSuggestedModel(detectModel(data.response || ""));
    setLoading(false);
    setStep(3);
  };

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "clip", background: "var(--bg)" }}>
      {/* Ambient background */}
      <div className="mesh-bg" />
      <div className="orb orb-drift" style={{ width: 420, height: 420, top: "-10%", right: "-6%", background: "rgba(43,75,223,0.12)" }} />
      <div className="orb orb-drift-alt" style={{ width: 360, height: 360, bottom: "-6%", left: "-4%", background: "rgba(20,184,166,0.1)" }} />

      <Navbar variant="app" right={
        <span className="chip chip-violet" style={{ fontSize: 13, padding: "8px 14px" }}>
          <Stethoscope size={14} /> AI Health Assistant
        </span>
      } />

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
        style={{ padding: "150px 24px 52px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "inline-flex", justifyContent: "center", color: "var(--brand)" }}><Stethoscope size={52} strokeWidth={1.5} /></motion.span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 4.6vw, 54px)", fontWeight: 700, letterSpacing: "-0.03em", marginTop: 10 }}>
          AI Health <span className="gradient-text">Assistant</span>
        </h1>
        <p style={{ color: "var(--body)", fontSize: 16.5, maxWidth: 620, margin: "14px auto 0", lineHeight: 1.75 }}>
          Describe your symptoms and medical history — the AI will suggest possible conditions,
          tests, and the right specialist. A screening aid, never a diagnosis.
        </p>

        {/* Stepper */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 38, alignItems: "center", flexWrap: "wrap" }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <motion.div
                animate={step >= s.n ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 0.4 }}
                style={{
                  width: 38, height: 38, borderRadius: 13, fontFamily: "var(--font-display)",
                  background: step >= s.n ? "linear-gradient(135deg, var(--brand), var(--violet))" : "var(--surface)",
                  border: step >= s.n ? "none" : "1px solid var(--border-strong)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14, color: step >= s.n ? "#fff" : "var(--muted)",
                  boxShadow: step >= s.n ? "var(--shadow-brand)" : "var(--shadow-xs)",
                  transition: "all 0.35s var(--ease)",
                }}>{step > s.n ? <Check size={16} strokeWidth={3} /> : s.n}</motion.div>
              <span style={{ color: step >= s.n ? "var(--ink)" : "var(--muted)", fontSize: 13, fontWeight: 600 }}>{s.label}</span>
              {i < 2 && <div style={{ width: 36, height: 2, borderRadius: 2, background: step > s.n ? "linear-gradient(90deg, var(--brand), var(--violet))" : "rgba(43,75,223,0.14)", transition: "all 0.35s var(--ease)" }} />}
            </div>
          ))}
        </div>
      </motion.div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px 90px", position: "relative", zIndex: 1 }}>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
          className="panel" style={{ padding: "clamp(24px, 4vw, 40px)", marginBottom: 24 }}>

          <p className="eyebrow" style={{ marginBottom: 18 }}>Patient information</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
            <Field label="Full name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Age *" type="number" value={form.age} onChange={(v) => setForm({ ...form, age: v })} />
            <Field label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })}
              options={[{ value: "", label: "Select" }, { value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }]} />
          </div>

          <p className="eyebrow" style={{ marginBottom: 18 }}>Medical history</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
            <Field label="Past medical history" textarea rows={2} value={form.history} onChange={(v) => setForm({ ...form, history: v })} />
            <Field label="Current symptoms *" textarea rows={3} value={form.symptoms} onChange={(v) => setForm({ ...form, symptoms: v })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 30 }} className="split-grid">
            <Field label="Duration of symptoms" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} />
            <Field label="Severity" value={form.severity} onChange={(v) => setForm({ ...form, severity: v })}
              options={[
                { value: "Mild", label: "Mild" }, { value: "Moderate", label: "Moderate" },
                { value: "Severe", label: "Severe" }, { value: "Critical", label: "Critical" },
              ]} />
          </div>

          <motion.button onClick={handleSubmit} disabled={loading}
            whileHover={loading ? {} : { scale: 1.012 }} whileTap={loading ? {} : { scale: 0.985 }}
            className="btn"
            style={{
              width: "100%", padding: "16px", fontSize: 16,
              ...(loading
                ? { background: "var(--bg-alt)", color: "var(--muted)", cursor: "not-allowed" }
                : { background: "linear-gradient(135deg, var(--brand), var(--violet) 130%)", color: "#fff", boxShadow: "var(--shadow-brand)" }),
            }}>
            {loading ? (<><span className="btn-spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#fff" }} /> Analyzing…</>) : (<><Stethoscope size={17} /> Get AI Health Assessment</>)}
          </motion.button>
        </motion.div>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}
              className="panel scan-sweep" style={{ textAlign: "center", padding: 40 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                style={{ marginBottom: 14, display: "inline-flex", justifyContent: "center", color: "var(--brand)" }}><Stethoscope size={42} strokeWidth={1.5} /></motion.div>
              <p className="gradient-text" style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>AI Health Assistant is analyzing…</p>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Reviewing patient history and symptoms</p>
              <div style={{ maxWidth: 380, margin: "22px auto 0", display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="skeleton" style={{ height: 14, width: "90%", margin: "0 auto" }} />
                <div className="skeleton" style={{ height: 14, width: "70%", margin: "0 auto" }} />
                <div className="skeleton" style={{ height: 14, width: "80%", margin: "0 auto" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 22 }}>
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }}
                    style={{ width: 10, height: 10, borderRadius: "50%", background: "linear-gradient(135deg, var(--brand), var(--violet))" }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 34, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="panel" style={{ overflow: "hidden" }}>

              <div style={{
                background: "linear-gradient(120deg, var(--brand-soft), var(--violet-soft) 60%, var(--teal-soft))",
                padding: "26px 32px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
              }}>
                <span style={{ width: 52, height: 52, borderRadius: 16, background: "var(--surface)", border: "1px solid rgba(43,75,223,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", boxShadow: "var(--shadow-xs)" }}><Stethoscope size={26} /></span>
                <div>
                  <h2 className="gradient-text" style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em" }}>AI Health Assessment</h2>
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>Patient: {form.name} · Age: {form.age} · {form.gender}</p>
                </div>
              </div>

              <div style={{ padding: "clamp(22px, 3vw, 34px)" }}>
                <div style={{ fontSize: 14.5, lineHeight: 1.9, color: "var(--body)", whiteSpace: "pre-wrap" }}>
                  {result.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      const headingText = line.replace('## ', '');
                      const icon = headingIcon(headingText);
                      return <h3 key={i} className="gradient-text" style={{ fontFamily: "var(--font-display)", fontSize: 18.5, fontWeight: 700, margin: "26px 0 10px", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                        {icon}{headingText}
                      </h3>;
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <div key={i} style={{ display: "flex", gap: 9, marginBottom: 6, paddingLeft: 8 }}>
                        <span style={{ color: "var(--brand)", marginTop: 2, fontWeight: 700 }}>▸</span>
                        <span>{line.replace(/^[-*] /, '')}</span>
                      </div>;
                    }
                    if (line.includes('LOW') || line.includes('MEDIUM') || line.includes('HIGH')) {
                      const isHigh = line.includes('HIGH');
                      const color = isHigh ? 'var(--alert)' : line.includes('MEDIUM') ? 'var(--violet)' : 'var(--teal-deep)';
                      return <p key={i} style={{ color, fontWeight: 700, fontSize: 16.5, margin: "10px 0", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: 8 }}>
                        {isHigh && <Siren size={17} />}{line}
                      </p>;
                    }
                    if (line.startsWith('---')) return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "22px 0" }} />;
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} style={{ marginBottom: 6 }}>{line}</p>;
                  })}
                </div>

                {/* Smart model recommendation */}
                <div style={{ marginTop: 32, padding: 22, background: "var(--surface-tint)", border: "1px solid var(--border)", borderRadius: 18 }}>
                  <p style={{ color: "var(--body)", fontSize: 13.5, marginBottom: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Bot size={16} /> AI recommended model for your condition:</p>
                  <Link href={suggestedModel.href}>
                    <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="btn btn-primary" style={{ fontSize: 14.5, display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {suggestedModel.icon} {suggestedModel.label} — Use AI Detection
                    </motion.button>
                  </Link>
                  <p style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 16 }}>Or choose another model:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {MODEL_MAP.filter((m) => m.href !== suggestedModel.href).map((m) => (
                      <Link key={m.href} href={m.href}>
                        <motion.button whileHover={{ scale: 1.04, y: -1 }}
                          style={{ padding: "8px 14px", borderRadius: 100, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--body)", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "border-color 0.2s var(--ease)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {m.icon} {m.label}
                        </motion.button>
                      </Link>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setResult(null); setStep(1); setForm({ name: "", age: "", gender: "", history: "", symptoms: "", duration: "", severity: "Moderate" }); }}
                    className="btn btn-secondary" style={{ fontSize: 13.5 }}>
                    <RefreshCw size={14} /> New Assessment
                  </motion.button>
                </div>

                <div style={{ marginTop: 22, padding: 16, background: "var(--violet-soft)", border: "1px solid rgba(124,92,252,0.28)", borderRadius: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <AlertTriangle size={16} style={{ color: "#5B3FE4", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ color: "#5B3FE4", fontSize: 12.5, lineHeight: 1.65 }}>
                    <strong>Medical Disclaimer:</strong> This is an AI-assisted screening tool for educational purposes only. It does NOT provide a medical diagnosis. Always consult a qualified doctor for proper diagnosis and treatment — especially for high-urgency or worsening symptoms.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}