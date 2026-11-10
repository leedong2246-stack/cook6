/**
 * 로그인한 사람의 재료·저장한 레시피·나만의 레시피를 Lovable Cloud에 읽고 써요.
 * 접근 규칙상 본인 데이터만 보이고 바꿀 수 있어요.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Recipe } from "@/lib/recipes.functions";
import { isStoredRecipe } from "@/lib/local-store";
import { buildImportRows, type GuestData, type Kitchen, type RegularDish } from "@/lib/kitchen";

function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error;
  return res;
}

export async function fetchKitchen(userId: string): Promise<Kitchen> {
  const [ing, fav, reg] = await Promise.all([
    supabase.from("user_ingredients").select("name, urgent").eq("user_id", userId).order("seq"),
    supabase.from("user_favorites").select("recipe").eq("user_id", userId).order("seq", { ascending: false }),
    supabase
      .from("user_regulars")
      .select("id, name, ingredients, tip")
      .eq("user_id", userId)
      .order("seq", { ascending: false }),
  ]);
  check(ing);
  check(fav);
  check(reg);
  return {
    ingredients: ing.data ?? [],
    favorites: (fav.data ?? []).map((r) => r.recipe).filter((r): r is Recipe => isStoredRecipe(r)),
    regulars: reg.data ?? [],
  };
}

export async function addCloudIngredients(userId: string, names: string[], urgent: boolean) {
  const rows = names.map((name) => (urgent ? { user_id: userId, name, urgent: true } : { user_id: userId, name }));
  // Adding as urgent turns the flag on for existing items too; a normal add keeps existing flags.
  check(
    await supabase
      .from("user_ingredients")
      .upsert(rows, { onConflict: "user_id,name", ignoreDuplicates: !urgent }),
  );
}

export async function removeCloudIngredient(userId: string, name: string) {
  check(await supabase.from("user_ingredients").delete().eq("user_id", userId).eq("name", name));
}

export async function setCloudIngredientUrgent(userId: string, name: string, urgent: boolean) {
  check(await supabase.from("user_ingredients").update({ urgent }).eq("user_id", userId).eq("name", name));
}

export async function clearCloudIngredients(userId: string) {
  check(await supabase.from("user_ingredients").delete().eq("user_id", userId));
}

export async function addCloudFavorite(userId: string, recipe: Recipe) {
  check(
    await supabase
      .from("user_favorites")
      .upsert({ user_id: userId, name: recipe.name, recipe: recipe as unknown as Json }, { onConflict: "user_id,name" }),
  );
}

export async function removeCloudFavorite(userId: string, name: string) {
  check(await supabase.from("user_favorites").delete().eq("user_id", userId).eq("name", name));
}

export async function addCloudRegular(userId: string, dish: RegularDish) {
  check(
    await supabase
      .from("user_regulars")
      .upsert({ ...dish, user_id: userId }, { onConflict: "user_id,name", ignoreDuplicates: true }),
  );
}

export async function removeCloudRegular(userId: string, id: string) {
  check(await supabase.from("user_regulars").delete().eq("user_id", userId).eq("id", id));
}

/** 게스트 데이터를 계정에 합쳐요. 계정에 이미 같은 이름이 있으면 계정 쪽을 그대로 둬요. */
export async function importGuestData(userId: string, guest: GuestData) {
  const rows = buildImportRows(userId, guest);
  if (rows.ingredients.length) {
    check(
      await supabase
        .from("user_ingredients")
        .upsert(rows.ingredients.map(({ user_id, name }) => ({ user_id, name })), {
          onConflict: "user_id,name",
          ignoreDuplicates: true,
        }),
    );
    const urgentNames = rows.ingredients.filter((r) => r.urgent).map((r) => r.name);
    if (urgentNames.length) {
      check(
        await supabase.from("user_ingredients").update({ urgent: true }).eq("user_id", userId).in("name", urgentNames),
      );
    }
  }
  if (rows.favorites.length) {
    check(
      await supabase.from("user_favorites").upsert(
        rows.favorites.map((r) => ({ ...r, recipe: r.recipe as unknown as Json })),
        { onConflict: "user_id,name", ignoreDuplicates: true },
      ),
    );
  }
  if (rows.regulars.length) {
    check(
      await supabase
        .from("user_regulars")
        .upsert(rows.regulars, { onConflict: "user_id,name", ignoreDuplicates: true }),
    );
  }
}
