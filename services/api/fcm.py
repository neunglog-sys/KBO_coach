# -*- coding: utf-8 -*-
"""FCM 발송 모듈 — firebase-admin으로 푸시 전송.

서비스 계정 키: 환경변수 FIREBASE_CRED_PATH, 없으면 repo 루트의 *firebase-adminsdk*.json 자동 탐색.
키는 .gitignore 처리됨(절대 커밋 금지).
"""
import datetime
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
        try:
            firebase_admin.initialize_app(credentials.Certificate(_cred_path()))
        except RuntimeError:
            # 키 파일 없으면 ADC 사용 (Cloud Run 서비스계정 = firebase-adminsdk SA)
            firebase_admin.initialize_app()
    _initialized = True


def send_to_tokens(tokens: list[str], title: str, body: str, data: dict | None = None,
                   ttl_seconds: int | None = None) -> dict:
    """여러 토큰에 알림 발송. 반환: {sent, failed, invalid_tokens}.
    invalid_tokens = 만료·미등록 토큰(정리 대상).
    ttl_seconds: 지정 시 그 시간 안에 배달 못 하면 FCM이 폐기 → 기기를 늦게 켜도 지난 알림이 안 옴."""
    if not tokens:
        return {"sent": 0, "failed": 0, "invalid_tokens": []}
    _ensure_init()
    extra = {}
    if ttl_seconds is not None:
        extra["android"] = messaging.AndroidConfig(ttl=datetime.timedelta(seconds=ttl_seconds))
        extra["webpush"] = messaging.WebpushConfig(headers={"TTL": str(ttl_seconds)})
    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
        **extra,
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
