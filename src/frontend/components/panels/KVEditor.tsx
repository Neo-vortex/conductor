"use client";
import { v4 as uuidv4 } from "uuid";
import { KVPair } from "@/types/workflow";
import ExprInput from "@/components/editor/ExprInput";

interface Props {
  label: string;
  pairs: KVPair[];
  onChange: (pairs: KVPair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KVEditor({
  label,
  pairs,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "expression…",
}: Props) {
  const add = () =>
    onChange([...pairs, { id: uuidv4(), key: "", value: "" }]);
  const remove = (id: string) =>
    onChange(pairs.filter((p) => p.id !== id));
  const update = (id: string, field: "key" | "value", val: string) =>
    onChange(pairs.map((p) => (p.id === id ? { ...p, [field]: val } : p)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">
          {label}
        </span>
        <button onClick={add} className="btn btn-xs btn-ghost text-primary">
          + Add
        </button>
      </div>

      {pairs.length === 0 && (
        <div className="text-xs text-base-content/30 italic pl-1">None</div>
      )}

      {pairs.map((p) => (
        <div key={p.id} className="space-y-1">
          {/* Key row */}
          <div className="flex gap-1 items-center">
            <input
              className="input input-xs input-bordered flex-1 font-mono text-xs"
              placeholder={keyPlaceholder}
              value={p.key}
              onChange={(e) => update(p.id, "key", e.target.value)}
            />
            <button
              onClick={() => remove(p.id)}
              className="btn btn-ghost btn-xs text-error opacity-50 hover:opacity-100"
            >
              ✕
            </button>
          </div>
          {/* Value — ExprInput */}
          <ExprInput
            value={p.value}
            onChange={(v) => update(p.id, "value", v)}
            placeholder={valuePlaceholder}
            singleLine={false}
          />
        </div>
      ))}
    </div>
  );
}
