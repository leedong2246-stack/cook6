import { useMemo, useState } from "react";
import { BookOpen, Eye, Heart } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CookingModeButton } from "@/components/CookingMode";
import { SORT_OPTIONS, formatDate, sortCommunity, type CommunityRecipe, type SortMode } from "@/lib/community";

const nf = new Intl.NumberFormat("ko-KR");

export function CommunitySection({
  recipes,
  loading,
  error,
  onRetry,
  isLiked,
  onLike,
  onView,
}: {
  recipes: CommunityRecipe[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  isLiked: (id: string) => boolean;
  onLike: (id: string) => Promise<void>;
  onView: (id: string) => Promise<void>;
}) {
  const [sort, setSort] = useState<SortMode>("popular");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sorted = useMemo(() => sortCommunity(recipes, sort), [recipes, sort]);
  const selected = recipes.find((r) => r.id === selectedId) ?? null;

  const open = (id: string) => {
    void onView(id).catch(() => {});
    setSelectedId(id);
  };
  const like = (id: string) =>
    onLike(id).catch(() => toast.error("좋아요를 반영하지 못했어요. 다시 시도해 주세요."));

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mb-1 font-display text-2xl font-bold text-foreground">👥 모두의 꿀조합 레시피</h2>
          <p className="text-sm text-muted-foreground">다른 사람들이 냉장고 파먹기로 찾은 인기 레시피예요.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="정렬">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setSort(o.value)}
              aria-pressed={sort === o.value}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                sort === o.value
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="불러오는 중">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      )}
      {error && (
        <div className="rounded-3xl bg-destructive/10 p-6 text-center text-sm text-destructive">
          레시피를 불러오지 못했어요.{" "}
          <button onClick={onRetry} className="font-semibold underline">
            다시 시도
          </button>
        </div>
      )}
      {!loading && !error && sorted.length === 0 && (
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          아직 공유된 레시피가 없어요. 첫 번째 꿀조합을 올려 보세요!
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((r, i) => {
          const liked = isLiked(r.id);
          return (
            <article
              key={r.id}
              className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-lift animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-lg" aria-hidden>
                  {r.avatar}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-card-foreground">{r.author}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                </div>
              </div>

              <h3 className="mt-4 font-display text-xl font-bold text-card-foreground">
                <span className="mr-2" aria-hidden>{r.emoji}</span>
                {r.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">💡 {r.tip}</p>

              <div className="mt-4 flex flex-1 flex-wrap content-start gap-1.5">
                {r.ingredients.map((ing) => (
                  <span key={ing} className="rounded-full bg-tag px-2.5 py-0.5 text-xs font-medium text-tag-foreground">
                    #{ing}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-4 text-sm">
                <button
                  onClick={() => like(r.id)}
                  aria-pressed={liked}
                  aria-label={liked ? "좋아요 취소" : "좋아요"}
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold text-primary transition hover:bg-secondary"
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {nf.format(r.likes)}
                </button>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Eye className="h-4 w-4" /> {nf.format(r.views)}
                </span>
              </div>

              <button
                onClick={() => open(r.id)}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-info py-3 text-sm font-semibold text-info-foreground transition hover:opacity-90"
              >
                <BookOpen className="h-4 w-4" /> 레시피 상세 보기
              </button>
            </article>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {selected.emoji} {selected.name}
                </DialogTitle>
                <DialogDescription>
                  {selected.avatar} {selected.author} · {formatDate(selected.createdAt)} · 조회 {nf.format(selected.views)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-1.5">
                {selected.ingredients.map((ing) => (
                  <span key={ing} className="rounded-full bg-have px-2.5 py-1 text-xs font-medium text-have-foreground">
                    {ing}
                  </span>
                ))}
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">작성자의 꿀팁</p>
                <p className="text-sm text-foreground">💡 {selected.tip}</p>
              </div>
              {selected.steps.length > 0 ? (
                <ol className="space-y-3">
                  {selected.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground">
                      <span className="h-fit shrink-0 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        Step {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">작성자가 조리 순서를 따로 적지 않았어요.</p>
              )}
              <CookingModeButton title={selected.name} emoji={selected.emoji} steps={selected.steps} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
