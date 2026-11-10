import { useState, type FormEvent } from "react";
import { Plus, Refrigerator, Trash2 } from "lucide-react";
import type { RegularDish } from "@/hooks/use-regulars";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function RegularsSection({
  regulars,
  onAdd,
  onRemove,
  onPutInFridge,
  onShare,
}: {
  regulars: RegularDish[];
  onAdd: (d: Omit<RegularDish, "id">) => void;
  onRemove: (id: string) => void;
  onPutInFridge: (ingredients: string[]) => void;
  onShare: (d: RegularDish) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<RegularDish | null>(null);
  const [name, setName] = useState("");
  const [ings, setIngs] = useState("");
  const [tip, setTip] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const ingredients = ings.split(",").map((s) => s.trim()).filter(Boolean);
    if (!name.trim() || ingredients.length === 0) return;
    onAdd({ name: name.trim(), ingredients, tip: tip.trim() });
    setName("");
    setIngs("");
    setTip("");
    setFormOpen(false);
  };

  const field =
    "w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <section className="mt-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mb-1 font-display text-2xl font-bold text-foreground">🍳 내가 즐겨 만들어 먹는 요리</h2>
          <p className="text-sm text-muted-foreground">카드를 누르면 재료를 냉장고에 바로 넣을 수 있어요.</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> 나만의 레시피 직접 추가하기
        </button>
      </div>

      {regulars.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          아직 등록한 단골 요리가 없어요.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regulars.map((d) => (
            <div
              key={d.id}
              className="flex flex-col rounded-3xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
            >
              <button onClick={() => setSelected(d)} className="flex-1 p-5 pb-3 text-left">
                <h3 className="font-display text-lg font-bold text-card-foreground">{d.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.ingredients.map((i) => (
                    <span key={i} className="rounded-full bg-tag px-2.5 py-0.5 text-xs text-tag-foreground">{i}</span>
                  ))}
                </div>
                {d.tip && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">💡 {d.tip}</p>}
              </button>
              <button
                onClick={() => onShare(d)}
                className="mx-5 mb-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-border py-2 text-sm font-medium text-card-foreground transition hover:border-primary hover:text-primary"
              >
                🌐 모두와 공유하기
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>나만의 레시피 추가</DialogTitle>
            <DialogDescription>자주 해먹는 요리를 저장해 두세요.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <input className={field} placeholder="요리 이름 (예: 참치마요 덮밥)" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
            <input className={field} placeholder="필요 재료 (쉼표로 구분: 참치, 마요네즈, 밥)" value={ings} onChange={(e) => setIngs(e.target.value)} required />
            <textarea className={field} rows={3} placeholder="간단한 꿀팁 (선택)" value={tip} onChange={(e) => setTip(e.target.value)} maxLength={300} />
            <button type="submit" className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">저장하기</button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{selected.name}</DialogTitle>
                <DialogDescription>필요 재료: {selected.ingredients.join(", ")}</DialogDescription>
              </DialogHeader>
              {selected.tip && <p className="rounded-2xl bg-muted p-3 text-sm text-foreground">💡 {selected.tip}</p>}
              <button
                onClick={() => {
                  onPutInFridge(selected.ingredients);
                  setSelected(null);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground"
              >
                <Refrigerator className="h-4 w-4" /> 필요한 재료를 내 냉장고에 바로 넣기
              </button>
              <button
                onClick={() => {
                  onRemove(selected.id);
                  setSelected(null);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-2.5 text-sm text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" /> 삭제
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
