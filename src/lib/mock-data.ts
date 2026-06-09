import type { OperationLog, DnsheQuota, ProviderType } from '../types';

const now = new Date();
const monthsAgo = (months: number): string => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
};

export interface MockAccount {
  id: string;
  provider: ProviderType;
  label: string;
  status: 'valid' | 'invalid' | 'unconfigured';
  lastVerified: string | null;
  createdAt: string;
  domainCount: number;
  requestCount: number;
  requestLimit: number;
}

export const mockAccounts: MockAccount[] = [
  { id: 'acc1', provider: 'dnshe', label: 'DNSHE 主账号', status: 'valid', lastVerified: new Date(now.getTime() - 3600000).toISOString(), createdAt: monthsAgo(6), domainCount: 11, requestCount: 8450, requestLimit: 30000 },
  { id: 'acc2', provider: 'dnshe', label: 'DNSHE 备用账号', status: 'valid', lastVerified: new Date(now.getTime() - 7200000).toISOString(), createdAt: monthsAgo(3), domainCount: 3, requestCount: 2100, requestLimit: 15000 },
  { id: 'acc3', provider: 'dnsneko', label: 'DNSNeko 主账号', status: 'valid', lastVerified: new Date(now.getTime() - 1800000).toISOString(), createdAt: monthsAgo(5), domainCount: 7, requestCount: 5320, requestLimit: 0 },
  { id: 'acc4', provider: 'dnsneko', label: 'DNSNeko 测试账号', status: 'invalid', lastVerified: new Date(now.getTime() - 86400000).toISOString(), createdAt: monthsAgo(2), domainCount: 0, requestCount: 0, requestLimit: 0 },
  { id: 'acc5', provider: 'dnshe', label: 'DNSHE 开发账号', status: 'valid', lastVerified: new Date(now.getTime() - 600000).toISOString(), createdAt: monthsAgo(1), domainCount: 2, requestCount: 980, requestLimit: 10000 },
  { id: 'acc6', provider: 'dnsneko', label: 'DNSNeko 生产账号', status: 'valid', lastVerified: new Date(now.getTime() - 5400000).toISOString(), createdAt: monthsAgo(4), domainCount: 5, requestCount: 4150, requestLimit: 0 },
];

export const mockDailyRequests = [
  { day: '周一', requests: 1230, errors: 12 },
  { day: '周二', requests: 1450, errors: 8 },
  { day: '周三', requests: 980, errors: 15 },
  { day: '周四', requests: 1680, errors: 5 },
  { day: '周五', requests: 1520, errors: 10 },
  { day: '周六', requests: 640, errors: 3 },
  { day: '周日', requests: 520, errors: 2 },
];

export interface MockRecentCall {
  id: string;
  timestamp: string;
  provider: ProviderType;
  account: string;
  method: string;
  path: string;
  status: number;
  duration: number;
}

export const mockRecentCalls: MockRecentCall[] = [
  { id: 'call1', timestamp: new Date(now.getTime() - 30000).toISOString(), provider: 'dnshe', account: 'DNSHE 主账号', method: 'GET', path: '/domains', status: 200, duration: 145 },
  { id: 'call2', timestamp: new Date(now.getTime() - 60000).toISOString(), provider: 'dnsneko', account: 'DNSNeko 主账号', method: 'GET', path: '/dns/list', status: 200, duration: 230 },
  { id: 'call3', timestamp: new Date(now.getTime() - 120000).toISOString(), provider: 'dnshe', account: 'DNSHE 主账号', method: 'POST', path: '/records', status: 201, duration: 189 },
  { id: 'call4', timestamp: new Date(now.getTime() - 180000).toISOString(), provider: 'dnshe', account: 'DNSHE 备用账号', method: 'PUT', path: '/records/rec-001', status: 200, duration: 156 },
  { id: 'call5', timestamp: new Date(now.getTime() - 300000).toISOString(), provider: 'dnsneko', account: 'DNSNeko 生产账号', method: 'GET', path: '/dns/records', status: 200, duration: 312 },
  { id: 'call6', timestamp: new Date(now.getTime() - 600000).toISOString(), provider: 'dnshe', account: 'DNSHE 开发账号', method: 'DELETE', path: '/records/rec-050', status: 200, duration: 134 },
  { id: 'call7', timestamp: new Date(now.getTime() - 900000).toISOString(), provider: 'dnsneko', account: 'DNSNeko 主账号', method: 'POST', path: '/dns/records', status: 400, duration: 89 },
  { id: 'call8', timestamp: new Date(now.getTime() - 1200000).toISOString(), provider: 'dnshe', account: 'DNSHE 主账号', method: 'GET', path: '/domains/1/records', status: 200, duration: 201 },
  { id: 'call9', timestamp: new Date(now.getTime() - 1800000).toISOString(), provider: 'dnsneko', account: 'DNSNeko 生产账号', method: 'PUT', path: '/dns/records/neko-001', status: 200, duration: 278 },
  { id: 'call10', timestamp: new Date(now.getTime() - 2400000).toISOString(), provider: 'dnshe', account: 'DNSHE 主账号', method: 'GET', path: '/quota', status: 200, duration: 98 },
];

