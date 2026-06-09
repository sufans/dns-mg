import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Alert, AlertType, AlertSeverity } from '../types';

function generateAlertId(): string {
  return `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface AlertsState {
  alerts: Alert[];

  addAlert: (params: { type: AlertType; severity: AlertSeverity; message: string; accountId?: string; accountLabel?: string }) => void;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;
  clearAlerts: () => void;
  getUnreadCount: () => number;
  getAlerts: (filters?: { type?: AlertType; severity?: AlertSeverity; acknowledged?: boolean }) => Alert[];
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],

      addAlert: (params) => {
        const alert: Alert = {
          id: generateAlertId(),
          type: params.type,
          severity: params.severity,
          message: params.message,
          accountId: params.accountId ?? null,
          accountLabel: params.accountLabel ?? null,
          createdAt: new Date().toISOString(),
          acknowledged: false,
        };
        set((state) => ({ alerts: [alert, ...state.alerts] }));
      },

      acknowledgeAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a),
        }));
      },

      acknowledgeAll: () => {
        set((state) => ({
          alerts: state.alerts.map(a => ({ ...a, acknowledged: true })),
        }));
      },

      clearAlerts: () => {
        set({ alerts: [] });
      },

      getUnreadCount: () => {
        return get().alerts.filter(a => !a.acknowledged).length;
      },

      getAlerts: (filters) => {
        let result = get().alerts;
        if (filters?.type) result = result.filter(a => a.type === filters.type);
        if (filters?.severity) result = result.filter(a => a.severity === filters.severity);
        if (filters?.acknowledged !== undefined) result = result.filter(a => a.acknowledged === filters.acknowledged);
        return result;
      },
    }),
    {
      name: 'dns-mgr-alerts',
    }
  )
);
