# -*- coding: utf-8 -*-
"""
음성합성 — POST /tts.

기본: Azure Neural TTS로 **음성(mp3)** + **viseme 타임라인**을 함께 반환(립싱크용).
구단 보이스: team_code가 있으면 **음성=ElevenLabs(구단별 캐릭터/사투리 보이스)**,
**입모양=Azure viseme**를 ElevenLabs 길이에 맞춰 스케일. Azure·ElevenLabs는 병렬 호출.
viseme = 발화 중 입모양 타이밍 [{offset(ms), id}] → 프론트에서 3D 입모양에 매핑.

설정(.env, 루트):
  AZURE_SPEECH_KEY      (필수) Azure Speech 리소스 키
  AZURE_SPEECH_REGION   (필수) 리소스 지역 (예: koreacentral)
  AZURE_TTS_VOICE       (선택) 기본 보이스, 기본값 ko-KR-SunHiNeural
  ELEVENLABS_KEY        (선택) 있으면 구단 보이스 활성. 없으면 Azure 단독.
  ELEVENLABS_MODEL      (선택) 기본 eleven_v3
"""
import base64
import io
import os
import re
import threading
import wave
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor

import requests
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

# ── 구단 보이스: 음성=ElevenLabs(구단별 캐릭터/사투리), 입모양=Azure viseme(길이에 맞춰 정렬) ──
# ELEVENLABS_KEY 있고 구단코드 있으면 자동 활성. 없으면 Azure 단독(프로덕션 안전).
ELEVEN_KEY = os.environ.get("ELEVENLABS_KEY")
ELEVEN_MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_v3")
ELEVEN_VOICE = {                          # team_code → ElevenLabs voice_id (구단별 확정 보이스)
    "SS": "oCGrO4fC1eEQUw2T7zxa",         # 삼성 (경상·남)
    "LT": "YWZp0kp04cSI79eVijrX",         # 롯데 (경상·남)
    "HT": "6ghOKtsRs57f0DTCDWmq",         # 기아 (전라·남)
    "HH": "FGLxBYXsCNeXWvXHe193",         # 한화 (충청·여)
    "LG": "f1jSprXYPgiSbio3N4pp",         # LG (표준어·여)
    "OB": "oMzFTv55ovUK27h8iS5n",         # 두산 (표준어·남)
    "KT": "7qAqosQrZcvLrawKW2Mq",         # KT (표준어·여)
    "SK": "qDYEWTCdFmiN1IyrEze6",         # SSG (표준어·남)
    "NC": "Uw2XvkJIih5308czJ9Ib",         # NC (창원/경상 사투리·능청 남) — 안정 보이스
    "WO": "XZAfpfQfaYAGv3W67mld",         # 키움 (표준어·여)
}
# creator 등급에서 되는 고음질 포맷(44.1kHz mp3) — 샘플 비교 때와 동일.
# (pcm_44100은 상위 등급 전용이라 거부됨 → Azure 폴백되던 문제 회피)
_ELEVEN_FORMAT = "mp3_44100_128"
_ELEVEN_MP3_KBPS = 128


def _wav_dur(b: bytes) -> float:
    w = wave.open(io.BytesIO(b))
    try:
        return w.getnframes() / float(w.getframerate())
    finally:
        w.close()


def _eleven_synth(text: str, voice_id: str):
    """ElevenLabs 합성 → (mp3 bytes, 길이초). 통문장 1회 호출(문맥 살려 자연스럽게 — 쪼개지 않음).
    seed 고정 + stability로 음색 안정."""
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"},
        params={"output_format": _ELEVEN_FORMAT},
        json={"text": text, "model_id": ELEVEN_MODEL,
              "seed": 1234,
              "voice_settings": {"stability": 0.5, "similarity_boost": 0.85}},
        timeout=12)   # 멈추면 12초 내 Azure 폴백(프론트 워치독 15초보다 먼저)
    if r.status_code != 200:
        raise RuntimeError(f"ElevenLabs {r.status_code}: {r.text[:160]}")
    mp3 = r.content
    dur = len(mp3) * 8.0 / (_ELEVEN_MP3_KBPS * 1000)   # CBR 128k 길이 추정
    return mp3, dur

# 숫자 → 한자어 한글(한 글자=한 글자, 길이 보존). "1번"을 "한번"이 아닌 "일번"으로 읽게.
# 길이가 보존돼야 단어경계 textOffset이 화면 텍스트와 그대로 맞아 자막 싱크가 안 깨진다.
_SINO_DIGIT = {"0": "영", "1": "일", "2": "이", "3": "삼", "4": "사",
               "5": "오", "6": "육", "7": "칠", "8": "팔", "9": "구"}
