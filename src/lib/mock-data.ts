import type { UnifiedDomain, UnifiedDnsRecord, OperationLog, SyncTask, DnsheQuota } from '../types';

const now = new Date();
const daysFromNow = (days: number): string => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};
const monthsAgo = (months: number): string => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
};

export const mockDomains: UnifiedDomain[] = [
  { id: '1', name: 'example.com', provider: 'dnshe', status: 'active', expireTime: daysFromNow(180), recordCount: 8, createdAt: monthsAgo(6), subdomainId: 1001 },
  { id: '2', name: 'mysite.cn', provider: 'dnshe', status: 'active', expireTime: daysFromNow(25), recordCount: 5, createdAt: monthsAgo(5), subdomainId: 1002 },
  { id: '3', name: 'blog.dev', provider: 'dnsneko', status: 'active', expireTime: daysFromNow(90), recordCount: 6, createdAt: monthsAgo(4), domainId: 'neko-001' },
  { id: '4', name: 'shop.io', provider: 'dnshe', status: 'active', expireTime: daysFromNow(5), recordCount: 12, createdAt: monthsAgo(3), subdomainId: 1003 },
  { id: '5', name: 'api.tech', provider: 'dnsneko', status: 'active', expireTime: daysFromNow(200), recordCount: 4, createdAt: monthsAgo(3), domainId: 'neko-002' },
  { id: '6', name: 'docs.org', provider: 'dnshe', status: 'active', expireTime: daysFromNow(15), recordCount: 3, createdAt: monthsAgo(2), subdomainId: 1004 },
  { id: '7', name: 'mail.co', provider: 'dnsneko', status: 'expired', expireTime: daysFromNow(-10), recordCount: 2, createdAt: monthsAgo(8), domainId: 'neko-003' },
  { id: '8', name: 'cdn.net', provider: 'dnshe', status: 'active', expireTime: daysFromNow(300), recordCount: 7, createdAt: monthsAgo(1), subdomainId: 1005 },
  { id: '9', name: 'test.local', provider: 'dnsneko', status: 'active', expireTime: daysFromNow(120), recordCount: 3, createdAt: monthsAgo(1), domainId: 'neko-004' },
  { id: '10', name: 'dev.app', provider: 'dnshe', status: 'active', expireTime: daysFromNow(45), recordCount: 5, createdAt: monthsAgo(0), subdomainId: 1006 },
  { id: '11', name: 'news.today', provider: 'dnsneko', status: 'active', expireTime: daysFromNow(8), recordCount: 4, createdAt: monthsAgo(2), domainId: 'neko-005' },
  { id: '12', name: 'cloud.run', provider: 'dnshe', status: 'active', expireTime: daysFromNow(250), recordCount: 6, createdAt: monthsAgo(4), subdomainId: 1007 },
  { id: '13', name: 'data.info', provider: 'dnsneko', status: 'suspended', expireTime: daysFromNow(-5), recordCount: 1, createdAt: monthsAgo(7), domainId: 'neko-006' },
  { id: '14', name: 'img.host', provider: 'dnshe', status: 'active', expireTime: daysFromNow(60), recordCount: 3, createdAt: monthsAgo(1), subdomainId: 1008 },
  { id: '15', name: 'status.page', provider: 'dnsneko', status: 'active', expireTime: daysFromNow(150), recordCount: 2, createdAt: monthsAgo(3), domainId: 'neko-007' },
  { id: '16', name: 'auth.secure', provider: 'dnshe', status: 'active', expireTime: daysFromNow(22), recordCount: 4, createdAt: monthsAgo(0), subdomainId: 1009 },
  { id: '17', name: 'pay.finance', provider: 'dnsneko', status: 'active', expireTime: daysFromNow(80), recordCount: 5, createdAt: monthsAgo(2), domainId: 'neko-008' },
  { id: '18', name: 'chat.social', provider: 'dnshe', status: 'active', expireTime: daysFromNow(3), recordCount: 3, createdAt: monthsAgo(0), subdomainId: 1010 },
];

