"use client";
import { ReactNode } from "react";
import { motion } from "framer-motion";

type RevealType = "fade-up" | "fade" | "scale" | "blur" | "slide-left" | "slide-right";

const VARIANTS: Record<RevealType, { initial: any; animate: any }> = {
  "fade-up": { initial: { opacity: 0, y: 32 }, animate: { opacity: 1, y: 0 } },
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  scale: { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 } },
  blur: { initial: { opacity: 0, filter: "blur(8px)", y: 16 }, animate: { opacity: 1, filter: "blur(0px)", y: 0 } },
  "slide-left": { initial: { opacity: 0, x: -40 }, animate: { opacity: 1, x: 0 } },
  "slide-right": { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 } },
};

interface ScrollRevealProps {
  children: ReactNode;
  type?: RevealType;
  delay?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  once?: boolean;
}

export default function ScrollReveal({
  children,
  type = "fade-up",
  delay = 0,
  duration = 0.6,
  className,
  style,
  once = true,
}: ScrollRevealProps) {
  const variant = VARIANTS[type];
  return (
    <motion.div
      initial={variant.initial}
      whileInView={variant.animate}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
