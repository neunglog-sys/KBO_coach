# -*- coding: utf-8 -*-
"""
음성합성 — POST /tts (Azure Speech).

텍스트를 Azure Neural TTS로 합성해 **음성(mp3, base64)** 과 **viseme 타임라인**을 함께 반환한다.
viseme = 발화 중 입모양 타이밍 [{offset(ms), id}] → 프론트에서 3D 입모양에 매핑(립싱크)용.

설정(.env, 루트):
  AZURE_SPEECH_KEY      (필수) Azure Speech 리소스 키
  AZURE_SPEECH_REGION   (필수) 리소스 지역 (예: koreacentral)
  AZURE_TTS_VOICE       (선택) 기본 보이스, 기본값 ko-KR-SunHiNeural
"""
import base64
import os
import re
import threading
from collections import OrderedDict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["tts"])

# 음성 합성 캐시(텍스트+보이스) — 반복 답변은 Azure 재합성 없이 즉시 반환. (오디오라 항목 수는 작게)
_TTS_CACHE_MAX = 200
_tts_cache: "OrderedDict[tuple, dict]" = OrderedDict()
_tts_lock = threading.Lock()


def _tts_cache_get(key):
    with _tts_lock:
        hit = _tts_cache.get(key)
        if hit is not None:
            _tts_cache.move_to_end(key)
        return hit


def _tts_cache_put(key, value):
    with _tts_lock:
        _tts_cache[key] = value
        _tts_cache.move_to_end(key)
        while len(_tts_cache) > _TTS_CACHE_MAX:
            _tts_cache.popitem(last=False)

AZURE_KEY = os.environ.get("AZURE_SPEECH_KEY")
AZURE_REGION = os.environ.get("AZURE_SPEECH_REGION")
DEFAULT_VOICE = os.environ.get("AZURE_TTS_VOICE", "ko-KR-SunHiNeural")

# 숫자 → 한자어 한글(한 글자=한 글자, 길이 보존). "1번"을 "한번"이 아닌 "일번"으로 읽게.
# 길이가 보존돼야 단어경계 textOffset이 화면 텍스트와 그대로 맞아 자막 싱크가 안 깨진다.
_SINO_DIGIT = {"0": "영", "1": "일", "2": "이", "3": "삼", "4": "사",
               "5": "오", "6": "육", "7": "칠", "8": "팔", "9": "구"}


# 한자어로 읽는 단위(번/루/회 등) 바로 앞의 '한 자리' 숫자만 한자어로 치환.
# 고유어로 읽는 단위(개·명·마리 등)는 그대로 둬서 Azure 기본("네 개")에 맡긴다.
# 두 자리 이상(12회 등)도 그대로 둬서 Azure가 "십이회"로 정확히 읽게 한다. (한 자→한 자라 길이 보존)
_SINO_UNITS = "번|루|회|점|호|위|년|차|군|이닝|강|쿼터|연패|연승"


def _read_numbers(s: str) -> str:
    return re.sub(rf"(?<!\d)(\d)(?!\d)(?={_SINO_UNITS})",
                  lambda m: _SINO_DIGIT[m.group(1)], s)


class TtsIn(BaseModel):
    text: str
    voice: str | None = None


@router.get("/tts/health")
def tts_health():
    """Azure TTS 설정 상태 점검 (키 값은 노출하지 않음)."""
    try:
        import azure.cognitiveservices.speech  # noqa: F401
        sdk = True
    except ImportError:
        sdk = False
    return {
        "configured": bool(AZURE_KEY and AZURE_REGION),
        "region": AZURE_REGION,
        "voice": DEFAULT_VOICE,
        "sdk_installed": sdk,
    }


@router.post("/tts")
def tts(body: TtsIn):
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text가 비어 있습니다.")
    cache_key = (text, body.voice or DEFAULT_VOICE)
    cached = _tts_cache_get(cache_key)
    if cached is not None:   # 캐시 적중 → Azure 재합성 없이 즉시 반환
        return cached
    if not AZURE_KEY or not AZURE_REGION:
        raise HTTPException(
            status_code=503,
            detail="Azure 미설정: 루트 .env에 AZURE_SPEECH_KEY / AZURE_SPEECH_REGION 필요",
        )
    try:
        import azure.cognitiveservices.speech as speechsdk
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="azure-cognitiveservices-speech 미설치 (pip install azure-cognitiveservices-speech)",
        )

    voice = body.voice or DEFAULT_VOICE
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_KEY, region=AZURE_REGION)
    speech_config.speech_synthesis_voice_name = voice
    # 모바일 전송용으로 가벼운 mp3
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3
    )

    # audio_config=None → 스피커로 출력하지 않고 결과 바이트만 받는다(서버 합성).
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

    visemes: list[dict] = []
    boundaries: list[dict] = []
    # audio_offset 단위는 100나노초(틱) → 1ms = 10000틱
    synthesizer.viseme_received.connect(
        lambda evt: visemes.append({"offset": evt.audio_offset / 10000, "id": evt.viseme_id})
    )
    # 단어 경계: 그 단어를 말하기 시작하는 시각(ms) + 입력 텍스트상 위치 → 프론트 자막 동기화용
    synthesizer.synthesis_word_boundary.connect(
        lambda evt: boundaries.append({
            "offset": evt.audio_offset / 10000,
            "textOffset": evt.text_offset,
            "length": evt.word_length,
        })
    )

    # 숫자만 한글로 치환해 합성(표시 텍스트는 그대로). 길이 보존이라 viseme·단어경계 오프셋 유지.
    result = synthesizer.speak_text_async(_read_numbers(text)).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        audio_b64 = base64.b64encode(result.audio_data).decode("ascii")
        out = {
            "audio": audio_b64,
            "mime": "audio/mpeg",
            "voice": voice,
            "visemes": visemes,
            "boundaries": boundaries,
        }
        _tts_cache_put(cache_key, out)
        return out

    if result.reason == speechsdk.ResultReason.Canceled:
        cancel = result.cancellation_details
        raise HTTPException(
            status_code=502,
            detail=f"Azure 합성 취소: {cancel.reason} / {cancel.error_details}",
        )
    raise HTTPException(status_code=502, detail="Azure 합성 실패")
