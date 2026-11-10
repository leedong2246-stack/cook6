/**
 * 조리 단계 문장에서 기다리는 시간을 찾아 초 단위로 돌려줘요.
 * 예: "7분 삶아요" → 420, "5~7분" → 420, "1시간 30분" → 5400, "30초간" → 30.
 * 시간이 없으면 null.
 */
const UNIT_SECONDS: Record<string, number> = { 시간: 3600, 분: 60, 초: 1 };
const MAX_SECONDS = 3 * 3600;

export function parseStepTimer(step: string): number | null {
  const re = /(\d+(?:\.\d+)?)(?:\s*[~\-～]\s*(\d+(?:\.\d+)?))?\s*(시간|분|초)/g;
  const matches = [...step.matchAll(re)];
  if (matches.length === 0) return null;

  let total = 0;
  let end = -1;
  for (const m of matches) {
    const start = m.index ?? 0;
    // 첫 시간 표현과, 바로 이어지는 표현(예: "1시간 30분")만 합쳐요.
    if (end !== -1 && step.slice(end, start).trim() !== "") break;
    const value = Number(m[2] ?? m[1]);
    total += value * (UNIT_SECONDS[m[3] ?? ""] ?? 0);
    end = start + m[0].length;
  }
  if (!Number.isFinite(total) || total <= 0) return null;
  return Math.min(Math.round(total), MAX_SECONDS);
}

/** 초 → "7:05" 또는 "1:02:03" */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** 초 → "7분", "1시간 30분", "30초" */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h && `${h}시간`, m && `${m}분`, s && `${s}초`].filter(Boolean).join(" ") || "0초";
}
