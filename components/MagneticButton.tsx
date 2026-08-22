"use client";
import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  as?: "button" | "div";
  strength?: number;
}

/** Wraps a button-like element with a subtle magnetic pull toward the cursor. */
export default function MagneticButton({
  children,
  className,
  style,
  onClick,
  strength = 10,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 16 });
  const springY = useSpring(y, { stiffness: 200, damping: 16 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    x.set((relX / rect.width) * strength);
    y.set((relY / rect.height) * strength);
  };

  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      style={{ x: springX, y: springY, display: "inline-block", ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
