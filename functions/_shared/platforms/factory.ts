import { createDnsheAdapter } from './dnshe';
import { createDnsNekoAdapter } from './dnsneko';
import type { ApiAccountRow, DNSPlatformAdapter } from '../types';

export function adapterForAccount(row: ApiAccountRow): DNSPlatformAdapter {
  const meta = {
    id: row.id,
    name: row.name,
    groupId: row.group_id,
    groupName: row.group_name,
    groupColor: row.group_color
  };
  if (row.platform === 'dnshe') return createDnsheAdapter(meta);
  if (row.platform === 'dnsneko') return createDnsNekoAdapter(meta);
  throw new Error(`Unsupported platform: ${row.platform}`);
}
