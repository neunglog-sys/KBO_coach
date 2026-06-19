import Capacitor
import AVFAudio

// 음성인식 플러그인이 오디오 세션을 통화형(playAndRecord)으로 바꾼 뒤 복원하지 않아
// TTS가 수화기(작은 스피커)로 나오는 문제 — 녹음 종료 후 JS에서 호출해 재생 모드로 되돌린다.
@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionPlugin"
    public let jsName = "AudioSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "toPlayback", returnType: CAPPluginReturnPromise)
    ]

    @objc func toPlayback(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)
        call.resolve()
    }
}
