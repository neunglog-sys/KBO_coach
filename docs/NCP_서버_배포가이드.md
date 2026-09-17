# NCP 서버 배포 가이드 (공모전 기간용)

GCP 결제가 끊겨서 백엔드(FastAPI)를 네이버 클라우드 가상 서버 한 대로 옮긴다.
DB(Supabase·MongoDB Atlas)는 이미 복구돼 있어서 서버는 코드만 올리고 붙이면 된다.

- 목표 기간: 2026-09-18 ~ 10-17 (원티드 AI 챔피언십 제출·심사·데모데이)
- 비용: NCP 신규 가입 크레딧 10만 원 + Micro 서버 1년 무료. 공인 IP는 별도 과금(소액)
- 이 문서에 비밀값은 없다. `.env` 값과 Firebase 키 파일은 개인 메시지로 받는다.

---

## 0. 준비물

| 항목 | 받는 곳 |
|---|---|
| NCP 계정 (결제수단 등록) | ncloud.com 가입 |
| `.env` 값 | 개인 메시지 |
| `kboai-5dea0-firebase-adminsdk-*.json` (푸시 알림용) | 개인 메시지 |
| 서버 도메인 | DuckDNS 무료 (2번) |

---

## 1. 서버 만들기 (NCP 콘솔)

1. **Server → 서버 생성**, VPC 환경
2. 이미지: **Ubuntu 22.04** (24.04가 Micro에서 선택되면 그것도 가능)
3. 서버 타입: **Micro** (무료)
4. 인증키: 새로 만들고 `.pem` 파일 보관 (관리자 비밀번호 확인에 필요)
5. **ACG(방화벽) 인바운드**
   - TCP 22: 내 IP만
   - TCP 80: 0.0.0.0/0 (HTTPS 인증서 발급에 필요)
   - TCP 443: 0.0.0.0/0
6. **공인 IP** 신청해서 서버에 연결
7. 서버 목록 → 서버 관리 → **관리자 비밀번호 확인** (`.pem` 업로드) → root 비밀번호 확인

## 2. 도메인 연결 (DuckDNS)

웹(https)에서 http 서버를 부르면 브라우저가 막는다. 그래서 HTTPS가 필수고, 인증서에는 도메인이 필요하다.

1. https://www.duckdns.org 에서 GitHub/구글로 로그인
2. 서브도메인 생성 (예: `gongbok-api` → `gongbok-api.duckdns.org`)
3. current ip 칸에 NCP 공인 IP 입력 → update ip

이하 `<도메인>`은 이 주소로 바꿔서 입력.

## 3. 서버 기본 세팅

```bash
ssh root@<공인IP>

timedatectl set-timezone Asia/Seoul        # 예약 크롤이 한국 시간 기준
apt update && apt install -y git python3-venv python3-pip curl

git clone https://github.com/neunglog-sys/KBO_coach.git /opt/kbo
cd /opt/kbo
git checkout dev                            # dev가 운영 브랜치

python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt   # API + 크롤러 의존성 통합본
```

> `azure-cognitiveservices-speech` 설치가 실패하면 넘어가도 된다.
> Azure 키가 만료된 상태라 어차피 안 쓰고, 코드가 없어도 동작하게 돼 있다.

## 4. 환경변수 (`/opt/kbo/.env`)

```bash
nano /opt/kbo/.env
```

아래 키에 받은 값을 채운다. **표시한 줄은 값이 정해져 있으니 그대로 입력.**

```
MONGO_URI=
MONGO_DB=kbo
DATABASE_URL=
JWT_SECRET=
GOOGLE_CLIENT_ID=
KAKAO_REST_KEY=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_SEARCH_MODEL=gemini-2.5-flash
GEMINI_SEARCH_TIMEOUT_S=12
GEMINI_SEARCH_THINKING_BUDGET=0
ELEVENLABS_KEY=
INTERNAL_TOKEN=
PORT=8000

# ↓ 값 고정
GOOGLE_GENAI_USE_VERTEXAI=false
TZ=Asia/Seoul
CRAWL_DIR=/opt/kbo/data/crawling
FRONTEND_ORIGIN=https://kboai-5dea0.web.app
KAKAO_REDIRECT_URI=https://<도메인>/auth/kakao/callback
NAVER_REDIRECT_URI=https://<도메인>/auth/naver/callback
```