# 고유어 한 자리 숫자(개·명·마리…용). ElevenLabs는 "4개"를 "사 개"로 잘못 읽어 직접 변환.
_NATIVE_DIGIT = {"1": "한", "2": "두", "3": "세", "4": "네", "5": "다섯",
                 "6": "여섯", "7": "일곱", "8": "여덟", "9": "아홉"}


# 한자어로 읽는 단위(번/루/회 등) 바로 앞의 '한 자리' 숫자만 한자어로 치환.
# 고유어로 읽는 단위(개·명·마리 등)는 그대로 둬서 Azure 기본("네 개")에 맡긴다.
# 두 자리 이상(12회 등)도 그대로 둬서 Azure가 "십이회"로 정확히 읽게 한다. (한 자→한 자라 길이 보존)
# '번'은 모호 — 타순(1번 타자=일번, 한자어) vs 횟수(네 번, 고유어). 분리 처리.
_SINO_UNITS = "루|회|점|호|위|년|차|군|이닝|강|쿼터|연패|연승"
_NATIVE_UNITS = "개|명|마리|살|잔|그릇|판|봉|번"   # '번'(횟수) 포함


def _read_numbers(s: str) -> str:
    """Azure용: 한자어 단위 앞 숫자만 치환(길이 보존). 고유어 단위는 Azure가 알아서.
    '번'은 타순(N번 타자/타석/타순)일 때만 한자어로."""
    s = re.sub(r"(?<!\d)(\d)(?!\d)(?=번\s*(?:타자|타석|타순))",
               lambda m: _SINO_DIGIT[m.group(1)], s)
    return re.sub(rf"(?<!\d)(\d)(?!\d)(?={_SINO_UNITS})",
                  lambda m: _SINO_DIGIT[m.group(1)], s)


def _read_numbers_eleven(s: str) -> str:
    """ElevenLabs용: 한자어 + 고유어 단위 모두 한글로(길이 보존 불필요, 경계 미사용).
    타순 '번'은 위에서 이미 한자어 처리됨 → 여기 고유어 '번'은 횟수만 잡힘("4번 던지면"→"네 번")."""
    s = _read_numbers(s)
    # 고유어 단위 앞 한 자리 숫자 → 고유어 수사 + 공백("4개"→"네 개", "4번"→"네 번")
    s = re.sub(rf"(?<!\d)([1-9])(?!\d)\s*(?={_NATIVE_UNITS})",
               lambda m: _NATIVE_DIGIT[m.group(1)] + " ", s)
    return s


# 웃음/감정 자음 연속(ㅎㅎ·ㅋㅋ·ㅠㅠ) + 텍스트 이모티콘 — TTS 엔진이 못 읽거나 막히는 토큰.
_LAUGH_RE = re.compile(r"[ㅎㅋㅠㅜㅡ]{2,}")
_EMOTICON_RE = re.compile(r"\^\^;?|\^_\^|:[\)\(DdPp]|>_<|ㅇ[_ㅅ]ㅇ|T_T|;;+|\(긁적\)|\(머쓱\)|\(긁\)")


def _strip_emoticon(s: str) -> str:
    """이모티콘/특수문자 표정 제거(ElevenLabs용 — 웃음 자음 ㅎㅎ는 남겨 캐릭터 웃음 유지)."""
    s = _EMOTICON_RE.sub(" ", s)
    return re.sub(r"\s{2,}", " ", s).strip()


def _strip_nonspeech(s: str) -> str:
    """웃음 자음 + 이모티콘까지 제거(Azure용 — Azure가 ㅎㅎ 등에서 막혀 합성 취소되는 것 방지)."""
    s = _LAUGH_RE.sub(" ", s)
    return _strip_emoticon(s)


def _azure_synth(text: str, voice: str, want_pcm: bool):
    """Azure 합성 → (audio bytes, visemes, boundaries). want_pcm=True면 wav(PCM), 아니면 mp3.
    웃음 자음/이모티콘은 제거 후 합성(Azure 막힘 방지). 읽을 게 없거나 실패하면 빈 결과(예외 X)."""
    clean = _read_numbers(_strip_nonspeech(text)).strip()
    if not clean:
        return b"", [], []   # 웃음/이모티콘뿐 → 합성할 게 없음(립싱크 생략)
    import azure.cognitiveservices.speech as speechsdk

    speech_config = speechsdk.SpeechConfig(subscription=AZURE_KEY, region=AZURE_REGION)
    speech_config.speech_synthesis_voice_name = voice
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm if want_pcm
        else speechsdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3
    )
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

    visemes: list[dict] = []
    boundaries: list[dict] = []
    # audio_offset 단위는 100나노초(틱) → 1ms = 10000틱
    synthesizer.viseme_received.connect(
        lambda evt: visemes.append({"offset": evt.audio_offset / 10000, "id": evt.viseme_id})
    )
    synthesizer.synthesis_word_boundary.connect(
        lambda evt: boundaries.append({
            "offset": evt.audio_offset / 10000,
            "textOffset": evt.text_offset,
            "length": evt.word_length,
        })
    )
    # 정리된 텍스트로 합성(숫자 한글화 포함). 길이 보존이라 viseme·단어경계 오프셋 유지.
    result = synthesizer.speak_text_async(clean).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return result.audio_data, visemes, boundaries
    return b"", [], []   # 취소/실패 → 빈 결과(비치명). 두-TTS면 ElevenLabs 음성은 그대로.


