"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  textarea?: boolean;
  rows?: number;
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
}

/**
 * Floating-label form field with animated focus ring.
 * Renders input, textarea, or select depending on props.
 */
export default function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  rows = 3,
  options,
  required,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const floating = focused || value.length > 0;

  const shared = {
    value,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    placeholder: " ",
  };

  return (
    <div className={`field ${floating ? "field-float" : ""}`}>
      {textarea ? (
        <textarea rows={rows} onChange={(e) => onChange(e.target.value)} {...shared} />
      ) : options ? (
        <select onChange={(e) => onChange(e.target.value)} {...shared}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input type={type} onChange={(e) => onChange(e.target.value)} {...shared} />
      )}
      <label>
        {label}
        {required && <span style={{ color: "var(--alert)", marginLeft: 3 }}>*</span>}
      </label>
      {options && (
        <span className="field-caret" style={{ transform: focused ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)" }}>
          <ChevronDown size={16} />
        </span>
      )}
    </div>
  );
}
