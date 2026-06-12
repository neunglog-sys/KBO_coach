import { useEffect, useRef } from "react";

/**
 * 라투디(야구공 캐릭터) Live2D 컴포넌트.
 * - 터치/마우스를 누르고 있는 동안 그 지점을 쳐다보고, 떼면 정면으로 복귀
 * - expression에 팀 코드(소문자: kia, lg, doosan, samsung, lotte, ssg, kt, nc, kiwoom, hanwha)를
 *   넘기면 해당 팀 표정(장비)으로 전환
 * 필요 사전 작업:
 * - public/live2d/ 에 모델 파일들 (ball.model3.json 등)
 * - index.html 에 live2dcubismcore.min.js 스크립트
 * - npm i pixi.js@6.5.10 pixi-live2d-display@0.4.0
 */

interface LatudiCharacterProps {
  /** 팀 표정 이름 (model3.json의 Expressions Name). null이면 기본 모습 */
  expression?: string | null;
  width?: number;
  height?: number;
  className?: string;
}

export function LatudiCharacter({
  expression = null,
  width = 280,
  height = 280,
  className,
}: LatudiCharacterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // PIXI/모델 인스턴스는 렌더와 무관한 가변 객체라 ref로 보관
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null); // window 리스너 해제용

  // ── 초기화 (마운트 시 1회) ───────────────────────────────
  useEffect(() => {
    let destroyed = false;

    async function init() {
      // 동적 import — Live2D 코어 스크립트가 없는 환경에서 앱 전체가 깨지지 않게
      const PIXI = await import("pixi.js");
      (window as unknown as { PIXI: unknown }).PIXI = PIXI; // pixi-live2d-display가 전역 PIXI 사용
      const { Live2DModel } = await import("pixi-live2d-display/cubism4");

      if (destroyed || !containerRef.current) return;

      const app = new PIXI.Application({
        width,
        height,
        backgroundAlpha: 0, // 투명 배경
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      appRef.current = app;
      containerRef.current.appendChild(app.view as HTMLCanvasElement);

      const model = await Live2DModel.from("/live2d/ball.model3.json", {
        autoInteract: false, // 포인터 추적은 아래에서 직접 제어 (누른 동안만 쳐다보게)
      });
      if (destroyed) {
        model.destroy();
        return;
      }
      modelRef.current = model;

      // 캔버스에 맞춰 스케일 + 중앙 배치 (로드 직후 scale=1이라 model.width = 원본 크기)
      const scale = Math.min(width / model.width, height / model.height);
      model.scale.set(scale);
      model.anchor.set(0.5, 0.5);
      model.position.set(width / 2, height / 2);

      app.stage.addChild(model);

      // ── 시선 제어 ──────────────────────────────────
      // model.focus()는 "방향"만 보고 항상 최대 각도로 돌리기 때문에 미세 제어가 안 됨.
      // → 내부 focusController에 정규화 시선값(-1~1)을 직접 전달해 정밀 제어:
      //   follow: 누른 지점 따라봄 / hold: 뗀 뒤 0.7초 응시 / return: 1.2초에 걸쳐 천천히 정면 복귀
      //   idle: 정면 근처를 주시하며 아주 느린 사인파로만 미세하게 움직임 (틱틱 튐 없음)
      const view = app.view as HTMLCanvasElement;
      view.style.touchAction = "none";

      const LOOK_HOLD_MS = 700;   // 탭 후 그 지점을 응시하는 시간
      const RETURN_MS = 1200;     // 정면으로 돌아오는 데 걸리는 시간 (천천히)

      let mode: "follow" | "hold" | "return" | "idle" = "idle";
      let holdUntil = 0;
      let returnStart = 0;
      let returnFromX = 0;
      let returnFromY = 0;
      let gazeX = 0;              // 현재 시선 목표 (정규화 -1~1)
      let gazeY = 0;
      let t = 0;
      const baseY = height / 2;

      const clamp = (v: number) => Math.max(-1, Math.min(1, v));

      // 화면 좌표 → 정규화 시선값 (캔버스 밖 지점은 끝까지 돌아봄)
      function pointToGaze(e: PointerEvent) {
        const rect = view.getBoundingClientRect();
        gazeX = clamp((e.clientX - rect.left - width / 2) / (width / 2));
        gazeY = clamp(-(e.clientY - rect.top - height / 2) / (height / 2)); // 위가 +
      }

      // idle 숨쉬기: 두 겹 사인파(주기 다름)로 정면 근처를 아주 느리게 배회
      function idleSwayX() { return Math.sin(t / 1700) * 0.07 + Math.sin(t / 4100) * 0.05; }
      function idleSwayY() { return Math.sin(t / 2300 + 1.1) * 0.05 + Math.sin(t / 5300) * 0.03; }

      function onDown(e: PointerEvent) {
        // data-latudi-ignore가 붙은 요소(예: 시작하기 버튼)에서 시작된 터치는 시선 추적 제외
        const target = e.target as HTMLElement | null;
        if (target?.closest?.("[data-latudi-ignore]")) return;
        mode = "follow";
        pointToGaze(e);
      }
      function onMove(e: PointerEvent) {
        if (mode === "follow") pointToGaze(e);
      }
      function onUp() {
        if (mode !== "follow") return;
        mode = "hold";
        holdUntil = performance.now() + LOOK_HOLD_MS;
      }

      app.ticker.add(() => {
        const model = modelRef.current;
        if (!model) return;
        t += app.ticker.deltaMS;
        const now = performance.now();

        if (mode === "hold" && now >= holdUntil) {
          // 응시 끝 → 천천히 복귀 시작 (현재 시선에서 출발)
          mode = "return";
          returnStart = now;
          returnFromX = gazeX;
          returnFromY = gazeY;
        }

        if (mode === "return") {
          const p = Math.min(1, (now - returnStart) / RETURN_MS);
          const ease = p * p * (3 - 2 * p); // smoothstep — 점점 느려지며 자연스럽게
          // 복귀 목표를 "숨쉬기 현재값"으로 잡아 idle 전환 시 점프 없이 이어짐
          gazeX = returnFromX + (idleSwayX() - returnFromX) * ease;
          gazeY = returnFromY + (idleSwayY() - returnFromY) * ease;
          if (p >= 1) mode = "idle";
        } else if (mode === "idle") {
          gazeX = idleSwayX();
          gazeY = idleSwayY();
        }
        // follow/hold 모드의 gazeX/Y는 포인터 핸들러가 유지

        model.internalModel.focusController.focus(gazeX, gazeY);

        // 호흡 보브: 몸 전체 상하 1.5px (항상)
        model.position.y = baseY + Math.sin(t / 1100) * 1.5;
      });

      // window 레벨로 등록 — 버튼/빈 공간 어디를 눌러도 반응 (클릭 이벤트는 막지 않음)
      window.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      cleanupRef.current = () => {
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    }

    init().catch((e) => console.error("라투디 로드 실패:", e));

    return () => {
      destroyed = true;
      cleanupRef.current?.(); // window 포인터 리스너 해제
      cleanupRef.current = null;
      modelRef.current?.destroy();
      modelRef.current = null;
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
    };
    // width/height는 고정 사용 전제 (변경 시 재마운트는 부모에서 key로)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 팀 표정 전환 ───────────────────────────────
  useEffect(() => {
    if (!modelRef.current) return;
    if (expression) {
      modelRef.current.expression(expression); // 예: "kia" → KIA 장비
    }
  }, [expression]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, margin: "0 auto" }}
      aria-label="라투디 캐릭터"
    />
  );
}
