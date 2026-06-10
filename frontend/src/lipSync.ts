// 립싱크 공유 스토어.
// MainView(오디오 재생 측)가 발화 타이밍에 맞춰 "현재 입모양 목표값"을 써넣고,
// Character3D(렌더 측)가 매 프레임 그 값을 읽어 morph target에 부드럽게 반영한다.

export interface Viseme {
  offset: number; // 발화 시작 기준 ms
  id: number; // Azure viseme id (0~21)
}

export type MouthShape = "smile" | "A" | "E" | "I" | "O" | "W";
export type MouthWeights = Record<MouthShape, number>;

const ZERO: MouthWeights = { smile: 0, A: 0, E: 0, I: 0, O: 0, W: 0 };

// Azure viseme id(0~21) → 우리 모음 입모양. null = 다문 입(전부 0 = basic).
const VISEME_TO_SHAPE: Record<number, MouthShape | null> = {
  0: null, // 무음
  1: "A", // æ ə ʌ
  2: "A", // ɑ
  3: "O", // ɔ
  4: "E", // ɛ ʊ
  5: "E", // ɝ
  6: "I", // i ɪ j
  7: "W", // w u
  8: "O", // o
  9: "A", // aʊ
  10: "O", // ɔɪ
  11: "A", // aɪ
  12: "E", // h
  13: "E", // ɹ
  14: "E", // l
  15: "E", // s z
  16: "I", // ʃ tʃ dʒ ʒ
  17: "E", // θ ð
  18: "E", // f v
  19: "E", // d t n
  20: "E", // k g ŋ
  21: null, // p b m (입술 다물기)
};

let target: MouthWeights = { ...ZERO };

/** Azure viseme id를 현재 목표 입모양으로 설정. */
export function setActiveViseme(id: number): void {
  const shape = VISEME_TO_SHAPE[id] ?? null;
  const next: MouthWeights = { ...ZERO };
  if (shape) next[shape] = 1;
  target = next;
}

// 한글 음절 중성(모음, 0~20) → 입모양. ElevenLabs 글자 타임스탬프 립싱크용.
//   ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ
const MEDIAL_TO_SHAPE: (MouthShape | null)[] = [
  "A", "E", "A", "E", "A", "E", "A", "E", "O", "O", "E",
  "O", "O", "W", "O", "E", "W", "W", "I", "I", "I",
];

/** 한글 음절 한 글자 → 그 모음 입모양으로 설정. 음절이 아니면(공백·문장부호) 다문 입. */
export function setActiveSyllable(ch: string): void {
  const code = ch ? ch.charCodeAt(0) : 0;
  let shape: MouthShape | null = null;
  if (code >= 0xac00 && code <= 0xd7a3) {
    const medial = Math.floor((code - 0xac00) / 28) % 21;
    shape = MEDIAL_TO_SHAPE[medial] ?? "A";
  }
  const next: MouthWeights = { ...ZERO };
  if (shape) next[shape] = 1;
  target = next;
}

// ── viseme식 자음 디테일: 음절 내 위상(앞=초성/중간=모음/끝=받침)에 따라 입모양 전환 ──
// 초성 인덱스: ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ (0~18)
const ONSET_LABIAL = new Set([6, 7, 8, 17]);      // ㅁㅂㅃㅍ → 입술 다묾
const ONSET_SIBILANT = new Set([9, 10, 12, 13, 14]); // ㅅㅆㅈㅉㅊ → 이 사이(I)
// 종성 인덱스(0=없음): ...ㄻ(10) ㄿ(14) ㅁ(16) ㅂ(17) ㅄ(18) ㅍ(26) 등
const CODA_LABIAL = new Set([10, 14, 16, 17, 18, 26]); // ㅁㅂㅍ계 받침 → 입술 다묾
const CODA_SIBILANT = new Set([19, 20, 22, 23]);       // ㅅㅆㅈㅊ 받침 → I
const CODA_SOFT = new Set([4, 8, 21]);                  // ㄴㄹㅇ 받침 → 살짝 E

/** viseme처럼: 음절 + 그 음절 안 진행률(phase 0~1)로 입모양 설정.
 *  앞(~22%)은 초성 자음, 중간은 모음, 끝(70%~)은 받침 자음을 반영한다. */
export function setActiveSyllablePhase(ch: string, phase: number): void {
  const code = ch ? ch.charCodeAt(0) : 0;
  if (code < 0xac00 || code > 0xd7a3) {
    target = { ...ZERO };   // 비음절(공백·문장부호) → 다문 입
    return;
  }
  const idx = code - 0xac00;
  const onset = Math.floor(idx / 588);          // 588 = 21*28
  const medial = Math.floor(idx / 28) % 21;
  const coda = idx % 28;
  let shape: MouthShape | null = MEDIAL_TO_SHAPE[medial] ?? "A";
  if (phase < 0.22) {
    if (ONSET_LABIAL.has(onset)) shape = null;
    else if (ONSET_SIBILANT.has(onset)) shape = "I";
  } else if (phase > 0.7 && coda > 0) {
    if (CODA_LABIAL.has(coda)) shape = null;
    else if (CODA_SIBILANT.has(coda)) shape = "I";
    else if (CODA_SOFT.has(coda)) shape = "E";
  }
  const next: MouthWeights = { ...ZERO };
  if (shape) next[shape] = 1;
  target = next;
}

/** 다문 입(전부 0)으로. 발화 종료/중단 시 호출. */
export function clearMouth(): void {
  target = { ...ZERO };
}

/** Character3D가 매 프레임 읽어가는 현재 목표값. */
export function getTargetWeights(): MouthWeights {
  return target;
}
