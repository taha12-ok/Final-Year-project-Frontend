"use client";
import { useEffect, useRef } from "react";

export default function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = Array.from({ length: reduceMotion ? 0 : 46 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      size: Math.random() * 1.4 + 0.3,
      sx: (Math.random() - 0.5) * 0.2, sy: (Math.random() - 0.5) * 0.2,
      color: Math.random() > 0.6 ? "#2563EB" : Math.random() > 0.5 ? "#06B6D4" : "#0D9488",
      opacity: Math.random() * 0.4 + 0.15,
    }));

    let mx = W/2, my = H/2;
    const onMouse = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMouse);

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p, i) => {
        const dx = mx - p.x, dy = my - p.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 180) { p.x += dx * 0.008; p.y += dy * 0.008; }
        else { p.x += p.sx; p.y += p.sy; }
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2,'0');
        ctx.fill();

        for (let j = i+1; j < particles.length; j++) {
          const p2 = particles[j];
          const d2 = Math.sqrt((p.x-p2.x)**2 + (p.y-p2.y)**2);
          if (d2 < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(37,99,235,${0.05*(1-d2/110)})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0, opacity: 0.7 }} />;
}
