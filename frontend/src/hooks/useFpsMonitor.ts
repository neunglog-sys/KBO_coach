import { useEffect, useRef, useState } from "react";

export type FpsStats = {
  currentFps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  over30Rate: number;
  sampleCount: number;
};

/**
 * 브라우저 렌더링 FPS 측정 (가이드 §2-2 / 팀장 가이드).
 * requestAnimationFrame으로 1초 단위 프레임 수를 집계해 평균·최저·최고·30fps 유지율 산출.
 */
export function useFpsMonitor(enabled: boolean = true): FpsStats {
  const [stats, setStats] = useState<FpsStats>({
    currentFps: 0,
    avgFps: 0,
    minFps: 0,
    maxFps: 0,
    over30Rate: 0,
    sampleCount: 0,
  });

  const frameCountRef = useRef(0);
  const windowStartRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    frameCountRef.current = 0;
    windowStartRef.current = null;
    samplesRef.current = [];

    const loop = (now: number) => {
      if (windowStartRef.current === null) {
        windowStartRef.current = now;
      }

      frameCountRef.current += 1;

      const elapsedMs = now - windowStartRef.current;

      // 1초마다 FPS 샘플 1개 생성
      if (elapsedMs >= 1000) {
        const fps = (frameCountRef.current * 1000) / elapsedMs;

        samplesRef.current.push(fps);

        const samples = samplesRef.current;
        const avgFps =
          samples.reduce((sum, value) => sum + value, 0) / samples.length;

        const minFps = Math.min(...samples);
        const maxFps = Math.max(...samples);
        const over30Count = samples.filter((value) => value >= 30).length;
        const over30Rate = (over30Count / samples.length) * 100;

        setStats({
          currentFps: Number(fps.toFixed(1)),
          avgFps: Number(avgFps.toFixed(1)),
          minFps: Number(minFps.toFixed(1)),
          maxFps: Number(maxFps.toFixed(1)),
          over30Rate: Number(over30Rate.toFixed(1)),
          sampleCount: samples.length,
        });

        frameCountRef.current = 0;
        windowStartRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled]);

  return stats;
}
