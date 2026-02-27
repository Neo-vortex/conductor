"use client";
import { useState } from "react";
import { useConductorStore } from "@/store/conductorStore";
import StatusBadge from "./StatusBadge";

export default function InstanceList() {
  const {
    instances,
    selectedInstanceId,
    setSelectedInstance,
    removeInstance,
    refreshAll,
    addInstance,
  } = useConductorStore();

  const [trackId, setTrackId] = useState("");
  const [trackDef, setTrackDef] = useState("");

  const handleTrack = () => {
    if (!trackId.trim()) return;
    addInstance(trackId.trim(), trackDef.trim() || "unknown");
    setTrackId("");
    setTrackDef("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-base-300 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">
          Instances ({instances.length})
        </span>
        <button
          className="btn btn-ghost btn-xs"
          title="Refresh all"
          onClick={refreshAll}
        >
          ↺
        </button>
      </div>

      {/* Manual track by ID */}
      <div className="p-3 border-b border-base-300 space-y-1.5">
        <div className="text-xs text-base-content/40 font-semibold">Track by ID</div>
        <input
          className="input input-xs input-bordered w-full font-mono"
          placeholder="Workflow ID"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTrack()}
        />
        <input
          className="input input-xs input-bordered w-full font-mono"
          placeholder="Definition ID (label)"
          value={trackDef}
          onChange={(e) => setTrackDef(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTrack()}
        />
        <button className="btn btn-xs btn-outline btn-primary w-full" onClick={handleTrack}>
          + Track
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {instances.length === 0 && (
          <div className="p-4 text-xs text-base-content/30 text-center italic">
            No instances tracked yet.<br />Start a workflow to see it here.
          </div>
        )}
        {instances.map((inst) => {
          const isSelected = selectedInstanceId === inst.workflowId;
          const status = inst.instance?.status ?? "…";
          return (
            <div
              key={inst.workflowId}
              onClick={() => setSelectedInstance(inst.workflowId)}
              className={`
                p-3 border-b border-base-300 cursor-pointer transition-colors
                ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-base-300/50"}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-base-content truncate flex-1">
                  {inst.label}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeInstance(inst.workflowId); }}
                  className="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 hover:opacity-100 ml-1"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                {inst.autoRefresh && status !== "Complete" && status !== "Terminated" && (
                  <span className="text-[10px] text-base-content/30 flex items-center gap-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    live
                  </span>
                )}
              </div>
              <div className="text-[10px] text-base-content/30 font-mono mt-1 truncate">
                {inst.workflowId.slice(0, 24)}…
              </div>
              {inst.error && (
                <div className="text-[10px] text-error mt-0.5 truncate">{inst.error}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
