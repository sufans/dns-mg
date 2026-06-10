import type { DNSPlatformAdapter } from './types';
import { DnsheAdapter } from './dnshe';
import { DnsnekoAdapter } from './dnsneko';

const adapters: Record<string, DNSPlatformAdapter> = {
  dnshe: new DnsheAdapter(),
  dnsneko: new DnsnekoAdapter(),
};

export function getAdapter(platform: string): DNSPlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`Unsupported DNS platform: ${platform}`);
  }
  return adapter;
}

export function getSupportedPlatforms(): string[] {
  return Object.keys(adapters);
}

export { DnsheAdapter, DnsnekoAdapter };
export type { DNSPlatformAdapter, UnifiedDomain, UnifiedRecord, PlatformCredentials, DnsheCredentials, DnsnekoCredentials, CreateRecordInput, UpdateRecordInput, BatchOperationInput, ConnectionTestResult, DomainListResult, RecordListResult } from './types';
