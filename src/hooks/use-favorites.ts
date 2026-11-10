import { useCallback } from "react";
import type { Recipe } from "@/lib/recipes.functions";
import { LOCAL_KEYS } from "@/lib/local-store";
import { favoritesValidator } from "@/lib/kitchen";
import { addCloudFavorite, removeCloudFavorite } from "@/lib/kitchen-cloud";
import { useLocalState } from "@/hooks/use-local-state";
import { useCloudKitchen } from "@/hooks/use-kitchen";

const EMPTY: Recipe[] = [];

/** 하트를 누른 레시피 보관함. 게스트는 이 브라우저에, 로그인하면 내 계정에 저장돼요. */
export function useFavorites() {
  const [localFavorites, setLocalFavorites] = useLocalState<Recipe[]>(LOCAL_KEYS.favorites, EMPTY, favoritesValidator);
  const { uid, kitchen, run } = useCloudKitchen();
  const favorites = uid ? kitchen.favorites : localFavorites;

  const isSaved = useCallback((r: Recipe) => favorites.some((f) => f.name === r.name), [favorites]);
  const toggle = useCallback(
    (r: Recipe) => {
      if (!uid) {
        setLocalFavorites((c) => (c.some((f) => f.name === r.name) ? c.filter((f) => f.name !== r.name) : [r, ...c]));
        return;
      }
      const saved = kitchen.favorites.some((f) => f.name === r.name);
      void run(
        (k) => ({ ...k, favorites: saved ? k.favorites.filter((f) => f.name !== r.name) : [r, ...k.favorites] }),
        (userId) => (saved ? removeCloudFavorite(userId, r.name) : addCloudFavorite(userId, r)),
      );
    },
    [uid, kitchen.favorites, run, setLocalFavorites],
  );

  return { favorites, isSaved, toggle };
}
