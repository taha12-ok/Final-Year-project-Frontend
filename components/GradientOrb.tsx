"use client";
import { motion } from "framer-motion";

interface GradientOrbProps {
  color?: string;
  size?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  duration?: number;
  delay?: number;
}

/** A soft ambient blurred glow used to add depth to hero / section backgrounds. */
export default function GradientOrb({
  color = "rgba(47,143,255,0.35)",
  size = 380,
  top,
  left,
  right,
  bottom,
  duration = 10,
  delay = 0,
}: GradientOrbProps) {
  return (
    <motion.div
      aria-hidden
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6], x: [0, 24, 0], y: [0, -18, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      style={{
        position: "absolute",
        top, left, right, bottom,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(70px)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
