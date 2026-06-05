# Azure TTS 배포 가이드

`/tts`(Azure 음성합성 + viseme) 기능을 **배포 서버**에서 동작시키는 방법.

> 왜 배포가 필요한가: 이전 TTS는 폰(기기) 안에서 돌아 서버가 필요 없었지만,
> **Azure TTS는 키를 숨겨야 해서 반드시 백엔드(`/tts`)를 거쳐야** 한다.
> 그래서 백엔드 코드 + Azure 키를 배포 서버에 올려야 동작한다.

---

## 배포 구조

```
Firebase Hosting (firebase CLI)          ← 프론트(정적 dist) + 경로 라우팅(rewrite)
   │  /chat, /tts ... 요청을 넘김
   ▼
Cloud Run "kbo-api" (gcloud)             ← 실제 FastAPI 백엔드. /tts 가 여기서 Azure 호출
   project: kboai-5dea0 / region: asia-northeast3
   배포방식: Dockerfile 없음 → buildpack + Procfile(루트)
```

- **firebase** = 프론트/라우팅 담당
- **gcloud** = 실제 백엔드(파이썬 + Azure) 담당 → `/tts`는 gcloud 영역

---

## 사전 준비 (코드) — ✅ 이미 반영됨

| 파일 | 변경 |
|------|------|
| `requirements.txt` (루트) | `azure-cognitiveservices-speech` 추가 (buildpack이 이 파일 사용) |
| `services/api/requirements.txt` | `azure-cognitiveservices-speech` 추가 |
| `services/api/tts.py` | `POST /tts`, `GET /tts/health` 신규 |
| `services/api/main.py` | `tts_router` 등록 |
| `frontend/firebase.json` | `/tts` rewrite 추가 (Hosting → Cloud Run) |

남은 건 **배포 명령 + Azure 키 등록**뿐.

---

## 0. CLI 준비 (이미 돼 있으면 skip)

```bash
# gcloud — https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project kboai-5dea0

# firebase
npm install -g firebase-tools
firebase login
```

---

## 1. Cloud Run에 Azure 키 환경변수 등록

로컬 `.env`는 `.gcloudignore`로 업로드에서 제외되므로 **서버에 따로 넣어야 한다.**

```bash
gcloud run services update kbo-api --region asia-northeast3 \
  --update-env-vars AZURE_SPEECH_KEY=<84자리_키>,AZURE_SPEECH_REGION=koreacentral
```

> ⚠️ 키에 특수문자가 있으면 CLI에서 깨질 수 있다. 안전하게는 **웹 콘솔** 권장:
> [Cloud Run 콘솔](https://console.cloud.google.com/run) → `kbo-api` → "새 버전 수정 및 배포"
> → **변수 및 보안 비밀** 탭 → `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` 추가 → 배포
>
> `AZURE_SPEECH_REGION` 값은 반드시 소문자 식별자 **`koreacentral`** (×"Korea Central")

---

## 2. 백엔드 코드 재배포 (Cloud Run)

**저장소 루트**(Procfile 있는 곳)에서:

```bash
gcloud run deploy kbo-api --source . --region asia-northeast3 --allow-unauthenticated
```

→ buildpack이 루트 `requirements.txt`(azure 포함)로 빌드한다.

> 💡 GitHub 자동배포(Cloud Build 트리거)가 걸려 있다면, **git push만으로 이 단계가 자동**으로 될 수 있다.

---

## 3. Firebase Hosting 재배포 (/tts 라우팅 반영)

```bash
cd frontend
npm run build:android   # 또는 npm run build
firebase deploy --only hosting
```

---

## 4. 검증

```bash
curl https://kboai-5dea0.web.app/tts/health
# 기대: {"configured":true,"region":"koreacentral","voice":"ko-KR-SunHiNeural","sdk_installed":true}
```

- `configured:true` → 키 인식 OK
- `sdk_installed:false` 또는 실제 호출 시 500/502 → **5번(시스템 라이브러리) 이슈**

실제 합성 테스트:
```bash
curl -X POST https://kboai-5dea0.web.app/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"안녕하세요"}'
# audio(base64) + visemes 가 오면 성공
```

---

## 5. (실패 시) Azure SDK 시스템 라이브러리 — Dockerfile 전환

Cloud Run 로그에 `azure.cognitiveservices.speech` import 에러나 합성 실패가 뜨면,
buildpack 기본 이미지에 시스템 lib(`libasound2`, `libssl` 등)이 없는 것.
→ **Dockerfile 방식**으로 전환:

루트에 `Dockerfile` 생성:
```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl-dev libasound2 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD uvicorn main:app --app-dir services/api --host 0.0.0.0 --port $PORT
```

배포는 동일:
```bash
gcloud run deploy kbo-api --source . --region asia-northeast3 --allow-unauthenticated
```
(Dockerfile이 있으면 gcloud가 buildpack 대신 Dockerfile을 사용)

---

## 6. 앱을 배포 모드로 복귀

로컬 테스트 모드(`adb reverse` + localhost)에서 배포 모드로 되돌리기:

`frontend/.env.android`:
```
# 로컬 테스트용 (주석 처리)
# VITE_API_BASE=http://localhost:8000

# 배포용 (활성화)
VITE_API_BASE=https://kboai-5dea0.web.app
```

그 후:
```bash
cd frontend
npm run android:sync
# 안드로이드 스튜디오 또는 ./gradlew installDebug 로 폰 재설치
```

이제 폰이 USB·로컬 백엔드 없이 어디서나 Azure 목소리 + 입모양으로 동작한다.

---

## 체크리스트

- [ ] 1. Cloud Run에 `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION(=koreacentral)` 등록
- [ ] 2. `gcloud run deploy kbo-api --source .` (또는 git push 자동배포)
- [ ] 3. `firebase deploy --only hosting`
- [ ] 4. `curl .../tts/health` → `configured:true` 확인
- [ ] 5. (필요시) Dockerfile 전환
- [ ] 6. `.env.android` 배포 URL로 복귀 + 앱 재빌드

---

## 참고: 왜 gcloud가 필요한가

- Firebase Hosting은 **정적 파일만** 서빙 → 파이썬(`tts.py`)을 못 돌림
- 실제 백엔드는 **Cloud Run**에서 실행 → 코드 배포 + 키 주입은 `gcloud`(또는 콘솔/자동배포)로
- 즉 gcloud가 본질이 아니라 "Cloud Run에 코드+키를 넣는 수단"이 필요한 것
