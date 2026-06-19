# iOS Frontend README

이 문서는 `frontend-ios` 폴더가 왜 분리되어 있는지, 현재 iOS TestFlight 빌드가 어떤 경로로 만들어지는지, 그리고 지금까지 iOS 전용으로 반영한 수정사항을 정리합니다.

## 현재 구조 요약

우리 프로젝트는 React Native 앱이 아니라 **React/Vite 앱을 Capacitor로 감싸서 iOS/Android 네이티브 앱 안의 WebView에서 실행하는 구조**입니다.

즉, UI는 React Native 네이티브 컴포넌트가 아니라 HTML/CSS/JavaScript로 렌더링되고, Capacitor가 이 정적 번들을 iOS/Android 네이티브 프로젝트 안에 넣어 실행합니다.

```text
React/Vite source
  -> npm run build
  -> dist 정적 번들 생성
  -> Capacitor sync
  -> iOS/Android 네이티브 프로젝트에 번들 복사
  -> 네이티브 앱의 WebView가 로컬 번들 실행
  -> 로그인/채팅/지도/LLM 등 데이터는 백엔드 API와 통신
```

Capacitor는 WebView를 사용하지만, 단순히 외부 웹사이트 URL을 앱 안에서 열어 보여주는 방식과는 다릅니다. 빌드된 프론트 번들이 앱 패키지 안에 포함되고, 앱 내부 WebView가 그 로컬 번들을 실행합니다.

## 왜 `frontend-ios`를 분리했는가

처음에는 하나의 `frontend` 폴더에서 Web/Android/iOS를 같이 관리했습니다. 하지만 Android에서는 정상인 화면이 iOS에서 깨지고, 반대로 iOS에 맞춰 수정하면 Android가 다시 이상해지는 문제가 반복되었습니다.

주된 원인은 Android WebView와 iOS WKWebView가 같은 CSS/JavaScript를 다르게 처리하기 때문입니다.

특히 차이가 컸던 부분은 다음입니다.

- 키보드가 올라올 때 WebView 높이가 줄어드는 방식
- `100vh`, `100dvh`, `position: fixed` 계산 방식
- `visualViewport` 값이 변하는 타이밍
- iPhone safe-area, 홈 인디케이터, 키보드 accessory bar 처리
- Capacitor Keyboard `resize` 설정의 플랫폼별 동작 차이
- Kakao Maps 같은 외부 SDK가 인식하는 WebView origin/scheme 차이

Android는 이미 맞춰둔 상태였기 때문에, 같은 `frontend`에서 iOS 보정을 계속 넣으면 Android 레이아웃이 흔들릴 위험이 컸습니다. 그래서 Android/Web 안정성을 보호하면서 iOS 문제만 빠르게 고치기 위해 TestFlight용 프론트를 `frontend-ios`로 분리했습니다.

현재 원칙은 다음과 같습니다.

- Web/Firebase Hosting: `frontend`
- 기존 Android 앱: `frontend`
- iOS TestFlight 앱: `frontend-ios`

## 파이프라인 구조

### Web 배포

```text
frontend
  -> GitHub Actions: .github/workflows/deploy.yml
  -> npm ci
  -> npm run build
  -> Firebase Hosting 배포
```

- 기준 폴더: `frontend`
- iOS TestFlight와 별개입니다.

### Android 앱

```text
frontend
  -> npm run build:android
  -> npx cap sync android
  -> frontend/android 네이티브 프로젝트 갱신
  -> Gradle/Android Studio로 APK 또는 AAB 빌드
```

- 기준 폴더: `frontend`
- Android 네이티브 폴더: `frontend/android`
- Android 쪽 수정은 기본적으로 `frontend` 기준으로 봅니다.

### iOS TestFlight 앱

```text
frontend-ios
  -> git tag ios-tf-N
  -> git push origin ios-tf-N
  -> GitHub Actions: .github/workflows/ios-testflight.yml
  -> npm ci
  -> npm run build
  -> npx cap sync ios
  -> frontend-ios/ios/App/App.xcodeproj archive
  -> App Store Connect / TestFlight 업로드
```

