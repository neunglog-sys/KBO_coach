import { ArrowLeft } from "lucide-react";

interface AppBackButtonProps {
  onClick: () => void;
}

export function AppBackButton({ onClick }: AppBackButtonProps) {
  return (
    <button
      className="app-back-button"
      type="button"
      aria-label="뒤로가기"
      onClick={onClick}
    >
      <ArrowLeft aria-hidden="true" strokeWidth={2.8} />
    </button>
  );
}
