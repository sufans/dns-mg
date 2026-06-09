import type { DomainProvider } from './types';
import { DnsheProvider } from './dnshe';
import { DnsnekoProvider } from './dnsneko';

class ProviderRegistry {
  private providers = new Map<string, DomainProvider>();

  register(provider: DomainProvider): void {
    this.providers.set(provider.type, provider);
  }

  get(type: string): DomainProvider | undefined {
    return this.providers.get(type);
  }

  getAll(): DomainProvider[] {
    return Array.from(this.providers.values());
  }

  getTypes(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const providerRegistry = new ProviderRegistry();

// Register built-in providers
providerRegistry.register(new DnsheProvider());
providerRegistry.register(new DnsnekoProvider());
