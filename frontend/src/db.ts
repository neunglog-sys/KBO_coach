// 로컬 SQLite (Capacitor) — 개인데이터를 폰/브라우저 안에만 저장 (서버 X).
// 채팅 이력 + 나만의 기록(직관일기). 개인질문 답할 때 여기서 꺼내 /chat에 personal_context로 넘김.
import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { defineCustomElements as jeepSqlite } from "jeep-sqlite/loader";

const DB_NAME = "kbo_local";
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;
let initPromise: Promise<void> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS chat_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  role       TEXT,           -- 'user' | 'bot'
  content    TEXT,
  team_code  TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS my_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  record_date TEXT,          -- YYYY-MM-DD
  game_id     TEXT,
  team_code   TEXT,
  stadium     TEXT,
  mood        TEXT,
  memo        TEXT,
  created_at  TEXT
);
`;

const isWeb = () => Capacitor.getPlatform() === "web";

async function persist() {
  if (isWeb()) await sqlite.saveToStore(DB_NAME);   // 웹은 명시적으로 IndexedDB에 저장해야 영속됨
}

/** 최초 1회: 웹 스토어 초기화 + 연결 + 테이블 생성. 여러 번 불러도 안전. */
export function initDb(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (isWeb()) {
      jeepSqlite(window);
      if (!document.querySelector("jeep-sqlite")) {
        document.body.appendChild(document.createElement("jeep-sqlite"));
      }
      await customElements.whenDefined("jeep-sqlite");
      await sqlite.initWebStore();
    }
    db = await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
    await db.open();
    await db.execute(SCHEMA);
    await persist();
  })();
  return initPromise;
}

async function conn(): Promise<SQLiteDBConnection> {
  if (!db) await initDb();
  return db!;
}

// ---------- 채팅 이력 ----------
export async function saveChat(sessionId: string, role: "user" | "bot", content: string, teamCode: string) {
  const c = await conn();
  await c.run(
    "INSERT INTO chat_history (session_id, role, content, team_code, created_at) VALUES (?,?,?,?,?)",
    [sessionId, role, content, teamCode, new Date().toISOString()]);
  await persist();
}

export async function getChatHistory(sessionId?: string): Promise<any[]> {
  const c = await conn();
  const res = sessionId
    ? await c.query("SELECT * FROM chat_history WHERE session_id=? ORDER BY id", [sessionId])
    : await c.query("SELECT * FROM chat_history ORDER BY id DESC LIMIT 100");
  return res.values ?? [];
}

// ---------- 나만의 기록 (직관일기) ----------
export interface MyRecord {
  record_date: string; game_id?: string; team_code?: string;
  stadium?: string; mood?: string; memo?: string;
}

export async function saveRecord(r: MyRecord) {
  const c = await conn();
  await c.run(
    "INSERT INTO my_records (record_date, game_id, team_code, stadium, mood, memo, created_at) VALUES (?,?,?,?,?,?,?)",
    [r.record_date, r.game_id ?? null, r.team_code ?? null, r.stadium ?? null,
     r.mood ?? null, r.memo ?? null, new Date().toISOString()]);
  await persist();
}

export async function getRecords(): Promise<any[]> {
  const c = await conn();
  const res = await c.query("SELECT * FROM my_records ORDER BY record_date DESC");
  return res.values ?? [];
}

/** 특정 날짜의 직관 기록 ("어제 간 경기장?" 같은 질문용). */
export async function getRecordByDate(date: string): Promise<any | null> {
  const c = await conn();
  const res = await c.query("SELECT * FROM my_records WHERE record_date=? LIMIT 1", [date]);
  return res.values?.[0] ?? null;
}
