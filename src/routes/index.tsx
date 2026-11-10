import { createFileRoute } from "@tanstack/react-router";
import { useState, type KeyboardEvent } from "react";
import { useIngredients } from "@/hooks/use-ingredients";
import { useServerFn } from "@tanstack/react-start";
import { recommendRecipes, type Recipe } from "@/lib/recipes.functions";
import { RecipeCard, CookingLoader } from "@/components/RecipeCard";
import { useFavorites } from "@/hooks/use-favorites";
import { useRegulars } from "@/hooks/use-regulars";
import { RegularsSection } from "@/components/RegularsSection";
import { CommunitySection } from "@/components/CommunitySection";
import { ShareDialog, type ShareDraft } from "@/components/ShareDialog";
import { useCommunity } from "@/hooks/use-community";
import { HeaderAuth } from "@/components/HeaderAuth";
import { GuestImportDialog } from "@/components/GuestImportDialog";
import type { RegularDish } from "@/hooks/use-regulars";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { toast } from "sonner";
import { ChefHat, Plus, X, Sparkles, Refrigerator, TriangleAlert } from "lucide-react";
import { prioritizeUrgent } from "@/lib/recipe-prompt";

const TAB_TRIGGER =
  "flex-1 rounded-full px-5 py-2.5 text-sm font-semibold text-muted-foreground transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow hover:text-foreground data-[state=active]:hover:text-primary-foreground sm:flex-none";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "내 냉장고 속 요리사 — 냉장고 파먹기 요리 추천" },
      { name: "description", content: "가진 재료를 입력하면 만들 수 있는 요리를 추천해 드려요." },
      { property: "og:title", content: "내 냉장고 속 요리사" },
      { property: "og:description", content: "가진 재료로 만들 수 있는 요리를 찾아보세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const BASIC = ["간장", "설탕", "소금", "식용유"];
const PRESETS = [
  { label: "🍳 자취생 기본 (계란, 파, 밥)", items: ["계란", "파", "밥"] },
  { label: "🥓 샌드위치 조합 (빵, 베이컨, 계란)", items: ["빵", "베이컨", "계란"] },
  { label: "🥘 간단 국물 (두부, 파, 양파)", items: ["두부", "파", "양파"] },
];
const CATEGORIES = ["전체", "한식", "중식", "일식", "양식", "국물/찌개", "간단/간식", "안주"];

function Index() {
  const [input, setInput] = useState("");
  const { items, urgent, add, remove, toggleUrgent } = useIngredients();
  const [addAsUrgent, setAddAsUrgent] = useState(false);
  const recommend = useServerFn(recommendRecipes);
  const { favorites, isSaved, toggle } = useFavorites();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { regulars, addRegular, removeRegular, hasRegular } = useRegulars();
  const [categories, setCategories] = useState<string[]>(["전체"]);

  const toggleCategory = (c: string) => {
    setCategories((prev) => {
      if (c === "전체") return ["전체"];
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev.filter((x) => x !== "전체"), c];
      return next.length === 0 ? ["전체"] : next;
    });
  };

  const find = async () => {
    setLoading(true);
    setError(null);
    setRecipes([]);
    try {
      const res = await recommend({ data: { ingredients: items, categories, urgentIngredients: urgent } });
      if (res.error) setError(res.error);
      setRecipes(prioritizeUrgent(res.recipes, urgent));
    } catch {
      setError("요리를 추천하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const community = useCommunity();
  const [tab, setTab] = useState("fridge");
  const [shareDraft, setShareDraft] = useState<ShareDraft | null>(null);

  const shareRecipe = (r: Recipe) =>
    setShareDraft({ name: r.name, emoji: r.emoji || "🍽️", ingredients: r.usedIngredients, steps: r.steps, tip: r.extraTip });
  const shareRegular = (d: RegularDish) =>
    setShareDraft({ name: d.name, emoji: "🍽️", ingredients: d.ingredients, steps: [], tip: d.tip });

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      add(input.split(","), { urgent: addAsUrgent });
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">내 냉장고 속 요리사</h1>
            <p className="text-sm text-muted-foreground">냉장고 파먹기, 오늘은 뭘 만들어 볼까요?</p>
          </div>
          <HeaderAuth />
        </div>
      </header>

      <TabsPrimitive.Root value={tab} onValueChange={setTab}>
      <div className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <TabsPrimitive.List aria-label="메뉴" className="mx-auto flex max-w-5xl gap-2 px-6 py-3">
          <TabsPrimitive.Trigger value="fridge" className={TAB_TRIGGER}>🍳 내 냉장고 추천</TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger value="community" className={TAB_TRIGGER}>👥 모두의 꿀조합 레시피</TabsPrimitive.Trigger>
        </TabsPrimitive.List>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <TabsPrimitive.Content value="community" className="outline-none">
          <CommunitySection
            recipes={community.recipes}
            loading={community.loading}
            error={community.error}
            onRetry={() => void community.refetch()}
            isLiked={community.isLiked}
            onLike={community.like}
            onView={community.view}
          />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="fridge" className="outline-none">
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h2 className="mb-1 text-lg font-semibold text-card-foreground">내가 가진 재료 입력</h2>
            <p className="mb-4 text-sm text-muted-foreground">재료를 입력하고 Enter를 눌러주세요.</p>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="예: 계란, 두부, 대파"
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setAddAsUrgent((v) => !v)}
              aria-pressed={addAsUrgent}
              className={`mt-3 flex w-full items-center gap-2 rounded-2xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                addAsUrgent
                  ? "border-urgent bg-urgent-soft text-urgent"
                  : "border-dashed border-border bg-background text-muted-foreground hover:border-urgent hover:text-urgent"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                  addAsUrgent ? "border-urgent bg-urgent text-urgent-foreground" : "border-border"
                }`}
              >
                {addAsUrgent ? "✓" : ""}
              </span>
              🚨 유통기한 임박 (D-1 ~ D-3) 재료로 추가
            </button>
            <button
              onClick={() => add(BASIC)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> 기본 양념 추가 (간장·설탕·소금·식용유)
            </button>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-card-foreground">현재 보유 중인 재료 목록</h2>
              <span className="text-sm text-muted-foreground">{items.length}개</span>
            </div>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Refrigerator className="mb-2 h-10 w-10" />
                <p className="text-sm">아직 냉장고가 비어 있어요</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {items.map((it) => {
                  const isUrgent = urgent.includes(it);
                  return (
                    <span
                      key={it}
                      className={`inline-flex items-center rounded-full text-sm font-medium ${
                        isUrgent ? "bg-urgent text-urgent-foreground" : "bg-tag text-tag-foreground"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleUrgent(it)}
                        aria-pressed={isUrgent}
                        aria-label={isUrgent ? `${it} 유통기한 임박 해제` : `${it} 유통기한 임박 표시`}
                        title={isUrgent ? "유통기한 임박 해제" : "유통기한 임박 (D-1 ~ D-3) 표시"}
                        className={`flex items-center gap-1 rounded-l-full py-1.5 pl-3 pr-1.5 transition ${
                          isUrgent ? "" : "hover:text-urgent"
                        }`}
                      >
                        <TriangleAlert className={`h-3.5 w-3.5 ${isUrgent ? "" : "opacity-40"}`} />
                        {it}
                        {isUrgent && <span className="text-xs font-bold">임박</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(it)}
                        aria-label={`${it} 삭제`}
                        className="rounded-r-full py-1.5 pl-1 pr-2.5 opacity-60 transition hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {urgent.length > 0 && (
              <p className="mt-4 rounded-2xl bg-urgent-soft px-3 py-2 text-sm font-medium text-urgent">
                🚨 유통기한 임박 재료 {urgent.length}개 — 이 재료를 먼저 쓰는 요리를 최우선으로 추천해 드려요.
              </p>
            )}
            {items.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">⚠️ 재료 이름을 누르면 유통기한 임박 표시가 켜지고 꺼져요. ×를 누르면 삭제돼요.</p>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-1 text-lg font-semibold text-card-foreground">원하는 요리 스타일 (선택 사항)</h2>
          <p className="mb-4 text-sm text-muted-foreground">여러 개를 고를 수 있어요. 아무것도 고르지 않으면 전체로 추천해요.</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = categories.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCategory(c)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        <button
          onClick={find}
          disabled={items.length === 0 || loading}
          className="mt-10 flex w-full items-center justify-center gap-2 rounded-3xl bg-primary py-5 text-lg font-bold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-5 w-5" /> {loading ? "추천 중…" : "이 재료로 만들 수 있는 요리 찾기"}
        </button>

        <section className="mt-6 rounded-3xl bg-secondary/50 p-5">
          <p className="mb-3 text-sm font-medium text-foreground">💡 무슨 재료를 넣을지 고민되시나요?</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => add(p.items)}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground transition hover:border-primary hover:text-primary"
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          {loading && <CookingLoader />}
          {error && (
            <p className="rounded-2xl bg-destructive/10 p-4 text-center text-sm text-destructive">{error}</p>
          )}
          {recipes.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-3">
              {recipes.map((r, i) => (
                <RecipeCard key={r.name + i} recipe={r} index={i} saved={isSaved(r)}
                  onToggleSave={() => toggle(r)}
                  regular={hasRegular(r.name)}
                  onAddRegular={() =>
                    addRegular({ name: r.name, ingredients: [...r.usedIngredients, ...r.extraIngredients], tip: r.extraTip })
                  }
                  onShare={() => shareRecipe(r)}
                  urgent={urgent}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-14">
          <h2 className="mb-1 font-display text-2xl font-bold text-foreground">⭐ 내가 저장한 레시피</h2>
          <p className="mb-6 text-sm text-muted-foreground">하트를 누른 레시피가 여기에 저장돼요. 다시 누르면 빠져요.</p>
          {favorites.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              아직 저장한 레시피가 없어요.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {favorites.map((r, i) => (
                <RecipeCard key={"fav-" + r.name} recipe={r} index={i} saved
                  onToggleSave={() => toggle(r)}
                  regular={hasRegular(r.name)}
                  onAddRegular={() =>
                    addRegular({ name: r.name, ingredients: [...r.usedIngredients, ...r.extraIngredients], tip: r.extraTip })
                  }
                  onShare={() => shareRecipe(r)}
                  urgent={urgent}
                />
              ))}
            </div>
          )}
        </section>

        <RegularsSection regulars={regulars} onAdd={addRegular} onRemove={removeRegular} onPutInFridge={add} onShare={shareRegular} />
        </TabsPrimitive.Content>
      </main>
      </TabsPrimitive.Root>

      <GuestImportDialog />
      <ShareDialog
        draft={shareDraft}
        onClose={() => setShareDraft(null)}
        defaultNickname={community.profile.nickname}
        defaultAvatar={community.profile.avatar}
        onSubmit={async (input) => {
          await community.share(input);
          setShareDraft(null);
          toast.success(`'${input.name}' 레시피를 모두와 공유했어요!`, {
            action: { label: "보러 가기", onClick: () => setTab("community") },
          });
        }}
      />
    </div>
  );
}
