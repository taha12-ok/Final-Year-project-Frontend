"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STAGES = [
  "Uploading Image",
  "Preprocessing",
  "Running AI Model",
  "Generating Grad-CAM",
  "Preparing Result",
];

/**
 * Shows a glass-framed scanning animation with rotating stage labels while
 * a real request is in flight. The stage index is cosmetic — it does not
 * know when the backend actually finishes each step, it just cycles for
 * as long as the parent keeps this component mounted.
 */
export default function ScanAnimation({ image }: { image?: string | null }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "24px 12px" }}>
      <div
        className="glass-surface scan-sweep"
        style={{
          width: 160, height: 160, margin: "0 auto 20px",
          borderRadius: 20, position: "relative", overflow: "hidden",
        }}
      >
        {image ? (
          <img src={image} alt="Analyzing" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🩻</div>
        )}

        {/* Rotating processing ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: 6, borderRadius: 16,
            border: "2px solid transparent",
            borderTopColor: "var(--gold)",
            borderRightColor: "rgba(6,182,212,0.6)",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={stage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{ fontWeight: 700, fontSize: 15, color: "var(--gold)", marginBottom: 4 }}
        >
          {STAGES[stage]}
        </motion.p>
      </AnimatePresence>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>AI is analyzing the scan…</p>

      {/* Stage dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {STAGES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === stage ? 18 : 6,
              height: 6,
              borderRadius: 4,
              background: i <= stage ? "var(--gold)" : "rgba(37,99,235,0.18)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
