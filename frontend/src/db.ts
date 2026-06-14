// 로컬 SQLite (sql.js wasm) — 웹·Capacitor WebView 어디서나 동일하게 동작.
// 개인데이터(채팅이력·직관기록)를 브라우저/기기 안에만 저장(서버 X). 영속은 IndexedDB.
import initSqlJs, { Database } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";   // Vite가 wasm을 올바른 URL로 서빙

let db: Database | null = null;
let initPromise: Promise<void> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS chat_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT, role TEXT, content TEXT, team_code TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS my_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  record_date TEXT, game_id TEXT, team_code TEXT, stadium TEXT, mood TEXT, memo TEXT, created_at TEXT
);
`;

// ---------- IndexedDB로 DB 바이트 영속 ----------
const IDB_DB = "kbo_sqlite", IDB_STORE = "store", IDB_KEY = "db";

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbLoad(): Promise<Uint8Array | null> {
  const d = await openIdb();
  return new Promise((resolve, reject) => {
    const r = d.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(IDB_KEY);
    r.onsuccess = () => resolve((r.result as Uint8Array) ?? null);
    r.onerror = () => reject(r.error);
  });
}
async function idbSave(bytes: Uint8Array): Promise<void> {
  const d = await openIdb();
  return new Promise((resolve, reject) => {
    const r = d.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(bytes, IDB_KEY);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}
async function persist() {
  if (db) await idbSave(db.export());
}

// ---------- 초기화 ----------
export function initDb(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
    const saved = await idbLoad();
    db = saved ? new SQL.Database(saved) : new SQL.Database();
    db.run(SCHEMA);
    await persist();
  })();
  return initPromise;
}

async function conn(): Promise<Database> {
  if (!db) await initDb();
  return db!;
}

/** SELECT → 행 객체 배열 (파라미터 바인딩). */
function select(c: Database, sql: string, params: any[] = []): any[] {
  const stmt = c.prepare(sql);
  stmt.bind(params);
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

// ---------- 채팅 이력 ----------
export async function saveChat(sessionId: string, role: "user" | "bot", content: string, teamCode: string) {
  const c = await conn();
  c.run("INSERT INTO chat_history (session_id, role, content, team_code, created_at) VALUES (?,?,?,?,?)",
    [sessionId, role, content, teamCode, new Date().toISOString()]);
  await persist();
}
export async function getChatHistory(sessionId?: string): Promise<any[]> {
  const c = await conn();
  return sessionId
    ? select(c, "SELECT * FROM chat_history WHERE session_id=? ORDER BY id", [sessionId])
    : select(c, "SELECT * FROM chat_history ORDER BY id DESC LIMIT 100");
}

/** 최근 사용자 질문 N개(중복 제거, 최신순) — 서버 계정별 질문 이력 보강용.
 *  sessionId를 전달하면 해당 로그인 세션의 대화만 조회한다. */
export async function getRecentQuestions(limit = 5, sessionId?: string): Promise<string[]> {
  const c = await conn();
  const rows = sessionId
    ? select(c, "SELECT content FROM chat_history WHERE role='user' AND session_id=? ORDER BY id DESC LIMIT 30", [sessionId])
    : select(c, "SELECT content FROM chat_history WHERE role='user' ORDER BY id DESC LIMIT 30");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const q = String(r.content ?? "").trim();
    if (!q || seen.has(q)) continue;
    seen.add(q);
    out.push(q);
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- 나만의 기록 (직관일기) ----------
export interface MyRecord {
  record_date: string; game_id?: string; team_code?: string;
  stadium?: string; mood?: string; memo?: string;
}
export async function saveRecord(r: MyRecord) {
  const c = await conn();
  c.run("INSERT INTO my_records (record_date, game_id, team_code, stadium, mood, memo, created_at) VALUES (?,?,?,?,?,?,?)",
    [r.record_date, r.game_id ?? null, r.team_code ?? null, r.stadium ?? null,
     r.mood ?? null, r.memo ?? null, new Date().toISOString()]);
  await persist();
}
export async function getRecords(): Promise<any[]> {
  const c = await conn();
  return select(c, "SELECT * FROM my_records ORDER BY record_date DESC");
}
/** 특정 날짜의 직관 기록 ("어제 간 경기장?" 같은 질문용). */
export async function getRecordByDate(date: string): Promise<any | null> {
  const c = await conn();
  return select(c, "SELECT * FROM my_records WHERE record_date=? LIMIT 1", [date])[0] ?? null;
}
/** 특정 날짜 기록 삭제 (날짜당 1건 유지/수정용 upsert에 사용). */
export async function deleteRecordByDate(date: string) {
  const c = await conn();
  c.run("DELETE FROM my_records WHERE record_date=?", [date]);
  await persist();
}

/** 현재 로컬 DB를 .sqlite 파일로 다운로드 → 'DB Browser for SQLite' 등으로 열어 확인. */
export async function exportDb(filename = "kbo_local.sqlite"): Promise<void> {
  const c = await conn();
  const blob = new Blob([c.export() as BlobPart], { type: "application/x-sqlite3" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 개발 중 브라우저 콘솔에서 바로 사용 (dev 전용): kboDb.exportDb(), kboDb.getRecords() ...
if (import.meta.env.DEV) {
  (window as any).kboDb = { exportDb, getRecords, getChatHistory, saveRecord, saveChat };
}
