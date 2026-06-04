# -*- coding: utf-8 -*-
"""FCM 발송 모듈 — firebase-admin으로 푸시 전송.

서비스 계정 키: 환경변수 FIREBASE_CRED_PATH, 없으면 repo 루트의 *firebase-adminsdk*.json 자동 탐색.
키는 .gitignore 처리됨(절대 커밋 금지).
"""
import os
import pathlib

import firebase_admin
from firebase_admin import credentials, messaging

_initialized = False


def _cred_path() -> str:
    p = os.environ.get("FIREBASE_CRED_PATH")
    if p and pathlib.Path(p).exists():
        return p
    root = pathlib.Path(__file__).resolve().parents[2]   # repo root
    found = sorted(root.glob("*firebase-adminsdk*.json"))
    if found:
        return str(found[0])
    raise RuntimeError("Firebase 서비스 계정 키를 찾을 수 없음 (FIREBASE_CRED_PATH 설정 필요)")


def _ensure_init():
    global _initialized
    if _initialized:
        return
    try:
        firebase_admin.get_app()           # 이미 초기화돼 있으면 재사용
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(_cred_path()))
    _initialized = True


def send_to_tokens(tokens: list[str], title: str, body: str, data: dict | None = None) -> dict:
    """여러 토큰에 알림 발송. 반환: {sent, failed, invalid_tokens}.
    invalid_tokens = 만료·미등록 토큰(정리 대상)."""
    if not tokens:
        return {"sent": 0, "failed": 0, "invalid_tokens": []}
    _ensure_init()
    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
    )
    resp = messaging.send_each_for_multicast(message)
    invalid = []
    for i, r in enumerate(resp.responses):
        if not r.success:
            err = getattr(r.exception, "code", "") or str(r.exception)
            # 만료/미등록 토큰은 DB에서 지우도록 수집
            if "registration-token-not-registered" in str(r.exception) or "invalid-argument" in str(err):
                invalid.append(tokens[i])
    return {"sent": resp.success_count, "failed": resp.failure_count, "invalid_tokens": invalid}
