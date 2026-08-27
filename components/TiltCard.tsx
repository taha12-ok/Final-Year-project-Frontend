"use client";
import { useRef, useState, ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxTilt?: number;
  onClick?: () => void;
}

/**
 * Depth card: subtle 3D tilt toward the cursor + moving sheen highlight.
 * Tilt capped low (default 6deg) so it feels premium, not gimmicky.
 */
export default function TiltCard({
  children,
  className = "",
  style,
  maxTilt = 6,
  onClick,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const springX = useSpring(mx, { stiffness: 160, damping: 18 });
  const springY = useSpring(my, { stiffness: 160, damping: 18 });

  const rotateX = useTransform(springY, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(springX, [0, 1], [-maxTilt, maxTilt]);
  const highlightX = useTransform(springX, [0, 1], ["0%", "100%"]);
  const highlightY = useTransform(springY, [0, 1], ["0%", "100%"]);
  const sheen = useMotionTemplate`radial-gradient(circle at ${highlightX} ${highlightY}, rgba(43,75,223,0.09), transparent 55%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <div style={{ perspective: 1000, height: "100%" }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); mx.set(0.5); my.set(0.5); }}
        onClick={onClick}
        className={className}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          position: "relative",
          height: "100%",
          willChange: "transform",
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
            background: sheen,
          }}
        />
      </motion.div>
    </div>
  );
}
