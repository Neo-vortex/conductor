"use client";
import { useState, useCallback } from "react";
import { useConductorStore } from "@/store/conductorStore";
import { useWorkflowStore } from "@/store/workflowStore";
import {
  startWorkflow,
  publishEvent,
  getActivity,
  submitActivitySuccess,
  submitActivityFail,
  releaseActivityToken,
  registerDefinition,
  createCustomStep,
  getCustomStep,
} from "@/lib/conductorApi";
import { ActivityToken } from "@/types/conductor";

// ── Generic modal shell ───────────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal modal-open z-50">
      <div className="modal-box w-11/12 max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

// ── JSON textarea helper ──────────────────────────────────────────────────────
function JsonTextarea({
  label,
  value,
  onChange,
  placeholder = "{}",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isValid = (() => { try { JSON.parse(value); return true; } catch { return false; } })();
  return (
    <div className="form-control">
      <label className="label py-0.5">
        <span className="label-text text-xs font-semibold">{label}</span>
        {value && (
          <span className={`label-text-alt text-xs ${isValid ? "text-success" : "text-error"}`}>
            {isValid ? "valid JSON" : "invalid JSON"}
          </span>
        )}
      </label>
      <textarea
        className={`textarea textarea-bordered textarea-sm font-mono text-xs h-28 ${
          value && !isValid ? "textarea-error" : ""
        }`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function parseJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

// ════════════════════════════════════════════════════════════════════════════
// ── Start Workflow Modal ─────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export function StartWorkflowModal({ onClose }: { onClose: () => void }) {
  const { server, addInstance, connected } = useConductorStore();
  const { meta } = useWorkflowStore();

  const [defId, setDefId] = useState(meta.id);
  const [deployFirst, setDeployFirst] = useState(true);
  const [initData, setInitData] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (deployFirst) {
        const { nodes, edges, meta: m } = useWorkflowStore.getState();
        const { buildWorkflowJson } = await import("@/lib/buildWorkflowJson");
        const def = buildWorkflowJson(m, nodes, edges);
        await registerDefinition(server, def);
      }
      const inst = await startWorkflow(server, defId, parseJson(initData));
      addInstance(inst.workflowId, inst.definitionId, `${inst.definitionId}`);
      setResult(inst.workflowId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [server, defId, deployFirst, initData, addInstance]);

  return (
    <Modal title="▶ Start Workflow" onClose={onClose}>
      <div className="space-y-3">
        {!connected && (
          <div className="alert alert-warning py-2 text-xs">Connect to a server first</div>
        )}

        <div className="form-control">
          <label className="label py-0.5">
            <span className="label-text text-xs font-semibold">Definition ID</span>
          </label>
          <input
            className="input input-sm input-bordered font-mono"
            value={defId}
            onChange={(e) => setDefId(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary"
            checked={deployFirst}
            onChange={(e) => setDeployFirst(e.target.checked)}
          />
          <span className="text-sm">Deploy current canvas definition first</span>
        </label>

        <JsonTextarea label="Initial Data" value={initData} onChange={setInitData} />

        {error && <div className="alert alert-error py-2 text-xs">⚠ {error}</div>}

        {result && (
          <div className="alert alert-success py-2 text-xs font-mono">
            ✓ Started: {result}
          </div>
        )}

        <div className="modal-action mt-2">
          <button className="btn btn-sm" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleStart}
            disabled={loading || !connected}
          >
            {loading ? <span className="loading loading-spinner loading-xs" /> : "▶ Start"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── Deploy Definition Modal ──────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export function DeployDefinitionModal({ onClose }: { onClose: () => void }) {
  const { server, connected } = useConductorStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDeploy = async () => {
    setLoading(true); setError(null); setSuccess(false);
    try {
      const { nodes, edges, meta } = useWorkflowStore.getState();
      const { buildWorkflowJson } = await import("@/lib/buildWorkflowJson");
      const def = buildWorkflowJson(meta, nodes, edges);
      await registerDefinition(server, def);
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="☁ Deploy Definition" onClose={onClose}>
      <div className="space-y-3">
        {!connected && (
          <div className="alert alert-warning py-2 text-xs">Connect to a server first</div>
        )}
        <p className="text-sm text-base-content/70">
          This will POST the current canvas workflow definition to the Conductor server.
          If a definition with the same ID already exists, a new version will be created.
        </p>
        {error && <div className="alert alert-error py-2 text-xs">⚠ {error}</div>}
        {success && <div className="alert alert-success py-2 text-xs">✓ Definition deployed successfully</div>}
        <div className="modal-action">
          <button className="btn btn-sm" onClick={onClose}>Close</button>
          <button className="btn btn-sm btn-primary" onClick={handleDeploy} disabled={loading || !connected}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : "☁ Deploy"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── Publish Event Modal ──────────────────────────────────════════════════════
// ════════════════════════════════════════════════════════════════════════════
export function PublishEventModal({ onClose }: { onClose: () => void }) {
  const { server, connected } = useConductorStore();
  const [eventName, setEventName] = useState("");
  const [eventKey, setEventKey] = useState("");
  const [data, setData] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handle = async () => {
    setLoading(true); setError(null); setSuccess(false);
    try {
      await publishEvent(server, eventName, eventKey, parseJson(data));
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  return (
    <Modal title="📡 Publish Event" onClose={onClose}>
      <div className="space-y-3">
        {!connected && <div className="alert alert-warning py-2 text-xs">Connect to a server first</div>}
        <div className="grid grid-cols-2 gap-2">
          <div className="form-control">
            <label className="label py-0.5"><span className="label-text text-xs font-semibold">Event Name</span></label>
            <input className="input input-sm input-bordered font-mono" placeholder="discount-financier-decision" value={eventName} onChange={(e) => setEventName(e.target.value)} />
          </div>
          <div className="form-control">
            <label className="label py-0.5"><span className="label-text text-xs font-semibold">Event Key</span></label>
            <input className="input input-sm input-bordered font-mono" placeholder="workflow-unique-id" value={eventKey} onChange={(e) => setEventKey(e.target.value)} />
          </div>
        </div>
        <JsonTextarea label="Event Data" value={data} onChange={setData} />
        {error && <div className="alert alert-error py-2 text-xs">⚠ {error}</div>}
        {success && <div className="alert alert-success py-2 text-xs">✓ Event published</div>}
        <div className="modal-action">
          <button className="btn btn-sm" onClick={onClose}>Close</button>
          <button className="btn btn-sm btn-primary" onClick={handle} disabled={loading || !connected || !eventName || !eventKey}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : "📡 Publish"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── Activity Manager Modal ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export function ActivityManagerModal({ onClose }: { onClose: () => void }) {
  const { server, connected } = useConductorStore();
  const [activityName, setActivityName] = useState("");
  const [workerId, setWorkerId] = useState("workflow-builder-ui");
  const [token, setToken] = useState<ActivityToken | null>(null);
  const [resultData, setResultData] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const fetchActivity = async () => {
    setLoading(true); setError(null); setToken(null); setActionResult(null);
    try {
      const t = await getActivity(server, activityName, workerId, 5);
      if (!t) setError("No pending activity found (404)");
      else setToken(t);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  const doSuccess = async () => {
    if (!token) return;
    setActionLoading(true); setActionResult(null); setError(null);
    try {
      await submitActivitySuccess(server, token.token, parseJson(resultData));
      setActionResult("✓ Activity marked as successful");
      setToken(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setActionLoading(false); }
  };

  const doFail = async () => {
    if (!token) return;
    setActionLoading(true); setActionResult(null); setError(null);
    try {
      await submitActivityFail(server, token.token, parseJson(resultData));
      setActionResult("✓ Activity marked as failed");
      setToken(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setActionLoading(false); }
  };

  const doRelease = async () => {
    if (!token) return;
    setActionLoading(true); setActionResult(null); setError(null);
    try {
      await releaseActivityToken(server, token.token);
      setActionResult("✓ Token released");
      setToken(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setActionLoading(false); }
  };

  return (
    <Modal title="⚙ Activity Manager" onClose={onClose}>
      <div className="space-y-3">
        {!connected && <div className="alert alert-warning py-2 text-xs">Connect to a server first</div>}

        {/* Fetch token */}
        <div className="grid grid-cols-2 gap-2">
          <div className="form-control">
            <label className="label py-0.5"><span className="label-text text-xs font-semibold">Activity Name</span></label>
            <input className="input input-sm input-bordered font-mono" placeholder="createDiscountFlow" value={activityName} onChange={(e) => setActivityName(e.target.value)} />
          </div>
          <div className="form-control">
            <label className="label py-0.5"><span className="label-text text-xs font-semibold">Worker ID</span></label>
            <input className="input input-sm input-bordered font-mono" value={workerId} onChange={(e) => setWorkerId(e.target.value)} />
          </div>
        </div>

        <button
          className="btn btn-sm btn-outline w-full"
          onClick={fetchActivity}
          disabled={loading || !connected || !activityName}
        >
          {loading ? <span className="loading loading-spinner loading-xs" /> : "Fetch Pending Activity"}
        </button>

        {/* Token info */}
        {token && (
          <div className="rounded-lg p-3 space-y-2" style={{ background: "#06b6d415", border: "1px solid #06b6d433" }}>
            <div className="text-xs font-bold text-cyan-400">Activity Token Acquired</div>
            <div className="text-xs font-mono text-base-content/60 break-all">{token.token.slice(0, 40)}…</div>
            <div className="text-xs text-base-content/50">
              Expires: {new Date(token.tokenExpiry).toLocaleString()}
            </div>
            {Object.keys(token.parameters).length > 0 && (
              <div className="form-control">
                <label className="label py-0.5"><span className="label-text text-xs text-base-content/40">Parameters from workflow</span></label>
                <pre className="text-xs bg-base-300 rounded p-2 overflow-auto max-h-20 font-mono">
                  {JSON.stringify(token.parameters, null, 2)}
                </pre>
              </div>
            )}

            <JsonTextarea label="Result Data" value={resultData} onChange={setResultData} />

            <div className="flex gap-2 pt-1">
              <button className="btn btn-sm btn-success flex-1" onClick={doSuccess} disabled={actionLoading}>
                {actionLoading ? <span className="loading loading-spinner loading-xs" /> : "✓ Success"}
              </button>
              <button className="btn btn-sm btn-error flex-1" onClick={doFail} disabled={actionLoading}>
                {actionLoading ? <span className="loading loading-spinner loading-xs" /> : "✕ Fail"}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={doRelease} disabled={actionLoading} title="Release token">
                ↩
              </button>
            </div>
          </div>
        )}

        {error && <div className="alert alert-error py-2 text-xs">⚠ {error}</div>}
        {actionResult && <div className="alert alert-success py-2 text-xs">{actionResult}</div>}

        <div className="modal-action">
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── Custom Step Modal ────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export function CustomStepModal({ onClose }: { onClose: () => void }) {
  const { server, connected } = useConductorStore();
  const [stepId, setStepId] = useState("");
  const [code, setCode] = useState("# Python code\n# Variables from Inputs are available\n# Assign output variables here\nresult = value1 + value2\n");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(false);

  const handleSave = async () => {
    setLoading(true); setError(null); setSuccess(false);
    try {
      await createCustomStep(server, stepId, code);
      setSuccess(true);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const handleFetch = async () => {
    setFetching(true); setError(null);
    try {
      const src = await getCustomStep(server, stepId);
      setCode(src);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setFetching(false); }
  };

  return (
    <Modal title="🐍 Custom Step" onClose={onClose}>
      <div className="space-y-3">
        {!connected && <div className="alert alert-warning py-2 text-xs">Connect to a server first</div>}

        <div className="flex gap-2">
          <div className="form-control flex-1">
            <label className="label py-0.5"><span className="label-text text-xs font-semibold">Step ID</span></label>
            <input className="input input-sm input-bordered font-mono" placeholder="my-custom-step" value={stepId} onChange={(e) => setStepId(e.target.value)} />
          </div>
          <div className="form-control self-end">
            <button className="btn btn-sm btn-ghost" onClick={handleFetch} disabled={fetching || !stepId}>
              {fetching ? <span className="loading loading-spinner loading-xs" /> : "↓ Fetch"}
            </button>
          </div>
        </div>

        <div className="form-control">
          <label className="label py-0.5">
            <span className="label-text text-xs font-semibold">Python Code</span>
            <span className="label-text-alt text-xs text-base-content/30">POST /api/step/{stepId || "…"}</span>
          </label>
          <textarea
            className="textarea textarea-bordered font-mono text-xs h-40 resize-y"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
          />
        </div>

        {error && <div className="alert alert-error py-2 text-xs">⚠ {error}</div>}
        {success && <div className="alert alert-success py-2 text-xs">✓ Step registered</div>}

        <div className="modal-action">
          <button className="btn btn-sm" onClick={onClose}>Close</button>
          <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={loading || !connected || !stepId}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : "💾 Save Step"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
