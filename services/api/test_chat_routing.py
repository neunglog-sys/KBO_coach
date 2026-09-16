# -*- coding: utf-8 -*-
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import chat


def _prepared(*, has_rag: bool):
    used = {
        "persona": "테스트 구단",
        "terms": ["도루"] if has_rag else [],
        "rules": [],
        "culture": [],
        "facts": [],
        "personal": False,
        "rag_context": "근거 있음" if has_rag else "(관련 자료 없음)",
    }
    return "UNCHANGED_PERSONA_SYSTEM", "RAG USER PROMPT [질문] 테스트", used


class ChatRoutingTest(unittest.TestCase):
    def test_only_supported_grounding_chunks_become_sources(self):
        response = SimpleNamespace(candidates=[SimpleNamespace(
            grounding_metadata=SimpleNamespace(
                grounding_supports=[SimpleNamespace()],
                grounding_chunks=[
                    SimpleNamespace(web=SimpleNamespace(title="KBO 공식", uri="https://example.com/kbo")),
                    SimpleNamespace(web=SimpleNamespace(title="중복", uri="https://example.com/kbo")),
                ],
            ),
        )])
        self.assertEqual(
            chat.llm._grounding_sources(response),
            [{"title": "KBO 공식", "url": "https://example.com/kbo"}],
        )

    def test_existing_rag_uses_default_model_and_keeps_persona(self):
        body = chat.ChatIn(question="도루가 뭐야?", team_code="HH")
        statuses = []
        with (
            patch.object(chat, "_prepare", return_value=_prepared(has_rag=True)),
            patch.object(chat.web_knowledge, "find", return_value=None),
            patch.object(chat.llm, "generate", return_value="페르소나 답변") as generate,
            patch.object(chat.llm, "generate_grounded") as grounded,
        ):
            answer, used = chat._resolve_answer(body, statuses.append)

        self.assertEqual(answer, "페르소나 답변")
        self.assertEqual(used["route"], "rag")
        self.assertEqual(statuses, [chat._STATUS_WRITING])
        self.assertEqual(generate.call_args.args[0], "UNCHANGED_PERSONA_SYSTEM")
        grounded.assert_not_called()

    def test_fresh_question_searches_even_when_rag_exists(self):
        body = chat.ChatIn(question="문현빈 아시안게임 대표팀에 뽑혔어?", team_code="HH")
        grounded_result = {
            "text": "출처로 확인한 최신 답변",
            "sources": [{"title": "공식 발표", "url": "https://example.com/official"}],
            "model": "gemini-2.5-flash",
        }
        statuses = []
        with (
            patch.object(chat, "_prepare", return_value=_prepared(has_rag=True)),
            patch.object(chat.web_knowledge, "find", return_value=None),
            patch.object(chat.web_knowledge, "store") as store,
            patch.object(chat.llm, "generate") as generate,
            patch.object(chat.llm, "generate_grounded", return_value=grounded_result) as grounded,
        ):
            answer, used = chat._resolve_answer(body, statuses.append)

        self.assertEqual(answer, grounded_result["text"])
        self.assertEqual(used["route"], "google_search")
        self.assertEqual(statuses, [chat._STATUS_SEARCH, chat._STATUS_WRITING])
        self.assertEqual(grounded.call_args.args[0], "UNCHANGED_PERSONA_SYSTEM")
        generate.assert_not_called()
        store.assert_called_once()

    def test_verified_web_cache_returns_to_default_model(self):
        body = chat.ChatIn(question="새 소식 알려줘", team_code="LG")
        cached = {
            "answer": "이전에 검증한 사실",
            "sources": [{"title": "공식", "url": "https://example.com"}],
            "checked_at": "2026-09-17T00:00:00+09:00",
        }
        with (
            patch.object(chat, "_prepare", return_value=_prepared(has_rag=False)),
            patch.object(chat.web_knowledge, "find", return_value=cached),
            patch.object(chat.llm, "generate", return_value="구단 말투로 정리한 답변") as generate,
            patch.object(chat.llm, "generate_grounded") as grounded,
        ):
            answer, used = chat._resolve_answer(body)

        self.assertEqual(answer, "구단 말투로 정리한 답변")
        self.assertEqual(used["route"], "web_cache")
        self.assertIn("이전에 검증한 사실", generate.call_args.args[1])
        grounded.assert_not_called()

    def test_current_official_lineup_rag_does_not_search_again(self):
        body = chat.ChatIn(question="오늘 한화 선발 라인업 알려줘", team_code="HH")
        system, user, used = _prepared(has_rag=True)
        used["rules"] = ["오늘 선발 라인업(공식, 크롤 수집)"]
        with (
            patch.object(chat, "_prepare", return_value=(system, user, used)),
            patch.object(chat.web_knowledge, "find") as find,
            patch.object(chat.llm, "generate", return_value="공식 RAG 라인업 답변"),
            patch.object(chat.llm, "generate_grounded") as grounded,
        ):
            answer, resolved = chat._resolve_answer(body)

        self.assertEqual(answer, "공식 RAG 라인업 답변")
        self.assertEqual(resolved["route"], "rag")
        find.assert_not_called()
        grounded.assert_not_called()

    def test_search_timeout_returns_requested_honest_message(self):
        body = chat.ChatIn(question="오늘 최신 뉴스 알려줘")
        with (
            patch.object(chat, "_prepare", return_value=_prepared(has_rag=False)),
            patch.object(chat.web_knowledge, "find", return_value=None),
            patch.object(chat.llm, "generate_grounded", side_effect=chat.llm.SearchTimeoutError()),
        ):
            answer, used = chat._resolve_answer(body)

        self.assertEqual(answer, chat._SEARCH_TIMEOUT_ANSWER)
        self.assertEqual(used["route"], "search_timeout")

    def test_search_without_verified_fact_refuses_to_guess(self):
        body = chat.ChatIn(question="최신 선수 소식 알려줘")
        result = {
            "text": "__NO_VERIFIED_RESULT__",
            "sources": [{"title": "검색", "url": "https://example.com"}],
            "model": "gemini-2.5-flash",
        }
        with (
            patch.object(chat, "_prepare", return_value=_prepared(has_rag=False)),
            patch.object(chat.web_knowledge, "find", return_value=None),
            patch.object(chat.web_knowledge, "store") as store,
            patch.object(chat.llm, "generate_grounded", return_value=result),
        ):
            answer, used = chat._resolve_answer(body)

        self.assertEqual(answer, chat._NO_VERIFIED_RESULT_ANSWER)
        self.assertEqual(used["route"], "search_no_result")
        store.assert_not_called()


if __name__ == "__main__":
    unittest.main()
