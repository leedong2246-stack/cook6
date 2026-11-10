/**
 * 게스트 모드 데이터를 브라우저 localStorage에 안전하게 읽고 쓰는 작은 도구.
 * - 서버 렌더링 중에는 아무것도 하지 않아요.
 * - 깨진 데이터는 버리고 올바른 항목만 살려요.
 * - 저장 공간이 꽉 찼거나 막혀 있어도 앱이 멈추지 않아요.
 */

export type Validator<T> = (value: unknown) => T | null;

export function readLocal<T>(key: string, validate: Validator<T>, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return validate(JSON.parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`[local-store] "${key}" 저장 실패`, e);
    return false;
  }
}

/** 게스트 모드 데이터가 저장되는 키 */
export const LOCAL_KEYS = {
  ingredients: "fridge-chef:ingredients",
  urgent: "fridge-chef:urgent",
  favorites: "fridge-chef:favorites",
  regulars: "fridge-chef:regulars",
} as const;

const SAME_TAB_EVENT = "fridge-chef:local-change";

/**
 * 값을 바꾸고, 같은 탭에서 이 키를 쓰는 화면에도 다시 읽으라고 알려요.
 * (화면이 스스로 저장할 때는 writeLocal을 써요. 여기서 알리면 무한 반복돼요.)
 */
export function replaceLocal(key: string, value: unknown): boolean {
  const ok = writeLocal(key, value);
  if (ok) window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, { detail: key }));
  return ok;
}

/** 다른 탭(또는 replaceLocal)에서 같은 키가 바뀌면 알려줘요. 해제 함수를 돌려줘요. */
export function subscribeLocal(key: string, onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.storageArea === window.localStorage && (e.key === key || e.key === null)) onChange();
  };
  const sameTab = (e: Event) => {
    if ((e as CustomEvent<string>).detail === key) onChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(SAME_TAB_EVENT, sameTab);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(SAME_TAB_EVENT, sameTab);
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** 배열에서 조건을 만족하는 항목만 남겨요. 배열이 아니면 null */
export function arrayOf<T>(isItem: (v: unknown) => v is T): Validator<T[]> {
  return (v) => (Array.isArray(v) ? v.filter(isItem) : null);
}

export const stringArray: Validator<string[]> = arrayOf((x): x is string => typeof x === "string");

export const isStoredRecipe = (v: unknown): v is { name: string } =>
  isObj(v) &&
  typeof v["name"] === "string" &&
  isStrArr(v["steps"]) &&
  isStrArr(v["usedIngredients"]) &&
  isStrArr(v["extraIngredients"]);

export const isStoredRegular = (v: unknown): v is { id: string; name: string; ingredients: string[]; tip: string } =>
  isObj(v) && typeof v["id"] === "string" && typeof v["name"] === "string" && isStrArr(v["ingredients"]) && typeof v["tip"] === "string";
