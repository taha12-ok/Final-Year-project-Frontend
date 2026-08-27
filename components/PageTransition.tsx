"use client";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Wraps the current route in a subtle fade + slide transition keyed by
 * pathname, so every navigation feels smooth and consistent site-wide.
 * Uses the shared motion language: 0.35s, gentle ease-out curve.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
