// ── Server config ─────────────────────────────────────────────────────────────
export interface ServerConfig {
  baseUrl: string; // e.g. http://localhost:5001
  token?: string;  // optional Bearer token
}

// ── Workflow instance ─────────────────────────────────────────────────────────
export interface WorkflowInstance {
  workflowId: string;
  data: Record<string, unknown>;
  definitionId: string;
  version: number;
  status: "Runnable" | "Suspended" | "Complete" | "Terminated" | string;
  reference: string | null;
  startTime: string;
  endTime: string | null;
}

// ── Activity token ────────────────────────────────────────────────────────────
export interface ActivityToken {
  token: string;
  activityName: string;
  parameters: Record<string, unknown>;
  tokenExpiry: string;
}

// ── Definition (from GET /api/definition/:id) ─────────────────────────────────
export interface WorkflowDefinition {
  Id: string;
  Version: number;
  Steps: unknown[];
}

// ── Tracked instance (local UI state) ────────────────────────────────────────
export interface TrackedInstance {
  workflowId: string;
  definitionId: string;
  label: string; // user-defined nickname or definitionId
  instance: WorkflowInstance | null;
  lastFetched: number | null;
  autoRefresh: boolean;
  error: string | null;
}

// ── Tab inside instance detail ────────────────────────────────────────────────
export type InstanceTab = "overview" | "data" | "actions";
