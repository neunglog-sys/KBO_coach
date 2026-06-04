# 모델 테스트 사용법

3D 캐릭터 모델(`model_backup_2.glb`)을 웹에서 띄워 보고, 입 애니메이션(뻐금뻐금)을 확인하는 방법을 정리한 문서입니다.

---

## 1. 모델 정보

- **파일**: `model/model_backup_2.glb` (약 73MB)
- **구성 노드** (최상위 3개, 베이크된 애니메이션 없음)

  | 노드명 | 역할 |
  |--------|------|
  | `body` | 몸통. 가만히 있음 |
  | `mouse_basic` | 다문 입 |
  | `mouse_half` | 벌린 입 |

- 입 애니메이션은 `mouse_basic` ↔ `mouse_half`의 **표시 여부(visibility)를 번갈아 토글**해서 만듭니다.
- 모델이 원래 **오른쪽**을 보고 있어서, 렌더링할 때 **Y축 -90°** 회전을 줘서 정면을 보게 합니다.

---

## 2. 단독 테스트 페이지로 확인하기 (`test/index.html`)

모델만 빠르게 띄워서 회전/입 애니메이션을 점검하는 독립 실행형 페이지입니다.

### 실행 방법

73MB 모델을 `../model/`에서 불러오므로, **반드시 프로젝트 루트에서** 로컬 서버를 켜야 합니다.

```powershell
# 프로젝트 루트(project/)에서 실행
python -m http.server 8124 --bind 127.0.0.1
```

→ 브라우저에서 접속:

```
http://127.0.0.1:8124/test/index.html
```

> ⚠️ `test/` 폴더 안에서 서버를 켜면 `../model/`을 못 찾습니다. 꼭 루트에서 켜세요.
> ⚠️ three.js를 CDN(unpkg)에서 받으므로 **인터넷 연결**이 필요합니다.
> ⚠️ 모델이 커서 첫 로딩에 몇 초 걸립니다.

### 화면 컨트롤

| 컨트롤 | 기능 |
|--------|------|
| `-90° / 90° / 180°` 버튼, Y회전 슬라이더 | 정면 회전 각도 조절 |
| `애니메이션 ON/OFF` 버튼 | 입 뻐금뻐금 켜기/끄기 |
| 속도 슬라이더 (80~600ms) | 입 여닫는 주기 조절 |
| 마우스 드래그 | 모델 360° 회전 (OrbitControls) |
| 좌측 상태창 | 로드 결과 및 `body / mouse_basic / mouse_half` 인식 여부 표시 |

---

## 3. 프론트엔드 화면에 적용된 형태

이 모델은 프론트엔드 메인 화면의 캐릭터(`character.png` 자리)로 들어가 있습니다.

- **컴포넌트**: `frontend/src/components/Character3D.tsx`
- **사용 위치**: `frontend/src/components/MainView.tsx` — `<Character3D isSpeaking={isSpeaking} className="character" />`
- **모델 경로**: 프론트는 `frontend/public/model/model_backup_2.glb` (Vite가 `/model/...`로 서빙) **복사본**을 사용합니다.
- **동작**: 평소엔 입을 다물고(`mouse_basic`), 음성 답변 중(`isSpeaking === true`)일 때만 입을 뻐금뻐금 움직입니다.

### 프론트엔드 실행

```powershell
cd frontend
npm run dev
```

→ `http://127.0.0.1:5000` (로그인 후 메인 화면에 3D 캐릭터 표시)

> 질문·음성답변 기능까지 쓰려면 백엔드(8000 포트)도 함께 띄워야 합니다. 캐릭터 자체는 백엔드 없이도 보입니다.

---

## 4. 주의사항

- **모델을 수정한 경우**: 이 `model/` 폴더의 원본을 바꿔도 프론트에는 반영되지 않습니다. `frontend/public/model/model_backup_2.glb`로 **다시 복사**해야 합니다.
- **파일 이름을 바꾼 경우**: 아래 3곳의 경로를 함께 수정해야 합니다.
  - `frontend/public/model/<새이름>.glb` (복사본 파일명)
  - `frontend/src/components/Character3D.tsx` 의 `MODEL_URL`
  - `test/index.html` 의 `loader.load('../model/<새이름>.glb', ...)`
- **용량(73MB)**: 웹 첫 로딩이 느립니다. 운영용이면 Draco 압축 등 용량 최적화를 권장합니다.
- 회전 각도·입 속도 등 기본값은 `Character3D.tsx` 상단 상수(`FRONT_ROTATION_DEG`, `MOUTH_INTERVAL_MS`)에서 조절합니다.
