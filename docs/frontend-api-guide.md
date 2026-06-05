# 프론트엔드 API 연동 가이드

프론트에서 어떤 백엔드 엔드포인트를 어디에 붙이는지 정리. `✅`=이미 연동됨, `⬜`=연동 필요.

## 공통
- 호출은 `apiUrl("/경로")` 사용 (`src/api.ts`). 웹=상대경로(rewrite), 안드=절대URL.
- **인증 필요** 표시된 건 헤더 `Authorization: Bearer <token>` 붙여야 함. (로그인 시 받은 `token`)
- 응답은 JSON. 아래 "응답"은 주요 필드만.

---

## 1. 인증 (Auth)
| | 메서드·경로 | 인증 | 요청 | 응답 |
|---|---|---|---|---|
| ✅ | `POST /auth/login` | — | `{email, password}` | `{user:{user_id,email,nickname,fav_team_code}, token}` |
| ✅ | `POST /auth/register` | — | `{email, password, nickname, fav_team_code}` | `{user, token}` |
| ⬜ | `GET /auth/me` | ✔ | — | `{user_id,email,nickname,fav_team_code,created_at}` |

### ⚠️ 응원팀 기본값 버그 수정 (두산 고정 → 내 팀)
- **백엔드**: `login` 응답에 `fav_team_code` 추가 완료 ✅
- **프론트 할 일**:
  1. `App.tsx` — 로그인 응답의 `user.fav_team_code` 저장 (세션/상태)
  2. `MainView.tsx:151` — `useState(kboTeams[0].id)` → **유저 응원팀 기준**으로 초기화
     ```ts
     // team_code("LG") → kboTeams id("lg") 역매핑, 없으면 첫 팀 폴백
     const initialId = Object.entries(teamCodes).find(([id, code]) => code === favTeamCode)?.[0] ?? kboTeams[0].id;
     const [selectedTeamId, setSelectedTeamId] = useState(initialId);
     ```

---

## 2. 챗봇
| | 메서드·경로 | 인증 | 요청 | 응답 |
|---|---|---|---|---|
| ✅ | `POST /chat` | — | `{question, team_code, session_id?}` | `{answer, context:{persona,terms,rules,culture}}` |

`team_code`로 페르소나(말투) 결정. 답변 텍스트 = `answer`.

---

## 3. 야구 데이터 (동적, MongoDB)
| | 메서드·경로 | 인증 | 요청(쿼리) | 응답 |
|---|---|---|---|---|
| ✅ | `GET /standings` | — | `?date=` (선택) | `{date,count,standings:[{순위,팀명,승,패,승률,...}]}` |
| ✅ | `GET /schedule` | — | `?date=YYYY-MM-DD` | `{date,count,schedule:[{date,시간,원정팀,홈팀,구장,상태}]}` |
| ⬜ | `GET /hitters` | — | `?team=&limit=&date=` | `{date,count,hitters:[...]}` |
| ⬜ | `GET /pitchers` | — | `?team=&limit=&date=` | `{date,count,pitchers:[...]}` |
| ⬜ | `GET /players/search` | — | `?name=` | `{count,players:[...]}` |
| ⬜ | `GET /players/{id}` | — | — | `{profile,hitting,pitching}` |
| ⬜ | `GET /games` | — | `?date=` | `{date,count,games:[{gameId,원정팀,홈팀,상태}]}` |
| ⬜ | `GET /games/{gameId}/boxscore` | — | — | `{gameId,hitters,pitchers}` |

---

## 4. 정적 정보 (PostgreSQL)
| | 메서드·경로 | 인증 | 요청 | 응답 |
|---|---|---|---|---|
| ✅ | `GET /glossary` | — | `?q=` (선택) | `{count,terms:[{term,abbr,definition,category}]}` |
| ✅ | `GET /stadiums/{team_code}` | — | — | `{team_code,stadiums:[{name,location,parking,subway,food,...}]}` |
| ⬜ | `GET /teams` | — | — | `{count,teams:[{team_code,name,city,home_stadium,...}]}` |
| ⬜ | `GET /teams/{code}` | — | — | `{team,legends:[{name,position,era,note}]}` |
| ⬜ | `GET /teams/{code}/persona` | — | — | `{team_code,team_name,definition,personality_*,...}` |
| ⬜ | `GET /teams/{code}/culture` | — | — | `{culture_summary,fandom_style,cheer_style,beginner_tip,...}` |
| ⬜ | `GET /rules` | — | `?category=` (선택) | `{count,rules:[{topic,content,category}]}` |
| ⬜ | `GET /cheering/{code}` | — | — | `{team_code,count,cheering:[{type,description}]}` |
| ⬜ | `GET /umpire_signals` | — | — | `{count,signals:[{name,meaning,description}]}` |