export const mockOperationLogs: OperationLog[] = [
  { id: 'log1', timestamp: new Date(now.getTime() - 2 * 60000).toISOString(), operator: 'admin', action: 'login', target: 'admin', result: 'success', detail: 'IP: 192.168.1.100' },
  { id: 'log2', timestamp: new Date(now.getTime() - 5 * 60000).toISOString(), operator: 'admin', action: 'edit_account', target: 'DNSHE 主账号', result: 'success', detail: '更新标签: 旧标签 → 新标签' },
  { id: 'log3', timestamp: new Date(now.getTime() - 15 * 60000).toISOString(), operator: 'admin', action: 'test_connection', target: 'DNSNeko 主账号', result: 'success', detail: '连接测试成功，延迟 230ms' },
  { id: 'log4', timestamp: new Date(now.getTime() - 30 * 60000).toISOString(), operator: 'admin', action: 'add_account', target: 'DNSHE 开发账号', result: 'success', detail: '新增 DNSHE 平台账号' },
  { id: 'log5', timestamp: new Date(now.getTime() - 45 * 60000).toISOString(), operator: 'admin', action: 'set_default', target: 'DNSNeko 生产账号', result: 'success', detail: '设为 DNSNeko 默认账号' },
  { id: 'log6', timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(), operator: 'admin', action: 'delete_account', target: 'DNSHE 旧账号', result: 'success', detail: '已删除账号及关联凭证' },
  { id: 'log7', timestamp: new Date(now.getTime() - 3 * 3600000).toISOString(), operator: 'admin', action: 'test_connection', target: 'DNSNeko 测试账号', result: 'failure', detail: 'API Key 无效或已过期' },
  { id: 'log8', timestamp: new Date(now.getTime() - 4 * 3600000).toISOString(), operator: 'admin', action: 'edit_account', target: 'DNSHE 备用账号', result: 'success', detail: '更新 API Secret' },
  { id: 'log9', timestamp: new Date(now.getTime() - 6 * 3600000).toISOString(), operator: 'admin', action: 'update_settings', target: '系统设置', result: 'success', detail: '更新请求速率限制: 30 → 50 次/分钟' },
  { id: 'log10', timestamp: new Date(now.getTime() - 8 * 3600000).toISOString(), operator: 'admin', action: 'change_password', target: 'admin', result: 'success', detail: '密码已更新' },
  { id: 'log11', timestamp: new Date(now.getTime() - 10 * 3600000).toISOString(), operator: 'admin', action: 'add_account', target: 'DNSNeko 生产账号', result: 'success', detail: '新增 DNSNeko 平台账号' },
  { id: 'log12', timestamp: new Date(now.getTime() - 12 * 3600000).toISOString(), operator: 'admin', action: 'login', target: 'admin', result: 'failure', detail: '密码错误' },
  { id: 'log13', timestamp: new Date(now.getTime() - 18 * 3600000).toISOString(), operator: 'admin', action: 'set_default', target: 'DNSHE 主账号', result: 'success', detail: '设为 DNSHE 默认账号' },
  { id: 'log14', timestamp: new Date(now.getTime() - 24 * 3600000).toISOString(), operator: 'admin', action: 'edit_account', target: 'DNSNeko 主账号', result: 'success', detail: '更新备注信息' },
  { id: 'log15', timestamp: new Date(now.getTime() - 30 * 3600000).toISOString(), operator: 'admin', action: 'update_settings', target: '系统设置', result: 'success', detail: '启用自动重试功能' },
  { id: 'log16', timestamp: new Date(now.getTime() - 36 * 3600000).toISOString(), operator: 'admin', action: 'test_connection', target: 'DNSHE 主账号', result: 'success', detail: '连接测试成功，延迟 145ms' },
  { id: 'log17', timestamp: new Date(now.getTime() - 48 * 3600000).toISOString(), operator: 'admin', action: 'delete_account', target: 'DNSNeko 废弃账号', result: 'failure', detail: '账号不存在或已被删除' },
  { id: 'log18', timestamp: new Date(now.getTime() - 60 * 3600000).toISOString(), operator: 'admin', action: 'add_account', target: 'DNSHE 备用账号', result: 'success', detail: '新增 DNSHE 平台账号' },
  { id: 'log19', timestamp: new Date(now.getTime() - 72 * 3600000).toISOString(), operator: 'admin', action: 'login', target: 'admin', result: 'success', detail: 'IP: 10.0.0.55' },
  { id: 'log20', timestamp: new Date(now.getTime() - 96 * 3600000).toISOString(), operator: 'admin', action: 'change_password', target: 'admin', result: 'success', detail: '密码已更新' },
  { id: 'log21', timestamp: new Date(now.getTime() - 120 * 3600000).toISOString(), operator: 'admin', action: 'edit_account', target: 'DNSHE 开发账号', result: 'success', detail: '更新 API Key' },
  { id: 'log22', timestamp: new Date(now.getTime() - 144 * 3600000).toISOString(), operator: 'admin', action: 'update_settings', target: '系统设置', result: 'failure', detail: '配置保存失败：存储服务不可用' },
  { id: 'log23', timestamp: new Date(now.getTime() - 168 * 3600000).toISOString(), operator: 'admin', action: 'test_connection', target: 'DNSHE 备用账号', result: 'success', detail: '连接测试成功，延迟 98ms' },
  { id: 'log24', timestamp: new Date(now.getTime() - 192 * 3600000).toISOString(), operator: 'admin', action: 'add_account', target: 'DNSNeko 测试账号', result: 'success', detail: '新增 DNSNeko 平台账号' },
  { id: 'log25', timestamp: new Date(now.getTime() - 216 * 3600000).toISOString(), operator: 'admin', action: 'set_default', target: 'DNSHE 备用账号', result: 'failure', detail: '账号状态无效，无法设为默认' },
];

export const mockDnsheQuota: DnsheQuota = {
  used: 11,
  base: 10,
  inviteBonus: 5,
  total: 15,
  available: 4,
};
