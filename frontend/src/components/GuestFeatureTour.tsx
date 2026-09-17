import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./GuestFeatureTour.css";

interface GuestFeatureTourProps {
  onClose: () => void;
}

interface TourStep {
  title: string;
  description: string;
  example?: string;
  selector: string;
  placement: "top" | "bottom";
}

interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const TOUR_STEPS: readonly TourStep[] = [
  {
    title: "공복이에게 물어보세요!",
    description: "메인 화면 하단에서 공복이에게 궁금한 야구 정보를 질문해 보세요.",
    example: "예) 도루가 뭐야?",
    selector: ".stage-inputbar",
    placement: "top",
  },
  {
    title: "팀 채팅방",
    description: "내가 설정한 응원 구단의 팬들과 함께 대화할 수 있어요!",
    selector: '.stage-nav [data-target="chat"]',
    placement: "bottom",
  },
  {
    title: "나만의 기록",
    description: "나만의 야구 관람 기록을 남기고, 관람한 경기의 기록도 함께 확인할 수 있어요!",
    selector: '.stage-nav [data-target="record"]',
    placement: "bottom",
  },
  {
    title: "야구짝꿍",
    description: "출석 체크, 야구 퀴즈, 응원하기로 나만의 야구짝꿍을 키워보세요!",
    example: "락커룸에서 다양한 아이템도 모을 수 있어요!",
    selector: '.stage-nav [data-target="tamagotchi"]',
    placement: "bottom",
  },
  {
    title: "구장정보",
    description: "KBO 10개 구단의 홈구장 위치와 정보를 확인할 수 있어요!",
    selector: '.stage-nav [data-target="stadium"]',
    placement: "bottom",
  },
  {
    title: "설정",
    description: "응원 구단과 서비스 설정을 변경할 수 있어요!",
    selector: '.stage-nav [data-target="settings"]',
    placement: "bottom",
  },
] as const;

const HIGHLIGHT_GAP = 6;
const BUBBLE_GAP = 14;
const BUBBLE_MAX_WIDTH = 340;

function readTargetRect(selector: string): HighlightRect | null {
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function GuestFeatureTour({ onClose }: GuestFeatureTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<HighlightRect | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  useEffect(() => {
    let frame = 0;
    let retryTimer = 0;

    const updateTarget = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextRect = readTargetRect(step.selector);
        setTargetRect(nextRect);
        if (!nextRect) {
          retryTimer = window.setTimeout(updateTarget, 120);
        }
      });
    };

    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.visualViewport?.addEventListener("resize", updateTarget);
    window.visualViewport?.addEventListener("scroll", updateTarget);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retryTimer);
      window.removeEventListener("resize", updateTarget);
      window.visualViewport?.removeEventListener("resize", updateTarget);
      window.visualViewport?.removeEventListener("scroll", updateTarget);
    };
  }, [step.selector]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const highlightStyle = useMemo<CSSProperties | undefined>(() => {
    if (!targetRect) return undefined;
    return {
      left: targetRect.left - HIGHLIGHT_GAP,
      top: targetRect.top - HIGHLIGHT_GAP,
      width: targetRect.width + HIGHLIGHT_GAP * 2,
      height: targetRect.height + HIGHLIGHT_GAP * 2,
    };
  }, [targetRect]);

  const bubbleStyle = useMemo<CSSProperties | undefined>(() => {
    if (!targetRect) return undefined;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const bubbleWidth = Math.min(BUBBLE_MAX_WIDTH, viewportWidth - 24);
    const centeredLeft = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
    const left = Math.max(12, Math.min(centeredLeft, viewportWidth - bubbleWidth - 12));

    if (step.placement === "top") {
      return {
        left,
        width: bubbleWidth,
        bottom: Math.max(12, viewportHeight - targetRect.top + BUBBLE_GAP),
      };
    }

    return {
      left,
      width: bubbleWidth,
      top: targetRect.top + targetRect.height + BUBBLE_GAP,
    };
  }, [step.placement, targetRect]);

  function goNext() {
    if (isLastStep) {
      onClose();
      return;
    }
    setStepIndex((current) => current + 1);
  }

  return (
    <div className="guest-feature-tour" role="dialog" aria-modal="true" aria-label="주요 기능 안내">
      {targetRect ? (
        <span className="guest-feature-tour-highlight" style={highlightStyle} aria-hidden="true" />
      ) : null}

      <section
        className={`guest-feature-tour-bubble is-${step.placement}${targetRect ? "" : " is-centered"}`}
        style={bubbleStyle}
        aria-live="polite"
      >
        <button
          type="button"
          className="guest-feature-tour-close"
          aria-label="기능 안내 닫기"
          onClick={onClose}
        >
          ×
        </button>

        <span className="guest-feature-tour-count">
          {stepIndex + 1} / {TOUR_STEPS.length}
        </span>
        <h2>{step.title}</h2>
        <p>{step.description}</p>
        {step.example ? <p className="guest-feature-tour-example">{step.example}</p> : null}

        <div className="guest-feature-tour-footer">
          <span className="guest-feature-tour-dots" aria-hidden="true">
            {TOUR_STEPS.map((item, index) => (
              <span key={item.title} className={index === stepIndex ? "is-active" : ""} />
            ))}
          </span>
          <span className="guest-feature-tour-actions">
            {stepIndex > 0 ? (
              <button type="button" className="is-secondary" onClick={() => setStepIndex((current) => current - 1)}>
                이전
              </button>
            ) : null}
            <button type="button" className="is-primary" onClick={goNext}>
              {isLastStep ? "시작하기" : "다음"}
            </button>
          </span>
        </div>
      </section>
    </div>
  );
}
