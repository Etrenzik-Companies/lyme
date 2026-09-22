-- The Lyme Accountability Project — D1 schema
-- Apply with: npm run db:init:local   (or db:init for remote)
--
-- PRIVACY NOTES, read before altering any column here:
--   * email_hash is sha256(lowercased email + EMAIL_HASH_SALT). It is the unique key.
--   * email_enc is AES-GCM ciphertext under EMAIL_ENC_KEY. No endpoint ever returns it.
--   * ip_hash / ua_hash are salted hashes kept only for abuse forensics. Raw values are
--     never written to disk.
--   * A signature is only counted publicly once verified = 1 (double opt-in).

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- signatures
CREATE TABLE IF NOT EXISTS signatures (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  verified_at       TEXT,
  verified          INTEGER NOT NULL DEFAULT 0,

  first_name        TEXT    NOT NULL,
  last_initial      TEXT    NOT NULL,
  state             TEXT    NOT NULL,
  email_hash        TEXT    NOT NULL,
  email_enc         TEXT    NOT NULL,

  relationship      TEXT    NOT NULL,   -- patient|caregiver|bereaved|clinician|supporter
  years_affected    INTEGER,
  statement         TEXT,

  consent_public    INTEGER NOT NULL DEFAULT 0,
  consent_contact   INTEGER NOT NULL DEFAULT 0,

  verify_token      TEXT,
  manage_token      TEXT    NOT NULL,
  ip_hash           TEXT,
  ua_hash           TEXT,
  moderation_state  TEXT    NOT NULL DEFAULT 'ok'   -- ok|hidden|flagged
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sig_email     ON signatures(email_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sig_manage    ON signatures(manage_token);
CREATE INDEX        IF NOT EXISTS idx_sig_verified  ON signatures(verified, created_at DESC);
CREATE INDEX        IF NOT EXISTS idx_sig_wall      ON signatures(verified, consent_public, moderation_state, created_at DESC);
CREATE INDEX        IF NOT EXISTS idx_sig_state     ON signatures(state);

-- -------------------------------------------------------------------- stories
CREATE TABLE IF NOT EXISTS stories (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT    NOT NULL,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  approved_at       TEXT,

  display_name      TEXT    NOT NULL,
  state             TEXT,
  onset_year        INTEGER,
  title             TEXT    NOT NULL,
  body              TEXT    NOT NULL,

  email_hash        TEXT,
  email_enc         TEXT,

  consent_publish   INTEGER NOT NULL DEFAULT 0,
  consent_social    INTEGER NOT NULL DEFAULT 0,

  status            TEXT    NOT NULL DEFAULT 'pending',  -- pending|approved|rejected|changes_requested
  moderator_note    TEXT,
  pii_flags         TEXT,        -- JSON array of auto-detected oversharing risks
  is_seed           INTEGER NOT NULL DEFAULT 0,

  manage_token      TEXT    NOT NULL,
  ip_hash           TEXT,
  ua_hash           TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_story_slug   ON stories(slug);
CREATE INDEX        IF NOT EXISTS idx_story_status ON stories(status, created_at DESC);
CREATE INDEX        IF NOT EXISTS idx_story_pub    ON stories(status, approved_at DESC);

CREATE TABLE IF NOT EXISTS story_media (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id    INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  r2_key      TEXT    NOT NULL,
  content_type TEXT   NOT NULL,
  bytes       INTEGER NOT NULL,
  alt_text    TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_story ON story_media(story_id);

-- ------------------------------------------------------------------ news feed
CREATE TABLE IF NOT EXISTS news_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  url_hash      TEXT    NOT NULL,
  url           TEXT    NOT NULL,
  title         TEXT    NOT NULL,
  title_norm    TEXT    NOT NULL,   -- normalized, used for near-duplicate detection
  summary       TEXT,
  source        TEXT    NOT NULL,
  source_kind   TEXT    NOT NULL,   -- pubmed|trials|congress|fedreg|rss|gdelt|gnews
  category      TEXT    NOT NULL,   -- research|policy|surveillance|community|legal|general
  published_at  TEXT,
  fetched_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  score         REAL    NOT NULL DEFAULT 0,
  confidence    TEXT    NOT NULL DEFAULT 'normal',  -- normal|low
  featured      INTEGER NOT NULL DEFAULT 0,
  hidden        INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_news_url   ON news_items(url_hash);
CREATE INDEX        IF NOT EXISTS idx_news_pub   ON news_items(hidden, published_at DESC);
CREATE INDEX        IF NOT EXISTS idx_news_cat   ON news_items(category, published_at DESC);
CREATE INDEX        IF NOT EXISTS idx_news_score ON news_items(confidence, score DESC, published_at DESC);
CREATE INDEX        IF NOT EXISTS idx_news_norm  ON news_items(title_norm);

-- --------------------------------------------------------------- social queue
-- Nothing in here posts without a human flipping status to 'approved'.
CREATE TABLE IF NOT EXISTS social_queue (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT    NOT NULL,          -- unapproved drafts expire, they never auto-post
  platform      TEXT    NOT NULL,          -- x|facebook
  kind          TEXT    NOT NULL,          -- news|milestone|story|stat|manual
  body          TEXT    NOT NULL,
  link          TEXT,
  ref_id        INTEGER,                   -- news_items.id or stories.id
  status        TEXT    NOT NULL DEFAULT 'pending', -- pending|approved|posted|rejected|expired|failed
  approved_by   TEXT,
  approved_at   TEXT,
  posted_at     TEXT,
  external_id   TEXT,
  error         TEXT,
  attempts      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_social_status ON social_queue(status, created_at DESC);

-- ------------------------------------------------------------ moderation log
CREATE TABLE IF NOT EXISTS moderation_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  actor       TEXT    NOT NULL,   -- email from the Cloudflare Access JWT
  entity      TEXT    NOT NULL,   -- story|signature|social|news
  entity_id   INTEGER NOT NULL,
  action      TEXT    NOT NULL,
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_modlog ON moderation_log(entity, entity_id, created_at DESC);

-- ---------------------------------------------------------------- subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  email_hash   TEXT    NOT NULL,
  email_enc    TEXT    NOT NULL,
  verified     INTEGER NOT NULL DEFAULT 0,
  verify_token TEXT,
  manage_token TEXT    NOT NULL,
  cadence      TEXT    NOT NULL DEFAULT 'weekly'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_email  ON subscribers(email_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_manage ON subscribers(manage_token);

-- ------------------------------------------------------------- counter cache
CREATE TABLE IF NOT EXISTS counters (
  key         TEXT PRIMARY KEY,
  value       INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO counters (key, value) VALUES ('milestone_reached', 0);
