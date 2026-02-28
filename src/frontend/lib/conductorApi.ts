import {
  ServerConfig,
  WorkflowInstance,
  ActivityToken,
  WorkflowDefinition,
} from "@/types/conductor";

// ── Base fetch with auth ──────────────────────────────────────────────────────
async function apiFetch(
  config: ServerConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${config.baseUrl.replace(/\/$/, "")}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }
  const res = await fetch(url, { ...options, headers });
  return res;
}

async function expectJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ── Info ──────────────────────────────────────────────────────────────────────
export async function getInfo(config: ServerConfig): Promise<unknown> {
  const res = await apiFetch(config, "/api/info");
  return expectJson(res);
}

// ── Definitions ───────────────────────────────────────────────────────────────
export async function registerDefinition(
  config: ServerConfig,
  definition: object
): Promise<void> {
  const res = await apiFetch(config, "/api/definition", {
    method: "POST",
    body: JSON.stringify(definition),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
}

export async function getDefinition(
  config: ServerConfig,
  id: string
): Promise<WorkflowDefinition> {
  const res = await apiFetch(config, `/api/definition/${encodeURIComponent(id)}`);
  return expectJson<WorkflowDefinition>(res);
}

// ── Workflows ─────────────────────────────────────────────────────────────────
export async function startWorkflow(
  config: ServerConfig,
  definitionId: string,
  data: Record<string, unknown>
): Promise<WorkflowInstance> {
  const res = await apiFetch(config, `/api/workflow/${encodeURIComponent(definitionId)}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return expectJson<WorkflowInstance>(res);
}

export async function getWorkflow(
  config: ServerConfig,
  workflowId: string
): Promise<WorkflowInstance> {
  const res = await apiFetch(config, `/api/workflow/${encodeURIComponent(workflowId)}`);
  return expectJson<WorkflowInstance>(res);
}

export async function suspendWorkflow(
  config: ServerConfig,
  workflowId: string
): Promise<void> {
  const res = await apiFetch(config, `/api/workflow/${encodeURIComponent(workflowId)}/suspend`, {
    method: "PUT",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
}

export async function resumeWorkflow(
  config: ServerConfig,
  workflowId: string
): Promise<void> {
  const res = await apiFetch(config, `/api/workflow/${encodeURIComponent(workflowId)}/resume`, {
    method: "PUT",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
}

export async function terminateWorkflow(
  config: ServerConfig,
  workflowId: string
): Promise<void> {
  const res = await apiFetch(config, `/api/workflow/${encodeURIComponent(workflowId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
}

// ── Activities ────────────────────────────────────────────────────────────────
export async function getActivity(
  config: ServerConfig,
  activityName: string,
  workerId?: string,
  timeout?: number
): Promise<ActivityToken | null> {
  const params = new URLSearchParams();
  if (workerId) params.set("workerId", workerId);
  if (timeout !== undefined) params.set("timeout", String(timeout));
  const qs = params.toString() ? `?${params}` : "";
  const res = await apiFetch(config, `/api/activity/${encodeURIComponent(activityName)}${qs}`);
  if (res.status === 404) return null;
  return expectJson<ActivityToken>(res);
}

export async function submitActivitySuccess(
  config: ServerConfig,
  token: string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await apiFetch(config, `/api/activity/success/${encodeURIComponent(token)}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
}

export async function submitActivityFail(
  config: ServerConfig,
  token: string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await apiFetch(config, `/api/activity/fail/${encodeURIComponent(token)}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
}

export async function releaseActivityToken(
  config: ServerConfig,
  token: string
): Promise<void> {
  const res = await apiFetch(config, `/api/activity/${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
}

// ── Events ────────────────────────────────────────────────────────────────────
export async function publishEvent(
  config: ServerConfig,
  eventName: string,
  eventKey: string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await apiFetch(
    config,
    `/api/event/${encodeURIComponent(eventName)}/${encodeURIComponent(eventKey)}`,
    { method: "POST", body: JSON.stringify(data) }
  );
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
}

// ── Custom Steps ──────────────────────────────────────────────────────────────
export async function createCustomStep(
  config: ServerConfig,
  stepId: string,
  pythonCode: string
): Promise<void> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/api/step/${encodeURIComponent(stepId)}`;
  const headers: Record<string, string> = {
    "Content-Type": "text/x-python",
  };
  if (config.token) headers["Authorization"] = `Bearer ${config.token}`;
  const res = await fetch(url, { method: "POST", headers, body: pythonCode });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = await res.text(); } catch { /* ignore */ }
    throw new Error(msg);
  }
}

export async function getCustomStep(
  config: ServerConfig,
  stepId: string
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/api/step/${encodeURIComponent(stepId)}`;
  const headers: Record<string, string> = { Accept: "text/x-python" };
  if (config.token) headers["Authorization"] = `Bearer ${config.token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
