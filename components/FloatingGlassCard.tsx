"use client";
import { useRef, useState, ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";

interface FloatingGlassCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxTilt?: number;
  onClick?: () => void;
}

/**
 * Wraps children in a glass surface that subtly tilts toward the cursor
 * and shows a moving highlight, like a floating piece of glass.
 * Tilt is capped at maxTilt degrees (default 5) to stay premium, not gimmicky.
 */
export default function FloatingGlassCard({
  children,
  className = "",
  style,
  maxTilt = 5,
  onClick,
}: FloatingGlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const springX = useSpring(mx, { stiffness: 150, damping: 18 });
  const springY = useSpring(my, { stiffness: 150, damping: 18 });

  const rotateX = useTransform(springY, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(springX, [0, 1], [-maxTilt, maxTilt]);
  const highlightX = useTransform(springX, [0, 1], ["0%", "100%"]);
  const highlightY = useTransform(springY, [0, 1], ["0%", "100%"]);
  const highlightBg = useMotionTemplate`radial-gradient(circle at ${highlightX} ${highlightY}, rgba(255,255,255,0.55), transparent 55%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <div className="tilt-wrap" style={{ height: "100%" }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); mx.set(0.5); my.set(0.5); }}
        onClick={onClick}
        className={`tilt-card ${className}`}
        style={{
          rotateX,
          rotateY,
          position: "relative",
          height: "100%",
          ...style,
        }}
      >
        {children}
        <motion.div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            opacity: hovering ? 1 : 0,
            transition: "opacity 0.3s ease",
            background: highlightBg,
          }}
        />
      </motion.div>
    </div>
  );
}
