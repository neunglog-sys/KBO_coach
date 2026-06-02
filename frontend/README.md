# Baseball Rookie Coach Frontend

야구 초보자를 위한 음성 기반 React 프론트엔드입니다. 사용자가 STT로 질문하면 프론트가 FastAPI 백엔드의 LLM 챗봇 API에 질문을 보내고, 응답을 화면과 TTS로 출력합니다.

## 기술 스택

- Vite
- React
- TypeScript
- TSX 컴포넌트 구조
- Web Speech API 기반 STT/TTS

## 실행 방법

```powershell
cd "C:\Users\82102_asozp43\OneDrive\바탕 화면\project2\project\frontend"
npm install
npm run dev
```

브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:5000
```

`file://.../frontend/index.html`로 직접 열면 Vite 프록시와 React 개발 서버가 동작하지 않습니다. 반드시 `npm run dev`로 실행한 뒤 `http://127.0.0.1:5000`에서 확인하세요.

## 주요 명령어

```powershell
npm run dev
npm run typecheck
npm run build
npm run preview
```

- `dev`: 5000번 포트에서 개발 서버 실행
- `typecheck`: TypeScript 타입 검사
- `build`: 배포용 빌드
- `preview`: 빌드 결과 미리보기

## TSX 전환 구조

기존 순수 HTML/CSS/JS 구조를 React + TypeScript 구조로 전환했습니다.

```text
frontend/
  index.html
  styles.css
  vite.config.js
  tsconfig.json
  package.json
  src/
    main.tsx
    App.tsx
    components/
      LoginView.tsx
      MainView.tsx
    data/
      baseballBasics.ts
    types/
      speech-recognition.d.ts
    vite-env.d.ts
  public/
    img/
      character.png
      ...
  assets/
    stadium-background.svg
```

역할은 다음과 같습니다.

- `src/main.tsx`: React 앱 진입점
- `src/App.tsx`: 로그인 상태와 인증 토큰 관리
- `src/components/LoginView.tsx`: 로그인 화면
- `src/components/MainView.tsx`: 메인 화면, 야구 10단 팀 선택, STT, TTS, 챗봇 UI, 야구 기초 목록
- `src/data/baseballBasics.ts`: 야구 기초 이미지 목록과 임시 fallback 답변
- `src/data/kboTeams.ts`: KBO 10개 구단 선택 목록
- `src/types/speech-recognition.d.ts`: 브라우저 STT 타입 선언
- `styles.css`: 전체 반응형 UI와 배경 스타일

## 백엔드 아키텍처 연동

백엔드는 `services/api`의 FastAPI 서버를 기준으로 맞춥니다.

```text
Frontend(Vite + React)  http://127.0.0.1:5000
        |
        | Vite proxy
        v
FastAPI Backend         http://127.0.0.1:8000
        |
        |-- MongoDB Atlas: KBO 동적 기록
        |-- PostgreSQL: 정적 야구 정보, 사용자, RAG 데이터
        |-- LLM API: 질문 답변 생성
```

프론트는 DB나 LLM API에 직접 접근하지 않습니다. 모든 요청은 FastAPI 백엔드를 거칩니다.

## 프록시 설정

`vite.config.js`에서 프론트 포트와 백엔드 프록시를 설정합니다.

- 프론트 개발 서버: `http://127.0.0.1:5000`
- FastAPI 백엔드: `http://127.0.0.1:8000`
- 인증 API: `POST /auth/login`
- 챗봇 API: `POST /chat`

프론트 코드에서는 백엔드 주소를 직접 쓰지 않고 같은 도메인 경로처럼 호출합니다.

```ts
fetch("/auth/login", ...)
fetch("/chat", ...)
```

Vite가 이 요청을 `http://127.0.0.1:8000`으로 넘겨줍니다.

## 로그인 흐름

1. `LoginView.tsx`에서 아이디와 비밀번호를 입력합니다.
2. `App.tsx`가 `POST /auth/login`으로 로그인 요청을 보냅니다.
3. 백엔드가 JWT를 반환하면 프론트가 토큰을 저장합니다.
4. 이후 `/chat` 요청에는 `Authorization: Bearer <token>` 헤더를 붙입니다.
5. 백엔드가 아직 없으면 데모용 `admin / admin1234` 로그인으로 fallback 동작합니다.

예상 백엔드 응답 예시:

```json
{
  "access_token": "jwt-token",
  "token_type": "bearer"
}
```

## 챗봇 연동 흐름

`MainView.tsx`는 사용자의 질문을 `POST /chat`으로 보냅니다.

요청 예시:

```json
{
  "question": "볼넷이 뭐야?",
  "teamId": "lg",
  "sessionId": "frontend-demo"
}
```

백엔드는 아키텍처 문서 기준으로 다음 흐름을 수행합니다.

1. 질문 분석
2. MongoDB에서 KBO 동적 기록 조회
3. PostgreSQL에서 규칙, 용어, 구단 정보, persona, RAG chunk 조회
4. LLM API 호출
5. `{ answer, persona, sources }` 형태로 응답

프론트는 우선 `answer` 값을 화면에 출력하고 TTS로 읽습니다.

응답 예시:

```json
{
  "answer": "볼넷은 투수가 스트라이크존 밖으로 던진 공이 4개가 되었을 때 타자가 1루로 나가는 상황이에요.",
  "persona": "rookie_coach",
  "sources": []
}
```

## 음성 기능

- STT: 브라우저 `SpeechRecognition` 또는 `webkitSpeechRecognition`
- TTS: 브라우저 `speechSynthesis`
- 현재 TTS는 어린 목소리에 가깝게 `pitch`와 `rate`를 높여 설정했습니다.

브라우저 지원 여부에 따라 STT/TTS가 제한될 수 있습니다. Chrome 또는 Edge에서 테스트하는 것을 권장합니다.

## 이미지와 에셋

- 캐릭터 이미지: `public/img/character.png`
- 야구 기초 이미지: `public/img/*.png`
- 배경 이미지: `assets/stadium-background.svg`

Vite에서 `public/img` 안의 파일은 브라우저에서 `/img/...` 경로로 제공됩니다. 그래서 TSX에서는 다음처럼 참조합니다.

```tsx
<img src="img/character.png" alt="야구 초보자를 안내하는 야구공 캐릭터" />
```
