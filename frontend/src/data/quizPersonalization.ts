export interface PersonalizableQuiz {
  isCustom?: boolean;
  personalized?: boolean;
  customReason?: string;
  topic?: string | null;
  main_topic?: string | null;
}

export function normalizeQuizTopic(topic: string | null | undefined): string {
  return (topic || "")
    .replace(/\s+/g, "")
    .replace(/[?？!.。]/g, "")
    .trim()
    .toLocaleLowerCase();
}

export function enforceCustomQuizRules<T extends PersonalizableQuiz>(
  questions: T[],
  userAskedTopics: string[],
): T[] {
  const userAskedTopicSet = new Set(
    userAskedTopics.map(normalizeQuizTopic).filter(Boolean),
  );

  return questions.map((question) => {
    const topic = normalizeQuizTopic(question.topic ?? question.main_topic);
    const topicWasAsked = Boolean(topic) && userAskedTopicSet.has(topic);
    const isCustom = topicWasAsked;
    return {
      ...question,
      isCustom,
      personalized: isCustom,
      customReason: isCustom
        ? "사용자가 메인에서 질문한 주제라서 맞춤"
        : "사용자가 질문하지 않은 주제라서 일반 문제",
    };
  });
}
