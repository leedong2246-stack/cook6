import { describe, it, expect } from "vitest";
import { parseStepTimer, formatTimer } from "@/lib/cooking";
import { buildUserMessage, prioritizeUrgent, urgentPriorityLine } from "@/lib/recipe-prompt";

describe("유통기한 임박 재료 우선 추천", () => {
  it("임박 재료가 있으면 '먼저 소비할 수 있는 레시피' 문구를 조사와 함께 만든다", () => {
    expect(urgentPriorityLine(["두부"])).toBe("🚨 유통기한이 얼마 남지 않은 두부를 먼저 소비할 수 있는 레시피");
    expect(urgentPriorityLine(["김치", "계란"])).toBe(
      "🚨 유통기한이 얼마 남지 않은 김치, 계란을 먼저 소비할 수 있는 레시피",
    );
  });

  it("임박 재료가 없으면 우선 요청을 넣지 않는다", () => {
    expect(urgentPriorityLine([])).toBeNull();
    expect(buildUserMessage({ ingredients: ["두부"], categories: ["전체"], urgent: [] })).not.toContain("🚨");
  });

  it("임박 재료가 있으면 AI 요청에 최우선 요청이 들어간다", () => {
    const msg = buildUserMessage({ ingredients: ["두부", "파"], categories: ["전체"], urgent: ["두부"] });
    expect(msg).toContain("유통기한 임박 재료 (D-1 ~ D-3): 두부");
    expect(msg).toContain("최우선 요청: 🚨 유통기한이 얼마 남지 않은 두부를 먼저 소비할 수 있는 레시피");
  });

  it("임박 재료를 쓰는 레시피가 맨 앞에 온다", () => {
    const list = [
      { name: "A", usedIngredients: ["파"] },
      { name: "B", usedIngredients: ["두부", "파"] },
      { name: "C", usedIngredients: ["계란"] },
    ];
    expect(prioritizeUrgent(list, ["두부"]).map((r) => r.name)).toEqual(["B", "A", "C"]);
  });
});

describe("조리 모드 타이머", () => {
  it("단계 문장에서 시간을 찾는다", () => {
    expect(parseStepTimer("면을 소금물에 7분 삶아요.")).toBe(420);
    expect(parseStepTimer("5~7분 정도 끓여요.")).toBe(420);
    expect(parseStepTimer("약불에서 1시간 30분 졸여요.")).toBe(5400);
    expect(parseStepTimer("30초간 빠르게 볶아요.")).toBe(30);
  });

  it("시간이 없는 단계에는 타이머가 없다", () => {
    expect(parseStepTimer("잘 비벼서 먹어요.")).toBeNull();
    expect(parseStepTimer("2인분 기준이에요.")).toBeNull();
  });

  it("남은 시간을 분:초로 보여준다", () => {
    expect(formatTimer(425)).toBe("7:05");
    expect(formatTimer(3723)).toBe("1:02:03");
  });
});
