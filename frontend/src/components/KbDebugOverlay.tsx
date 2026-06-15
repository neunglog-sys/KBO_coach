import { useEffect, useState } from "react";

/**
 * iOS 키보드 inset 디버그 오버레이 (임시). URL ?kbdebug=1 일 때만 표시.
 * 키보드를 올린 상태에서 innerHeight / visualViewport / measured / --keyboard-inset 실측값을
 * 화면에 띄워, 입력바-키보드 공백 원인을 기기에서 직접 확인한다. (맥 없어 원격 디버깅 불가)
 */
export function KbDebugOverlay({ enabled = false }: { enabled?: boolean }) {
  const [d, setD] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!enabled) return;
    const vv = window.visualViewport;
    const upd = () => {
      const inset = getComputedStyle(document.documentElement)
        .getPropertyValue("--keyboard-inset").trim();
      setD({
        inner: window.innerHeight,
        vvHeight: vv ? Math.round(vv.height) : "-",
        vvOffsetTop: vv ? Math.round(vv.offsetTop) : "-",
        measured: vv ? Math.round(window.innerHeight - vv.height - vv.offsetTop) : "-",
        keyboardInset: inset || "0px",
        kbOpen: document.documentElement.classList.contains("kb-open"),
      });
    };
    upd();
    vv?.addEventListener("resize", upd);
    vv?.addEventListener("scroll", upd);
    const t = window.setInterval(upd, 300);
    return () => {
      vv?.removeEventListener("resize", upd);
      vv?.removeEventListener("scroll", upd);
      window.clearInterval(t);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div style={{
      position: "fixed", top: 56, left: 10, zIndex: 99999,
      background: "rgba(0,0,0,0.82)", color: "#3f6", font: "12px monospace",
      padding: "8px 10px", borderRadius: 6, lineHeight: 1.5, pointerEvents: "none",
    }}>
      <div>inner: {String(d.inner)}</div>
      <div>vv.height: {String(d.vvHeight)}</div>
      <div>vv.offsetTop: {String(d.vvOffsetTop)}</div>
      <div>measured: {String(d.measured)}</div>
      <div>--keyboard-inset: {String(d.keyboardInset)}</div>
      <div>kb-open: {String(d.kbOpen)}</div>
    </div>
  );
}
