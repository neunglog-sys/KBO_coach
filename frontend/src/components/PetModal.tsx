import AttendanceCheckIn from "./AttendanceCheckIn";

interface PetModalProps {
  authToken: string;
  favTeamCode?: string;
  // 모달을 닫을 때 부모가 처리하도록 콜백으로 넘겨받는다.
  onClose: () => void;
}

// =====================================================================
// 다마고치(나만의 야구선수 키우기) 모달
//  - MainViewV2 안에 있던 모달 JSX를 그대로 별도 컴포넌트로 분리한 것.
//  - 화면/스타일/동작은 기존과 100% 동일하다. (구조만 분리)
//  - 부모(MainViewV2)는 열림 여부만 관리하고, 실제 모달은 여기서 그린다.
// =====================================================================
export default function PetModal({ authToken, favTeamCode, onClose }: PetModalProps) {
  return (
    <div
      role="dialog"
      aria-label="다마고치"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 20,
          width: "min(560px, 96vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <style>{`
          .pet-modal-body .attendance-panel {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .pet-modal-body .attendance-stats {
            display: flex !important;
            flex-direction: row !important;
            gap: 8px !important;
          }
          .pet-modal-body .attendance-panel * {
            max-width: 100%;
          }
        `}</style>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            border: "none",
            background: "#f1f5f9",
            borderRadius: 999,
            width: 32,
            height: 32,
            cursor: "pointer",
            fontSize: 16,
            zIndex: 1,
          }}
        >
          ✕
        </button>
        <div className="pet-modal-body" style={{ width: "100%", display: "block" }}>
          <AttendanceCheckIn
            key={authToken || "signed-out"}
            authToken={authToken}
            favTeamCode={favTeamCode}
          />
        </div>
      </div>
    </div>
  );
}
