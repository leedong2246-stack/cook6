import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fetchKitchen } from "@/lib/kitchen-cloud";
import { EMPTY_KITCHEN, type Kitchen } from "@/lib/kitchen";

export const kitchenKey = (userId: string | null) => ["kitchen", userId] as const;

/**
 * 로그인한 사람의 냉장고 데이터. 다른 기기에서 바꾼 내용은 이 화면으로 돌아올 때 다시 불러와요.
 * run(): 화면을 먼저 바꾸고(빠른 반응) 저장하고, 실패하면 알려준 뒤 서버 내용으로 되돌려요.
 */
export function useCloudKitchen() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: kitchenKey(uid),
    queryFn: () => fetchKitchen(uid as string),
    enabled: !!uid,
  });

  const run = useCallback(
    async (update: (k: Kitchen) => Kitchen, save: (userId: string) => Promise<void>) => {
      if (!uid) return;
      const key = kitchenKey(uid);
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<Kitchen>(key, (k) => update(k ?? EMPTY_KITCHEN));
      try {
        await save(uid);
      } catch (e) {
        console.error("[kitchen] 저장 실패", e);
        toast.error("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
        void qc.invalidateQueries({ queryKey: key });
      }
    },
    [qc, uid],
  );

  return { uid, kitchen: query.data ?? EMPTY_KITCHEN, run };
}
