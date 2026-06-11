import type { DNSPlatform, UnifiedDomain, UnifiedRecord } from '../../types/models';

export interface DnsRecordInput {
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA';
  value: string;
  line?: string | null;
  ttl: number;
  priority?: number | null;
  remark?: string | null;
}

export interface DNSPlatformAdapter {
  platform: DNSPlatform;
  listDomains(): Promise<UnifiedDomain[]>;
  getDomain(domainId: string): Promise<UnifiedDomain>;
  listRecords(domainId: string): Promise<UnifiedRecord[]>;
  createRecord(domainId: string, input: DnsRecordInput): Promise<UnifiedRecord | null>;
  updateRecord(domainId: string, recordId: string, input: DnsRecordInput): Promise<UnifiedRecord | null>;
  deleteRecord(domainId: string, recordId: string): Promise<void>;
}