- 기준 폴더: `frontend-ios`
- workflow: `.github/workflows/ios-testflight.yml`
- workflow 기준 작업 디렉터리: `frontend-ios`
- iOS 네이티브 폴더: `frontend-ios/ios`

따라서 TestFlight에 반영하려면 `frontend-ios` 안의 코드를 수정해야 합니다. `frontend/src` 또는 `frontend/ios`만 수정하면 현재 TestFlight 빌드에는 반영되지 않습니다.

### iOS Simulator 검증 workflow

```text
frontend
  -> GitHub Actions: .github/workflows/ios-build.yml
  -> npm ci
  -> npm run build
  -> npx cap sync ios
  -> frontend/ios/App/App.xcodeproj simulator build
```

- 기준 폴더: `frontend`
- 이 workflow는 TestFlight 업로드용이 아니라 시뮬레이터 빌드 검증용입니다.
- 아직 `.github/workflows/ios-build.yml`이 `frontend/ios`를 참조하므로, 해당 workflow를 계속 쓸 가능성이 있으면 `frontend/ios`는 삭제하지 않습니다.

## 폴더 영향 범위

### `frontend/ios`가 Android에 영향을 주는가

직접 영향은 없습니다.

Android 앱은 `frontend/src`, `frontend/styles.css`, `frontend/capacitor.config.ts`, `frontend/android`, `frontend/dist`를 사용합니다. `frontend/ios` 자체는 Android Gradle 빌드나 `cap sync android` 경로에 포함되지 않습니다.

정리하면 다음과 같습니다.

- `frontend/ios`만 수정: Android 직접 영향 없음
- `frontend/android` 수정: Android 영향 있음
- `frontend/src` 수정: Android 영향 있음
- `frontend/styles.css` 수정: Android 영향 있음
- `frontend/capacitor.config.ts` 수정: Android/iOS 공통 설정 영향 가능

### `frontend-ios/android`가 iOS TestFlight에 영향을 주는가

직접 영향은 없습니다.

현재 TestFlight workflow는 `frontend-ios`에서 `npm run build` 후 `npx cap sync ios`만 실행하고, 이후 `frontend-ios/ios/App/App.xcodeproj`를 archive합니다. 이 과정에서 `frontend-ios/android`는 참조되지 않습니다.

그래서 사용하지 않는 `frontend-ios/android`는 정리 대상이었고, iOS TestFlight에는 영향이 없어 제거했습니다.

정리하면 다음과 같습니다.

- `frontend-ios/android`만 수정: iOS TestFlight 직접 영향 없음
- `frontend-ios/ios` 수정: iOS TestFlight 영향 있음
- `frontend-ios/src` 수정: iOS TestFlight 영향 있음
- `frontend-ios/styles.css` 수정: iOS TestFlight 영향 있음
- `frontend-ios/capacitor.config.ts` 수정: iOS TestFlight 영향 있음

## 지금까지 반영한 iOS 수정사항

### 1. iOS 전용 프론트 정리

- TestFlight 빌드 기준을 `frontend-ios`로 정리했습니다.
- iOS 전용 README에 폴더 분리 이유와 배포 구조를 정리했습니다.
- iOS TestFlight에서 사용하지 않는 `frontend-ios/android`를 제거했습니다.
- Android/Web 안정성을 위해 기존 `frontend` 수정은 최소화하고, iOS 문제는 `frontend-ios`에서 처리하는 방식으로 정리했습니다.

### 2. iOS 로그인/회원가입 화면 수정

- 로그인 화면 배경 이미지 비율이 iPhone에서 Android와 다르게 보이던 문제를 조정했습니다.
- 회원가입 화면에서 스크롤이 되지 않아 하단 항목을 볼 수 없던 문제를 수정했습니다.
- 입력창 포커스 시 키보드가 올라와도 화면을 스크롤해 입력 영역을 확인할 수 있도록 조정했습니다.

### 3. iOS 키보드/viewport 대응

