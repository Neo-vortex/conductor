"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import {
  autocompletion,
  completionKeymap,
  CompletionContext,
  Completion,
} from "@codemirror/autocomplete";
import { oneDark } from "@codemirror/theme-one-dark";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";

// ── Workflow-aware autocomplete ────────────────────────────────────────────────
// All the tokens from the examples + common patterns
const WORKFLOW_COMPLETIONS: Completion[] = [
  // data.* — workflow data bag
  { label: "data", type: "variable", detail: "workflow data object", boost: 10 },
  { label: "data.UniqueIdentifier", type: "property", detail: "string" },
  { label: "data.Status", type: "property", detail: "string" },
  { label: "data.CurrentStatus", type: "property", detail: "string" },
  { label: "data.CurrentActorId", type: "property", detail: "number | string" },


  // step.* — step result bag
  { label: "step", type: "variable", detail: "current step result", boost: 10 },
  { label: "step.Result", type: "property", detail: "activity result object" },


  // Python builtins useful in expressions
  { label: "str(", type: "function", detail: "convert to string" },
  { label: "int(", type: "function", detail: "convert to int" },
  { label: "float(", type: "function", detail: "convert to float" },
  { label: "len(", type: "function", detail: "length of collection" },
  { label: "bool(", type: "function", detail: "convert to bool" },
  { label: "True", type: "keyword" },
  { label: "False", type: "keyword" },
  { label: "None", type: "keyword" },
  { label: "and", type: "keyword" },
  { label: "or", type: "keyword" },
  { label: "not", type: "keyword" },
  { label: "in", type: "keyword" },

  // time import pattern seen in the examples
  {
    label: "__import__('time').time()",
    type: "function",
    detail: "current unix timestamp (float)",
    boost: 5,
  },

  // Common status values
  { label: '"Accepted"', type: "constant", detail: "status value" },
  { label: '"Rejected"', type: "constant", detail: "status value" },
  { label: '"Success"', type: "constant", detail: "status value" },
  { label: '"Failed"', type: "constant", detail: "status value" },
  { label: '"Submitted"', type: "constant", detail: "status value" },
  { label: '"Completed"', type: "constant", detail: "status value" },
  { label: '"Information"', type: "constant", detail: "log level" },
  { label: '"Warning"', type: "constant", detail: "log level" },
  { label: '"Error"', type: "constant", detail: "log level" },
];

function workflowCompleter(context: CompletionContext) {
  // Match identifiers, dots, brackets, and string starts
  const word = context.matchBefore(/[\w.[\]"'()]+/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const text = word.text;
  const filtered = WORKFLOW_COMPLETIONS.filter((c) =>
    c.label.toLowerCase().startsWith(text.toLowerCase())
  );

  return {
    from: word.from,
    options: filtered,
    validFor: /^[\w.[\]"'()]*$/,
  };
}

// ── Theme override on top of oneDark ──────────────────────────────────────────
const workflowTheme = EditorView.theme({
  "&": {
    fontSize: "12px",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid #334155",
  },
  "&.cm-focused": {
    outline: "none",
    border: "1px solid #6366f1",
    boxShadow: "0 0 0 2px #6366f140",
  },
  ".cm-content": {
    padding: "10px 12px",
    minHeight: "64px",
    caretColor: "#6366f1",
  },
  ".cm-line": { lineHeight: "1.6" },
  ".cm-gutters": { display: "none" },
  ".cm-activeLine": { backgroundColor: "#6366f108" },
  ".cm-tooltip-autocomplete": {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
    fontSize: "12px",
  },
  ".cm-tooltip-autocomplete ul li": {
    padding: "4px 10px",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "#6366f133",
    color: "#a5b4fc",
  },
  ".cm-completionLabel": { color: "#e2e8f0" },
  ".cm-completionDetail": { color: "#64748b", marginLeft: "8px", fontSize: "11px" },
  ".cm-completionIcon-variable": { "&::after": { content: '"$"', color: "#f59e0b" } },
  ".cm-completionIcon-property": { "&::after": { content: '"·"', color: "#06b6d4" } },
  ".cm-completionIcon-function": { "&::after": { content: '"ƒ"', color: "#10b981" } },
  ".cm-completionIcon-keyword": { "&::after": { content: '"K"', color: "#ec4899" } },
  ".cm-completionIcon-constant": { "&::after": { content: '"="', color: "#f59e0b" } },
});

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  singleLine?: boolean;
}

export default function PythonExprEditor({
  value,
  onChange,
  placeholder = "Python expression…",
  singleLine = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Track externally-driven value changes without re-creating the editor
  const externalChange = useRef(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
      python(),
      oneDark,
      workflowTheme,
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      autocompletion({
        override: [workflowCompleter],
        activateOnTyping: true,
        maxRenderedOptions: 12,
      }),
      cmPlaceholder(placeholder),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !externalChange.current) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      // Single-line: intercept Enter
      ...(singleLine
        ? [
            EditorState.transactionFilter.of((tr) => {
              if (tr.newDoc.lines > 1) return [];
              return tr;
            }),
          ]
        : []),
    ];

    const state = EditorState.create({ doc: value, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into the editor without wiping cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      externalChange.current = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      externalChange.current = false;
    }
  }, [value]);

  return <div ref={containerRef} className="w-full" />;
}
