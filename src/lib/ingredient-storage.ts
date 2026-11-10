import { LOCAL_KEYS, readLocal, stringArray, subscribeLocal, writeLocal } from "@/lib/local-store";

/**
 * 재료 저장소 어댑터. 지금은 localStorage를 쓰지만,
 * 같은 인터페이스로 Lovable Cloud(DB) 어댑터를 만들어 교체할 수 있습니다.
 */
export interface IngredientStorage {
  load(): Promise<string[]>;
  save(items: string[]): Promise<void>;
  /** 다른 곳(다른 탭 등)에서 바뀌었을 때 알림. 해제 함수를 돌려줘요. */
  subscribe?(onChange: () => void): () => void;
}

export function createLocalIngredientStorage(key: string): IngredientStorage {
  return {
    async load() {
      return readLocal(key, stringArray, []);
    },
    async save(items) {
      writeLocal(key, items);
    },
    subscribe(onChange) {
      return subscribeLocal(key, onChange);
    },
  };
}

/** 보유 재료 목록 */
export const localIngredientStorage = createLocalIngredientStorage(LOCAL_KEYS.ingredients);
/** 유통기한 임박(D-1 ~ D-3) 표시된 재료 이름 목록 */
export const localUrgentStorage = createLocalIngredientStorage(LOCAL_KEYS.urgent);

/** 공백 제거, 빈 값·중복 제외 후 기존 목록에 추가 */
export function mergeIngredients(current: string[], names: string[]): string[] {
  const next = [...current];
  for (const n of names.map((s) => s.trim()).filter(Boolean)) {
    if (!next.includes(n)) next.push(n);
  }
  return next;
}
