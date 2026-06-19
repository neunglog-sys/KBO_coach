import { useFpsMonitor } from "../hooks/useFpsMonitor";

type FpsOverlayProps = {
  enabled?: boolean;
};

/**
 * FPS 측정 오버레이 (평가용). 평소엔 숨기고 측정 시에만 표시 — 보통 URL ?fps=1 로 켠다.
 * 3D 캐릭터·TTS·립싱크 실행 중 화면 우상단에 현재/평균/최저 FPS, 30fps 유지율을 띄운다.
 */
export function FpsOverlay({ enabled = true }: FpsOverlayProps) {
  const stats = useFpsMonitor(enabled);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(0, 0, 0, 0.72)",
        color: "#fff",
        fontSize: 12,
        lineHeight: 1.5,
        fontFamily: "monospace",
        pointerEvents: "none",
      }}
    >
      <div>FPS: {stats.currentFps}</div>
      <div>AVG: {stats.avgFps}</div>
      <div>MIN: {stats.minFps}</div>
      <div>30fps+: {stats.over30Rate}%</div>
      <div>Samples: {stats.sampleCount}</div>
    </div>
  );
}