> 참고: 프론트가 지금 `kboTeams.ts`·`baseballBasics.ts` 하드코딩을 쓰는데, `/teams`·`/glossary` 등으로 교체하면 실데이터로 동작.

---

## 5. 면회실 (익명 채팅) — 백엔드 완성, 화면 미연동 ⬜
| | 메서드·경로 | 인증 | 요청 | 응답 |
|---|---|---|---|---|
| ⬜ | `GET /board/{team_code}` | ✔ | — | `{team_code, notice}` (운영공지) |
| ⬜ | `GET /board/{team_code}/messages` | ✔ | `?after=<마지막 id>` | `{team_code,count,messages:[{message_id,nickname,content,created_at,is_mine}]}` |
| ⬜ | `POST /board/{team_code}/messages` | ✔ | `{content}` | 생성된 메시지 |

연동: 입장 시 `messages` 로드 → 마지막 `message_id` 저장 → **3~5초마다 `?after=`로 폴링**해 신규만 append. `is_mine`으로 좌/우 정렬.

---

## 6. 나만의 기록 — 백엔드 완성, 화면 미연동 ⬜
| | 메서드·경로 | 인증 | 요청 | 응답 |
|---|---|---|---|---|
| ⬜ | `GET /my-records/moods` | — | — | 기분 목록(win_happy/draw_calm/loss_sad) |
| ⬜ | `POST /my-records` | ✔ | `{record_date,game_id?,team_code?,stadium?,mood,memo?}` | 생성 기록 |
| ⬜ | `GET /my-records` | ✔ | — | 내 기록 목록 |
| ⬜ | `GET /my-records/stats` | ✔ | — | 통계 |
| ⬜ | `DELETE /my-records/{id}` | ✔ | — | — |

---

## 7. 직관·즐겨찾기 — 화면 미연동 ⬜
| | 메서드·경로 | 인증 | 요청 | 응답 |
|---|---|---|---|---|
| ⬜ | `POST /visits` · `GET /visits` · `GET /visits/stats` | ✔ | 방문기록 | — |
| ⬜ | `POST /favorites` · `GET /favorites` | ✔ | `{team_code}` | 즐겨찾기 팀 |
| ⬜ | `GET /recommendations` | ✔ | — | 추천 팀 |

---

## 8. 퀴즈·출석 (다마고치)
| | 메서드·경로 | 인증 | 비고 |
|---|---|---|---|
| ✅ | `GET /quiz/daily` · `POST /quiz/answer` | 선택 | OX 퀴즈 |
| ✅ | `GET /attendance/status` · `POST /attendance/check-in` | 선택 | 출석·경험치 |

---

## 9. 푸시 알림
| | 메서드·경로 | 인증 | 요청 | 비고 |
|---|---|---|---|---|
| ✅(앱) | `POST /push/register` | ✔ | `{token, platform}` | 안드: 로그인 시 자동. 웹: 미연동(추후 웹푸시) |
| ⬜ | `DELETE /push/register` | ✔ | `{token}` | 로그아웃 시 |

발송은 서버 크론이 응원팀 경기 시작/취소/지연/종료 시 자동.

---

## 10. 날씨 (스켈레톤)
| | 메서드·경로 | 비고 |
|---|---|---|
| ⬜ | `GET /weather` | 기상청 키 연결 전 |

---

## 내부용 (프론트 호출 X)
- `POST /internal/crawl`, `POST /internal/notify` → Cloud Scheduler 전용
- `GET /` → 헬스체크

---

## 우선순위 제안 (프론트 다시 할 때)
1. **응원팀 기본값 수정** (위 1번) — 작고 임팩트 큼
2. 면회실·나만의기록 화면 (백엔드 완성됨)
3. 하드코딩 → API 교체 (`/teams`,`/glossary`,`/rules` 등)
4. 선수기록·구장가이드 등 부가 화면
