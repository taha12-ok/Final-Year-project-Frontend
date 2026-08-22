"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";

/**
 * Renders a stat value like "85%", "<3s", "50K+", "3" and animates the
 * numeric portion counting up from 0 when it scrolls into view, keeping
 * any non-numeric prefix/suffix (%, <, s, K+) intact.
 */
export default function AnimatedCounter({ value, duration = 1.6 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(value.replace(/[0-9.]+/, "0"));

  const match = value.match(/[0-9.]+/);
  const numeric = match ? parseFloat(match[0]) : null;
  const prefix = numeric !== null ? value.slice(0, match!.index) : "";
  const suffix = numeric !== null ? value.slice((match!.index || 0) + match![0].length) : "";
  const decimals = match && match[0].includes(".") ? match[0].split(".")[1].length : 0;

  useEffect(() => {
    if (!inView || numeric === null) {
      if (numeric === null) setDisplay(value);
      return;
    }
    const controls = animate(0, numeric, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(`${prefix}${v.toFixed(decimals)}${suffix}`),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <motion.span ref={ref} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {display}
    </motion.span>
  );
}
