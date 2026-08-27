"use client";
import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Global smooth-scroll provider. Wraps the whole app so every scroll
 * (mouse wheel, trackpad, touch) gets buttery inertia instead of the
 * browser's default jumpy native scroll. Framer Motion's useScroll /
 * whileInView hooks read from the native scroll position, so they keep
 * working correctly — Lenis just makes the motion smoother, it doesn't
 * replace how scroll position is measured.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,          // higher = more "floaty" smooth, lower = snappier
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth ease-out
      smoothWheel: true,
      touchMultiplier: 1.2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return null;
}