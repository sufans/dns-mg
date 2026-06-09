import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GlobalConfig } from '../types';

const DEFAULT_CONFIG: GlobalConfig = {
  rateLimitPerMinute: 50,
  requestTimeout: 10000,
  autoRetry: true,
  maxRetries: 2,
  credentialStorage: 'local',
};

interface ConfigState extends GlobalConfig {
  // Extended config not in GlobalConfig type
  systemName: string;
  timezone: string;
  language: string;

  updateConfig: (updates: Partial<ConfigState>) => void;
  resetConfig: () => void;
}

const DEFAULT_STATE = {
  ...DEFAULT_CONFIG,
  systemName: 'DNS Manager',
  timezone: 'Asia/Shanghai',
  language: 'zh-CN',
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      updateConfig: (updates) => {
        set((state) => ({ ...state, ...updates }));
      },

      resetConfig: () => {
        set(DEFAULT_STATE);
      },
    }),
    {
      name: 'dns-mgr-config',
    }
  )
);
