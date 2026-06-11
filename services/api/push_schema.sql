-- 푸시 알림 기기 토큰 (FCM) — 유저별 여러 기기 가능.
CREATE TABLE IF NOT EXISTS push_tokens (
    token      VARCHAR(255) PRIMARY KEY,                 -- FCM 등록 토큰(기기당 고유)
    user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    platform   VARCHAR(16),                              -- web / android / ios
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
