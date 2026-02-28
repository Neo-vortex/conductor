// ─── Step Types ───────────────────────────────────────────────────────────────
export type StepType =
  | "EmitLog"
  | "Activity"
  | "WaitFor"
  | "Decide"
  | "While"
  | string; // custom steps

// ─── KV pair for Inputs / Outputs ─────────────────────────────────────────────
export interface KVPair {
  id: string;
  key: string;
  value: string;
}

// ─── Decide branch ────────────────────────────────────────────────────────────
export interface DecideBranch {
  id: string;
  targetStepId: string; // the step ID (not node id) to jump to
  condition: string;
}

// ─── Nested step inside While > Do ────────────────────────────────────────────
export interface NestedStep {
  id: string;
  stepType: StepType;
  nextStepId: string;
  inputs: KVPair[];
  outputs: KVPair[];
}

// ─── Node data carried inside each ReactFlow node ─────────────────────────────
export interface NodeData {
  stepId: string;         // the workflow Step Id
  stepType: StepType;
  label: string;

  // EmitLog
  logMessage?: string;

  // Activity
  activityName?: string;
  activityParameters?: string;

  // WaitFor
  eventName?: string;
  eventKey?: string;

  // Decide: branches
  decideBranches?: DecideBranch[];

  // While
  whileCondition?: string;
  whileSteps?: NestedStep[];   // the Do block steps

  // Shared
  inputs: KVPair[];
  outputs: KVPair[];
}

// ─── Workflow metadata ────────────────────────────────────────────────────────
export interface WorkflowMeta {
  id: string;
  version: number;
}
