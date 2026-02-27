"use client";
import { DragEvent } from "react";

const STEP_TYPES = [
  {
    type: "EmitLog",
    label: "Emit Log",
    icon: "📝",
    color: "#6366f1",
    desc: "Log a message",
  },
  {
    type: "Activity",
    label: "Activity",
    icon: "⚙️",
    color: "#06b6d4",
    desc: "External worker task",
  },
  {
    type: "WaitFor",
    label: "Wait For Event",
    icon: "⏳",
    color: "#f59e0b",
    desc: "Wait for an event signal",
  },
  {
    type: "Decide",
    label: "Decide",
    icon: "🔀",
    color: "#10b981",
    desc: "Conditional branching",
  },
  {
    type: "While",
    label: "While Loop",
    icon: "🔁",
    color: "#ec4899",
    desc: "Repeat while condition is true",
  },
];

export default function Sidebar() {
  const onDragStart = (e: DragEvent<HTMLDivElement>, stepType: string) => {
    e.dataTransfer.setData("application/workflow-step", stepType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-56 flex flex-col bg-base-200 border-r border-base-300 h-full select-none">
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
          Step Types
        </h2>
        <p className="text-xs text-base-content/40 mt-1">Drag onto canvas</p>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {STEP_TYPES.map(({ type, label, icon, color, desc }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] hover:shadow-lg"
            style={{
              border: `1.5px solid ${color}55`,
              background: `${color}11`,
            }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span className="text-sm font-semibold" style={{ color }}>
                {label}
              </span>
            </div>
            <p className="text-xs text-base-content/40 mt-1 pl-7">{desc}</p>
          </div>
        ))}

        <div className="divider text-xs text-base-content/30">Custom</div>

        {/* Custom step drop zone hint */}
        <div
          className="rounded-xl p-3 border border-dashed border-base-content/20 text-center cursor-default"
        >
          <div className="text-xs text-base-content/30">
            Custom step types can be added via the properties panel after dropping any node
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-base-300 text-xs text-base-content/30 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-indigo-500" />
          Normal connection
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-emerald-500" />
          Decide branch
        </div>
      </div>
    </aside>
  );
}
