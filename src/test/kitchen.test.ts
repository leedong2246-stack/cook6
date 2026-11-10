import { describe, it, expect } from "vitest";
import { buildImportRows, mergeCloudIngredients, shouldOfferImport, guestFingerprint, type GuestData } from "@/lib/kitchen";

const guest: GuestData = {
  ingredients: ["계란", "두부"],
  urgent: ["두부"],
  favorites: [],
  regulars: [{ id: "1", name: "참치마요 덮밥", ingredients: ["참치", "밥"], tip: "" }],
};

describe("계정 냉장고 (로그인 사용자)", () => {
  it("임박으로 추가하면 이미 있던 재료도 임박 표시가 켜진다", () => {
    const next = mergeCloudIngredients([{ name: "계란", urgent: false }], ["계란", "파"], true);
    expect(next).toEqual([
      { name: "계란", urgent: true },
      { name: "파", urgent: true },
    ]);
  });

  it("보통으로 추가하면 기존 임박 표시는 그대로 둔다", () => {
    const next = mergeCloudIngredients([{ name: "계란", urgent: true }], ["계란"], false);
    expect(next).toEqual([{ name: "계란", urgent: true }]);
  });

  it("게스트 데이터를 가져올 때 임박 표시도 함께 옮긴다", () => {
    const rows = buildImportRows("u1", guest);
    expect(rows.ingredients).toEqual([
      { user_id: "u1", name: "계란", urgent: false },
      { user_id: "u1", name: "두부", urgent: true },
    ]);
    expect(rows.regulars.map((r) => r.name)).toEqual(["참치마요 덮밥"]);
  });

  it("'아니요'를 고른 같은 게스트 데이터는 다시 묻지 않는다", () => {
    expect(shouldOfferImport(guest, null)).toBe(true);
    expect(shouldOfferImport(guest, guestFingerprint(guest))).toBe(false);
  });

  it("게스트 데이터가 바뀌면 다시 물어본다", () => {
    const declined = guestFingerprint(guest);
    expect(shouldOfferImport({ ...guest, ingredients: [...guest.ingredients, "파"] }, declined)).toBe(true);
  });

  it("게스트 데이터가 비어 있으면 묻지 않는다", () => {
    expect(shouldOfferImport({ ingredients: [], urgent: [], favorites: [], regulars: [] }, null)).toBe(false);
  });
});
