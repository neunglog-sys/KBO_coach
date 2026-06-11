import { useRef, useState } from "react";
import {
  getCharacterImage,
  getRewardSrc,
  LEVEL_REWARDS,
  type Gender,
} from "./AttendanceCheckIn";

interface LockerRoomProps {
  level: number;
  teamCode?: string | null;
  gender: Gender;
  onClose: () => void;
}

// 팀별 라커룸 배경 (frontend/public/locker/{팀코드}.png)
// 응원 팀이 없으면(무소속) 기본 라커룸(/img/locker_room.png) 사용
const TEAM_LOCKER_CODES = ["HH", "HT", "KT", "LG", "LT", "NC", "OB", "SK", "SS", "WO"];

function getLockerBg(teamCode?: string | null): string {
  if (teamCode && TEAM_LOCKER_CODES.includes(teamCode)) {
    return `/locker/${teamCode}.png`;
  }
  return "/img/locker_room.png";
}

// 장비별 한 줄 설명 (LEVEL_REWARDS의 레벨 키 기준)
const ITEM_DESC: Record<number, string> = {
  3: "내가 응원하는 팀의 응원 수건이에요. 경기장에서 흔들며 응원해보세요!",
  4: "내가 응원하는 팀의 멋진 모자예요. 팀마다 다른 모자를 모아보세요!",
  7: "실밥 하나하나가 살아있는 고급 야구공이에요.",
  8: "초보자도 휘두르면 잘 치는 느낌이 드는 고급 야구배트예요.",
  9: "프로의 손맛이 느껴지는 최고급 글러브예요.",
};

// 도감 슬롯: 5개 장비를 각각 한 칸씩. 자기 레벨에 도달하면 영구히 열린다(대체 없음).
const ALL_SLOTS: Array<{ level: number; label: string }> = [
  { level: 3, label: "응원 수건" },
  { level: 4, label: "야구 모자" },
  { level: 7, label: "야구공" },
  { level: 8, label: "고급 배트" },
  { level: 9, label: "고급 글러브" },
];

// 빈 라커 이미지 (frontend/public/equipment/locker.png)
const EMPTY_LOCKER_BG = "/equipment/locker.png";

// =====================================================================
// 라커·캐릭터: 크기·위치 고정 / 배경: cover로 영역을 항상 가득 채움
//  - 배경(/locker/{팀}.png, 1536×1024 가로형)은 cover — 화면에 맞춰 채우고 옆은 잘림
//  - 라커·캐릭터는 투명한 "고정 평면"(아래 px 크기, 하단 중앙 정렬) 안에 배치되어
//    해상도가 어떻게 변해도 확대/축소 없이 항상 같은 크기·같은 자리
// =====================================================================
const PLANE_W_PX = 330;                // 고정 평면 너비 (350×750에서 완벽했던 화면 기준)
const PLANE_H_PX = 495;                // 고정 평면 높이
const CHAR_FOOT_PAD_RATIO = 107 / 543; // 표준 규격의 하단 투명 여백 비율 (측정 실패 시 대체값)
const LOCKER_LEFT_PCT = -9.4;          // 빈 라커 왼쪽 (평면 가로 %)
const LOCKER_BOTTOM_PCT = 2;           // 빈 라커 바닥 = 발바닥 라인 (평면 세로 %)
const LOCKER_HEIGHT_PCT = 74;          // 빈 라커 높이 (평면 세로 %)
const CHAR_LEFT_PCT = 76;              // 캐릭터 중심 가로 (평면 가로 %)
const CHAR_BOTTOM_PCT = 2;             // 캐릭터 발바닥 라인 (라커 바닥과 동일)
const CHAR_HEIGHT_PCT = 58.3;          // 캐릭터 이미지 박스 높이 (평면 세로 %)

// 라커 안 물건 배치: 레벨 키별 위치/크기 + 레이어 순서(zIndex)
// 레이어(뒤→앞): 수건(3) → 고급배트(8) → 고급글러브(9) → 모자(4) → 야구공(7)
const LOCKER_ITEM_POS: Record<number, { left: string; top: string; width: string; rotate: number; z: number }> = {
  3: { left: "45%",   top: "40.6%", width: "36%",   rotate: 0,   z: 1 }, // 수건
  8: { left: "66.2%", top: "63.1%", width: "57%",   rotate: 148, z: 2 }, // 고급배트
  9: { left: "48.8%", top: "75.9%", width: "37%",   rotate: 0,   z: 3 }, // 고급글러브
  4: { left: "38%",   top: "76%",   width: "26%",   rotate: 11,  z: 4 }, // 모자 (글러브보다 앞)
  7: { left: "69.1%", top: "79%",   width: "14%",   rotate: 0,   z: 5 }, // 야구공 (맨 앞, 라커 구석)
};

