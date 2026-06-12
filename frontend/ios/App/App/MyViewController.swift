import UIKit
import Capacitor

// 좌측 엣지 스와이프 뒤로가기 활성화 — 웹뷰 히스토리(pushState)와 연동되어
// MainViewV2의 popstate 핸들러가 열린 화면을 닫는다.
class MyViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        // 네이티브 백 제스처는 SPA에서 유령 화면전환(스냅샷 슬라이드)을 만들어 비활성 —
        // 엣지 스와이프는 웹(JS)에서 직접 감지해 화면을 닫는다 (MainViewV2)
        webView?.allowsBackForwardNavigationGestures = false
    }
}
