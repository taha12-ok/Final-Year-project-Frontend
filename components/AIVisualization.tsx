"use client";
import { motion } from "framer-motion";

const METRICS = [
  { k: "Model", v: "Brain Tumor · ResNet50" },
  { k: "Confidence", v: "94.8%" },
  { k: "Inference time", v: "2.1s" },
];

export default function AIVisualization() {
  return (
    <div
      aria-hidden
      style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}
    >
      <div className="glass-surface" style={{ borderRadius: 18, padding: 8 }}>
        <div style={{ display: "flex", gap: 6, padding: "8px 10px" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
        </div>

        <div
          className="scan-sweep"
          style={{
            position: "relative",
            height: 260,
            borderRadius: 12,
            overflow: "hidden",
            background: "radial-gradient(circle at 50% 45%, var(--dark3), var(--dark1) 72%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Glowing scan ring */}
          <div style={{ position: "relative", width: 120, height: 120 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "3px solid transparent",
                borderTopColor: "var(--gold)",
                borderRightColor: "rgba(34,201,166,0.65)",
                boxShadow: "0 0 40px rgba(47,143,255,0.45)",
              }}
            />
            <motion.div
              animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: 16, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(47,143,255,0.4), transparent 70%)",
              }}
            />
          </div>
        </div>

        <div style={{ padding: "18px 14px 10px" }}>
          {METRICS.map((m, i) => (
            <div
              key={m.k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 4px",
                borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{m.k}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>{m.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}