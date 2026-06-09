import { useQuery } from '@tanstack/react-query';
import { providerRegistry } from '../providers/registry';
import { useCredentialsStore } from '../stores/credentials';
import type { DnsheCredential } from '../types';

export function useDnsheQuota() {
  const defaultAccount = useCredentialsStore((s) => s.getDefaultAccount('dnshe'));

  return useQuery({
    queryKey: ['dnshe-quota', defaultAccount?.id],
    queryFn: async () => {
      const provider = providerRegistry.createProvider('dnshe');
      if (!provider || !defaultAccount) return null;

      if ('setCredentials' in provider) {
        const dnsheProvider = provider as import('../providers/dnshe').DnsheProvider;
        dnsheProvider.setCredentials(defaultAccount.credentials as DnsheCredential);
      }

      return provider.getQuota!();
    },
    enabled: !!defaultAccount && defaultAccount.status !== 'invalid',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
