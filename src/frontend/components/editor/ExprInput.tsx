"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Lazy-load CodeMirror so it doesn't affect SSR / initial bundle
const PythonExprEditor = dynamic(() => import("./PythonExprEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-16 rounded-lg bg-base-300 border border-base-content/10 animate-pulse" />
  ),
});

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** If true, simple mode uses a single-line <input> instead of <textarea> */
  singleLine?: boolean;
  /** Extra class for the wrapper */
  className?: string;
}

/**
 * ExprInput — two modes toggled by a button:
 *   • Simple  — plain <input> or <textarea> (fast, compact)
 *   • Editor  — CodeMirror with Python syntax highlighting + workflow autocomplete
 */
export default function ExprInput({
  value,
  onChange,
  placeholder = "expression…",
  singleLine = false,
  className = "",
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  return (
    <div className={`relative group ${className}`}>
      {/* ── Toggle button ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        title={expanded ? "Switch to simple input" : "Open Python editor"}
        className={`
          absolute right-1 top-1 z-10 
          flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold
          transition-all duration-150 select-none
          ${
            expanded
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30"
              : "bg-base-300/80 text-base-content/40 border border-base-content/10 hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100"
          }
        `}
      >
        {expanded ? (
          <>
            <span>✕</span>
            <span className="hidden sm:inline">simple</span>
          </>
        ) : (
          <>
            <span style={{ fontFamily: "monospace" }}>𝙋𝙮</span>
            <span className="hidden sm:inline">editor</span>
          </>
        )}
      </button>

      {/* ── Simple mode ───────────────────────────────────────────────────── */}
      {!expanded && (
        <>
          {singleLine ? (
            <input
              className="input input-xs input-bordered w-full font-mono text-xs pr-16"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <textarea
              className="textarea textarea-bordered textarea-xs w-full font-mono text-xs resize-none pr-16"
              rows={2}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </>
      )}

      {/* ── Expanded editor mode ──────────────────────────────────────────── */}
      {expanded && (
        <div className="rounded-lg overflow-hidden" style={{ minHeight: 80 }}>
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-3 py-1"
            style={{
              background: "#0d1117",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "#1e2d3d", color: "#7dd3fc" }}
              >
                Python
              </span>
              <span className="text-[10px] text-slate-500">
                Ctrl+Space for autocomplete
              </span>
            </div>
          </div>
          {/* Editor */}
          <PythonExprEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            singleLine={singleLine}
          />
          {/* Autocomplete hint footer */}
          <div
            className="px-3 py-1.5 flex flex-wrap gap-2"
            style={{ background: "#0d1117", borderTop: "1px solid #1e293b" }}
          >
            {["data.*", "step.*", "str()", "len()", "__import__('time').time()"].map(
              (hint) => (
                <button
                  key={hint}
                  type="button"
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors"
                  style={{
                    background: "#1e293b",
                    color: "#64748b",
                    border: "1px solid #334155",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#a5b4fc";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366f1";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#334155";
                  }}
                  onClick={() => onChange(value + hint.replace("()", "("))}
                >
                  {hint}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
