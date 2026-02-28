"use client";
import { useState, useCallback } from "react";
import { useConductorStore } from "@/store/conductorStore";
import {
  suspendWorkflow,
  resumeWorkflow,
  terminateWorkflow,
  publishEvent,
  getActivity,
  submitActivitySuccess,
  submitActivityFail,
  releaseActivityToken,
} from "@/lib/conductorApi";
import { ActivityToken } from "@/types/conductor";
import StatusBadge from "./StatusBadge";

type Tab = "overview" | "data" | "events" | "activity";

function parseJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function JsonTextarea({
  label, value, onChange, placeholder = "{}", rows = 5,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const valid = (() => { try { JSON.parse(value); return true; } catch { return false; } })();
  return (
    <div className="form-control">
      <label className="label py-0.5">
        <span className="label-text text-xs font-semibold">{label}</span>
        {value && <span className={`label-text-alt text-xs ${valid ? "text-success" : "text-error"}`}>{valid ? "✓ valid" : "✕ invalid"}</span>}
      </label>
      <textarea
        className={`textarea textarea-bordered textarea-xs font-mono text-xs resize-y ${value && !valid ? "textarea-error" : ""}`}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function InstanceDetail() {
  const { instances, selectedInstanceId, refreshInstance, setAutoRefresh, server } =
    useConductorStore();

  // ── ALL hooks must be declared before any conditional return ─────────────
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [evtName, setEvtName] = useState("");
  const [evtKey, setEvtKey] = useState("");
  const [evtData, setEvtData] = useState("{}");

  const [actName, setActName] = useState("");
  const [actWorkerId, setActWorkerId] = useState("workflow-builder-ui");
  const [actToken, setActToken] = useState<ActivityToken | null>(null);
  const [actResult, setActResult] = useState("{}");

  // Derive selection — safe to do after all hooks
  const inst = instances.find((i) => i.workflowId === selectedInstanceId);
  const wf = inst?.instance ?? null;
  const workflowId = inst?.workflowId ?? "";

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true); setError(null); setActionMsg(null);
    try { await fn(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  const handleSuspend = useCallback(() => withLoading(async () => {
    await suspendWorkflow(server, workflowId);
    await refreshInstance(workflowId);
    setActionMsg("Workflow suspended");
  }), [server, workflowId, refreshInstance, withLoading]);

  const handleResume = useCallback(() => withLoading(async () => {
    await resumeWorkflow(server, workflowId);
    await refreshInstance(workflowId);
    setActionMsg("Workflow resumed");
  }), [server, workflowId, refreshInstance, withLoading]);

  const handleTerminate = useCallback(() => {
    if (!confirm("Terminate this workflow instance?")) return;
    withLoading(async () => {
      await terminateWorkflow(server, workflowId);
      await refreshInstance(workflowId);
      setActionMsg("Workflow terminated");
    });
  }, [server, workflowId, refreshInstance, withLoading]);

  const handlePublishEvent = useCallback(() => withLoading(async () => {
    await publishEvent(server, evtName, evtKey, parseJson(evtData));
    setActionMsg(`Event "${evtName}" published`);
    setEvtData("{}");
  }), [server, evtName, evtKey, evtData, withLoading]);

  const handleFetchActivity = useCallback(() => withLoading(async () => {
    const t = await getActivity(server, actName, actWorkerId, 5);
    if (!t) { setError("No pending activity found (404)"); return; }
    setActToken(t);
    setActionMsg("Token acquired — fill result and submit");
  }), [server, actName, actWorkerId, withLoading]);

  const handleActivitySuccess = useCallback(() => withLoading(async () => {
    if (!actToken) return;
    await submitActivitySuccess(server, actToken.token, parseJson(actResult));
    setActToken(null);
    setActResult("{}");
    await refreshInstance(workflowId);
    setActionMsg("Activity succeeded");
  }), [server, actToken, actResult, workflowId, refreshInstance, withLoading]);

  const handleActivityFail = useCallback(() => withLoading(async () => {
    if (!actToken) return;
    await submitActivityFail(server, actToken.token, parseJson(actResult));
    setActToken(null);
    setActResult("{}");
    await refreshInstance(workflowId);
    setActionMsg("Activity failed");
  }), [server, actToken, actResult, workflowId, refreshInstance, withLoading]);

  const handleReleaseToken = useCallback(() => withLoading(async () => {
    if (!actToken) return;
    await releaseActivityToken(server, actToken.token);
    setActToken(null);
    setActionMsg("Token released");
  }), [server, actToken, withLoading]);

  // ── Now safe to do conditional render ────────────────────────────────────
  if (!inst) {
    return (
      <div className="flex-1 flex items-center justify-center text-base-content/30">
        <div className="text-center">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm">Select an instance to inspect</p>
        </div>
      </div>
    );
  }

  const status = wf?.status ?? "…";
  const isRunning = status === "Runnable";
  const isSuspended = status === "Suspended";
  const isDone = status === "Complete" || status === "Terminated";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Instance header ── */}
      <div className="p-4 border-b border-base-300 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{inst.label}</div>
            <div className="text-xs font-mono text-base-content/40 truncate">{workflowId}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={status} />
            <label className="flex items-center gap-1 cursor-pointer" title="Auto-refresh every 3s">
              <input
                type="checkbox"
                className="toggle toggle-xs toggle-success"
                checked={inst.autoRefresh}
                onChange={(e) => setAutoRefresh(workflowId, e.target.checked)}
                disabled={isDone}
              />
              <span className="text-xs text-base-content/40">live</span>
            </label>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => refreshInstance(workflowId)}
              title="Refresh"
            >
              ↺
            </button>
          </div>
        </div>

        {/* Quick meta */}
        {wf && (
          <div className="flex gap-4 text-xs text-base-content/40 font-mono">
            <span>v{wf.version}</span>
            <span>def: {wf.definitionId}</span>
            {wf.startTime && <span>started: {new Date(wf.startTime).toLocaleTimeString()}</span>}
            {wf.endTime && <span>ended: {new Date(wf.endTime).toLocaleTimeString()}</span>}
          </div>
        )}

        {/* Lifecycle buttons */}
        <div className="flex gap-2">
          <button className="btn btn-xs btn-warning" onClick={handleSuspend} disabled={loading || !isRunning}>⏸ Suspend</button>
          <button className="btn btn-xs btn-success" onClick={handleResume} disabled={loading || !isSuspended}>▶ Resume</button>
          <button className="btn btn-xs btn-error" onClick={handleTerminate} disabled={loading || isDone}>✕ Terminate</button>
        </div>

        {error && <div className="alert alert-error py-1 text-xs">⚠ {error}</div>}
        {actionMsg && <div className="alert alert-success py-1 text-xs">✓ {actionMsg}</div>}
      </div>

      {/* ── Tabs ── */}
      <div role="tablist" className="tabs tabs-bordered px-4 pt-2 flex-shrink-0">
        {(["overview", "data", "events", "activity"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            className={`tab tab-sm capitalize ${tab === t ? "tab-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "events" ? "📡 Events" : t === "activity" ? "⚙ Activity" : t === "data" ? "📦 Data" : "📋 Overview"}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-2">
            {!wf ? (
              <div className="text-xs text-base-content/30 italic">
                {inst.error ? `Error: ${inst.error}` : "Loading…"}
              </div>
            ) : (
              <>
                {[
                  ["Workflow ID", wf.workflowId],
                  ["Definition", wf.definitionId],
                  ["Version", String(wf.version)],
                  ["Status", wf.status],
                  ["Reference", wf.reference ?? "—"],
                  ["Start Time", wf.startTime ? new Date(wf.startTime).toLocaleString() : "—"],
                  ["End Time", wf.endTime ? new Date(wf.endTime).toLocaleString() : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-xs text-base-content/40 w-24 flex-shrink-0">{label}</span>
                    <span className="text-xs font-mono text-base-content/80 break-all">{value}</span>
                  </div>
                ))}
                {inst.lastFetched && (
                  <div className="text-xs text-base-content/20 pt-2">
                    Last fetched: {new Date(inst.lastFetched).toLocaleTimeString()}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Data */}
        {tab === "data" && (
          <div>
            {!wf?.data ? (
              <div className="text-xs text-base-content/30 italic">No data available</div>
            ) : (
              <pre className="text-xs font-mono bg-base-300 rounded-lg p-3 overflow-auto whitespace-pre-wrap break-all text-success/80">
                {JSON.stringify(wf.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Events */}
        {tab === "events" && (
          <div className="space-y-3">
            <p className="text-xs text-base-content/50">
              Publish an event to wake a <code className="text-xs bg-base-300 px-1 rounded">WaitFor</code> step.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="form-control">
                <label className="label py-0.5"><span className="label-text text-xs font-semibold">Event Name</span></label>
                <input
                  className="input input-xs input-bordered font-mono"
                  placeholder="discount-financier-decision"
                  value={evtName}
                  onChange={(e) => setEvtName(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label py-0.5"><span className="label-text text-xs font-semibold">Event Key</span></label>
                <input
                  className="input input-xs input-bordered font-mono"
                  placeholder={workflowId.slice(0, 16) + "…"}
                  value={evtKey}
                  onChange={(e) => setEvtKey(e.target.value)}
                />
              </div>
            </div>
            {wf?.data?.UniqueIdentifier && (
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => setEvtKey(wf!.data.UniqueIdentifier as string)}
              >
                ← Use data.UniqueIdentifier
              </button>
            )}
            <JsonTextarea label="Event Data" value={evtData} onChange={setEvtData} />
            <button
              className="btn btn-sm btn-primary w-full"
              onClick={handlePublishEvent}
              disabled={loading || !evtName || !evtKey}
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : "📡 Publish Event"}
            </button>
          </div>
        )}

        {/* Activity */}
        {tab === "activity" && (
          <div className="space-y-3">
            <p className="text-xs text-base-content/50">
              Fetch a pending activity token, then submit a result.
            </p>
            {!actToken ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-control">
                    <label className="label py-0.5"><span className="label-text text-xs font-semibold">Activity Name</span></label>
                    <input
                      className="input input-xs input-bordered font-mono"
                      placeholder="createDiscountFlow"
                      value={actName}
                      onChange={(e) => setActName(e.target.value)}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-0.5"><span className="label-text text-xs font-semibold">Worker ID</span></label>
                    <input
                      className="input input-xs input-bordered font-mono"
                      value={actWorkerId}
                      onChange={(e) => setActWorkerId(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-outline w-full"
                  onClick={handleFetchActivity}
                  disabled={loading || !actName}
                >
                  {loading ? <span className="loading loading-spinner loading-xs" /> : "Fetch Pending Activity"}
                </button>
              </>
            ) : (
              <div
                className="rounded-lg p-3 space-y-3"
                style={{ background: "#06b6d415", border: "1px solid #06b6d433" }}
              >
                <div className="text-xs font-bold text-cyan-400">Token Acquired ✓</div>
                <div className="text-xs font-mono text-base-content/50 break-all">
                  {actToken.token.slice(0, 48)}…
                </div>
                <div className="text-xs text-base-content/40">
                  Expires: {new Date(actToken.tokenExpiry).toLocaleString()}
                </div>
                {Object.keys(actToken.parameters).length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-base-content/50 mb-1">Workflow Parameters:</div>
                    <pre className="text-xs bg-base-300 rounded p-2 overflow-auto max-h-24 font-mono">
                      {JSON.stringify(actToken.parameters, null, 2)}
                    </pre>
                  </div>
                )}
                <JsonTextarea label="Result Data" value={actResult} onChange={setActResult} rows={4} />
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-success flex-1" onClick={handleActivitySuccess} disabled={loading}>
                    {loading ? <span className="loading loading-spinner loading-xs" /> : "✓ Success"}
                  </button>
                  <button className="btn btn-sm btn-error flex-1" onClick={handleActivityFail} disabled={loading}>
                    {loading ? <span className="loading loading-spinner loading-xs" /> : "✕ Fail"}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={handleReleaseToken} disabled={loading} title="Release token">
                    ↩
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
