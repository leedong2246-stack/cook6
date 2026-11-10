import { useCallback, useEffect, useMemo, useState } from "react";
import {
  localIngredientStorage,
  localUrgentStorage,
  mergeIngredients,
  type IngredientStorage,
} from "@/lib/ingredient-storage";
import { mergeCloudIngredients } from "@/lib/kitchen";
import {
  addCloudIngredients,
  clearCloudIngredients,
  removeCloudIngredient,
  setCloudIngredientUrgent,
} from "@/lib/kitchen-cloud";
import { useCloudKitchen } from "@/hooks/use-kitchen";

type IngredientsApi = {
  items: string[];
  urgent: string[];
  add: (names: string[], opts?: { urgent?: boolean }) => void;
  remove: (name: string) => void;
  toggleUrgent: (name: string) => void;
  clear: () => void;
};

/** 재료 목록 + 유통기한 임박 표시. 게스트는 이 브라우저에, 로그인하면 내 계정에 저장돼요. */
export function useIngredients(
  storage: IngredientStorage = localIngredientStorage,
  urgentStorage: IngredientStorage = localUrgentStorage,
): IngredientsApi {
  const local = useLocalIngredients(storage, urgentStorage);
  const cloud = useCloudIngredients();
  return cloud ?? local;
}

function useCloudIngredients(): IngredientsApi | null {
  const { uid, kitchen, run } = useCloudKitchen();
  const list = kitchen.ingredients;

  const add = useCallback(
    (names: string[], opts?: { urgent?: boolean }) => {
      const clean = mergeIngredients([], names);
      if (!clean.length) return;
      const urgent = !!opts?.urgent;
      void run(
        (k) => ({ ...k, ingredients: mergeCloudIngredients(k.ingredients, clean, urgent) }),
        (userId) => addCloudIngredients(userId, clean, urgent),
      );
    },
    [run],
  );
  const remove = useCallback(
    (name: string) =>
      void run(
        (k) => ({ ...k, ingredients: k.ingredients.filter((i) => i.name !== name) }),
        (userId) => removeCloudIngredient(userId, name),
      ),
    [run],
  );
  const toggleUrgent = useCallback(
    (name: string) => {
      const next = !list.find((i) => i.name === name)?.urgent;
      void run(
        (k) => ({ ...k, ingredients: k.ingredients.map((i) => (i.name === name ? { ...i, urgent: next } : i)) }),
        (userId) => setCloudIngredientUrgent(userId, name, next),
      );
    },
    [list, run],
  );
  const clear = useCallback(
    () => void run((k) => ({ ...k, ingredients: [] }), (userId) => clearCloudIngredients(userId)),
    [run],
  );

  const items = useMemo(() => list.map((i) => i.name), [list]);
  const urgent = useMemo(() => list.filter((i) => i.urgent).map((i) => i.name), [list]);
  return uid ? { items, urgent, add, remove, toggleUrgent, clear } : null;
}

function useLocalIngredients(storage: IngredientStorage, urgentStorage: IngredientStorage): IngredientsApi {
  const [items, setItems] = useState<string[]>([]);
  const [urgent, setUrgent] = useState<string[]>([]);
  // Saving starts only after the stored list is loaded, so a refresh never overwrites it with [].
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([storage.load(), urgentStorage.load()]).then(([saved, savedUrgent]) => {
      if (!alive) return;
      setItems((cur) => mergeIngredients(saved, cur));
      setUrgent((cur) => mergeIngredients(savedUrgent, cur));
      setLoaded(true);
    });
    // Another tab (or a guest-data import) changed the list: take its version as-is.
    const offItems = storage.subscribe?.(() => {
      void storage.load().then((v) => alive && setItems(v));
    });
    const offUrgent = urgentStorage.subscribe?.(() => {
      void urgentStorage.load().then((v) => alive && setUrgent(v));
    });
    return () => {
      alive = false;
      offItems?.();
      offUrgent?.();
    };
  }, [storage, urgentStorage]);

  useEffect(() => {
    if (loaded) void storage.save(items);
  }, [items, storage, loaded]);

  useEffect(() => {
    if (loaded) void urgentStorage.save(urgent);
  }, [urgent, urgentStorage, loaded]);

  const add = useCallback((names: string[], opts?: { urgent?: boolean }) => {
    setItems((c) => mergeIngredients(c, names));
    if (opts?.urgent) setUrgent((c) => mergeIngredients(c, names));
  }, []);
  const remove = useCallback((name: string) => {
    setItems((c) => c.filter((x) => x !== name));
    setUrgent((c) => c.filter((x) => x !== name));
  }, []);
  const toggleUrgent = useCallback(
    (name: string) => setUrgent((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name])),
    [],
  );
  const clear = useCallback(() => {
    setItems([]);
    setUrgent([]);
  }, []);

  /** 실제 보유 중인 재료 중 임박 표시된 것만 */
  const urgentItems = items.filter((x) => urgent.includes(x));

  return { items, urgent: urgentItems, add, remove, toggleUrgent, clear };
}
