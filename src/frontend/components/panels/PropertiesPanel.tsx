"use client";
import { useWorkflowStore } from "@/store/workflowStore";
import { NodeData, DecideBranch, NestedStep } from "@/types/workflow";
import KVEditor from "./KVEditor";
import ExprInput from "@/components/editor/ExprInput";
import { v4 as uuidv4 } from "uuid";

// ── Label helper ──────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="label pb-1">
      <span className="label-text text-xs font-bold uppercase tracking-wider text-base-content/50">
        {children}
      </span>
    </label>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function PropertiesPanel() {
  const { nodes, selectedNodeId, updateNodeData, deleteNode, duplicateNode } =
    useWorkflowStore();

  if (!selectedNodeId) {
    return (
      <aside className="w-full bg-base-200 border-l border-base-300 flex items-center justify-center h-full">
        <div className="text-center text-base-content/30 px-6">
          <div className="text-4xl mb-3">👈</div>
          <p className="text-sm">Click a node to edit its properties</p>
        </div>
      </aside>
    );
  }

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;
  const d = node.data;
  const update = (patch: Partial<NodeData>) => updateNodeData(selectedNodeId, patch);

  return (
    <aside className="w-full flex flex-col bg-base-200 border-l border-base-300 h-full panel-animate overflow-hidden">
      {/* ── Header ── */}
      <div className="p-4 border-b border-base-300 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary">Properties</div>
          <div className="text-sm font-semibold text-base-content mt-0.5 truncate">{d.stepId}</div>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-xs" title="Duplicate" onClick={() => duplicateNode(selectedNodeId)}>⧉</button>
          <button className="btn btn-ghost btn-xs text-error" title="Delete" onClick={() => deleteNode(selectedNodeId)}>🗑</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Step ID */}
        <div className="form-control">
          <FieldLabel>Step ID</FieldLabel>
          <input
            className="input input-sm input-bordered font-mono"
            value={d.stepId}
            onChange={(e) => update({ stepId: e.target.value })}
          />
        </div>

        {/* Step Type */}
        <div className="form-control">
          <FieldLabel>Step Type</FieldLabel>
          <input
            className="input input-sm input-bordered font-mono"
            value={d.stepType}
            onChange={(e) => update({ stepType: e.target.value as NodeData["stepType"] })}
          />
          <label className="label pt-1">
            <span className="label-text-alt text-base-content/30">Built-in or custom registered step name</span>
          </label>
        </div>

        <div className="divider my-1" />

        {/* ════ EmitLog ════════════════════════════════════════════════════════ */}
        {d.stepType === "EmitLog" && (
          <div className="form-control">
            <FieldLabel>Message Expression</FieldLabel>
            <ExprInput
              value={d.logMessage ?? ""}
              onChange={(v) => update({ logMessage: v })}
              placeholder='"Hello " + data.Name'
            />
          </div>
        )}

        {/* ════ Activity ═══════════════════════════════════════════════════════ */}
        {d.stepType === "Activity" && (
          <>
            <div className="form-control">
              <FieldLabel>Activity Name</FieldLabel>
              <ExprInput
                value={d.activityName ?? ""}
                onChange={(v) => update({ activityName: v })}
                placeholder='"myActivityName"'
                singleLine
              />
            </div>
            <div className="form-control">
              <FieldLabel>Parameters</FieldLabel>
              <ExprInput
                value={d.activityParameters ?? "data"}
                onChange={(v) => update({ activityParameters: v })}
                placeholder="data"
                singleLine
              />
            </div>
          </>
        )}

        {/* ════ WaitFor ════════════════════════════════════════════════════════ */}
        {d.stepType === "WaitFor" && (
          <>
            <div className="form-control">
              <FieldLabel>Event Name</FieldLabel>
              <ExprInput
                value={d.eventName ?? ""}
                onChange={(v) => update({ eventName: v })}
                placeholder='"my-event-name"'
                singleLine
              />
            </div>
            <div className="form-control">
              <FieldLabel>Event Key</FieldLabel>
              <ExprInput
                value={d.eventKey ?? ""}
                onChange={(v) => update({ eventKey: v })}
                placeholder="data.UniqueIdentifier"
                singleLine
              />
            </div>
          </>
        )}

        {/* ════ Decide ═════════════════════════════════════════════════════════ */}
        {d.stepType === "Decide" && (
          <DecideBranchEditor
            branches={d.decideBranches ?? []}
            onChange={(branches) => update({ decideBranches: branches })}
          />
        )}

        {/* ════ While ══════════════════════════════════════════════════════════ */}
        {d.stepType === "While" && (
          <>
            <div className="form-control">
              <FieldLabel>While Condition</FieldLabel>
              <ExprInput
                value={d.whileCondition ?? ""}
                onChange={(v) => update({ whileCondition: v })}
                placeholder="data.Index < len(data.Items)"
              />
            </div>
            <WhileDoEditor
              steps={d.whileSteps ?? []}
              onChange={(steps) => update({ whileSteps: steps })}
            />
          </>
        )}

        <div className="divider my-1" />

        {/* Inputs KV */}
        <KVEditor
          label="Inputs"
          pairs={d.inputs ?? []}
          onChange={(inputs) => update({ inputs })}
          keyPlaceholder="Key"
          valuePlaceholder="Python expression…"
        />

        <div className="divider my-1" />

        {/* Outputs KV */}
        <KVEditor
          label="Outputs"
          pairs={d.outputs ?? []}
          onChange={(outputs) => update({ outputs })}
          keyPlaceholder="Output Key"
          valuePlaceholder="step.Result or expression"
        />
      </div>
    </aside>
  );
}