- `GOOGLE_GENAI_USE_VERTEXAI=false` **필수**. true면 GCP(결제 끊김)로 Gemini를 부르다 실패한다.
- 기본 RAG 답변은 `GEMINI_MODEL`, 최신 정보가 필요한 질문만 `GEMINI_SEARCH_MODEL`과 Google Search를 사용한다.
- `GEMINI_SEARCH_TIMEOUT_S`를 넘기면 자동 재검색하지 않고 사용자에게 같은 질문을 다시 보내 달라고 안내한다.
- Gemini 2.5 Flash 검색은 `GEMINI_SEARCH_THINKING_BUDGET=0`으로 내부 사고가 짧은 출력 한도를 소진하지 않게 한다.
- `INTERNAL_TOKEN`은 새로 만들면 된다: `openssl rand -hex 24` 출력값을 넣고 따로 적어둔다(7번에서 사용).
- `PORT=8000`은 경기 종료 감지 후 API가 자기 자신의 결과 크롤 엔드포인트를 호출할 때 필요하다.
- `KAKAO_CLIENT_SECRET`은 비워둬도 된다. 현재 카카오 앱이 클라이언트 시크릿 미사용 설정인 것을 확인했다(2026-09-14).
- `AZURE_SPEECH_KEY`는 만료(401)라 넣지 않아도 된다. 구단 음성은 ElevenLabs로 나온다.

Firebase 키 파일은 **리포 루트에 원래 이름 그대로** 올린다. 코드가 루트의 `*firebase-adminsdk*.json`을 자동으로 찾는다.

```bash
# 내 PC에서
scp kboai-5dea0-firebase-adminsdk-*.json root@<공인IP>:/opt/kbo/
```

## 5. 동작 확인 → 상시 실행 등록

먼저 직접 띄워서 확인:

```bash
cd /opt/kbo
.venv/bin/uvicorn main:app --app-dir services/api --host 127.0.0.1 --port 8000
# 다른 터미널에서
curl http://127.0.0.1:8000/standings     # 순위 JSON이 나오면 성공
```

확인되면 Ctrl+C로 끄고 서비스로 등록 (서버 재부팅·오류 시 자동 재시작):

```bash
cat > /etc/systemd/system/kbo-api.service <<'EOF'
[Unit]
Description=KBO API (FastAPI)
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/kbo
ExecStart=/opt/kbo/.venv/bin/uvicorn main:app --app-dir services/api --host 127.0.0.1 --port 8000
Environment=PYTHONIOENCODING=utf-8
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now kbo-api
systemctl status kbo-api        # active (running) 확인
journalctl -u kbo-api -f        # 로그 보기
```

## 6. HTTPS (Caddy)

Caddy는 도메인만 적으면 인증서를 자동 발급·갱신한다.

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https gnupg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

cat > /etc/caddy/Caddyfile <<'EOF'
<도메인> {
    reverse_proxy 127.0.0.1:8000
}
EOF

systemctl reload caddy
```

브라우저에서 `https://<도메인>/standings` 가 열리면 완료.
안 되면 ACG 80/443 인바운드와 DuckDNS IP를 먼저 확인.

## 7. 예약 작업 (기존 Cloud Scheduler 대체)

권장 방식은 저장소의 설치 스크립트를 쓰는 것이다. 크롤링 타이머뿐 아니라 여러 명이
RAG 콘텐츠를 수정했을 때 임베딩을 5분 안에 다시 만드는 타이머도 함께 설치된다.

```bash
cd /opt/kbo
bash infra/ncp/install-scheduled-jobs.sh
systemctl list-timers --all | grep -E 'kbo-(notify|daily-crawl|lineup|rag-refresh)'
```

아래 `crontab` 방식은 설치 스크립트를 쓰지 못할 때만 사용하는 수동 대안이다.

```bash
crontab -e
```

`<INTERNAL_TOKEN>`을 4번에서 만든 값으로 바꿔서 붙여넣기:

```
# 경기 임박 알림 + 경기 종료 후 크롤 트리거 (2분마다)
*/2 * * * * curl -s -m 110 -X POST -H "X-Internal-Token: <INTERNAL_TOKEN>" http://127.0.0.1:8000/internal/notify > /dev/null
# 데일리 크롤 백업 (매일 09:00)
0 9 * * * curl -s -m 900 -X POST -H "X-Internal-Token: <INTERNAL_TOKEN>" http://127.0.0.1:8000/internal/crawl > /dev/null
# 선발 라인업 (13:00 / 16:00 / 17:30)
0 13 * * * curl -s -m 120 -X POST -H "X-Internal-Token: <INTERNAL_TOKEN>" http://127.0.0.1:8000/internal/lineup > /dev/null
0 16 * * * curl -s -m 120 -X POST -H "X-Internal-Token: <INTERNAL_TOKEN>" http://127.0.0.1:8000/internal/lineup > /dev/null
30 17 * * * curl -s -m 120 -X POST -H "X-Internal-Token: <INTERNAL_TOKEN>" http://127.0.0.1:8000/internal/lineup > /dev/null
```

매일 크롤이 DB에 붙기 때문에 Supabase·Atlas 무료 플랜 자동 정지도 같이 막힌다.

수동 점검:

```bash
curl -X POST -H "X-Internal-Token: <INTERNAL_TOKEN>" http://127.0.0.1:8000/internal/crawl
```

