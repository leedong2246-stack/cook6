import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { kitchenKey } from "@/hooks/use-kitchen";
import { importGuestData } from "@/lib/kitchen-cloud";
import {
  clearGuestData,
  declinedImportKey,
  guestCounts,
  guestFingerprint,
  readGuestData,
  shouldOfferImport,
  type GuestData,
} from "@/lib/kitchen";
import { readLocal, writeLocal } from "@/lib/local-store";

const asString = (v: unknown) => (typeof v === "string" ? v : null);

/** 로그인하는 순간, 게스트 모드에서 쓰던 데이터가 있으면 내 계정으로 가져올지 물어봐요. */
export function GuestImportDialog() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const qc = useQueryClient();
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setGuest(null);
    if (!uid) return;
    const g = readGuestData();
    if (!shouldOfferImport(g, readLocal(declinedImportKey(uid), asString, null))) return;
    // Let the login popup finish closing before this one opens.
    const t = setTimeout(() => setGuest(g), 350);
    return () => clearTimeout(t);
  }, [uid]);

  if (!uid || !guest) return null;
  const c = guestCounts(guest);
  const parts = [
    c.ingredients && `재료 ${c.ingredients}개`,
    c.favorites && `저장한 레시피 ${c.favorites}개`,
    c.regulars && `나만의 레시피 ${c.regulars}개`,
  ].filter(Boolean);

  const accept = async () => {
    setBusy(true);
    try {
      const latest = readGuestData();
      await importGuestData(uid, latest);
      clearGuestData();
      await qc.invalidateQueries({ queryKey: kitchenKey(uid) });
      setGuest(null);
      toast.success("내 계정으로 가져왔어요! 이제 휴대폰·컴퓨터 어디서든 볼 수 있어요. ☁️");
    } catch (e) {
      console.error("[guest-import] 실패", e);
      toast.error("가져오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const decline = () => {
    writeLocal(declinedImportKey(uid), guestFingerprint(guest));
    setGuest(null);
    toast("게스트 데이터는 이 기기에 그대로 남겨둘게요.");
  };

  return (
    <AlertDialog open onOpenChange={(o) => !o && !busy && decline()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>📦 게스트 데이터를 가져올까요?</AlertDialogTitle>
          <AlertDialogDescription>
            현재 게스트 모드에서 입력한 재료와 레시피를 내 계정으로 가져올까요?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
          {parts.join(" · ")}
        </p>
        <p className="text-xs text-muted-foreground">
          가져오면 계정에 있던 데이터와 합쳐지고, 이 기기의 게스트 데이터는 비워져요.
        </p>
        <AlertDialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={decline} disabled={busy}>
            아니요, 괜찮아요
          </Button>
          <Button className="rounded-full" onClick={accept} disabled={busy}>
            {busy ? "가져오는 중…" : "네, 가져옵니다"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
