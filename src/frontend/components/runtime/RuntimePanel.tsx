"use client";
import { useState } from "react";
import { useConductorStore } from "@/store/conductorStore";
import ServerConfigPanel from "./ServerConfigPanel";
import InstanceList from "./InstanceList";
import InstanceDetail from "./InstanceDetail";
import {
  StartWorkflowModal,
  DeployDefinitionModal,
  PublishEventModal,
  ActivityManagerModal,
  CustomStepModal,
} from "./ActionModals";

type Modal = "start" | "deploy" | "event" | "activity" | "customstep" | null;

export default function RuntimePanel() {
  const { runtimeOpen, setRuntimeOpen, connected } = useConductorStore();
  const [modal, setModal] = useState<Modal>(null);

  if (!runtimeOpen) {
    return (
      <button
        onClick={() => setRuntimeOpen(true)}
        className="fixed bottom-6 right-6 z-40 btn btn-primary btn-circle shadow-2xl"
        title="Open Runtime Panel"
        style={{ boxShadow: "0 0 20px rgba(99,102,241,0.5)" }}
      >
        <span style={{ fontSize: 20 }}>⚡</span>
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
        onClick={() => setRuntimeOpen(false)}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-40 flex flex-col bg-base-200 border-l border-base-300 shadow-2xl"
        style={{ width: "min(860px, 95vw)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-base-300 flex-shrink-0"
          style={{ background: "linear-gradient(90deg, #0f172a, #1e293b)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <span className="font-bold text-primary tracking-tight">Runtime</span>
            <div
              className={`badge badge-xs ${connected ? "badge-success" : "badge-ghost"}`}
            >
              {connected ? "connected" : "disconnected"}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              className="btn btn-xs btn-outline"
              onClick={() => setModal("deploy")}
              title="Deploy definition to server"
              disabled={!connected}
            >
              ☁ Deploy
            </button>
            <button
              className="btn btn-xs btn-primary"
              onClick={() => setModal("start")}
              title="Start a workflow instance"
              disabled={!connected}
            >
              ▶ Start
            </button>
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => setModal("event")}
              title="Publish event"
              disabled={!connected}
            >
              📡 Event
            </button>
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => setModal("activity")}
              title="Manage activity"
              disabled={!connected}
            >
              ⚙ Activity
            </button>
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => setModal("customstep")}
              title="Register custom step"
              disabled={!connected}
            >
              🐍 Step
            </button>
            <div className="divider divider-horizontal mx-1" />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setRuntimeOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body: 3-column layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Server config */}
          <div
            className="w-52 flex-shrink-0 border-r border-base-300 overflow-y-auto"
            style={{ background: "#0d1117" }}
          >
            <ServerConfigPanel />
            <div className="divider my-0" />
            <InstanceList />
          </div>

          {/* Right: Instance detail */}
          <div className="flex-1 overflow-hidden flex">
            <InstanceDetail />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === "start" && <StartWorkflowModal onClose={() => setModal(null)} />}
      {modal === "deploy" && <DeployDefinitionModal onClose={() => setModal(null)} />}
      {modal === "event" && <PublishEventModal onClose={() => setModal(null)} />}
      {modal === "activity" && <ActivityManagerModal onClose={() => setModal(null)} />}
      {modal === "customstep" && <CustomStepModal onClose={() => setModal(null)} />}
    </>
  );
}
