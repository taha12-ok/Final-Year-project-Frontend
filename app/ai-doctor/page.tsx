"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Stethoscope } from "lucide-react";
import GradientOrb from "@/components/GradientOrb";
import ParticlesBackground from "@/components/ParticlesBackground";

// Model mapping — AI response se detect karo
const MODEL_MAP: { keywords: string[]; href: string; label: string }[] = [
  { keywords: ["fracture", "bone", "x-ray", "orthopedic"], href: "/analyze/fracture", label: "🦴 Fracture Detection" },
  { keywords: ["brain", "tumor", "mri", "glioma", "meningioma", "pituitary"], href: "/analyze/brain", label: "🧠 Brain Tumor" },
  { keywords: ["kidney", "ct scan", "cyst", "stone", "renal"], href: "/analyze/kidney", label: "🫘 Kidney Disease" },
];

function detectModel(aiResponse: string) {
  const lower = aiResponse.toLowerCase();
  for (const m of MODEL_MAP) {
    if (m.keywords.some(k => lower.includes(k))) return m;
  }
  return MODEL_MAP[0]; // default fracture
}

// Shared dark-theme input style
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(47,143,255,0.18)",
  borderRadius: 12,
  padding: "12px 16px",
  color: "var(--text-primary)",
  outline: "none",
  fontSize: 14,
};
const labelStyle: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 13, display: "block", marginBottom: 8 };

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
    <main className="hero-bg bg-grid" style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <ParticlesBackground />
      <GradientOrb color="rgba(47,143,255,0.32)" size={420} top="-8%" right="0%" duration={11} />
      <GradientOrb color="rgba(34,201,166,0.26)" size={360} bottom="0%" left="5%" duration={9} delay={2} />
      <GradientOrb color="rgba(255,176,56,0.22)" size={320} top="30%" left="60%" duration={13} delay={1} />

      {/* Navbar (glass pill, same as homepage) */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ display: "flex", justifyContent: "center", padding: "20px 16px" }}>
        <nav className="navbar-pill navbar-pill-scrolled" style={{ width: "100%", maxWidth: 1140, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px" }}>
          <Link href="/" style={{ color: "var(--gold-light)", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            <ArrowLeft size={18} /> Back to MedAI
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gold-light)", fontWeight: 700, fontSize: 15 }}>
            <Stethoscope size={18} /> AI Health Assistant
          </div>
        </nav>
      </div>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        style={{ padding: "160px 32px 60px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🩺</div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 12, color: "var(--text-primary)" }}>
          AI Health <span className="gold-text">Assistant</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 18, maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
          Describe your symptoms and medical history — our AI will suggest possible conditions, tests, and the right specialist. This is a screening aid, not a diagnosis.
        </p>

        {/* Steps indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 36, alignItems: "center" }}>
          {[{ n: 1, label: "Patient Info" }, { n: 2, label: "Symptoms" }, { n: 3, label: "AI Analysis" }].map((s, i) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: step >= s.n ? "linear-gradient(135deg, var(--gold-dark), var(--gold))" : "rgba(47,143,255,0.08)",
                border: step >= s.n ? "none" : "1px solid rgba(47,143,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 14, color: step >= s.n ? "white" : "var(--text-muted)",
                boxShadow: step >= s.n ? "0 0 20px rgba(47,143,255,0.35)" : "none",
                transition: "all 0.3s ease",
              }}>{s.n}</div>
              <span style={{ color: step >= s.n ? "var(--gold-light)" : "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>{s.label}</span>
              {i < 2 && <div style={{ width: 40, height: 1, background: step > s.n ? "rgba(47,143,255,0.4)" : "rgba(47,143,255,0.12)" }} />}
            </div>
          ))}
        </div>
      </motion.div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px", position: "relative", zIndex: 1 }}>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ padding: 40, marginBottom: 24 }}>

          <h2 className="gold-text" style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>👤 Patient Information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }} className="hero-grid">
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input type="text" placeholder="Patient name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Age *</label>
              <input type="number" placeholder="Age" value={form.age}
                onChange={e => setForm({ ...form, age: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} style={inputStyle}>
                <option value="" style={{ background: "var(--dark2)" }}>Select</option>
                <option value="Male" style={{ background: "var(--dark2)" }}>Male</option>
                <option value="Female" style={{ background: "var(--dark2)" }}>Female</option>
                <option value="Other" style={{ background: "var(--dark2)" }}>Other</option>
              </select>
            </div>
          </div>

          <h2 className="gold-text" style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>🏥 Medical History</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Past Medical History</label>
            <textarea placeholder="e.g. Diabetes, hypertension, prior surgeries, allergies…" value={form.history}
              onChange={e => setForm({ ...form, history: e.target.value })}
              rows={2} style={{ ...inputStyle, resize: "vertical" as const }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Current Symptoms *</label>
            <textarea placeholder="Describe what you're experiencing…" value={form.symptoms}
              onChange={e => setForm({ ...form, symptoms: e.target.value })}
              rows={3} style={{ ...inputStyle, resize: "vertical" as const }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }} className="hero-grid">
            <div>
              <label style={labelStyle}>Duration of Symptoms</label>
              <input type="text" placeholder="e.g. 3 days, 1 week, 2 months" value={form.duration}
                onChange={e => setForm({ ...form, duration: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} style={inputStyle}>
                <option value="Mild" style={{ background: "var(--dark2)" }}>Mild</option>
                <option value="Moderate" style={{ background: "var(--dark2)" }}>Moderate</option>
                <option value="Severe" style={{ background: "var(--dark2)" }}>Severe</option>
                <option value="Critical" style={{ background: "var(--dark2)" }}>Critical</option>
              </select>
            </div>
          </div>

          <motion.button onClick={handleSubmit} disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
            className={loading ? "" : "btn-gold"}
            style={{
              width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "rgba(255,255,255,0.06)" : undefined,
              color: loading ? "var(--text-muted)" : "#fff", fontWeight: 700, fontSize: 17, letterSpacing: 0.3,
            }}>
            {loading ? "⏳ AI Health Assistant is Analyzing..." : "🩺 Get AI Health Assessment"}
          </motion.button>
        </motion.div>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="card scan-sweep" style={{ textAlign: "center", padding: "40px" }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ fontSize: 44, marginBottom: 16, display: "inline-block" }}>⚕️</motion.div>
              <p className="gold-text" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>AI Health Assistant is Analyzing...</p>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Reviewing patient history and symptoms</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }}
                    style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gold)" }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              className="card" style={{ overflow: "hidden" }}>

              <div style={{
                background: "linear-gradient(135deg, rgba(47,143,255,0.14), rgba(34,201,166,0.08))",
                padding: "24px 32px", borderBottom: "1px solid rgba(47,143,255,0.16)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ fontSize: 32 }}>🩺</div>
                <div>
                  <h2 className="gold-text" style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Health Assessment</h2>
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Patient: {form.name} | Age: {form.age} | {form.gender}</p>
                </div>
              </div>

              <div style={{ padding: "32px" }}>
                <div style={{ fontSize: 14, lineHeight: 1.9, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                  {result.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return <h3 key={i} className="gold-text" style={{ fontSize: 18, fontWeight: 700, margin: "24px 0 10px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{line.replace('## ', '')}</h3>;
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, paddingLeft: 8 }}>
                        <span style={{ color: "var(--gold)", marginTop: 2 }}>▸</span>
                        <span>{line.replace(/^[-*] /, '')}</span>
                      </div>;
                    }
                    if (line.includes('LOW') || line.includes('MEDIUM') || line.includes('HIGH')) {
                      const color = line.includes('HIGH') ? '#F87171' : line.includes('MEDIUM') ? 'var(--indigo)' : 'var(--red-light)';
                      return <p key={i} style={{ color, fontWeight: 700, fontSize: 16, margin: "8px 0" }}>{line}</p>;
                    }
                    if (line.startsWith('---')) return <hr key={i} style={{ border: "none", borderTop: "1px solid rgba(47,143,255,0.16)", margin: "20px 0" }} />;
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} style={{ marginBottom: 6 }}>{line}</p>;
                  })}
                </div>

                {/* Smart Model Button */}
                <div style={{ marginTop: 32, padding: 20, background: "rgba(47,143,255,0.06)", border: "1px solid rgba(47,143,255,0.18)", borderRadius: 16 }}>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>🤖 AI Recommended Model for your condition:</p>
                  <Link href={suggestedModel.href}>
                    <motion.button whileHover={{ scale: 1.03 }} className="btn-gold" style={{ fontSize: 15 }}>
                      {suggestedModel.label} — Use AI Detection
                    </motion.button>
                  </Link>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 14 }}>Or choose another model:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {MODEL_MAP.filter(m => m.href !== suggestedModel.href).map(m => (
                      <Link key={m.href} href={m.href}>
                        <motion.button whileHover={{ scale: 1.05 }}
                          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(47,143,255,0.22)", background: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>
                          {m.label}
                        </motion.button>
                      </Link>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                  <motion.button whileHover={{ scale: 1.03 }}
                    onClick={() => { setResult(null); setStep(1); setForm({ name: "", age: "", gender: "", history: "", symptoms: "", duration: "", severity: "Moderate" }); }}
                    className="btn-outline-gold" style={{ fontSize: 14 }}>
                    🔄 New Assessment
                  </motion.button>
                </div>

                <div style={{ marginTop: 20, padding: "16px", background: "rgba(255,176,56,0.06)", border: "1px solid rgba(255,176,56,0.25)", borderRadius: 12 }}>
                  <p style={{ color: "var(--indigo)", fontSize: 12, lineHeight: 1.6 }}>
                    ⚠️ <strong>Medical Disclaimer:</strong> This is an AI-assisted screening tool for educational purposes only. It does NOT provide a medical diagnosis. Always consult a qualified doctor for proper diagnosis and treatment — especially for high-urgency or worsening symptoms.
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
