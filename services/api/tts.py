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

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["tts"])

AZURE_KEY = os.environ.get("AZURE_SPEECH_KEY")
AZURE_REGION = os.environ.get("AZURE_SPEECH_REGION")
DEFAULT_VOICE = os.environ.get("AZURE_TTS_VOICE", "ko-KR-SunHiNeural")


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

    result = synthesizer.speak_text_async(text).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        audio_b64 = base64.b64encode(result.audio_data).decode("ascii")
        return {
            "audio": audio_b64,
            "mime": "audio/mpeg",
            "voice": voice,
            "visemes": visemes,
            "boundaries": boundaries,
        }

    if result.reason == speechsdk.ResultReason.Canceled:
        cancel = result.cancellation_details
        raise HTTPException(
            status_code=502,
            detail=f"Azure 합성 취소: {cancel.reason} / {cancel.error_details}",
        )
    raise HTTPException(status_code=502, detail="Azure 합성 실패")