export const mockRecords: UnifiedDnsRecord[] = [
  { id: 'r1', domainId: '1', name: '@', type: 'A', value: '93.184.216.34', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-001' },
  { id: 'r2', domainId: '1', name: 'www', type: 'A', value: '93.184.216.34', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-002' },
  { id: 'r3', domainId: '1', name: '@', type: 'MX', value: 'mail.example.com', line: '默认', ttl: 3600, priority: 10, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnshe', recordId: 'rec-003' },
  { id: 'r4', domainId: '1', name: '@', type: 'TXT', value: 'v=spf1 include:_spf.example.com ~all', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnshe', recordId: 'rec-004' },
  { id: 'r5', domainId: '2', name: '@', type: 'A', value: '45.76.100.22', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-005' },
  { id: 'r6', domainId: '2', name: 'blog', type: 'CNAME', value: 'cdn.example.com', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-006' },
  { id: 'r7', domainId: '3', name: '@', type: 'A', value: '104.21.50.1', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r8', domainId: '3', name: 'www', type: 'AAAA', value: '2606:4700:3035::ac43:8cd', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r9', domainId: '4', name: '@', type: 'A', value: '172.67.180.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-009' },
  { id: 'r10', domainId: '4', name: 'api', type: 'A', value: '172.67.180.2', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-010' },
  { id: 'r11', domainId: '4', name: 'shop', type: 'CNAME', value: 'shopify.com', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-011' },
  { id: 'r12', domainId: '4', name: '@', type: 'MX', value: 'mx.shop.io', line: '默认', ttl: 3600, priority: 5, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-012' },
  { id: 'r13', domainId: '4', name: '@', type: 'TXT', value: 'v=spf1 include:_spf.shop.io ~all', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-013' },
  { id: 'r14', domainId: '5', name: '@', type: 'A', value: '76.223.100.5', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnsneko' },
  { id: 'r15', domainId: '5', name: 'api', type: 'A', value: '76.223.100.6', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnsneko' },
  { id: 'r16', domainId: '6', name: '@', type: 'A', value: '185.199.108.153', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-016' },
  { id: 'r17', domainId: '6', name: 'docs', type: 'CNAME', value: 'readme.io', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-017' },
  { id: 'r18', domainId: '7', name: '@', type: 'A', value: '0.0.0.0', line: '默认', ttl: 600, priority: null, status: 'paused', remark: '已过期', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r19', domainId: '8', name: '@', type: 'A', value: '104.18.30.1', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-019' },
  { id: 'r20', domainId: '8', name: 'cdn', type: 'CNAME', value: 'cdn.cloudflare.com', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-020' },
  { id: 'r21', domainId: '8', name: 'static', type: 'A', value: '104.18.30.2', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-021' },
  { id: 'r22', domainId: '8', name: '@', type: 'AAAA', value: '2606:4700:3035::ac43:900', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-022' },
  { id: 'r23', domainId: '8', name: '@', type: 'MX', value: 'mail.cdn.net', line: '默认', ttl: 3600, priority: 10, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-023' },
  { id: 'r24', domainId: '8', name: '@', type: 'TXT', value: 'v=spf1 include:_spf.cdn.net ~all', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-024' },
  { id: 'r25', domainId: '8', name: '_dmarc', type: 'TXT', value: 'v=DMARC1; p=none; rua=mailto:dmarc@cdn.net', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-025' },
  { id: 'r26', domainId: '9', name: '@', type: 'A', value: '127.0.0.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '测试', updatedAt: monthsAgo(0), provider: 'dnsneko' },
  { id: 'r27', domainId: '10', name: '@', type: 'A', value: '52.85.100.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-027' },
  { id: 'r28', domainId: '10', name: 'dev', type: 'CNAME', value: 'vercel.app', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-028' },
  { id: 'r29', domainId: '11', name: '@', type: 'A', value: '35.186.200.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r30', domainId: '11', name: 'news', type: 'A', value: '35.186.200.2', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r31', domainId: '12', name: '@', type: 'A', value: '3.110.50.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnshe', recordId: 'rec-031' },
  { id: 'r32', domainId: '12', name: 'api', type: 'A', value: '3.110.50.2', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnshe', recordId: 'rec-032' },
  { id: 'r33', domainId: '12', name: 'db', type: 'CNAME', value: 'rds.amazonaws.com', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnshe', recordId: 'rec-033' },
  { id: 'r34', domainId: '12', name: '@', type: 'MX', value: 'mail.cloud.run', line: '默认', ttl: 3600, priority: 10, status: 'active', remark: '', updatedAt: monthsAgo(3), provider: 'dnshe', recordId: 'rec-034' },
  { id: 'r35', domainId: '12', name: '@', type: 'TXT', value: 'v=spf1 include:_spf.cloud.run ~all', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(3), provider: 'dnshe', recordId: 'rec-035' },
  { id: 'r36', domainId: '13', name: '@', type: 'A', value: '0.0.0.0', line: '默认', ttl: 600, priority: null, status: 'paused', remark: '已暂停', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r37', domainId: '14', name: '@', type: 'A', value: '151.101.1.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-037' },
  { id: 'r38', domainId: '14', name: 'img', type: 'CNAME', value: 'imgix.net', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-038' },
  { id: 'r39', domainId: '15', name: '@', type: 'A', value: '99.86.100.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r40', domainId: '15', name: 'status', type: 'CNAME', value: 'statuspage.io', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r41', domainId: '16', name: '@', type: 'A', value: '18.66.50.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-041' },
  { id: 'r42', domainId: '16', name: 'auth', type: 'CNAME', value: 'auth0.com', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-042' },
  { id: 'r43', domainId: '17', name: '@', type: 'A', value: '52.44.100.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r44', domainId: '17', name: 'pay', type: 'A', value: '52.44.100.2', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnsneko' },
  { id: 'r45', domainId: '17', name: '@', type: 'MX', value: 'mail.pay.finance', line: '默认', ttl: 3600, priority: 5, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnsneko' },
  { id: 'r46', domainId: '17', name: '@', type: 'TXT', value: 'v=spf1 include:_spf.pay.finance ~all', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnsneko' },
  { id: 'r47', domainId: '18', name: '@', type: 'A', value: '34.120.100.1', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-047' },
  { id: 'r48', domainId: '18', name: 'chat', type: 'CNAME', value: 'discord.com', line: '默认', ttl: 300, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-048' },
  { id: 'r49', domainId: '18', name: '@', type: 'TXT', value: 'v=spf1 include:_spf.chat.social ~all', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-049' },
  { id: 'r50', domainId: '1', name: 'ftp', type: 'CNAME', value: 'ftp.example.com', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(3), provider: 'dnshe', recordId: 'rec-050' },
  { id: 'r51', domainId: '1', name: 'mail', type: 'A', value: '93.184.216.35', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(2), provider: 'dnshe', recordId: 'rec-051' },
  { id: 'r52', domainId: '1', name: '@', type: 'AAAA', value: '2606:4700:3035::ac43:abc', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-052' },
  { id: 'r53', domainId: '2', name: '@', type: 'AAAA', value: '2606:4700:3035::ac43:def', line: '默认', ttl: 600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(0), provider: 'dnshe', recordId: 'rec-053' },
  { id: 'r54', domainId: '2', name: '@', type: 'TXT', value: 'v=spf1 include:_spf.mysite.cn ~all', line: '默认', ttl: 3600, priority: null, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-054' },
  { id: 'r55', domainId: '2', name: '@', type: 'MX', value: 'mx.mysite.cn', line: '默认', ttl: 3600, priority: 10, status: 'active', remark: '', updatedAt: monthsAgo(1), provider: 'dnshe', recordId: 'rec-055' },
];

export const mockOperationLogs: OperationLog[] = [
  { id: 'log1', timestamp: new Date(now.getTime() - 5 * 60000).toISOString(), operator: 'admin', action: '添加记录', target: 'example.com → www A 93.184.216.34', result: 'success', detail: null },
  { id: 'log2', timestamp: new Date(now.getTime() - 30 * 60000).toISOString(), operator: 'admin', action: '同步域名', target: 'DNSHE 全量同步', result: 'success', detail: null },
  { id: 'log3', timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(), operator: 'admin', action: '删除记录', target: 'blog.dev → old CNAME deprecated.io', result: 'success', detail: null },
  { id: 'log4', timestamp: new Date(now.getTime() - 4 * 3600000).toISOString(), operator: 'admin', action: '修改记录', target: 'shop.io → api A TTL 600→300', result: 'success', detail: null },
  { id: 'log5', timestamp: new Date(now.getTime() - 6 * 3600000).toISOString(), operator: 'admin', action: '添加域名', target: 'chat.social', result: 'success', detail: null },
  { id: 'log6', timestamp: new Date(now.getTime() - 12 * 3600000).toISOString(), operator: 'admin', action: '同步域名', target: 'DNSNeko 增量同步', result: 'success', detail: null },
  { id: 'log7', timestamp: new Date(now.getTime() - 24 * 3600000).toISOString(), operator: 'admin', action: '暂停记录', target: 'mail.co → @ A', result: 'success', detail: null },
  { id: 'log8', timestamp: new Date(now.getTime() - 36 * 3600000).toISOString(), operator: 'admin', action: '添加记录', target: 'cdn.net → _dmarc TXT', result: 'success', detail: null },
  { id: 'log9', timestamp: new Date(now.getTime() - 48 * 3600000).toISOString(), operator: 'admin', action: '验证账号', target: 'DNSHE API Key', result: 'failure', detail: 'API Key 无效' },
  { id: 'log10', timestamp: new Date(now.getTime() - 72 * 3600000).toISOString(), operator: 'admin', action: '修改记录', target: 'docs.org → docs CNAME readme.io', result: 'success', detail: null },
];

export const mockSyncTasks: SyncTask[] = [
  { id: 'sync1', type: 'full', provider: 'all', status: 'completed', progress: 100, startedAt: new Date(now.getTime() - 30 * 60000).toISOString(), completedAt: new Date(now.getTime() - 28 * 60000).toISOString(), error: null },
  { id: 'sync2', type: 'incremental', provider: 'dnshe', status: 'completed', progress: 100, startedAt: new Date(now.getTime() - 12 * 3600000).toISOString(), completedAt: new Date(now.getTime() - 12 * 3600000 + 60000).toISOString(), error: null },
  { id: 'sync3', type: 'incremental', provider: 'dnsneko', status: 'completed', progress: 100, startedAt: new Date(now.getTime() - 24 * 3600000).toISOString(), completedAt: new Date(now.getTime() - 24 * 3600000 + 45000).toISOString(), error: null },
  { id: 'sync4', type: 'full', provider: 'all', status: 'failed', progress: 45, startedAt: new Date(now.getTime() - 72 * 3600000).toISOString(), completedAt: new Date(now.getTime() - 72 * 3600000 + 120000).toISOString(), error: 'DNSHE API 超时' },
  { id: 'sync5', type: 'incremental', provider: 'dnshe', status: 'completed', progress: 100, startedAt: new Date(now.getTime() - 168 * 3600000).toISOString(), completedAt: new Date(now.getTime() - 168 * 3600000 + 30000).toISOString(), error: null },
];

export const mockDnsheQuota: DnsheQuota = {
  used: 11,
  base: 10,
  inviteBonus: 5,
  total: 15,
  available: 4,
};

export const mockDomainTrend = [
  { month: '1月', count: 2 },
  { month: '2月', count: 3 },
  { month: '3月', count: 4 },
  { month: '4月', count: 2 },
  { month: '5月', count: 5 },
  { month: '6月', count: 3 },
];

export const mockRecordTypeDistribution = [
  { name: 'A', value: 22, fill: 'hsl(217, 91%, 60%)' },
  { name: 'AAAA', value: 4, fill: 'hsl(186, 72%, 46%)' },
  { name: 'CNAME', value: 12, fill: 'hsl(142, 71%, 45%)' },
  { name: 'MX', value: 6, fill: 'hsl(38, 92%, 50%)' },
  { name: 'TXT', value: 9, fill: 'hsl(280, 67%, 55%)' },
];
