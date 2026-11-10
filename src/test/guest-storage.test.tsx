import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useIngredients } from "@/hooks/use-ingredients";
import { useFavorites } from "@/hooks/use-favorites";
import { useRegulars } from "@/hooks/use-regulars";
import type { Recipe } from "@/lib/recipes.functions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

// The hooks also read the signed-in kitchen through React Query, so they need a client (the app gets one from __root).
function wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const recipe: Recipe = {
  name: "파 계란국밥",
  emoji: "🍲",
  description: "",
  difficulty: "쉬움",
  timeMinutes: 10,
  categories: ["한식"],
  usedIngredients: ["계란", "파"],
  extraIngredients: [],
  extraTip: "",
  steps: ["물을 끓여요."],
};

beforeEach(() => window.localStorage.clear());

describe("게스트 모드 저장 (새로고침 후에도 유지)", () => {
  it("재료와 임박 표시는 새로고침 후에도 그대로 남는다", async () => {
    const first = renderHook(() => useIngredients(), { wrapper });
    await waitFor(() => expect(first.result.current.items).toEqual([]));
    await act(async () => first.result.current.add(["계란", "두부"], { urgent: true }));
    first.unmount();

    const again = renderHook(() => useIngredients(), { wrapper });
    await waitFor(() => expect(again.result.current.items).toEqual(["계란", "두부"]));
    expect(again.result.current.urgent).toEqual(["계란", "두부"]);
  });

  it("즐겨찾기한 레시피는 새로고침 후에도 그대로 남는다", async () => {
    const first = renderHook(() => useFavorites(), { wrapper });
    act(() => first.result.current.toggle(recipe));
    first.unmount();

    const again = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(again.result.current.favorites.map((f) => f.name)).toEqual(["파 계란국밥"]));
  });

  it("직접 등록한 단골 요리는 새로고침 후에도 그대로 남는다", async () => {
    const first = renderHook(() => useRegulars(), { wrapper });
    act(() => first.result.current.addRegular({ name: "참치마요 덮밥", ingredients: ["참치", "밥"], tip: "" }));
    first.unmount();

    const again = renderHook(() => useRegulars(), { wrapper });
    await waitFor(() => expect(again.result.current.regulars.map((r) => r.name)).toEqual(["참치마요 덮밥"]));
  });

  it("다시 열 때 저장된 단골 요리를 빈 목록으로 덮어쓰지 않는다", async () => {
    window.localStorage.setItem(
      "fridge-chef:regulars",
      JSON.stringify([{ id: "1", name: "김치볶음밥", ingredients: ["김치"], tip: "" }]),
    );
    const { result } = renderHook(() => useRegulars(), { wrapper });
    await waitFor(() => expect(result.current.regulars).toHaveLength(1));
    expect(JSON.parse(window.localStorage.getItem("fridge-chef:regulars")!)).toHaveLength(1);
  });

  it("깨진 저장 데이터가 있어도 올바른 즐겨찾기는 살린다", async () => {
    window.localStorage.setItem("fridge-chef:favorites", JSON.stringify([recipe, { broken: true }, null]));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.favorites.map((f) => f.name)).toEqual(["파 계란국밥"]));
  });
});