class TtsIn(BaseModel):
    text: str
    voice: str | None = None
    team_code: str | None = None   # 구단코드 있으면 ElevenLabs 구단 보이스로(Azure viseme 병렬)


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
    two_tts = bool(body.team_code in ELEVEN_VOICE and ELEVEN_KEY)
    cache_key = (text, body.voice or DEFAULT_VOICE, body.team_code if two_tts else "")
    cached = _tts_cache_get(cache_key)
    if cached is not None:   # 캐시 적중 → 재합성 없이 즉시 반환
        return cached
    if not AZURE_KEY or not AZURE_REGION:
        raise HTTPException(
            status_code=503,
            detail="Azure 미설정: 루트 .env에 AZURE_SPEECH_KEY / AZURE_SPEECH_REGION 필요",
        )
    try:
        import azure.cognitiveservices.speech  # noqa: F401
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="azure-cognitiveservices-speech 미설치 (pip install azure-cognitiveservices-speech)",
        )

    voice = body.voice or DEFAULT_VOICE

    if not two_tts:
        # Azure 단독 — 음성(mp3) + viseme
        audio, visemes, boundaries = _azure_synth(text, voice, want_pcm=False)
        if not audio:
            raise HTTPException(status_code=502, detail="Azure 합성 실패")
        out = {"audio": base64.b64encode(audio).decode("ascii"), "mime": "audio/mpeg",
               "voice": voice, "visemes": visemes, "boundaries": boundaries}
        _tts_cache_put(cache_key, out)
        return out

    # 구단 보이스 — Azure(viseme·길이용 PCM) ∥ ElevenLabs(음성) 병렬. 음성은 항상 ElevenLabs 우선.
    with ThreadPoolExecutor(max_workers=2) as ex:
        # ElevenLabs는 이모티콘만 제거(ㅎㅎ 웃음은 유지), Azure는 자체적으로 더 정리.
        fut_el = ex.submit(_eleven_synth, _read_numbers_eleven(_strip_emoticon(text)),
                           ELEVEN_VOICE[body.team_code])
        az_audio, visemes, boundaries = _azure_synth(text, voice, want_pcm=True)  # 빈 결과 가능(비치명)

    try:
        el_audio, el_dur = fut_el.result()
        audio = el_audio
        mime = "audio/mpeg"   # ElevenLabs = mp3
        # Azure viseme가 있을 때만 ElevenLabs 길이에 맞춰 스케일(없으면 립싱크 생략, 음성은 정상)
        if az_audio and visemes:
            try:
                # 기준을 az_dur(무음 포함 전체길이)이 아니라 'Azure 마지막 viseme'(=발화 끝)로.
                # 그래야 입모양이 ElevenLabs 오디오 끝까지 가고 일찍 멈추지 않는다.
                az_end_ms = visemes[-1]["offset"] or (_wav_dur(az_audio) * 1000.0) or 1.0
                el_ms = el_dur * 1000.0
                scale = (el_ms / az_end_ms) if az_end_ms else 1.0
                # 안전 범위(과도 보정 방지)
                scale = min(2.5, max(0.5, scale))
                visemes = [{"offset": round(v["offset"] * scale, 1), "id": v["id"]} for v in visemes]
                boundaries = [{"offset": round(b["offset"] * scale, 1),
                               "textOffset": b["textOffset"], "length": b["length"]} for b in boundaries]
            except Exception:
                visemes, boundaries = [], []
    except Exception:
        # ElevenLabs 실패 → Azure 오디오(wav)로 폴백(있으면), 둘 다 실패면 에러
        if not az_audio:
            raise HTTPException(status_code=502, detail="TTS 합성 실패")
        audio = az_audio
        mime = "audio/wav"

    out = {"audio": base64.b64encode(audio).decode("ascii"), "mime": mime,
           "voice": voice, "visemes": visemes, "boundaries": boundaries}
    _tts_cache_put(cache_key, out)
    return out


def warmup() -> bool:
    """Azure TTS 연결·SDK 예열(짧은 단독 합성). 첫 합성 콜드 지연 감소."""
    if not AZURE_KEY or not AZURE_REGION:
        return False
    try:
        _azure_synth("안녕", DEFAULT_VOICE, want_pcm=False)
        return True
    except Exception:
        return False
