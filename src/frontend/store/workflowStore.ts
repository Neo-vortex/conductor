import { create } from "zustand";
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
} from "reactflow";
import { NodeData, WorkflowMeta } from "@/types/workflow";
import { v4 as uuidv4 } from "uuid";

interface WorkflowStore {
  meta: WorkflowMeta;
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  jsonOutput: string;
  showJson: boolean;

  // Meta
  setMeta: (meta: Partial<WorkflowMeta>) => void;

  // Nodes
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (stepType: string, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;

  // JSON
  generateJson: () => void;
  setShowJson: (v: boolean) => void;

  // Import
  importJson: (raw: string) => void;

  // Clear
  clearAll: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function makeKV(key: string, value: string) {
  return { id: uuidv4(), key, value };
}

const NODE_DEFAULTS: Record<string, Partial<NodeData>> = {
  EmitLog: {
    logMessage: '"Log message"',
    inputs: [makeKV("Message", '"Hello"'), makeKV("Level", '"Information"')],
    outputs: [],
  },
  Activity: {
    activityName: '"myActivity"',
    activityParameters: "data",
    inputs: [makeKV("ActivityName", '"myActivity"'), makeKV("Parameters", "data")],
    outputs: [makeKV("Result", "step.Result")],
  },
  WaitFor: {
    eventName: '"my-event"',
    eventKey: "data.UniqueIdentifier",
    inputs: [makeKV("EventName", '"my-event"'), makeKV("EventKey", "data.UniqueIdentifier")],
    outputs: [makeKV("EventData", "step.EventData")],
  },
  Decide: {
    decideBranches: [
      { id: uuidv4(), targetStepId: "", condition: 'data.Status == "Accepted"' },
      { id: uuidv4(), targetStepId: "", condition: 'data.Status == "Rejected"' },
    ],
    inputs: [],
    outputs: [makeKV("DecideTime", "__import__('time').time()")],
  },
  While: {
    whileCondition: "data.Index < len(data.Items)",
    whileSteps: [],
    inputs: [makeKV("Condition", "data.Index < len(data.Items)")],
    outputs: [makeKV("ProcessTime", "__import__('time').time()")],
  },
};

const STEP_COLORS: Record<string, string> = {
  EmitLog: "#6366f1",
  Activity: "#06b6d4",
  WaitFor: "#f59e0b",
  Decide: "#10b981",
  While: "#ec4899",
};

// ── JSON generator ────────────────────────────────────────────────────────────

function kvArrToObj(pairs: { key: string; value: string }[]) {
  const obj: Record<string, string> = {};
  for (const p of pairs) {
    if (p.key.trim()) obj[p.key.trim()] = p.value;
  }
  return obj;
}

function generateWorkflowJson(
  meta: WorkflowMeta,
  nodes: Node<NodeData>[],
  edges: Edge[]
): object {
  const steps: object[] = [];

  for (const node of nodes) {
    const d = node.data;
    // Find edges from this node
    const outEdges = edges.filter((e) => e.source === node.id);

    const step: Record<string, unknown> = {
      Id: d.stepId,
      StepType: d.stepType,
    };

    if (d.stepType === "Decide") {
      const selectNextStep: Record<string, string> = {};
      for (const branch of d.decideBranches ?? []) {
        if (branch.targetStepId && branch.condition) {
          selectNextStep[branch.targetStepId] = branch.condition;
        }
      }
      if (Object.keys(selectNextStep).length) step.SelectNextStep = selectNextStep;

      const outputs = kvArrToObj(d.outputs ?? []);
      if (Object.keys(outputs).length) step.Outputs = outputs;

    } else if (d.stepType === "While") {
      // NextStepId from edge labelled "next" or just the first non-loop edge
      const nextEdge = outEdges.find((e) => e.sourceHandle === "next" || !e.sourceHandle?.startsWith("loop"));
      if (nextEdge) {
        const tgt = nodes.find((n) => n.id === nextEdge.target);
        if (tgt) step.NextStepId = tgt.data.stepId;
      }

      const inputs: Record<string, string> = {};
      if (d.whileCondition) inputs.Condition = d.whileCondition;
      Object.assign(inputs, kvArrToObj(d.inputs ?? []));
      if (Object.keys(inputs).length) step.Inputs = inputs;

      // Do block
      const doSteps = (d.whileSteps ?? []).map((ws) => {
        const s: Record<string, unknown> = {
          Id: ws.id,
          StepType: ws.stepType,
        };
        if (ws.nextStepId) s.NextStepId = ws.nextStepId;
        const inp = kvArrToObj(ws.inputs ?? []);
        if (Object.keys(inp).length) s.Inputs = inp;
        const out = kvArrToObj(ws.outputs ?? []);
        if (Object.keys(out).length) s.Outputs = out;
        return s;
      });
      if (doSteps.length) step.Do = [doSteps];

      const outputs = kvArrToObj(d.outputs ?? []);
      if (Object.keys(outputs).length) step.Outputs = outputs;

    } else {
      // EmitLog / Activity / WaitFor / custom
      const nextEdge = outEdges[0];
      if (nextEdge) {
        const tgt = nodes.find((n) => n.id === nextEdge.target);
        if (tgt) step.NextStepId = tgt.data.stepId;
      }

      // Build Inputs
      const inputs: Record<string, string> = {};
      if (d.stepType === "EmitLog" && d.logMessage) {
        inputs.Message = d.logMessage;
      }
      if (d.stepType === "Activity") {
        if (d.activityName) inputs.ActivityName = d.activityName;
        if (d.activityParameters) inputs.Parameters = d.activityParameters;
      }
      if (d.stepType === "WaitFor") {
        if (d.eventName) inputs.EventName = d.eventName;
        if (d.eventKey) inputs.EventKey = d.eventKey;
      }
      Object.assign(inputs, kvArrToObj(d.inputs ?? []));
      if (Object.keys(inputs).length) step.Inputs = inputs;

      const outputs = kvArrToObj(d.outputs ?? []);
      if (Object.keys(outputs).length) step.Outputs = outputs;
    }

    steps.push(step);
  }

  return { Id: meta.id, Version: meta.version, Steps: steps };
}

// ── Import JSON → nodes+edges ──────────────────────────────────────────────────

function importJsonToGraph(
  raw: string
): { nodes: Node<NodeData>[]; edges: Edge[]; meta: WorkflowMeta } | null {
  try {
    const parsed = JSON.parse(raw);
    const meta: WorkflowMeta = { id: parsed.Id ?? "MyWorkflow", version: parsed.Version ?? 1 };
    const steps: Record<string, unknown>[] = parsed.Steps ?? [];

    const nodes: Node<NodeData>[] = [];
    const edges: Edge[] = [];
    const NODE_W = 230;
    const NODE_H = 120;
    const COLS = 4;

    steps.forEach((step, idx) => {
      const stepId = step.Id as string;
      const stepType = step.StepType as StepType;
      const nodeId = `node-${uuidv4()}`;
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = 60 + col * (NODE_W + 60);
      const y = 60 + row * (NODE_H + 60);

      const inputs = step.Inputs
        ? Object.entries(step.Inputs as Record<string, string>).map(([k, v]) => makeKV(k, v))
        : [];
      const outputs = step.Outputs
        ? Object.entries(step.Outputs as Record<string, string>).map(([k, v]) => makeKV(k, v))
        : [];

      const data: NodeData = {
        stepId,
        stepType,
        label: stepId,
        inputs,
        outputs,
      };

      // Type-specific
      if (stepType === "EmitLog") {
        const inp = step.Inputs as Record<string, string> | undefined;
        data.logMessage = inp?.Message ?? "";
      }
      if (stepType === "Activity") {
        const inp = step.Inputs as Record<string, string> | undefined;
        data.activityName = inp?.ActivityName ?? "";
        data.activityParameters = inp?.Parameters ?? "data";
      }
      if (stepType === "WaitFor") {
        const inp = step.Inputs as Record<string, string> | undefined;
        data.eventName = inp?.EventName ?? "";
        data.eventKey = inp?.EventKey ?? "";
      }
      if (stepType === "Decide") {
        const sel = step.SelectNextStep as Record<string, string> | undefined;
        data.decideBranches = sel
          ? Object.entries(sel).map(([tid, cond]) => ({ id: uuidv4(), targetStepId: tid, condition: cond }))
          : [];
      }
      if (stepType === "While") {
        const inp = step.Inputs as Record<string, string> | undefined;
        data.whileCondition = inp?.Condition ?? "";
        const doBlock = (step.Do as unknown[][]) ?? [];
        const inner: NestedStep[] = [];
        for (const group of doBlock) {
          for (const s of group as Record<string, unknown>[]) {
            inner.push({
              id: s.Id as string,
              stepType: s.StepType as StepType,
              nextStepId: (s.NextStepId as string) ?? "",
              inputs: s.Inputs
                ? Object.entries(s.Inputs as Record<string, string>).map(([k, v]) => makeKV(k, v))
                : [],
              outputs: s.Outputs
                ? Object.entries(s.Outputs as Record<string, string>).map(([k, v]) => makeKV(k, v))
                : [],
            });
          }
        }
        data.whileSteps = inner;
      }

      nodes.push({
        id: nodeId,
        type: "workflowNode",
        position: { x, y },
        data,
      });
    });

    // Build edges from NextStepId / SelectNextStep
    // Map stepId → nodeId
    const stepIdToNodeId: Record<string, string> = {};
    for (const n of nodes) stepIdToNodeId[n.data.stepId] = n.id;

    for (const n of nodes) {
      const step = steps.find((s) => s.Id === n.data.stepId);
      if (!step) continue;

      if (n.data.stepType === "Decide") {
        for (const branch of n.data.decideBranches ?? []) {
          const targetNodeId = stepIdToNodeId[branch.targetStepId];
          if (targetNodeId) {
            edges.push({
              id: `e-${uuidv4()}`,
              source: n.id,
              target: targetNodeId,
              sourceHandle: "out",
              label: branch.condition.slice(0, 30),
              animated: true,
              style: { stroke: "#10b981" },
            });
          }
        }
      } else {
        const nextId = step.NextStepId as string | undefined;
        if (nextId) {
          const targetNodeId = stepIdToNodeId[nextId];
          if (targetNodeId) {
            edges.push({
              id: `e-${uuidv4()}`,
              source: n.id,
              target: targetNodeId,
              sourceHandle: "out",
              animated: false,
              style: { stroke: "#6366f1" },
            });
          }
        }
      }
    }

    return { nodes, edges, meta };
  } catch {
    return null;
  }
}

// ── Store ──────────────────────────────────────────────────────────────────────

import type { StepType, NestedStep } from "@/types/workflow";

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  meta: { id: "MyWorkflow", version: 1 },
  nodes: [],
  edges: [],
  selectedNodeId: null,
  jsonOutput: "",
  showJson: false,

  setMeta: (m) => set((s) => ({ meta: { ...s.meta, ...m } })),

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as Node<NodeData>[] })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge(
        { ...connection, animated: false, style: { stroke: "#6366f1" } },
        s.edges
      ),
    })),

  addNode: (stepType, position) => {
    const nodeId = `node-${uuidv4()}`;
    const defaults = NODE_DEFAULTS[stepType] ?? { inputs: [], outputs: [] };
    const data: NodeData = {
      stepId: `${stepType}${Date.now()}`,
      stepType,
      label: `${stepType}`,
      inputs: [],
      outputs: [],
      ...defaults,
      // re-create KV with fresh ids
      inputs: (defaults.inputs ?? []).map((kv) => ({ ...kv, id: uuidv4() })),
      outputs: (defaults.outputs ?? []).map((kv) => ({ ...kv, id: uuidv4() })),
      decideBranches: (defaults.decideBranches ?? []).map((b) => ({ ...b, id: uuidv4() })),
    };
    const node: Node<NodeData> = {
      id: nodeId,
      type: "workflowNode",
      position,
      data,
    };
    set((s) => ({ nodes: [...s.nodes, node], selectedNodeId: nodeId }));
  },

  updateNodeData: (nodeId, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    })),

  deleteNode: (nodeId) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
    })),

  duplicateNode: (nodeId) => {
    const { nodes } = get();
    const orig = nodes.find((n) => n.id === nodeId);
    if (!orig) return;
    const newId = `node-${uuidv4()}`;
    const newNode: Node<NodeData> = {
      ...orig,
      id: newId,
      position: { x: orig.position.x + 40, y: orig.position.y + 40 },
      data: {
        ...orig.data,
        stepId: orig.data.stepId + "_copy",
        inputs: orig.data.inputs.map((k) => ({ ...k, id: uuidv4() })),
        outputs: orig.data.outputs.map((k) => ({ ...k, id: uuidv4() })),
      },
    };
    set((s) => ({ nodes: [...s.nodes, newNode], selectedNodeId: newId }));
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  generateJson: () => {
    const { meta, nodes, edges } = get();
    const obj = generateWorkflowJson(meta, nodes, edges);
    set({ jsonOutput: JSON.stringify(obj, null, 2), showJson: true });
  },

  setShowJson: (v) => set({ showJson: v }),

  importJson: (raw) => {
    const result = importJsonToGraph(raw);
    if (!result) return;
    set({ nodes: result.nodes, edges: result.edges, meta: result.meta, selectedNodeId: null });
  },

  clearAll: () =>
    set({ nodes: [], edges: [], selectedNodeId: null, jsonOutput: "" }),
}));

export { STEP_COLORS };
