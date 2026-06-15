# ⚾ 야구 볼래

> AI와 함께 배우고 응원하는 KBO 입문 도우미 서비스

<p align="center">
  <img src="./docs/rd/images/banner.png" width="100%">
</p>

---

# 📖 About The Project

## 야구 볼래란?

야구는 규칙, 용어, 응원 문화, 구단 정보 등 다양한 진입 장벽이 존재합니다.

야구 볼래는 AI 캐릭터 기반의 야구 입문 도우미 서비스로, 사용자가 쉽고 재미있게 야구를 배우고 응원할 수 있도록 지원합니다.

### 🎯 Problem

- 야구 규칙과 용어가 어렵다.
- 응원할 구단을 선택하기 어렵다.
- 직관 정보를 찾기 어렵다.
- 팬들과 소통할 공간이 부족하다.

### 💡 Solution

- AI 야구 설명 챗봇 제공
- 구단별 팀 채팅방 제공
- 직관 및 경기 기록 기능 제공
- 구장 정보 통합 제공

---

# ✨ Features

| 🤖 AI 야구 도우미 | 💬 팀 채팅방 | 📅 나만의 기록 |
|---|---|---|
| 야구 규칙 설명<br>야구 용어 설명<br>경기 상황 해설<br>초보자 맞춤 답변 | 구단별 채팅방<br>실시간 응원<br>팬 커뮤니티 | 연속 기록 도전<br>직관 기록 캘린더<br>경기 기록 조회 |

| 🧑 야구짝꿍 | 🏟️ 구장정보 | ⚙️ 환경설정 |
|---|---|---|
| 성별 설정<br>닉네임 설정<br>출석 체크<br>꾸미기<br>응원하기<br>퀴즈 풀기 | 구장 안내<br>먹거리 정보<br>지역 정보<br>교통 정보 | 내 정보 관리<br>응원구단 변경<br>알림 설정 |

---

# 🎬 Demo

| VIEW | 1 | 2 | 3 |
|---|---|---|---|
| 로그인 및 시작하기 | 회원가입 | 로그인 | 응원구단 선택 |
|  | [🎥 보기](./docs/rd/demo/signup.mp4) | [🎥 보기](./docs/rd/demo/login.mp4) | [🎥 보기](./docs/rd/demo/team-select.mp4) |
| 메인 서비스 | 홈 화면 | AI 도우미 | - |
|  | [🎥 보기](./docs/rd/demo/home.mp4) | [🎥 보기](./docs/rd/demo/ai-chat.mp4) | - |
| 채팅방 | 채팅방 메인 | - | - |
|  | [🎥 보기](./docs/rd/demo/team-chat.mp4) | - | - |
| 나만의 기록 | 연속 기록 도전 | 직관 기록 캘린더 | 경기 기록 조회 |
|  | [🎥 보기](./docs/rd/demo/record-challenge.mp4) | [🎥 보기](./docs/rd/demo/record-calendar.mp4) | [🎥 보기](./docs/rd/demo/game-record.mp4) |
| 야구짝꿍 | 성별 · 닉네임 설정 | 야구짝꿍 메인화면 | 꾸미기 |
|  | [🎥 보기](./docs/rd/demo/mate-setup.mp4) | [🎥 보기](./docs/rd/demo/mate-home.mp4) | [🎥 보기](./docs/rd/demo/mate-custom.mp4) |
| 구장정보 | 구장 안내 | 먹거리 정보 | 지역 정보 |
|  | [🎥 보기](./docs/rd/demo/stadium-info.mp4) | [🎥 보기](./docs/rd/demo/stadium-food.mp4) | [🎥 보기](./docs/rd/demo/stadium-area.mp4) |
| 환경설정 | 환경설정 | 내 정보 | 응원구단 변경 |
|  | [🎥 보기](./docs/rd/demo/settings.mp4) | [🎥 보기](./docs/rd/demo/profile.mp4) | [🎥 보기](./docs/rd/demo/change-team.mp4) |

---

# 🛠️ Tech Stack

| Category | Stack |
|---|---|
| 🎨 Frontend | React, TypeScript, Vite |
| ⚙️ Backend | FastAPI, Python |
| 🤖 AI | Gemini, Vertex AI, ElevenLabs |
| 🗄️ Database | MongoDB Atlas, PostgreSQL (Supabase), SQLite |
| 🔐 Authentication | JWT |
| ☁️ Deploy | Firebase Hosting |
| 📝 Version Control | Git, GitHub |

---

# 🏗️ Architecture

```text
┌─────────────────────┐
│  React/Vite 앱      │
│  Chat · Quiz · 기록 │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Firebase Hosting    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ FastAPI (Cloud Run) │
│ - Auth              │
│ - Quiz              │
│ - Attendance        │
│ - Chat              │
│ - Records           │
└───┬────────┬────────┘
    │        │
    │        └─────────────► AI
    │                        - Gemini
    │                        - ElevenLabs
    │                        - Azure Speech
    │
    ├──────────────────────► DB
    │                        - MongoDB
    │                        - Supabase
    │                        - SQLite
    │
    └──────────────────────► External
                             - OAuth
                             - Weather

┌─────────────────────┐
│ Crawler Pipeline    │
│ Cloud Scheduler     │
│ KBO API             │
└──────────┬──────────┘
           │
           ▼
         DB 저장
```

---

# 📂 Project Structure

```text
📦 project

├─ 📂 frontend
│  ├─ 📂 public
│  ├─ 📂 src
│  │  ├─ 📂 assets
│  │  ├─ 📂 components
│  │  ├─ 📂 contexts
│  │  ├─ 📂 hooks
│  │  ├─ 📂 services
│  │  ├─ 📂 utils
│  │  ├─ 📜 App.tsx
│  │  └─ 📜 main.tsx
│
├─ 📂 services
│  └─ 📂 api
│     ├─ 📜 main.py
│     ├─ 📜 auth.py
│     ├─ 📜 users.py
│     ├─ 📜 chat.py
│     ├─ 📜 personality.py
│     ├─ 📜 embedding.py
│     ├─ 📜 vector.py
│     ├─ 📜 stadium.py
│     └─ 📜 sqlite3.db
│
├─ 📜 requirements.txt
└─ 📜 README.md
```