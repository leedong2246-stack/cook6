import { describe, it, expect } from "vitest";
import { authErrorMessage, displayName } from "@/lib/auth-messages";

describe("로그인 오류 안내", () => {
  it("잘못된 이메일/비밀번호", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("이메일 또는 비밀번호가 맞지 않아요.");
  });
  it("이미 가입된 이메일", () => {
    expect(authErrorMessage({ code: "user_already_exists" })).toBe(
      "이미 가입된 이메일이에요. 로그인 탭에서 로그인해 주세요.",
    );
  });
});

describe("헤더 이름 표시", () => {
  it("닉네임이 있으면 닉네임", () => {
    expect(displayName({ email: "a@b.com", user_metadata: { nickname: "자취9단" } })).toBe("자취9단");
  });
  it("닉네임이 없으면 이메일", () => {
    expect(displayName({ email: "a@b.com", user_metadata: {} })).toBe("a@b.com");
  });
});
