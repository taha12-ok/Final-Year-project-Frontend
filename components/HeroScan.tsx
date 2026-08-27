"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { EASE } from "@/components/Reveal";
import { Sparkles, ScanEye, Cpu, Brain } from "lucide-react";

/**
 * Hero showcase: a live "screening session" window — animated scan ring,
 * animated confidence bars and floating feature chips — presented over the
 * gradient mesh. Purely presentational.
 */
export default function HeroScan() {
  // ── Scroll-linked expand only (no blur) — active only for the first ~520px
  // of page scroll (i.e. while the hero section is in view). It settles at
  // its final state and stays put for the rest of the page. ──
  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 520], [0.82, 1]);

  return (
    <motion.div style={{ position: "relative", maxWidth: 520, margin: "0 auto", scale: heroScale, transformOrigin: "center center" }}>
      {/* Main window */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
        className="panel"
        style={{ padding: 0, overflow: "hidden", boxShadow: "var(--shadow-lg)", position: "relative", zIndex: 2 }}
      >
        {/* Chrome bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-tint)" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFC4C6" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFE0A3" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#B5EAD7" }} />
          <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            MedAI · Live screening
          </span>
          <span className="chip chip-teal" style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 11 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", animation: "pulseRing 2s infinite" }} />
            Online
          </span>
        </div>

        <div style={{ padding: "26px 26px 30px", background: "linear-gradient(160deg, var(--surface) 30%, rgba(237,241,254,0.7))" }}>
          <div style={{ display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            {/* Scan ring */}
            <div style={{ position: "relative", width: 148, height: 148, flexShrink: 0 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "conic-gradient(from 0deg, var(--brand), var(--violet), var(--teal), var(--brand))",
                  WebkitMask: "radial-gradient(circle, transparent 61%, black 63%)",
                  mask: "radial-gradient(circle, transparent 61%, black 63%)",
                }}
              />
              <div style={{
                position: "absolute", inset: 10, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--brand-soft), var(--violet-soft))",
                border: "1px solid rgba(43,75,223,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)",
              }}>
                <Brain size={52} strokeWidth={1.5} />
              </div>
              <motion.div
                animate={{ scale: [1, 1.14, 1], opacity: [0.5, 0.12, 0.5] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "1.5px solid rgba(43,75,223,0.35)" }}
              />
            </div>

            {/* Metrics */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {[
                { label: "Screening confidence", value: "94.8%", width: "94%", grad: "linear-gradient(90deg, var(--brand), var(--violet))" },
                { label: "Region match (Grad-CAM)", value: "91.2%", width: "91%", grad: "linear-gradient(90deg, var(--violet), var(--teal))" },
                { label: "Image quality score", value: "88.4%", width: "88%", grad: "linear-gradient(90deg, var(--teal), var(--brand))" },
              ].map((m, i) => (
                <div key={m.label} style={{ marginBottom: i < 2 ? 16 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                    <span style={{ color: "var(--muted)", fontWeight: 500 }}>{m.label}</span>
                    <span style={{ color: "var(--ink)", fontWeight: 700, fontFamily: "var(--font-display)" }}>{m.value}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 6, background: "var(--bg-alt)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: m.width }}
                      transition={{ duration: 1.2, delay: 1 + i * 0.18, ease: EASE }}
                      style={{ height: "100%", borderRadius: 6, background: m.grad }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer strip */}
          <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
            <span className="chip"><ScanEye size={13} /> Grad-CAM explainability</span>
            <span className="chip chip-violet"><Cpu size={13} /> 3 specialized models</span>
            <span className="chip chip-teal"><Sparkles size={13} /> PDF reports</span>
          </div>
        </div>
      </motion.div>

      {/* Floating chip — top right */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1, ease: EASE }}
        style={{ position: "absolute", top: -22, right: -14, zIndex: 3 }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          className="panel"
          style={{ padding: "10px 16px", borderRadius: 14, display: "flex", alignItems: "center", gap: 9, boxShadow: "var(--shadow-md)" }}
        >
          <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--teal-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={15} style={{ color: "var(--teal-deep)" }} />
          </span>
          <div>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>Result in &lt;3s</p>
            <p style={{ fontSize: 11, color: "var(--muted)" }}>GPU-accelerated inference</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating chip — bottom left */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.3, ease: EASE }}
        style={{ position: "absolute", bottom: -18, left: -18, zIndex: 3 }}
      >
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="panel"
          style={{ padding: "10px 16px", borderRadius: 14, display: "flex", alignItems: "center", gap: 9, boxShadow: "var(--shadow-md)" }}
        >
          <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--brand-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ScanEye size={15} style={{ color: "var(--brand)" }} />
          </span>
          <div>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>Show, don't guess</p>
            <p style={{ fontSize: 11, color: "var(--muted)" }}>Grad-CAM heatmaps on every result</p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}