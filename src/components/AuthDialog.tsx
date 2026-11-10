import { useEffect, useState, type FormEvent } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { authErrorMessage } from "@/lib/auth-messages";

export type AuthMode = "login" | "signup";

const TAB =
  "flex-1 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft";
const FIELD =
  "w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-info";

export function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode("login");
      setEmail("");
      setPassword("");
      setError(null);
      setNotice(null);
      setSubmitting(false);
    }
  }, [open]);

  const changeMode = (m: AuthMode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const cleanEmail = email.trim();
    try {
      if (mode === "login") {
        await signIn(cleanEmail, password);
        toast.success("로그인했어요. 반가워요! 👋");
        onOpenChange(false);
      } else {
        const signedIn = await signUp(cleanEmail, password);
        if (signedIn) {
          toast.success("가입 완료! 바로 로그인됐어요. 🎉");
          onOpenChange(false);
        } else {
          setNotice("가입 확인 메일을 보냈어요. 메일의 링크를 누르면 로그인돼요.");
        }
      }
    } catch (err) {
      setError(authErrorMessage(err as { code?: string; message?: string }));
    } finally {
      setSubmitting(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isLogin ? "다시 오셨네요! 👋" : "회원가입하고 어디서나 보기"}
          </DialogTitle>
          <DialogDescription>
            {isLogin
              ? "로그인하면 저장한 재료와 레시피를 다른 기기에서도 볼 수 있어요."
              : "이메일과 비밀번호만 있으면 바로 시작할 수 있어요."}
          </DialogDescription>
        </DialogHeader>

        <TabsPrimitive.Root value={mode} onValueChange={(v) => changeMode(v as AuthMode)}>
          <TabsPrimitive.List aria-label="로그인 또는 회원가입" className="flex gap-1 rounded-full bg-muted p-1">
            <TabsPrimitive.Trigger value="login" className={TAB} disabled={submitting}>
              로그인
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger value="signup" className={TAB} disabled={submitting}>
              회원가입
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>
        </TabsPrimitive.Root>

        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">이메일</span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">비밀번호</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={isLogin ? "비밀번호" : "6자 이상"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-2xl bg-urgent-soft px-4 py-2.5 text-sm text-urgent">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground">
              {notice}
            </p>
          )}
          <Button type="submit" variant="info" size="lg" className="mt-2 w-full" disabled={submitting}>
            {submitting ? "확인 중…" : "확인"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
