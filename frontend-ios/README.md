# iOS Frontend README

이 폴더는 iOS TestFlight 배포용 프론트엔드입니다. 기존 `frontend`를 기반으로 복제했지만, 현재 iOS TestFlight workflow는 `frontend-ios`만 빌드합니다.

## 결론

- 웹/Firebase Hosting 배포 기준 폴더: `frontend`
- 기존 Android 앱 기준 폴더: `frontend`
- iOS TestFlight 배포 기준 폴더: `frontend-ios`
- `frontend/ios`는 기존 Android 앱에 직접 영향 없음
- `frontend-ios/android`는 iOS TestFlight 앱에 직접 영향이 없어 삭제했습니다

## 왜 iOS 폴더를 분리했는가

처음에는 하나의 `frontend` 폴더에서 웹, Android, iOS를 같이 관리했습니다. 이 방식은 코드 중복이 적다는 장점은 있지만, 모바일 WebView에서는 문제가 컸습니다.

Android WebView와 iOS WKWebView가 같은 CSS/JavaScript를 다르게 처리했기 때문입니다. 특히 아래 영역에서 차이가 컸습니다.

- 키보드가 올라올 때 WebView 높이가 줄어드는 방식
- `100vh`, `100dvh`, `position: fixed` 계산 방식
- `visualViewport` 값이 바뀌는 타이밍
- iPhone safe-area, 홈 인디케이터, 키보드 accessory bar 처리
- Capacitor Keyboard `resize` 설정의 플랫폼별 동작 차이
- Kakao Maps 같은 외부 SDK가 보는 WebView origin/scheme 차이

Android에서 이미 정상 동작하도록 맞춘 상태에서 iOS 문제를 고치려고 같은 `frontend` 코드를 수정하면 Android UI가 흔들릴 위험이 컸습니다. 반대로 Android 기준으로 둔 코드는 iOS에서 입력창, 스크롤, 화면 높이, 지도 로딩 문제가 계속 발생했습니다.

그래서 Android/Web 안정본은 `frontend`에 두고, iOS TestFlight용 수정은 `frontend-ios`에만 누적하는 방식으로 분리했습니다.

## 분리 전 실제 문제

하나의 `frontend`에서 같이 관리할 때 발생한 대표 문제입니다.

- 팀 채팅방에서 iOS 키보드가 올라오면 입력창 또는 최신 채팅이 가려짐
- 키보드가 닫힌 뒤에도 iOS viewport 높이가 늦게 복구되어 빈 공간이 생김
- 메인 채팅창이 iOS에서 너무 위로 튀거나 헤더 영역을 침범함
- 로그인 화면 배경 비율이 iPhone 화면에서 Android와 다르게 보임
- 회원가입 화면이 iOS에서 스크롤되지 않음
- 야구짝꿍 설정 같은 입력 폼에서 키보드가 입력창을 가림
- Kakao 지도 SDK가 iOS WebView origin/scheme 문제로 로딩되지 않음

이 문제들은 단순히 CSS 하나가 틀린 문제가 아니라, Android와 iOS WebView의 viewport/keyboard/safe-area 동작 차이에서 나온 문제입니다.

## 분리 후 수정 방식

현재 iOS 쪽 수정은 `frontend-ios` 내부에서만 진행합니다.

주요 iOS 보정 내용은 다음 파일들에 들어 있습니다.

- `src/App.tsx`
  - 플랫폼 클래스를 `html`에 부여합니다. 예: `plat-ios`, `plat-android`
  - iOS 키보드 상태를 `kb-open` 클래스로 관리합니다.
  - `--keyboard-inset` CSS 변수를 설정해 입력창과 채팅창을 키보드 위로 올립니다.

- `src/components/MainViewV2.tsx`, `src/components/MainViewV2.css`
  - 메인 채팅창 높이 제한과 키보드 대응을 iOS에 맞게 조정합니다.
  - 채팅창을 위로 키운 상태에서 입력해도 헤더를 침범하지 않게 제한합니다.

- `src/components/TeamChatView.tsx`, `src/components/TeamChatView.css`
  - 팀 채팅방에서 키보드가 올라와도 입력창과 최신 채팅이 같이 보이도록 조정합니다.
  - 키보드를 입력 없이 닫아도 줄어든 viewport 높이가 남지 않도록 복구합니다.

- `styles.css`
  - 로그인/회원가입/야구짝꿍 설정 등 iOS 입력 폼에서 키보드가 입력창을 가리지 않도록 보정합니다.

- `src/components/StadiumMap.tsx`
  - iOS WebView에서 Kakao Maps SDK를 불러올 때 필요한 origin/scheme 대응을 포함합니다.

