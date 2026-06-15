import { FormEvent, useEffect, useMemo, useState } from "react";

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

interface AgreementItem {
  key: string;
  label: string;
  required: boolean;
  more: boolean;
  detail: string;
}

const AGREEMENTS: AgreementItem[] = [
  {
    key: "age",
    label: "만 14세 이상입니다.",
    required: true,
    more: false,
    detail: "만 14세 미만 아동은 보호자 동의 없이 가입할 수 없어요.",
  },
  {
    key: "tos",
    label: "서비스 이용약관 동의",
    required: true,
    more: true,
    detail: "공복이 서비스 이용에 관한 기본 약관입니다. 계정 이용, 콘텐츠 제공, 책임 범위 등을 포함합니다.",
  },
  {
    key: "privacy",
    label: "개인정보 수집·이용 동의",
    required: true,
    more: true,
    detail: "이메일, 비밀번호 등 회원 식별 정보를 서비스 제공 목적으로 수집·이용합니다.",
  },
  {
    key: "records",
    label: "직관기록·응원 데이터 수집·이용 동의",
    required: true,
    more: true,
    detail: "직관기록, 응원팀, 출석·다마고치 활동 데이터를 코칭·기록 제공을 위해 수집·이용합니다.",
  },
  {
    key: "marketing",
    label: "마케팅 정보 수신 동의",
    required: false,
    more: false,
    detail: "이벤트·혜택 등 마케팅 정보를 알림/이메일로 받아볼 수 있어요.",
  },
  {
    key: "personalize",
    label: "맞춤형 야구 콘텐츠 제공 동의",
    required: false,
    more: false,
    detail: "응원팀·관심사를 분석해 맞춤형 콘텐츠와 추천을 제공합니다.",
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <line x1="3" y1="3" x2="21" y2="21" /> : null}
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="4 12 10 18 20 6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function RegisterView({ error, onRegister, onShowLogin }: RegisterViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState("");
  // 필드별 에러: 해당 입력칸에 빨간 테두리 + 칸 아래 빨간 안내문
  type FieldKey = "email" | "password" | "passwordConfirm" | "nickname";
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  function clearFieldError(key: FieldKey) {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  // 서버 에러(예: "이미 가입된 이메일")를 키워드로 해당 필드에 배정
  useEffect(() => {
    if (!error) return;
    if (error.includes("이메일")) setFieldErrors((prev) => ({ ...prev, email: error }));
    else if (error.includes("닉네임")) setFieldErrors((prev) => ({ ...prev, nickname: error }));
    else if (error.includes("비밀번호")) setFieldErrors((prev) => ({ ...prev, password: error }));
    else setFormError(error);
  }, [error]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allChecked = useMemo(
    () => AGREEMENTS.every((item) => agreed[item.key]),
    [agreed],
  );

  function toggleAll() {
    const next = !allChecked;
    const map: Record<string, boolean> = {};
    AGREEMENTS.forEach((item) => {
      map[item.key] = next;
    });
    setAgreed(map);
  }

  function toggleOne(key: string) {
    setAgreed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim();
    const cleanNickname = nickname.trim();

    // 필드별 검증 — 문제가 있는 칸마다 빨간 테두리 + 안내문
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!EMAIL_RE.test(cleanEmail)) {
      errors.email = "이메일 형식으로 작성해주세요.\n예: id@mail.com";
    }
    if (!password) {
      errors.password = "비밀번호를 입력해 주세요.";
    } else if (password.length < 4) {
      errors.password = "비밀번호는 최소 4자 이상 입력해주세요.";
    }
    if (!passwordConfirm) {
      errors.passwordConfirm = "비밀번호를 한 번 더 입력해 주세요.";
    } else if (password !== passwordConfirm) {
      errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }
    if (!cleanNickname) {
      errors.nickname = "닉네임을 입력해 주세요.";
    }
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const requiredOk = AGREEMENTS.filter((item) => item.required).every(
      (item) => agreed[item.key],
    );
    if (!requiredOk) {
      setFormError("필수 항목에 모두 동의해야 가입할 수 있어요.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await onRegister(cleanEmail, password, cleanNickname, "");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-view auth-register-screen" aria-label="회원가입">
      <div className="auth-register-card">
        <button
          type="button"
          className="auth-reg-back"
          aria-label="뒤로가기"
          onClick={onShowLogin}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h2 className="auth-reg-title">가입하기</h2>

        <form id="registerForm" onSubmit={handleSubmit} noValidate>
          <div className="auth-reg-field">
            <label htmlFor="registerId">이메일</label>
            <input
              id="registerId"
              type="text"
              inputMode="email"
              autoComplete="username"
              className={fieldErrors.email ? "is-invalid" : ""}
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFormError("");
                clearFieldError("email");
              }}
              onBlur={() => {
                // 칸을 벗어나는 즉시 형식 검사 (입력 중에는 방해 안 함)
                const value = email.trim();
                if (value && !EMAIL_RE.test(value)) {
                  setFieldErrors((prev) => ({ ...prev, email: "이메일 형식으로 작성해주세요.\n예: id@mail.com" }));
                }
              }}
              required
            />
            {fieldErrors.email ? <p className="auth-field-error" role="alert">{fieldErrors.email}</p> : null}
          </div>

          <div className="auth-reg-field">
            <label htmlFor="registerPw">비밀번호</label>
            <div className="auth-reg-input-wrap">
              <input
                id="registerPw"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={4}
                className={fieldErrors.password ? "is-invalid" : ""}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearFieldError("password");
                  clearFieldError("passwordConfirm"); // 비밀번호가 바뀌면 불일치 표시도 갱신 대상
                }}
                onBlur={() => {
                  // 칸을 벗어나는 즉시 길이 검사 (입력했는데 4자 미만일 때만)
                  if (password && password.length < 4) {
                    setFieldErrors((prev) => ({ ...prev, password: "비밀번호는 최소 4자 이상 입력해주세요." }));
                  }
                }}
                required
              />
              <button
                type="button"
                className="auth-eye"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
            {fieldErrors.password ? <p className="auth-field-error" role="alert">{fieldErrors.password}</p> : null}
          </div>

          <div className="auth-reg-field">
            <label htmlFor="registerPwConfirm">비밀번호 확인</label>
            <div className="auth-reg-input-wrap">
              <input
                id="registerPwConfirm"
                type={showPasswordConfirm ? "text" : "password"}
                autoComplete="new-password"
                className={fieldErrors.passwordConfirm ? "is-invalid" : ""}
                placeholder="비밀번호를 한 번 더 입력하세요"
                value={passwordConfirm}
                onChange={(event) => {
                  setPasswordConfirm(event.target.value);
                  clearFieldError("passwordConfirm");
                }}
                onBlur={() => {
                  // 확인 칸을 벗어나는 즉시 일치 여부 검사 (둘 다 입력된 경우에만)
                  if (passwordConfirm && password && password !== passwordConfirm) {
                    setFieldErrors((prev) => ({ ...prev, passwordConfirm: "비밀번호가 일치하지 않습니다." }));
                  }
                }}
                required
              />
              <button
                type="button"
                className="auth-eye"
                aria-label={showPasswordConfirm ? "비밀번호 숨기기" : "비밀번호 표시"}
                onClick={() => setShowPasswordConfirm((prev) => !prev)}
              >
                <EyeIcon off={showPasswordConfirm} />
              </button>
            </div>
            {fieldErrors.passwordConfirm ? <p className="auth-field-error" role="alert">{fieldErrors.passwordConfirm}</p> : null}
          </div>

          <div className="auth-reg-field">
            <label htmlFor="registerNickname">닉네임</label>
            <input
              id="registerNickname"
              type="text"
              autoComplete="nickname"
              maxLength={12}
              className={fieldErrors.nickname ? "is-invalid" : ""}
              placeholder="사용할 닉네임을 입력하세요"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setFormError("");
                clearFieldError("nickname");
              }}
              required
            />
            {fieldErrors.nickname ? <p className="auth-field-error" role="alert">{fieldErrors.nickname}</p> : null}
          </div>

          <div className="auth-agree">
            <button type="button" className="auth-agree-all" onClick={toggleAll}>
              <span className={`auth-check auth-check--lg${allChecked ? " is-on" : ""}`}>
                <CheckIcon />
              </span>
              전체 동의
            </button>

            <ul className="auth-agree-list">
              {AGREEMENTS.map((item) => (
                <li className="auth-agree-item" key={item.key}>
                  <button
                    type="button"
                    className="auth-agree-row"
                    onClick={() => toggleOne(item.key)}
                  >
                    <span className={`auth-check${agreed[item.key] ? " is-on" : ""}`}>
                      <CheckIcon />
                    </span>
                    <span className="auth-agree-label">
                      <span className={`auth-agree-badge ${item.required ? "req" : "opt"}`}>
                        {item.required ? "[필수]" : "[선택]"}
                      </span>{" "}
                      {item.label}
                    </span>
                    <span
                      className={`auth-agree-chevron${expanded[item.key] ? " is-open" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleExpanded(item.key);
                      }}
                    >
                      <ChevronIcon />
                    </span>
                    {item.more ? (
                      <span
                        className="auth-agree-more"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpanded(item.key);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleExpanded(item.key);
                          }
                        }}
                      >
                        자세히
                      </span>
                    ) : null}
                  </button>
                  {expanded[item.key] ? (
                    <p className="auth-agree-detail">{item.detail}</p>
                  ) : null}
                </li>
              ))}
            </ul>

            <p className="auth-agree-note">
              필수 항목에 동의해야 가입할 수 있어요. 선택 항목은 동의하지 않아도 기본 서비스를 이용할 수 있습니다.
            </p>
          </div>

          <p id="registerError" className="error-text" role="alert">
            {formError}
          </p>

          <button type="submit" className="auth-reg-submit" disabled={isSubmitting}>
            {isSubmitting ? "가입 중" : "가입하기"}
          </button>
        </form>
      </div>
    </section>
  );
}
