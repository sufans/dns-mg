-- D1 Database Schema for DNS Manager
-- Migration: 0001_init

-- Account groups (must be created before api_accounts due to FK)
CREATE TABLE IF NOT EXISTS account_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- API accounts
CREATE TABLE IF NOT EXISTS api_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('dnshe', 'dnsneko')),
  group_id TEXT,
  credentials_encrypted TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  connection_status TEXT NOT NULL DEFAULT 'unknown' CHECK(connection_status IN ('online', 'offline', 'error', 'unknown')),
  last_tested_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES account_groups(id) ON DELETE SET NULL
);

-- Operation logs
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('account', 'domain', 'record', 'group', 'system')),
  target_id TEXT,
  detail TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'failed')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_accounts_platform ON api_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_api_accounts_group ON api_accounts(group_id);
CREATE INDEX IF NOT EXISTS idx_api_accounts_enabled ON api_accounts(is_enabled);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_operation_logs_target ON operation_logs(target_type, target_id);
