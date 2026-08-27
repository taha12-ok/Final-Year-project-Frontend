"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine } from "lucide-react";

const STAGES = [
  "Uploading Image",
  "Preprocessing",
  "Running AI Model",
  "Generating Grad-CAM",
  "Preparing Result",
];

/**
 * Branded loading state while a scan request is in flight: the uploaded
 * image framed with a sweep line + rotating ring, cycling stage labels,
 * skeleton rows and stage dots. The stage index is cosmetic — it cycles
 * for as long as the parent keeps this component mounted.
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
    <div style={{ textAlign: "center", padding: "28px 12px" }}>
      <div
        className="scan-sweep"
        style={{
          width: 168, height: 168, margin: "0 auto 22px",
          borderRadius: 22, position: "relative", overflow: "hidden",
          background: "var(--surface-tint)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {image ? (
          <img src={image} alt="Analyzing" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)" }}>
            <ScanLine size={44} />
          </div>
        )}

        {/* Rotating processing ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: 6, borderRadius: 17,
            border: "2px solid transparent",
            borderTopColor: "var(--brand)",
            borderRightColor: "rgba(124,92,252,0.55)",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={stage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15.5, color: "var(--ink)", marginBottom: 4 }}
        >
          {STAGES[stage]}
        </motion.p>
      </AnimatePresence>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 18 }}>AI is analyzing the scan…</p>

      {/* Skeleton preview of the incoming result */}
      <div style={{ maxWidth: 260, margin: "0 auto 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 12, width: "85%", margin: "0 auto" }} />
        <div className="skeleton" style={{ height: 12, width: "60%", margin: "0 auto" }} />
        <div className="skeleton" style={{ height: 12, width: "72%", margin: "0 auto" }} />
      </div>

      {/* Stage dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {STAGES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === stage ? 20 : 6,
              height: 6,
              borderRadius: 4,
              background: i <= stage ? "linear-gradient(90deg, var(--brand), var(--violet))" : "rgba(43,75,223,0.16)",
              transition: "all 0.35s var(--ease)",
            }}
          />
        ))}
      </div>
    </div>
  );
}