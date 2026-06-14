import { enforceCustomQuizRules } from "../src/data/quizPersonalization";

const staleCustom = {
  topic: "볼넷",
  isCustom: true,
  personalized: true,
};
const newAccount = enforceCustomQuizRules([staleCustom], []);
if (newAccount[0].isCustom !== false) {
  throw new Error("A new account must never inherit a custom quiz badge.");
}

const accountA = enforceCustomQuizRules(
  [
    { topic: "송구", isCustom: false },
    { topic: "도루", isCustom: false },
    { topic: "볼넷", isCustom: true },
  ],
  ["송구?", "도루"],
);
if (
  accountA[0].isCustom !== true
  || accountA[1].isCustom !== true
  || accountA[2].isCustom !== false
) {
  throw new Error("Asked 송구 and 도루 topics must be custom, while 볼넷 stays general.");
}

const accountB = enforceCustomQuizRules(
  [
    { topic: "라팍런", isCustom: true },
    { topic: "볼넷", isCustom: true },
  ],
  ["볼넷"],
);
if (accountB[0].isCustom !== false || accountB[1].isCustom !== true) {
  throw new Error("Account B must only receive the 볼넷 custom badge.");
}

const fallback = enforceCustomQuizRules(
  [{ personalized: true }],
  ["볼넷"],
);
if (fallback[0].isCustom !== false) {
  throw new Error("A fallback quiz without a topic cannot become custom.");
}

console.log("quiz personalization verification passed");
