import type { Phase } from "@/lib/pomodoro"
import { CIRCUMFERENCE } from "@/lib/pomodoro"

interface Props {
  phase: Phase
  timeLeft: number
  dashOffset: number
  currentRound: number
  totalRounds: number
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

export function TimerRing({ phase, timeLeft, dashOffset, currentRound, totalRounds }: Props) {
  const strokeClass =
    phase === "break" ? "timer-progress-break"
    : phase === "focus" ? "timer-progress-focus"
    : "timer-progress-idle"

  const sub =
    phase === "idle"  ? "drück start ✨"
    : phase === "focus" ? `runde ${currentRound} von ${totalRounds}`
    : "kurze pause 💤"

  return (
    <div className="timer-wrap">
      <svg className="timer-svg" width="280" height="280" viewBox="0 0 280 280">
        <circle className="timer-track" cx="140" cy="140" r="110" />
        <circle
          className={`timer-progress ${strokeClass}`}
          cx="140" cy="140" r="110"
          strokeDasharray={String(CIRCUMFERENCE)}
          strokeDashoffset={String(dashOffset)}
        />
      </svg>
      <div className="timer-inner">
        <div className="timer-display">{fmt(timeLeft)}</div>
        <div className="timer-sub">{sub}</div>
      </div>
    </div>
  )
}