## 실제 빌드 경로

### 웹 배포

`.github/workflows/deploy.yml`은 `frontend`를 빌드하고 Firebase Hosting에 배포합니다.

```yml
working-directory: frontend
npm run build
```

### iOS TestFlight 배포

`.github/workflows/ios-testflight.yml`은 `frontend-ios`를 빌드하고, 그 안의 iOS 프로젝트를 archive합니다.

```yml
working-directory: frontend-ios
npm run build
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App ...
```

따라서 TestFlight에 반영하려면 `frontend-ios`를 수정해야 합니다. `frontend/src` 또는 `frontend/ios`만 수정하면 현재 TestFlight 빌드에는 반영되지 않습니다.

### iOS Simulator 빌드

`.github/workflows/ios-build.yml`은 현재 `frontend`의 iOS 프로젝트를 봅니다.

```yml
working-directory: frontend
paths:
  - "frontend/ios/**"
```

이 workflow는 TestFlight 업로드가 아니라 시뮬레이터 검증용입니다. 현재 실제 TestFlight 기준은 `frontend-ios`입니다.

## 폴더 영향 관계 확인

### `frontend/ios`가 Android 앱에 영향 주는가?

직접 영향 없습니다.

Android 앱은 `frontend/src`, `frontend/styles.css`, `frontend/capacitor.config.ts`, `frontend/android`, `frontend/dist`를 사용합니다. `frontend/ios` 자체는 Android Gradle 빌드나 `cap sync android` 경로에 포함되지 않습니다.

영향 관계는 다음과 같습니다.

- `frontend/ios`만 수정: Android 앱 직접 영향 없음
- `frontend/android` 수정: Android 앱 영향 있음
- `frontend/src` 수정: Android 앱 영향 있음
- `frontend/styles.css` 수정: Android 앱 영향 있음
- `frontend/capacitor.config.ts` 수정: Android/iOS 공통 설정 영향 가능

### `frontend-ios/android`가 iOS TestFlight 앱에 영향 주는가?

직접 영향 없습니다.

현재 TestFlight workflow는 `frontend-ios`에서 `npm run build` 후 `npx cap sync ios`만 실행합니다. 이후 `frontend-ios/ios/App/App.xcodeproj`를 archive합니다. 이 과정에서 `frontend-ios/android`는 참조되지 않습니다.

영향 관계는 다음과 같습니다.

- `frontend-ios/android`만 수정: iOS TestFlight 직접 영향 없음
- `frontend-ios/ios` 수정: iOS TestFlight 영향 있음
- `frontend-ios/src` 수정: iOS TestFlight 영향 있음
- `frontend-ios/styles.css` 수정: iOS TestFlight 영향 있음
- `frontend-ios/capacitor.config.ts` 수정: iOS TestFlight 영향 있음

## 정리 가능 여부

아래 기준으로 팀에서 합의하면 정리할 수 있습니다.

- Android/Web은 앞으로 `frontend`만 사용한다.
- iOS TestFlight는 앞으로 `frontend-ios`만 사용한다.

이 기준에 따라 `frontend-ios/android`는 삭제했습니다. iOS TestFlight workflow는 `frontend-ios/ios`만 사용합니다.

`frontend/ios`는 Android 앱에는 직접 영향이 없지만, `.github/workflows/ios-build.yml`이 아직 참조하고 있습니다. 이 시뮬레이터 workflow를 더 이상 쓰지 않을 거라면 삭제 후보가 될 수 있습니다. 유지할 거라면 삭제하지 말고 “구형/시뮬레이터 검증용”으로 명시하는 편이 안전합니다.

## 작업 원칙

- Android/Web 안정본 수정: `frontend`
- iOS TestFlight UI/키보드/지도 수정: `frontend-ios`
- iOS TestFlight 업로드: `ios-tf-*` 태그 push
- Android가 이미 픽스된 상태라면 iOS 문제를 해결할 때 `frontend`를 건드리지 않습니다.

## 확인한 근거

확인한 실제 참조 관계입니다.

- `.github/workflows/deploy.yml`: `working-directory: frontend`
- `.github/workflows/ios-testflight.yml`: `working-directory: frontend-ios`
- `.github/workflows/ios-testflight.yml`: `npx cap sync ios`, `xcodebuild -project ios/App/App.xcodeproj`
- `.github/workflows/ios-build.yml`: `working-directory: frontend`, `paths: frontend/ios/**`
- `frontend/package.json`: Android sync는 `cap sync android`, iOS sync는 `cap sync ios`
- `frontend-ios/package.json`: Android sync/open script는 제거했고, TestFlight workflow에서는 iOS script만 사용함
