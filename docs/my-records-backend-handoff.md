# 나만의 야구기록 — 백엔드 인수인계 (문제점 & 보완점)

> 작성 배경: 나만의 야구기록(직관 기록)을 **계정별**로 저장하도록 백엔드 연동 전환이 필요함.
> 프론트 데이터 호출부 교체는 프론트에서 처리하고, **이 문서는 백엔드가 보완해야 할 항목** 위주.

---

## 1. 현재 문제점

- 나만의 야구기록이 **프론트 로컬 SQLite(브라우저 IndexedDB)** 에 저장됨 (`frontend/src/db.ts`).
  - → **기기(브라우저) 1개당 1벌**. 계정과 연결 안 됨.
  - 같은 기기에서 **다른 계정으로 로그인해도 기록이 그대로** 남음 (계정별 분리 X).
  - **다른 기기**에서 같은 계정으로 로그인하면 기록이 **안 보임**.
- 백엔드 `/my-records` (user_id 기준 CRUD)는 **이미 구현돼 있음** → 여기로 전환하면 계정별 분리 해결.
  - 단, 현재 UX(예정 경기 프리필 등)와 안 맞는 **제약 몇 가지**가 있어 보완 필요(아래).

---

## 2. 백엔드 보완 항목 ⭐

### (1) mood 필수 → 선택 허용
현재 `mood`가 **Pydantic + DB 양쪽에서 필수**라, 결과가 아직 없는 **예정 경기**를 기록할 수 없음.

- `services/api/my_records.py`
  - `MyRecordIn.mood: Mood` → **`Mood | None = None`**
  - `_with_mood_stamp(row)`: `mood`가 None이면 `MOOD_STAMPS[None]`에서 **KeyError** → None 안전 처리 필요
    ```python
    def _with_mood_stamp(row):
        row["mood_stamp"] = MOOD_STAMPS.get(row["mood"]) if row.get("mood") else None
        return row
    ```
  - GET `mood` 필터도 None 허용은 이미 OK.
- DB `schema.sql` / 운영 DB
  - 현재: `mood VARCHAR(16) NOT NULL CHECK (mood IN ('win_happy','draw_calm','loss_sad'))`
  - **NOT NULL 제거** 필요. 테이블이 이미 생성돼 있으므로 `CREATE TABLE IF NOT EXISTS`로는 안 바뀜 → **ALTER 필요**:
    ```sql
    ALTER TABLE my_baseball_records ALTER COLUMN mood DROP NOT NULL;
    -- CHECK는 NULL을 통과시키므로 그대로 둬도 됨 (NULL은 CHECK 평가에서 통과)
    ```

### (2) 날짜당 1건(덮어쓰기) 정책
"하루 = 직관 1건" 인데 현재 **UNIQUE 제약이 없어** 같은 날 중복 INSERT 가능. DELETE도 `record_id`로만 가능해서 프론트가 덮어쓰기 하기 번거로움.

- **권장**: `UNIQUE (user_id, record_date)` 추가 + POST를 upsert로
  ```sql
  ALTER TABLE my_baseball_records
    ADD CONSTRAINT uq_my_records_user_date UNIQUE (user_id, record_date);
  ```
  ```sql
  -- POST INSERT ... ON CONFLICT
  INSERT INTO my_baseball_records (user_id, record_date, game_id, team_code, stadium, mood, memo)
  VALUES (%s,%s,%s,%s,%s,%s,%s)
  ON CONFLICT (user_id, record_date)
  DO UPDATE SET game_id=EXCLUDED.game_id, team_code=EXCLUDED.team_code,
                stadium=EXCLUDED.stadium, mood=EXCLUDED.mood, memo=EXCLUDED.memo
  RETURNING ...;
  ```
- **대안(제약 추가가 부담이면)**: 날짜 기반 삭제 엔드포인트 추가
  ```
  DELETE /my-records?date=YYYY-MM-DD   # user_id + record_date 로 삭제
  ```
  → 프론트가 "덮어쓰기 = 날짜삭제 후 insert"로 처리.

### (3) (선택) 조회 필터 보강
캘린더/통계 편의를 위해 GET에 기간 필터가 있으면 좋음 (현재는 `mood` 필터만):
```
GET /my-records?from=YYYY-MM-01&to=YYYY-MM-31   # 월 단위 조회
```

---

## 3. 관련 — 경기 예정표(캘린더 프리필)

프론트가 캘린더에 그 달 경기 상대를 미리 표시하려고 **`/schedule?month=YYYY-MM`** (그 달 전체)을 사용함.

- `services/api/main.py`의 `/schedule`에 **`month` 파라미터를 추가해 둠** (아래). **배포 반영 필요**.
  ```python
  @app.get("/schedule")
  def get_schedule(date: str | None = None, month: str | None = None):
      if month:  # "YYYY-MM" → 그 달 전체
          rows = list(db.schedule.find({"date": {"$regex": f"^{month}-"}}, {"_id": 0}))
          return {"month": month, "count": len(rows), "schedule": rows}
      d = date or latest_date("schedule")
      rows = list(db.schedule.find({"date": d}, {"_id": 0}))
      return {"date": d, "count": len(rows), "schedule": rows}
  ```
- schedule 도큐먼트 팀명은 **한글 약칭**(두산/롯데/삼성/SSG/LG/NC/키움/KT/KIA/한화).
  프론트 team_code(OB/LT/SS/SK/LG/NC/WO/KT/HT/HH)와 매핑해서 사용 중.

---

## 4. 데이터 모델 합의 (프론트 ↔ 백엔드)

| 필드 | 의미 |
|------|------|
| `user_id` | 계정 (JWT에서). **이게 계정별 분리의 핵심** |
| `record_date` | `YYYY-MM-DD` |
| `team_code` | **상대팀(opponent) 코드** 저장 (내 팀은 회원가입 `fav_team_code`로 고정 → 별도 저장 안 함) |
| `game_id` | schedule의 gameId (있으면) |
| `stadium` | 관람처 |
| `mood` | `win_happy`/`draw_calm`/`loss_sad` **또는 NULL(예정/미입력)** |
| `memo` | 한 줄 메모(선택) |

---

## 5. 배포 체크리스트

- [ ] `my_records.py`: `mood` Optional + `_with_mood_stamp` None-safe
- [ ] DB: `ALTER ... mood DROP NOT NULL` (+ 권장: `UNIQUE(user_id, record_date)` + POST upsert)
- [ ] (대안) 날짜 기반 `DELETE /my-records?date=`
- [ ] `main.py`: `/schedule` `month` 파라미터 (이미 코드에 추가됨 → 배포만)
- [ ] **Cloud Run 재배포** (`gcloud run deploy kbo-api --source .`)
- [x] `firebase.json` `/my-records` rewrite — 이미 존재함

---

## 6. 프론트 측 작업 (프론트 담당이 처리, 참고용)

- `frontend/src/db.ts`(로컬) → **`/my-records` API**로 교체:
  - 조회: `GET /my-records` (응답 `records[].record_id` 보관)
  - 저장: `POST /my-records` (Bearer `authToken`)
  - 삭제/수정: 기존 `record_id`로 `DELETE` 후 재저장 (또는 upsert/날짜삭제 엔드포인트 사용)
- 데모 로그인(`admin`, 토큰 없음)은 백엔드 저장 불가 → "로그인 후 이용" 안내 처리.
- 기존 로컬(IndexedDB) 데이터는 계정으로 자동 이관되지 않음(새로 쌓임).
