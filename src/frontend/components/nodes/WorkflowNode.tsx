"use client";
import { memo, useCallback } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { NodeData } from "@/types/workflow";
import { useWorkflowStore, STEP_COLORS } from "@/store/workflowStore";

// ── icon per type ──────────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  EmitLog: "📝",
  Activity: "⚙️",
  WaitFor: "⏳",
  Decide: "🔀",
  While: "🔁",
};

const TYPE_LABELS: Record<string, string> = {
  EmitLog: "Emit Log",
  Activity: "Activity",
  WaitFor: "Wait For",
  Decide: "Decide",
  While: "While Loop",
};

// ── helper to get color ────────────────────────────────────────────────────────
function typeColor(t: string) {
  return STEP_COLORS[t] ?? "#6366f1";
}

// ── Node ──────────────────────────────────────────────────────────────────────
function WorkflowNode({ id, data, selected }: NodeProps<NodeData>) {
  const { setSelectedNode, deleteNode } = useWorkflowStore();
  const color = typeColor(data.stepType);

  const onNodeClick = useCallback(() => {
    setSelectedNode(id);
  }, [id, setSelectedNode]);

  const onDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteNode(id);
    },
    [id, deleteNode]
  );

  const inputCount = data.inputs?.length ?? 0;
  const outputCount = data.outputs?.length ?? 0;

  return (
    <div
      onClick={onNodeClick}
      className="rounded-xl cursor-pointer transition-all"
      style={{
        minWidth: 220,
        maxWidth: 260,
        border: `2px solid ${color}`,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        boxShadow: selected
          ? `0 0 0 2px ${color}, 0 0 20px ${color}44`
          : `0 4px 20px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ top: "50%" }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-xl"
        style={{ background: `${color}22`, borderBottom: `1px solid ${color}44` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>{ICONS[data.stepType] ?? "🔧"}</span>
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color }}
          >
            {TYPE_LABELS[data.stepType] ?? data.stepType}
          </span>
        </div>
        <button
          onClick={onDelete}
          className="btn btn-ghost btn-xs text-error opacity-60 hover:opacity-100"
          title="Delete"
        >
          ✕
        </button>
      </div>

      {/* Step ID */}
      <div className="px-3 py-2">
        <div className="text-sm font-semibold text-base-content truncate" title={data.stepId}>
          {data.stepId}
        </div>

        {/* Type-specific summary */}
        {data.stepType === "EmitLog" && data.logMessage && (
          <div className="text-xs text-base-content/50 mt-1 truncate font-mono">
            {data.logMessage.slice(0, 40)}
          </div>
        )}
        {data.stepType === "Activity" && data.activityName && (
          <div className="text-xs text-cyan-400/70 mt-1 font-mono truncate">
            {data.activityName}
          </div>
        )}
        {data.stepType === "WaitFor" && data.eventName && (
          <div className="text-xs text-amber-400/70 mt-1 font-mono truncate">
            {data.eventName}
          </div>
        )}
        {data.stepType === "Decide" && (
          <div className="text-xs text-emerald-400/70 mt-1">
            {data.decideBranches?.length ?? 0} branches
          </div>
        )}
        {data.stepType === "While" && data.whileCondition && (
          <div className="text-xs text-pink-400/70 mt-1 font-mono truncate">
            {data.whileCondition.slice(0, 35)}
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div
        className="flex justify-between px-3 py-1.5 rounded-b-xl text-xs text-base-content/40"
        style={{ borderTop: `1px solid ${color}22` }}
      >
        <span>↓ {inputCount} in</span>
        <span>{outputCount} out ↓</span>
      </div>

      {/* Output handle (right) */}
      {data.stepType !== "Decide" && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ top: "50%" }}
        />
      )}

      {/* Decide: multiple bottom handles */}
      {data.stepType === "Decide" &&
        (data.decideBranches ?? []).map((branch, idx) => {
          const total = (data.decideBranches ?? []).length;
          const topPct = total <= 1 ? 50 : 20 + (idx / (total - 1)) * 60;
          return (
            <Handle
              key={branch.id}
              type="source"
              position={Position.Right}
              id={`branch-${branch.id}`}
              style={{
                top: `${topPct}%`,
                background: "#10b981",
                border: "2px solid #34d399",
              }}
            />
          );
        })}
    </div>
  );
}

export default memo(WorkflowNode);
