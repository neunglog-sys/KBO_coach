# 나만의 야구 기록 기능 정리

## 기능 개요

직관을 다녀온 뒤 사용자가 그날의 기분을 도장처럼 남기는 개인 기록 기능이다.
현재는 프론트 구현 전이라 백엔드 기능만 먼저 준비.

기분 선택지는 3가지로 고정.

| 코드 | 의미 | 현재 표시 |
|---|---|---|
| `win_happy` | 이겨서 기분 좋음 | 😆 |
| `draw_calm` | 무승부라 덤덤 | 😐 |
| `loss_sad` | 져서 슬픔 | 😢 |

## 백엔드 구현 위치

실제 서비스용 코드는 `services/api` 안에 새 파일로 분리.

추가된 파일:

- `services/api/my_records.py`

기존 파일 변경:

- `services/api/main.py`
- `services/api/schema.sql`

## `services/api/my_records.py`

FastAPI 라우터 파일이다.
JWT 로그인 사용자의 `user_id`를 기준으로 개인 기록을 저장하고 조회한다.
저장 위치는 PostgreSQL 테이블 `my_baseball_records`다.

현재 API:

| Method | Path | 용도 |
|---|---|---|
| `GET` | `/my-records/moods` | 사용 가능한 기분 도장 목록 조회 |
| `POST` | `/my-records` | 개인 야구 기록 생성 |
| `GET` | `/my-records` | 내 기록 목록 조회 |
| `GET` | `/my-records/stats` | 내 기록 통계 조회 |
| `DELETE` | `/my-records/{record_id}` | 내 기록 삭제 |

## `services/api/main.py`

`my_records.py` 라우터를 실제 FastAPI 앱에 연결.

추가된 내용:

- `from my_records import router as my_records_router`
- `app.include_router(...)` 목록에 `my_records_router` 추가

## `services/api/schema.sql`

PostgreSQL 테이블 `my_baseball_records`를 추가.

주요 컬럼:

| 컬럼 | 설명 |
|---|---|
| `record_id` | 기록 ID |
| `user_id` | 사용자 ID |
| `record_date` | 직관 날짜 |
| `game_id` | 경기 ID, 선택값 |
| `team_code` | 팀 코드, 선택값 |
| `stadium` | 구장명, 선택값 |
| `mood` | `win_happy`, `draw_calm`, `loss_sad` 중 하나 |
| `memo` | 메모, 선택값 |
| `created_at` | 생성 시각 |

`mood`는 DB 체크 제약으로 3가지 값만 허용하게 함.

## 프론트 문구 처리

`오늘의 경기는 어땠나요?`, `오늘의 직관은 어땠나요?` 같은 질문 문구는 백엔드에 고정하지 않고 프론트에서 처리하는 편이 좋음.

백엔드는 다음처럼 기록에 필요한 안정적인 값만 저장한다.

- `record_date`
- `mood`
- `game_id`
- `team_code`
- `stadium`
- `memo`

프론트에서는 화면 톤에 맞게 문구와 버튼 라벨을 자유롭게 바꿀 수 있다.

## 이미지 도장 에셋 확장

나중에 이모지 대신 이미지 에셋을 써서 도장처럼 찍히게 할 수 있다.
현재 DB에 이미지 경로나 파일명을 직접 저장할 필요는 없다.

추천 구조:

- DB에는 `mood` 코드만 저장한다.
- 프론트나 API 응답 매핑에서 `mood` 코드에 맞는 이미지 에셋을 연결한다.
- 예: `win_happy` -> `/assets/stamps/win_happy.png`

이렇게 하면 나중에 도장 이미지를 바꿔도 기존 기록 데이터는 수정하지 않아도 된다.
이미지 파일명이나 경로가 바뀌어도 `mood` 코드만 유지하면 된다.

나중에 이미지 도장으로 확장할 때의 예시:

| 코드 | 예시 이미지 경로 |
|---|---|
| `win_happy` | `/assets/stamps/win_happy.png` |
| `draw_calm` | `/assets/stamps/draw_calm.png` |
| `loss_sad` | `/assets/stamps/loss_sad.png` |

현재 단계에서는 `mood` 코드만 안정적으로 저장해두는 방식이 가장 좋다.
이미지 에셋 경로는 프론트 디자인이 정해질 때 붙이는 편이 안전하다.
