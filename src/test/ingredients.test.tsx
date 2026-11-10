import { describe, it, expect } from "vitest";
import { mergeIngredients } from "@/lib/ingredient-storage";
describe("mergeIngredients", () => {
  it("중복과 빈 값을 제외한다", () => {
    expect(mergeIngredients(["계란"], [" 계란 ", "", "두부"])).toEqual(["계란", "두부"]);
  });
});
