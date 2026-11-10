import { useCallback, useMemo } from "react";
import { useLocalState } from "@/hooks/use-local-state";
import { stringArray } from "@/lib/local-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CommunityRecipe } from "@/lib/community";
import type { Tables } from "@/integrations/supabase/types";

/** 이 브라우저에서 누른 좋아요 목록과 마지막 닉네임만 기기에 저장 (레시피 자체는 서버에 저장) */
const KEY = "fridge-chef:community-local";
const QUERY_KEY = ["community-recipes"] as const;

type CommunityLocal = { liked: string[]; nickname: string; avatar: string };
const EMPTY_LOCAL: CommunityLocal = { liked: [], nickname: "", avatar: "👤" };
const validateLocal = (v: unknown): CommunityLocal | null => {
  if (typeof v !== "object" || v === null) return null;
  const s = v as Record<string, unknown>;
  return {
    liked: stringArray(s["liked"]) ?? [],
    nickname: typeof s["nickname"] === "string" ? s["nickname"] : "",
    avatar: typeof s["avatar"] === "string" ? s["avatar"] : "👤",
  };
};

export type ShareInput = Omit<CommunityRecipe, "id" | "likes" | "views" | "createdAt">;

const fromRow = (r: Tables<"community_recipes">): CommunityRecipe => ({
  id: r.id,
  author: r.author,
  avatar: r.avatar,
  emoji: r.emoji,
  name: r.name,
  ingredients: r.ingredients,
  steps: r.steps,
  tip: r.tip,
  likes: r.likes,
  views: r.views,
  createdAt: r.created_at,
});

async function fetchCommunity(): Promise<CommunityRecipe[]> {
  const { data, error } = await supabase
    .from("community_recipes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data.map(fromRow);
}

/** 모두의 꿀조합 레시피: 서버에 저장되어 모든 기기에서 같은 목록을 봐요 */
export function useCommunity() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchCommunity, staleTime: 30_000 });
  const [local, setLocal] = useLocalState<CommunityLocal>(KEY, EMPTY_LOCAL, validateLocal);
  const liked = local.liked;
  const profile = useMemo(() => ({ nickname: local.nickname, avatar: local.avatar }), [local.nickname, local.avatar]);
  const setLiked = useCallback(
    (fn: (c: string[]) => string[]) => setLocal((s) => ({ ...s, liked: fn(s["liked"]) })),
    [setLocal],
  );
  const setProfile = useCallback(
    (p: { nickname: string; avatar: string }) => setLocal((s) => ({ ...s, ...p })),
    [setLocal],
  );

  const patch = useCallback(
    (id: string, fn: (r: CommunityRecipe) => CommunityRecipe) =>
      qc.setQueryData<CommunityRecipe[]>(QUERY_KEY, (c) => c?.map((r) => (r.id === id ? fn(r) : r))),
    [qc],
  );

  const share = useCallback(
    async (input: ShareInput) => {
      const { data, error } = await supabase
        .from("community_recipes")
        .insert({
          author: input.author,
          avatar: input.avatar,
          emoji: input.emoji,
          name: input.name.slice(0, 60),
          ingredients: input.ingredients.slice(0, 30),
          steps: input.steps.slice(0, 15),
          tip: input.tip,
        })
        .select()
        .single();
      if (error) throw error;
      const recipe = fromRow(data);
      qc.setQueryData<CommunityRecipe[]>(QUERY_KEY, (c) => [recipe, ...(c ?? [])]);
      setProfile({ nickname: input.author, avatar: input.avatar });
      return recipe;
    },
    [qc],
  );

  const like = useCallback(
    async (id: string) => {
      const wasLiked = liked.includes(id);
      const delta = wasLiked ? -1 : 1;
      setLiked((c) => (wasLiked ? c.filter((x) => x !== id) : [...c, id]));
      patch(id, (r) => ({ ...r, likes: Math.max(0, r.likes + delta) }));
      const { data, error } = await supabase.rpc("like_community_recipe", { _id: id, _delta: delta });
      if (error) {
        setLiked((c) => (wasLiked ? [...c, id] : c.filter((x) => x !== id)));
        patch(id, (r) => ({ ...r, likes: Math.max(0, r.likes - delta) }));
        throw error;
      }
      if (typeof data === "number") patch(id, (r) => ({ ...r, likes: data }));
    },
    [liked, patch],
  );

  const view = useCallback(
    async (id: string) => {
      patch(id, (r) => ({ ...r, views: r.views + 1 }));
      const { data } = await supabase.rpc("view_community_recipe", { _id: id });
      if (typeof data === "number") patch(id, (r) => ({ ...r, views: data }));
    },
    [patch],
  );

  const isLiked = useCallback((id: string) => liked.includes(id), [liked]);

  return {
    recipes: query.data ?? [],
    loading: query.isLoading,
    error: query.isError,
    refetch: query.refetch,
    share,
    like,
    view,
    isLiked,
    profile,
  };
}
