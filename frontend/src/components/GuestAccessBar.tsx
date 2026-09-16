interface GuestAccessBarProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function GuestAccessBar({ onLogin, onRegister }: GuestAccessBarProps) {
  return (
    <aside className="guest-access-bar" aria-label="게스트 계정 안내">
      <span className="guest-access-label">
        <span className="guest-access-dot" aria-hidden="true" />
        게스트 모드
      </span>
      <span className="guest-access-actions">
        <button type="button" onClick={onLogin}>로그인</button>
        <button type="button" className="is-primary" onClick={onRegister}>회원가입</button>
      </span>
    </aside>
  );
}
