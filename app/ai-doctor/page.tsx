"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Stethoscope, Bone, Brain, Droplets, AlertTriangle, Siren, Search,
  FlaskConical, UserRound, SendHorizonal, Bot, User, ArrowRight, RotateCcw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { EASE } from "@/components/Reveal";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Handoff {
  screening: string;
  name?: string;
  age?: string;
  gender?: string;
  concern?: string;
}
interface Msg {
  role: "user" | "assistant";
  content: string;
  handoff?: Handoff | null;
}

// Screening model mapping (handoff.screening -> route)
const SCREENINGS: Record<string, { href: string; label: string; icon: ReactNode }> = {
  fracture: { href: "/analyze/fracture", label: "Fracture Detection (X-ray)", icon: <Bone size={17} /> },
  brain:    { href: "/analyze/brain",    label: "Brain Tumor (MRI)",         icon: <Brain size={17} /> },
  kidney:   { href: "/analyze/kidney",   label: "Kidney Disease (CT)",       icon: <Droplets size={17} /> },
};

function headingIcon(text: string): ReactNode {
  const t = text.toLowerCase();
  if (t.includes("assessment")) return <Search size={17} />;
  if (t.includes("condition")) return <AlertTriangle size={17} />;
  if (t.includes("test")) return <FlaskConical size={17} />;
  if (t.includes("urgency")) return <Siren size={17} />;
  if (t.includes("specialist")) return <UserRound size={17} />;
  if (t.includes("next step")) return <ArrowRight size={17} />;
  return null;
}

/** Assistant message render — ## headings, bullets, urgency coloring */
function AssistantBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ fontSize: 14.5, lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          const heading = line.replace("## ", "").replace(/\* \(.*\)$/, "");
          const isHigh = /high/i.test(heading);
          const isMed = /medium/i.test(heading);
          return (
            <h3 key={i}
              style={{
                fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700,
                margin: "14px 0 6px", display: "flex", alignItems: "center", gap: 7,
                color: isHigh ? "var(--alert)" : isMed ? "var(--violet)" : "var(--brand-deep)",
              }}>
              {headingIcon(heading)}{heading}
            </h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 6 }}>
              <span style={{ color: "var(--brand)", fontWeight: 700, flexShrink: 0 }}>▸</span>
              <span>{line.replace(/^[-*] /, "")}</span>
            </div>
          );
        }
        if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />;
        if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ marginBottom: 4 }}>{line}</p>;
      })}
    </div>
  );
}

