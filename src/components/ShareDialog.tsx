import { useEffect, useState, type FormEvent } from "react";
import { Globe } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AVATARS } from "@/lib/community";
import type { ShareInput } from "@/hooks/use-community";

export type ShareDraft = Omit<ShareInput, "author" | "avatar">;

export function ShareDialog({
  draft,
  onClose,
  defaultNickname,
  defaultAvatar,
  onSubmit,
}: {
  draft: ShareDraft | null;
  onClose: () => void;
  defaultNickname: string;
  defaultAvatar: string;
  onSubmit: (input: ShareInput) => Promise<void>;
}) {
  const [nickname, setNickname] = useState(defaultNickname);
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [tip, setTip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft) {
      setNickname(defaultNickname);
      setAvatar(defaultAvatar);
      setTip(draft.tip.slice(0, 80));
      setError(null);
    }
  }, [draft, defaultNickname, defaultAvatar]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || !nickname.trim() || !tip.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ ...draft, author: nickname.trim(), avatar, tip: tip.trim() });
    } catch {
      setError("공유하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const field =
    "w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {draft && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                🌐 {draft.emoji} {draft.name} 공유하기
              </DialogTitle>
              <DialogDescription>닉네임과 한 줄 꿀팁을 남기면 '모두의 꿀조합 레시피'에 바로 올라가요.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">프로필 이모지</p>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setAvatar(a)}
                      aria-pressed={avatar === a}
                      aria-label={`프로필 ${a}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition ${
                        avatar === a ? "bg-primary shadow-glow" : "bg-muted hover:bg-accent"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <input
                className={field}
                placeholder="닉네임 (예: 자취9단)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={12}
                aria-label="닉네임"
              />
              <input
                className={field}
                placeholder="한 줄 꿀팁 (예: 참기름 한 방울이면 끝!)"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                required
                maxLength={80}
                aria-label="한 줄 꿀팁"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                <Globe className="h-4 w-4" /> {submitting ? "공유 중…" : "모두와 공유하기"}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
