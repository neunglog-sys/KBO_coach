import { useEffect, useRef } from "react";
import "./WeatherFx.css";

export type WeatherCondition =
  | "clear"
  | "cloudy"
  | "overcast"
  | "rain"
  | "sleet"
  | "snow"
  | null;

interface WeatherFxProps {
  condition: WeatherCondition;
}

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** 날씨 애니메이션 오버레이 (비/눈=canvas, 햇살/흐림=CSS). pointer-events 없음. */
export function WeatherFx({ condition }: WeatherFxProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isParticle = condition === "rain" || condition === "sleet" || condition === "snow";

  useEffect(() => {
    if (!isParticle || prefersReduced()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isSnow = condition === "snow";
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const count = isSnow ? 70 : 130;
    const parts = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      len: isSnow ? 0 : 8 + Math.random() * 14, // 빗줄기 길이
      r: isSnow ? 1.5 + Math.random() * 2.5 : 0, // 눈송이 반지름
      spd: isSnow ? 0.6 + Math.random() * 1.2 : 6 + Math.random() * 6,
      drift: isSnow ? -0.6 + Math.random() * 1.2 : 1.1, // 눈=좌우흔들, 비=기울기
      phase: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (isSnow) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        for (const p of parts) {
          p.y += p.spd;
          p.phase += 0.02;
          p.x += Math.sin(p.phase) * p.drift;
          if (p.y > h + 4) {
            p.y = -4;
            p.x = Math.random() * w;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.strokeStyle = "rgba(174,194,224,0.55)";
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        for (const p of parts) {
          p.y += p.spd;
          p.x += p.drift;
          if (p.y > h) {
            p.y = -p.len;
            p.x = Math.random() * w;
          }
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.drift * 2, p.y - p.len);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [condition, isParticle]);

  if (!condition || condition === "cloudy" || condition === "clear") {
    // 맑음/구름많음은 별도 효과 없음 (밝은 기본 화면 그대로)
    return null;
  }

  return (
    <div className="weather-fx" aria-hidden="true">
      {condition === "overcast" ? <div className="wfx-overcast" /> : null}
      {isParticle ? (
        <>
          {condition !== "snow" ? <div className="wfx-rain-dim" /> : null}
          <canvas ref={canvasRef} className="wfx-canvas" />
        </>
      ) : null}
    </div>
  );
}

export default WeatherFx;
