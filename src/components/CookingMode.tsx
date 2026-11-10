import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { formatDuration, formatTimer, parseStepTimer } from "@/lib/cooking";

type Timer = { step: number; total: number; remaining: number; endsAt: number | null; done: boolean };

/** 레시피 상세 팝업 하단에 놓는 큰 '조리 모드 시작' 버튼 + 전체 화면 조리 모드 */
export function CookingModeButton({ title, emoji, steps }: { title: string; emoji: string; steps: string[] }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-3xl bg-primary py-5 text-lg font-bold text-primary-foreground shadow-glow transition hover:scale-[1.01]"
      >
        👨‍🍳 조리 모드 시작
      </button>
      <CookingMode open={open} onOpenChange={setOpen} title={title} emoji={emoji} steps={steps} />
    </>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* 소리를 낼 수 없는 환경 */
  }
  navigator.vibrate?.([300, 150, 300, 150, 300]);
}

export function CookingMode({
  open,
  onOpenChange,
  title,
  emoji,
  steps,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  emoji: string;
  steps: string[];
}) {
  const [step, setStep] = useState(0);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  // 열 때마다 처음부터, 닫으면 타이머 정리
  useEffect(() => {
    if (open) {
      setStep(0);
      setTimer(null);
    }
  }, [open]);

  // 조리 중 화면이 꺼지지 않게
  useEffect(() => {
    if (!open) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (wakeLock.current = l)).catch(() => {});
    return () => {
      void wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [open]);

  const running = timer?.endsAt != null;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const remaining = timer ? (timer.endsAt ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : timer.remaining) : 0;

  useEffect(() => {
    if (timer?.endsAt && remaining === 0) {
      setTimer({ ...timer, endsAt: null, remaining: 0, done: true });
      beep();
      toast.success(`⏰ Step ${timer.step + 1} 타이머가 끝났어요!`);
    }
  }, [remaining, timer]);

  const startTimer = (seconds: number) => {
    const t = Date.now();
    setNow(t);
    setTimer({ step, total: seconds, remaining: seconds, endsAt: t + seconds * 1000, done: false });
  };
  const pauseTimer = () => timer && setTimer({ ...timer, remaining, endsAt: null });
  const resumeTimer = () => {
    if (!timer) return;
    const t = Date.now();
    setNow(t);
    setTimer({ ...timer, endsAt: t + timer.remaining * 1000 });
  };

  const last = steps.length - 1;
  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const next = useCallback(() => setStep((s) => Math.min(last, s + 1)), [last]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  };

  const stepSeconds = parseStepTimer(steps[step] ?? "");
  const timerHere = timer && timer.step === step;
  const timerElsewhere = timer && timer.step !== step && !timer.done;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
          className="fixed inset-0 z-[60] flex flex-col bg-background text-foreground outline-none animate-in fade-in zoom-in-95"
        >
          <header className="flex items-center gap-4 border-b border-border bg-card/80 px-5 py-4 sm:px-10">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate font-display text-xl font-bold sm:text-2xl">
              <span aria-hidden className="mr-2">{emoji}</span>
              {title}
            </DialogPrimitive.Title>
            <span className="shrink-0 rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground">
              {step + 1} / {steps.length}
            </span>
            <DialogPrimitive.Close
              aria-label="조리 모드 닫기"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-accent"
            >
              <X className="h-6 w-6" />
            </DialogPrimitive.Close>
          </header>

          <div className="flex gap-1.5 px-5 pt-4 sm:px-10" aria-hidden>
            {steps.map((_, i) => (
              <button
                key={i}
                tabIndex={-1}
                onClick={() => setStep(i)}
                className={`h-2 flex-1 rounded-full transition ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-8 text-center sm:px-16">
            <p className="font-display text-2xl font-bold text-primary sm:text-3xl">Step {step + 1}</p>
            <p
              key={step}
              aria-live="polite"
              className="max-w-5xl font-display text-4xl leading-snug text-foreground animate-in fade-in slide-in-from-right-6 sm:text-5xl lg:text-6xl"
            >
              {steps[step]}
            </p>

            {stepSeconds && !timerHere && (
              <button
                type="button"
                onClick={() => startTimer(stepSeconds)}
                className="inline-flex items-center gap-3 rounded-full bg-info px-8 py-4 text-xl font-bold text-info-foreground shadow-lift transition hover:scale-105"
              >
                ⏱️ 타이머 시작 ({formatDuration(stepSeconds)})
              </button>
            )}

            {timerHere && timer && (
              <div className="flex flex-col items-center gap-4">
                <p
                  role="timer"
                  className={`font-display text-7xl font-bold tabular-nums sm:text-8xl ${timer.done ? "animate-pulse text-destructive" : "text-foreground"}`}
                >
                  {timer.done ? "완료!" : formatTimer(remaining)}
                </p>
                <div className="flex gap-3">
                  {!timer.done &&
                    (running ? (
                      <button onClick={pauseTimer} className="inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-3 text-lg font-semibold text-secondary-foreground">
                        <Pause className="h-5 w-5" /> 일시정지
                      </button>
                    ) : (
                      <button onClick={resumeTimer} className="inline-flex items-center gap-2 rounded-full bg-info px-6 py-3 text-lg font-semibold text-info-foreground">
                        <Play className="h-5 w-5" /> 계속
                      </button>
                    ))}
                  <button onClick={() => setTimer(null)} className="inline-flex items-center gap-2 rounded-full bg-muted px-6 py-3 text-lg font-semibold text-foreground">
                    <RotateCcw className="h-5 w-5" /> 초기화
                  </button>
                </div>
              </div>
            )}

            {timerElsewhere && timer && (
              <button
                onClick={() => setStep(timer.step)}
                className="rounded-full border border-border bg-card px-5 py-2 text-base font-medium text-card-foreground"
              >
                ⏱️ Step {timer.step + 1} 타이머 {formatTimer(remaining)} 남음 {running ? "" : "(일시정지)"}
              </button>
            )}
          </main>

          <footer className="grid grid-cols-2 gap-4 border-t border-border bg-card/80 p-5 sm:px-10">
            <button
              type="button"
              onClick={prev}
              disabled={step === 0}
              className="flex h-20 items-center justify-center gap-2 rounded-3xl bg-secondary text-xl font-bold text-secondary-foreground transition hover:bg-accent disabled:opacity-40 sm:text-2xl"
            >
              <ChevronLeft className="h-7 w-7" /> 이전 단계
            </button>
            {step < last ? (
              <button
                type="button"
                onClick={next}
                className="flex h-20 items-center justify-center gap-2 rounded-3xl bg-primary text-xl font-bold text-primary-foreground shadow-glow transition hover:scale-[1.01] sm:text-2xl"
              >
                다음 단계 <ChevronRight className="h-7 w-7" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-20 items-center justify-center gap-2 rounded-3xl bg-primary text-xl font-bold text-primary-foreground shadow-glow transition hover:scale-[1.01] sm:text-2xl"
              >
                🎉 요리 완성!
              </button>
            )}
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
