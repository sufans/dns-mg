import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OperationLog } from '../types';

// Generate unique ID
function generateId(): string {
  return `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface LogFilters {
  action?: OperationLog['action'];
  result?: OperationLog['result'];
  operator?: string;
  search?: string;
}

interface LogsState {
  logs: OperationLog[];

  addLog: (log: Omit<OperationLog, 'id' | 'timestamp'>) => OperationLog;
  recordOperation: (action: OperationLog['action'], target: string, result: OperationLog['result'], detail?: string) => void;
  getLogs: (filters?: LogFilters) => OperationLog[];
  clearLogs: () => void;
}

export const useLogsStore = create<LogsState>()(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (log) => {
        const newLog: OperationLog = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          ...log,
        };

        set((state) => ({
          logs: [newLog, ...state.logs],
        }));

        return newLog;
      },

      recordOperation: (action, target, result, detail) => {
        get().addLog({
          operator: 'admin',
          action,
          target,
          result,
          detail: detail ?? null,
        });
      },

      getLogs: (filters) => {
        const { logs } = get();
        if (!filters) return logs;

        return logs.filter((log) => {
          if (filters.action && log.action !== filters.action) return false;
          if (filters.result && log.result !== filters.result) return false;
          if (filters.operator && log.operator !== filters.operator) return false;
          if (filters.search) {
            const q = filters.search.toLowerCase();
            const matchesTarget = log.target.toLowerCase().includes(q);
            const matchesDetail = log.detail?.toLowerCase().includes(q) ?? false;
            if (!matchesTarget && !matchesDetail) return false;
          }
          return true;
        });
      },

      clearLogs: () => {
        set({ logs: [] });
      },
    }),
    {
      name: 'dns-mgr-logs',
    }
  )
);
