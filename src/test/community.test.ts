import { describe, it, expect } from "vitest";
import { sortCommunity, type CommunityRecipe } from "@/lib/community";

const r = (id: string, likes: number, views: number, createdAt: string): CommunityRecipe => ({
  id, likes, views, createdAt, author: "a", avatar: "👤", emoji: "🍳", name: id, ingredients: [], steps: [], tip: "",
});
const list = [
  r("a", 10, 500, "2026-11-04T00:00:00Z"),
  r("b", 50, 100, "2026-11-03T00:00:00Z"),
  r("c", 30, 900, "2026-11-02T00:00:00Z"),
];

describe("모두의 꿀조합 정렬", () => {
  it("인기순은 조회수가 많은 순", () => {
    expect(sortCommunity(list, "popular").map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
  it("최신순은 가장 최근에 올린 순", () => {
    expect(sortCommunity(list, "latest").map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("추천 많은 순은 좋아요가 많은 순", () => {
    expect(sortCommunity(list, "likes").map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
});
