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

/** 다문 입(전부 0)으로. 발화 종료/중단 시 호출. */
export function clearMouth(): void {
  target = { ...ZERO };
}

/** Character3D가 매 프레임 읽어가는 현재 목표값. */
export function getTargetWeights(): MouthWeights {
  return target;
}
