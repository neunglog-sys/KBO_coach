import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
// Cubism 3/4(moc3) 런타임. window.Live2DCubismCore (index.html에서 로드) 필요.
import { Live2DModel } from "pixi-live2d-display/cubism4";

// pixi-live2d-display가 PIXI 티커/플러그인을 자동 등록하도록 전역 노출.
(window as unknown as { PIXI: typeof PIXI }).PIXI = PIXI;

interface CharacterLive2DProps {
  /** 말하는 중이면 입(ParamMouthOpenY)을 움직인다. */
  isSpeaking: boolean;
  className?: string;
}

const MODEL_URL = "/model/ball/ball.model3.json";

export default function CharacterLive2D({ isSpeaking, className }: CharacterLive2DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let app: PIXI.Application | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let model: any = null;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    mount.appendChild(canvas);

    app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0, // 배경 투명
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      resizeTo: mount,
    });

    let mouth = 0; // 현재 입 벌림(0~1)
    let blinkTimer = 0;
    let nextBlinkAt = 1500 + Math.random() * 2500;
    let blinking = 0; // 0~1 (1=감음)
    let last = performance.now();

    function layout() {
      if (!app || !model || disposed) return;
      const w = app.renderer.width / app.renderer.resolution;
      const h = app.renderer.height / app.renderer.resolution;
      const scale = Math.min(w / model.width, h / model.height) * 0.95;
      model.scale.set(scale);
      model.x = w / 2;
      model.y = h / 2;
    }

    Live2DModel.from(MODEL_URL, { autoInteract: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((loaded: any) => {
        if (disposed || !app) {
          loaded.destroy?.();
          return;
        }
        model = loaded;
        model.anchor.set(0.5, 0.5);
        app.stage.addChild(model);
        layout();

        const core = model.internalModel.coreModel;
        app.ticker.add(() => {
          const now = performance.now();
          const dt = now - last;
          last = now;

          // 입: 말할 때 진동, 아니면 닫힘으로 수렴
          const target = speakingRef.current ? 0.5 + 0.5 * Math.sin(now / 70) : 0;
          mouth += (target - mouth) * 0.5;
          core.setParameterValueById("ParamMouthOpenY", mouth);

          // 가벼운 좌우 흔들림(생기)
          core.setParameterValueById("ParamAngleX", Math.sin(now / 1300) * 6);
          core.setParameterValueById("ParamAngleZ", Math.sin(now / 1700) * 3);

          // 눈 깜빡임
          blinkTimer += dt;
          if (!blinking && blinkTimer >= nextBlinkAt) {
            blinking = 1;
          }
          if (blinking) {
            blinking -= dt / 90; // 약 90ms 동안 감았다 뜸
            if (blinking <= 0) {
              blinking = 0;
              blinkTimer = 0;
              nextBlinkAt = 1500 + Math.random() * 2500;
            }
          }
          const eyeOpen = 1 - Math.max(0, Math.min(1, blinking));
          core.setParameterValueById("ParamEyeLOpen", eyeOpen);
          core.setParameterValueById("ParamEyeROpen", eyeOpen);
        });
      })
      .catch((err: unknown) => console.error("[CharacterLive2D] 모델 로드 실패", err));

    const resizeObserver = new ResizeObserver(() => layout());
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      try {
        model?.destroy?.();
        app?.destroy(true, { children: true, texture: true, baseTexture: true });
      } catch {
        /* noop */
      }
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ aspectRatio: "1 / 1" }}
      aria-label="야구 초보자를 안내하는 야구공 캐릭터"
      role="img"
    />
  );
}
