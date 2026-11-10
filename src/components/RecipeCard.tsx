import { useState } from "react";
import { Clock, Gauge, Check, ShoppingBasket, Heart, BookOpen, Repeat } from "lucide-react";
import type { Recipe } from "@/lib/recipes.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CookingModeButton } from "@/components/CookingMode";
import { urgentUsed } from "@/lib/recipe-prompt";

export function RecipeCard({
  recipe,
  index,
  saved,
  onToggleSave,
  regular,
  onAddRegular,
  onShare,
  urgent = [],
}: {
  recipe: Recipe;
  index: number;
  saved: boolean;
  onToggleSave: () => void;
  regular?: boolean;
  onAddRegular?: () => void;
  onShare?: () => void;
  urgent?: string[];
}) {
  const [open, setOpen] = useState(false);
  const rescued = urgentUsed(recipe, urgent);
  return (
    <article
      className="relative flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-lift animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
    >
      <button
        onClick={onToggleSave}
        aria-pressed={saved}
        aria-label={saved ? "즐겨찾기 해제" : "즐겨찾기"}
        className="absolute right-4 top-4 rounded-full p-2 text-primary transition hover:bg-secondary"
      >
        <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
      </button>

      {recipe.categories && recipe.categories.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5 pr-10">
          {recipe.categories.map((c) => (
            <span key={c} className="rounded-full bg-tag px-2.5 py-0.5 text-xs font-medium text-tag-foreground">
              #{c}
            </span>
          ))}
        </div>
      )}
      <h3 className="pr-10 font-display text-xl font-bold text-card-foreground">
        <span className="mr-2" aria-hidden>{recipe.emoji || "🍽️"}</span>
        {recipe.name}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{recipe.description}</p>
      {rescued.length > 0 && (
        <p className="mt-3 rounded-2xl bg-urgent-soft px-3 py-2 text-xs font-semibold text-urgent">
          🚨 유통기한 임박 재료 먼저 소비: {rescued.join(", ")}
        </p>
      )}

      <div className="mt-4 flex gap-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
          <Gauge className="h-3.5 w-3.5" /> {recipe.difficulty}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> 약 {recipe.timeMinutes}분
        </span>
      </div>

      <div className="mt-5 flex-1 space-y-3">
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">보유 재료</p>
          <div className="flex flex-wrap gap-1.5">
            {recipe.usedIngredients.map((i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-have px-2.5 py-1 text-xs font-medium text-have-foreground">
                <Check className="h-3 w-3" /> {i}
              </span>
            ))}
          </div>
        </div>
        {recipe.extraIngredients.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">부족한 재료</p>
            <div className="flex flex-wrap gap-1.5">
              {recipe.extraIngredients.map((i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-missing px-2.5 py-1 text-xs font-medium text-missing-foreground">
                  <ShoppingBasket className="h-3 w-3" /> {i}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-2">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-info py-3 text-sm font-semibold text-info-foreground transition hover:opacity-90"
        >
          <BookOpen className="h-4 w-4" /> 레시피 보기
        </button>
        {onAddRegular && (
          <button
            onClick={onAddRegular}
            disabled={regular}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-accent disabled:opacity-60"
          >
            <Repeat className="h-4 w-4" /> {regular ? "단골 요리에 등록됨" : "자주 해먹는 요리로 등록"}
          </button>
        )}
        {onShare && (
          <button
            onClick={onShare}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-2.5 text-sm font-medium text-card-foreground transition hover:border-primary hover:text-primary"
          >
            🌐 모두와 공유하기
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {recipe.emoji || "🍽️"} {recipe.name}
            </DialogTitle>
            <DialogDescription>
              {recipe.difficulty} · 약 {recipe.timeMinutes}분
            </DialogDescription>
          </DialogHeader>
          {recipe.extraTip && (
            <p className="rounded-2xl bg-muted p-3 text-sm text-foreground">💡 {recipe.extraTip}</p>
          )}
          <ol className="space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground">
                <span className="h-fit shrink-0 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  Step {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <CookingModeButton title={recipe.name} emoji={recipe.emoji || "🍽️"} steps={recipe.steps} />
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function CookingLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative">
        <div className="text-6xl animate-cook">🍳</div>
        <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 gap-1">
          <span className="h-3 w-1 rounded-full bg-muted-foreground/40 animate-steam" />
          <span className="h-3 w-1 rounded-full bg-muted-foreground/40 animate-steam [animation-delay:300ms]" />
          <span className="h-3 w-1 rounded-full bg-muted-foreground/40 animate-steam [animation-delay:600ms]" />
        </div>
      </div>
      <div className="mt-6 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="mt-4 font-medium text-foreground">셰프가 레시피를 고민하고 있어요…</p>
    </div>
  );
}
