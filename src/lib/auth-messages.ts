/** 로그인/회원가입 오류를 사용자에게 보여줄 한국어 문장으로 바꿔요. */
export function authErrorMessage(err: { code?: string; message?: string } | null | undefined): string {
  const code = err?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "이메일 또는 비밀번호가 맞지 않아요.";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered"))
    return "이미 가입된 이메일이에요. 로그인 탭에서 로그인해 주세요.";
  if (code === "weak_password" || msg.includes("password"))
    return "비밀번호가 너무 쉽거나 유출된 적이 있어요. 6자 이상의 다른 비밀번호를 써 주세요.";
  if (code === "email_address_invalid" || msg.includes("invalid email")) return "이메일 주소를 다시 확인해 주세요.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || msg.includes("rate limit"))
    return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if (code === "email_not_confirmed") return "이메일 인증이 아직 안 됐어요. 메일함을 확인해 주세요.";
  return "잠시 문제가 생겼어요. 다시 시도해 주세요.";
}

/** 헤더에 보여줄 이름: 닉네임이 있으면 닉네임, 없으면 이메일 */
export function displayName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null): string {
  const nick = user?.user_metadata?.["nickname"];
  if (typeof nick === "string" && nick.trim()) return nick.trim();
  return user?.email ?? "";
}
