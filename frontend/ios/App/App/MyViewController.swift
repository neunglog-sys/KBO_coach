import UIKit
import Capacitor

// 좌측 엣지 스와이프 뒤로가기 활성화 — 웹뷰 히스토리(pushState)와 연동되어
// MainViewV2의 popstate 핸들러가 열린 화면을 닫는다.
class MyViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
    }
}
