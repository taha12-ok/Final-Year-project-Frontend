"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { EASE } from "@/components/Reveal";

export interface TeamMember {
  name: string;
  role: string;
  id?: string;
  image: string;
  description: string;
  focus: string[];
}

/**
 * Scroll-pinned team reveal.
 *
 * A tall scroll track (340vh / 250vh mobile) contains a position:sticky
 * full-viewport stage. Scroll progress across the track is mapped to the
 * active member index, and members crossfade in place while the stage stays
 * pinned. Only after the last member does normal scrolling resume.
 */
export default function PinnedTeam({ members }: { members: TeamMember[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.max(0, Math.min(members.length - 1, Math.floor(v * members.length)));
    setActive((prev) => (prev === i ? prev : i));
  });

  const member = members[active];

  // ── Entrance pattern cycles per member: 1st = pic-left/info-right,
  // 2nd = pic-right/info-left, 3rd = both together (center-up). ──
  const pattern = active % 3 === 0 ? "left" : active % 3 === 1 ? "right" : "together";
  const portraitInitial =
    pattern === "left" ? { opacity: 0, x: -70, y: 16 } :
    pattern === "right" ? { opacity: 0, x: 70, y: 16 } :
    { opacity: 0, y: 46, scale: 0.92 };
  const detailsInitial =
    pattern === "left" ? { opacity: 0, x: 70, y: 16 } :
    pattern === "right" ? { opacity: 0, x: -70, y: 16 } :
    { opacity: 0, y: 46, scale: 0.92 };

  return (
    <div ref={trackRef} className="team-track" id="team">
      <div className="team-sticky">
        {/* Ambient background for the pinned stage */}
        <div className="mesh-bg" />
        <div className="grid-overlay" />

        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
          {/* Header — stays pinned while members swap */}
          <div style={{ textAlign: "center", marginBottom: "clamp(20px, 4vh, 48px)" }}>
            <span className="eyebrow" style={{ justifyContent: "center", width: "100%", display: "inline-flex" }}>Meet the team</span>
            <h2 className="display-section" style={{ marginTop: 8, fontSize: "clamp(28px, 3.6vw, 44px)" }}>
              The people behind <span className="gradient-text">MedAI</span>
            </h2>
          </div>

          {/* Swapping member stage */}
          <div style={{ position: "relative", minHeight: "min(460px, 52vh)" }}>
            <div
              className="split-grid"
              style={{ display: "grid", gridTemplateColumns: "minmax(260px, 380px) 1fr", gap: "clamp(28px, 5vw, 72px)", alignItems: "center" }}
            >
              <AnimatePresence mode="wait">
                {/* Portrait */}
                <motion.div
                  key={`portrait-${active}`}
                  initial={portraitInitial}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  style={{ position: "relative", justifySelf: "center", width: "min(300px, 64vw)" }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: "absolute", inset: -14, borderRadius: 34,
                      background: "conic-gradient(from 140deg, rgba(43,75,223,0.5), rgba(124,92,252,0.5), rgba(20,184,166,0.45), rgba(43,75,223,0.5))",
                      filter: "blur(18px)", opacity: 0.35,
                    }}
                  />
                  <div style={{ position: "relative", borderRadius: 26, padding: 3, background: "linear-gradient(150deg, var(--brand), var(--violet), var(--teal))" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.image}
                      alt={member.name}
                      style={{ width: "100%", aspectRatio: "1/1.08", objectFit: "cover", borderRadius: 23, display: "block", background: "var(--surface)" }}
                    />
                  </div>
                  <span className="chip chip-violet" style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}>
                    {member.role}
                  </span>
                </motion.div>

                {/* Details */}
                <motion.div
                  key={`details-${active}`}
                  initial={detailsInitial}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 64, fontWeight: 700, lineHeight: 1, color: "transparent", WebkitTextStroke: "1.5px rgba(43,75,223,0.28)", marginBottom: 6 }}>
                    {String(active + 1).padStart(2, "0")}
                  </p>
                  <h3 style={{ fontSize: "clamp(30px, 3.4vw, 46px)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.1 }}>{member.name}</h3>
                  {member.id && (
                    <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginTop: 8 }}>
                      {member.id}
                    </p>
                  )}
                  <p style={{ fontSize: 16, color: "var(--body)", lineHeight: 1.75, marginTop: 16, maxWidth: 540 }}>{member.description}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
                    {member.focus.map((f) => (
                      <span key={f} className="chip">{f}</span>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Progress cue: dots + rail */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: "clamp(18px, 4vh, 44px)" }}>
            <div style={{ display: "flex", gap: 10 }}>
              {members.map((m, i) => (
                <button
                  key={m.name}
                  aria-label={`Team member ${i + 1}`}
                  onClick={() => {
                    // Jump to the segment of scroll track that shows member i
                    const track = trackRef.current;
                    if (!track) return;
                    const top = track.getBoundingClientRect().top + window.scrollY;
                    const step = track.offsetHeight / members.length;
                    window.scrollTo({ top: top + step * i + 2, behavior: "smooth" });
                  }}
                  style={{
                    width: i === active ? 26 : 9, height: 9, borderRadius: 6, border: "none", cursor: "pointer", padding: 0,
                    background: i === active ? "linear-gradient(90deg, var(--brand), var(--violet))" : "rgba(43,75,223,0.18)",
                    transition: "all 0.35s var(--ease)",
                  }}
                />
              ))}
            </div>
            <div style={{ width: "min(320px, 60vw)", height: 3, borderRadius: 3, background: "rgba(43,75,223,0.12)", overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--brand), var(--violet), var(--teal))", scaleX: scrollYProgress, transformOrigin: "left" }}
              />
            </div>
            <p style={{ fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
              Keep scrolling — {member.name.split(" ")[0]} is member {active + 1} of {members.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}