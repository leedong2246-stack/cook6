import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/AuthDialog";
import { useAuth } from "@/hooks/use-auth";
import { displayName } from "@/lib/auth-messages";

/** 헤더 오른쪽: 게스트면 로그인 버튼, 로그인 중이면 이름과 로그아웃 */
export function HeaderAuth() {
  const { loading, user, signOut } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (loading) return <div className="ml-auto h-9 w-40 animate-pulse rounded-full bg-muted" aria-hidden />;

  if (user) {
    const logout = async () => {
      setLeaving(true);
      try {
        await signOut();
        // Don't keep the signed-out account's kitchen in memory on this device.
        qc.removeQueries({ queryKey: ["kitchen"] });
        toast("로그아웃했어요. 이제 게스트 모드예요.");
      } finally {
        setLeaving(false);
      }
    };
    return (
      <div className="ml-auto flex min-w-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-col items-end">
          <span className="max-w-[14rem] truncate text-sm font-medium text-foreground" title={user.email ?? undefined}>
            👋 {displayName(user)}님
          </span>
          <span className="text-xs text-muted-foreground">☁️ 내 계정에 저장 중</span>
        </div>
        <Button variant="outline" className="rounded-full" onClick={logout} disabled={leaving}>
          {leaving ? "로그아웃 중…" : "로그아웃"}
        </Button>
      </div>
    );
  }

  return (
    <div className="ml-auto flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-xs text-muted-foreground sm:text-sm">👤 게스트 모드 (로컬 저장 중)</span>
      <Button variant="info" onClick={() => setOpen(true)}>
        로그인 / 회원가입
      </Button>
      <AuthDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
