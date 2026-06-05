# 로컬 SQLite 사용 가이드 (프론트)

개인데이터(채팅 이력·직관 기록)를 **기기/브라우저 안에만** 저장한다. 서버엔 안 보냄.
구현은 `frontend/src/db.ts` (sql.js + IndexedDB 영속). **웹·안드 앱 WebView 어디서나 동일하게 동작.**

---

## 0. 기본 동작
- 앱 시작 시 `App.tsx`에서 `initDb()` 호출 → DB 열고 테이블 생성 (이미 연결돼 있음)
- 데이터는 **IndexedDB**에 영속 저장 (앱 껐다 켜도 유지). 단 **앱 삭제 시 사라짐**
- 모든 함수는 `import { ... } from "./db"` 로 사용

---

## 1. 테이블 추가하는 법
`db.ts`의 `SCHEMA` 상수에 `CREATE TABLE IF NOT EXISTS` 한 줄 추가하면 끝.

```ts
const SCHEMA = `
CREATE TABLE IF NOT EXISTS chat_history ( ... );
CREATE TABLE IF NOT EXISTS my_records ( ... );

CREATE TABLE IF NOT EXISTS favorites_local (   -- ← 새 테이블 예시
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  team_code  TEXT,
  created_at TEXT
);
`;
```
- `IF NOT EXISTS` 라서 **기존 데이터 안 건드리고** 새 테이블만 생성됨
- ⚠️ **기존 테이블에 컬럼 추가**는 다름 → `ALTER TABLE ... ADD COLUMN` 마이그레이션 필요 (SCHEMA만으론 안 됨)

---

## 2. 데이터 저장/조회 (이미 있는 함수)

### 채팅 이력
```ts
import { saveChat, getChatHistory } from "./db";

await saveChat(sessionId, "user", "번트가 뭐야?", "OB");  // 저장
await saveChat(sessionId, "bot", "번트는...", "OB");
const history = await getChatHistory(sessionId);          // 조회
```

### 나만의 기록(직관일기)
```ts
import { saveRecord, getRecords, getRecordByDate } from "./db";

await saveRecord({ record_date: "2026-06-04", team_code: "OB", stadium: "잠실", mood: "win_happy", memo: "..." });
const all = await getRecords();                  // 전체
const one = await getRecordByDate("2026-06-04"); // 특정 날짜 1건
```

---

## 3. 새 CRUD 함수 만드는 패턴
`db.ts` 안에서 — 저장은 `c.run`, 조회는 `select()` 헬퍼 사용. 파라미터는 `?` 바인딩(SQL 인젝션 방지).

```ts
// 저장
export async function saveFavorite(teamCode: string) {
  const c = await conn();
  c.run("INSERT INTO favorites_local (team_code, created_at) VALUES (?,?)",
        [teamCode, new Date().toISOString()]);
  await persist();   // ← 저장 후 반드시 호출 (IndexedDB에 영속)
}

// 조회
export async function getFavorites() {
  const c = await conn();
  return select(c, "SELECT * FROM favorites_local ORDER BY id");
}
```
> **저장(INSERT/UPDATE/DELETE) 후엔 꼭 `await persist()`** — 안 하면 새로고침 시 사라짐.

---

## 4. 챗봇 연동 (개인질문을 페르소나로 답하기)
개인 질문이면 로컬에서 꺼내 `/chat`에 `personal_context`로 넘긴다. (백엔드는 이미 받게 돼 있음)

```ts
import { saveChat, getRecordByDate } from "./db";

// ① 보내기 전 — 개인질문이면 로컬에서 꺼냄
let personalContext: string | undefined;
const rec = await getRecordByDate("2026-06-04");
if (rec) personalContext = `직관기록 ${rec.record_date}: ${rec.stadium}, ${rec.team_code}전`;

// ② /chat 호출에 추가
fetch(apiUrl("/chat"), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question, team_code, personal_context: personalContext }),
});

// ③ 응답 후 — 채팅 이력 저장
await saveChat(sessionId, "user", question, teamCode);
await saveChat(sessionId, "bot", answer, teamCode);
```
> "이게 개인질문인가" 판단은 키워드 말고 **LLM 함수호출**로 하는 게 정석 (키워드는 취약). 일단 키워드로 데모 → 추후 고도화.

---

## 5. 로컬 DB 확인하는 법 (개발 중)
DevTools로는 표를 직접 못 봄(IndexedDB에 통째로 직렬화됨). 두 가지:

### 빠르게 — 콘솔 (dev 전용 `kboDb` 노출됨)
```js
await kboDb.getRecords()          // 직관기록
await kboDb.getChatHistory()      // 채팅이력
await kboDb.saveRecord({ record_date:"2026-06-05", stadium:"고척", team_code:"WO" })
```

### 시각적으로 — .sqlite 파일로 내보내 DBeaver로 열기 ⭐
로컬 DB는 디스크 파일이 아니라 **브라우저 IndexedDB 안에 직렬화**돼 있어서, 먼저 파일로 빼내야 한다.

1. 앱 실행 → 로그인 → **F12 콘솔**에서:
   ```js
   await kboDb.exportDb()   // → kbo_local.sqlite 다운로드
   ```
2. **DBeaver**에서 열기:
   - 새 연결(Database → New Connection) → **SQLite** 선택
   - Path에 방금 받은 `kbo_local.sqlite` 지정 (드라이버 없으면 DBeaver가 자동 설치)
   - 연결하면 `chat_history`·`my_records` 테이블·행을 일반 DB처럼 다 봄

> ⚠️ 이건 **그 시점의 스냅샷 복사본**. DBeaver에서 값을 고쳐도 **앱(브라우저)엔 반영 안 됨**(파일→앱은 단방향 X). 조회·확인용으로만.

### 초기화(테스트 데이터 지우기)
DevTools → Application → IndexedDB → `kbo_sqlite` 삭제 → 새로고침

---

## 요약
- **테이블 추가** = SCHEMA에 `CREATE TABLE IF NOT EXISTS`
- **저장** = `c.run(INSERT, [params])` + `await persist()`
- **조회** = `select(c, SELECT, [params])`
- **확인** = 콘솔 `kboDb.*` 또는 `exportDb()` → DBeaver(SQLite)
- 개인데이터는 폰/브라우저 로컬에만, 챗봇 답변 시 `personal_context`로만 일시 전달
