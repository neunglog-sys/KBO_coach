interface GuestNoticeModalProps {
  onConfirm: () => void;
}

export function GuestNoticeModal({ onConfirm }: GuestNoticeModalProps) {
  return (
    <div className="guest-notice-backdrop" role="presentation">
      <section
        className="guest-notice-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-notice-title"
        aria-describedby="guest-notice-description"
      >
        <span className="guest-notice-icon" aria-hidden="true">⚾</span>
        <h2 id="guest-notice-title">게스트 모드 안내</h2>
        <div id="guest-notice-description" className="guest-notice-copy">
          <p>현재 게스트로 이용 중입니다.</p>
          <p>
            응원 구단, 직관 기록, 출석 및 퀴즈 등의 이용 정보는 현재 게스트 세션에만
            임시 저장됩니다. 브라우저를 닫거나 게스트 세션이 종료된 후에는 해당 정보를
            복구할 수 없습니다.
          </p>
          <p>정보를 계속 보관하려면 로그인하거나 회원가입해 주세요.</p>
        </div>
        <button type="button" className="guest-notice-confirm" onClick={onConfirm} autoFocus>
          네! 알겠어요 ☺️
        </button>
      </section>
    </div>
  );
}