## 8. 코드 업데이트 방법 (일반 사용자)

평소에는 NCP 콘솔이나 서버 터미널에 접속할 필요가 없다.

1. 각자 기능 브랜치에서 코드를 수정하고 GitHub에 push한다.
2. 기능 브랜치에서 `dev`로 Pull Request를 만들고 승인 후 merge한다.
3. GitHub의 **Actions → Deploy to NCP** 실행이 초록색 성공인지 확인한다.
4. NCP 서버가 2분마다 `dev`를 확인하므로, 보통 merge 후 2~3분 안에 자동 반영된다.
5. `https://baseball-coach.duckdns.org/`에서 동작을 확인한다.

GitHub 화면에 예전 이름인 `Deploy to GCP`가 보이면 페이지를 새로고침한다. 실제 배포 대상은
워크플로 파일의 이름과 실행 단계가 `Deploy to NCP`인지 열어서 확인하면 된다.

서버 환경변수(`/opt/kbo/.env`)처럼 Git에 들어가지 않는 값을 바꿀 때만 관리자 비밀번호로
서버에 접속해 수동 작업한다. `infra/ncp`의 systemd 서비스·타이머와 RAG 갱신 SQL은
자동배포가 변경을 감지해 재설치하므로 최초 설치 이후에는 별도 SSH 작업이 필요 없다.

### 자동배포가 실패했을 때 서버에서 수동 적용

```bash
# Actions의 Deploy to NCP가 성공한 뒤 실행한다.
systemctl start kbo-auto-deploy.service
systemctl status kbo-auto-deploy.service --no-pager
journalctl -u kbo-auto-deploy.service -n 50 --no-pager
```

환경변수만 수정했다면 자동배포 대신 `/opt/kbo/.env`를 저장하고
`systemctl restart kbo-api`를 실행한다.

## 9. LLM 운영 로그 확인

LLM 운영 로그는 웹·앱 화면이나 공개 API에 노출하지 않고 NCP 서버의 systemd journal에만
남긴다. 서버 SSH 접근 권한과 `sudo` 권한이 있는 관리자만 확인할 수 있다. 질문 원문,
답변 원문, 사용자 토큰, Gemini API 키는 기록하지 않는다.

실시간 확인:

```bash
sudo journalctl -u kbo-api -f -o cat | grep chat_ops
```

최근 30분 확인:

```bash
sudo journalctl -u kbo-api --since "30 minutes ago" -o cat | grep chat_ops
```

주요 필드:

- `route`: `rag`, `google_search`, `web_cache`, `voice_stream`, `voice_error`, `search_timeout`, `search_unavailable`
- `model`: 실제 선택된 기본 모델 또는 검색 모델
- `duration_ms`: API 요청 전체 응답시간
- `timing_ms.rag`: RAG 자료 준비시간
- `timing_ms.model`: 기본 모델 생성시간
- `timing_ms.search`: Google Search 포함 검색 모델 시간
- `timing_ms.tts`: 음성 답변 합성 누적시간
- `cache`: `none`, `memory`, `persistent`, `web`
- `status`: `success`, `timeout`, `quota`, `auth`, `provider_unavailable`, `provider_error`
- `sources_count`: 검색 답변에 연결된 검증 출처 개수
- `tts_failures`: 음성 답변 중 합성에 실패해 텍스트만 보낸 문장 수
- `request_id`: 같은 요청의 공급자 오류와 최종 결과를 연결하는 임의 ID

예시:

```text
chat_ops {"event":"request_completed","request_id":"a1b2c3d4e5f6","endpoint":"chat_progress","status":"success","route":"google_search","model":"gemini-2.5-flash","duration_ms":4231,"timing_ms":{"rag":84,"search":4012},"cache":"none","cached":false,"sources_count":3,"team_code":"HH"}
```

`provider_failed` 이벤트가 함께 나오면 Gemini 호출 단계의 실패다. `status=timeout`은 시간
초과, `quota`는 할당량 소진, `auth`는 키·권한 문제, `provider_unavailable`은 Gemini 서버나
연결 장애를 뜻한다.

---

## 끝나면 공유할 것

- **서버 도메인 주소** (`https://<도메인>`)
- **INTERNAL_TOKEN 값** (개인 메시지로)

이 주소로 이어서 하는 작업 (서버 담당 아님):

1. 웹 재배포: `frontend/firebase.json`의 Cloud Run 연결(rewrites) 제거 + 빌드에 `VITE_API_BASE=https://<도메인>` 넣어 Firebase Hosting 재배포
2. 카카오·네이버 개발자 콘솔에 새 콜백 주소 등록
   - `https://<도메인>/auth/kakao/callback`
   - `https://<도메인>/auth/naver/callback`
3. GitHub Actions의 GCP 백엔드 배포 잡 비활성화 (dev 푸시마다 실패함)
