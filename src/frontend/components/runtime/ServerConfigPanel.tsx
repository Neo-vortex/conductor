"use client";
import { useState } from "react";
import { useConductorStore } from "@/store/conductorStore";

export default function ServerConfigPanel() {
  const { server, setServer, testConnection, connected, connecting, serverError } =
    useConductorStore();
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2">
        Conductor Server
      </div>

      {/* Base URL */}
      <div className="form-control">
        <label className="label py-0.5">
          <span className="label-text text-xs">Base URL</span>
        </label>
        <input
          className="input input-sm input-bordered font-mono"
          placeholder="http://localhost:5001"
          value={server.baseUrl}
          onChange={(e) => setServer({ baseUrl: e.target.value })}
        />
      </div>

      {/* Token */}
      <div className="form-control">
        <label className="label py-0.5">
          <span className="label-text text-xs">Bearer Token (optional)</span>
          <button
            className="label-text-alt text-xs text-base-content/40 hover:text-base-content cursor-pointer"
            onClick={() => setShowToken((v) => !v)}
          >
            {showToken ? "hide" : "show"}
          </button>
        </label>
        <input
          className="input input-sm input-bordered font-mono text-xs"
          type={showToken ? "text" : "password"}
          placeholder="eyJ..."
          value={server.token ?? ""}
          onChange={(e) => setServer({ token: e.target.value })}
        />
      </div>

      {/* Connect button */}
      <button
        className={`btn btn-sm w-full ${connected ? "btn-success" : "btn-primary"}`}
        onClick={testConnection}
        disabled={connecting}
      >
        {connecting ? (
          <span className="loading loading-spinner loading-xs" />
        ) : connected ? (
          "✓ Connected"
        ) : (
          "Connect"
        )}
      </button>

      {/* Error */}
      {serverError && (
        <div className="alert alert-error py-2 text-xs">
          <span>⚠ {serverError}</span>
        </div>
      )}

      {connected && (
        <div className="text-xs text-success/80 text-center">
          Server reachable ✓
        </div>
      )}
    </div>
  );
}
