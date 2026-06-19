# 캐릭터 모델 안내

메인 화면 캐릭터로 쓰이는 모델 파일들의 **보관 위치 / 런타임 위치 / 코드 참조 경로**를 정리한 문서입니다.

---

## 1. 폴더 구조

캐릭터 모델은 종류(3D glb / Live2D)별로 묶어 둡니다.

```
model/                              # 원본 보관소 (git 미추적, 수동 공유용)
└── 3d/
    ├── test1.glb                   # 현재 사용 중인 3D 모델 (약 101MB)
    └── model_backup_2.glb          # 이전 야구공 모델 (약 73MB, 백업)

frontend/public/model/              # 앱이 실제로 로드하는 위치 (Vite가 /model/... 로 서빙)
├── 3d/
│   ├── test1.glb
│   └── model_backup_2.glb
└── live2d/
    └── ball/                       # Live2D 모델 (moc3 + 텍스처, 내부 상대경로)
        ├── ball.model3.json
        ├── ball.moc3
        ├── ball.cdi3.json
        └── ball.2048/texture_00.png
```

> `frontend/dist/model/...` 와 `frontend/android/app/src/main/assets/public/model/...` 에도 같은 파일이 보이는데,
> 이 둘은 **빌드 자동 생성물**입니다. 직접 건드리지 마세요. `npm run android:sync` 시 새 구조로 다시 채워집니다.

> ⚠️ `*.glb` 는 `.gitignore` 로 git에서 제외되어 있습니다 (용량 이슈). 특히 `test1.glb`(101MB)는
> GitHub 파일 100MB 제한을 넘으므로 **절대 커밋하면 안 됩니다.** 모델은 별도 경로로 공유하세요.

---

## 2. 현재 사용 중인 모델 (test1.glb)

- **파일**: `frontend/public/model/3d/test1.glb`
- **모션**: 베이크된 애니메이션 클립 `hi` 를 `AnimationMixer` 로 재생합니다.
  - 포함 클립: `hi`, `CubeAction`, `CubeAction.002` → 코드는 이름으로 `hi` 를 골라 루프 재생.
- **정면 회전**: `test1.glb` 는 이미 정면(+Z)을 향해 제작되어 **회전 보정이 0** 입니다 (`FRONT_ROTATION_DEG = 0`).
- 크기는 자동 정규화(`2.4 / maxDim`) 후 중앙 정렬됩니다.

---

## 3. 코드 참조 경로

| 컴포넌트 | 모델 URL | 비고 |
|----------|----------|------|
| `frontend/src/components/Character3D.tsx` | `/model/3d/test1.glb` | **현재 메인 화면에서 사용** |
| `frontend/src/components/CharacterLive2D.tsx` | `/model/live2d/ball/ball.model3.json` | Live2D (현재 미사용, 전환용) |

- 메인 화면은 `frontend/src/components/MainView.tsx` 에서
  `<Character3D isSpeaking={isSpeaking} className="character" />` 로 3D 캐릭터를 렌더링합니다.
- Live2D 로 되돌리려면 `MainView.tsx` 의 import / JSX 를 `CharacterLive2D` 로 교체하면 됩니다.

---

## 4. 모델을 바꾸거나 이름/위치를 변경할 때

1. 원본을 `model/3d/`(또는 `live2d/`)에 보관하고,
2. **런타임 사본**을 `frontend/public/model/3d/` 로 복사하고,
3. 해당 컴포넌트의 `MODEL_URL` 을 새 경로로 수정한 뒤,
4. `cd frontend && npm run android:sync` (→ `dist/`, android assets 자동 갱신).

> Live2D 모델은 `ball.model3.json` 이 텍스처·moc3 를 **상대경로**로 참조하므로,
> `ball/` 폴더는 항상 **통째로** 옮겨야 내부 연결이 유지됩니다.

---

## 5. 실행

```powershell
cd frontend
npm run dev          # http://127.0.0.1:5000 (웹 미리보기)
# 또는
npm run android:sync # 안드로이드 빌드 + 동기화
```

> ⚠️ `test1.glb`(101MB) 는 첫 로딩에 몇 초 걸립니다. 운영용이면 Draco 압축 등 용량 최적화를 권장합니다.
> 회전 각도 등 기본값은 `Character3D.tsx` 상단 상수(`FRONT_ROTATION_DEG`, `MOTION_NAME`, `MOUTH_INTERVAL_MS`)에서 조절합니다.