export default function LockerRoom({ level, teamCode, gender, onClose }: LockerRoomProps) {
  const characterSrc = getCharacterImage(level, teamCode, gender);
  // 응원 팀에 따라 라커룸 배경 선택 (무소속이면 기본 라커룸)
  const lockerBg = getLockerBg(teamCode);
  // 클릭한 장비 슬롯의 레벨 키 (null이면 설명창 닫힘)
  const [selected, setSelected] = useState<number | null>(null);

  // 캐릭터 하단 투명 여백 비율: 이미지의 알파를 직접 읽어 발 위치 보정 (이미지별 캐시)
  const [footPadRatio, setFootPadRatio] = useState(CHAR_FOOT_PAD_RATIO);
  const footPadCache = useRef<Record<string, number>>({});
  const measureFootPad = (img: HTMLImageElement) => {
    const key = img.currentSrc || img.src;
    const cached = footPadCache.current[key];
    if (cached !== undefined) {
      setFootPadRatio(cached);
      return;
    }
    if (!img.complete || img.naturalWidth === 0) return;
    try {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let lastRow = size - 1;
      outer: for (let y = size - 1; y >= 0; y--) {
        for (let x = 0; x < size; x++) {
          if (data[(y * size + x) * 4 + 3] > 20) {
            lastRow = y;
            break outer;
          }
        }
      }
      const ratio = (size - 1 - lastRow) / size;
      footPadCache.current[key] = ratio;
      setFootPadRatio(ratio);
    } catch {
      setFootPadRatio(CHAR_FOOT_PAD_RATIO); // 측정 불가 시 표준 비율로 동작
    }
  };
  // 보이는 발이 바닥 라인에 오도록, 자기 키 기준(translateY %)으로 여백만큼 내림
  const footShiftPct = (footPadRatio * 100).toFixed(2);

  return (
    <div
      role="dialog"
      aria-label="꾸미기 라커룸"
      onClick={onClose}
      style={{
        fontFamily: '"Pretendard Variable", Pretendard, -apple-system, "Malgun Gothic", sans-serif',
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(420px, 94vw)",
          height: "min(760px, 92vh)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 20,
          overflow: "hidden",
          background: "#1f2937",
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            border: "none",
            background: "rgba(255,255,255,0.85)",
            borderRadius: 999,
            width: 34,
            height: 34,
            cursor: "pointer",
            fontSize: 16,
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* 제목 (반투명 칩 배경, 모자~글자 전체가 시각적 정가운데) */}
        {/* 이모지 글리프의 보이지 않는 좌측 여백을 paddingLeft 축소로 상쇄 — 쏠려 보이면 paddingLeft 숫자 조절 */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            lineHeight: 1,
            color: "#fff",
            fontWeight: 800,
            fontSize: 18,
            textShadow: "0 1px 3px rgba(0,0,0,0.9)",
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(4px)",
            padding: "9px 16px 9px 8px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.35)",
            zIndex: 5,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>🧢</span>
          <span>꾸미기 - 라커룸</span>
        </div>

        {/* 배경 + 캐릭터 영역: 배경은 cover로 영역 전체를 채움 (넓은 배경이라 옆이 잘려도 OK) */}
        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            backgroundImage: `url(${lockerBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* 고정 평면(투명): 라커·캐릭터의 크기·위치만 고정하는 틀 — 해상도와 무관하게 항상 같은 크기 */}
          {/* 하단 중앙 정렬 */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              transform: "translateX(-50%)",
              width: PLANE_W_PX,
              height: PLANE_H_PX,
            }}
          >
          {/* 왼쪽: 빈 라커 + 획득한 물건 연출 (레벨업 시 하나씩 채워짐) */}
          {/* 배경 평면 좌표(%) — 배경 그림에 접착되어 함께 움직임 */}
          <div
            style={{
              position: "absolute",
              left: `${LOCKER_LEFT_PCT}%`,
              bottom: `${LOCKER_BOTTOM_PCT}%`,
              height: `${LOCKER_HEIGHT_PCT}%`,
              aspectRatio: "1024 / 1536",
              backgroundImage: `url(${EMPTY_LOCKER_BG})`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "bottom center",
            }}
          >
            {ALL_SLOTS.map((slot) => {
              const pos = LOCKER_ITEM_POS[slot.level];
              const isOwned = level >= slot.level;
              // 아직 획득 못 한 물건은 라커에 안 보임
              if (!pos || !isOwned) return null;
              const item = LEVEL_REWARDS[slot.level];
              return (
                <img
                  key={slot.level}
                  src={getRewardSrc(item, teamCode)}
                  alt={item.name}
                  style={{
                    position: "absolute",
                    left: pos.left,
                    top: pos.top,
                    width: pos.width,
                    transform: `translate(-50%, -50%) rotate(${pos.rotate}deg)`,
                    zIndex: pos.z,
                    objectFit: "contain",
                    filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))",
                  }}
                  onError={(e) => { (e.currentTarget.style.visibility = "hidden"); }}
                />
              );
            })}
          </div>

          {/* 캐릭터: 배경 평면 좌표(%) 접착. 보이는 발은 관물대 바닥 라인에 자동 정렬 */}
          <img
            src={characterSrc}
            alt="내 다마고치 캐릭터"
            onLoad={(e) => measureFootPad(e.currentTarget)}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `/character/default_${gender === "girl" ? "girl" : "man"}.png`;
            }}
            style={{
              position: "absolute",
              left: `${CHAR_LEFT_PCT}%`,
              bottom: `${CHAR_BOTTOM_PCT}%`,
              // 하단 투명 여백만큼 자기 키 기준으로 내려서 발을 바닥 라인에
              transform: `translateX(-50%) translateY(${footShiftPct}%)`,
              transformOrigin: "bottom center",
              height: `${CHAR_HEIGHT_PCT}%`,
              objectFit: "contain",
            }}
          />
          </div>
        </div>

        {/* 장비 선반 (도감): 레벨 도달 시 영구 해금. 5칸을 하나씩 모으는 방식 */}
        <div
          style={{
            flexShrink: 0,
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 8,
            padding: "14px 16px 18px",
            background: "#2d3748",
          }}
        >
          {ALL_SLOTS.map((slot) => {
            const item = LEVEL_REWARDS[slot.level];
            const isOwned = level >= slot.level; // 내 레벨이 칸 레벨 이상이면 영구 해금
            return (
              <div
                key={slot.level}
                onClick={(e) => { e.stopPropagation(); setSelected(slot.level); }}
                title={isOwned ? item.name : `Lv.${slot.level} 달성 시 획득`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 4px",
                  borderRadius: 12,
                  background: isOwned ? "#fef3c7" : "rgba(255,255,255,0.06)",
                  border: isOwned ? "2px solid #f59e0b" : "1px dashed #4b5563",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <img
                  src={getRewardSrc(item, teamCode)}
                  alt={item.name}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "contain",
                    filter: isOwned ? "none" : "grayscale(1) brightness(0.5)",
                    opacity: isOwned ? 1 : 0.6,
                  }}
                  onError={(e) => { (e.currentTarget.style.visibility = "hidden"); }}
                />
                {!isOwned ? (
                  <span style={{ position: "absolute", top: "30%", fontSize: 18 }}>🔒</span>
                ) : null}
                <span
                  style={{
                    fontSize: 10,
                    color: isOwned ? "#92400e" : "#9ca3af",
                    fontWeight: isOwned ? 700 : 400,
                    textAlign: "center",
                    lineHeight: 1.1,
                  }}
                >
                  {isOwned ? slot.label : `Lv.${slot.level}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* 장비 설명창: 칸 클릭 시 표시, 아무 곳이나 누르면 닫힘 */}
        {selected != null ? (
          <div
            onClick={(e) => { e.stopPropagation(); setSelected(null); }}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              zIndex: 10,
              cursor: "pointer",
            }}
          >
            {(() => {
              const item = LEVEL_REWARDS[selected];
              const isOwned = level >= selected;
              return (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    padding: "24px 22px",
                    textAlign: "center",
                    maxWidth: 300,
                  }}
                >
                  <img
                    src={getRewardSrc(item, teamCode)}
                    alt={item.name}
                    style={{
                      width: 220, height: 220, objectFit: "contain",
                      filter: isOwned ? "none" : "grayscale(1) brightness(0.6)",
                      opacity: isOwned ? 1 : 0.7,
                    }}
                    onError={(e) => { (e.currentTarget.style.visibility = "hidden"); }}
                  />
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>
                    {isOwned ? item.name : "🔒 미획득"}
                  </div>
                  <p style={{ fontSize: 14, color: "#374151", marginTop: 8, lineHeight: 1.5 }}>
                    {isOwned ? ITEM_DESC[selected] : `Lv.${selected} 달성 시 획득할 수 있어요.`}
                  </p>
                </div>
              );
            })()}
            <div style={{ color: "#fff", fontSize: 12, marginTop: 16, opacity: 0.9 }}>
              화면 아무 곳이나 누르면 꺼집니다.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
