/**
 * 내 냉장고 데이터(재료·저장한 레시피·나만의 레시피)의 공통 모양과,
 * 게스트 데이터를 계정으로 가져올 때 쓰는 순수 함수들.
 * 브라우저 저장소나 서버 없이도 테스트할 수 있게 계산만 여기 둬요.
 */
import type { Recipe } from "@/lib/recipes.functions";
import {
  LOCAL_KEYS,
  arrayOf,
  isStoredRecipe,
  isStoredRegular,
  readLocal,
  replaceLocal,
  stringArray,
} from "@/lib/local-store";
import { mergeIngredients } from "@/lib/ingredient-storage";

export type RegularDish = { id: string; name: string; ingredients: string[]; tip: string };
export type CloudIngredient = { name: string; urgent: boolean };
export type Kitchen = { ingredients: CloudIngredient[]; favorites: Recipe[]; regulars: RegularDish[] };
export const EMPTY_KITCHEN: Kitchen = { ingredients: [], favorites: [], regulars: [] };

export const favoritesValidator = arrayOf((v): v is Recipe => isStoredRecipe(v));
export const regularsValidator = arrayOf(isStoredRegular);

/** 계정 재료 목록에 새 재료를 더해요. 임박으로 추가하면 이미 있던 재료도 임박 표시가 켜져요. */
export function mergeCloudIngredients(
  current: CloudIngredient[],
  names: string[],
  urgent: boolean,
): CloudIngredient[] {
  const next = current.map((i) => ({ ...i }));
  for (const name of mergeIngredients([], names)) {
    const found = next.find((i) => i.name === name);
    if (found) {
      if (urgent) found.urgent = true;
    } else {
      next.push({ name, urgent });
    }
  }
  return next;
}

// ---------- 게스트 데이터 → 계정 가져오기 ----------

export type GuestData = { ingredients: string[]; urgent: string[]; favorites: Recipe[]; regulars: RegularDish[] };

export function readGuestData(): GuestData {
  return {
    ingredients: readLocal(LOCAL_KEYS.ingredients, stringArray, []),
    urgent: readLocal(LOCAL_KEYS.urgent, stringArray, []),
    favorites: readLocal(LOCAL_KEYS.favorites, favoritesValidator, []),
    regulars: readLocal(LOCAL_KEYS.regulars, regularsValidator, []),
  };
}

/** 가져온 뒤 게스트 데이터를 비워요. 열려 있는 화면도 바로 따라 비워져요. */
export function clearGuestData() {
  for (const key of Object.values(LOCAL_KEYS)) replaceLocal(key, []);
}

export function guestCounts(g: GuestData) {
  return { ingredients: g.ingredients.length, favorites: g.favorites.length, regulars: g.regulars.length };
}

export function hasGuestData(g: GuestData): boolean {
  const c = guestCounts(g);
  return c.ingredients + c.favorites + c.regulars > 0;
}

/** 게스트 데이터 내용을 한 줄로 요약해요. '아니요'를 고른 내용과 같으면 다시 묻지 않아요. */
export function guestFingerprint(g: GuestData): string {
  return JSON.stringify([
    g.ingredients,
    g.urgent,
    g.favorites.map((f) => f.name),
    g.regulars.map((r) => r.name),
  ]);
}

export function shouldOfferImport(g: GuestData, declinedFingerprint: string | null): boolean {
  return hasGuestData(g) && guestFingerprint(g) !== declinedFingerprint;
}

export const declinedImportKey = (userId: string) => `fridge-chef:import-declined:${userId}`;

/** 계정에 넣을 행들. 목록은 '먼저 넣은 것부터' 순서라서, 최신순 목록은 뒤집어서 넣어요. */
export function buildImportRows(userId: string, g: GuestData) {
  const uniqueByName = <T extends { name: string }>(list: T[]) => {
    const seen = new Set<string>();
    return list.filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true)));
  };
  return {
    ingredients: mergeIngredients([], g.ingredients).map((name) => ({
      user_id: userId,
      name,
      urgent: g.urgent.includes(name),
    })),
    favorites: uniqueByName(g.favorites)
      .reverse()
      .map((recipe) => ({ user_id: userId, name: recipe.name, recipe })),
    regulars: uniqueByName(g.regulars)
      .reverse()
      .map((d) => ({ user_id: userId, name: d.name, ingredients: d.ingredients, tip: d.tip })),
  };
}
