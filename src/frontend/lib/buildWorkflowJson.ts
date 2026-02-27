import { Node, Edge } from "reactflow";
import { NodeData, WorkflowMeta } from "@/types/workflow";

function kvArrToObj(pairs: { key: string; value: string }[]) {
  const obj: Record<string, string> = {};
  for (const p of pairs) {
    if (p.key.trim()) obj[p.key.trim()] = p.value;
  }
  return obj;
}

export function buildWorkflowJson(
  meta: WorkflowMeta,
  nodes: Node<NodeData>[],
  edges: Edge[]
): object {
  const steps: object[] = [];

  for (const node of nodes) {
    const d = node.data;
    const outEdges = edges.filter((e) => e.source === node.id);
    const step: Record<string, unknown> = { Id: d.stepId, StepType: d.stepType };

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
      const nextEdge = outEdges.find(
        (e) => e.sourceHandle === "next" || !e.sourceHandle?.startsWith("loop")
      );
      if (nextEdge) {
        const tgt = nodes.find((n) => n.id === nextEdge.target);
        if (tgt) step.NextStepId = tgt.data.stepId;
      }
      const inputs: Record<string, string> = {};
      if (d.whileCondition) inputs.Condition = d.whileCondition;
      Object.assign(inputs, kvArrToObj(d.inputs ?? []));
      if (Object.keys(inputs).length) step.Inputs = inputs;

      const doSteps = (d.whileSteps ?? []).map((ws) => {
        const s: Record<string, unknown> = { Id: ws.id, StepType: ws.stepType };
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
      const nextEdge = outEdges[0];
      if (nextEdge) {
        const tgt = nodes.find((n) => n.id === nextEdge.target);
        if (tgt) step.NextStepId = tgt.data.stepId;
      }
      const inputs: Record<string, string> = {};
      if (d.stepType === "EmitLog" && d.logMessage) inputs.Message = d.logMessage;
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
