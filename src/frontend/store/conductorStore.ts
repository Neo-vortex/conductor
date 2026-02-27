import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ServerConfig, TrackedInstance, WorkflowInstance } from "@/types/conductor";
import { getWorkflow, getInfo } from "@/lib/conductorApi";
import { v4 as uuidv4 } from "uuid";

interface ConductorStore {
  // ── Server config ──────────────────────────────────────────────────────────
  server: ServerConfig;
  connected: boolean;
  connecting: boolean;
  serverError: string | null;
  setServer: (s: Partial<ServerConfig>) => void;
  testConnection: () => Promise<boolean>;

  // ── Tracked instances ──────────────────────────────────────────────────────
  instances: TrackedInstance[];
  selectedInstanceId: string | null;
  setSelectedInstance: (id: string | null) => void;

  addInstance: (workflowId: string, definitionId: string, label?: string) => void;
  removeInstance: (workflowId: string) => void;
  refreshInstance: (workflowId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  setAutoRefresh: (workflowId: string, v: boolean) => void;
  updateInstanceData: (workflowId: string, instance: WorkflowInstance) => void;

  // ── Runtime panel visibility ───────────────────────────────────────────────
  runtimeOpen: boolean;
  setRuntimeOpen: (v: boolean) => void;
}

// ── polling registry ──────────────────────────────────────────────────────────
const pollingTimers: Record<string, ReturnType<typeof setInterval>> = {};

function startPolling(workflowId: string, store: () => ConductorStore) {
  if (pollingTimers[workflowId]) return;
  pollingTimers[workflowId] = setInterval(() => {
    const s = store();
    const inst = s.instances.find((i) => i.workflowId === workflowId);
    if (!inst?.autoRefresh) {
      stopPolling(workflowId);
      return;
    }
    // Don't poll completed/terminated
    if (inst.instance?.status === "Complete" || inst.instance?.status === "Terminated") {
      stopPolling(workflowId);
      return;
    }
    s.refreshInstance(workflowId);
  }, 3000);
}

function stopPolling(workflowId: string) {
  if (pollingTimers[workflowId]) {
    clearInterval(pollingTimers[workflowId]);
    delete pollingTimers[workflowId];
  }
}

export const useConductorStore = create<ConductorStore>()(
  persist(
    (set, get) => ({
      server: { baseUrl: "http://localhost:5001", token: "" },
      connected: false,
      connecting: false,
      serverError: null,

      setServer: (s) =>
        set((state) => ({
          server: { ...state.server, ...s },
          connected: false,
          serverError: null,
        })),

      testConnection: async () => {
        set({ connecting: true, serverError: null });
        try {
          await getInfo(get().server);
          set({ connected: true, connecting: false });
          return true;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          set({ connected: false, connecting: false, serverError: msg });
          return false;
        }
      },

      instances: [],
      selectedInstanceId: null,

      setSelectedInstance: (id) => set({ selectedInstanceId: id }),

      addInstance: (workflowId, definitionId, label) => {
        const existing = get().instances.find((i) => i.workflowId === workflowId);
        if (existing) {
          set({ selectedInstanceId: workflowId });
          return;
        }
        const inst: TrackedInstance = {
          workflowId,
          definitionId,
          label: label ?? definitionId,
          instance: null,
          lastFetched: null,
          autoRefresh: true,
          error: null,
        };
        set((s) => ({ instances: [inst, ...s.instances], selectedInstanceId: workflowId }));
        // Kick off an immediate fetch + polling
        get().refreshInstance(workflowId);
        startPolling(workflowId, get);
      },

      removeInstance: (workflowId) => {
        stopPolling(workflowId);
        set((s) => ({
          instances: s.instances.filter((i) => i.workflowId !== workflowId),
          selectedInstanceId:
            s.selectedInstanceId === workflowId ? null : s.selectedInstanceId,
        }));
      },

      refreshInstance: async (workflowId) => {
        const { server } = get();
        try {
          const data = await getWorkflow(server, workflowId);
          set((s) => ({
            instances: s.instances.map((i) =>
              i.workflowId === workflowId
                ? { ...i, instance: data, lastFetched: Date.now(), error: null }
                : i
            ),
          }));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          set((s) => ({
            instances: s.instances.map((i) =>
              i.workflowId === workflowId ? { ...i, error: msg } : i
            ),
          }));
        }
      },

      refreshAll: async () => {
        const { instances } = get();
        await Promise.all(instances.map((i) => get().refreshInstance(i.workflowId)));
      },

      setAutoRefresh: (workflowId, v) => {
        set((s) => ({
          instances: s.instances.map((i) =>
            i.workflowId === workflowId ? { ...i, autoRefresh: v } : i
          ),
        }));
        if (v) startPolling(workflowId, get);
        else stopPolling(workflowId);
      },

      updateInstanceData: (workflowId, instance) => {
        set((s) => ({
          instances: s.instances.map((i) =>
            i.workflowId === workflowId
              ? { ...i, instance, lastFetched: Date.now(), error: null }
              : i
          ),
        }));
      },

      runtimeOpen: false,
      setRuntimeOpen: (v) => set({ runtimeOpen: v }),
    }),
    {
      name: "conductor-store",
      partialize: (s) => ({
        server: s.server,
        instances: s.instances.map((i) => ({ ...i, autoRefresh: false })), // don't auto-start polling on restore
      }),
    }
  )
);
