import type { Phase } from "@/lib/pomodoro"

interface Props {
  totalRounds: number
  currentRound: number
  phase: Phase
}

export function RoundDots({ totalRounds, currentRound, phase }: Props) {
  return (
    <div className="round-dots">
      {Array.from({ length: totalRounds }, (_, i) => {
        const num = i + 1
        const done = phase !== "idle" && num < currentRound
        const active = phase !== "idle" && num === currentRound
        return (
          <div
            key={i}
            className={`dot${done ? " dot-done" : ""}${active ? " dot-current" : ""}`}
          />
        )
      })}
    </div>
  )
}
