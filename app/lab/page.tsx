"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FlaskConical, Bone, Brain, Droplets, RefreshCw, CheckCircle2, AlertTriangle,
  ArrowRight, Gauge, ScanEye, ShieldCheck, Layers,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { EASE } from "@/components/Reveal";

// Hardcoded (env var override band) — Back4App free URL har redeploy pe badalta
// deployed URL; update this one line when the backend URL changes.
const BACKEND_URL = "https://fypbackend-opeptu10.b4a.run";

interface Metrics {
  available?: boolean;
  model?: string;
  architecture?: string;
  accuracy?: number;
  test_accuracy?: number;
  best_val_accuracy?: number;
  macro_f1?: number;
  per_class_f1?: Record<string, number>;
  confusion_matrix?: number[][];
  classes?: string[];
  temperature?: number;
  epochs_run?: number;
  note?: string;
}

const MODELS: { key: string; label: string; scan: string; icon: JSX.Element; accent: string }[] = [
  { key: "fracture", label: "Fracture Detection", scan: "X-ray",  icon: <Bone size={20} />,     accent: "var(--violet)" },
  { key: "brain",    label: "Brain Tumor",        scan: "Brain MRI", icon: <Brain size={20} />, accent: "var(--brand)" },
  { key: "kidney",   label: "Kidney Disease",     scan: "CT Scan",   icon: <Droplets size={20} />, accent: "var(--teal)" },
];

const TARGETS: Record<string, number> = { fracture: 0.9, brain: 0.95, kidney: 0.9 };

function ConfusionMatrix({ cm, classes, accent }: { cm: number[][]; classes: string[]; accent: string }) {
  const max = Math.max(...cm.flat(), 1);
  return (
    <div style={{ display: "inline-block" }}>
      <div style={{ display: "grid", gridTemplateColumns: `auto repeat(${classes.length}, 56px)`, gap: 3 }}>
        <div />
        {classes.map((c) => (
          <div key={c} style={{ fontSize: 8.5, textAlign: "center", color: "var(--muted)", fontWeight: 700, padding: "2px 0" }}>
            {c.length > 9 ? c.slice(0, 9) : c}
          </div>
        ))}
        {cm.map((row, i) => (
          <>
            <div key={`l-${i}`} style={{ fontSize: 8.5, color: "var(--muted)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6, maxWidth: 74, whiteSpace: "nowrap", overflow: "hidden" }}>
              {classes[i]}
            </div>
            {row.map((v, j) => {
              const intensity = v / max;
              const isDiag = i === j;
              return (
                <motion.div key={`${i}-${j}`}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + (i * classes.length + j) * 0.03, duration: 0.25 }}
                  title={`${classes[i]} → ${classes[j]}: ${v}`}
                  style={{
                    height: 42, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11.5, fontWeight: 700,
                    background: isDiag
                      ? `color-mix(in srgb, ${accent} ${Math.round(15 + intensity * 75)}%, var(--surface))`
                      : `color-mix(in srgb, var(--alert) ${Math.round(intensity * 55)}%, var(--surface))`,
                    color: intensity > 0.45 ? "#fff" : "var(--body)",
                    border: `1px solid ${isDiag ? "transparent" : "rgba(229,72,77,0.25)"}`,
                  }}>
                  {v}
                </motion.div>
              );
            })}
          </>
        ))}
      </div>
      <p style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
        Rows = actual · Columns = predicted · <span style={{ color: "var(--brand)" }}>diagonal = correct predictions</span>
      </p>
    </div>
  );
}