- iOS 키보드가 올라올 때 입력창이 가려지는 문제를 수정했습니다.
- 키보드가 내려간 뒤 WebView 높이가 제대로 복구되지 않아 하단에 큰 빈 공간이 남는 문제를 줄였습니다.
- iOS 상위 버전에서 키보드 accessory bar 뒤로 앱 배경이 비쳐 보이는 문제를 완화했습니다.
- `visualViewport`와 CSS 변수 기반으로 키보드 높이를 반영해 입력창 위치를 맞추도록 조정했습니다.

### 4. 팀 채팅방 수정

- 팀 채팅방에서 키보드가 올라오면 입력창과 전송 버튼이 함께 보이도록 조정했습니다.
- 키보드가 올라온 상태에서도 최신 채팅이 입력창 위에 보이도록 스크롤/하단 여백을 조정했습니다.
- 키보드를 입력 없이 내렸을 때 채팅창 하단에 과도한 빈 공간이 남던 문제를 수정했습니다.
- 메시지 전송 후에는 자연스럽게 최신 메시지 위치로 복귀하도록 조정했습니다.

### 5. 메인 채팅창 수정

- 메인 화면의 채팅 패널을 사용자가 위아래로 조절할 수 있도록 iOS 쪽 동작을 보정했습니다.
- 채팅 패널을 위로 키워도 헤더 영역을 침범하지 않도록 제한선을 적용했습니다.
- 채팅 패널을 키운 상태에서 입력창을 눌렀을 때 화면이 과하게 위로 튀는 문제를 완화했습니다.
- 키보드가 올라와도 입력창과 최신 메시지가 함께 보이도록 조정했습니다.
- 화면 전환, 스와이프 뒤로가기, 채팅창 이동 시 발생하던 부자연스러운 움직임을 줄였습니다.

### 6. 야구짝꿍 초기 설정 화면 수정

- 야구짝꿍 초기 설정 화면에서 이름 입력 시 키보드가 입력창을 가리던 문제를 수정했습니다.
- 키보드가 올라온 상태에서도 입력창이 보이고, 화면을 필요한 만큼 스크롤할 수 있도록 조정했습니다.
- 화면이 헤더 위쪽까지 과하게 밀려 올라가지 않도록 제한했습니다.

### 7. 구장정보 지도 수정

- iOS WebView에서 구장정보 화면의 Kakao 지도 API가 정상 표시되도록 대응했습니다.
- iOS TestFlight 앱에서 사용하는 origin/scheme 차이를 고려해 지도 로딩 쪽 설정을 맞췄습니다.

### 8. 캐릭터 조작 기능 반영

- Android/Web 쪽에 반영된 캐릭터 좌우 드래그 회전 기능을 iOS에도 반영했습니다.
- 사용자가 캐릭터를 좌우로 자유롭게 돌려볼 수 있도록 했습니다.
- 캐릭터가 응답하거나 모션을 시작하면 조작을 잠그고 정면으로 돌아오도록 처리했습니다.
- 캐릭터가 발 중심 기준으로 자연스럽게 회전하도록 정렬을 조정했습니다.

### 9. iOS 음성 입력 UX 개선

- 기존 누르고 말하기 방식에서 탭 기반 음성 입력 흐름으로 개선했습니다.
- 한 번 누르면 음성 인식 시작, 다시 누르면 즉시 전송되도록 처리했습니다.
- 사용자가 말을 멈추면 일정 시간 뒤 자동 전송되도록 처리했습니다.
- 말하지 않은 상태에서는 불필요하게 전송되지 않도록 방어했습니다.
- 너무 오래 켜져 있는 경우를 막기 위해 최대 인식 시간을 제한했습니다.
- iOS STT 시작 전 TTS/오디오 세션 충돌을 줄이기 위한 대기 처리를 추가했습니다.
- 첫 터치가 잘 안 먹는 문제를 줄이기 위해 마이크 버튼 터치 처리와 터치 영역을 조정했습니다.

### 10. 음성 인식 상태 표시

- 음성 인식 시작 직전에는 `음성 인식 준비중 ...` 문구가 보이도록 했습니다.
- 실제 인식이 시작되면 `듣는 중...` 문구가 보이도록 했습니다.
- iOS에서 첫 단어가 씹히는 문제를 줄이기 위해 준비 상태를 거친 뒤 듣는 상태로 넘어가도록 조정했습니다.

