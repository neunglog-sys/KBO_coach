import { FormEvent, useState } from "react";

interface LoginViewProps {
  error: string;
  onLogin: (id: string, password: string) => Promise<void>;
}

export function LoginView({ error, onLogin }: LoginViewProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onLogin(id.trim(), password);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-view" aria-label="로그인">
      <form id="loginForm" className="login-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">Baseball Rookie Coach</p>
        <h1>야구 초보자를 위한 AI 코치</h1>
        <label>
          <span>아이디</span>
          <input
            id="userId"
            type="text"
            autoComplete="username"
            value={id}
            onChange={(event) => setId(event.target.value)}
            required
          />
        </label>
        <label>
          <span>비밀번호</span>
          <input
            id="userPw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <p id="loginError" className="error-text" role="alert">
          {error}
        </p>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "확인 중" : "입장하기"}
        </button>
      </form>
    </section>
  );
}
