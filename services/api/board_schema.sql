-- 익명 한줄 채팅 게시판("면회실") — 팀별 방(team_code) 구분.
-- 폴링 방식: 클라가 마지막 본 message_id 이후만 주기적으로 조회.

CREATE TABLE IF NOT EXISTS board_messages (
    message_id SERIAL PRIMARY KEY,
    team_code  VARCHAR(4)   NOT NULL,                                   -- 방(구단)
    user_id    INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    nickname   VARCHAR(40)  NOT NULL,                                   -- 익명 표시명(서버 생성)
    content    VARCHAR(200) NOT NULL,                                   -- 한 줄 메시지
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

-- 방별 + 증분 조회(message_id > after)용 인덱스
CREATE INDEX IF NOT EXISTS idx_board_room ON board_messages(team_code, message_id);