### 11. STT 야구 발음 오인식 보정

- iOS STT가 야구 용어를 잘못 받아쓰는 문제를 줄이기 위해 발음 기반 후처리 로직을 추가했습니다.
- 예를 들어 `플렛`, `플랫`, `포넷`, `폴렛`처럼 인식되는 발음을 `볼넷`으로 보정하도록 했습니다.
- `보루`, `도로`처럼 인식되는 발음은 `도루`로 보정하도록 했습니다.
- `스트라익`, `스트라잌` 등은 `스트라이크`로 보정하도록 했습니다.
- 이 보정은 단순 용어 통일이 아니라 STT가 잘못 받아쓴 발음 후보를 정상 야구 용어로 바꾸는 목적입니다.
- 보정된 문장은 사용자 말풍선과 LLM 질문에 동일하게 적용되도록 처리했습니다.
- 관련 로직은 `frontend-ios/src/data/sttBaseballNormalize.ts`에 분리했습니다.

## 주요 수정 파일

- `frontend-ios/src/App.tsx`
  - 플랫폼 클래스, 키보드 상태, iOS viewport 관련 전역 상태를 관리합니다.

- `frontend-ios/src/components/MainViewV2.tsx`
  - 메인 채팅창, 음성 입력, 캐릭터 조작, STT 후처리 연결을 담당합니다.

- `frontend-ios/src/components/MainViewV2.css`
  - 메인 채팅창 높이, 키보드 대응, 입력창 위치, iOS 전용 레이아웃을 조정합니다.

- `frontend-ios/src/components/TeamChatView.tsx`
  - 팀 채팅방 메시지 스크롤과 키보드 상태 대응을 담당합니다.

- `frontend-ios/src/components/TeamChatView.css`
  - 팀 채팅방 입력창, 메시지 영역, 키보드 대응 레이아웃을 조정합니다.

- `frontend-ios/src/components/Character3D.tsx`
  - 캐릭터 좌우 회전, 정면 복귀, 응답 중 조작 잠금 처리를 담당합니다.

- `frontend-ios/src/data/sttBaseballNormalize.ts`
  - 야구 용어 STT 발음 오인식 보정 사전을 관리합니다.

- `frontend-ios/src/components/StadiumMap.tsx`
  - iOS WebView에서 Kakao Maps SDK가 정상 로딩되도록 처리합니다.

- `frontend-ios/README.md`
  - iOS 프론트 구조, 분리 이유, 배포 흐름, 수정사항을 문서화합니다.

## 배포 방법

iOS TestFlight에 반영하려면 `frontend-ios` 기준 변경사항을 `feature/stn`에 푸시한 뒤, dev 반영 또는 필요한 기준 커밋에서 태그를 생성해 workflow를 실행합니다.

```bash
git checkout dev
git pull
git tag ios-tf-다음숫자
git push origin ios-tf-다음숫자
```

현재 TestFlight workflow는 태그 기준으로 동작합니다. dev에 머지된 것만으로는 iOS 빌드가 자동으로 올라가지 않고, `ios-tf-*` 태그를 push해야 빌드와 업로드가 시작됩니다.

태그는 해당 커밋 시점의 코드를 빌드하므로, 원칙적으로는 dev에 반영된 상태에서 태그를 생성하는 것이 가장 안전합니다. 테스트 목적으로 feature 브랜치에서 태그를 만들 수도 있지만, 이 경우 그 feature 브랜치 코드가 그대로 TestFlight에 올라갑니다.

## 확인 명령

`frontend-ios` 변경 후 최소 확인 명령은 다음입니다.

```bash
cd frontend-ios
npm run typecheck
npm run build
```

빌드가 통과한 뒤 TestFlight workflow를 실행하는 것이 좋습니다.

## 작업 원칙

- Android/Web 수정: `frontend`
- iOS TestFlight 수정: `frontend-ios`
- iOS TestFlight 업로드: `ios-tf-*` 태그 push
- Android가 이미 정상인 기능은 iOS 문제 해결을 위해 `frontend`에서 건드리지 않습니다.
- iOS 전용 키보드, viewport, safe-area 문제는 `frontend-ios` 안에서 해결합니다.
