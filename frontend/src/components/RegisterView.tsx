import { FormEvent, useState } from "react";

interface RegisterViewProps {
  error: string;
  onRegister: (
    id: string,
    password: string,
    nickname: string,
    favTeamCode: string,
  ) => Promise<void>;
  onShowLogin: () => void;
}

const teamCodeOptions = [
  { code: "", name: "응원팀 없음" },
  { code: "OB", name: "두산 베어스" },
  { code: "LT", name: "롯데 자이언츠" },
  { code: "SS", name: "삼성 라이온즈" },
  { code: "SK", name: "SSG 랜더스" },
  { code: "LG", name: "LG 트윈스" },
  { code: "NC", name: "NC 다이노스" },
  { code: "WO", name: "키움 히어로즈" },
  { code: "KT", name: "KT 위즈" },
  { code: "HT", name: "KIA 타이거즈" },
  { code: "HH", name: "한화 이글스" },
];

export function RegisterView({ error, onRegister, onShowLogin }: RegisterViewProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [favTeamCode, setFavTeamCode] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanId = id.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId)) {
      setFormError("이메일 형식으로 다시 작성하세요. 예: id@naver.com");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await onRegister(cleanId, password, nickname.trim(), favTeamCode);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-view" aria-label="회원가입">
      <form id="registerForm" className="login-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">Create Account</p>
        <h1>야구공 코치 시작하기</h1>
        <label>
          <span>아이디</span>
          <input
            id="registerId"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="이메일 형식으로 입력"
            value={id}
            onChange={(event) => {
              setId(event.target.value);
              setFormError("");
            }}
            required
          />
        </label>
        <label>
          <span>비밀번호</span>
          <input
            id="registerPw"
            type="password"
            autoComplete="new-password"
            minLength={4}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label>
          <span>닉네임</span>
          <input
            id="registerNickname"
            type="text"
            autoComplete="nickname"
            maxLength={50}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            required
          />
        </label>
        <label>
          <span>fav_team_code</span>
          <select
            id="registerFavTeamCode"
            value={favTeamCode}
            onChange={(event) => setFavTeamCode(event.target.value)}
          >
            {teamCodeOptions.map((team) => (
              <option value={team.code} key={team.code || "none"}>
                {team.code ? `${team.code} · ${team.name}` : team.name}
              </option>
            ))}
          </select>
        </label>
        <p id="registerError" className="error-text" role="alert">
          {formError || error}
        </p>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "가입 중" : "회원가입"}
        </button>
        <button className="text-button" type="button" onClick={onShowLogin}>
          로그인으로 돌아가기
        </button>
      </form>
    </section>
  );
}
