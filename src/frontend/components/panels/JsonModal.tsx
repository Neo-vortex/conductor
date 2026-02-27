"use client";
import { useWorkflowStore } from "@/store/workflowStore";

export default function JsonModal() {
  const { jsonOutput, showJson, setShowJson } = useWorkflowStore();

  if (!showJson) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonOutput);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonOutput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal modal-open z-50">
      <div
        className="modal-box w-11/12 max-w-4xl flex flex-col"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary">Generated Workflow JSON</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowJson(false)}
          >
            ✕
          </button>
        </div>

        {/* JSON display */}
        <div className="flex-1 overflow-auto rounded-xl bg-base-300 border border-base-content/10">
          <pre className="p-4 text-sm font-mono text-success whitespace-pre overflow-x-auto">
            {jsonOutput}
          </pre>
        </div>

        {/* Footer actions */}
        <div className="modal-action mt-4">
          <button className="btn btn-sm btn-outline" onClick={handleCopy}>
            📋 Copy
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleDownload}>
            ⬇ Download JSON
          </button>
          <button className="btn btn-sm" onClick={() => setShowJson(false)}>
            Close
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className="modal-backdrop"
        onClick={() => setShowJson(false)}
      />
    </div>
  );
}
