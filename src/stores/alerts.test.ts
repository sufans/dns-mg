import { describe, it, expect, beforeEach } from 'vitest';
import { useAlertsStore } from './alerts';

describe('useAlertsStore', () => {
  beforeEach(() => {
    useAlertsStore.getState().clearAlerts();
  });

  it('starts with empty alerts', () => {
    expect(useAlertsStore.getState().alerts).toHaveLength(0);
  });

  it('addAlert creates an alert with auto-generated id and timestamp', () => {
    useAlertsStore.getState().addAlert({
      type: 'rate_limit',
      severity: 'warning',
      message: 'Rate limit exceeded',
    });
    const alerts = useAlertsStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('rate_limit');
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].message).toBe('Rate limit exceeded');
    expect(alerts[0].acknowledged).toBe(false);
    expect(alerts[0].id).toBeTruthy();
    expect(alerts[0].createdAt).toBeTruthy();
  });

  it('acknowledgeAlert marks alert as read', () => {
    useAlertsStore.getState().addAlert({ type: 'rate_limit', severity: 'warning', message: 'Test' });
    const alertId = useAlertsStore.getState().alerts[0].id;
    useAlertsStore.getState().acknowledgeAlert(alertId);
    expect(useAlertsStore.getState().alerts[0].acknowledged).toBe(true);
  });

  it('acknowledgeAll marks all alerts as read', () => {
    useAlertsStore.getState().addAlert({ type: 'rate_limit', severity: 'warning', message: 'A1' });
    useAlertsStore.getState().addAlert({ type: 'credential_invalid', severity: 'critical', message: 'A2' });
    useAlertsStore.getState().acknowledgeAll();
    expect(useAlertsStore.getState().alerts.every(a => a.acknowledged)).toBe(true);
  });

  it('getUnreadCount returns count of unacknowledged alerts', () => {
    useAlertsStore.getState().addAlert({ type: 'rate_limit', severity: 'warning', message: 'A1' });
    useAlertsStore.getState().addAlert({ type: 'credential_invalid', severity: 'critical', message: 'A2' });
    expect(useAlertsStore.getState().getUnreadCount()).toBe(2);
    useAlertsStore.getState().acknowledgeAlert(useAlertsStore.getState().alerts[0].id);
    expect(useAlertsStore.getState().getUnreadCount()).toBe(1);
  });

  it('getAlerts filters by type', () => {
    useAlertsStore.getState().addAlert({ type: 'rate_limit', severity: 'warning', message: 'A1' });
    useAlertsStore.getState().addAlert({ type: 'credential_invalid', severity: 'critical', message: 'A2' });
    const filtered = useAlertsStore.getState().getAlerts({ type: 'rate_limit' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('rate_limit');
  });

  it('clearAlerts removes all alerts', () => {
    useAlertsStore.getState().addAlert({ type: 'rate_limit', severity: 'warning', message: 'A1' });
    useAlertsStore.getState().clearAlerts();
    expect(useAlertsStore.getState().alerts).toHaveLength(0);
  });
});
