"use client";
import dynamic from "next/dynamic";

const WorkflowBuilder = dynamic(() => import("@/components/WorkflowBuilder"), {
  ssr: false,
});

export default function Home() {
  return <WorkflowBuilder />;
}
