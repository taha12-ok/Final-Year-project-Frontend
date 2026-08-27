"use client";
import { ReactNode } from "react";
import { motion, type TargetAndTransition } from "framer-motion";

type RevealType = "fade-up" | "fade" | "scale" | "blur" | "slide-left" | "slide-right" | "wave";

const OFFSETS: Record<RevealType, TargetAndTransition> = {
  "fade-up": { y: 36 },
  fade: {},
  scale: { scale: 0.94 },
  blur: { y: 18, filter: "blur(10px)" },
  "slide-left": { x: -44 },
  "slide-right": { x: 44 },
  wave: { clipPath: "inset(100% 0% 0% 0%)", y: 14 },
};

const SHOW: Record<RevealType, TargetAndTransition> = {
  "fade-up": { opacity: 1, y: 0 },
  fade: { opacity: 1 },
  scale: { opacity: 1, scale: 1 },
  blur: { opacity: 1, y: 0, filter: "blur(0px)" },
  "slide-left": { opacity: 1, x: 0 },
  "slide-right": { opacity: 1, x: 0 },
  wave: { opacity: 1, clipPath: "inset(0% 0% 0% 0%)", y: 0 },
};

/** Shared motion constants — the single easing/duration language of the site. */
export const EASE = [0.22, 1, 0.36, 1] as const;

interface RevealProps {
  children: ReactNode;
  type?: RevealType;
  delay?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  once?: boolean;
}

/**
 * Scroll-triggered entrance. Large reveals stay within 600–800ms per spec.
 * "wave" clips the content in from the bottom edge upward — like water rising
 * to fill the shape — instead of a plain fade/slide.
 *
 * NOTE: wave's transition is a single flat object now (no per-property
 * override) — the earlier nested clipPath override could leave the element
 * stuck at opacity 0 in some layouts. This version is reliable everywhere.
 */
export default function Reveal({
  children,
  type = "fade-up",
  delay = 0,
  duration = 0.7,
  className,
  style,
  once = true,
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, ...OFFSETS[type] }}
      whileInView={SHOW[type]}
      viewport={{ once, margin: "-70px" }}
      transition={{ duration: type === "wave" ? duration + 0.15 : duration, delay, ease: EASE }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}