function ModelCard({ m, metrics, delay }: { m: (typeof MODELS)[0]; metrics: Metrics | null; delay: number }) {
  const target = TARGETS[m.key];
  const acc = metrics?.test_accuracy ?? metrics?.accuracy;
  const pass = acc != null && acc >= target;

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay, ease: EASE }}
      className="panel" style={{ padding: "24px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ width: 42, height: 42, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${m.accent} 12%, var(--surface))`, color: m.accent, border: `1px solid color-mix(in srgb, ${m.accent} 25%, transparent)` }}>
            {m.icon}
          </span>
          <div>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16.5, color: "var(--ink)" }}>{m.label}</p>
            <p style={{ fontSize: 11.5, color: "var(--muted)" }}>{m.scan} · ResNet50 · calibrated</p>
          </div>
        </div>
        {acc == null ? (
          <span className="chip" style={{ fontSize: 11, background: "var(--bg-alt)", color: "var(--muted)", borderColor: "var(--border)" }}>
            Metrics pending
          </span>
        ) : pass ? (
          <span className="chip chip-teal" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={12} /> PASS ≥ {Math.round(target * 100)}%
          </span>
        ) : (
          <span className="chip" style={{ fontSize: 11, color: "var(--alert)", borderColor: "var(--alert)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={12} /> Below target
          </span>
        )}
      </div>

      {acc == null ? (
        <div style={{ padding: "26px 10px", textAlign: "center", color: "var(--muted)", fontSize: 12.5, lineHeight: 1.7, background: "var(--surface-tint)", borderRadius: 14, border: "1px dashed var(--border-strong)" }}>
          Retraining metrics abhi deploy nahi hui.<br />
          <span style={{ fontSize: 11.5 }}>
            Run the Kaggle notebook and place <code style={{ background: "var(--bg-alt)", padding: "1px 6px", borderRadius: 6 }}>metrics/{m.key}.json</code> in the backend's <code style={{ background: "var(--bg-alt)", padding: "1px 6px", borderRadius: 6 }}>metrics/</code> folder.
          </span>
        </div>
      ) : (
        <>
          {/* Headline accuracy */}
          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, background: "var(--surface-tint)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px 15px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 4 }}>TEST ACCURACY</p>
              <p className="gradient-text" style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 700 }}>{(acc * 100).toFixed(1)}%</p>
            </div>
            <div style={{ flex: 1, background: "var(--surface-tint)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px 15px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 4 }}>MACRO F1</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 700, color: "var(--ink)" }}>{((metrics?.macro_f1 ?? 0) * 100).toFixed(1)}%</p>
            </div>
            <div style={{ flex: 1, background: "var(--surface-tint)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px 15px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 4 }}>TEMP (T)</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 700, color: "var(--ink)" }}>{metrics?.temperature?.toFixed(2) ?? "—"}</p>
            </div>
          </div>

          {/* Per-class F1 bars */}
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 8 }}>PER-CLASS F1</p>
          <div style={{ marginBottom: 16 }}>
            {metrics?.per_class_f1 && Object.entries(metrics.per_class_f1).map(([cls, f1], i) => (
              <div key={cls} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 12, width: 100, color: "var(--body)", flexShrink: 0 }}>{cls}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg-alt)", overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${f1 * 100}%` }}
                    transition={{ duration: 0.9, delay: delay + 0.2 + i * 0.1, ease: EASE }}
                    style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${m.accent}, color-mix(in srgb, ${m.accent} 55%, white))` }} />
                </div>
                <span style={{ fontSize: 11.5, color: "var(--muted)", width: 44, textAlign: "right" }}>{(f1 * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {/* Confusion matrix */}
          {metrics?.confusion_matrix && metrics?.classes && (
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <ConfusionMatrix cm={metrics.confusion_matrix} classes={metrics.classes} accent={m.accent} />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

export default function LabPage() {
  const [metrics, setMetrics] = useState<Record<string, Metrics | null>>({ fracture: null, brain: null, kidney: null });
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const next: Record<string, Metrics | null> = {};
    let online = false;
    await Promise.all(
      MODELS.map(async (m) => {
        try {
          const res = await fetch(`${BACKEND_URL}/metrics/${m.key}`, { headers: { "ngrok-skip-browser-warning": "true" } });
          if (res.ok) {
            online = true;
            next[m.key] = await res.json();
          } else next[m.key] = null;
        } catch { next[m.key] = null; }
      }),
    );
    setBackendOnline(online);
    setMetrics(next);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "clip", background: "var(--bg)" }}>
      <div className="mesh-bg" />
      <div className="orb orb-drift" style={{ width: 420, height: 420, top: "-10%", left: "-6%", background: "rgba(43,75,223,0.1)" }} />
      <div className="orb orb-drift-alt" style={{ width: 360, height: 360, bottom: "-8%", right: "-4%", background: "rgba(20,184,166,0.09)" }} />

      <Navbar
        variant="app"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="chip chip-violet" style={{ fontSize: 13, padding: "8px 14px" }}>
              <FlaskConical size={14} /> Model Lab
            </span>
            <button onClick={fetchAll} className="btn btn-secondary" style={{ padding: "9px 14px", fontSize: 13 }} disabled={loading}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
        style={{ textAlign: "center", padding: "130px 24px 30px", position: "relative", zIndex: 1 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 700, letterSpacing: "-0.03em" }}>
          Model <span className="gradient-text">Lab</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, marginTop: 8, maxWidth: 560, margin: "8px auto 0" }}>
          Honest evaluation for every model — held-out test accuracy, per-class F1, confusion matrix, and calibration.
        </p>
        {backendOnline === false && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, padding: "9px 16px", background: "rgba(229,72,77,0.08)", border: "1px solid var(--alert)", borderRadius: 100 }}>
            <AlertTriangle size={14} style={{ color: "var(--alert)" }} />
            <span style={{ fontSize: 12.5, color: "var(--alert)", fontWeight: 600 }}>
              Backend offline ({BACKEND_URL}) — open this page with the deployed backend URL
            </span>
          </div>
        )}
      </motion.div>

      {/* Pipeline diagram */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 30px", position: "relative", zIndex: 1 }}>
        <div className="panel" style={{ padding: "22px 24px" }}>
          <p className="eyebrow" style={{ marginBottom: 16 }}>Screening pipeline — kaise chalta hai</p>
          <div style={{ display: "flex", alignItems: "stretch", gap: 8, flexWrap: "wrap" }}>
            {[
              { icon: <Layers size={17} />, t: "1. Upload", d: "Scan image (validated, ≤10 MB)" },
              { icon: <ShieldCheck size={17} />, t: "2. Modality Gate", d: "Scan or random photo? Rejected here" },
              { icon: <ScanEye size={17} />, t: "3. ResNet50", d: "Feature extraction + prediction" },
              { icon: <Gauge size={17} />, t: "4. Calibration", d: "Temperature-scaled confidence" },
              { icon: <FlaskConical size={17} />, t: "5. Grad-CAM", d: "AI ne kahan focus kiya" },
            ].map((s, i) => (
              <div key={s.t} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 150 }}>
                <div style={{ flex: 1, background: "var(--surface-tint)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px 13px", textAlign: "center" }}>
                  <span style={{ display: "inline-flex", color: "var(--brand)", marginBottom: 6 }}>{s.icon}</span>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{s.t}</p>
                  <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{s.d}</p>
                </div>
                {i < 4 && <span style={{ color: "var(--brand)", fontSize: 16, flexShrink: 0 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Model cards */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 90px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 20, position: "relative", zIndex: 1 }} className="split-grid">
        {MODELS.map((m, i) => (
          <ModelCard key={m.key} m={m} metrics={metrics[m.key]} delay={0.15 + i * 0.1} />
        ))}
      </div>

      {/* Footer strip */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "22px 24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 12.5, color: "var(--muted)", position: "relative", zIndex: 1 }}>
        <span>MedAI Platform · Model Lab — honest evaluation, calibrated confidence</span>
        <Link href="/analyze/fracture" style={{ color: "var(--brand)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
          Try a live screening <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  );
}