export default function AIDoctorPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Assalam-o-Alaikum! 👋 Main MedAI Health Assistant hoon.\n\nApni takleef batao — kya dard ya masla hai, kahan hai, aur kitne din se? Main aap ko behtar samajhne me madad karunga aur zaroorat pare to sahi screening ki taraf le jaunga.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Msg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Service unavailable" }));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });

        // handoff line ko stream ke dauran hide rakho
        const idx = acc.indexOf("###HANDOFF###");
        const visible = idx !== -1 ? acc.slice(0, idx) : acc;

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: visible };
          return next;
        });
      }

      // Final: handoff extract karo
      const idx = acc.indexOf("###HANDOFF###");
      let handoff: Handoff | null = null;
      if (idx !== -1) {
        try {
          const jsonPart = acc.slice(idx + "###HANDOFF###".length);
          const s = jsonPart.indexOf("{");
          const e = jsonPart.lastIndexOf("}");
          if (s !== -1 && e !== -1) handoff = JSON.parse(jsonPart.slice(s, e + 1));
        } catch { /* ignore */ }
      }
      const clean = (idx !== -1 ? acc.slice(0, idx) : acc).trimEnd();
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: clean, handoff };
        return next;
      });
    } catch (e: any) {
      if (e.name === "AbortError") {
        setMessages((prev) => prev);
      } else {
        setError(e.message || "Kuch ghalat ho gaya — dobara try karein.");
        setMessages((prev) => {
          const next = [...prev];
          if (next[next.length - 1]?.content === "") next.pop();
          return next;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();
  const reset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Assalam-o-Alaikum! 👋 Main MedAI Health Assistant hoon.\n\nApni takleef batao — kya dard ya masla hai, kahan hai, aur kitne din se? Main aap ko behtar samajhne me madad karunga aur zaroorat pare to sahi screening ki taraf le jaunga.",
      },
    ]);
    setError(null);
  };

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "clip", background: "var(--bg)" }}>
      <div className="mesh-bg" />
      <div className="orb orb-drift" style={{ width: 420, height: 420, top: "-10%", right: "-6%", background: "rgba(43,75,223,0.12)" }} />
      <div className="orb orb-drift-alt" style={{ width: 360, height: 360, bottom: "-6%", left: "-4%", background: "rgba(20,184,166,0.1)" }} />

      <Navbar
        variant="app"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="chip chip-violet" style={{ fontSize: 13, padding: "8px 14px" }}>
              <Stethoscope size={14} /> AI Health Assistant
            </span>
            <button onClick={reset} className="btn btn-secondary" style={{ padding: "9px 14px", fontSize: 13 }}>
              <RotateCcw size={14} /> New chat
            </button>
          </div>
        }
      />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
        style={{ textAlign: "center", padding: "130px 24px 26px", position: "relative", zIndex: 1 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em" }}>
          AI Health <span className="gradient-text">Assistant</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14.5, marginTop: 6 }}>
          Apni takleef batao — main sawal samajh kar screening guide karunga. <span style={{ color: "var(--body)" }}>Roman Urdu / English dono chalenge.</span>
        </p>
      </motion.div>

      {/* Chat container */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 16px 24px", position: "relative", zIndex: 1 }}>
        <div className="panel" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "min(68vh, 640px)" }}>
          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((m, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{
                  display: "flex", gap: 10,
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                  maxWidth: "88%", alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: m.role === "user"
                    ? "linear-gradient(135deg, var(--brand), var(--violet))"
                    : "var(--brand-soft)",
                  color: m.role === "user" ? "#fff" : "var(--brand)",
                  border: m.role === "user" ? "none" : "1px solid rgba(43,75,223,0.2)",
                }}>
                  {m.role === "user" ? <User size={16} /> : <Bot size={17} />}
                </span>
                <div style={{
                  background: m.role === "user" ? "linear-gradient(135deg, var(--brand), var(--violet) 140%)" : "var(--surface)",
                  color: m.role === "user" ? "#fff" : "var(--body)",
                  border: m.role === "user" ? "none" : "1px solid var(--border)",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "12px 15px", boxShadow: "var(--shadow-xs)", minWidth: 0,
                }}>
                  {m.role === "assistant" ? <AssistantBody text={m.content} /> : <p style={{ fontSize: 14.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</p>}

                  {/* Streaming dots */}
                  {m.role === "assistant" && streaming && i === messages.length - 1 && m.content === "" && (
                    <div style={{ display: "flex", gap: 5, padding: "4px 0" }}>
                      {[0, 1, 2].map((d) => (
                        <motion.span key={d}
                          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.18 }}
                          style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand)" }} />
                      ))}
                    </div>
                  )}

                  {/* Handoff card */}
                  {m.handoff && m.handoff.screening && m.handoff.screening !== "none" && SCREENINGS[m.handoff.screening] && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.35, ease: EASE }}
                      style={{
                        marginTop: 14, padding: 14, borderRadius: 14,
                        background: "linear-gradient(135deg, var(--brand-soft), var(--violet-soft))",
                        border: "1px solid rgba(43,75,223,0.25)",
                      }}>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--brand-deep)", marginBottom: 8 }}>
                        RECOMMENDED SCREENING
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                        {SCREENINGS[m.handoff.screening].icon} {SCREENINGS[m.handoff.screening].label}
                      </p>
                      {m.handoff.concern && (
                        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>“{m.handoff.concern}”</p>
                      )}
                      <Link href={{
                          pathname: SCREENINGS[m.handoff.screening].href,
                          query: {
                            name: m.handoff.name || "",
                            age: m.handoff.age || "",
                            gender: m.handoff.gender || "",
                            concern: m.handoff.concern || "",
                          },
                        }}>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="btn btn-primary" style={{ fontSize: 13.5, padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 7 }}>
                          Start Screening <ArrowRight size={15} />
                        </motion.button>
                      </Link>
                      <p style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 8 }}>
                        Patient details auto-fill ho jayengi — scan upload karke turant analyze karo.
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}

            {error && (
              <div style={{ alignSelf: "center", background: "rgba(229,72,77,0.08)", border: "1px solid var(--alert)", color: "var(--alert)", padding: "10px 16px", borderRadius: 12, fontSize: 13 }}>
                {error}
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", background: "var(--surface)", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              rows={1}
              placeholder="Apni takleef likho… (Enter to send)"
              disabled={streaming}
              style={{
                flex: 1, resize: "none", border: "1px solid var(--border-strong)", borderRadius: 14,
                padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", background: "var(--bg)",
                color: "var(--ink)", outline: "none", maxHeight: 120, minHeight: 46,
                transition: "border-color 0.2s var(--ease)",
              }}
            />
            {streaming ? (
              <button onClick={stop} className="btn btn-secondary" style={{ padding: "12px 18px", fontSize: 14 }}>
                Stop
              </button>
            ) : (
              <motion.button onClick={send} disabled={!input.trim()}
                whileHover={input.trim() ? { scale: 1.05 } : {}} whileTap={input.trim() ? { scale: 0.95 } : {}}
                className="btn" style={{
                  padding: "12px 16px",
                  ...(input.trim()
                    ? { background: "linear-gradient(135deg, var(--brand), var(--violet))", color: "#fff", boxShadow: "var(--shadow-brand)" }
                    : { background: "var(--bg-alt)", color: "var(--muted)", cursor: "not-allowed" }),
                }}>
                <SendHorizonal size={17} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--violet-soft)", border: "1px solid rgba(124,92,252,0.28)", borderRadius: 14, display: "flex", gap: 9, alignItems: "flex-start" }}>
          <AlertTriangle size={15} style={{ color: "#5B3FE4", flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: "#5B3FE4", fontSize: 12, lineHeight: 1.65 }}>
            <strong>Medical Disclaimer:</strong> Ye AI assistant screening aid hai, diagnosis nahi. Emergency me (severe chest pain, saans ki takleef, behoshi) foran hospital jayen. Final hamesha qualified doctor se confirm karein.
          </p>
        </div>
      </div>
    </main>
  );
}
