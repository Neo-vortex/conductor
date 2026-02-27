"use client";
import { useCallback, useRef, useState, useEffect } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import { useWorkflowStore } from "@/store/workflowStore";
import WorkflowNode from "./nodes/WorkflowNode";
import Sidebar from "./panels/Sidebar";
import PropertiesPanel from "./panels/PropertiesPanel";
import Toolbar from "./panels/Toolbar";
import JsonModal from "./panels/JsonModal";
import RuntimePanel from "./runtime/RuntimePanel";

const nodeTypes = { workflowNode: WorkflowNode };

const PROPS_MIN = 240;
const PROPS_MAX = 600;
const PROPS_DEFAULT = 288; // 72 * 4 = w-72

// ── Inner canvas ───────────────────────────────────────────────────────────────
function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, setSelectedNode } =
    useWorkflowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const stepType = e.dataTransfer.getData("application/workflow-step");
      if (!stepType) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(stepType, position);
    },
    [addNode, screenToFlowPosition]
  );

  const onPaneClick = useCallback(() => setSelectedNode(null), [setSelectedNode]);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        defaultEdgeOptions={{ animated: false, style: { stroke: "#6366f1", strokeWidth: 2 } }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#334155" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const c: Record<string, string> = {
              EmitLog: "#6366f1", Activity: "#06b6d4",
              WaitFor: "#f59e0b", Decide: "#10b981", While: "#ec4899",
            };
            return c[n.data?.stepType] ?? "#6366f1";
          }}
          maskColor="#0d111788"
        />
      </ReactFlow>
    </div>
  );
}

// ── Resizable divider ──────────────────────────────────────────────────────────
interface ResizeHandleProps {
  onResize: (delta: number) => void;
  isResizing: boolean;
  setIsResizing: (v: boolean) => void;
}

function ResizeHandle({ onResize, isResizing, setIsResizing }: ResizeHandleProps) {
  const startX = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      // Moving left → panel grows (positive delta when moving left)
      const delta = startX.current - e.clientX;
      startX.current = e.clientX;
      onResize(delta);
    };

    const onMouseUp = () => setIsResizing(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, onResize, setIsResizing]);

  return (
    <div
      onMouseDown={onMouseDown}
      title="Drag to resize panel"
      style={{
        width: 6,
        flexShrink: 0,
        cursor: "col-resize",
        background: isResizing ? "#6366f1" : "transparent",
        borderLeft: "1px solid",
        borderColor: isResizing ? "#6366f1" : "#1e293b",
        transition: "background 0.15s, border-color 0.15s",
        position: "relative",
        zIndex: 30,
      }}
      className="group hover:bg-indigo-500/30 hover:border-indigo-500"
    >
      {/* Visual grip dots */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          opacity: isResizing ? 1 : 0,
          transition: "opacity 0.15s",
        }}
        className="group-hover:opacity-100"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "#6366f1",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function WorkflowBuilder() {
  const [propsPanelWidth, setPropsPanelWidth] = useState(PROPS_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);

  const handleResize = useCallback((delta: number) => {
    setPropsPanelWidth((w) => Math.min(PROPS_MAX, Math.max(PROPS_MIN, w + delta)));
  }, []);

  return (
    <ReactFlowProvider>
      {/* Suppress text selection while resizing */}
      <div
        className="flex flex-col h-screen bg-base-100 overflow-hidden"
        style={{ userSelect: isResizing ? "none" : undefined }}
      >
        <Toolbar />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <Canvas />

          <ResizeHandle
            onResize={handleResize}
            isResizing={isResizing}
            setIsResizing={setIsResizing}
          />

          {/* Properties panel with dynamic width */}
          <div style={{ width: propsPanelWidth, flexShrink: 0 }} className="h-full overflow-hidden">
            <PropertiesPanel />
          </div>
        </div>

        <JsonModal />
        <RuntimePanel />
      </div>
    </ReactFlowProvider>
  );
}
