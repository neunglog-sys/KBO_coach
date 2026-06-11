-- ============================================================================
-- DB 타임존 KST 보정 (2026-06-06)
-- 문제: Supabase 기본 timezone=UTC라 now()/NOW()/created_at 이 KST보다 9시간 밀려 저장됨
--       (회원가입·채팅·출석 등 모든 created_at/updated_at). 풀러가 startup options=-c timezone 을
--       무시하므로 "DB 기본값"을 KST로 바꾸는 것이 정답.
-- ============================================================================

-- 1) DB 기본 타임존을 KST로 (새 세션부터 now()가 KST). 앱이 요청마다 새 연결 → 즉시 반영.
ALTER DATABASE postgres SET timezone = 'Asia/Seoul';
ALTER ROLE     postgres SET timezone = 'Asia/Seoul';
-- 적용 후: SHOW timezone; --> Asia/Seoul,  SELECT now(); --> +09:00

-- 2) 이미 UTC로 저장된 기존 행 +9시간 보정.
--    가드: 컬럼값 < '2026-06-06 15:00:00' (= 보정 시점 UTC벽시계 상한)인 행만.
--    KST로 새로 들어온 행(22:xx)은 제외되고, 한 번 보정된 행도 22:xx가 되어 재실행 시 건너뜀(멱등).
\set cutoff '2026-06-06 15:00:00'

UPDATE users               SET created_at = created_at + interval '9 hours' WHERE created_at < :'cutoff';
UPDATE visits              SET created_at = created_at + interval '9 hours' WHERE created_at < :'cutoff';
UPDATE my_baseball_records SET created_at = created_at + interval '9 hours' WHERE created_at < :'cutoff';
UPDATE board_messages      SET created_at = created_at + interval '9 hours' WHERE created_at < :'cutoff';
UPDATE push_tokens         SET created_at = created_at + interval '9 hours' WHERE created_at < :'cutoff';
UPDATE attendance_progress SET created_at = created_at + interval '9 hours' WHERE created_at < :'cutoff';
UPDATE attendance_progress SET updated_at = updated_at + interval '9 hours' WHERE updated_at < :'cutoff';
UPDATE quiz_log            SET answered_at = answered_at + interval '9 hours' WHERE answered_at < :'cutoff';
UPDATE game_state          SET updated_at = updated_at + interval '9 hours' WHERE updated_at < :'cutoff';
-- sent_events(sent_at): 아직 미생성. 발송 이력 쌓인 후 같은 방식으로 보정.
