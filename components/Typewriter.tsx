"use client";
import { useState, useEffect } from "react";

export default function Typewriter({ words, delay = 100 }: { words: string[]; delay?: number }) {
  const [index, setIndex] = useState(0);
  const [sub, setSub] = useState(0);
  const [rev, setRev] = useState(false);

  useEffect(() => {
    if (sub === words[index].length + 1 && !rev) { setRev(true); return; }
    if (sub === 0 && rev) { setRev(false); setIndex(p => (p+1) % words.length); return; }
    const t = setTimeout(() => setSub(p => p + (rev ? -1 : 1)), rev ? delay/2 : delay);
    return () => clearTimeout(t);
  }, [sub, rev, index, words, delay]);

  return (
    <span>
      {words[index].substring(0, sub)}
      <span style={{ color: '#C9A84C', animation: 'pulse 1s infinite' }}>|</span>
    </span>
  );
}