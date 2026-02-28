"use client";
import { useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useConductorStore } from "@/store/conductorStore";

export default function Toolbar() {
  const { meta, setMeta, generateJson, clearAll, importJson, nodes } = useWorkflowStore();
  const { connected, server, runtimeOpen, setRuntimeOpen } = useConductorStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => importJson(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-base-300 border-b border-base-content/10 z-10 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <span className="text-xl">⚡</span>
        <span className="font-bold text-primary tracking-tight text-lg hidden sm:block">
          Workflow Builder
        </span>
      </div>

      <div className="divider divider-horizontal mx-0" />

      {/* Workflow ID */}
      <label className="flex items-center gap-2">
        <span className="text-xs text-base-content/50 hidden md:block">ID:</span>
        <input
          className="input input-sm input-bordered w-40 font-mono"
          value={meta.id}
          onChange={(e) => setMeta({ id: e.target.value })}
          placeholder="WorkflowId"
        />
      </label>

      {/* Version */}
      <label className="flex items-center gap-2">
        <span className="text-xs text-base-content/50 hidden md:block">v:</span>
        <input
          type="number"
          className="input input-sm input-bordered w-16 font-mono"
          value={meta.version}
          onChange={(e) => setMeta({ version: Number(e.target.value) })}
          min={1}
        />
      </label>

      <div className="divider divider-horizontal mx-0" />

      <div className="badge badge-outline badge-sm hidden sm:flex">{nodes.length} steps</div>

      <div className="flex-1" />

      {/* Server status pill */}
      <div
        className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono cursor-pointer
          ${connected
            ? "bg-success/10 text-success border border-success/20"
            : "bg-base-content/5 text-base-content/30 border border-base-content/10 hover:border-indigo-500/30 hover:text-indigo-400"
          }`}
        onClick={() => setRuntimeOpen(true)}
        title={connected ? `Connected: ${server.baseUrl}` : "Click to configure server"}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success animate-pulse" : "bg-base-content/20"}`} />
        {connected ? server.baseUrl.replace(/^https?:\/\//, "") : "no server"}
      </div>

      {/* File import */}
      <button className="btn btn-sm btn-ghost" onClick={() => fileRef.current?.click()} title="Import JSON">
        📂 Import
      </button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <button
        className="btn btn-sm btn-ghost text-error"
        onClick={() => { if (confirm("Clear all nodes?")) clearAll(); }}
      >
        🗑 Clear
      </button>

      <button className="btn btn-sm btn-outline" onClick={generateJson}>
        ⬇ JSON
      </button>

      {/* Runtime button */}
      <button
        className={`btn btn-sm ${runtimeOpen ? "btn-primary" : "btn-primary btn-outline"}`}
        onClick={() => setRuntimeOpen(!runtimeOpen)}
      >
        ⚡ Runtime
      </button>
    </header>
  );
}
