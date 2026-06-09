import { describe, it, expect, beforeEach } from 'vitest';
import { useLogsStore } from './logs';

describe('useLogsStore', () => {
  beforeEach(() => {
    useLogsStore.setState({ logs: [] });
  });

  it('initial state has empty logs', () => {
    const store = useLogsStore.getState();
    expect(store.logs).toEqual([]);
  });

  it('addLog creates a log entry with auto-generated id and timestamp', () => {
    const store = useLogsStore.getState();
    const log = store.addLog({
      operator: 'admin',
      action: 'add_account',
      target: 'DNSHE 账号 1',
      result: 'success',
      detail: '添加了新账号',
    });

    expect(log.id).toMatch(/^log_/);
    expect(log.timestamp).toBeTruthy();
    expect(log.operator).toBe('admin');
    expect(log.action).toBe('add_account');
    expect(log.target).toBe('DNSHE 账号 1');
    expect(log.result).toBe('success');
    expect(log.detail).toBe('添加了新账号');

    const logs = useLogsStore.getState().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe(log.id);
  });

  it('clearLogs removes all logs', () => {
    const store = useLogsStore.getState();
    store.addLog({
      operator: 'admin',
      action: 'login',
      target: '系统',
      result: 'success',
      detail: null,
    });
    store.addLog({
      operator: 'admin',
      action: 'logout',
      target: '系统',
      result: 'success',
      detail: null,
    });

    expect(useLogsStore.getState().logs).toHaveLength(2);

    useLogsStore.getState().clearLogs();

    expect(useLogsStore.getState().logs).toEqual([]);
  });

  it('getLogs with no filters returns all logs', () => {
    const store = useLogsStore.getState();
    store.addLog({
      operator: 'admin',
      action: 'add_account',
      target: 'Account A',
      result: 'success',
      detail: null,
    });
    store.addLog({
      operator: 'user1',
      action: 'delete_account',
      target: 'Account B',
      result: 'failure',
      detail: '权限不足',
    });

    const allLogs = useLogsStore.getState().getLogs();
    expect(allLogs).toHaveLength(2);
  });

  it('getLogs filters by action', () => {
    const store = useLogsStore.getState();
    store.addLog({
      operator: 'admin',
      action: 'add_account',
      target: 'Account A',
      result: 'success',
      detail: null,
    });
    store.addLog({
      operator: 'admin',
      action: 'delete_account',
      target: 'Account B',
      result: 'success',
      detail: null,
    });

    const filtered = useLogsStore.getState().getLogs({ action: 'add_account' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].action).toBe('add_account');
  });

  it('getLogs filters by result', () => {
    const store = useLogsStore.getState();
    store.addLog({
      operator: 'admin',
      action: 'add_account',
      target: 'Account A',
      result: 'success',
      detail: null,
    });
    store.addLog({
      operator: 'admin',
      action: 'test_connection',
      target: 'Account B',
      result: 'failure',
      detail: '连接超时',
    });

    const failures = useLogsStore.getState().getLogs({ result: 'failure' });
    expect(failures).toHaveLength(1);
    expect(failures[0].result).toBe('failure');
  });

  it('getLogs filters by search query matching target or detail', () => {
    const store = useLogsStore.getState();
    store.addLog({
      operator: 'admin',
      action: 'add_account',
      target: 'DNSHE 账号 1',
      result: 'success',
      detail: '添加成功',
    });
    store.addLog({
      operator: 'admin',
      action: 'edit_account',
      target: 'DNSNeko 账号 2',
      result: 'success',
      detail: '修改了凭证',
    });

    const results = useLogsStore.getState().getLogs({ search: 'DNSHE' });
    expect(results).toHaveLength(1);
    expect(results[0].target).toContain('DNSHE');

    const detailResults = useLogsStore.getState().getLogs({ search: '凭证' });
    expect(detailResults).toHaveLength(1);
    expect(detailResults[0].detail).toContain('凭证');
  });

  it('addLog prepends new logs (most recent first)', () => {
    const store = useLogsStore.getState();
    const first = store.addLog({
      operator: 'admin',
      action: 'login',
      target: '系统',
      result: 'success',
      detail: null,
    });
    const second = store.addLog({
      operator: 'admin',
      action: 'logout',
      target: '系统',
      result: 'success',
      detail: null,
    });

    const logs = useLogsStore.getState().logs;
    expect(logs[0].id).toBe(second.id);
    expect(logs[1].id).toBe(first.id);
  });
});
