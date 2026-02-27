"use client";

const STATUS_COLORS: Record<string, string> = {
  Runnable:   "badge-info",
  Suspended:  "badge-warning",
  Complete:   "badge-success",
  Terminated: "badge-error",
};

const STATUS_ICONS: Record<string, string> = {
  Runnable:   "▶",
  Suspended:  "⏸",
  Complete:   "✓",
  Terminated: "✕",
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "badge-ghost";
  const icon = STATUS_ICONS[status] ?? "●";
  return (
    <span className={`badge badge-sm ${cls} gap-1 font-mono`}>
      <span style={{ fontSize: 9 }}>{icon}</span>
      {status}
    </span>
  );
}
