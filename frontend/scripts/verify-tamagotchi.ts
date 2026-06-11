import assert from "node:assert/strict";
import {
  applyAttendance,
  applyCheer,
  initializeTamagotchiState,
  replaceSpeechAddressee,
  syncAttendance,
} from "../src/data/tamagotchiState";

// Scenario 1: new account
const day1 = initializeTamagotchiState(null, "2026-06-07", "기본 멘트");
assert.equal(day1.cheerPower, 0);
assert.equal(day1.moodStatus, "보통");

// Scenario 2: first cheer + duplicate cheer on the same day
const day1Cheered = applyCheer(day1, "2026-06-07", "첫 응원");
assert.equal(day1Cheered.cheerPower, 10);
assert.equal(day1Cheered.todayCheerDone, true);

const day1CheeredAgain = applyCheer(day1Cheered, "2026-06-07", "다시 응원");
assert.equal(day1CheeredAgain.cheerPower, 10);
assert.equal(day1CheeredAgain.speechText, "다시 응원");

// Scenario 3: cheer on the next day
const day2 = initializeTamagotchiState(day1CheeredAgain, "2026-06-08", "둘째 날");
assert.equal(day2.cheerPower, 10);
const day2Cheered = applyCheer(day2, "2026-06-08", "둘째 날 응원");
assert.equal(day2Cheered.cheerPower, 20);

// Scenario 4: skip one day and apply one penalty on the following access
const day3 = initializeTamagotchiState(day2Cheered, "2026-06-09", "셋째 날");
assert.equal(day3.cheerPower, 20);
const day4 = initializeTamagotchiState(day3, "2026-06-10", "넷째 날");
assert.equal(day4.cheerPower, 15);
assert.equal(day4.moodStatus, "나쁨");

const day4Reload = initializeTamagotchiState(day4, "2026-06-10", "새로고침");
assert.equal(day4Reload.cheerPower, 15);
assert.equal(day4Reload.lastPenaltyAppliedDate, "2026-06-09");

const persistedDay4 = JSON.parse(JSON.stringify(day4));
const persistedDay4Reload = initializeTamagotchiState(
  persistedDay4,
  "2026-06-10",
  "저장 후 새로고침",
);
assert.equal(persistedDay4Reload.cheerPower, 15);

// Scenario 5: attendance + cheer keeps good mood after reload
const completed = applyCheer(
  applyAttendance(day4, "2026-06-10", "출석"),
  "2026-06-10",
  "응원",
);
assert.equal(completed.cheerPower, 25);
assert.equal(completed.moodStatus, "좋음");
const completedReload = initializeTamagotchiState(completed, "2026-06-10", "재접속");
assert.equal(completedReload.moodStatus, "좋음");

const storedCompleted = JSON.stringify(completed);
const restoredCompleted = initializeTamagotchiState(
  JSON.parse(storedCompleted),
  "2026-06-10",
  "저장소 복원",
);
assert.equal(restoredCompleted.cheerPower, completed.cheerPower);
assert.equal(restoredCompleted.lastAttendanceDate, "2026-06-10");
assert.equal(restoredCompleted.lastCheerDate, "2026-06-10");
assert.equal(restoredCompleted.moodStatus, "좋음");

// Scenario 6: upper bound
const power95 = initializeTamagotchiState(
  {
    stateVersion: 2,
    lastEvaluatedDate: "2026-06-10",
    cheerPower: 95,
    moodBase: "보통",
  },
  "2026-06-10",
  "기본",
);
assert.equal(applyCheer(power95, "2026-06-10", "응원").cheerPower, 100);

// Scenario 7: lower bound
const power3 = initializeTamagotchiState(
  {
    stateVersion: 2,
    lastEvaluatedDate: "2026-06-10",
    cheerPower: 3,
    moodBase: "보통",
  },
  "2026-06-11",
  "기본",
);
assert.equal(power3.cheerPower, 0);

// Server attendance reconciliation and legacy fixed-value migration
const serverSynced = syncAttendance(day4, "2026-06-09", "2026-06-10");
assert.equal(serverSynced.moodStatus, "보통");

const legacyFixedValue = initializeTamagotchiState(
  {
    lastAttendanceDate: null,
    lastCheerDate: null,
    lastEvaluatedDate: "2026-06-10",
    cheerPower: 78,
    moodBase: "보통",
  },
  "2026-06-10",
  "기본",
);
assert.equal(legacyFixedValue.cheerPower, 0);

assert.equal(
  replaceSpeechAddressee(
    "용준, 네가 있어서 더 열심히 할 수 있어!",
    "qwer",
    "용준",
  ),
  "qwer, 네가 있어서 더 열심히 할 수 있어!",
);
assert.equal(
  replaceSpeechAddressee("안녕 zzz! 오늘도 왔구나!", "니크네임", "zzz"),
  "안녕 니크네임! 오늘도 왔구나!",
);
assert.equal(
  replaceSpeechAddressee("기다리고 있었어, zzz!", "니크네임", "zzz"),
  "기다리고 있었어, 니크네임!",
);

console.log("PASS 다마고치 신규값, 일일 응원, 패널티, 상태 유지, 상하한");