// ── Decide branch sub-editor ──────────────────────────────────────────────────
function DecideBranchEditor({
  branches,
  onChange,
}: {
  branches: DecideBranch[];
  onChange: (b: DecideBranch[]) => void;
}) {
  const add = () => onChange([...branches, { id: uuidv4(), targetStepId: "", condition: "" }]);
  const remove = (id: string) => onChange(branches.filter((b) => b.id !== id));
  const upd = (id: string, field: "targetStepId" | "condition", val: string) =>
    onChange(branches.map((b) => (b.id === id ? { ...b, [field]: val } : b)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">Branches</span>
        <button onClick={add} className="btn btn-xs btn-ghost text-primary">+ Add Branch</button>
      </div>

      {branches.length === 0 && (
        <div className="text-xs text-base-content/30 italic">No branches yet</div>
      )}

      {branches.map((b, i) => (
        <div
          key={b.id}
          className="rounded-lg p-3 space-y-2"
          style={{ background: "#10b98115", border: "1px solid #10b98133" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">Branch {i + 1}</span>
            <button onClick={() => remove(b.id)} className="btn btn-ghost btn-xs text-error opacity-60 hover:opacity-100">✕</button>
          </div>

          <div className="form-control">
            <label className="label py-0.5">
              <span className="label-text text-xs text-base-content/40">Target Step ID</span>
            </label>
            <input
              className="input input-xs input-bordered font-mono"
              placeholder="NextStepId"
              value={b.targetStepId}
              onChange={(e) => upd(b.id, "targetStepId", e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label py-0.5">
              <span className="label-text text-xs text-base-content/40">Condition Expression</span>
            </label>
            <ExprInput
              value={b.condition}
              onChange={(v) => upd(b.id, "condition", v)}
              placeholder='data.Status == "Accepted"'
            />
          </div>
        </div>
      ))}

      <div className="text-xs text-base-content/30">
        💡 Connect this node's right handles to target nodes, then set their Step IDs above.
      </div>
    </div>
  );
}

// ── While > Do sub-editor ─────────────────────────────────────────────────────
function WhileDoEditor({
  steps,
  onChange,
}: {
  steps: NestedStep[];
  onChange: (s: NestedStep[]) => void;
}) {
  const add = () =>
    onChange([
      ...steps,
      {
        id: `Step${steps.length + 1}`,
        stepType: "EmitLog",
        nextStepId: "",
        inputs: [{ id: uuidv4(), key: "Message", value: '"log"' }],
        outputs: [],
      },
    ]);

  const remove = (idx: number) => onChange(steps.filter((_, i) => i !== idx));
  const upd = (idx: number, patch: Partial<NestedStep>) =>
    onChange(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">Do Block Steps</span>
        <button onClick={add} className="btn btn-xs btn-ghost text-primary">+ Add Step</button>
      </div>

      {steps.length === 0 && (
        <div className="text-xs text-base-content/30 italic">No steps in Do block</div>
      )}

      {steps.map((s, idx) => (
        <div
          key={idx}
          className="rounded-lg p-3 space-y-2"
          style={{ background: "#ec489915", border: "1px solid #ec489933" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pink-400">Step {idx + 1}</span>
            <button onClick={() => remove(idx)} className="btn btn-ghost btn-xs text-error opacity-60 hover:opacity-100">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs text-base-content/40">Id</span>
              </label>
              <input
                className="input input-xs input-bordered font-mono"
                value={s.id}
                onChange={(e) => upd(idx, { id: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs text-base-content/40">Type</span>
              </label>
              <input
                className="input input-xs input-bordered font-mono"
                value={s.stepType}
                onChange={(e) => upd(idx, { stepType: e.target.value })}
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label py-0.5">
              <span className="label-text text-xs text-base-content/40">NextStepId</span>
            </label>
            <input
              className="input input-xs input-bordered font-mono"
              placeholder="next step inside Do block"
              value={s.nextStepId}
              onChange={(e) => upd(idx, { nextStepId: e.target.value })}
            />
          </div>

          <KVEditor label="Inputs" pairs={s.inputs} onChange={(inputs) => upd(idx, { inputs })} />
          <KVEditor label="Outputs" pairs={s.outputs} onChange={(outputs) => upd(idx, { outputs })} />
        </div>
      ))}
    </div>
  );
}
