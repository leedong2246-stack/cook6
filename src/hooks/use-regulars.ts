import { useCallback } from "react";
import { LOCAL_KEYS } from "@/lib/local-store";
import { regularsValidator, type RegularDish } from "@/lib/kitchen";
import { addCloudRegular, removeCloudRegular } from "@/lib/kitchen-cloud";
import { useLocalState } from "@/hooks/use-local-state";
import { useCloudKitchen } from "@/hooks/use-kitchen";

export type { RegularDish } from "@/lib/kitchen";

const EMPTY: RegularDish[] = [];

/** 내가 즐겨 만들어 먹는 요리(나만의 레시피). 게스트는 이 브라우저에, 로그인하면 내 계정에 저장돼요. */
export function useRegulars() {
  const [localRegulars, setLocalRegulars] = useLocalState<RegularDish[]>(LOCAL_KEYS.regulars, EMPTY, regularsValidator);
  const { uid, kitchen, run } = useCloudKitchen();
  const regulars = uid ? kitchen.regulars : localRegulars;

  const addRegular = useCallback(
    (d: Omit<RegularDish, "id">) => {
      if (!uid) {
        setLocalRegulars((c) =>
          c.some((x) => x.name === d.name) ? c : [{ ...d, id: `${Date.now()}-${c.length}` }, ...c],
        );
        return;
      }
      if (kitchen.regulars.some((x) => x.name === d.name)) return;
      const dish: RegularDish = { ...d, id: crypto.randomUUID() };
      void run((k) => ({ ...k, regulars: [dish, ...k.regulars] }), (userId) => addCloudRegular(userId, dish));
    },
    [uid, kitchen.regulars, run, setLocalRegulars],
  );
  const removeRegular = useCallback(
    (id: string) => {
      if (!uid) {
        setLocalRegulars((c) => c.filter((x) => x.id !== id));
        return;
      }
      void run((k) => ({ ...k, regulars: k.regulars.filter((x) => x.id !== id) }), (userId) => removeCloudRegular(userId, id));
    },
    [uid, run, setLocalRegulars],
  );
  const hasRegular = useCallback((name: string) => regulars.some((x) => x.name === name), [regulars]);

  return { regulars, addRegular, removeRegular, hasRegular };
}
