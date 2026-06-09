import { useState } from "react";
import {
  getCharacterImage,
  LEVEL_REWARDS,
  type Gender,
} from "./AttendanceCheckIn";

interface LockerRoomProps {
  level: number;
  teamCode?: string | null;
  gender: Gender;
  onClose: () => void;
}

// 라커룸 배경 (frontend/public/img/locker_room.png)
const LOCKER_BG = "/img/locker_room.png";

// 장비별 한 줄 설명 (LEVEL_REWARDS의 레벨 키 기준)
const ITEM_DESC: Record<number, string> = {
  3: "어떤 공도 척척 받아낼 것 같은 든든한 글러브예요.",
  4: "휘두르기 편한, 입문자에게 딱 맞는 야구배트예요.",
  7: "실밥 하나하나가 살아있는 고급 야구공이에요.",
  8: "초보자도 휘두르면 잘 치는 느낌이 드는 고급 야구배트예요.",
  9: "프로의 손맛이 느껴지는 최고급 글러브예요.",
};

// 도감 슬롯: 5개 장비를 각각 한 칸씩. 자기 레벨에 도달하면 영구히 열린다(대체 없음).
const ALL_SLOTS: Array<{ level: number; label: string }> = [
  { level: 3, label: "글러브" },
  { level: 4, label: "배트" },
  { level: 7, label: "야구공" },
  { level: 8, label: "고급 배트" },
  { level: 9, label: "고급 글러브" },
];

export default function LockerRoom({ level, teamCode, gender, onClose }: LockerRoomProps) {
  const characterSrc = getCharacterImage(level, teamCode, gender);
  // 클릭한 장비 슬롯의 레벨 키 (null이면 설명창 닫힘)
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div
      role="dialog"
      aria-label="꾸미기 라커룸"
      onClick={onClose}
      style={{
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
          }}
        >
          ✕
        </button>

        {/* 제목 */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            color: "#fff",
            fontWeight: 800,
            fontSize: 18,
            textShadow: "0 1px 3px rgba(0,0,0,0.6)",
            zIndex: 5,
          }}
        >
          🧢 꾸미기 - 라커룸
        </div>

        {/* 배경 + 캐릭터 영역 (위쪽을 가득 채움) */}
        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            backgroundImage: `url(${LOCKER_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* 캐릭터: 우측 아래, 하단 도감보다 위에 서 있도록 배치 */}
          <img
            src={characterSrc}
            alt="내 다마고치 캐릭터"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `/character/default_${gender === "girl" ? "girl" : "man"}.png`;
            }}
            style={{
              position: "absolute",
              left: "78%",
              bottom: "2%",
              transform: "translateX(-50%)",
              height: "58%",
              objectFit: "contain",
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.4))",
            }}
          />
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
                  src={item.src}
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
                    src={item.src}
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
