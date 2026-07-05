PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS api_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS api_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  group_id INTEGER REFERENCES api_groups(id) ON DELETE SET NULL,
  encrypted_config_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  last_check_at TEXT,
  last_check_status TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_api_accounts_platform ON api_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_api_accounts_group ON api_accounts(group_id);
CREATE INDEX IF NOT EXISTS idx_api_accounts_enabled ON api_accounts(enabled);

CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL DEFAULT 'admin',
  ip TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  detail_json TEXT NOT NULL DEFAULT '{}',
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS domain_cache (
  account_id INTEGER NOT NULL REFERENCES api_accounts(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  cached_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(account_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_domain_cache_expiry ON domain_cache(expires_at);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  account_id INTEGER NOT NULL REFERENCES api_accounts(id) ON DELETE CASCADE,
  bucket_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(account_id, bucket_key)
);

INSERT OR IGNORE INTO api_groups (name, color) VALUES ('默认分组', '#6366f1');
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('theme', 'system'),
  ('refreshIntervalMinutes', '60'),
  ('emailReminderEnabled', 'false'),
  ('emailReminderDays', '30,7,0'),
  ('logRetentionDays', '90');
