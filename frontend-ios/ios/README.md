# iOS 빌드 및 실행 가이드

이 디렉토리는 Capacitor로 생성한 iOS 프로젝트입니다.

## 필요 조건

- macOS
- Xcode
- Apple Developer 계정
- 개발자 모드가 켜진 iPhone

Windows에서도 이 `ios` 디렉토리를 만들고 동기화할 수는 있지만, iOS 앱을 실제로 빌드하거나 iPhone에 설치할 수는 없습니다. 실제 iPhone 빌드와 설치는 macOS와 Xcode가 필요합니다.

## Xcode로 열기

Mac에서 `frontend` 디렉토리로 이동한 뒤 실행합니다.

```bash
npm install
npm run ios:open
```

이 명령은 프론트엔드 빌드, Capacitor iOS 동기화, Xcode 프로젝트 열기를 순서대로 실행합니다.

## Xcode를 열지 않고 동기화만 하기

Mac 또는 Windows에서 `frontend` 디렉토리로 이동한 뒤 실행합니다.

```bash
npm run ios:sync
```

프론트엔드 코드, Capacitor 설정, 에셋, 플러그인을 수정한 뒤 iOS 프로젝트에 반영할 때 사용합니다.

## iPhone에 실행하기

1. iPhone을 USB로 Mac에 연결합니다.
2. `npm run ios:open`으로 Xcode 프로젝트를 엽니다.
3. Xcode에서 앱 프로젝트를 선택합니다.
4. `Signing & Capabilities`로 이동합니다.
5. Apple Developer `Team`을 선택합니다.
6. `Bundle Identifier`가 고유한 값인지 확인합니다.
7. 상단 실행 대상에서 연결된 iPhone을 선택합니다.
8. `Run` 버튼을 눌러 iPhone에 설치하고 실행합니다.

## TestFlight 또는 App Store용 빌드

Xcode에서 아래 메뉴를 선택합니다.

```text
Product > Archive
```

아카이브가 끝나면 Organizer 창에서 App Store Connect로 업로드할 수 있습니다.

## Mac 없이 iPhone Safari로 테스트하기

앱 설치는 할 수 없지만, iPhone Safari에서 웹앱 화면을 확인할 수 있습니다.

Windows에서 `frontend` 디렉토리로 이동한 뒤 실행합니다.

```powershell
npm run dev -- --host 0.0.0.0
```

그 다음 PC의 내부 IP 주소를 확인합니다.

```powershell
ipconfig
```

예를 들어 PC IP가 `192.168.0.12`라면 iPhone Safari에서 아래 주소로 접속합니다.

```text
http://192.168.0.12:5000
```

iPhone과 PC는 같은 Wi-Fi에 연결되어 있어야 합니다.
